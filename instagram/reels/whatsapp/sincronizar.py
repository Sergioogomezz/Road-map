"""Monta la pista de voz del reel y calcula los tiempos de la animación.

Uso: python3 sincronizar.py voz.m4a frases-voz.json salida/voz-montada.wav tiempos-voz.json

frases-voz.json dice, para cada frase, dónde está en la grabación original (segundos)
y en qué momento de la grabación se dice cada palabra clave que mueve la animación.
"""
import json, subprocess, sys, wave
import numpy as np

SR = 48000
src, cfg_path, out_wav, out_t = sys.argv[1:5]
CRUDO = "--crudo" in sys.argv   # sin filtros, sin compresor y sin arreglo de la «P»: solo cortes y volumen
cfg = json.load(open(cfg_path))


def ffmpeg_decode(path, extra_filter=None):
    af = ["-af", extra_filter] if extra_filter else []
    raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", path, *af, "-ac", "1", "-ar", str(SR),
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def lufs(x):
    p = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                        "-af", "ebur128", "-f", "null", "-"], input=x.astype(np.float32).tobytes(), capture_output=True)
    txt = p.stderr.decode()
    i = txt.rfind("I:")
    return float(txt[i + 2:].split("LUFS")[0])


def ramp(n):
    return 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n))


# 1) Voz con filtro de graves (quita retumbe) y versión muy filtrada para el golpe de la «P».
voz = ffmpeg_decode(src, None if CRUDO else "highpass=f=90")
voz_hp = ffmpeg_decode(src, "highpass=f=320,highpass=f=320")
for a, b in ([] if CRUDO else cfg.get("golpes", [])):           # zona aproximada de cada golpe
    i0, i1 = int(a * SR), int(b * SR)
    pk = i0 + int(np.argmax(np.abs(voz[i0:i1])))
    w0, w1 = pk - int(0.035 * SR), pk + int(0.07 * SR)
    mask = np.zeros(len(voz)); r = int(0.01 * SR)
    mask[w0:w1] = 1; mask[w0 - r:w0] = ramp(r); mask[w1:w1 + r] = ramp(r)[::-1]
    voz = voz * (1 - mask) + voz_hp * mask

# 2) Cortar frases, igualar su volumen y montarlas con pausas cortas.
HEAD, TAIL, FADE = 0.10, 0.20, int(0.015 * SR)
piezas, starts, t = [], [], cfg["inicio"]
niveles = []
for f in cfg["frases"]:
    a, b = f["desde"], f["hasta"]
    x = voz[int((a - HEAD) * SR):int((b + TAIL) * SR)].copy()
    x[:FADE] *= ramp(FADE); x[-FADE:] *= ramp(FADE)[::-1]
    niveles.append(lufs(x))
    piezas.append(x)
objetivo = float(np.median(niveles))
total = cfg["inicio"]
for f, x, lv in zip(cfg["frases"], piezas, niveles):
    g = 10 ** (np.clip(objetivo - lv, -4, 4) / 20)
    starts.append(total)
    total += (f["hasta"] - f["desde"]) + f.get("pausa_despues", 0.35)
dur = total + 2.0
pista = np.zeros(int(dur * SR))
for f, x, lv, s in zip(cfg["frases"], piezas, niveles, starts):
    g = 10 ** (np.clip(objetivo - lv, -4, 4) / 20)
    i = int((s - HEAD) * SR)
    pista[i:i + len(x)] += x * g

tmp = out_wav + ".tmp.f32"
pista.astype(np.float32).tofile(tmp)
# 3) Compresión suave y volumen estándar para redes (-14 LUFS).
subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", tmp,
                "-af", ("volume=13dB,alimiter=limit=0.7:attack=1:release=50,aresample=48000" if CRUDO else "acompressor=threshold=-24dB:ratio=2.5:attack=8:release=120:makeup=2,loudnorm=I=-14:TP=-1.5:LRA=9,aresample=48000"),
                "-ac", "2", "-c:a", "pcm_s16le", out_wav], check=True)
subprocess.run(["rm", "-f", tmp])

# 4) Tiempos de la animación a partir de las palabras clave.
def at(frase, abs_t):
    i = frase - 1
    return round(starts[i] + (abs_t - cfg["frases"][i]["desde"]), 2)

def ini(frase):
    return round(starts[frase - 1], 2)

def fin(frase):
    f = cfg["frases"][frase - 1]
    return round(starts[frase - 1] + f["hasta"] - f["desde"], 2)

P = cfg["palabras"]
T = {}
T["badIn"] = at(1, P["esto"]) - 0.05
T["lab1"] = ini(2)
T["lab2"] = at(2, P["50"]) - 0.1
T["lab3"] = at(2, P["enlace"]) - 0.15
T["cap2"] = ini(3)
T["cap3"] = ini(4)
T["seen"] = ini(5)
T["seenPill"] = at(5, P["visto"])
T["reset"] = ini(6) - 0.1
T["cap6b"] = at(6, P["escribele"])
T["typeStart"] = at(6, P["esto6"]) + 0.35
T["typeEnd"] = fin(6) + 0.05
T["good1"] = ini(7)
T["send"] = round(min(T["typeEnd"] + 0.2, T["good1"] - 0.3), 2)
T["good2"] = at(7, P["sin1"]) - 0.05
T["good3"] = at(7, P["sin2"]) - 0.05
T["typing"] = ini(8) - 0.1
T["reply"] = at(8, P["contesta"]) - 0.15
T["cta"] = ini(9) - 0.45
T["ctaBox"] = at(9, P["comenta"]) - 0.1
T["ctaSub"] = at(9, P["y9"]) - 0.1
T["end"] = round(fin(9) + 1.6, 2)
T["cover"] = round(T["lab3"] + 0.6, 2)
T = {k: round(v, 2) for k, v in T.items()}
json.dump(T, open(out_t, "w"), indent=1)
print("niveles por frase (LUFS):", [round(v, 1) for v in niveles], "objetivo", round(objetivo, 1))
print("duración:", T["end"], "s")
