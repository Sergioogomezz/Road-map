# Pandilla · viajes en grupo sin dramas

PWA *mobile-first* en español para organizar un viaje con amigos: itinerario, votaciones,
gastos compartidos, documentos disponibles sin cobertura y recuerdos del viaje.
Hecha con **React 19 + TypeScript + Tailwind CSS 4 + Vite 8** e iconos **Lucide**.

Al abrirla por primera vez ya trae un **viaje de ejemplo** (Islandia, 4 días, 5 amigos) con
gastos, vuelos, reservas, votaciones, checklist, coches, frases y retos, así que todo se puede
probar al momento. Las fechas del ejemplo son relativas al día en que se abre: el viaje
empezó «ayer» y hoy es el día 2, así que la próxima actividad, el modo taxi y los saldos tienen sentido.

## Probarla en 1 minuto

```bash
cd pandilla
npm install
npm run dev        # http://localhost:5173 (y en tu red local para abrirla en el móvil)
```

1. En la portada toca **Islandia con la pandilla** (o escribe el código `AURORA`).
2. Elige quién eres (por ejemplo, Laura) o escribe tu nombre para unirte.
3. Recorre las 5 pestañas de abajo: **Inicio · Plan · Gastos · Logística · Social**.

> Requisitos: Node 22.12 o superior. `npm run build` genera la versión de producción en `dist/`
> y `npm run preview` la sirve con el *service worker* activo (funciona sin conexión).

## Qué incluye

**Acceso sin fricción**
- Entrada con el **código del viaje** o con un **enlace de invitación**. Solo hay que elegir tu
  perfil o escribir tu nombre: sin registros ni contraseñas.
- Crear un viaje nuevo (nombre, destino, fechas, amigos y alojamiento) y compartirlo con el
  menú nativo del móvil.

**A · Inicio**
- Cabecera con nombre, destino, fechas y **cuenta atrás** en directo (o «Día 2 de 4» durante el viaje).
- **Próxima actividad** con la hora, el tiempo que falta y botones directos a Google Maps y Apple Maps.
- **Tu balance**: cuánto te deben o cuánto debes.
- **Modo taxi / vuelta a casa**: tarjeta amarilla a pantalla completa con el nombre y la dirección
  del alojamiento en letra enorme, botón «Más grande», frase en el idioma local, enlaces al GPS
  (Google Maps, Apple Maps, Waze) y la pantalla se mantiene encendida mientras está abierta.

**B · Plan**
- Itinerario por días con hora, ubicación (abre el mapa), notas y etiquetas (transporte, comida,
  ocio, alojamiento). Añadir, editar, borrar con **deshacer** y **arrastrar para reordenar**;
  si el orden deja de seguir la hora aparece «Ordenar por hora».
- **Votaciones** de planes y restaurantes: Sí / No / Me da igual. Gana la mitad más uno (o la
  mayoría cuando han votado todos). Cuando una propuesta gana, un botón la lleva a un día y hora
  del itinerario. Para los empates: **«Que decida la suerte»**, un sorteo en el que cada «sí» da más papeletas.

**C · Gastos**
- Concepto, importe, **divisa con conversión a euros** (23 divisas; tipos aproximados de serie,
  actualizables con los del BCE o a mano; cada gasto guarda el tipo del día), quién pagó y entre quiénes.
- Reparto **a partes iguales**, por **importes exactos** (con «Repartir lo que falta») o por
  **subgrupos** («Todos», «Coche 1», «Los de la cena»…).
- **Saldar**: calcula el **número mínimo de transferencias** para dejar a todos a cero. Cada una
  tiene «Copiar resumen para Bizum / Revolut» y «Marcar como pagado» (con deshacer).
- Todas las cuentas internas se hacen en céntimos: los repartos siempre cuadran al céntimo.

**D · Logística**
- **Bóveda** por categorías (vuelos y transporte, alojamiento, entradas, alquiler de coche, otros):
  códigos de reserva (se copian con un toque), enlaces, notas y **fotos o PDFs** guardados en el
  móvil, sin comprimir para que los QR se puedan escanear y **disponibles sin cobertura**.
  Visor a pantalla completa con zoom.
