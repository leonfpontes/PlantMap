import { describe, it, expect } from 'vitest'
import {
  CONDITION_CONFIG,
  CONDITION_PIN_COLOR,
  CONDITION_PIN_CLASS,
  STAGE_LABEL,
  ORIGIN_LABEL,
  CONDITION_OPTIONS,
  STAGE_OPTIONS,
} from '@/constants/plant'
import type { PlantCondition, PlantStage } from '@/types'

const CONDITIONS: PlantCondition[] = ['healthy', 'fair', 'poor', 'dead']
const STAGES: PlantStage[]         = ['seedling', 'juvenile', 'adult', 'unknown']

describe('CONDITION_CONFIG', () => {
  it('covers all conditions', () => {
    CONDITIONS.forEach((c) => expect(CONDITION_CONFIG[c]).toBeDefined())
  })

  it('has valid badge variants', () => {
    const validVariants = ['green', 'yellow', 'red', 'gray']
    CONDITIONS.forEach((c) =>
      expect(validVariants).toContain(CONDITION_CONFIG[c].variant)
    )
  })
})

describe('CONDITION_PIN_COLOR', () => {
  it('returns hex colors for all conditions', () => {
    CONDITIONS.forEach((c) =>
      expect(CONDITION_PIN_COLOR[c]).toMatch(/^#[0-9a-fA-F]{6}$/)
    )
  })
})

describe('CONDITION_PIN_CLASS', () => {
  it('contains bg- and border- classes for all conditions', () => {
    CONDITIONS.forEach((c) => {
      expect(CONDITION_PIN_CLASS[c]).toContain('bg-')
      expect(CONDITION_PIN_CLASS[c]).toContain('border-')
    })
  })
})

describe('STAGE_LABEL', () => {
  it('covers all stages', () => {
    STAGES.forEach((s) => expect(STAGE_LABEL[s]).toBeDefined())
  })
})

describe('ORIGIN_LABEL', () => {
  it('covers native, exotic, naturalized', () => {
    expect(ORIGIN_LABEL['native']).toBe('Nativa')
    expect(ORIGIN_LABEL['exotic']).toBe('Exótica')
    expect(ORIGIN_LABEL['naturalized']).toBe('Naturalizada')
  })
})

describe('CONDITION_OPTIONS', () => {
  it('has an entry for each condition', () => {
    const values = CONDITION_OPTIONS.map((o) => o.value)
    CONDITIONS.forEach((c) => expect(values).toContain(c))
  })
})

describe('STAGE_OPTIONS', () => {
  it('has an entry for each stage', () => {
    const values = STAGE_OPTIONS.map((o) => o.value)
    STAGES.forEach((s) => expect(values).toContain(s))
  })
})
