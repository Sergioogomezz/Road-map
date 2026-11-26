import { describe, expect, it } from 'vitest'
import { parseInviteInput } from './share'

describe('código o enlace de invitación', () => {
  it('acepta un código escrito a mano', () => {
    expect(parseInviteInput(' aurora ')).toEqual({ code: 'AURORA', snapshot: null })
  })

  it('acepta un enlace pegado, con o sin copia del viaje', () => {
    expect(parseInviteInput('https://pandilla.vercel.app/#/unirse/K7PM3Q')).toEqual({ code: 'K7PM3Q', snapshot: null })
    expect(parseInviteInput('¡Únete! https://x.app/#/unirse/K7PM3Q?d=zAbC-_123')).toEqual({ code: 'K7PM3Q', snapshot: 'zAbC-_123' })
  })

  it('rechaza lo que no es ni código ni enlace', () => {
    expect(parseInviteInput('   ')).toBeNull()
  })
})
