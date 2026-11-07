"""Efectos de sonido del reel «Google top 3». Uso: python3 sfx.py tiempos-abs.json salida.wav
Todos son sintetizados y con tono (nada de ruido tipo «respiración» en las transiciones)."""
import json, sys, wave
import numpy as np

SR = 48000
T = json.load(open(sys.argv[1]))
buf = np.zeros(int(SR * (T["total"] + 0.5)))
rng = np.random.default_rng(9)

def env(n, tau): return np.exp(-np.arange(n) / (SR * tau))
def put(t0, sig, g):
    i = int(t0 * SR); j = min(len(buf), i + len(sig))
    if 0 <= i < len(buf): buf[i:j] += sig[: j - i] * g
def tone(f0, f1, length, tau):
    n = int(SR * length); f = np.linspace(f0, f1, n)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, tau)
def click(length=0.012, tau=0.003):
    n = int(SR * length); x = rng.standard_normal(n) * env(n, tau)
    return np.convolve(x, np.ones(6) / 6, mode="same")

def key(t0): put(t0, click(0.02, 0.004) + 0.3 * tone(2200, 2200, 0.02, 0.004), 0.05)
def pop(t0, g=0.28): put(t0, tone(420, 980, 0.09, 0.03), g); put(t0, click(0.01, 0.002), g * 0.4)
def drop(t0, g=0.2): put(t0, tone(900, 300, 0.12, 0.05), g)
def ding(t0, g=0.13): put(t0, tone(1046, 1046, 0.35, 0.09) + 0.5 * tone(1568, 1568, 0.35, 0.07), g)
def bloop(t0, g=0.12): put(t0, tone(760, 340, 0.16, 0.06), g)
def thunk(t0, g=0.35): put(t0, tone(120, 70, 0.16, 0.05), g); put(t0, click(0.016, 0.004), 0.4 * g)        # tapa que llega arriba
def clack(t0, g=0.4): put(t0, tone(160, 80, 0.12, 0.035), g); put(t0, click(0.02, 0.005), 0.8 * g)          # tapa que se cierra
def sube(t0, g=0.12): put(t0, tone(300, 760, 0.28, 0.12), g)
def transicion(t0, g=0.13):
    put(t0, tone(480, 1080, 0.22, 0.09) + 0.25 * tone(960, 2160, 0.22, 0.05), g)
    put(t0 + 0.16, tone(1318, 1318, 0.3, 0.08) + 0.3 * tone(2637, 2637, 0.3, 0.04), g * 0.7)
def tono_llamada(t0, t1, g=0.06):
    t = t0
    while t < t1 - 0.3:
        n = int(SR * 0.4); tt = np.arange(n) / SR
        s = (np.sin(2 * np.pi * 440 * tt) + np.sin(2 * np.pi * 480 * tt)) * np.minimum(1, np.minimum(tt, 0.4 - tt) / 0.02)
        put(t, s, g); put(t + 0.6, s, g); t += 2.2

thunk(T["tapa_arriba"]); transicion(T["zoom_in"])
for a, b in ((T["type1"], T["type1End"]), (T["type2"], T["type2End"])):
    t = a
    while t < b:
        key(t); t += 0.05 + rng.random() * 0.04
put(T["select"], click(0.015, 0.004), 0.12)
pop(T["results"] - 0.08, 0.22)
for i in range(3): drop(T["results"] + 0.15 + i * 0.1)
ding(T["top3"])
for i in range(3): put(T["mapa"] + i * 0.15, click(0.012, 0.003), 0.1)
for i in range(7): bloop(T["fuga"] + i * 0.28 + 0.9)
pop(T["chip1"], 0.2); pop(T["chip2"], 0.2)
sube(T["m4"] + 0.15); pop(T["mudar"], 0.18)
put(T["tap"], click(0.015, 0.004), 0.2)
tono_llamada(T["llamada"] + 0.2, T["exit"])
transicion(T["exit"])
clack(T["tapa_cerrada"])

buf = buf / (np.max(np.abs(buf)) or 1) * 0.5
pcm = (np.clip(buf, -1, 1) * 32767).astype(np.int16)
with wave.open(sys.argv[2], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(np.repeat(pcm[:, None], 2, axis=1).tobytes())
