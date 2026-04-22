import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import HangarScene from '../components/HangarScene'
import Sidebar from '../ui/Sidebar'
import StatusBar from '../ui/StatusBar'
import { useStore } from '../store/useStore'
import { fetchFleet, fetchHangar } from '../api/hangar'

export default function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const hangarId = parseInt(id)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const initFleet = useStore(s => s.initFleet)
  const setHangar = useStore(s => s.setHangar)
  const setHangarName = useStore(s => s.setHangarName)
  const setRoof = useStore(s => s.setRoof)
  const setBuffer = useStore(s => s.setBuffer)
  const setDoorWall = useStore(s => s.setDoorWall)
  const setHangarShape = useStore(s => s.setHangarShape)
  const loadPlaced = useStore(s => s.loadPlaced)

  useEffect(() => {
    initFleet([])
    loadPlaced([])

    async function load() {
      try {
        const [specs, h] = await Promise.all([fetchFleet(), fetchHangar(hangarId)])
        initFleet(specs)
        setHangarName(h.name)
        setHangar({ length: h.length_m, width: h.width_m, height: h.height_m })
        setRoof({ type: h.roof_type, peakHeight: h.roof_peak_height_m, eaveHeight: h.roof_eave_height_m })
        setBuffer(h.buffer_m)
        setDoorWall(h.door_wall ?? 'south')
        setHangarShape(h.shape ?? 'rectangular')
        loadPlaced(h.placed_aircraft)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [hangarId])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#020617', color: '#60a5fa' }}>
      Loading hangar...
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#020617', color: '#ef4444', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 20, fontWeight: 700 }}>Failed to load hangar</div>
      <div style={{ fontSize: 13, color: '#94a3b8' }}>{error}</div>
      <button onClick={() => navigate('/dashboard')} style={{ marginTop: 8, background: '#1e293b', border: 'none', borderRadius: 6, color: '#e2e8f0', padding: '8px 16px', cursor: 'pointer' }}>
        Back to Dashboard
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', background: '#020617', overflow: 'hidden' }}>
      <StatusBar onBack={() => navigate('/dashboard')} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar hangarId={hangarId} onHangarDeleted={() => navigate('/dashboard')} />
        <div style={{ flex: 1, position: 'relative' }}>
          <HangarScene />
          {/* Vignette — purely CSS, zero GPU cost */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center, transparent 55%, rgba(2,6,23,0.75) 100%)',
          }} />
        </div>
      </div>
    </div>
  )
}
