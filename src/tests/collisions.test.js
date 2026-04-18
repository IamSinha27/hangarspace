import { describe, it, expect } from 'vitest'
import {
  satOBB,
  yRangesOverlap,
  rotatedExtents,
  getCeilingHeight,
  checkCollisions,
} from '../store/collisions'

// ─── satOBB ────────────────────────────────────────────────────────────────

describe('satOBB', () => {
  it('detects overlap for two identical rectangles at the same position', () => {
    expect(satOBB(0, 0, 5, 2, 0, 0, 0, 5, 2, 0)).toBe(true)
  })

  it('detects overlap for two overlapping axis-aligned rectangles', () => {
    expect(satOBB(0, 0, 5, 2, 0, 3, 0, 5, 2, 0)).toBe(true)
  })

  it('returns false for clearly separated rectangles', () => {
    expect(satOBB(0, 0, 1, 1, 0, 20, 0, 1, 1, 0)).toBe(false)
  })

  it('detects overlap for rotated rectangles that cross', () => {
    // Two rectangles crossing at 90°
    expect(satOBB(0, 0, 5, 1, 0, 0, 0, 1, 5, Math.PI / 2)).toBe(true)
  })

  it('returns false for rotated rectangles that do not overlap', () => {
    expect(satOBB(0, 0, 2, 0.5, 0, 10, 0, 2, 0.5, Math.PI / 2)).toBe(false)
  })
})

// ─── yRangesOverlap ────────────────────────────────────────────────────────

describe('yRangesOverlap', () => {
  it('returns true for overlapping ranges', () => {
    expect(yRangesOverlap(0, 5, 3, 8)).toBe(true)
  })

  it('returns false for non-overlapping ranges', () => {
    expect(yRangesOverlap(0, 3, 5, 8)).toBe(false)
  })

  it('returns false for touching (not strictly overlapping) ranges', () => {
    expect(yRangesOverlap(0, 5, 5, 10)).toBe(false)
  })

  it('returns true for fully contained range', () => {
    expect(yRangesOverlap(2, 4, 0, 6)).toBe(true)
  })
})

// ─── rotatedExtents ────────────────────────────────────────────────────────

describe('rotatedExtents', () => {
  it('returns half-extents unchanged at 0 rotation', () => {
    const ext = rotatedExtents(5, 2, 0)
    expect(ext.x).toBeCloseTo(5)
    expect(ext.z).toBeCloseTo(2)
  })

  it('swaps extents at 90° rotation', () => {
    const ext = rotatedExtents(5, 2, Math.PI / 2)
    expect(ext.x).toBeCloseTo(2)
    expect(ext.z).toBeCloseTo(5)
  })

  it('gives equal extents at 45° for a square', () => {
    const ext = rotatedExtents(3, 3, Math.PI / 4)
    expect(ext.x).toBeCloseTo(ext.z)
  })
})

// ─── getCeilingHeight ──────────────────────────────────────────────────────

const hangar = { length: 30, width: 40, height: 8 }
const flatRoof = { type: 'flat', peakHeight: 8, eaveHeight: 6 }
const gabledRoof = { type: 'gabled', peakHeight: 8, eaveHeight: 5 }
const archedRoof = { type: 'arched', peakHeight: 8, eaveHeight: 5 }

describe('getCeilingHeight', () => {
  it('returns peakHeight for flat roof everywhere', () => {
    expect(getCeilingHeight(0, 0, flatRoof, hangar)).toBe(8)
    expect(getCeilingHeight(5, 10, flatRoof, hangar)).toBe(8)
  })

  it('returns peakHeight at center for gabled roof', () => {
    expect(getCeilingHeight(0, 0, gabledRoof, hangar)).toBeCloseTo(8)
  })

  it('returns eaveHeight at edge for gabled roof', () => {
    expect(getCeilingHeight(0, 20, gabledRoof, hangar)).toBeCloseTo(5)
  })

  it('returns peakHeight at center for arched roof', () => {
    expect(getCeilingHeight(0, 0, archedRoof, hangar)).toBeCloseTo(8)
  })

  it('is lower away from center for arched roof', () => {
    const center = getCeilingHeight(0, 0, archedRoof, hangar)
    const edge = getCeilingHeight(0, 15, archedRoof, hangar)
    expect(center).toBeGreaterThan(edge)
  })
})

