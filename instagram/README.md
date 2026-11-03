# Instagram @activonorte.media

Plan de relanzamiento de la cuenta (5 nov – 6 dic 2026).

- **Plan completo** (diagnóstico, perfil, estrategia, calendario, guiones, captación y métricas): `plan-instagram.html`
  - Versión online: https://claude.ai/artifact/UV2b8i24qMd5KrMMCJHuWe
- **Imágenes listas para subir**: `imagenes/`
  - `perfil/foto-perfil.png`: nueva foto de perfil (hay una alternativa en blanco).
  - `destacadas/`: portadas de las 4 destacadas.
  - `carruseles/c1…c5/`: los 5 carruseles del mes, en 1080 × 1350, numerados en orden.

## Calendario resumido

| Fecha | Formato | Publicación | Palabra |
|---|---|---|---|
| Jue 5 nov | Reel (fijar) | Solo trabajo con gimnasios | AUDITA |
| Sáb 7 nov | Carrusel C1 (fijar) | Un gimnasio de 300 socios puede perder 86.400 € | BAJAS |
| Dom 8 nov | Reel (fijar) | Busqué «gimnasio en Santander» en Google | AUDITA |
| Lun 9 nov | Reel | Si esperas a enero, llegas tarde | — |
| Mié 11 nov | Carrusel C2 | Enero no se gana en enero | AUDITA |
| Jue 12 nov | Reel | Si le mandas esto a un ex-socio, no va a volver | MENSAJE |
| Sáb 14 nov | Reel | El low-cost no te está quitando socios | — |
| Lun 16 nov | Reel | Tu competencia tiene 300 reseñas | AUDITA |
| Mié 18 nov | Carrusel C3 | Black Friday: la cuenta que nadie hace | AUDITA |
| Jue 19 nov | Reel | «Es muy caro»: lo que contesta mi copiloto IA | PROTOCOLO |
| Sáb 21 nov | Reel | Auditando gimnasios de Cantabria #1 | AUDITA |
| Lun 23 nov | Reel | Por qué tus socios de enero se van en febrero | — |
| Mié 25 nov | Carrusel C4 | 7 señales de que un socio se va a dar de baja | BAJAS |
| Jue 26 nov | Reel | Me dijeron que era una locura (tu historia) | — |
| Vie 27 nov | Stories | Black Friday: no rebajes tu cuota | — |
| Sáb 28 nov | Reel | Opinión impopular: tu Instagram no te trae socios | AUDITA |
| Lun 30 nov | Reel | Tu lista de ex-socios vale más en diciembre | PROTOCOLO |
| Mié 2 dic | Carrusel C5 | Cómo escribir a un ex-socio para que vuelva | PROTOCOLO |
| Jue 3 dic | Reel | Auditando gimnasios de Cantabria #2 | AUDITA |
| Sáb 5 dic | Reel | Un socio no vale 40 € | BAJAS |

## Hacer carruseles nuevos

1. Añade el carrusel a `herramientas/carruseles.json` (texto entre `*asteriscos*` sale en naranja).
2. Desde la raíz del repo: `node instagram/herramientas/generar.js` (necesita Node y Playwright).
3. Las imágenes salen en `imagenes/carruseles/<id>/`.
