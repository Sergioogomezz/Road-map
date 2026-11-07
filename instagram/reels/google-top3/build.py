"""Monta el reel «Google top 3»: gancho (cámara) → portátil abriéndose → parte animada (con la voz
grabada aparte) → portátil cerrándose → cierre (cámara). Uso: python3 build.py"""
import json, subprocess, os, wave
import numpy as np

D0 = os.path.dirname(os.path.abspath(__file__)); os.chdir(D0)
TZ = "trozos"; OUT = "salida/reel-google-top3.mp4"
def run(*a): subprocess.run(list(a), check=True)
def ff(*a): run("ffmpeg", "-nostdin", "-v", "error", "-y", *a)

# --- Línea de tiempo -------------------------------------------------------
G0, G1 = 0.45, 7.45          # trozo del gancho (segundos dentro de trozos/gancho.mp4)
P0, P1 = 0.35, 2.95          # portátil abriéndose (trozos/portatil.mp4)
C0, C1 = 0.25, 15.0          # cierre (trozos/cierre.mp4)
XF = 0.35                    # fundido entre portátil y animación
S1 = G1 - G0; S2 = P1 - P0
V0 = S1 + (1.2 - P0)         # la voz central empieza cuando la tapa va por la mitad
S3_START = S1 + S2 - XF
V = json.load(open("tiempos-voz.json"))
off = V0 - S3_START
TE = {k: round(v + off, 3) for k, v in V.items()}
TE["exit"] = round(TE["vozFin"] + 0.9, 3); TE["end"] = round(TE["exit"] + XF, 3)
D3 = TE["end"]
S4_START = S3_START + D3 - XF
S4 = S2 / 1.25
S5_START = S4_START + S4
S5 = C1 - C0
TOTAL = S5_START + S5
json.dump(TE, open(f"{TZ}/T_escena.json", "w"), indent=1)

# --- Subtítulos sobre la cámara -------------------------------------------
P = json.load(open("palabras-partes.json"))
def w(part, word, k=0):   # instante de la palabra (en el trozo de cámara recortado)
    base = G0 if part == "gancho" else C0
    hits = [a for a, b, t in P[part] if t.lower().strip(".,;:¿?¡!") == word]   # palabra exacta
    return hits[k] - base
intro = {"cues": [
    {"from": 0, "to": w("gancho", "a", 0) - 0.02, "html": "Te apuesto lo que quieras…"},
    {"from": w("gancho", "a", 0) - 0.02, "to": w("gancho", "todos") - 0.05, "html": "…a que tu gimnasio está perdiendo <em>matrículas nuevas</em>"},
    {"from": w("gancho", "todos") - 0.05, "to": w("gancho", "haces") - 0.05, "html": "todos los meses por culpa de <em>Google</em>."},
    {"from": w("gancho", "haces") - 0.05, "to": V0, "html": "Haz esto <em>rápido</em>."},
    {"from": V0, "to": S1 + S2 + 0.5, "html": "Abre Google en <em>modo incógnito</em>…"}], "handle": None}
cierre = {"cues": [
    {"from": 0, "to": w("cierre", "por") - 0.05, "html": "Y lo peor es que casi siempre estás <em>escondido</em> más abajo"},
    {"from": w("cierre", "por") - 0.05, "to": w("cierre", "fotos") - 0.1, "html": "por 3 o 4 <em>tonterías técnicas</em>:"},
    {"from": w("cierre", "fotos") - 0.1, "to": w("cierre", "échale") - 0.1, "html": "<em>fotos antiguas</em> o <em>reseñas sin contestar</em>."},
    {"from": w("cierre", "échale") - 0.1, "to": w("cierre", "escríbeme") - 0.1, "html": "Échale un vistazo y, si no sales en ese <em>top 3</em>…"},
    {"from": w("cierre", "escríbeme") - 0.1, "to": S5 + 1, "html": "<em>escríbeme</em> y lo vemos en un momento."}],
    "handle": w("cierre", "escríbeme") + 0.3}
json.dump(intro, open(f"{TZ}/subs_intro.json", "w"), ensure_ascii=False)
json.dump(cierre, open(f"{TZ}/subs_cierre.json", "w"), ensure_ascii=False)

