import { useRef } from 'react'
import { useStore } from '../store/useStore'

// Invisible large plane that captures pointer events for dragging
export default function FloorPlane({ onMove, onUp }) {
  const ref = useRef()
  const dragging = useStore(s => s.dragging)

  if (!dragging) return null

  return (
    <mesh
      ref={ref}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.001, 0]}
      onPointerMove={e => {
        e.stopPropagation()
        onMove(e.point.x, e.point.z)
      }}
      onPointerUp={e => {
        e.stopPropagation()
        onUp()
      }}
    >
      <planeGeometry args={[1000, 1000]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  )
}
