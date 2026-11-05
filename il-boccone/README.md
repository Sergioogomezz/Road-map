# il Boccone · propuesta de web

Web de una sola página para **il Boccone**, restaurante italiano en C. San Luis 22, Santander.
Todo está en `index.html` (HTML + CSS + JS, sin dependencias). Para verla, abre el archivo en el navegador
o súbelo tal cual a Vercel, Netlify o GitHub Pages.

## Qué incluye

- **Portada animada**: pizza que gira; al pasar el ratón (o tocarla) sale una porción con hilos de mozzarella.
  Ingredientes flotando con efecto paralaje y harina en el aire.
- **Estado en directo**: "Abierto / Cerrado · abre a las…", calculado con la hora de Santander.
- **La carta interactiva**: pestañas, filtros (vegetariano, vegano, picante) y buscador.
- **Pedido para recoger**: se añaden platos a una cesta, se elige día y hora, y el pedido se envía por WhatsApp.
  Avisa si hay pizzas y se elige hora antes de las 20:00.
- **Menú Boccone 28 €**: calculadora por personas que rellena la reserva.
- **Reservas**: solo deja elegir días y horas abiertos, valida nombre y teléfono, y envía la solicitud por WhatsApp.
- **Cursos** de pizza y repostería, **opiniones** (Google y Tripadvisor), **mapa** ilustrado, horario y botones de llamar / cómo llegar.
- Animación de "así nace cada pizza" al hacer scroll.
- Funciona en móvil (barra inferior con Llamar · Pedido · Reservar), respeta "reducir movimiento" y
  lleva datos estructurados de restaurante (schema.org) para Google.

## Datos que hay que confirmar con el restaurante

La web oficial no se pudo consultar directamente; los datos salen de buscadores, Google Maps y reseñas.

| Dato | Valor puesto | Estado |
|---|---|---|
| WhatsApp para reservas y pedidos | 671 555 547 | **Confirmar** que es el número correcto y que usa WhatsApp |
| Teléfono | 942 10 27 68 | Aparece en varias fuentes |
| Horario | Jue–Dom 12:00–16:30 y 20:00–23:30; Lun–Mié cerrado | **Confirmar** (las fuentes no coinciden del todo) |
| Pizzas solo por la noche | desde las 20:00 | Según su web |
| Burrata 16 €, Vitello tonnato 20 €, Insalata d'arance 14 €, pasta all'nduja 15 € | | Precios vistos en su web |
| Pizzas 8,50 € – 18 € | Margherita 8,50 € | Rango visto en su web |
| Resto de precios (pastas, otras pizzas, postres, tabla de quesos) | | **Estimados**, hay que poner los reales |
| Menú degustación | 28 €/persona, mín. 2, jue–dom, con reserva | Según su web |
| Cursos | Pizza 3 h · 50 €; Repostería · 40 € | Según su web |
| Valoraciones | Google 4,5 (994), Tripadvisor 4,4 (554) | Actualizar de vez en cuando |

## Dónde se cambia cada cosa

Al principio del `<script>` de `index.html`:

- `CONFIG`: teléfono, WhatsApp y enlace de "Cómo llegar".
- `HOURS` y `SLOTS`: horario de apertura y horas de reserva.
- `MENU`: platos, descripciones, precios y etiquetas (`veg`, `vegan`, `hot`, `fav`).

## Fotos

Las ilustraciones están hechas en SVG para que la web sea ligera y tenga movimiento.
La foto de la fachada es una captura de baja resolución de Google Maps: conviene cambiarla por una
foto propia del restaurante, igual que añadir fotos reales de platos si las tienen.
