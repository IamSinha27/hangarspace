import * as THREE from 'three'
import { useMemo } from 'react'
import { useStore } from '../store/useStore'

// Build roof geometry based on profile type
function useRoofGeometry(length, width, peakHeight, eaveHeight, type) {
  return useMemo(() => {
    if (type === 'flat') {
      // Simple flat top — part of the existing box, no extra geometry needed
      return null
    }

    if (type === 'gabled') {
      // Two slanted rectangular panels meeting at the ridge (center, running along X)
      // Each panel: from (x=-L/2 to L/2, z=0 at peak) down to (z=±W/2 at eave)
      const geom = new THREE.BufferGeometry()
      const hL = length / 2
      const hW = width / 2

      // Left panel (z: 0 → -W/2), Right panel (z: 0 → +W/2)
      // vertices: 4 per panel, 2 panels = 8 vertices, 4 triangles = 12 indices
      const verts = new Float32Array([
        // Left panel
        -hL, peakHeight,  0,
         hL, peakHeight,  0,
         hL, eaveHeight, -hW,
        -hL, eaveHeight, -hW,
        // Right panel
        -hL, peakHeight,  0,
         hL, peakHeight,  0,
         hL, eaveHeight,  hW,
        -hL, eaveHeight,  hW,
      ])
      const idx = new Uint16Array([
        0,2,1, 0,3,2,   // left panel
        4,5,6, 4,6,7,   // right panel
      ])
      geom.setAttribute('position', new THREE.BufferAttribute(verts, 3))
      geom.setIndex(new THREE.BufferAttribute(idx, 1))
      geom.computeVertexNormals()
      return geom
    }

    if (type === 'arched') {
      // Curved roof: cylindrical arc along Z axis, extruded along X
      const segments = 32
      const hL = length / 2
      const hW = width / 2
      const rise = peakHeight - eaveHeight

      const positions = []
      const indices = []

      for (let i = 0; i <= segments; i++) {
        const t = i / segments                         // 0 → 1
        const z = -hW + t * width                     // -W/2 → +W/2
        const tNorm = 1 - Math.abs((t - 0.5) * 2)    // 1 at center, 0 at edges
        const y = eaveHeight + rise * Math.sin(tNorm * Math.PI / 2)

        positions.push(-hL, y, z)
        positions.push( hL, y, z)
      }

      for (let i = 0; i < segments; i++) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3
        indices.push(a, b, d, a, d, c)
      }

      const geom = new THREE.BufferGeometry()
      geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
      geom.setIndex(indices)
      geom.computeVertexNormals()
      return geom
    }

    return null
  }, [length, width, peakHeight, eaveHeight, type])
}

export default function Hangar() {
  const { length, width } = useStore(s => s.hangar)
  const roof = useStore(s => s.roof)

  const { type, peakHeight, eaveHeight } = roof
  const wallHeight = type === 'flat' ? peakHeight : eaveHeight

  const roofGeo = useRoofGeometry(length, width, peakHeight, eaveHeight, type)

  // Edges of the wall box (up to eave/flat height)
  const wallEdges = useMemo(() => {
    return new THREE.EdgesGeometry(new THREE.BoxGeometry(length, wallHeight, width))
  }, [length, width, wallHeight])

  // Edges of the roof surface for wireframe
  const roofEdges = useMemo(() => {
    return roofGeo ? new THREE.EdgesGeometry(roofGeo) : null
  }, [roofGeo])

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[length, width]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* Walls — transparent fill */}
      <mesh position={[0, wallHeight / 2, 0]}>
        <boxGeometry args={[length, wallHeight, width]} />
        <meshStandardMaterial color="#1e3a5f" opacity={0.06} transparent side={THREE.BackSide} />
      </mesh>

      {/* Walls — wireframe edges */}
      <lineSegments position={[0, wallHeight / 2, 0]} geometry={wallEdges}>
        <lineBasicMaterial color="#3b82f6" opacity={0.6} transparent />
      </lineSegments>

      {/* Roof surface — fill */}
      {roofGeo && (
        <mesh geometry={roofGeo} side={THREE.DoubleSide}>
          <meshStandardMaterial color="#1e3a5f" opacity={0.08} transparent />
        </mesh>
      )}

      {/* Roof surface — wireframe edges */}
      {roofEdges && (
        <lineSegments geometry={roofEdges}>
          <lineBasicMaterial color="#3b82f6" opacity={0.5} transparent />
        </lineSegments>
      )}
    </group>
  )
}
