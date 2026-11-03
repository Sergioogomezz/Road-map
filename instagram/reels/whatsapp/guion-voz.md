# Guion de voz · Reel «El chat de WhatsApp»

Graba las 9 frases seguidas, **dejando 1 segundo de silencio entre una y otra**.
Con esas pausas ajusto la animación a tu ritmo.

| # | Frase | En pantalla |
|---|---|---|
| 1 | Si le mandas esto a un ex-socio, no va a volver. | Llega el mensaje malo |
| 2 | Lista de difusión, un cincuenta por ciento de descuento y un enlace. | Salen las 3 etiquetas rojas |
| 3 | Le llega igual que a otras doscientas personas… | |
| 4 | …y encima le dices que tu cuota vale la mitad. | |
| 5 | Resultado: visto. Y nada. | Doble check azul |
| 6 | Prueba esto. Escríbele como le escribirías a un amigo. | Se escribe el mensaje bueno |
| 7 | Uno a uno, con su nombre. Sin precio. Sin enlace. | Etiquetas verdes |
| 8 | Solo reabres la conversación. El precio va después, cuando te contesta. | Carlos responde |
| 9 | ¿Quieres la plantilla? Comenta MENSAJE y te la mando por privado. | Cierre |

## Cómo grabarlo

- App **Notas de voz** del iPhone.
- Habitación pequeña y con muebles (un dormitorio suena mejor que un salón vacío). Sin ventilador ni tele.
- Móvil a un palmo de la boca, un poco de lado para que no se oigan las «p».
- Tono de conversación, como si se lo contaras a un dueño de gimnasio en un café. Con energía, pero sin gritar.
- Si te trabas, repite la frase entera después de una pausa. Ya elijo yo la buena.

## Montarlo con la voz

1. Deja las grabaciones en `voz/` (no se suben al repositorio).
2. En `frases-voz.json` indica de qué grabación sale cada frase, dónde empieza y acaba, y cuándo se dice cada palabra clave.
3. `python3 sincronizar.py frases-voz.json salida/voz-montada.wav tiempos-voz.json`
   (quita las pausas largas, iguala volumen y tono entre grabaciones y calcula los tiempos).
4. `node render.js --voz salida/voz-montada.wav --tiempos tiempos-voz.json`

Versión actual: `salida/reel-whatsapp-con-voz.mp4` (35,4 s). Frases 1 y 9 de la primera grabación;
2 a 8 de la segunda.
