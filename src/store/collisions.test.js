import { describe, it, expect } from 'vitest'
import { satOBB, yRangesOverlap, rotatedExtents, checkCollisions, getCeilingHeight, isInsideTHangar } from './collisions.js'

// ─── Test fixtures ─────────────────────────────────────────────────────────────

const HANGAR = { length: 30.48, width: 41.45, height: 8.53 }
const BUFFER = 0.9144 // 3 ft

// Fuselage width 1m, wingspan 10m, length 8m, tail 2.5m
const HIGH_WING = {
  id: 'high',
  length: 8.0,
  wingspan: 10.0,
  tailHeight: 2.5,
  fuselageWidth: 1.0,
  wingRootHeight: 1.0,   // wing starts 1m off ground
  wingThickness: 0.25,
}

const LOW_WING = {
  id: 'low',
  length: 8.0,
  wingspan: 10.0,
  tailHeight: 2.5,
  fuselageWidth: 1.0,
  wingRootHeight: 0.0,   // wing starts at ground level
  wingThickness: 0.25,
}

const TALL = {
  id: 'tall',
  length: 8.0,
  wingspan: 10.0,
  tailHeight: 9.0,       // exceeds hangar ceiling (8.53m)
  fuselageWidth: 1.0,
  wingRootHeight: 1.0,
  wingThickness: 0.25,
}

const SPECS = [HIGH_WING, LOW_WING, TALL]

function aircraft(uid, specId, x, z, rotation = 0) {
  return { uid, specId, x, z, rotation }
}

// ─── satOBB ────────────────────────────────────────────────────────────────────

describe('satOBB', () => {
  it('detects overlap between two identical axis-aligned boxes', () => {
    // Same center, same size — fully overlapping
    expect(satOBB(0, 0, 2, 1, 0, 0, 0, 2, 1, 0)).toBe(true)
  })

  it('detects overlap between two axis-aligned boxes that intersect', () => {
    // Centers 3 apart, half-lengths 2 each → they overlap by 1
    expect(satOBB(0, 0, 2, 1, 0, 3, 0, 2, 1, 0)).toBe(true)
  })

  it('returns false for two axis-aligned boxes with a clear gap', () => {
    // Centers 10 apart, half-lengths 2 each → gap of 6
    expect(satOBB(0, 0, 2, 1, 0, 10, 0, 2, 1, 0)).toBe(false)
  })

  it('treats boxes that touch exactly at their edges as overlapping', () => {
    // Centers 4 apart, half-lengths 2 each → separation == sum of projections.
    // We treat touching as a collision (conservative — no clearance means contact).
    expect(satOBB(0, 0, 2, 1, 0, 4, 0, 2, 1, 0)).toBe(true)
  })

  it('detects overlap between two rotated boxes that intersect', () => {
    // A at origin facing along X, B at (3,0) rotated 45° — they overlap
    expect(satOBB(0, 0, 2, 0.5, 0, 3, 0, 2, 0.5, Math.PI / 4)).toBe(true)
  })

  it('returns false for rotated boxes that appear close but do not overlap', () => {
    // A at (0,0) facing X, B at (8,0) rotated 90° — far enough apart
    expect(satOBB(0, 0, 2, 0.5, 0, 8, 0, 2, 0.5, Math.PI / 2)).toBe(false)
  })

  it('handles 90-degree rotation correctly', () => {
    // A: 4×1 box along X. B: 4×1 box along Z at (0, 3).
    // A half-extents: hL=2 along X, hW=0.5 along Z
    // B half-extents: hL=2 along Z, hW=0.5 along X (rotated 90°)
    // Z separation = 3. A projects 0.5 onto Z, B projects 2 onto Z → total 2.5 < 3 → no overlap
    expect(satOBB(0, 0, 2, 0.5, 0, 0, 3, 2, 0.5, Math.PI / 2)).toBe(false)
  })
})

// ─── yRangesOverlap ────────────────────────────────────────────────────────────

