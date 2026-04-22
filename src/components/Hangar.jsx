import * as THREE from 'three'
import { useMemo } from 'react'
import { Html, Grid } from '@react-three/drei'
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

const DOOR_STRIP = 1.2 // meters wide

function doorStripProps(wall, length, width) {
  const hL = length / 2, hW = width / 2
  switch (wall) {
    case 'north': return { position: [-hL + DOOR_STRIP / 2, 0.01, 0], args: [DOOR_STRIP, width] }
    case 'east':  return { position: [0, 0.01,  hW - DOOR_STRIP / 2], args: [length, DOOR_STRIP] }
    case 'west':  return { position: [0, 0.01, -hW + DOOR_STRIP / 2], args: [length, DOOR_STRIP] }
    default:      return { position: [ hL - DOOR_STRIP / 2, 0.01, 0], args: [DOOR_STRIP, width] } // south
  }
}

// ─── Big T Hangar ─────────────────────────────────────────────────────────────
const T_DOOR_WIDTH = 12.776  // 41′11″ per blueprint
const T_DOOR_CX    = -9.74 + T_DOOR_WIDTH / 2  // starts at west wall → center at -3.352m

const T = {
  hL: 9.74, hW: 5.485, zInner: -1.145,
  stemXMin: -5.07, stemXMax: 6.62,
  outerLen: 19.48, outerWid: 10.97,
  topBarDepth: 4.34, stemWidth: 11.69, stemDepth: 6.63,
  stemCX: 0.775, topBarCZ: -3.315, stemCZ: 2.17,
}

function TWallFill({ x, z, w, d, wallHeight }) {
  return (
    <mesh position={[x, wallHeight / 2, z]}>
      <boxGeometry args={[w, wallHeight, d]} />
      <meshStandardMaterial color="#1a1a1a" opacity={0.08} transparent side={THREE.BackSide} />
    </mesh>
  )
}

function TWallEdge({ x, z, w, d, wallHeight }) {
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(w, wallHeight, d)), [w, d, wallHeight])
  return (
    <lineSegments position={[x, wallHeight / 2, z]} geometry={geo}>
      <lineBasicMaterial color="#555555" opacity={0.7} transparent />
    </lineSegments>
  )
}