import sys
SOLO_AUDIO = "--solo-audio" in sys.argv and os.path.exists(f"{TZ}/video.mp4")
# --- Render de las partes dibujadas ---------------------------------------
if not SOLO_AUDIO:
  run("node", "render_partes.js", "escena.html", f"{TZ}/T_escena.json", str(D3), f"{TZ}/S3.mp4")
  run("node", "render_partes.js", "subtitulos.html", f"{TZ}/subs_intro.json", str(S1 + S2), f"{TZ}/subs_intro.mov", "--alpha")
  run("node", "render_partes.js", "subtitulos.html", f"{TZ}/subs_cierre.json", str(S5), f"{TZ}/subs_cierre.mov", "--alpha")

  # --- Vídeo -----------------------------------------------------------------
  N2 = round(S2 * 30); z0 = round((S2 - 0.65) * 30); zn = N2 - z0
  zin = f"if(lt(on,{z0}),1,1+0.6*pow(min(1,(on-{z0})/{zn}),2))"
  ZP = "x='iw*0.5-iw/zoom*0.5':y='ih*0.30-ih/zoom*0.30':d=1:s=1080x1920:fps=30"
  ff("-i", f"{TZ}/gancho.mp4", "-i", f"{TZ}/portatil.mp4", "-i", f"{TZ}/subs_intro.mov", "-filter_complex",
     f"[0:v]trim={G0}:{G1},setpts=PTS-STARTPTS,fps=30,format=yuv420p[a];"
     f"[1:v]trim={P0}:{P1},setpts=PTS-STARTPTS,scale=2160:3840:flags=lanczos,zoompan=z='{zin}':{ZP},format=yuv420p[b];"
     f"[a][b]concat=n=2:v=1:a=0[ab];[ab][2:v]overlay=0:0:format=auto,format=yuv420p[v]",
     "-map", "[v]", "-c:v", "libx264", "-preset", "medium", "-crf", "16", f"{TZ}/intro.mp4")
  N4 = round(S4 * 30)
  zout = "if(lt(on,15),1.6-0.6*(1-pow(1-on/15,3)),1)"
  ff("-i", f"{TZ}/portatil.mp4", "-filter_complex",
     f"[0:v]trim={P0}:{P1},setpts=PTS-STARTPTS,reverse,setpts=PTS/1.25,fps=30,scale=2160:3840:flags=lanczos,zoompan=z='{zout}':{ZP},trim=end_frame={N4},format=yuv420p[v]",
     "-map", "[v]", "-c:v", "libx264", "-preset", "medium", "-crf", "16", f"{TZ}/S4.mp4")
  ff("-i", f"{TZ}/cierre.mp4", "-i", f"{TZ}/subs_cierre.mov", "-filter_complex",
     f"[0:v]trim={C0}:{C1},setpts=PTS-STARTPTS,fps=30,format=yuv420p[c];[c][1:v]overlay=0:0:format=auto,format=yuv420p[v]",
     "-map", "[v]", "-c:v", "libx264", "-preset", "medium", "-crf", "16", f"{TZ}/S5.mp4")
  o1 = S1 + S2 - XF; o2 = o1 + D3 - XF
  ff("-i", f"{TZ}/intro.mp4", "-i", f"{TZ}/S3.mp4", "-i", f"{TZ}/S4.mp4", "-i", f"{TZ}/S5.mp4", "-filter_complex",
     "[0:v]settb=AVTB,fps=30,format=yuv420p[a];[1:v]settb=AVTB,fps=30,format=yuv420p[b];[2:v]settb=AVTB,fps=30,format=yuv420p[c];[3:v]settb=AVTB,fps=30,format=yuv420p[d];"
     f"[a][b]xfade=transition=fade:duration={XF}:offset={o1:.3f}[ab];[ab][c]xfade=transition=fade:duration={XF}:offset={o2:.3f}[abc];[abc][d]concat=n=2:v=1:a=0[v]",
     "-map", "[v]", "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", f"{TZ}/video.mp4")

# --- Audio -----------------------------------------------------------------
SR = 48000
CHAIN = "highpass=f=80,acompressor=threshold=-26dB:ratio=2:attack=10:release=150:makeup=2,loudnorm=I=-15:TP=-2:LRA=9"
def dec(path, a=None, b=None, af=None):
    cmd = ["ffmpeg", "-nostdin", "-v", "error", "-i", path]
    flt = []
    if a is not None: flt.append(f"atrim={a}:{b},asetpts=PTS-STARTPTS")
    if af: flt.append(af)
    if flt: cmd += ["-af", ",".join(flt)]
    cmd += ["-ac", "1", "-ar", str(SR), "-f", "f32le", "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, dtype=np.float32).astype(float)
mix = np.zeros(int((TOTAL + 1) * SR))
def put(t, x, g=1.0):
    i = int(t * SR); j = min(len(mix), i + len(x)); mix[i:j] += x[: j - i] * g
put(0, dec(f"{TZ}/gancho.wav", G0, G1, CHAIN))
put(V0, dec(f"{TZ}/voz-medio.wav", af="loudnorm=I=-15:TP=-2:LRA=9"))
put(S5_START, dec(f"{TZ}/cierre.wav", C0, C1, CHAIN))
TA = {k: S3_START + v for k, v in TE.items()}
TA.update(total=TOTAL, tapa_arriba=S1 + (1.95 - P0), zoom_in=S1 + S2 - 0.62, select=S3_START + TE["type2"] - 0.3,
          tapa_cerrada=S4_START + (P1 - 0.5) / 1.25)
json.dump(TA, open(f"{TZ}/sfx_tiempos.json", "w"), indent=1)
run("python3", "sfx.py", f"{TZ}/sfx_tiempos.json", f"{TZ}/sfx.wav")
w_ = wave.open(f"{TZ}/sfx.wav"); s = np.frombuffer(w_.readframes(w_.getnframes()), dtype=np.int16).reshape(-1, 2)[:, 0] / 32768
put(0, s, 0.22)
fade = int(0.04 * SR)
for t in (S1, S5_START):                         # pequeños fundidos en los cortes de cámara
    i = int(t * SR); mix[i - fade:i] *= np.linspace(1, 0.6, fade); mix[i:i + fade] *= np.linspace(0.6, 1, fade)
mix = mix[: int(TOTAL * SR)]
tmp = f"{TZ}/mezcla.f32"; mix.astype(np.float32).tofile(tmp)
ff("-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", tmp, "-af", "alimiter=limit=0.89:level=false", "-ac", "2", "-c:a", "pcm_s16le", f"{TZ}/audio.wav")
ff("-i", f"{TZ}/video.mp4", "-i", f"{TZ}/audio.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
   "-t", f"{TOTAL:.3f}", "-movflags", "+faststart", OUT)
ff("-ss", "1.2", "-i", OUT, "-frames:v", "1", "-q:v", "2", "salida/portada.jpg")
print(f"Listo: {OUT} · {TOTAL:.2f} s · partes: gancho 0–{S1:.2f}, portátil –{S1+S2:.2f}, pantalla {S3_START:.2f}–{S3_START+D3:.2f}, cierre {S5_START:.2f}–{TOTAL:.2f}")
