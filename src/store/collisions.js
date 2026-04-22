// Pure collision detection logic — no React/Zustand dependencies.
// Exported for both the store and unit tests.

// --- 2D SAT (Separating Axis Theorem) for rotated rectangles on the XZ plane ---
// Returns true if the two OBBs overlap.
// (cx, cz) = center, hL = half-length, hW = half-width, rot = rotation in radians
export function satOBB(cx1, cz1, hL1, hW1, rot1, cx2, cz2, hL2, hW2, rot2) {
  const cos1 = Math.cos(rot1), sin1 = Math.sin(rot1)
  const cos2 = Math.cos(rot2), sin2 = Math.sin(rot2)

  // 4 candidate separating axes (2 local axes per rectangle)
  const axes = [
    [cos1, sin1],
    [-sin1, cos1],
    [cos2, sin2],
    [-sin2, cos2],
  ]

  const dx = cx2 - cx1
  const dz = cz2 - cz1

  for (const [ax, az] of axes) {
    const separation = Math.abs(dx * ax + dz * az)
    const proj1 = Math.abs(hL1 * cos1 * ax + hL1 * sin1 * az) +
                  Math.abs(hW1 * (-sin1) * ax + hW1 * cos1 * az)
    const proj2 = Math.abs(hL2 * cos2 * ax + hL2 * sin2 * az) +
                  Math.abs(hW2 * (-sin2) * ax + hW2 * cos2 * az)
    if (separation > proj1 + proj2) return false // separating axis found → no overlap
  }
  return true // no separating axis → overlap
}

// True if the two 1D ranges (minA..maxA) and (minB..maxB) strictly overlap
export function yRangesOverlap(minA, maxA, minB, maxB) {
  return minA < maxB && minB < maxA
}

// Returns the world-axis-aligned half-extents of a rectangle after rotation.
// Used for boundary checks — gives the AABB of the rotated OBB.
export function rotatedExtents(hL, hW, rot) {
  const c = Math.abs(Math.cos(rot))
  const s = Math.abs(Math.sin(rot))
  return {
    x: hL * c + hW * s,
    z: hL * s + hW * c,
  }
}

// T-hangar fixed blueprint dimensions (Big T Hangar)
const T_HL = 9.74        // half outer length (63'11")
const T_HW = 5.485       // half outer width  (36'0")
const T_Z_INNER = -1.145 // z where top bar meets stem (-hW + 14'3")
const T_STEM_X_MIN = -5.07  // stem left edge  (-hL + 15'4")
const T_STEM_X_MAX = 6.62   // stem right edge (+hL - 10'3")

// Returns true if the aircraft OBB (all 4 corners) fits inside the T-hangar polygon,
// with each outer wall shrunken inward by `buffer`.
export function isInsideTHangar(ax, az, hL, hW, rot, buffer) {
  const cos = Math.cos(rot), sin = Math.sin(rot)
  const corners = [
    [ax + hL * cos - hW * sin, az + hL * sin + hW * cos],
    [ax + hL * cos + hW * sin, az + hL * sin - hW * cos],
    [ax - hL * cos - hW * sin, az - hL * sin + hW * cos],
    [ax - hL * cos + hW * sin, az - hL * sin - hW * cos],
  ]
  // Two rectangles forming the T, each outer wall shrunk by buffer
  const A = { xMin: -T_HL + buffer, xMax: T_HL - buffer, zMin: -T_HW + buffer, zMax: T_Z_INNER }
  const B = { xMin: T_STEM_X_MIN + buffer, xMax: T_STEM_X_MAX - buffer, zMin: T_Z_INNER, zMax: T_HW - buffer }
  return corners.every(([cx, cz]) =>
    (cx >= A.xMin && cx <= A.xMax && cz >= A.zMin && cz <= A.zMax) ||
    (cx >= B.xMin && cx <= B.xMax && cz >= B.zMin && cz <= B.zMax)
  )
}

// Returns the ceiling height (meters) at a given XZ position based on roof profile.
// Swap this function's internals when LiDAR heightmap is available — callers unchanged.
export function getCeilingHeight(x, z, roof, hangar) {
  if (!roof || roof.type === 'flat') return roof ? roof.peakHeight : hangar.height

  // t = 1 at center (z=0), 0 at side walls
  const t = 1 - Math.abs(z) / (hangar.width / 2)
  const rise = roof.peakHeight - roof.eaveHeight

  if (roof.type === 'gabled') {
    return roof.eaveHeight + rise * t
  }
  if (roof.type === 'arched') {
    return roof.eaveHeight + rise * Math.sin(t * Math.PI / 2)
  }
  // Future: roof.type === 'lidar' → sampleHeightmap(roof.heightmap, x, z)
  return roof.peakHeight
}

