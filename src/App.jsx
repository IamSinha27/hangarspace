import { useEffect } from 'react'
import HangarScene from './components/HangarScene'
import Sidebar from './ui/Sidebar'
import StatusBar from './ui/StatusBar'
import { useStore } from './store/useStore'
import { loadFleetFromExcel } from './data/parseFleet'

function FleetLoader({ children }) {
  const fleetReady = useStore(s => s.fleetReady)
  const fleetError = useStore(s => s.fleetError)
  const initFleet  = useStore(s => s.initFleet)
  const setFleetError = useStore(s => s.setFleetError)

  useEffect(() => {
    loadFleetFromExcel('/fleet.xlsx')
      .then(specs => initFleet(specs))
      .catch(err => setFleetError(err.message))
  }, [])

  if (fleetError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#020617', color: '#ef4444', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Failed to load fleet</div>
        <div style={{ fontSize: 13, color: '#94a3b8' }}>{fleetError}</div>
      </div>
    )
  }

  if (!fleetReady) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#020617', color: '#60a5fa', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 16 }}>Loading fleet data...</div>
      </div>
    )
  }

  return children
}

export default function App() {
  return (
    <FleetLoader>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', background: '#020617', overflow: 'hidden' }}>
        <StatusBar />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Sidebar />
          <div style={{ flex: 1, position: 'relative' }}>
            <HangarScene />
          </div>
        </div>
      </div>
    </FleetLoader>
  )
}
