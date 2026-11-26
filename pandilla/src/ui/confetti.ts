/** Confeti ligero sin dependencias (respeta "reducir movimiento"). */
export function confetti(target: HTMLElement | null = document.getElementById('app-frame')) {
  if (!target || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const colors = ['#6246EA', '#FF6B57', '#FFD60A', '#12A150', '#2F6FEB', '#D6409F']
  const layer = document.createElement('div')
  layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:70'
  target.appendChild(layer)
  const { width, height } = target.getBoundingClientRect()
  for (let i = 0; i < 90; i++) {
    const p = document.createElement('span')
    const size = 6 + Math.random() * 7
    const startX = width / 2 + (Math.random() - 0.5) * width * 0.3
    const dx = (Math.random() - 0.5) * width * 1.1
    const dy = height * (0.55 + Math.random() * 0.5)
    const rot = (Math.random() - 0.5) * 900
    p.style.cssText = `position:absolute;left:${startX}px;top:${height * 0.35}px;width:${size}px;height:${size * 0.45}px;background:${colors[i % colors.length]};border-radius:2px;`
    layer.appendChild(p)
    p.animate(
      [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx * 0.6}px, ${-height * 0.25}px) rotate(${rot / 2}deg)`, opacity: 1, offset: 0.3 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0 },
      ],
      { duration: 1400 + Math.random() * 900, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' },
    )
  }
  window.setTimeout(() => layer.remove(), 2600)
}