// World-space center of an aircraft's elevator (horizontal stabilizer pair),
// offset to the rear of the aircraft in local X, then rotated into world space.
function elevCenter(ax, az, length, rot) {
  const offset = length * 0.41
  return {
    x: ax - offset * Math.cos(rot),
    z: az - offset * Math.sin(rot),
  }
}

// Main collision check — runs every time aircraft move.
// Returns four Sets: collisions, wingCollisions, heightViolations, boundaryViolations.
export function checkCollisions(placedAircraft, buffer, specs, hangar, roof, hangarShape = 'rectangular') {
  const collisions = new Set()
  const wingCollisions = new Set()
  const heightViolations = new Set()
  const boundaryViolations = new Set()

  const hHalfL = hangar.length / 2
  const hHalfW = hangar.width / 2

  for (let i = 0; i < placedAircraft.length; i++) {
    const a = placedAircraft[i]
    const sA = specs.find(s => s.id === a.specId)
    if (!sA) continue
    const rotA = a.rotation || 0

    // Height check: tail must clear local ceiling (position-aware) minus buffer
    const localCeiling = getCeilingHeight(a.x, a.z, roof, hangar)
    if (sA.tailHeight > localCeiling - buffer) {
      heightViolations.add(a.uid)
    }

    // Boundary check
    if (hangarShape === 't-shaped') {
      if (!isInsideTHangar(a.x, a.z, sA.length / 2, sA.wingspan / 2, rotA, buffer)) {
        boundaryViolations.add(a.uid)
      }
    } else {
      const ext = rotatedExtents(sA.length / 2, sA.wingspan / 2, rotA)
      if (
        a.x - ext.x < -hHalfL ||
        a.x + ext.x >  hHalfL ||
        a.z - ext.z < -hHalfW ||
        a.z + ext.z >  hHalfW
      ) {
        boundaryViolations.add(a.uid)
      }
    }

    for (let j = i + 1; j < placedAircraft.length; j++) {
      const b = placedAircraft[j]
      const sB = specs.find(s => s.id === b.specId)
      if (!sB) continue
      const rotB = b.rotation || 0

      // Wing chord half-length matches visual (40% of fuselage length → 20% each side)
      const aWingHL = sA.length * 0.2
      const bWingHL = sB.length * 0.2

      // Vertical ranges for each component
      const aFuseTop = sA.tailHeight
      const bFuseTop = sB.tailHeight
      const aWingBottom = sA.wingRootHeight
      const aWingTop    = sA.wingRootHeight + sA.wingThickness
      const bWingBottom = sB.wingRootHeight
      const bWingTop    = sB.wingRootHeight + sB.wingThickness

      // 1. Fuselage vs Fuselage — always check, buffer on both sides
      const fuseCollide = satOBB(
        a.x, a.z, sA.length / 2 + buffer, sA.fuselageWidth / 2 + buffer, rotA,
        b.x, b.z, sB.length / 2 + buffer, sB.fuselageWidth / 2 + buffer, rotB
      )
      if (fuseCollide) {
        collisions.add(a.uid)
        collisions.add(b.uid)
      }

      // 2. Wing A vs Wing B — only if wings are at the same height
      if (yRangesOverlap(aWingBottom, aWingTop, bWingBottom, bWingTop)) {
        const wingWingCollide = satOBB(
          a.x, a.z, aWingHL + buffer, sA.wingspan / 2 + buffer, rotA,
          b.x, b.z, bWingHL + buffer, sB.wingspan / 2 + buffer, rotB
        )
        if (wingWingCollide && !fuseCollide) {
          wingCollisions.add(a.uid)
          wingCollisions.add(b.uid)
        }
      }
      // Wings at different Y heights pass over/under → no warning

      // 3. Wing A vs Fuselage B
      // Wing uses actual dimensions (no buffer) — the fuselage's buffer zone is what matters.
      if (!collisions.has(a.uid) && !collisions.has(b.uid) &&
          yRangesOverlap(aWingBottom, aWingTop, 0, bFuseTop)) {
        const wingFuseCollide = satOBB(
          a.x, a.z, aWingHL, sA.wingspan / 2, rotA,
          b.x, b.z, sB.length / 2 + buffer, sB.fuselageWidth / 2 + buffer, rotB
        )
        if (wingFuseCollide) {
          collisions.add(a.uid)
          collisions.add(b.uid)
        }
      }

      // 4. Fuselage A vs Wing B
      if (!collisions.has(a.uid) && !collisions.has(b.uid) &&
          yRangesOverlap(0, aFuseTop, bWingBottom, bWingTop)) {
        const fuseWingCollide = satOBB(
          a.x, a.z, sA.length / 2 + buffer, sA.fuselageWidth / 2 + buffer, rotA,
          b.x, b.z, bWingHL, sB.wingspan / 2, rotB
        )
        if (fuseWingCollide) {
          collisions.add(a.uid)
          collisions.add(b.uid)
        }
      }

      // --- Elevator checks ---
      const aElevSpan = sA.elevatorSpan ?? 0
      const bElevSpan = sB.elevatorSpan ?? 0
      if (aElevSpan > 0 || bElevSpan > 0) {
        const aElevHalfSpan  = aElevSpan / 2
        const bElevHalfSpan  = bElevSpan / 2
        const aElevHalfChord = sA.length * 0.07
        const bElevHalfChord = sB.length * 0.07
        // Elevators sit at roughly 55-70% of tail height
        const aElevBottom = sA.tailHeight * 0.55
        const aElevTop    = sA.tailHeight * 0.70
        const bElevBottom = sB.tailHeight * 0.55
        const bElevTop    = sB.tailHeight * 0.70
        const aElev = elevCenter(a.x, a.z, sA.length, rotA)
        const bElev = elevCenter(b.x, b.z, sB.length, rotB)

        // 5. Elevator A vs Elevator B
        if (aElevSpan > 0 && bElevSpan > 0 &&
            !collisions.has(a.uid) && !collisions.has(b.uid) &&
            yRangesOverlap(aElevBottom, aElevTop, bElevBottom, bElevTop)) {
          const ee = satOBB(
            aElev.x, aElev.z, aElevHalfChord + buffer, aElevHalfSpan + buffer, rotA,
            bElev.x, bElev.z, bElevHalfChord + buffer, bElevHalfSpan + buffer, rotB
          )
          if (ee) { wingCollisions.add(a.uid); wingCollisions.add(b.uid) }
        }

        // 6. Elevator A vs Wing B
        if (aElevSpan > 0 && bWingTop > bWingBottom &&
            !collisions.has(a.uid) && !collisions.has(b.uid) &&
            yRangesOverlap(aElevBottom, aElevTop, bWingBottom, bWingTop)) {
          const ew = satOBB(
            aElev.x, aElev.z, aElevHalfChord, aElevHalfSpan, rotA,
            b.x, b.z, bWingHL + buffer, sB.wingspan / 2 + buffer, rotB
          )
          if (ew) { wingCollisions.add(a.uid); wingCollisions.add(b.uid) }
        }

        // 7. Wing A vs Elevator B
        if (bElevSpan > 0 && aWingTop > aWingBottom &&
            !collisions.has(a.uid) && !collisions.has(b.uid) &&
            yRangesOverlap(aWingBottom, aWingTop, bElevBottom, bElevTop)) {
          const we = satOBB(
            a.x, a.z, aWingHL + buffer, sA.wingspan / 2 + buffer, rotA,
            bElev.x, bElev.z, bElevHalfChord, bElevHalfSpan, rotB
          )
          if (we) { wingCollisions.add(a.uid); wingCollisions.add(b.uid) }
        }

        // 8. Elevator A vs Fuselage B
        if (aElevSpan > 0 &&
            !collisions.has(a.uid) && !collisions.has(b.uid) &&
            yRangesOverlap(aElevBottom, aElevTop, 0, bFuseTop)) {
          const ef = satOBB(
            aElev.x, aElev.z, aElevHalfChord, aElevHalfSpan, rotA,
            b.x, b.z, sB.length / 2 + buffer, sB.fuselageWidth / 2 + buffer, rotB
          )
          if (ef) { collisions.add(a.uid); collisions.add(b.uid) }
        }

        // 9. Fuselage A vs Elevator B
        if (bElevSpan > 0 &&
            !collisions.has(a.uid) && !collisions.has(b.uid) &&
            yRangesOverlap(0, aFuseTop, bElevBottom, bElevTop)) {
          const fe = satOBB(
            a.x, a.z, sA.length / 2 + buffer, sA.fuselageWidth / 2 + buffer, rotA,
            bElev.x, bElev.z, bElevHalfChord, bElevHalfSpan, rotB
          )
          if (fe) { collisions.add(a.uid); collisions.add(b.uid) }
        }
      }
    }
  }

  return { collisions, wingCollisions, heightViolations, boundaryViolations }
}
