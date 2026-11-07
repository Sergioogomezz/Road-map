// Renderiza una página HTML fotograma a fotograma a 30 fps.
// Uso: node render_partes.js pagina.html config.json duracion salida.(mp4|mov) [--alpha]
//  - config.json: para escena.html es el objeto T; para subtitulos.html es {cues, handle}.
//  - --alpha: fondo transparente (para superponer subtítulos), salida .mov con PNG.
const fs = require('fs'), path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const [html, cfgPath, durS, out] = process.argv.slice(2);
const alpha = process.argv.includes('--alpha');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.resolve(html));
  await page.evaluate(() => document.fonts.ready);
  if (alpha) await page.evaluate((c) => window.setup(c), cfg); else await page.evaluate((c) => { window.T = c; }, cfg);
  const args = alpha
    ? ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-', '-c:v', 'png', '-pix_fmt', 'rgba', out]
    : ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', out];
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'inherit'] });
  const N = Math.round(parseFloat(durS) * 30);
  for (let f = 0; f < N; f++) {
    await page.evaluate((t) => window.render(t), f / 30);
    const buf = await page.screenshot(alpha ? { type: 'png', omitBackground: true } : { type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r)); await b.close();
  console.log('ok', out, N, 'fotogramas');
})();
