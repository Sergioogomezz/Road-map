"""Monta la voz de la parte central del reel «Google top 3» y calcula los tiempos de la animación.

Uso: python3 sincronizar.py frases-voz.json salida/voz-montada.wav tiempos-voz.json [--crudo]

frases-voz.json indica las grabaciones («fuentes»), dónde está cada frase dentro de su
grabación (segundos), una ecualización opcional por frase y el momento en que se dice
cada palabra clave que mueve la animación.
--crudo: solo cortes y volumen, sin filtros ni compresor (para comparar).
"""
import json, os, subprocess, sys
import numpy as np

SR = 48000
cfg_path, out_wav, out_t = sys.argv[1:4]
CRUDO = "--crudo" in sys.argv
cfg = json.load(open(cfg_path))
base = os.path.dirname(os.path.abspath(cfg_path))
HEAD, TAIL = 0.10, 0.20
FADE = int(0.015 * SR)


def decode(path, a, b, filtros):
    af = ["-af", ",".join(filtros)] if filtros else []
    raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-ss", str(a), "-to", str(b), "-i", path, *af,
                          "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def lufs(x):
    p = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                        "-af", "ebur128", "-f", "null", "-"], input=x.astype(np.float32).tobytes(), capture_output=True)
    txt = p.stderr.decode()
    i = txt.rfind("I:")
    return float(txt[i + 2:].split("LUFS")[0])


def ramp(n):
    return 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n))


# 1) Cortar cada frase de su grabación, con filtros suaves.
piezas, niveles = [], []
for f in cfg["frases"]:
    src = os.path.join(base, cfg["fuentes"][f["fuente"]])
    a, b = f["desde"] - HEAD, f["hasta"] + TAIL
    filtros = [] if CRUDO else ["highpass=f=80"] + ([f["eq"]] if f.get("eq") else [])
    x = decode(src, a, b, filtros)
    if not CRUDO and f.get("golpe"):          # golpe de aire de una «P»: se quitan solo los graves de ese instante
        g0, g1 = f["golpe"]
        hp = decode(src, a, b, ["highpass=f=320", "highpass=f=320"])
        i0, i1 = int((g0 - a) * SR), int((g1 - a) * SR)
        pk = i0 + int(np.argmax(np.abs(x[i0:i1])))
        w0, w1, r = pk - int(0.035 * SR), pk + int(0.07 * SR), int(0.01 * SR)
        m = np.zeros(len(x)); m[w0:w1] = 1; m[w0 - r:w0] = ramp(r); m[w1:w1 + r] = ramp(r)[::-1]
        x = x * (1 - m) + hp[:len(x)] * m
    x[:FADE] *= ramp(FADE); x[-FADE:] *= ramp(FADE)[::-1]
    piezas.append(x)
    niveles.append(lufs(x))

# 2) Igualar volumen entre frases y colocarlas con pausas cortas.
objetivo = float(np.median(niveles))
starts, total = [], cfg["inicio"]
for f in cfg["frases"]:
    starts.append(total)
    total += (f["hasta"] - f["desde"]) + f.get("pausa_despues", 0.35)
pista = np.zeros(int((total + 2.0) * SR))
for x, lv, s in zip(piezas, niveles, starts):
    g = 10 ** (np.clip(objetivo - lv, -6, 6) / 20)
    i = int((s - HEAD) * SR)
    pista[i:i + len(x)] += x * g

# 3) Compresión suave y volumen estándar para redes.
tmp = out_wav + ".tmp.f32"
pista.astype(np.float32).tofile(tmp)
final = ("volume=13dB,alimiter=limit=0.7:attack=1:release=50" if CRUDO else
         "acompressor=threshold=-26dB:ratio=2:attack=10:release=150:makeup=2,loudnorm=I=-14:TP=-1.5:LRA=9")
subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", tmp,
                "-af", final + ",aresample=48000", "-ac", "2", "-c:a", "pcm_s16le", out_wav], check=True)
os.remove(tmp)

# 4) Tiempos (en segundos desde el inicio de esta pista de voz).
IDX = {f["id"]: k for k, f in enumerate(cfg["frases"])}
def at(fid, src_t):
    k = IDX[fid]; return starts[k] + (src_t - cfg["frases"][k]["desde"])
def ini(fid): return starts[IDX[fid]]
def fin(fid):
    k = IDX[fid]; f = cfg["frases"][k]; return starts[k] + f["hasta"] - f["desde"]
P = cfg["palabras"]
T = dict(
    incog=at("1a", P["incognito"]), cap1b=ini("1b"),
    type1=at("1b", P["busca"]) + 0.15, type1End=at("1b", P["o"]) - 0.05,
    type2=ini("1c"), type2End=fin("1c") - 0.1,
    results=ini("2a") - 0.05, top3=at("2a", P["tres"]), mapa=at("2a", P["mapa"]),
    cap3=ini("2b"), fuga=at("2b", P["fuga"]),
    m3=ini("3"), chip1=at("3", P["mejor"]), chip2=at("3", P["clases"]),
    m4=ini("4a"), mudar=at("4a", P["mudar"]), llamar=ini("4b"), tap=at("4b", P["llamar"]),
    llamada=at("4c", P["uno"]), vozFin=fin("4c"),
)
T = {k: round(v, 2) for k, v in T.items()}
json.dump(T, open(out_t, "w"), indent=1)
print("niveles por frase (LUFS):", [round(v, 1) for v in niveles], "objetivo", round(objetivo, 1))
print("duración voz:", T["vozFin"], "s")
