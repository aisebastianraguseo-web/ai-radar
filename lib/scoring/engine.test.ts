import { describe, it, expect } from 'vitest'
import { calculateScore } from './engine'
import type { ScorecardInputs } from './engine'

const baseInputs: ScorecardInputs = {
  delta_magnitude: 1,
  vendors_affected: ['openai'],
  confidence_score: 0.9,
  has_open_source: false,
  mapping_count: 1,
  source_type: 'blog_official',
}

describe('calculateScore', () => {
  it('returns all expected fields', () => {
    const result = calculateScore(baseInputs)
    expect(result).toHaveProperty('vendor_leadership_score')
    expect(result).toHaveProperty('novelty_score')
    expect(result).toHaveProperty('distribution_potential_score')
    expect(result).toHaveProperty('open_source_score')
    expect(result).toHaveProperty('cost_reduction_score')
    expect(result).toHaveProperty('momentum_score')
    expect(result).toHaveProperty('hype_adjustment')
    expect(result).toHaveProperty('multi_signal_bonus')
    expect(result).toHaveProperty('total_disruption_score')
  })

  it('awards top-vendor leadership score for OpenAI', () => {
    const result = calculateScore(baseInputs)
    expect(result.vendor_leadership_score).toBe(2)
  })

  it('awards 1 for minor vendor', () => {
    const result = calculateScore({ ...baseInputs, vendors_affected: ['some-startup'] })
    expect(result.vendor_leadership_score).toBe(1)
  })

  it('awards 0 when no vendors affected', () => {
    const result = calculateScore({ ...baseInputs, vendors_affected: [] })
    expect(result.vendor_leadership_score).toBe(0)
  })

  it('maps delta_magnitude to novelty_score', () => {
    expect(calculateScore({ ...baseInputs, delta_magnitude: 0 }).novelty_score).toBe(0)
    expect(calculateScore({ ...baseInputs, delta_magnitude: 1 }).novelty_score).toBe(1)
    expect(calculateScore({ ...baseInputs, delta_magnitude: 2 }).novelty_score).toBe(2)
  })

  it('caps distribution_potential_score at 2', () => {
    const result = calculateScore({ ...baseInputs, mapping_count: 99 })
    expect(result.distribution_potential_score).toBe(2)
  })

  it('awards open_source_score for has_open_source flag', () => {
    const result = calculateScore({ ...baseInputs, has_open_source: true, vendors_affected: [] })
    expect(result.open_source_score).toBe(1)
  })

  it('awards open_source_score for known open-source vendor', () => {
    const result = calculateScore({ ...baseInputs, vendors_affected: ['meta'] })
    expect(result.open_source_score).toBe(1)
  })

  it('awards cost_reduction_score 2 for arxiv source', () => {
    const result = calculateScore({ ...baseInputs, source_type: 'arxiv' })
    expect(result.cost_reduction_score).toBe(2)
  })

  it('awards cost_reduction_score 1 for blog_official source', () => {
    expect(calculateScore(baseInputs).cost_reduction_score).toBe(1)
  })

  it('awards cost_reduction_score 0 for other source', () => {
    const result = calculateScore({ ...baseInputs, source_type: 'hacker_news' })
    expect(result.cost_reduction_score).toBe(0)
  })

  it('applies hype_adjustment for low confidence', () => {
    const low = calculateScore({ ...baseInputs, confidence_score: 0.4 })
    expect(low.hype_adjustment).toBe(1)
    const high = calculateScore({ ...baseInputs, confidence_score: 0.6 })
    expect(high.hype_adjustment).toBe(0)
  })

  it('applies multi_signal_bonus for confidence >= 0.8', () => {
    const bonus = calculateScore({ ...baseInputs, confidence_score: 0.8 })
    expect(bonus.multi_signal_bonus).toBe(1)
    const noBonus = calculateScore({ ...baseInputs, confidence_score: 0.7 })
    expect(noBonus.multi_signal_bonus).toBe(0)
  })

  it('total_disruption_score is never negative', () => {
    const worst = calculateScore({
      delta_magnitude: 0,
      vendors_affected: [],
      confidence_score: 0.1,
      has_open_source: false,
      mapping_count: 0,
      source_type: 'rss_other',
    })
    expect(worst.total_disruption_score).toBeGreaterThanOrEqual(0)
  })

  it('alert triggers at score >= 6 (integration check via calculateScore)', () => {
    const high = calculateScore({
      delta_magnitude: 2,
      vendors_affected: ['openai', 'google', 'anthropic'],
      confidence_score: 0.9,
      has_open_source: true,
      mapping_count: 5,
      source_type: 'arxiv',
    })
    expect(high.total_disruption_score).toBeGreaterThanOrEqual(6)
  })
})