- **Checklist compartida**: cada uno pulsa «Lo llevo yo» y lo marca como listo.
- **Organizador de coches** (opcional): plazas, ocupantes, quién puede conducir y turnos de
  conducción. Cada coche crea su **subgrupo de gastos** y tiene un botón «Gasolina / peaje» que
  reparte solo entre sus ocupantes.

**E · Social**
- **Muro de frases míticas** con autor, contexto, fecha y reacciones 😂 ❤️ 🔥 💀.
- **Retos**: contadores por persona con ranking (retrasos, «¡qué frío!»…) y **bingo del viaje**
  que canta línea y bingo con confeti.

**Además**: tema claro/oscuro, instalable como app (Android, iPhone y escritorio), aviso cuando
hay una versión nueva, exportar/importar una copia del viaje en JSON, varios viajes en el mismo
móvil y, en escritorio, la app se muestra centrada como un móvil.

## Cómo se comparte un viaje

**Con Supabase (recomendado)** todo lo que añade cualquiera aparece en los móviles de los demás
en menos de un segundo: planes, votos, gastos, pagos, checklist, coches, frases, retos y también
las **fotos y PDFs** de la bóveda. La app sigue funcionando sin cobertura: guarda primero en el
móvil y sube los cambios al volver la conexión. Si el tiempo real se corta, la app vuelve a mirar
la nube al abrirse, al volver a primer plano y cada 15 segundos. Los cambios de dos personas a la
vez se fusionan sin perder ninguno. En Inicio, junto al código del viaje, se ve el estado:
«En directo», «Sin conexión» o «Error al sincronizar» (en Ajustes aparece el motivo).

**Sin servidor** todo se guarda solo en el móvil (`localStorage` + IndexedDB). El enlace de
invitación lleva dentro una copia comprimida del viaje (en el `#fragmento`, que no se envía a
ningún servidor); para ver lo que añaden los demás hay que volver a abrir un enlace suyo, y los
archivos no viajan. En iPhone, la app instalada no abre los enlaces de WhatsApp: se puede
**pegar el enlace entero** en el campo «Código o enlace» de la portada.

## Conectar Supabase (sincronización entre móviles)

Desde el móvil se hace en unos 10 minutos:

