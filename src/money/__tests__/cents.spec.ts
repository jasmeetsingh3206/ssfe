import { describe, expect, it } from 'vitest'
import { formatCents, parseCents, toAmount } from '../cents'

describe('parseCents', () => {
  it.each([
    ['120.00', 12000],
    ['120.50', 12050],
    ['0.01', 1],
    ['0.00', 0],
    ['-200.00', -20000],
    ['-0.00', 0],
    ['1234567.89', 123456789],
  ])('%s → %i', (s, cents) => {
    expect(parseCents(s)).toBe(cents)
  })

  it('never returns -0', () => {
    expect(Object.is(parseCents('-0.00'), -0)).toBe(false)
  })

  it.each([
    '120',
    '120.5',
    '120.500',
    '1,234.50',
    '$1.00',
    '+1.00',
    ' 1.00',
    '1e2.00',
    '',
    'abc',
    '-.50',
    '1.2.30',
    '1.23.45',
    '-',
    '--1.00',
    '1.-5',
    '0x1.00',
  ])('rejects %j', (s) => {
    expect(() => parseCents(s)).toThrow('Invalid amount')
  })
})

describe('formatCents', () => {
  it.each([
    [123450, '$1,234.50'],
    [-20000, '-$200.00'],
    [0, '$0.00'],
    [5, '$0.05'],
    [-1, '-$0.01'],
    [100000000, '$1,000,000.00'],
  ])('%i → %s', (c, s) => {
    expect(formatCents(c)).toBe(s)
  })
})

describe('toAmount', () => {
  it.each([
    [12050, '120.50'],
    [-20000, '-200.00'],
    [1, '0.01'],
    [0, '0.00'],
    [123456789, '1234567.89'],
  ])('%i → %s and back', (c, s) => {
    expect(toAmount(c)).toBe(s)
    expect(parseCents(s)).toBe(c)
  })
})
