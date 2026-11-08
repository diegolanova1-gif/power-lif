import { describe, it, expect } from 'vitest'
import {
  exerciseCompliance,
  sessionCompliance,
  repsShortfall,
  type ComplianceStatus,
  type LoggedSetLike,
} from './compliance'

const set = (reps: number, kg: number): LoggedSetLike => ({ reps, weight_kg: kg })
const timedSet = (dur: number, kg: number): LoggedSetLike => ({ reps: null, weight_kg: kg, duration_seconds: dur })

describe('exerciseCompliance', () => {
  it('none when 0 sets logged', () => {
    expect(exerciseCompliance({ sets: 4 }, [])).toBe('none')
  })

  it('partial when fewer sets than prescribed', () => {
    expect(exerciseCompliance({ sets: 4 }, [set(10, 50), set(10, 50)])).toBe('partial')
  })

  it('done when exact sets logged', () => {
    expect(exerciseCompliance({ sets: 3 }, [set(10, 50), set(10, 50), set(10, 50)])).toBe('done')
  })

  it('done when more sets than prescribed', () => {
    expect(exerciseCompliance({ sets: 2 }, [set(10, 50), set(10, 50), set(10, 50)])).toBe('done')
  })

  it('partial with 1 of 4 sets', () => {
    expect(exerciseCompliance({ sets: 4 }, [set(10, 50)])).toBe('partial')
  })

  it('done with 1 prescribed set and 1 logged', () => {
    expect(exerciseCompliance({ sets: 1 }, [set(10, 50)])).toBe('done')
  })
})

describe('sessionCompliance', () => {
  it('none for empty array', () => {
    expect(sessionCompliance([])).toBe('none')
  })

  it('none when all exercises are none', () => {
    expect(sessionCompliance(['none', 'none', 'none'])).toBe('none')
  })

  it('done when all exercises are done', () => {
    expect(sessionCompliance(['done', 'done'])).toBe('done')
  })

  it('partial when mix of done and none', () => {
    expect(sessionCompliance(['done', 'none'])).toBe('partial')
  })

  it('partial when mix of done and partial', () => {
    expect(sessionCompliance(['done', 'partial'])).toBe('partial')
  })

  it('partial when all partial', () => {
    expect(sessionCompliance(['partial', 'partial'])).toBe('partial')
  })

  it('partial when mix of partial and none', () => {
    expect(sessionCompliance(['partial', 'none'])).toBe('partial')
  })

  it('partial for single partial status', () => {
    expect(sessionCompliance(['partial'])).toBe('partial')
  })

  it('done for single done status', () => {
    expect(sessionCompliance(['done'])).toBe('done')
  })

  it('none for single none status', () => {
    expect(sessionCompliance(['none'])).toBe('none')
  })
})

describe('repsShortfall', () => {
  const p = { sets: 3, reps: 10, load_type: 'kg' as const, load_value: 50 }

  it('no shortfall when all sets meet prescription', () => {
    expect(repsShortfall(p, [set(10, 50), set(10, 50), set(10, 50)])).toBe(false)
  })

  it('no shortfall when exceeds prescription', () => {
    expect(repsShortfall(p, [set(12, 60), set(12, 60), set(12, 60)])).toBe(false)
  })

  it('shortfall when reps below prescription', () => {
    expect(repsShortfall(p, [set(10, 50), set(8, 50), set(10, 50)])).toBe(true)
  })

  it('shortfall when weight below prescription', () => {
    expect(repsShortfall(p, [set(10, 50), set(10, 40), set(10, 50)])).toBe(true)
  })

  it('no shortfall when sets incomplete (not enough sets = not applicable)', () => {
    expect(repsShortfall(p, [set(10, 50), set(10, 50)])).toBe(false)
  })

  it('no shortfall with no logged sets', () => {
    expect(repsShortfall(p, [])).toBe(false)
  })

  it('no shortfall without load_type/load_value (weight not checked)', () => {
    const noWeight = { sets: 2, reps: 10 }
    expect(repsShortfall(noWeight, [set(10, 0), set(10, 0)])).toBe(false)
  })

  it('shortfall with timed exercise under duration', () => {
    const timed = { sets: 2, duration_seconds: 30, load_type: 'kg' as const, load_value: 10 }
    expect(repsShortfall(timed, [timedSet(30, 10), timedSet(25, 10)])).toBe(true)
  })

  it('no shortfall with timed exercise meeting duration', () => {
    const timed = { sets: 2, duration_seconds: 30, load_type: 'kg' as const, load_value: 10 }
    expect(repsShortfall(timed, [timedSet(30, 10), timedSet(30, 10)])).toBe(false)
  })
})
