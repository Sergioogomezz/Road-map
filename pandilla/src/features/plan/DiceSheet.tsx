import { CalendarPlus, Dices, Trophy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { luckWeight } from '../../domain/polls'
import { decideProposal } from '../../data/actions'
import { useUpdate } from '../../hooks/useTrip'
import { Button } from '../../ui/Button'
import { cn } from '../../ui/cn'
import { confetti } from '../../ui/confetti'
import { haptic } from '../../ui/haptics'
import { Sheet } from '../../ui/Sheet'
import type { Proposal } from '../../domain/types'
import type { ProposalView } from './Polls'

/** Sorteo ponderado entre propuestas: cada «sí» da más papeletas. */
export function DiceSheet({ open, onClose, candidates, onSchedule }: { open: boolean; onClose: () => void; candidates: ProposalView[]; onSchedule: (p: Proposal) => void }) {
  const update = useUpdate()
  const [highlight, setHighlight] = useState<number | null>(null)
  const [winner, setWinner] = useState<number | null>(null)
  const [rolling, setRolling] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(() => {
    if (!open) {
      timers.current.forEach((t) => window.clearTimeout(t))
      timers.current = []
      setHighlight(null)
      setWinner(null)
      setRolling(false)
    }
  }, [open])

  const roll = () => {
    if (!candidates.length) return
    const weights = candidates.map((c) => Math.max(0.5, luckWeight(c.tally)))
    const total = weights.reduce((a, b) => a + b, 0)
    let r = Math.random() * total
    let pick = 0
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i]
      if (r <= 0) {
        pick = i
        break
      }
    }
    setRolling(true)
    setWinner(null)
    // Recorre la lista frenando poco a poco hasta caer en la ganadora.
    const steps = candidates.length * 3 + pick + 1
    let delay = 0
    for (let s = 0; s < steps; s++) {
      delay += 50 + Math.pow(s / steps, 3) * 260
      const index = s % candidates.length
      timers.current.push(
        window.setTimeout(() => {
          setHighlight(index)
          haptic(4)
        }, delay),
      )
    }
    timers.current.push(
      window.setTimeout(() => {
        setWinner(pick)
        setRolling(false)
        haptic([20, 40, 30])
        confetti()
      }, delay + 200),
    )
  }

  const won = winner !== null ? candidates[winner]?.proposal : undefined

  return (
    <Sheet open={open} onClose={onClose} title="Que decida la suerte" subtitle="Cada «sí» da más papeletas; cada «no», menos.">
      <ul className="flex flex-col gap-2">
        {candidates.map((c, i) => (
          <li
            key={c.proposal.id}
            className={cn(
              'flex items-center gap-3 rounded-2xl border px-3 py-3 transition-all duration-150',
              winner === i ? 'scale-[1.02] border-success bg-success-soft' : highlight === i ? 'border-primary bg-primary-soft' : 'border-line bg-surface',
            )}
          >
            <span className="flex-1 font-semibold">{c.proposal.title}</span>
            <span className="text-xs font-semibold text-muted">👍 {c.tally.si.length}</span>
            {winner === i && <Trophy className="size-5 animate-pop text-success-text" />}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-col gap-2">
        {won ? (
          <>
            <Button
              full
              size="lg"
              icon={<CalendarPlus className="size-5" />}
              onClick={() => {
                update((t) => decideProposal(t, won.id, 'aprobada'))
                onSchedule(won)
              }}
            >
              Aprobar y añadir al itinerario
            </Button>
            <Button variant="secondary" full onClick={roll} icon={<Dices className="size-4" />}>
              Volver a tirar
            </Button>
          </>
        ) : (
          <Button full size="lg" onClick={roll} disabled={rolling} icon={<Dices className={cn('size-5', rolling && 'animate-spin')} />}>
            {rolling ? 'Tirando…' : 'Tirar el dado'}
          </Button>
        )}
      </div>
    </Sheet>
  )
}
