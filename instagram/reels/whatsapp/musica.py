"""Música original del reel, compuesta sobre los tiempos del vídeo.

Uso: python3 musica.py tiempos-voz.json salida/musica.wav salida/ambiente.wav

- musica.wav: la base musical (se baja sola cuando habla Sergio).
  · Del inicio a «Resultado»: tensa, en La menor (Am · F · E).
  · En «Resultado: visto»: corte en seco.
  · Desde «Prueba esto»: luminosa y con ritmo (C · G · Am · F · C · G → C).
- ambiente.wav: efectos que no se bajan con la voz: golpe inicial, grillos del
  silencio incómodo, subida antes del cierre y golpe final.
Todo está sintetizado aquí: no usa música de terceros.
"""
import json, subprocess, sys
import numpy as np
from scipy import signal

SR = 48000
T = json.load(open(sys.argv[1]))
OUT_M, OUT_A = sys.argv[2], sys.argv[3]
END = T["end"] + 0.6
N = int(END * SR)
rng = np.random.default_rng(11)
BEAT = 60 / 96          # 96 pulsaciones por minuto
BAR = 4 * BEAT


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(n):
    return np.arange(n) / SR


def env_adsr(n, a, r):
    e = np.ones(n)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e


def lp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, "low", fs=SR, output="sos"), x)


def hp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, "high", fs=SR, output="sos"), x)


def bp(x, f1, f2, order=2):
    return signal.sosfilt(signal.butter(order, [f1, f2], "band", fs=SR, output="sos"), x)


class Stem:
    def __init__(self, send=0.0):
        self.x = np.zeros((2, N)); self.send = send

    def add(self, t0, sig, gain=1.0, pan=0.0):
        i = int(t0 * SR); n = min(len(sig), N - i)
        if n <= 0 or i < 0: return
        gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        self.x[0, i:i + n] += sig[:n] * gain * gl
        self.x[1, i:i + n] += sig[:n] * gain * gr


# ---------- instrumentos ----------
def supersaw(f, n, seed):
    r = np.random.default_rng(seed); t = tt(n); out = np.zeros(n)
    for c in (-11, -5, 0, 5, 11):
        ff = f * 2 ** (c / 1200)
        out += 2 * ((ff * t + r.random()) % 1.0) - 1
    return out / 5


def pad(stem, notes, t0, dur, cutoff, a=0.4, r=0.6, gain=1.0):
    n = int((dur + r) * SR)
    for side, pan in ((0, -0.7), (1, 0.7)):
        s = sum(supersaw(mtof(m), n, seed=int(m * 7 + side * 101 + t0 * 13)) for m in notes) / len(notes)
        s = lp(lp(s, cutoff), cutoff * 1.4) * env_adsr(n, a, r)
        stem.add(t0, s, gain, pan)


def bass_note(m, dur, bright=600):
    n = int(dur * SR); t = tt(n); f = mtof(m)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.25 * lp(2 * ((f * t) % 1) - 1, bright)
    e = np.exp(-t / (dur * 0.55)) * env_adsr(n, 0.005, 0.03)
    return np.tanh(1.6 * s * e) / 1.6


def pluck(m, dur=0.7):
    n = int(dur * SR); t = tt(n); f = mtof(m); s = np.zeros(n)
    for k in range(1, 7):
        s += np.sin(2 * np.pi * f * k * t) / k ** 1.3 * np.exp(-t * (4 + 3.5 * k))
    s += 0.05 * rng.standard_normal(n) * np.exp(-t / 0.004)
    return lp(s, 4500) * env_adsr(n, 0.002, 0.05)


def kick(big=False):
    n = int((0.9 if big else 0.45) * SR); t = tt(n)
    f = 45 + (150 if big else 110) * np.exp(-t / 0.035)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.4 if big else 0.16))
    s += 0.3 * hp(rng.standard_normal(n), 2000) * np.exp(-t / 0.003)
    return np.tanh(1.5 * s)


def clap():
    n = int(0.35 * SR); t = tt(n); s = np.zeros(n)
    for k, d in enumerate((0, 0.009, 0.018)):
        i = int(d * SR); m = n - i
        s[i:] += rng.standard_normal(m) * np.exp(-tt(m) / (0.006 if k < 2 else 0.09))
    return bp(s, 900, 3800)


def hat(dec=0.03):
    n = int(0.12 * SR); t = tt(n)
    return hp(rng.standard_normal(n), 7000) * np.exp(-t / dec)