describe('yRangesOverlap', () => {
  it('returns true when ranges overlap', () => {
    expect(yRangesOverlap(0, 2, 1, 3)).toBe(true)
  })

  it('returns true when one range contains the other', () => {
    expect(yRangesOverlap(0, 4, 1, 3)).toBe(true)
  })

  it('returns false when ranges are completely separate', () => {
    expect(yRangesOverlap(0, 1, 2, 3)).toBe(false)
  })

  it('returns false when ranges touch at a single point (strict inequality)', () => {
    expect(yRangesOverlap(0, 1, 1, 2)).toBe(false)
  })
})

// ─── rotatedExtents ────────────────────────────────────────────────────────────

describe('rotatedExtents', () => {
  it('returns half-dimensions unchanged at 0° rotation', () => {
    const ext = rotatedExtents(4, 1, 0)
    expect(ext.x).toBeCloseTo(4)
    expect(ext.z).toBeCloseTo(1)
  })

  it('returns swapped half-dimensions at 90° rotation', () => {
    const ext = rotatedExtents(4, 1, Math.PI / 2)
    expect(ext.x).toBeCloseTo(1)
    expect(ext.z).toBeCloseTo(4)
  })

  it('returns equal extents at 45° for a square box', () => {
    const ext = rotatedExtents(2, 2, Math.PI / 4)
    expect(ext.x).toBeCloseTo(2 * Math.sqrt(2))
    expect(ext.z).toBeCloseTo(2 * Math.sqrt(2))
  })

  it('returns the maximum world-axis extent for a non-square box at 45°', () => {
    // hL=4, hW=1 at 45°: x = 4*cos45 + 1*sin45 = 5/√2 ≈ 3.536
    const ext = rotatedExtents(4, 1, Math.PI / 4)
    expect(ext.x).toBeCloseTo((4 + 1) / Math.sqrt(2))
    expect(ext.z).toBeCloseTo((4 + 1) / Math.sqrt(2))
  })
})

// ─── getCeilingHeight ──────────────────────────────────────────────────────────

describe('getCeilingHeight', () => {
  const hangar = HANGAR
  const flat   = { type: 'flat',   peakHeight: 8.53, eaveHeight: 6.10 }
  const gabled = { type: 'gabled', peakHeight: 8.53, eaveHeight: 6.10 }
  const arched = { type: 'arched', peakHeight: 8.53, eaveHeight: 6.10 }

  it('flat roof returns peak height everywhere', () => {
    expect(getCeilingHeight(0,  0, flat, hangar)).toBeCloseTo(8.53)
    expect(getCeilingHeight(0, 10, flat, hangar)).toBeCloseTo(8.53)
  })

  it('gabled roof returns peak height at center (z=0)', () => {
    expect(getCeilingHeight(0, 0, gabled, hangar)).toBeCloseTo(8.53)
  })

  it('gabled roof returns eave height at side wall', () => {
    expect(getCeilingHeight(0, hangar.width / 2, gabled, hangar)).toBeCloseTo(6.10)
  })

  it('gabled roof is linear between eave and peak', () => {
    const midZ = hangar.width / 4  // halfway between center and wall
    const h = getCeilingHeight(0, midZ, gabled, hangar)
    const expected = 6.10 + (8.53 - 6.10) * 0.5
    expect(h).toBeCloseTo(expected)
  })

  it('arched roof returns peak height at center', () => {
    expect(getCeilingHeight(0, 0, arched, hangar)).toBeCloseTo(8.53)
  })

  it('arched roof returns eave height at wall', () => {
    expect(getCeilingHeight(0, hangar.width / 2, arched, hangar)).toBeCloseTo(6.10)
  })

  it('arched roof is always >= gabled at same position (convex curve)', () => {
    const z = hangar.width / 4
    const gabledH = getCeilingHeight(0, z, gabled, hangar)
    const archedH = getCeilingHeight(0, z, arched, hangar)
    expect(archedH).toBeGreaterThanOrEqual(gabledH)
  })
})

