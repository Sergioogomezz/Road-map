// Genera el reel «El chat de WhatsApp» en MP4 1080x1920 a 30 fps.
// Uso (desde esta carpeta):
//   node render.js                    -> reel con efectos de sonido
//   node render.js --voz voz.m4a      -> reel con tu voz encima de los efectos
//   añade --musica para sumar la música original (musica.py), y --solo-audio para
//   rehacer solo el sonido reutilizando los fotogramas ya generados.
// Los tiempos salen de tiempos.json.
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const { chromium } = require('playwright');

const DIR = __dirname;
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const TFILE = path.resolve(opt('--tiempos') || path.join(DIR, 'tiempos.json'));
const T = JSON.parse(fs.readFileSync(TFILE, 'utf8'));
const FPS = 30;
const OUT = path.join(DIR, 'salida');
fs.mkdirSync(OUT, { recursive: true });
const voz = opt('--voz');
const final = path.join(OUT, opt('--out') || (voz ? 'reel-whatsapp-con-voz.mp4' : 'reel-whatsapp.mp4'));
const video = path.join(OUT, 'video-sin-audio.mp4');
const sfx = path.join(OUT, 'efectos.wav');
const conMusica = args.includes('--musica');
const soloAudio = args.includes('--solo-audio') && fs.existsSync(video);
const musica = path.join(OUT, 'musica.wav');
const ambiente = path.join(OUT, 'ambiente.wav');

function run(cmd, a) { execFileSync(cmd, a, { stdio: ['ignore', 'ignore', 'inherit'] }); }

(async () => {
  if (!soloAudio) await fotogramas();
  sonido();
})();

async function fotogramas() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(DIR, 'escena.html'));
  await page.evaluate((T) => { window.T = T; }, T);
  await page.evaluate(() => document.fonts.ready);

  // Portada
  await page.evaluate((t) => window.render(t), T.cover);
  await page.screenshot({ path: path.join(OUT, 'portada.jpg'), type: 'jpeg', quality: 92 });

  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), video], { stdio: ['pipe', 'ignore', 'inherit'] });
  const N = Math.round(T.end * FPS);
  for (let f = 0; f < N; f++) {
    await page.evaluate((t) => window.render(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 150 === 0) process.stdout.write(`fotograma ${f}/${N}\n`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await browser.close();
}

function sonido() {
  run('python3', [path.join(DIR, 'sfx.py'), TFILE, sfx]);
  if (conMusica) run('python3', [path.join(DIR, 'musica.py'), TFILE, musica, ambiente]);

  if (voz && conMusica) {
    // Voz delante; la música se baja sola cuando hablas (sidechain); efectos y ambiente encima.
    run('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-i', voz, '-i', sfx, '-i', musica, '-i', ambiente, '-filter_complex',
      '[1:a]aresample=48000,asplit=2[v][vsc];[2:a]volume=0.2[s];[3:a]aresample=48000[m];' +
      '[m][vsc]sidechaincompress=threshold=0.03:ratio=2.5:attack=30:release=500:makeup=1[md];[4:a]aresample=48000[amb];' +
      '[v][s][md][amb]amix=inputs=4:duration=first:normalize=0,alimiter=limit=0.89[a]',
      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(T.end), '-movflags', '+faststart', final]);
  } else if (voz) {
    // La voz llega ya montada y nivelada (sincronizar.py); los efectos van más bajos debajo.
    run('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-i', voz, '-i', sfx, '-filter_complex',
      '[1:a]aresample=48000[v];[2:a]volume=0.2[s];[v][s]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.89[a]',
      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(T.end), '-movflags', '+faststart', final]);
  } else {
    run('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-i', sfx, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
      '-c:a', 'aac', '-b:a', '192k', '-t', String(T.end), '-movflags', '+faststart', final]);
  }
  console.log('Listo:', final);
}
