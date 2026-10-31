import confetti from 'canvas-confetti'

const COLORS = ['#7A2D05', '#D4843A', '#FAF7F4', '#C4843A', '#F5C87A', '#5C2104']

// Three-burst spread pattern — centre burst followed by left/right flanks.
// originY: 0–1 vertical position on the viewport (0.45 = near centre).
export function fireConfetti(originY = 0.45) {
  confetti({
    particleCount: 60,
    spread: 70,
    origin: { x: 0.5, y: originY },
    colors: COLORS,
    ticks: 200,
    gravity: 0.9,
    scalar: 0.9,
    startVelocity: 28,
  })
  setTimeout(() => {
    confetti({
      particleCount: 50, spread: 90,
      origin: { x: 0.35, y: originY + 0.05 },
      colors: COLORS,
      ticks: 180, gravity: 1, scalar: 0.8,
      startVelocity: 22, angle: 70,
    })
    confetti({
      particleCount: 50, spread: 90,
      origin: { x: 0.65, y: originY + 0.05 },
      colors: COLORS,
      ticks: 180, gravity: 1, scalar: 0.8,
      startVelocity: 22, angle: 110,
    })
  }, 150)
}
