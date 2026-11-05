# il boccone · propuesta de web

Web de una sola página para **il boccone**, cocina italiana en C. San Luis 22, Santander.
Sin dependencias: `index.html` + la carpeta `img/`. Para verla, abre `index.html` en el navegador
(con la carpeta `img/` al lado) o sube la carpeta tal cual a Vercel, Netlify o GitHub Pages.

## Qué incluye

- **Logo** del restaurante en la pestaña del navegador (favicon), en la cabecera, en un sello giratorio
  junto a la pizza, en el pedido vacío y en el pie de página.
- **Portada animada**: pizza que gira; al pasar el ratón (o tocarla) sale una porción con hilos de mozzarella.
- **Cinta de fotos** de los platos en movimiento. Al tocar una foto se abre en grande.
- **Carta con fotos de todos los productos** (las mismas de la web actual), por secciones, con
  alérgenos, filtros (sin gluten, sin lactosa, vegetariano, picante) y buscador.
- **Vista rápida**: foto grande del plato, ingredientes, alérgenos, cantidad y "Añadir al pedido",
  con flechas para pasar de un plato a otro.
- **Pedido para recoger**: cesta con fotos, día y hora según el horario, y envío por WhatsApp.
- **Noches Boccone** (pizza, pasta y tiramisù desde 9,90 €) con los días marcados y botón de reserva.
- **Grupos y empresas**: menús para 6, 12 o 16 personas desde 35 €/persona, con calculadora.
- **Panettone Fraccaro**: los 6 panettoni con foto y precio, que se pueden añadir al pedido.
- **Reservas**: solo deja elegir días y horas en que abren (miércoles cerrado, comidas de viernes a domingo)
  y se envían por WhatsApp o por email.
- Estado "Abierto / Cerrado" en directo, mapa ilustrado, horario, opiniones, versión móvil con barra inferior,
  modo "reducir movimiento" y datos estructurados para Google.

## De dónde salen los datos

De la web actual (ilboccone.es), consultada en noviembre de 2026: carta, precios, alérgenos, fotos,
horario, email, menú de grupos, Noches Boccone y panettoni. La valoración y el número de reseñas son de Google y Tripadvisor.

## Pendiente de confirmar con el restaurante

| Tema | Situación |
|---|---|
| WhatsApp 671 555 547 | Sale de un directorio, no de su web. **Confirmar** que es suyo, porque reservas y pedidos van ahí. |
| Cursos de cocina | Se han quitado: su web dice que ahora no ofrecen experiencias. Se pueden volver a poner. |
| Burrata | En su web aparece a 0,00 €. Aquí sale como "Consultar" y no se puede pedir online. |
| Alérgenos | Se muestran tal cual los marca su web. Algunos platos no tienen ninguno marcado (Capocollo, Emiliana, Napolitana, Tiramisù, Zabaione y bebidas). |
| Etiquetas "Vegetariano" y "Favorito" | Las he puesto yo según los ingredientes y las reseñas. Revisar. |
| Fotos | Son las de su web. Algunas son de producto o de archivo (la Amatriciana muestra tomates, la Carbonara el guanciale): conviene cambiarlas por fotos de sus platos. |
| Código ONLINE10 | Su web anuncia un 10 % en pedidos online con el código ONLINE10. No está incluido; se puede añadir si sigue vigente. |
| Fachada | `img/fachada.jpg` es un recorte de Google Maps de baja resolución: mejor una foto propia. |

## Dónde se cambia cada cosa

Al principio del `<script>` de `index.html`:

- `CONFIG`: teléfono, email, WhatsApp, enlace de "Cómo llegar" y precio base del menú de grupo.
- `HOURS`, `SLOTS` y `NOCHES_DAYS`: horario, horas de reserva y días de Noches Boccone.
- `MENU`: platos, descripciones, precios, alérgenos (`al`), etiquetas (`ok`, `tags`) y foto.
- `PANETTONI`: los panettoni.
- `CATS`: nombres de las secciones y su foto de cabecera.

Las fotos de la carta están en `img/carta/` con el mismo nombre que el `id` de cada plato
(por ejemplo `margherita.jpg`). Para cambiar una foto basta con sustituir el archivo.