function THangar({ wallHeight }) {
  const doorWall = useStore(s => s.doorWall)
  const walls = [
    // [cx, cz, width, depth]
    [0,          -T.hW,      T.outerLen,   0.2],  // south wall (door)
    [T.hL,       T.topBarCZ, 0.2,          T.topBarDepth], // right outer
    [8.18,       T.zInner,   3.12,         0.2],  // right step
    [T.stemXMax, T.stemCZ,   0.2,          T.stemDepth],   // right stem
    [T.stemCX,   T.hW,       T.stemWidth,  0.2],  // north wall
    [T.stemXMin, T.stemCZ,   0.2,          T.stemDepth],   // left stem
    [-7.405,     T.zInner,   4.67,         0.2],  // left step
    [-T.hL,      T.topBarCZ, 0.2,          T.topBarDepth], // left outer
  ]

  return (
    <group>
      {/* Floor — top bar */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, T.topBarCZ]} receiveShadow>
        <planeGeometry args={[T.outerLen, T.topBarDepth]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      {/* Floor — stem */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[T.stemCX, 0, T.stemCZ]} receiveShadow>
        <planeGeometry args={[T.stemWidth, T.stemDepth]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>

      {/* Grid — top bar */}
      <Grid position={[0, 0.01, T.topBarCZ]} args={[T.outerLen, T.topBarDepth]}
        cellSize={1} cellThickness={0.4} cellColor="#242424"
        sectionSize={5} sectionThickness={0.8} sectionColor="#3d3d3d"
        fadeDistance={80} fadeStrength={1} infiniteGrid={false} />
      {/* Grid — stem */}
      <Grid position={[T.stemCX, 0.01, T.stemCZ]} args={[T.stemWidth, T.stemDepth]}
        cellSize={1} cellThickness={0.4} cellColor="#242424"
        sectionSize={5} sectionThickness={0.8} sectionColor="#3d3d3d"
        fadeDistance={80} fadeStrength={1} infiniteGrid={false} />

      {/* Door strip — south wall: 41′11″ wide, flush with west wall per blueprint */}
      <mesh position={[T_DOOR_CX, 0.01, -T.hW]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[T_DOOR_WIDTH, 1.2]} />
        <meshStandardMaterial color="#22c55e" opacity={0.35} transparent emissive="#22c55e" emissiveIntensity={0.4} />
      </mesh>

      {/* Walls */}
      {walls.map(([x, z, w, d], i) => (
        <group key={i}>
          <TWallFill x={x} z={z} w={w} d={d} wallHeight={wallHeight} />
          <TWallEdge x={x} z={z} w={w} d={d} wallHeight={wallHeight} />
        </group>
      ))}

      {/* Ceiling lights */}
      {[-3, 0, 3].map((ox, i) => (
        <mesh key={`tl-${i}`} position={[ox, wallHeight - 0.05, T.topBarCZ]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[T.outerLen * 0.15, T.topBarDepth * 0.1]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[T.stemCX, wallHeight - 0.05, T.stemCZ]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[T.stemWidth * 0.3, T.stemDepth * 0.08]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} toneMapped={false} />
      </mesh>

      {/* Compass labels */}
      {[
        { label: 'S', pos: [0,       0.5, -T.hW - 2],     door: true },
        { label: 'N', pos: [T.stemCX, 0.5,  T.hW + 2],    door: false },
        { label: 'E', pos: [T.hL + 2, 0.5,  T.topBarCZ],  door: false },
        { label: 'W', pos: [-T.hL - 2, 0.5, T.topBarCZ],  door: false },
      ].map(({ label, pos, door }) => (
        <Html key={label} position={pos} center style={{ pointerEvents: 'none' }}>
          <div style={{ color: door ? '#22c55e' : '#334155', fontWeight: 700, fontSize: 13, fontFamily: 'monospace', userSelect: 'none' }}>
            {label}{door ? ' ⬆' : ''}
          </div>
        </Html>
      ))}
    </group>
  )
}

export default function Hangar() {
  const { length, width } = useStore(s => s.hangar)
  const roof = useStore(s => s.roof)
  const doorWall = useStore(s => s.doorWall)
  const hangarShape = useStore(s => s.hangarShape)

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

  if (hangarShape === 't-shaped') {
    return <THangar wallHeight={wallHeight} />
  }

  return (
    <group>
      {/* Floor base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[length, width]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>

      {/* Floor grid overlay */}
      <Grid
        position={[0, 0.01, 0]}
        args={[length, width]}
        cellSize={1}
        cellThickness={0.4}
        cellColor="#242424"
        sectionSize={5}
        sectionThickness={0.8}
        sectionColor="#3d3d3d"
        fadeDistance={80}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {/* Door indicator — green strip along the entrance wall */}
      {(() => {
        const { position, args } = doorStripProps(doorWall, length, width)
        return (
          <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={args} />
            <meshStandardMaterial color="#22c55e" opacity={0.35} transparent emissive="#22c55e" emissiveIntensity={0.4} />
          </mesh>
        )
      })()}

      {/* Walls — transparent fill */}
      <mesh position={[0, wallHeight / 2, 0]}>
        <boxGeometry args={[length, wallHeight, width]} />
        <meshStandardMaterial color="#1a1a1a" opacity={0.08} transparent side={THREE.BackSide} />
      </mesh>

      {/* Walls — wireframe edges */}
      <lineSegments position={[0, wallHeight / 2, 0]} geometry={wallEdges}>
        <lineBasicMaterial color="#555555" opacity={0.7} transparent />
      </lineSegments>

      {/* Roof surface — fill */}
      {roofGeo && (
        <mesh geometry={roofGeo} side={THREE.DoubleSide}>
          <meshStandardMaterial color="#1a1a1a" opacity={0.08} transparent />
        </mesh>
      )}

      {/* Roof surface — wireframe edges */}
      {roofEdges && (
        <lineSegments geometry={roofEdges}>
          <lineBasicMaterial color="#555555" opacity={0.5} transparent />
        </lineSegments>
      )}

      {/* Ceiling light strips — emissive fluorescent bars */}
      {[-0.3, 0, 0.3].map((offset, i) => (
        <mesh key={i} position={[length * offset, wallHeight - 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[length * 0.15, width * 0.04]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} toneMapped={false} />
        </mesh>
      ))}

      {/* Compass labels — N/S/E/W just outside each wall */}
      {[
        { label: 'S', pos: [ length / 2 + 2, 0.5, 0], door: doorWall === 'south' },
        { label: 'N', pos: [-length / 2 - 2, 0.5, 0], door: doorWall === 'north' },
        { label: 'E', pos: [0, 0.5,  width / 2 + 2],  door: doorWall === 'east'  },
        { label: 'W', pos: [0, 0.5, -width / 2 - 2],  door: doorWall === 'west'  },
      ].map(({ label, pos, door }) => (
        <Html key={label} position={pos} center style={{ pointerEvents: 'none' }}>
          <div style={{
            color: door ? '#22c55e' : '#334155',
            fontWeight: 700,
            fontSize: 13,
            fontFamily: 'monospace',
            userSelect: 'none',
          }}>
            {label}{door ? ' ⬆' : ''}
          </div>
        </Html>
      ))}
    </group>
  )
}