// ─── checkCollisions ───────────────────────────────────────────────────────────

describe('checkCollisions — no issues', () => {
  it('reports no violations when hangar is empty', () => {
    const result = checkCollisions([], BUFFER, SPECS, HANGAR, { type: "flat", peakHeight: 8.53, eaveHeight: 6.10 })
    expect(result.collisions.size).toBe(0)
    expect(result.wingCollisions.size).toBe(0)
    expect(result.heightViolations.size).toBe(0)
    expect(result.boundaryViolations.size).toBe(0)
  })

  it('reports no violations for a single aircraft well inside the hangar', () => {
    const result = checkCollisions([aircraft("a1", "high", 0, 0)], BUFFER, SPECS, HANGAR, { type: "flat", peakHeight: 8.53, eaveHeight: 6.10 })
    expect(result.collisions.size).toBe(0)
    expect(result.boundaryViolations.size).toBe(0)
  })

  it('reports no violations for two aircraft far apart', () => {
    const placed = [
      aircraft('a1', 'high',  10, 0),
      aircraft('a2', 'high', -10, 0),
    ]
    const result = checkCollisions(placed, BUFFER, SPECS, HANGAR, { type: "flat", peakHeight: 8.53, eaveHeight: 6.10 })
    expect(result.collisions.size).toBe(0)
    expect(result.wingCollisions.size).toBe(0)
  })
})

describe('checkCollisions — fuselage collision', () => {
  it('flags both aircraft when fuselages overlap', () => {
    // At x=2 apart with 8m fuselage + buffer they definitely overlap
    const placed = [
      aircraft('a1', 'high', 0, 0),
      aircraft('a2', 'high', 2, 0),
    ]
    const result = checkCollisions(placed, BUFFER, SPECS, HANGAR, { type: "flat", peakHeight: 8.53, eaveHeight: 6.10 })
    expect(result.collisions.has('a1')).toBe(true)
    expect(result.collisions.has('a2')).toBe(true)
  })

  it('clears fuselage collision when aircraft are moved apart', () => {
    const placed = [
      aircraft('a1', 'high', 0,   0),
      aircraft('a2', 'high', 20,  0),  // well clear
    ]
    const result = checkCollisions(placed, BUFFER, SPECS, HANGAR, { type: "flat", peakHeight: 8.53, eaveHeight: 6.10 })
    expect(result.collisions.size).toBe(0)
  })
})

describe('checkCollisions — wing-wing collision', () => {
  it('flags wing collision when two high-wing aircraft wings overlap in XZ and Y', () => {
    // Wings at same Y range [1.0, 1.25]. Place alongside each other (Z offset 8m).
    // Wingspan 10m → wingtip at ±5m from center.
    // Z separation 8 < 5+5+2×buffer ≈ 11.8 → wing XZ overlap.
    const placed = [
      aircraft('a1', 'high', 0, 0),
      aircraft('a2', 'high', 0, 8),
    ]
    const result = checkCollisions(placed, BUFFER, SPECS, HANGAR, { type: "flat", peakHeight: 8.53, eaveHeight: 6.10 })
    expect(result.wingCollisions.has('a1')).toBe(true)
    expect(result.wingCollisions.has('a2')).toBe(true)
    // Fuselages must NOT be colliding (width 1m, z-sep 8m >> 1+2×buffer)
    expect(result.collisions.has('a1')).toBe(false)
  })

  it('does NOT flag wing collision when wings are at different Y heights (high vs low wing)', () => {
    // HIGH wing Y: [1.0, 1.25]. LOW wing Y: [0.0, 0.25]. No Y overlap.
    const placed = [
      aircraft('a1', 'high', 0, 0),
      aircraft('a2', 'low',  0, 8),
    ]
    const result = checkCollisions(placed, BUFFER, SPECS, HANGAR, { type: "flat", peakHeight: 8.53, eaveHeight: 6.10 })
    expect(result.wingCollisions.has('a1')).toBe(false)
    expect(result.wingCollisions.has('a2')).toBe(false)
    expect(result.collisions.has('a1')).toBe(false)
  })
})

