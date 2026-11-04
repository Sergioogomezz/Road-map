"""Efectos de sonido del reel «El mapa» a partir de tiempos.json.
Uso: python3 sfx.py tiempos.json salida.wav
"""
import json, sys, wave
import numpy as np

SR = 48000
T = json.load(open(sys.argv[1]))
buf = np.zeros(int(SR * (T["end"] + 0.5)))
rng = np.random.default_rng(5)


def env(n, tau):
    return np.exp(-np.arange(n) / (SR * tau))


def put(t0, sig, g):
    i = int(t0 * SR); j = min(len(buf), i + len(sig))
    if 0 <= i < len(buf): buf[i:j] += sig[: j - i] * g


def tone(f0, f1, length, tau):
    n = int(SR * length); f = np.linspace(f0, f1, n)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, tau)


def noise(length, tau):
    n = int(SR * length); x = rng.standard_normal(n) * env(n, tau)
    return np.convolve(x, np.ones(6) / 6, mode="same")


def key(t0): put(t0, noise(0.02, 0.004) + 0.3 * tone(2200, 2200, 0.02, 0.004), 0.05)
def pop(t0, g=0.3): put(t0, tone(420, 980, 0.09, 0.03), g); put(t0, noise(0.01, 0.002), g * 0.4)
def drop(t0, g=0.22): put(t0, tone(900, 300, 0.12, 0.05), g)                     # chincheta que cae
def tick(t0, g=0.1): put(t0, noise(0.012, 0.003), g)
def ding(t0, g=0.13): put(t0, tone(1046, 1046, 0.35, 0.09) + 0.5 * tone(1568, 1568, 0.35, 0.07), g)
def womp(t0, g=0.2): put(t0, tone(320, 170, 0.45, 0.2) + 0.3 * tone(640, 340, 0.45, 0.15), g)


def whoosh(t0, length=0.4, g=0.1):
    n = int(SR * length)
    x = rng.standard_normal(n) * np.sin(np.linspace(0, np.pi, n)) ** 2
    put(t0, np.convolve(x, np.ones(40) / 40, mode="same"), g)


def exito(t0, g=0.14):                                                           # arpegio de Do mayor
    for k, f in enumerate((523, 659, 784, 1046)):
        put(t0 + k * 0.07, tone(f, f, 0.4, 0.12) + 0.3 * tone(2 * f, 2 * f, 0.4, 0.06), g)


t = T["typeStart"]
while t < T["typeEnd"]:
    key(t); t += 0.05 + rng.random() * 0.04
whoosh(T["results"], 0.45, 0.1)
for i in range(3): drop(T["results"] + 0.1 + i * 0.12)
for i in range(3): tick(T["tres"] + i * 0.3, 0.12)
for k in ("f1", "f2", "f3"): ding(T[k])
whoosh(T["cuarto"], 0.35, 0.08); drop(T["cuarto"] + 0.05, 0.15)
womp(T["nadie"])
a = T["arreglo"] + 0.2                                                           # contador de reseñas
for i in range(28):
    x = i / 27
    tt = a + 1.6 * (0.5 - 0.5 * np.cos(np.pi * x))
    tick(tt, 0.06)
pop(T["arreglo"] + 0.8, 0.2); ding(T["arreglo"] + 1.3, 0.1)
whoosh(T["climb"], 0.5, 0.1); exito(T["climb"] + 0.65)
c0 = T["cta"] + 0.3
whoosh(T["cta"], 0.45, 0.08)
box = T.get("ctaBox", c0 + 0.35)
pop(box, 0.28); ding(box + 0.1, 0.1)

buf = buf / (np.max(np.abs(buf)) or 1) * 0.5
pcm = (np.clip(buf, -1, 1) * 32767).astype(np.int16)
with wave.open(sys.argv[2], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(np.repeat(pcm[:, None], 2, axis=1).tobytes())
