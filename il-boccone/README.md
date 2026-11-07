# il boccone · propuesta de web

Web de una sola página para **il boccone**, cocina italiana en C. San Luis 22, Santander.
Sin dependencias: `index.html` + las carpetas `img/` y `fonts/`. Para verla, abre `index.html` en el navegador
(con las dos carpetas al lado) o sube la carpeta tal cual a Vercel, Netlify o GitHub Pages.

## Qué incluye

- **Logo** del restaurante en la pestaña del navegador (favicon), en la cabecera, en un sello giratorio
  junto a la pizza, en el pedido vacío y en el pie de página.
- **Portada animada**: pizza que gira; al pasar el ratón (o tocarla) sale una porción con hilos de mozzarella.
- **Cinta de fotos** de los platos en movimiento. Al tocar una foto se abre en grande.
- **Carta con fotos de todos los productos**, por secciones, con alérgenos, filtros
  (sin gluten, sin lactosa, vegetariano, picante) y buscador.
- **Vista rápida**: foto grande del plato, ingredientes, alérgenos, cantidad y "Añadir al pedido",
  con flechas para pasar de un plato a otro (en el móvil también deslizando la foto).
- **Pedido para recoger**: cesta con fotos, día y hora según el horario, y envío por WhatsApp.
- **Noches Boccone** (pizza, pasta y tiramisù desde 9,90 €) con los días marcados y botón de reserva.
- **Grupos y empresas**: menús para 6, 12 o 16 personas desde 35 €/persona, con calculadora.
- **Panettone Fraccaro**: los 6 panettoni con foto y precio, que se pueden añadir al pedido.
- **Reservas**: solo deja elegir días y horas en que abren (miércoles cerrado, comidas de viernes a domingo)
  y se envían por WhatsApp o por email.
- **Textos legales**: aviso legal, política de privacidad, política de cookies y condiciones (con los
  términos de eventos que ya tenían). Se abren desde el pie de página y desde los formularios.
- Estado "Abierto / Cerrado" en directo, mapa ilustrado, horario, opiniones, versión móvil con barra inferior,
  modo "reducir movimiento" y datos estructurados para Google.
- **Sin cookies y sin conexiones externas**: las tipografías están en `fonts/` (no se carga nada de Google),
  así que no hace falta aviso de cookies.

## De dónde salen los datos

De la web actual (ilboccone.es), consultada el 5 de noviembre de 2026: carta, precios, alérgenos, fotos,
horario, email, menú de grupos, Noches Boccone y panettoni. La valoración y el número de reseñas son de Google y Tripadvisor.
Los textos legales parten de la política de privacidad y de los términos de eventos que tienen en su sistema de reservas.

## Fotos

Las fotos de la carta son las de su web, salvo cuatro platos cuya foto no mostraba el plato
(un tomate, un trozo de guanciale): **pizza amatriciana, pizza carbonara, pasta amatriciana y pasta carbonara**.
Para esos se han usado fotos de esos mismos platos de Wikimedia Commons, elegidas para que se parezcan a las suyas:

| Plato | Foto | Licencia |
|---|---|---|
| Pizza amatriciana | «Amatriciana - The Oven», Andy Li | CC0 (dominio público) |
| Pizza carbonara | «Fatto a Mano - Guanciale Carbonara Pizza», Andy Li | CC0 (dominio público) |
| Pasta amatriciana | «Bucatini all'amatriciana», Popo le Chien | CC0 (dominio público) |
| Pasta carbonara | «Spaghetti alla carbonara», Luca Nebuloni | CC BY 2.0 (hay que citar al autor) |

Los créditos están en el aviso legal y, en la foto grande de esos platos, aparece «Foto orientativa» con el autor.
Lo ideal es sustituirlas por fotos de sus propios platos (mismo nombre de archivo en `img/carta/`).

## Pendiente de confirmar con el restaurante

