# Reel «Google top 3» (fusionado: cámara + pantalla animada)

1. **Gancho** (cámara, IMG_7364): «Te apuesto lo que quieras a que tu gimnasio está perdiendo matrículas nuevas todos los meses por culpa de Google. Haz esto rápido.»
2. **Transición**: el portátil se abre (IMG_7376) y hacemos zoom a la pantalla.
3. **Pantalla animada** con la voz grabada aparte (voz/medio.m4a): búsqueda en incógnito, mapa con el top 3,
   fuga de clientes, «da igual el material o las clases» y el vecino nuevo que llama a uno de los tres primeros.
4. **Transición**: el portátil se cierra (la misma toma, al revés).
5. **Cierre** (cámara, IMG_7371, última toma): «Y lo peor es que casi siempre estás escondido…»

Resultado: `salida/reel-google-top3.mp4` (46,9 s). Los vídeos originales están en Drive (carpeta ACTIVONORTE) y no se suben aquí.

## Rehacerlo

- `python3 sincronizar.py frases-voz.json trozos/voz-medio.wav tiempos-voz.json` (voz central)
- `python3 build.py` (todo) o `python3 build.py --solo-audio` (solo el sonido)
- Necesita en `trozos/` los recortes `gancho`, `cierre` y `portatil` (.mp4 y .wav) sacados de los originales en 1080p.

## Pie de foto

```
Haz esta prueba en 10 segundos 👇

Abre Google en modo incógnito y busca «gimnasio en [tu barrio]».
Si no sales en los 3 primeros del mapa, la gente nueva de tu zona está llamando a otro.

Casi siempre es por tonterías técnicas: fotos antiguas o reseñas sin contestar.

📩 Si no sales en el top 3, escríbeme por privado y lo vemos en 10 minutos.

#googlemaps #gimnasios #marketingdeportivo #santander
```