// ─── checkCollisions ───────────────────────────────────────────────────────

const makeSpec = (id, overrides = {}) => ({
  id,
  length: 10,
  wingspan: 12,
  tailHeight: 3,
  fuselageWidth: 1.5,
  wingRootHeight: 1,
  wingThickness: 0.3,
  elevatorSpan: 0,
  ...overrides,
})

const makeAircraft = (uid, specId, x, z, rotation = 0) => ({ uid, specId, x, z, rotation })

const specs = [makeSpec(1), makeSpec(2)]
const buffer = 0.9
const roof = flatRoof

describe('checkCollisions', () => {
  it('returns empty sets for a single aircraft', () => {
    const placed = [makeAircraft('a', 1, 0, 0)]
    const result = checkCollisions(placed, buffer, specs, hangar, roof)
    expect(result.collisions.size).toBe(0)
    expect(result.wingCollisions.size).toBe(0)
    expect(result.heightViolations.size).toBe(0)
    expect(result.boundaryViolations.size).toBe(0)
  })

  it('detects fuselage collision for two overlapping aircraft', () => {
    const placed = [makeAircraft('a', 1, 0, 0), makeAircraft('b', 2, 0, 0)]
    const { collisions } = checkCollisions(placed, buffer, specs, hangar, roof)
    expect(collisions.has('a')).toBe(true)
    expect(collisions.has('b')).toBe(true)
  })

  it('no collision for well-separated aircraft', () => {
    const placed = [makeAircraft('a', 1, -10, 0), makeAircraft('b', 2, 10, 0)]
    const { collisions } = checkCollisions(placed, buffer, specs, hangar, roof)
    expect(collisions.size).toBe(0)
  })

  it('detects boundary violation when aircraft is outside hangar', () => {
    const placed = [makeAircraft('a', 1, 100, 0)]
    const { boundaryViolations } = checkCollisions(placed, buffer, specs, hangar, roof)
    expect(boundaryViolations.has('a')).toBe(true)
  })

  it('detects height violation when tail exceeds ceiling minus buffer', () => {
    const tallSpec = makeSpec(3, { tailHeight: 20 })
    const placed = [makeAircraft('a', 3, 0, 0)]
    const { heightViolations } = checkCollisions(placed, buffer, [tallSpec], hangar, flatRoof)
    expect(heightViolations.has('a')).toBe(true)
  })

  it('detects wing collision for same-height wings close together', () => {
    // Same wing height — close but not fuselage-colliding
    const s1 = makeSpec(1, { length: 10, wingspan: 12, wingRootHeight: 1, wingThickness: 0.3 })
    const s2 = makeSpec(2, { length: 10, wingspan: 12, wingRootHeight: 1, wingThickness: 0.3 })
    // Place side by side — fuselages clear but wings overlap
    const placed = [makeAircraft('a', 1, 0, 0), makeAircraft('b', 2, 0, 7)]
    const { collisions, wingCollisions } = checkCollisions(placed, buffer, [s1, s2], hangar, roof)
    // Wings at same height and close → should register some collision
    expect(collisions.size + wingCollisions.size).toBeGreaterThan(0)
  })

  it('no wing collision when wings are at different heights (high vs low wing)', () => {
    const lowWing  = makeSpec(1, { wingRootHeight: 0.5, wingThickness: 0.2 })
    const highWing = makeSpec(2, { wingRootHeight: 3.0, wingThickness: 0.2 })
    // Position them close — wings should pass over/under each other
    const placed = [makeAircraft('a', 1, 0, 0), makeAircraft('b', 2, 0, 7)]
    const { wingCollisions } = checkCollisions(placed, buffer, [lowWing, highWing], hangar, roof)
    expect(wingCollisions.size).toBe(0)
  })
})