def cricket(t0, t1, f, stem, pan):
    t = t0 + rng.random() * 0.2
    while t < t1 - 0.2:
        n = int(0.16 * SR); tc = tt(n)
        puls = sum(np.exp(-((tc - k * 0.032 - 0.01) / 0.006) ** 2) for k in range(4))
        stem.add(t, np.sin(2 * np.pi * f * tc) * puls, 1.0, pan)
        t += 0.42 + rng.random() * 0.12


def riser(t0, t1):
    n = int((t1 - t0) * SR); t = tt(n); x = rng.standard_normal(n); out = np.zeros(n)
    blk = int(0.02 * SR); zi = None
    for i in range(0, n, blk):
        fc = 400 * (15 ** (i / n))
        sos = signal.butter(2, [fc * 0.7, fc * 1.3], "band", fs=SR, output="sos")
        if zi is None: zi = signal.sosfilt_zi(sos) * 0
        out[i:i + blk], zi = signal.sosfilt(sos, x[i:i + blk], zi=zi)
    sweep = np.sin(2 * np.pi * np.cumsum(250 * (6 ** (t / t[-1]))) / SR)
    return (out + 0.15 * sweep) * (t / t[-1]) ** 2


def sub_boom(dur=1.4):
    n = int(dur * SR); t = tt(n)
    return np.sin(2 * np.pi * np.cumsum(38 + 40 * np.exp(-t / 0.05)) / SR) * np.exp(-t / (dur / 3))


def crash(dur=1.6):
    n = int(dur * SR); t = tt(n)
    return hp(rng.standard_normal(n), 3500) * np.exp(-t / (dur / 4))


# ---------- composición ----------
S = {k: Stem(send) for k, send in
     dict(pad=0.35, bass=0.05, kick=0.08, clap=0.35, hats=0.1, arp=0.4).items()}
A = {k: Stem(send) for k, send in dict(boom=0.5, crickets=0.25, riser=0.3, impact=0.6).items()}

seen, reset, cta, box, end = T["seen"], T["reset"], T["cta"], T["ctaBox"], T["end"]

# Parte A (tensa): Am - F - E, hasta «Resultado»
partA = [(0.0, 2 * BAR, [57, 60, 64], 45), (2 * BAR, 4 * BAR, [57, 60, 65], 41), (4 * BAR, seen, [56, 59, 64], 40)]
for k, (a, b, notes, root) in enumerate(partA):
    b = min(b, seen)
    pad(S["pad"], notes, a, b - a, cutoff=700 + 350 * k, a=0.15 if k == 0 else 0.3, r=0.04 if b >= seen else 0.5, gain=1.0)
    t = a
    while t < b - 0.05:
        idx = int(round((t - a) / (BEAT / 2)))
        S["bass"].add(t, bass_note(root, BEAT / 2 * 0.9), 1.0 if idx % 2 == 0 else 0.6)
        t += BEAT / 2
t = BAR
while t < seen - 0.05:
    i = int(round(t / (BEAT / 4)))
    S["hats"].add(t, hat(0.02), [1, .35, .6, .35][i % 4] * 0.8, pan=0.3)
    t += BEAT / 4

# Parte B (luminosa): C G Am F C G → C final
chords = [([60, 64, 67], 48), ([59, 62, 67], 43), ([57, 60, 64], 45), ([57, 60, 65], 41), ([60, 64, 67], 48), ([59, 62, 67], 43)]
for k, (notes, root) in enumerate(chords):
    a = reset + k * BAR
    b = min(a + BAR, box)
    if a >= box: break
    pad(S["pad"], notes, a, b - a, cutoff=2200, a=0.25 if k == 0 else 0.08, r=0.35, gain=0.9)
    # arpegio
    seq = [notes[0] + 12, notes[1] + 12, notes[2] + 12, notes[0] + 24, notes[2] + 12, notes[1] + 12, notes[2] + 12, notes[0] + 24]
    for j in range(8):
        tj = a + j * BEAT / 2
        if tj < b - 0.05:
            S["arp"].add(tj, pluck(seq[j]), 0.9 if j % 2 == 0 else 0.6, pan=-0.45 if j % 2 == 0 else 0.45)
    # bajo
    for j in range(8):
        tj = a + j * BEAT / 2
        if tj < b - 0.05 and (k > 0 or j >= 4):
            S["bass"].add(tj, bass_note(root + (12 if j % 2 else 0), BEAT / 2 * 0.85, 900), 0.9 if j % 2 == 0 else 0.55)
    # batería (desde el segundo compás y hasta la subida del cierre)
    if k >= 1:
        for j in range(4):
            tj = a + j * BEAT
            if tj < cta:
                if j % 2 == 0: S["kick"].add(tj, kick(), 1.0)
                else: S["clap"].add(tj, clap(), 1.0)
        for j in range(8):
            tj = a + j * BEAT / 2 + BEAT / 4
            if tj < box - 0.05:
                S["hats"].add(tj, hat(0.035), 0.8 if j % 2 else 0.5, pan=0.3)

