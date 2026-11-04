# Guion de voz · Reel «El mapa»

Graba las 10 frases seguidas, **dejando 1 segundo de silencio entre una y otra**.
Con esas pausas ajusto la animación a tu ritmo.

| # | Frase | En pantalla |
|---|---|---|
| 1 | Si tu gimnasio no sale aquí, no existe. | Se escribe la búsqueda y salen los resultados |
| 2 | Alguien busca «gimnasio cerca de mí» en Google Maps… y le salen tres. | Se marcan las 3 chinchetas |
| 3 | Los tres de arriba tienen tres cosas en común. | |
| 4 | Uno: muchas reseñas, y recientes. | Se resaltan las reseñas |
| 5 | Dos: fotos reales, con gente entrenando. | Se resaltan las fotos |
| 6 | Tres: la ficha completa: horario, teléfono y categoría. | Se resalta el horario |
| 7 | ¿Y el cuarto? Puede ser mejor gimnasio… | Baja la lista y aparece «Tu gimnasio» |
| 8 | …pero casi nadie baja hasta aquí. | «Casi nadie baja hasta aquí» |
| 9 | Lo bueno: las tres cosas se arreglan sin pagar anuncios. | Suben las reseñas y «Tu gimnasio» entra en el top 3 |
| 10 | Comenta AUDITA y te digo en qué puesto sale tu gimnasio. | Cierre |

## Cómo grabarlo

Igual que el anterior: Notas de voz, habitación pequeña, móvil a un palmo y tono de conversación.
Si te trabas, repite la frase entera después de una pausa.

## Pie de foto

```
¿Tu gimnasio sale en el top 3 de Google Maps cuando alguien busca «gimnasio cerca de mí»?

Los que salen arriba tienen 3 cosas en común:
✅ Muchas reseñas y recientes
✅ Fotos reales y actualizadas
✅ Ficha completa: horario, teléfono y categoría

El cuarto puede ser mejor gimnasio, pero casi nadie baja hasta ahí. Y las tres cosas se arreglan sin pagar anuncios.

👉 Comenta AUDITA y te digo en qué puesto sale tu gimnasio y qué le falta.

#googlemaps #gimnasios #marketingdeportivo #santander
```

## Notas

- El mapa es dibujado y los gimnasios tienen nombres inventados (lo indica la etiqueta «Ejemplo · nombres ficticios»).
- `salida/reel-mapa-con-voz.mp4`: versión final con voz y efectos, sin música (32,8 s).
- `salida/reel-mapa.mp4`: versión con efectos y sin voz.
- En la grabación, la frase 8 se dijo «pero si nadie baja hasta aquí» (en pantalla se mantiene «casi nadie»),
  la frase 7 se acorta en el montaje y la 10 es la segunda toma.
- Rehacer con voz: `python3 sincronizar.py frases-voz.json salida/voz-montada.wav tiempos-voz.json`
  y luego `node render.js --voz salida/voz-montada.wav --tiempos tiempos-voz.json`.
