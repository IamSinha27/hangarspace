import { useState } from 'react'
import { useStore } from '../store/useStore'
import AddAircraftModal from './AddAircraftModal'

const M_TO_FT = 3.28084
function toFt(m) { return (m * M_TO_FT).toFixed(1) }
function toDeg(rad) { return Math.round((rad * 180) / Math.PI) }

export default function Sidebar() {
  const specs = useStore(s => s.specs)
  const placedAircraft = useStore(s => s.placedAircraft)
  const selected = useStore(s => s.selected)
  const collisions = useStore(s => s.collisions)
  const wingCollisions = useStore(s => s.wingCollisions)
  const heightViolations = useStore(s => s.heightViolations)
  const boundaryViolations = useStore(s => s.boundaryViolations)
  const buffer = useStore(s => s.buffer)
  const roof = useStore(s => s.roof)
  const addAircraft = useStore(s => s.addAircraft)
  const removeAircraft = useStore(s => s.removeAircraft)
  const rotateAircraft = useStore(s => s.rotateAircraft)
  const hangar = useStore(s => s.hangar)
  const setBuffer = useStore(s => s.setBuffer)
  const setRoof = useStore(s => s.setRoof)
  const setHangar = useStore(s => s.setHangar)
  const selectAircraft = useStore(s => s.selectAircraft)


  const [showModal, setShowModal] = useState(false)
  const [editSpec, setEditSpec] = useState(null)

  return (
    <div style={{
      width: 260,
      background: '#0f172a',
      borderRight: '1px solid #1e3a5f',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ color: '#60a5fa', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>HangarSpace</div>
        <div style={{ color: '#64748b', fontSize: 12 }}>3D Parking Optimizer</div>
      </div>

      {/* Stats */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', display: 'flex', gap: 8 }}>
        <Stat label="Aircraft" value={placedAircraft.length} />
        <Stat label="Fuselage" value={collisions.size} color={collisions.size > 0 ? '#ef4444' : '#22c55e'} />
        <Stat label="Wings" value={wingCollisions.size} color={wingCollisions.size > 0 ? '#f59e0b' : '#22c55e'} />
        <Stat label="Height" value={heightViolations.size} color={heightViolations.size > 0 ? '#f97316' : '#22c55e'} />
        <Stat label="Wall" value={boundaryViolations.size} color={boundaryViolations.size > 0 ? '#a855f7' : '#22c55e'} />
      </div>

      {/* Buffer control */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>
          Safety Buffer: {toFt(buffer)}ft ({buffer.toFixed(2)}m)
        </div>
        <input
          type="range" min={0.3} max={3} step={0.1} value={buffer}
          onChange={e => setBuffer(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#3b82f6' }}
        />
      </div>

      {/* Hangar dimensions */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
        <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Hangar Dimensions</div>
        {[
          { label: 'Length', key: 'length', min: 15, max: 100 },
          { label: 'Width',  key: 'width',  min: 15, max: 100 },
        ].map(({ label, key, min, max }) => (
          <div key={key} style={{ marginBottom: 8 }}>
            <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>
              {label}: {toFt(hangar[key])}ft
            </div>
            <input type="range" min={min} max={max} step={0.5} value={hangar[key]}
              onChange={e => setHangar({ ...hangar, [key]: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: '#3b82f6' }}
            />
          </div>
        ))}
      </div>

      {/* Roof profile */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
        <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Roof Profile</div>
        <select
          value={roof.type}
          onChange={e => setRoof({ ...roof, type: e.target.value })}
          style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 4, color: '#e2e8f0', padding: '5px 8px', fontSize: 12, marginBottom: 8 }}
        >
          <option value="flat">Flat</option>
          <option value="gabled">Gabled (ridge center)</option>
          <option value="arched">Arched</option>
        </select>
        <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>
          Peak height: {toFt(roof.peakHeight)}ft
        </div>
        <input type="range" min={4} max={12} step={0.1} value={roof.peakHeight}
          onChange={e => setRoof({ ...roof, peakHeight: parseFloat(e.target.value) })}
          style={{ width: '100%', accentColor: '#3b82f6', marginBottom: 6 }}
        />
        {roof.type !== 'flat' && (<>
          <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>
            Eave height: {toFt(roof.eaveHeight)}ft
          </div>
          <input type="range" min={2} max={roof.peakHeight - 0.5} step={0.1} value={roof.eaveHeight}
            onChange={e => setRoof({ ...roof, eaveHeight: parseFloat(e.target.value) })}
            style={{ width: '100%', accentColor: '#3b82f6' }}
          />
        </>)}
      </div>

      {/* Add aircraft */}
      <div style={{ padding: '12px 16px 0', borderBottom: '1px solid #1e293b', display: 'flex', flexDirection: 'column' }}>
        <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, flexShrink: 0 }}>
          Add Aircraft
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 4 }}>
          {specs.map(spec => (
            <div key={spec.id} style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
              <button
                onClick={() => addAircraft(spec.id)}
                style={{
                  flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
                  padding: '8px 10px', cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
              >
                <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{spec.name}</div>
                <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                  {toFt(spec.length)}′L × {toFt(spec.wingspan)}′W × {toFt(spec.tailHeight)}′H
                  &nbsp;·&nbsp;<span style={{ color: '#475569' }}>{spec.wingType}-wing</span>
                </div>
              </button>
              <button
                onClick={() => { selectAircraft(null); setEditSpec(spec) }}
                title="Edit spec"
                style={{
                  background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
                  color: '#475569', cursor: 'pointer', fontSize: 12, padding: '0 8px', flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#60a5fa' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#475569' }}
              >✎</button>
            </div>
          ))}

          {/* Custom aircraft button */}
          <button
            onClick={() => { selectAircraft(null); setShowModal(true) }}
            style={{
              background: 'none', border: '1px dashed #334155', borderRadius: 6,
              padding: '8px 10px', cursor: 'pointer', textAlign: 'center',
              color: '#475569', fontSize: 12, marginTop: 2,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#60a5fa' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#475569' }}
          >
            ＋ Custom Aircraft
          </button>
        </div>
      </div>

      {showModal && <AddAircraftModal onClose={() => setShowModal(false)} />}
      {editSpec && <AddAircraftModal onClose={() => setEditSpec(null)} editSpec={editSpec} />}

      {/* Placed aircraft list */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
          In Hangar ({placedAircraft.length})
        </div>
        {placedAircraft.length === 0 && (
          <div style={{ color: '#475569', fontSize: 12 }}>No aircraft placed yet.</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {placedAircraft.map(a => {
            const spec = specs.find(s => s.id === a.specId)
            const hasFuse = collisions.has(a.uid)
            const hasWing = wingCollisions.has(a.uid)
            const hasHeight = heightViolations.has(a.uid)
            const hasBoundary = boundaryViolations.has(a.uid)
            const hasAnyIssue = hasFuse || hasHeight || hasBoundary
            const isSelected = selected === a.uid
            const deg = toDeg(a.rotation || 0)

            return (
              <div
                key={a.uid}
                style={{
                  background: isSelected ? '#1e3a5f' : '#1e293b',
                  border: `1px solid ${isSelected ? '#3b82f6' : hasFuse ? '#ef4444' : hasBoundary ? '#a855f7' : hasWing ? '#f59e0b' : '#334155'}`,
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: hasAnyIssue ? '#f87171' : '#e2e8f0', fontWeight: 600 }}>
                    {spec.name}
                    {hasFuse && <span style={{ color: '#ef4444', marginLeft: 4 }}>⚠</span>}
                    {hasBoundary && !hasFuse && <span style={{ color: '#a855f7', marginLeft: 4 }}>⬡</span>}
                    {hasWing && !hasFuse && <span style={{ color: '#f59e0b', marginLeft: 4 }}>~</span>}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {/* Rotate button */}
                    <button
                      onClick={() => rotateAircraft(a.uid)}
                      title="Rotate 45° (or press R)"
                      style={{
                        background: 'none', border: '1px solid #334155', borderRadius: 4,
                        color: '#60a5fa', cursor: 'pointer', fontSize: 12,
                        padding: '1px 5px', lineHeight: 1.4,
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
                    >
                      ↺
                    </button>
                    {/* Remove button */}
                    <button
                      onClick={() => removeAircraft(a.uid)}
                      title="Remove"
                      style={{
                        background: 'none', border: 'none',
                        color: '#475569', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#475569'}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div style={{ color: '#475569', fontSize: 10, marginTop: 2 }}>
                  {deg}° &middot; {spec.wingType}-wing
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid #1e293b' }}>
        <span style={{ color: '#64748b', fontSize: 12 }}>Hangar: 100′ × 136′ × 28′</span>
      </div>
    </div>
  )
}

function Stat({ label, value, color = '#e2e8f0' }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ color, fontWeight: 700, fontSize: 18, lineHeight: 1 }}>{value}</div>
      <div style={{ color: '#64748b', fontSize: 9, marginTop: 2 }}>{label}</div>
    </div>
  )
}
