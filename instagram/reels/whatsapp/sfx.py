"""Genera los efectos de sonido del reel a partir de tiempos.json.
Uso: python3 sfx.py tiempos.json salida.wav
"""
import json, sys, wave
import numpy as np

SR = 48000
T = json.load(open(sys.argv[1]))
dur = T["end"]
buf = np.zeros(int(SR * (dur + 0.5)))
rng = np.random.default_rng(7)

def env(n, tau):
    return np.exp(-np.arange(n) / (SR * tau))

def put(t0, sig, gain):
    i = int(t0 * SR)
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain

def tone(f0, f1, length, tau):
    n = int(SR * length)
    f = np.linspace(f0, f1, n)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * env(n, tau)

def noise(length, tau):
    n = int(SR * length)
    x = rng.standard_normal(n) * env(n, tau)
    return np.convolve(x, np.ones(6) / 6, mode="same")

def pop(t0, g=0.32):        # mensaje enviado
    put(t0, tone(420, 980, 0.09, 0.03), g)
    put(t0, noise(0.01, 0.002), g * 0.4)

def wrong(t0, g=0.16):      # etiqueta roja
    a = tone(330, 330, 0.11, 0.05) + 0.3 * tone(990, 990, 0.11, 0.03)
    b = tone(247, 247, 0.16, 0.07) + 0.3 * tone(741, 741, 0.16, 0.04)
    put(t0, a, g); put(t0 + 0.1, b, g)

def ding(t0, g=0.13):       # etiqueta verde
    put(t0, tone(1046, 1046, 0.35, 0.09) + 0.5 * tone(1568, 1568, 0.35, 0.07), g)

def tick(t0, g=0.12):       # visto
    put(t0, noise(0.012, 0.003), g); put(t0 + 0.07, noise(0.012, 0.003), g)

def key(t0, g=0.05):        # tecla
    put(t0, noise(0.02, 0.004) + 0.3 * tone(2200, 2200, 0.02, 0.004), g)

def whoosh(t0, length=0.4, g=0.1):
    n = int(SR * length)
    x = rng.standard_normal(n) * np.sin(np.linspace(0, np.pi, n)) ** 2
    k = np.ones(40) / 40
    put(t0, np.convolve(x, k, mode="same"), g)

def transicion(t0, g=0.13):  # paso al cierre: barrido con tono que sube + «tin» (sin ruido, no suena a respiración)
    put(t0, tone(480, 1080, 0.22, 0.09) + 0.25 * tone(960, 2160, 0.22, 0.05), g)
    put(t0 + 0.16, tone(1318, 1318, 0.3, 0.08) + 0.3 * tone(2637, 2637, 0.3, 0.04), g * 0.7)

def incoming(t0, g=0.2):    # mensaje recibido
    put(t0, tone(784, 784, 0.12, 0.05), g); put(t0 + 0.11, tone(1175, 1175, 0.22, 0.08), g)

pop(T["badIn"])
for k in ("lab1", "lab2", "lab3"):
    wrong(T[k])
tick(T["seen"])
whoosh(T["reset"])
t = T["typeStart"]
while t < T["typeEnd"]:
    key(t)
    t += 0.07 + rng.random() * 0.06
pop(T["send"])
for k in ("good1", "good2", "good3"):
    ding(T[k])
incoming(T["reply"])
c0 = T["cta"] + 0.3
transicion(T["cta"])
box = T.get("ctaBox", c0 + 0.35)
pop(box, 0.28)
ding(box + 0.1, 0.1)

peak = np.max(np.abs(buf)) or 1
buf = buf / peak * 0.5
pcm = (np.clip(buf, -1, 1) * 32767).astype(np.int16)
st = np.repeat(pcm[:, None], 2, axis=1)
with wave.open(sys.argv[2], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(st.tobytes())