describe('checkCollisions — wing-fuselage cross collision', () => {
  it('flags collision when high-wing A wing enters buffer zone of B fuselage at matching Y height', () => {
    // HIGH wing Y [1.0, 1.25] overlaps LOW fuselage Y [0, 2.5].
    // A at (0,0), B at (0,5): wing of A (half-wingspan 5m, no buffer) vs fuselage of B
    // (half-width 0.5+buffer=1.41m). Z separation 5 < 5+1.41 = 6.41 → overlap.
    // Fuselage-fuselage Z: 5 > 0.5+buffer + 0.5+buffer = 2.83 → no fuse collision.
    const placed = [
      aircraft('a1', 'high', 0, 0),
      aircraft('a2', 'low',  0, 5),
    ]
    const result = checkCollisions(placed, BUFFER, SPECS, HANGAR, { type: "flat", peakHeight: 8.53, eaveHeight: 6.10 })
    expect(result.collisions.has('a1')).toBe(true)
    expect(result.collisions.has('a2')).toBe(true)
  })

  it('does NOT flag wing-fuselage collision when aircraft are far apart', () => {
    const placed = [
      aircraft('a1', 'high',  0, 0),
      aircraft('a2', 'low',   0, 15),
    ]
    const result = checkCollisions(placed, BUFFER, SPECS, HANGAR, { type: "flat", peakHeight: 8.53, eaveHeight: 6.10 })
    expect(result.collisions.size).toBe(0)
  })
})

describe('checkCollisions — boundary violations', () => {
  it('flags aircraft placed outside the hangar boundary', () => {
    // Hangar half-length = 15.24m. Aircraft wingspan 10m → wingtip at 5m.
    // At x=14, wingtip reaches 14+5=19 > 15.24 → out of bounds
    const placed = [aircraft('a1', 'high', 14, 0)]
    const result = checkCollisions(placed, BUFFER, SPECS, HANGAR, { type: "flat", peakHeight: 8.53, eaveHeight: 6.10 })
    expect(result.boundaryViolations.has('a1')).toBe(true)
  })

  it('does NOT flag aircraft well within the hangar boundary', () => {
    const placed = [aircraft('a1', 'high', 0, 0)]
    const result = checkCollisions(placed, BUFFER, SPECS, HANGAR, { type: "flat", peakHeight: 8.53, eaveHeight: 6.10 })
    expect(result.boundaryViolations.has('a1')).toBe(false)
  })

  it('flags aircraft outside the Z (width) boundary', () => {
    // Hangar half-width = 20.725m. At z=19, wingtip at 19+5=24 > 20.725
    const placed = [aircraft('a1', 'high', 0, 19)]
    const result = checkCollisions(placed, BUFFER, SPECS, HANGAR, { type: "flat", peakHeight: 8.53, eaveHeight: 6.10 })
    expect(result.boundaryViolations.has('a1')).toBe(true)
  })
})

describe('checkCollisions — height violations', () => {
  it('flags aircraft whose tail exceeds the hangar ceiling minus buffer', () => {
    // TALL aircraft tailHeight=9.0m > hangar.height(8.53) - buffer(0.9144) = 7.62m
    const placed = [aircraft('a1', 'tall', 0, 0)]
    const result = checkCollisions(placed, BUFFER, SPECS, HANGAR, { type: "flat", peakHeight: 8.53, eaveHeight: 6.10 })
    expect(result.heightViolations.has('a1')).toBe(true)
  })

  it('does NOT flag aircraft that fit within the ceiling', () => {
    // HIGH_WING tailHeight=2.5m << 7.62m ceiling threshold
    const placed = [aircraft('a1', 'high', 0, 0)]
    const result = checkCollisions(placed, BUFFER, SPECS, HANGAR, { type: "flat", peakHeight: 8.53, eaveHeight: 6.10 })
    expect(result.heightViolations.has('a1')).toBe(false)
  })
})