# Final: C sostenido tras el golpe
pad(S["pad"], [60, 64, 67, 72], box, end - box, cutoff=2600, a=0.02, r=1.2, gain=1.0)
S["bass"].add(box, bass_note(36, 2.5, 900), 1.0)
t, j = box, 0
seq = [72, 76, 79, 84, 79, 76]
while t < end - 1.2:
    S["arp"].add(t, pluck(seq[j % len(seq)], 1.0), 0.7, pan=-0.4 if j % 2 else 0.4)
    t += BEAT; j += 1

# Ambiente
A["boom"].add(0.0, sub_boom(1.6), 1.0)
A["boom"].add(0.0, kick(True), 0.5)
cricket(T["seenPill"] - 0.25, reset, 4650, A["crickets"], -0.5)
cricket(T["seenPill"] - 0.05, reset, 4950, A["crickets"], 0.5)
A["riser"].add(cta, riser(cta, box), 1.0)
A["impact"].add(box, sub_boom(1.8), 1.0)
A["impact"].add(box, kick(True), 0.8)
A["impact"].add(box, crash(1.8) * 0.5, 1.0)

# ---------- mezcla ----------
OBJ = dict(pad=-25, bass=-24, kick=-23, clap=-31, hats=-33, arp=-27,
           boom=-17, crickets=-22, riser=-23, impact=-16)


def nivelar(stem, objetivo):
    x = stem.x; m = np.abs(x).sum(0) > 1e-4
    if not m.any(): return x
    rms = np.sqrt((x[:, m] ** 2).mean())
    return x * 10 ** ((objetivo - 20 * np.log10(rms)) / 20)


def ir(rt=2.0, seed=5):
    r = np.random.default_rng(seed); n = int(rt * SR); t = tt(n)
    out = []
    for c in range(2):
        h = r.standard_normal(n) * np.exp(-t / (rt / 6.9))
        h = lp(h, 6000); h[: int(0.015 * SR)] = 0
        out.append(h / np.sqrt((h ** 2).sum()))
    return out


IR = ir()


def bus(stems, objetivo_lufs, salida, fade_out=1.4):
    dry = np.zeros((2, N)); wet = np.zeros((2, N))
    for k, s in stems.items():
        x = nivelar(s, OBJ[k]); dry += x; wet += x * s.send
    for c in range(2):
        dry[c] += 0.55 * signal.fftconvolve(wet[c], IR[c])[:N]
    nf = int(fade_out * SR); i_end = int(T["end"] * SR)
    dry[:, i_end - nf:i_end] *= np.linspace(1, 0, nf); dry[:, i_end:] = 0
    dry = np.tanh(dry * 1.2) / 1.2
    # Volumen fijo (sin compresión automática, para no rellenar el silencio de «visto»)
    p = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                        "-af", "ebur128", "-f", "null", "-"], input=dry.T.astype(np.float32).tobytes(), capture_output=True)
    txt = p.stderr.decode(); i = txt.rfind("I:")
    medido = float(txt[i + 2:].split("LUFS")[0])
    g = 10 ** ((objetivo_lufs - medido) / 20)
    g = min(g, 10 ** (-1 / 20) / max(np.abs(dry).max(), 1e-9))   # pico por debajo de -1 dB
    pcm = (np.clip(dry * g, -1, 1) * 32767).astype(np.int16)
    import wave
    with wave.open(salida, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.T.tobytes())
    print(f"{salida}: {medido:.1f} LUFS -> {objetivo_lufs + 20 * np.log10(g / 10 ** ((objetivo_lufs - medido) / 20)):.1f} LUFS")


bus(S, -22, OUT_M)
bus(A, -26, OUT_A, fade_out=0.3)
print("ok:", OUT_M, OUT_A)
