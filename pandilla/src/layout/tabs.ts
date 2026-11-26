import { CalendarDays, House, Luggage, PartyPopper, Wallet, type LucideIcon } from 'lucide-react'

export type TabId = 'inicio' | 'plan' | 'gastos' | 'logistica' | 'social'

export const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'inicio', label: 'Inicio', icon: House },
  { id: 'plan', label: 'Plan', icon: CalendarDays },
  { id: 'gastos', label: 'Gastos', icon: Wallet },
  { id: 'logistica', label: 'Logística', icon: Luggage },
  { id: 'social', label: 'Social', icon: PartyPopper },
]

export function isTab(v: string | undefined): v is TabId {
  return TABS.some((t) => t.id === v)
}
