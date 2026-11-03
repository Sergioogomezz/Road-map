// Genera las imágenes de Instagram de Activonorte (carruseles, foto de perfil y portadas de destacadas).
// Uso: node instagram/herramientas/generar.js            (desde la raíz del repo)
// Para un carrusel nuevo: añádelo a carruseles.json y vuelve a ejecutar.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DIR = __dirname;
const OUT = path.join(DIR, '..', 'imagenes');
const data = JSON.parse(fs.readFileSync(path.join(DIR, 'carruseles.json'), 'utf8'));
const img = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(DIR, 'assets', f)).toString('base64');
const MARCA_BLANCA = img('marca-blanca.png');
const MARCA_TEAL = img('marca-teal.png');

const C = {
  teal950: '#001a20', teal: '#003b46', teal700: '#0a4f5c', teal50: '#eef5f6',
  orange: '#e05e00', orangeLight: '#ff7a1a', orangeText: '#b34a00',
  ink: '#0f1f24', text: '#33464b', muted: '#5b6b70', line: '#d8e1e3', soft: '#f5f8f8',
};

// Texto: escapa HTML, *x* -> naranja, espacios duros antes de € y %.
function fmt(s = '') {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/ (€|%|h\b)/g, ' $1')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1350px}
body{font-family:Inter,sans-serif;-webkit-font-smoothing:antialiased}
.s{position:relative;width:1080px;height:1350px;overflow:hidden;display:flex;flex-direction:column;padding:84px 92px 84px}
.light{background:${C.soft};color:${C.ink}}
.dark{background:${C.teal};color:#fff}
.darker{background:${C.teal950};color:#fff}
.top{display:flex;justify-content:space-between;align-items:center;font-weight:600;font-size:28px;position:relative;z-index:2}
.brand{display:flex;gap:14px;align-items:center;letter-spacing:.01em}
.brand img{height:34px}
.pg{font-variant-numeric:tabular-nums;color:${C.muted};font-weight:600}
.dark .pg,.darker .pg{color:rgba(255,255,255,.55)}
.main{flex:1;display:flex;flex-direction:column;justify-content:center;gap:40px;min-height:0;position:relative;z-index:2}
.kicker{font-weight:700;font-size:28px;letter-spacing:.16em;text-transform:uppercase;color:${C.orangeText}}
.dark .kicker,.darker .kicker{color:${C.orangeLight}}
h1{font-family:"Inter Display",Inter,sans-serif;font-weight:800;font-size:92px;line-height:1.03;letter-spacing:-.025em;text-wrap:balance}
em{font-style:normal;color:${C.orange}}
.dark em,.darker em{color:${C.orangeLight}}
.body{font-size:42px;line-height:1.4;color:${C.text};text-wrap:pretty}
.dark .body,.darker .body{color:rgba(255,255,255,.82)}
.wm{position:absolute;right:-150px;bottom:-90px;width:860px;opacity:.07;z-index:1}
/* hook */
.hook h1{font-size:104px}
.next{display:flex;align-items:center;gap:22px;font-size:36px;font-weight:600;position:relative;z-index:2;color:rgba(255,255,255,.9)}
.next .arr{width:84px;height:84px;border-radius:50%;background:${C.orange};display:grid;place-items:center;flex:none}
/* item */
.num{font-family:"Inter Display",Inter,sans-serif;font-weight:800;font-size:250px;line-height:.78;color:${C.orange};letter-spacing:-.04em}
.item h1{font-size:80px}
/* data */
.stats{display:flex;flex-direction:column}
.stat{display:flex;align-items:baseline;gap:32px;padding:34px 0;border-top:3px solid ${C.line}}
.stat:last-child{border-bottom:3px solid ${C.line}}
.stat b{font-family:"Inter Display",Inter,sans-serif;font-weight:800;font-size:100px;color:${C.teal};letter-spacing:-.03em;min-width:330px;font-variant-numeric:tabular-nums;line-height:1}
.stat span{font-size:40px;color:${C.text};line-height:1.25}
.data h1{font-size:76px}
/* math */
.formula{align-self:flex-start;font-size:44px;font-weight:600;color:${C.teal};background:${C.teal50};border:3px solid ${C.line};border-radius:999px;padding:20px 36px;font-variant-numeric:tabular-nums}
.eq{font-family:"Inter Display",Inter,sans-serif;font-size:80px;font-weight:800;color:${C.muted};line-height:.6}
.res{font-family:"Inter Display",Inter,sans-serif;font-weight:800;font-size:200px;line-height:.9;color:${C.orange};letter-spacing:-.04em;font-variant-numeric:tabular-nums;white-space:nowrap}
.unit{font-size:52px;font-weight:700;color:${C.ink};margin-top:-14px}
/* chat */
.phone{background:#efeae2;border-radius:40px;padding:0 0 40px;border:3px solid ${C.line};overflow:hidden;display:flex;flex-direction:column;gap:30px}
.ph-head{background:${C.teal};color:#fff;display:flex;align-items:center;gap:22px;padding:24px 32px}
.ph-av{width:68px;height:68px;border-radius:50%;background:#c9d6d9;color:${C.teal};display:grid;place-items:center;font-weight:800;font-size:32px}
.ph-name{font-size:32px;font-weight:700;line-height:1.2}
.ph-name small{display:block;font-size:24px;font-weight:500;opacity:.75}
.bubble{align-self:flex-end;max-width:84%;margin:0 32px;background:#d9fdd3;color:${C.ink};font-size:42px;line-height:1.36;padding:28px 34px 20px;border-radius:34px 34px 8px 34px;box-shadow:0 2px 0 rgba(0,0,0,.08)}
.bubble .t{display:block;text-align:right;font-size:24px;color:${C.muted};margin-top:8px}
.nota{font-size:48px;font-weight:800;color:${C.orange};font-family:"Inter Display",Inter,sans-serif;letter-spacing:-.01em}
/* cta */
.cta h1{font-size:88px}
.comment{background:#fff;color:${C.ink};border-radius:36px;padding:40px 44px;display:flex;gap:30px;align-items:center}
.comment .av{width:110px;height:110px;border-radius:50%;background:${C.teal};display:grid;place-items:center;flex:none}
.comment .av img{width:66px}
.comment > div{min-width:0;flex:1}
.comment strong{white-space:nowrap;overflow:hidden}
.comment small{display:block;font-size:34px;color:${C.muted};font-weight:600;margin-bottom:6px}
.comment strong{display:block;font-family:"Inter Display",Inter,sans-serif;font-weight:800;font-size:116px;line-height:.95;color:${C.orange};letter-spacing:.01em}
.cta .body{font-size:44px}
.handle{font-size:34px;font-weight:600;color:rgba(255,255,255,.7);position:relative;z-index:2}
`;

const arrow = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>`;

function top(dark, i, n) {
  return `<div class="top"><div class="brand"><img src="${dark ? MARCA_BLANCA : MARCA_TEAL}" alt="">activonorte.media</div><div class="pg">${i}/${n}</div></div>`;
}

function slideHTML(s, i, n) {
  const dark = s.tipo === 'hook' || s.tipo === 'cta';
  let cls = 'light', main = '';
  switch (s.tipo) {
    case 'hook':
      cls = 'dark hook';
      main = `<div class="main"><div class="kicker">${fmt(s.kicker)}</div><h1 class="fit">${fmt(s.titulo)}</h1></div>
        <div class="next"><span class="arr">${arrow}</span>${fmt(s.sub || 'Desliza')}</div>
        <img class="wm" src="${MARCA_BLANCA}" alt="">`;
      break;
    case 'item':
      cls = 'light item';
      main = `<div class="main"><div class="num">${s.n}</div><h1>${fmt(s.titulo)}</h1><p class="body">${fmt(s.cuerpo)}</p></div>`;
      break;
    case 'text':
      main = `<div class="main"><div class="kicker">${fmt(s.kicker)}</div><h1>${fmt(s.titulo)}</h1><p class="body">${fmt(s.cuerpo)}</p></div>`;
      break;
    case 'data':
      cls = 'light data';
      main = `<div class="main"><div class="kicker">${fmt(s.kicker)}</div><h1>${fmt(s.titulo)}</h1>
        <div class="stats">${s.stats.map(([v, l]) => `<div class="stat"><b>${fmt(v)}</b><span>${fmt(l)}</span></div>`).join('')}</div></div>`;
      break;
    case 'math':
      main = `<div class="main"><div class="kicker">${fmt(s.kicker)}</div><div class="formula">${fmt(s.formula)}</div><div class="eq">=</div>
        <div><div class="res fitw">${fmt(s.resultado)}</div><div class="unit">${fmt(s.unidad)}</div></div><p class="body">${fmt(s.nota)}</p></div>`;
      break;
    case 'chat':
      main = `<div class="main"><div class="kicker">${fmt(s.kicker)}</div>
        <div class="phone"><div class="ph-head"><div class="ph-av">C</div><div class="ph-name">Carlos<small>Ex-socio · baja hace 5 meses</small></div></div>
        <div class="bubble">${fmt(s.mensaje)}<span class="t">19:02</span></div></div>
        <div class="nota">${fmt(s.nota)}</div></div>`;
      break;
    case 'cta':
      cls = 'darker cta';
      main = `<div class="main"><h1>${fmt(s.titulo)}</h1>
        <div class="comment"><div class="av"><img src="${MARCA_BLANCA}" alt=""></div><div><small>Comenta</small><strong class="fitw">${fmt(s.palabra)}</strong></div></div>
        <p class="body">${fmt(s.sub)}</p></div><div class="handle">@activonorte.media · Marketing para gimnasios</div>
        <img class="wm" src="${MARCA_BLANCA}" alt="">`;
      break;
    default:
      throw new Error('Tipo desconocido: ' + s.tipo);
  }
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${CSS}</style></head>
    <body><div class="s ${cls}">${top(dark, i, n)}${main}</div></body></html>`;
}

// Reduce el tamaño de letra si algo no cabe (seguridad para textos largos).
async function ajustar(page) {
  await page.evaluate(() => {
    const main = document.querySelector('.main');
    document.querySelectorAll('.fitw').forEach((el) => {
      let fs = parseFloat(getComputedStyle(el).fontSize);
      while (el.scrollWidth > el.clientWidth + 1 && fs > 40) { fs -= 4; el.style.fontSize = fs + 'px'; }
      const box = el.parentElement.getBoundingClientRect();
      while (el.getBoundingClientRect().right > document.querySelector('.s').getBoundingClientRect().right - 80 && fs > 40) { fs -= 4; el.style.fontSize = fs + 'px'; }
    });
    let guard = 0;
    while (main.scrollHeight > main.clientHeight + 1 && guard++ < 40) {
      main.querySelectorAll('h1,.body,.num,.res,.bubble,.stat b,.stat span').forEach((el) => {
        const fs = parseFloat(getComputedStyle(el).fontSize);
        el.style.fontSize = fs * 0.96 + 'px';
      });
    }
  });
}

function htmlSimple(body, w, h) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0}html,body{width:${w}px;height:${h}px}</style></head><body>${body}</body></html>`;
}

const ICONOS = {
  'empieza-aqui': `<img src="${MARCA_BLANCA}" style="width:520px">`,
  'auditorias': `<svg width="440" height="440" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.5s6.8-6 6.8-11.6A6.8 6.8 0 0 0 5.2 9.9C5.2 15.5 12 21.5 12 21.5z"/><circle cx="12" cy="9.9" r="2.5"/></svg>`,
  'protocolo': `<svg width="440" height="440" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 12a8.5 8.5 0 0 1 14.7-5.8L20.5 8.5"/><path d="M20.5 3.5v5h-5"/><path d="M20.5 12a8.5 8.5 0 0 1-14.7 5.8L3.5 15.5"/><path d="M3.5 20.5v-5h5"/></svg>`,
  'preguntas': `<div style="font:800 460px/1 'Inter Display',Inter,sans-serif;color:#fff;margin-top:-20px">?</div>`,
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });

  for (const car of data.carruseles) {
    const dir = path.join(OUT, 'carruseles', car.id);
    fs.mkdirSync(dir, { recursive: true });
    for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
    const n = car.slides.length;
    for (let i = 0; i < n; i++) {
      await page.setContent(slideHTML(car.slides[i], i + 1, n), { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await ajustar(page);
      const file = path.join(dir, String(i + 1).padStart(2, '0') + '.jpg');
      await page.screenshot({ path: file, type: 'jpeg', quality: 92 });
    }
    console.log('✓', car.id, n, 'slides');
  }

  // Foto de perfil (1080x1080): marca blanca grande sobre azul petróleo.
  fs.mkdirSync(path.join(OUT, 'perfil'), { recursive: true });
  await page.setViewportSize({ width: 1080, height: 1080 });
  await page.setContent(htmlSimple(`<div style="width:1080px;height:1080px;background:${C.teal};display:grid;place-items:center"><img src="${MARCA_BLANCA}" style="width:600px;transform:translate(6px,-6px)"></div>`, 1080, 1080));
  await page.screenshot({ path: path.join(OUT, 'perfil', 'foto-perfil.png') });
  await page.setContent(htmlSimple(`<div style="width:1080px;height:1080px;background:#fff;display:grid;place-items:center"><img src="${MARCA_TEAL}" style="width:600px;transform:translate(6px,-6px)"></div>`, 1080, 1080));
  await page.screenshot({ path: path.join(OUT, 'perfil', 'foto-perfil-alternativa-blanca.png') });

  // Portadas de destacadas (1080x1920, el icono va en el círculo central).
  fs.mkdirSync(path.join(OUT, 'destacadas'), { recursive: true });
  await page.setViewportSize({ width: 1080, height: 1920 });
  for (const [nombre, icono] of Object.entries(ICONOS)) {
    await page.setContent(htmlSimple(`<div style="width:1080px;height:1920px;background:${C.teal};display:grid;place-items:center">${icono}</div>`, 1080, 1920));
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(OUT, 'destacadas', nombre + '.png') });
  }
  console.log('✓ perfil y destacadas');
  await browser.close();
})();
