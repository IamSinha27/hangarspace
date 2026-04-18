import { useMemo } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { useStore } from '../store/useStore'

const M_TO_FT = 3.28084
function toFt(m) { return (m * M_TO_FT).toFixed(0) }

function getColors(uid, selected, collisions, wingCollisions, heightViolations, boundaryViolations) {
  if (collisions.has(uid)) return { body: '#ef4444', wing: '#ef4444', edge: '#ef4444' }
  if (boundaryViolations.has(uid)) return { body: '#a855f7', wing: '#c084fc', edge: '#a855f7' }
  if (heightViolations.has(uid)) return { body: '#f97316', wing: '#f97316', edge: '#f97316' }
  if (wingCollisions.has(uid)) return { body: '#60a5fa', wing: '#f59e0b', edge: '#f59e0b' }
  if (selected === uid) return { body: '#facc15', wing: '#fde68a', edge: '#facc15' }
  return { body: '#60a5fa', wing: '#93c5fd', edge: '#334155' }
}

export default function Aircraft({ aircraft }) {
  const { uid, specId, x, z, rotation } = aircraft

  const spec = useStore(s => s.specs.find(sp => sp.id === specId))
  const buffer = useStore(s => s.buffer)
  const selected = useStore(s => s.selected)
  const collisions = useStore(s => s.collisions)
  const wingCollisions = useStore(s => s.wingCollisions)
  const heightViolations = useStore(s => s.heightViolations)
  const boundaryViolations = useStore(s => s.boundaryViolations)
  const selectAircraft = useStore(s => s.selectAircraft)
  const removeAircraft = useStore(s => s.removeAircraft)
  const setDragging = useStore(s => s.setDragging)

  const isSelected = selected === uid
  const hasCollision = collisions.has(uid)
  const hasWingCollision = wingCollisions.has(uid)
  const hasHeightViolation = heightViolations.has(uid)
  const hasBoundaryViolation = boundaryViolations.has(uid)
  const hasAnyIssue = hasCollision || hasHeightViolation || hasBoundaryViolation

  const colors = getColors(uid, selected, collisions, wingCollisions, heightViolations, boundaryViolations)

  const {
    length, wingspan, tailHeight,
    fuselageWidth, wingRootHeight, wingThickness,
    elevatorSpan = 0,
  } = spec

  // Buffer zone edges geometry (shown always as faint outline)
  const bufferEdges = useMemo(() => {
    return new THREE.EdgesGeometry(
      new THREE.BoxGeometry(length + buffer * 2, tailHeight + buffer, wingspan + buffer * 2)
    )
  }, [length, wingspan, tailHeight, buffer])

  // Wing edges
  const wingEdges = useMemo(() => {
    return new THREE.EdgesGeometry(
      new THREE.BoxGeometry(length * 0.4, wingThickness, wingspan)
    )
  }, [length, wingspan, wingThickness])

  // Fuselage edges
  const fuseEdges = useMemo(() => {
    return new THREE.EdgesGeometry(
      new THREE.BoxGeometry(length, tailHeight, fuselageWidth)
    )
  }, [length, tailHeight, fuselageWidth])

  const onPointerDown = (e) => {
    e.stopPropagation()
    selectAircraft(uid)
    setDragging(true)
  }

  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>

      {/* === FUSELAGE === */}
      <mesh position={[0, tailHeight / 2, 0]} onPointerDown={onPointerDown} castShadow>
        <boxGeometry args={[length, tailHeight, fuselageWidth]} />
        <meshStandardMaterial
          color={colors.body}
          opacity={isSelected ? 0.95 : 0.8}
          transparent
          roughness={0.3}
          metalness={0.4}
        />
      </mesh>
      <lineSegments position={[0, tailHeight / 2, 0]} geometry={fuseEdges}>
        <lineBasicMaterial color={colors.body} />
      </lineSegments>

      {/* === WINGS === */}
      <mesh
        position={[0, wingRootHeight + wingThickness / 2, 0]}
        onPointerDown={onPointerDown}
        castShadow
      >
        <boxGeometry args={[length * 0.4, wingThickness, wingspan]} />
        <meshStandardMaterial
          color={colors.wing}
          opacity={isSelected ? 0.9 : 0.75}
          transparent
          roughness={0.3}
          metalness={0.3}
        />
      </mesh>
      <lineSegments
        position={[0, wingRootHeight + wingThickness / 2, 0]}
        geometry={wingEdges}
      >
        <lineBasicMaterial color={colors.wing} />
      </lineSegments>

      {/* === TAIL — vertical stabilizer === */}
      <mesh position={[-length * 0.41, tailHeight * 0.775, 0]} onPointerDown={onPointerDown}>
        <boxGeometry args={[length * 0.18, tailHeight * 0.45, Math.max(fuselageWidth * 0.25, 0.25)]} />
        <meshStandardMaterial color={colors.body} opacity={0.95} transparent />
      </mesh>

      {/* === TAIL — horizontal stabilizer left === */}
      {elevatorSpan > 0 && (
        <mesh position={[-length * 0.41, tailHeight * 0.62, -(fuselageWidth * 0.5 + elevatorSpan * 0.25)]}>
          <boxGeometry args={[length * 0.14, Math.max(wingThickness, 0.15), elevatorSpan * 0.5]} />
          <meshStandardMaterial color={colors.wing} opacity={0.9} transparent />
        </mesh>
      )}

      {/* === TAIL — horizontal stabilizer right === */}
      {elevatorSpan > 0 && (
        <mesh position={[-length * 0.41, tailHeight * 0.62,  (fuselageWidth * 0.5 + elevatorSpan * 0.25)]}>
          <boxGeometry args={[length * 0.14, Math.max(wingThickness, 0.15), elevatorSpan * 0.5]} />
          <meshStandardMaterial color={colors.wing} opacity={0.9} transparent />
        </mesh>
      )}

      {/* === BUFFER ZONE OUTLINE (always visible, faint) === */}
      <lineSegments
        position={[0, (tailHeight + buffer) / 2, 0]}
        geometry={bufferEdges}
      >
        <lineBasicMaterial
          color={hasAnyIssue ? '#ef4444' : hasWingCollision ? '#f59e0b' : '#334155'}
          opacity={isSelected ? 0.5 : 0.2}
          transparent
        />
      </lineSegments>

      {/* === BUFFER FILL (only when selected) === */}
      {isSelected && (
        <mesh position={[0, (tailHeight + buffer) / 2, 0]}>
          <boxGeometry args={[length + buffer * 2, tailHeight + buffer, wingspan + buffer * 2]} />
          <meshStandardMaterial color="#60a5fa" opacity={0.05} transparent />
        </mesh>
      )}

      {/* === LABEL (when selected) === */}
      {isSelected && (
        <Html
          position={[0, tailHeight + 1.2, 0]}
          center
          distanceFactor={25}
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            background: 'rgba(15,23,42,0.95)',
            color: 'white',
            fontSize: '11px',
            padding: '5px 10px',
            borderRadius: '5px',
            pointerEvents: 'auto',
            border: `1px solid ${hasCollision ? '#ef4444' : hasWingCollision ? '#f59e0b' : '#3b82f6'}`,
            whiteSpace: 'nowrap',
            lineHeight: 1.6,
          }}>
            <div style={{ fontWeight: 700, fontSize: 12 }}>{spec.name}</div>
            <div style={{ color: '#94a3b8' }}>
              {toFt(length)}′L &times; {toFt(wingspan)}′W &times; {toFt(tailHeight)}′H
            </div>
            <div style={{ color: '#64748b', fontSize: 10 }}>
              {spec.wingType}-wing &middot; wing height {toFt(wingRootHeight)}′
            </div>
            {hasCollision && <div style={{ color: '#f87171', fontWeight: 700 }}>⚠ Fuselage collision</div>}
            {hasWingCollision && !hasCollision && <div style={{ color: '#fbbf24', fontWeight: 700 }}>⚠ Wing overlap</div>}
            {hasHeightViolation && <div style={{ color: '#fb923c', fontWeight: 700 }}>⚠ Height violation</div>}
            {hasBoundaryViolation && <div style={{ color: '#c084fc', fontWeight: 700 }}>⚠ Outside hangar</div>}
            <div style={{ color: '#475569', fontSize: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>R — rotate 45°</span>
              <button
                onClick={e => { e.stopPropagation(); removeAircraft(uid) }}
                style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 3, color: '#f87171', cursor: 'pointer', fontSize: 10, padding: '1px 6px' }}
              >
                Delete
              </button>
            </div>
          </div>
        </Html>
      )}

      {/* === 3D MODEL STUB (Phase 3) ===
      {spec.modelUrl && <GLBModel url={spec.modelUrl} spec={spec} />}
      */}
    </group>
  )
}
