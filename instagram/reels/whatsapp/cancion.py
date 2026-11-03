"""Usa una canción externa como música del reel, con los mismos cortes que la música original.

Uso: python3 cancion.py tiempos-voz.json cancion.wav salida/musica.wav REENTRADA [REALCE_INTRO_dB]
- Del inicio a «Resultado: visto»: la canción desde su principio; ahí se corta en seco.
- Desde «Prueba esto»: vuelve desde el segundo REENTRADA de la canción (su parte fuerte).
- Se desvanece al final y se deja al mismo volumen que la música original (-22 LUFS).
"""
import json, subprocess, sys, wave
import numpy as np

T = json.load(open(sys.argv[1])); src, out, reent = sys.argv[2], sys.argv[3], float(sys.argv[4])
realce = float(sys.argv[5]) if len(sys.argv) > 5 else 0.0   # sube la primera parte si la canción empieza muy suave
SR = 48000
raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", src, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
                     capture_output=True, check=True).stdout
song = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).T.astype(float)
N = int((T["end"] + 0.6) * SR)
mix = np.zeros((2, N))
fade = lambda n: np.linspace(0, 1, n)

a_end = int(T["seen"] * SR)
mix[:, :a_end] = song[:, :a_end]
mix[:, a_end - int(0.015 * SR):a_end] *= fade(int(0.015 * SR))[::-1]

b0, b_end = int(T["reset"] * SR), int(T["end"] * SR)
seg = song[:, int(reent * SR):int(reent * SR) + (b_end - b0)]
mix[:, b0:b0 + seg.shape[1]] = seg
mix[:, b0:b0 + int(0.01 * SR)] *= fade(int(0.01 * SR))
nf = int(1.4 * SR)
mix[:, b_end - nf:b_end] *= fade(nf)[::-1]
mix[:, b_end:] = 0

p = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-af", "ebur128",
                    "-f", "null", "-"], input=mix.T.astype(np.float32).tobytes(), capture_output=True)
txt = p.stderr.decode(); i = txt.rfind("I:"); medido = float(txt[i + 2:].split("LUFS")[0])
mix[:, :a_end] *= 10 ** (realce / 20)      # el realce se aplica después de medir: no baja el resto
g = min(10 ** ((-22 - medido) / 20), 10 ** (-1 / 20) / np.abs(mix).max())
pcm = (np.clip(mix * g, -1, 1) * 32767).astype(np.int16)
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.T.tobytes())
print(f"{out}: canción {medido:.1f} LUFS -> -22 LUFS (reentrada en {reent} s)")
