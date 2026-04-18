import { useStore } from '../store/useStore'
import { useState } from 'react'

export default function StatusBar() {
  const [showConfirm, setShowConfirm] = useState(false)
  const clearHangar = useStore(s => s.clearHangar)
  const placedAircraft = useStore(s => s.placedAircraft)
  const collisions = useStore(s => s.collisions)
  const wingCollisions = useStore(s => s.wingCollisions)
  const heightViolations = useStore(s => s.heightViolations)
  const boundaryViolations = useStore(s => s.boundaryViolations)
  const dragging = useStore(s => s.dragging)

  const hasHardIssues = collisions.size > 0 || heightViolations.size > 0 || boundaryViolations.size > 0
  const hasWingIssues = wingCollisions.size > 0

  return (
    <div style={{
      height: 36,
      background: hasHardIssues ? '#450a0a' : hasWingIssues ? '#431407' : '#0a1628',
      borderBottom: `1px solid ${hasHardIssues ? '#7f1d1d' : hasWingIssues ? '#7c2d12' : '#1e3a5f'}`,
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 20,
      fontSize: 12,
      flexShrink: 0,
    }}>
      <span style={{ color: '#60a5fa', fontWeight: 600 }}>
        {placedAircraft.length} aircraft
      </span>

      {collisions.size > 0 && (
        <span style={{ color: '#ef4444', fontWeight: 600 }}>
          ⚠ {collisions.size} fuselage collision{collisions.size !== 1 ? 's' : ''}
        </span>
      )}

      {wingCollisions.size > 0 && (
        <span style={{ color: '#f59e0b', fontWeight: 600 }}>
          ⚠ {wingCollisions.size} wing overlap{wingCollisions.size !== 1 ? 's' : ''}
        </span>
      )}

      {heightViolations.size > 0 && (
        <span style={{ color: '#f97316', fontWeight: 600 }}>
          ⚠ {heightViolations.size} height violation{heightViolations.size !== 1 ? 's' : ''}
        </span>
      )}

      {boundaryViolations.size > 0 && (
        <span style={{ color: '#a855f7', fontWeight: 600 }}>
          ⚠ {boundaryViolations.size} outside hangar
        </span>
      )}

      {!hasHardIssues && !hasWingIssues && placedAircraft.length > 0 && (
        <span style={{ color: '#22c55e' }}>All clear</span>
      )}

      {dragging && (
        <span style={{ color: '#94a3b8' }}>Dragging...</span>
      )}

      <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 12 }}>
        Click to select &middot; Drag to move &middot; R to rotate &middot; Del to remove
      </span>

      {placedAircraft.length > 0 && (
        <button
          onClick={() => setShowConfirm(true)}
          style={{ background: 'none', border: '1px solid #475569', borderRadius: 4, color: '#94a3b8', cursor: 'pointer', fontSize: 12, padding: '2px 10px', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#fca5a5' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.color = '#94a3b8' }}
        >Clear hangar</button>
      )}

      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#0f172a', border: '1px solid #7f1d1d', borderRadius: 8, padding: 24, width: 280, textAlign: 'center' }}>
            <div style={{ color: '#f87171', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Clear hangar?</div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 20 }}>
              This will remove all {placedAircraft.length} aircraft. This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowConfirm(false)} style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 5, color: '#94a3b8', cursor: 'pointer', padding: '7px 0', fontSize: 12 }}>Cancel</button>
              <button onClick={() => { clearHangar(); setShowConfirm(false) }} style={{ flex: 1, background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: 5, color: '#fca5a5', cursor: 'pointer', padding: '7px 0', fontSize: 12, fontWeight: 600 }}>Clear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
