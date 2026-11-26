import type { ID, Proposal, Vote, VoteValue } from './types'

export interface Tally {
  si: ID[]
  no: ID[]
  igual: ID[]
  voted: number
  total: number
}

export type ProposalStatus = 'abierta' | 'aprobada' | 'descartada' | 'empate' | 'programada'

export function tallyVotes(proposalId: ID, votes: Vote[], memberIds: ID[]): Tally {
  const valid = new Set(memberIds)
  const t: Tally = { si: [], no: [], igual: [], voted: 0, total: memberIds.length }
  for (const v of votes) {
    if (v.proposalId !== proposalId || !valid.has(v.memberId)) continue
    t[v.value].push(v.memberId)
    t.voted++
  }
  return t
}

/**
 * Gana una propuesta cuando la mitad más uno del grupo vota «sí»
 * (o cuando todos han votado y hay más síes que noes). Una decisión manual manda.
 */
export function proposalStatus(p: Proposal, tally: Tally, activityExists: boolean): ProposalStatus {
  if (p.activityId && activityExists) return 'programada'
  if (p.decision) return p.decision
  const majority = Math.floor(tally.total / 2) + 1
  if (tally.total > 0 && tally.si.length >= majority) return 'aprobada'
  if (tally.total > 0 && tally.no.length >= majority) return 'descartada'
  if (tally.total > 0 && tally.voted >= tally.total) {
    if (tally.si.length > tally.no.length) return 'aprobada'
    if (tally.no.length > tally.si.length) return 'descartada'
    return 'empate'
  }
  return 'abierta'
}

export const VOTE_LABEL: Record<VoteValue, string> = {
  si: 'Sí',
  no: 'No',
  igual: 'Me da igual',
}

/** Puntuación para "que decida la suerte": más síes, más papeletas. */
export function luckWeight(tally: Tally): number {
  return 1 + tally.si.length * 2 + tally.igual.length - tally.no.length
}