describe('checkCollisions — rotation', () => {
  it('detects collision correctly when one aircraft is rotated 90°', () => {
    // A at (0,0) facing X (length along X).
    // B at (0,4) rotated 90° (length along Z, now 8m tall in Z direction).
    // B's fuselage now extends ±4m in Z + buffer. Center sep = 4.
    // A's fuselage half-width in Z = 0.5+buffer = 1.41. B's half-length in Z = 4+buffer = 4.91.
    // Total Z proj = 6.32 > 4 → overlap.
    const placed = [
      aircraft('a1', 'high', 0, 0, 0),
      aircraft('a2', 'high', 0, 4, Math.PI / 2),
    ]
    const result = checkCollisions(placed, BUFFER, SPECS, HANGAR, { type: "flat", peakHeight: 8.53, eaveHeight: 6.10 })
    expect(result.collisions.has('a1')).toBe(true)
    expect(result.collisions.has('a2')).toBe(true)
  })

  it('correctly finds no collision when rotation moves aircraft clear', () => {
    // A at (0,0), B at (0,12) rotated 90°. Far enough that even rotated they don't collide.
    const placed = [
      aircraft('a1', 'high', 0,  0, 0),
      aircraft('a2', 'high', 0, 12, Math.PI / 2),
    ]
    const result = checkCollisions(placed, BUFFER, SPECS, HANGAR, { type: "flat", peakHeight: 8.53, eaveHeight: 6.10 })
    expect(result.collisions.size).toBe(0)
  })
})

// ─── Elevator collisions ───────────────────────────────────────────────────────

const FLAT_ROOF = { type: 'flat', peakHeight: 8.53, eaveHeight: 6.10 }

// Small wingspan (2m) so main wings don't reach across at z=3 test spacing.
// High-wing: wings at 1.0-1.25m, elevator at 1.375-1.75m (55-70% of 2.5m tail)
const HIGH_ELEV = {
  id: 'helev',
  length: 8.0, wingspan: 2.0, tailHeight: 2.5,
  fuselageWidth: 1.0, wingRootHeight: 1.0, wingThickness: 0.25,
  elevatorSpan: 3.0,
}
// Low-wing: wings at 0.0-0.25m — Y range does NOT overlap HIGH_ELEV wings
const LOW_ELEV = {
  id: 'lelev',
  length: 8.0, wingspan: 2.0, tailHeight: 2.5,
  fuselageWidth: 1.0, wingRootHeight: 0.0, wingThickness: 0.25,
  elevatorSpan: 3.0,
}
// Same geometry but no elevator
const HIGH_NO_ELEV = {
  id: 'hnoelev',
  length: 8.0, wingspan: 2.0, tailHeight: 2.5,
  fuselageWidth: 1.0, wingRootHeight: 1.0, wingThickness: 0.25,
  elevatorSpan: 0,
}
const LOW_NO_ELEV = {
  id: 'lnoelev',
  length: 8.0, wingspan: 2.0, tailHeight: 2.5,
  fuselageWidth: 1.0, wingRootHeight: 0.0, wingThickness: 0.25,
  elevatorSpan: 0,
}
const SPECS_ELEV = [HIGH_WING, LOW_WING, TALL, HIGH_ELEV, LOW_ELEV, HIGH_NO_ELEV, LOW_NO_ELEV]