| Tema | Situación |
|---|---|
| Titular y NIF | El aviso legal y la privacidad necesitan el **nombre o razón social, el NIF/CIF** y, si es una sociedad, los datos del Registro Mercantil. Están marcados en amarillo en la web. **Rellenar antes de publicar.** |
| Textos legales | Adaptados a esta web (sin pagos ni cuentas, datos enviados por WhatsApp o email). Conviene que los revise su asesoría. |
| WhatsApp 671 555 547 | Sale de un directorio, no de su web. **Confirmar** que es suyo, porque reservas y pedidos van ahí. |
| Carta nueva en su web | El 6 y 7 de noviembre su web cambió la carta (pizzas nuevas, pinsas, vinos y menú degustación). Esta propuesta mantiene la carta anterior. Si quieren la nueva, se cambia en `MENU`. |
| Cursos de cocina | Se han quitado: su web dice que ahora no ofrecen experiencias. Se pueden volver a poner. |
| Burrata | En su web aparece a 0,00 €. Aquí sale como "Consultar" y no se puede pedir online. |
| Alérgenos | Se muestran tal cual los marca su web. Algunos platos no tienen ninguno marcado (Capocollo, Emiliana, Napolitana, Tiramisù, Zabaione y bebidas). |
| Etiquetas "Vegetariano" y "Favorito" | Las he puesto yo según los ingredientes y las reseñas. Revisar. |
| Código ONLINE10 | Su web anuncia un 10 % en pedidos online con el código ONLINE10. No está incluido; se puede añadir si sigue vigente. |
| Fachada | `img/fachada.jpg` es un recorte de Google Maps de baja resolución: mejor una foto propia. |
| Publicación | Publicar siempre con HTTPS (Vercel, Netlify y GitHub Pages lo ponen solos); la política de privacidad lo indica. |

## Probado en móvil

Probado con un navegador automático simulando iPhone 13, iPhone SE, Galaxy S8 y Pixel 7 (105 comprobaciones:
menú, barra inferior, carta, filtros, buscador, foto grande, pedido, reservas, grupos, panettone, opiniones,
textos legales y botón atrás), y en ordenador a 1440 y 1024 px. Arreglos de esta revisión:

- En la foto grande, el nombre del plato se montaba sobre la foto en el móvil. La X de cerrar ahora queda siempre visible.
- Tras enviar la reserva, el formulario seguía a la vista; ahora se sustituye por el resumen.
- Platos sin precio online (burrata, agua) ya no muestran "Añadir al pedido".
- El buscador y los campos del pedido ya no hacen zoom en el iPhone.
- Los platos flotantes de Noches Boccone responden al toque en Safari.
- WhatsApp se abre también desde los navegadores de Instagram o Facebook.
- El icono del menú se convierte en una X al abrirlo; botones pequeños con más zona de toque.
- Con el menú, el pedido o un texto abierto, la página de fondo no se mueve ni se puede tocar.

## Dónde se cambia cada cosa

Al principio del `<script>` de `index.html`:

- `CONFIG`: teléfono, email, WhatsApp, enlace de "Cómo llegar" y precio base del menú de grupo.
- `HOURS`, `SLOTS` y `NOCHES_DAYS`: horario, horas de reserva y días de Noches Boccone.
- `MENU`: platos, descripciones, precios, alérgenos (`al`), etiquetas (`ok`, `tags`), foto y `credit`
  (autor de la foto, solo si no es del restaurante).
- `PANETTONI`: los panettoni.
- `CATS`: nombres de las secciones y su foto de cabecera.

Los textos legales están en el bloque `<dialog id="legal">` de `index.html` (busca `class="todo"` para los datos pendientes).
Se enlazan con `#aviso-legal`, `#privacidad`, `#cookies` y `#condiciones` (por ejemplo `ilboccone.es/#privacidad`).

Las fotos de la carta están en `img/carta/` con el mismo nombre que el `id` de cada plato
(por ejemplo `margherita.jpg`). Para cambiar una foto basta con sustituir el archivo.
Las tipografías (Fraunces, DM Sans y Caveat, licencia OFL) están en `fonts/`.
