import { describe, it, expect } from 'vitest'
import { getDecimalPlaces, roundToPrecision } from '@/components/reactbits/CountUp'

describe('CountUp value precision helpers', () => {
  describe('getDecimalPlaces', () => {
    it('returns 0 for integers', () => {
      expect(getDecimalPlaces(0)).toBe(0)
      expect(getDecimalPlaces(1250)).toBe(0)
    })

    it('returns 0 for values with only zero fractions', () => {
      expect(getDecimalPlaces(1.0)).toBe(0)
      expect(getDecimalPlaces(87.0)).toBe(0)
    })

    it('counts non-zero fractional digits', () => {
      expect(getDecimalPlaces(87.5)).toBe(1)
      expect(getDecimalPlaces(12.34)).toBe(2)
      expect(getDecimalPlaces(1.505)).toBe(3)
    })
  })

  describe('roundToPrecision', () => {
    it('rounds to integers when decimals is 0', () => {
      expect(roundToPrecision(1234.567, 0)).toBe(1235)
      expect(roundToPrecision(12.49, 0)).toBe(12)
      expect(roundToPrecision(0.4, 0)).toBe(0)
    })

    it('keeps fractional precision for non-integer targets', () => {
      expect(roundToPrecision(87.53, 1)).toBe(87.5)
      expect(roundToPrecision(87.56, 1)).toBe(87.6)
      expect(roundToPrecision(12.3456, 2)).toBe(12.35)
    })

    it('handles negative values without snapping past the integer', () => {
      expect(roundToPrecision(-1.2, 0)).toBe(-1)
      expect(roundToPrecision(-1.8, 0)).toBe(-2)
      expect(roundToPrecision(-87.53, 1)).toBe(-87.5)
    })

    it('is an identity for already-precise values', () => {
      expect(roundToPrecision(1250, 0)).toBe(1250)
      expect(roundToPrecision(87.5, 1)).toBe(87.5)
    })
  })
})
