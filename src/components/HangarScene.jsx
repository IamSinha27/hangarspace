import { useCallback, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Hangar from './Hangar'
import Aircraft from './Aircraft'
import FloorPlane from './FloorPlane'
import { useStore } from '../store/useStore'

function Scene() {
  const placedAircraft = useStore(s => s.placedAircraft)
  const selected = useStore(s => s.selected)
  const dragging = useStore(s => s.dragging)
  const moveAircraft = useStore(s => s.moveAircraft)
  const rotateAircraft = useStore(s => s.rotateAircraft)
  const removeAircraft = useStore(s => s.removeAircraft)
  const copyAircraft = useStore(s => s.copyAircraft)
  const pasteAircraft = useStore(s => s.pasteAircraft)
  const setDragging = useStore(s => s.setDragging)

  const handleMove = useCallback((x, z) => {
    if (selected) moveAircraft(selected, x, z)
  }, [selected, moveAircraft])

  const handleUp = useCallback(() => {
    setDragging(false)
  }, [setDragging])

  // Keyboard shortcuts for selected aircraft
  useEffect(() => {
    const onKey = (e) => {
      const cmd = e.metaKey || e.ctrlKey
      if (cmd && e.key === 'c' && selected) { copyAircraft(selected); return }
      if (cmd && e.key === 'v') { pasteAircraft(); return }
      if (!selected) return
      if (e.key === 'r' || e.key === 'R') rotateAircraft(selected)
      if (e.key === 'Delete' || e.key === 'Backspace') removeAircraft(selected)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, rotateAircraft, removeAircraft, copyAircraft, pasteAircraft])

  return (
    <>
      <color attach="background" args={['#020617']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[20, 30, 20]} intensity={1.2} castShadow />
      <directionalLight position={[-20, 10, -20]} intensity={0.4} />

      <Hangar />

      {placedAircraft.map(a => (
        <Aircraft key={a.uid} aircraft={a} />
      ))}

      <FloorPlane onMove={handleMove} onUp={handleUp} />

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
      shadows
      camera={{ position: [40, 30, 40], fov: 50 }}
      gl={{ antialias: true }}
      style={{ display: 'block', width: '100%', height: '100%' }}
      onPointerMissed={() => useStore.getState().selectAircraft(null)}
    >
      <Scene />
    </Canvas>
  )
}