describe('elevator collisions', () => {
  it('triggers wingCollision when elevators overlap (wings small, different heights — only elevator fires)', () => {
    // a1 (high-wing) and a2 (low-wing) side-by-side at z=3:
    //   - Fuselage z-sep=3 > 2*1.4144=2.83 → no fuselage collision
    //   - Wings small (2m) at different Y → no wing collision
    //   - Elevator Y both at 1.375-1.75m, span=3m → overlap at z=3 → wingCollision fires
    const placed = [
      aircraft('a1', 'helev', 0, 0),
      aircraft('a2', 'lelev', 0, 3),
    ]
    const result = checkCollisions(placed, BUFFER, SPECS_ELEV, HANGAR, FLAT_ROOF)
    expect(result.wingCollisions.has('a1')).toBe(true)
    expect(result.wingCollisions.has('a2')).toBe(true)
    expect(result.collisions.size).toBe(0)
  })

  it('no elevator collision when aircraft are far apart', () => {
    const placed = [
      aircraft('a1', 'helev',  0, 0),
      aircraft('a2', 'lelev', 20, 0),
    ]
    const result = checkCollisions(placed, BUFFER, SPECS_ELEV, HANGAR, FLAT_ROOF)
    expect(result.wingCollisions.size).toBe(0)
    expect(result.collisions.size).toBe(0)
  })

  it('triggers hard collision when fuselage zones overlap (z=2 < buffer threshold)', () => {
    const placed = [
      aircraft('a1', 'helev', 0, 0),
      aircraft('a2', 'lelev', 0, 2),
    ]
    const result = checkCollisions(placed, BUFFER, SPECS_ELEV, HANGAR, FLAT_ROOF)
    expect(result.collisions.has('a1')).toBe(true)
    expect(result.collisions.has('a2')).toBe(true)
  })

  it('no elevator wingCollision when elevatorSpan is zero (same position as elevator test)', () => {
    // Same z=3 spacing but no elevatorSpan — no elevator check, no warning
    const placed = [
      aircraft('a1', 'hnoelev', 0, 0),
      aircraft('a2', 'lnoelev', 0, 3),
    ]
    const result = checkCollisions(placed, BUFFER, SPECS_ELEV, HANGAR, FLAT_ROOF)
    expect(result.wingCollisions.size).toBe(0)
    expect(result.collisions.size).toBe(0)
  })
})

// ─── T-hangar boundary ─────────────────────────────────────────────────────────

const T_HANGAR = { length: 19.48, width: 10.97, height: 8.53 }

// Small spec that fits comfortably inside T-hangar zones (wingspan 2m, length 4m)
const SMALL = {
  id: 'small',
  length: 4.0, wingspan: 2.0, tailHeight: 1.5,
  fuselageWidth: 0.5, wingRootHeight: 0.5, wingThickness: 0.15,
  elevatorSpan: 0,
}
const T_SPECS = [...SPECS, SMALL]

describe('T-hangar boundary violations', () => {
  it('flags aircraft in the left notch (outside T polygon)', () => {
    // Left notch: x ≈ -7 is outside stem (stemXMin = -5.07)
    const placed = [aircraft('t1', 'small', -7, 3)]
    const result = checkCollisions(placed, BUFFER, T_SPECS, T_HANGAR, FLAT_ROOF, 't-shaped')
    expect(result.boundaryViolations.has('t1')).toBe(true)
  })

  it('flags aircraft in the right notch (outside T polygon)', () => {
    // Right notch: x ≈ 8 is outside stem (stemXMax = 6.62)
    const placed = [aircraft('t2', 'small', 8, 3)]
    const result = checkCollisions(placed, BUFFER, T_SPECS, T_HANGAR, FLAT_ROOF, 't-shaped')
    expect(result.boundaryViolations.has('t2')).toBe(true)
  })

  it('does NOT flag small aircraft in the top bar', () => {
    // Top bar center — SMALL fits within the 4.34m depth
    const placed = [aircraft('t3', 'small', 0, -3)]
    const result = checkCollisions(placed, BUFFER, T_SPECS, T_HANGAR, FLAT_ROOF, 't-shaped')
    expect(result.boundaryViolations.has('t3')).toBe(false)
  })

  it('does NOT flag small aircraft in the stem', () => {
    // Stem center — well inside Rect B
    const placed = [aircraft('t4', 'small', 0, 2)]
    const result = checkCollisions(placed, BUFFER, T_SPECS, T_HANGAR, FLAT_ROOF, 't-shaped')
    expect(result.boundaryViolations.has('t4')).toBe(false)
  })
})
