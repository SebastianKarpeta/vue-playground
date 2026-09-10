import { describe, it, expect } from 'vitest'
import { formatRelativeTime } from '../../composables/formatRelativeTime'

describe('formatRelativeTime', () => {
  it('poniżej 10 sekund pokazuje "przed chwilą"', () => {
    expect(formatRelativeTime(0)).toBe('przed chwilą')
    expect(formatRelativeTime(9_000)).toBe('przed chwilą')
  })

  it('poniżej minuty pokazuje sekundy', () => {
    expect(formatRelativeTime(10_000)).toBe('10 s temu')
    expect(formatRelativeTime(59_000)).toBe('59 s temu')
  })

  it('poniżej godziny pokazuje minuty', () => {
    expect(formatRelativeTime(60_000)).toBe('1 min temu')
    expect(formatRelativeTime(59 * 60_000)).toBe('59 min temu')
  })

  it('od godziny wzwyż pokazuje godziny', () => {
    expect(formatRelativeTime(60 * 60_000)).toBe('1 godz. temu')
    expect(formatRelativeTime(5 * 60 * 60_000)).toBe('5 godz. temu')
  })
})
