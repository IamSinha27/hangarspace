import { useCallback, useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei'
import Hangar from './Hangar'
import Aircraft from './Aircraft'
import { useStore } from '../store/useStore'

const _dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const _dragTarget = new THREE.Vector3()

function Scene() {
  const placedAircraft = useStore(s => s.placedAircraft)
  const selected = useStore(s => s.selected)
  const dragging = useStore(s => s.dragging)
  const locked = useStore(s => s.locked)
  const moveAircraft = useStore(s => s.moveAircraft)
  const rotateAircraft = useStore(s => s.rotateAircraft)
  const removeAircraft = useStore(s => s.removeAircraft)
  const copyAircraft = useStore(s => s.copyAircraft)
  const pasteAircraft = useStore(s => s.pasteAircraft)
  const selectAircraft = useStore(s => s.selectAircraft)
  const setDragging = useStore(s => s.setDragging)

  const { camera, raycaster, gl } = useThree()
  const dragOffset = useRef({ x: 0, z: 0 })

  // Canvas-level drag: intersect mouse ray with Y=0 plane directly.
  // This bypasses all Three.js geometry raycasting, fixing jitter at any
  // camera angle (especially top-down, where aircraft meshes blocked the floor).
  useEffect(() => {
    if (!dragging) return

    const canvas = gl.domElement

    const onMove = (e) => {
      const sel = useStore.getState().selected
      if (!sel) return
      const rect = canvas.getBoundingClientRect()
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera)
      if (raycaster.ray.intersectPlane(_dragPlane, _dragTarget)) {
        moveAircraft(sel, _dragTarget.x - dragOffset.current.x, _dragTarget.z - dragOffset.current.z)
      }
    }

    const onUp = () => setDragging(false)

    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    return () => {
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
    }
  }, [dragging, camera, raycaster, gl.domElement, moveAircraft, setDragging])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (locked) return
      const cmd = e.metaKey || e.ctrlKey
      if (cmd && e.key === 'c' && selected) { copyAircraft(selected); return }
      if (cmd && e.key === 'v') { pasteAircraft(); return }
      if (e.key === 'Escape') { selectAircraft(null); return }
      if (!selected) return
      if (e.key === 'r' || e.key === 'R') rotateAircraft(selected)
      if (e.key === 'Delete' || e.key === 'Backspace') removeAircraft(selected)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, locked, rotateAircraft, removeAircraft, copyAircraft, pasteAircraft, selectAircraft])

  return (
    <>
      <color attach="background" args={['#0e0e0e']} />
      <fog attach="fog" args={['#0e0e0e', 60, 130]} />

      <ambientLight intensity={0.4} />
      <hemisphereLight args={['#ffffff', '#111111', 0.5]} />
      <directionalLight position={[20, 15, 10]} intensity={0.9} />
      <directionalLight position={[-15, 10, -15]} intensity={0.3} />

      {/* Environment map — gives metallic surfaces realistic reflections, zero perf cost */}
      <Environment preset="night" />

      <Hangar />

      {/* Soft contact shadows under aircraft — cheaper than shadow maps */}
      <ContactShadows
        position={[0, 0.02, 0]}
        opacity={0.5}
        scale={80}
        blur={2}
        far={10}
        resolution={512}
      />

      {placedAircraft.map(a => (
        <Aircraft key={a.uid} aircraft={a} dragOffset={dragOffset} />
      ))}

      <OrbitControls
        enabled={!dragging}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 2, 0]}
        makeDefault
      />
    </>
  )
}

export default function HangarScene() {
  return (
    <Canvas
      camera={{ position: [40, 30, 40], fov: 50 }}
      gl={{ antialias: true }}
      style={{ display: 'block', width: '100%', height: '100%' }}
      onPointerMissed={() => useStore.getState().selectAircraft(null)}
    >
      <Scene />
    </Canvas>
  )
}