1. **Vercel → tu proyecto → Storage (o Integrations) → Supabase → Add / Create.** Crea un
   proyecto de Supabase gratis y añade sus claves al proyecto de Vercel. La app acepta los
   nombres que pone esa integración (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, sus variantes `…PUBLISHABLE_KEY`) y también
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` si las pones a mano (Supabase → Project Settings → API).
   Solo se usa la clave **pública**; si por error se configura la secreta (`service_role`), la
   compilación se detiene con un aviso.
2. **Supabase → SQL Editor → New query**: pega [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**.
   Crea la tabla de viajes, activa los avisos en tiempo real y el espacio para las fotos y PDFs.
   Se puede ejecutar varias veces sin problema.
3. **Vercel → Deployments → ⋯ → Redeploy** (las claves solo se aplican en una publicación nueva).

Los viajes que ya existían en los móviles se suben solos la primera vez que se abren. El viaje
de ejemplo nunca se sube.

Seguridad: el esquema sigue el modelo «quien tiene el código entra»: cualquiera con la clave
pública del proyecto puede leer y escribir viajes. Para un grupo de amigos es suficiente; para
algo público habría que añadir Supabase Auth y restringir las políticas.

En local: copia `.env.example` a `.env`, rellena las dos variables y `npm run dev`.

## Publicarla

`vite.config.ts` usa `base: './'`, así que `dist/` funciona en cualquier ruta.

- **Vercel**: importa el repositorio y pon *Root Directory* = `pandilla` (Vite se detecta solo).
- **Netlify**: base `pandilla`, comando `npm run build`, carpeta `pandilla/dist`.
- **GitHub Pages**: sube el contenido de `dist/`.

Para instalarla como app hace falta HTTPS (cualquiera de las anteriores lo da).

## Arquitectura

```
src/
  domain/        Lógica pura, sin React: tipos, dinero (repartos, saldos, transferencias
                 mínimas), divisas, fechas, votaciones, itinerario, retos, mapas
  data/          Persistencia y estado
    repository.ts          Interfaz TripRepository (el "puerto")
    localRepository.ts     localStorage + sincronización entre pestañas
    supabaseRepository.ts  Supabase en tiempo real + archivos en Storage (opcional, carga diferida)
    files.ts               Archivos de la bóveda: móvil + nube, con cola de subidas
    merge.ts               Fusión de copias sin conflictos (entidad a entidad)
    actions.ts             Mutaciones puras Trip → Trip
    store.ts               Estado del viaje abierto (useSyncExternalStore)
    fileStore.ts           Archivos de la bóveda en IndexedDB
    share.ts               Enlaces de invitación con copia comprimida
    seed.ts                Viaje de ejemplo
  features/      Pantallas por módulo: home, plan, expenses, logistics, social, onboarding, settings
  ui/            Componentes reutilizables (hojas inferiores, avisos, avatares, campos…)
  hooks/         Hooks (viaje, rutas por #hash, reloj, wake lock, instalación, tema…)
```

- **Un viaje = un documento JSON** con colecciones de entidades. Cada entidad lleva `updatedAt`
  y los borrados dejan una «lápida»; así dos copias (otra pestaña, otro móvil, la nube) se fusionan
  sin pisarse. Votos, reacciones y marcadores usan ids deterministas (`propuesta:persona`) para
  que dos personas votando a la vez no choquen.
- **Transferencias mínimas**: el mínimo es *personas con saldo − máximo de subgrupos disjuntos
  que suman cero*. Se calcula exacto con programación dinámica sobre subconjuntos (hasta 18
  personas con saldo; por encima se usa el método voraz) y cada subgrupo se liquida emparejando
  al que más debe con quien más tiene que recibir.
- Cambiar de almacenamiento es escribir otra implementación de `TripRepository`.

## Pruebas

```bash
npm test          # 33 pruebas: repartos, conversión, saldos, transferencias mínimas, fusión, sincronización y enlaces
npm run typecheck
```

Además se ha recorrido la app en Chromium emulando móviles (Pixel 7 e iPhone 14) y en
escritorio: altas, ediciones, borrados con deshacer, arrastrar para reordenar, votar y programar,
gastos en coronas con importes exactos, saldar, bóveda con archivos, checklist, coches, frases,
bingo, tema oscuro, crear un viaje, invitar a otro móvil por enlace y uso **sin conexión**.

La sincronización se ha probado con **dos móviles contra un Supabase real** levantado en local
con las imágenes oficiales (Postgres, PostgREST, Realtime y Storage) y este mismo `schema.sql`:
unirse por código, gastos, planes y frases que llegan al otro móvil en menos de un segundo,
cambios simultáneos sin pérdidas, fotos compartidas, cambios hechos sin cobertura que se suben al
volver, respaldo cuando se cae el tiempo real y re-subida automática de un viaje que falta en la nube.

## Limitaciones conocidas

- Sin Supabase, los cambios no llegan solos a los demás y los archivos se quedan en cada móvil.
- Con Supabase, quien tenga la clave pública del proyecto puede leer los viajes (ver «Seguridad»).
- Los tipos de cambio de serie son aproximados; se actualizan con «Actualizar con los tipos del BCE».
- Las horas del itinerario se interpretan con la hora del móvil (al viajar, el móvil cambia de zona solo).
- No hay notificaciones push.

## Dónde se cambia cada cosa

- Nombre, colores e iconos de la app: `vite.config.ts` (manifiesto), `index.html` y `src/index.css` (tokens de color).
- Divisas y tipos de serie: `src/domain/currency.ts`.
- Viaje de ejemplo: `src/data/seed.ts`.
- Categorías, etiquetas y sus colores: `src/features/meta.tsx`.
