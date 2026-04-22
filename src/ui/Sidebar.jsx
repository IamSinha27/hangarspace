import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import AddAircraftModal from './AddAircraftModal'
import { saveLayout, deleteFleetSpec, updateHangar, deleteHangar } from '../api/hangar'
import ConfirmDialog from './ConfirmDialog'

const M_TO_FT = 3.28084
function toFt(m) { return (m * M_TO_FT).toFixed(1) }
function toDeg(rad) { return Math.round((rad * 180) / Math.PI) }

export default function Sidebar({ hangarId, onHangarDeleted }) {
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
  const doorWall = useStore(s => s.doorWall)
  const setDoorWall = useStore(s => s.setDoorWall)
  const selectAircraft = useStore(s => s.selectAircraft)
  const removeSpec = useStore(s => s.removeSpec)
  const hangarName = useStore(s => s.hangarName)
  const locked = useStore(s => s.locked)

  const setHangarName = useStore(s => s.setHangarName)
  const hangarShape = useStore(s => s.hangarShape)
  const setHangarShape = useStore(s => s.setHangarShape)
  const setLayoutSaveMsg = useStore(s => s.setLayoutSaveMsg)
  const setConfigSaveMsg = useStore(s => s.setConfigSaveMsg)

  const [showModal, setShowModal] = useState(false)
  const [editSpec, setEditSpec] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmDeleteSpec, setConfirmDeleteSpec] = useState(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  const layoutMounted = useRef(false)
  const configMounted = useRef(false)
  const layoutTimer = useRef(null)
  const configTimer = useRef(null)

  // Auto-save layout when aircraft change (3s debounce)
  useEffect(() => {
    if (!layoutMounted.current) { layoutMounted.current = true; return }
    if (!hangarId) return
    clearTimeout(layoutTimer.current)
    setLayoutSaveMsg('Unsaved')
    layoutTimer.current = setTimeout(async () => {
      try {
        await saveLayout(hangarId, placedAircraft)
        setLayoutSaveMsg('Layout saved')
      } catch {
        setLayoutSaveMsg('Save failed')
      } finally {
        setTimeout(() => setLayoutSaveMsg(null), 2000)
      }
    }, 3000)
  }, [placedAircraft])

  // Auto-save config when hangar settings change (3s debounce)
  useEffect(() => {
    if (!configMounted.current) { configMounted.current = true; return }
    if (!hangarId) return
    clearTimeout(configTimer.current)
    setConfigSaveMsg('Unsaved')
    configTimer.current = setTimeout(async () => {
      try {
        await updateHangar(hangarId, { ...hangar, name: hangarName }, roof, buffer, doorWall, hangarShape)
        setConfigSaveMsg('Settings saved')
      } catch {
        setConfigSaveMsg('Save failed')
      } finally {
        setTimeout(() => setConfigSaveMsg(null), 2000)
      }
    }, 3000)
  }, [hangar, roof, buffer, doorWall, hangarName, hangarShape])

  return (
    <div style={{
      width: collapsed ? 36 : 260,
      minWidth: collapsed ? 36 : 260,
      background: '#0f172a',
      borderRight: '1px solid #1e3a5f',
      display: 'flex',
      flexDirection: 'column',
      overflowY: collapsed ? 'hidden' : 'auto',
      flexShrink: 0,
      transition: 'width 0.2s ease, min-width 0.2s ease',
      position: 'relative',
    }}>
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position: 'absolute', top: 12, right: collapsed ? 6 : 8, zIndex: 10,
          background: '#1e293b', border: '1px solid #334155', borderRadius: 5,
          color: '#475569', cursor: 'pointer', fontSize: 11, padding: '3px 5px',
          lineHeight: 1, flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.borderColor = '#475569' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#334155' }}
      >
        {collapsed ? '›' : '‹'}
      </button>

      {collapsed && <div style={{ flex: 1 }} />}
      {!collapsed && <><div style={{ padding: '16px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ color: '#475569', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Hangar</div>
        {editingName ? (
          <input
            autoFocus
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onBlur={() => { if (nameInput.trim()) setHangarName(nameInput.trim()); setEditingName(false) }}
            onKeyDown={e => { if (e.key === 'Enter') { if (nameInput.trim()) setHangarName(nameInput.trim()); setEditingName(false) } if (e.key === 'Escape') setEditingName(false) }}
            style={{ width: '100%', background: '#1e293b', border: '1px solid #3b82f6', borderRadius: 5, color: '#f1f5f9', fontSize: 15, fontWeight: 700, padding: '4px 8px', boxSizing: 'border-box', outline: 'none' }}
          />
        ) : (
          <div
            onClick={() => { setNameInput(hangarName); setEditingName(true) }}
            title="Click to rename"
            style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15, cursor: 'text', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>{hangarName || 'Unnamed Hangar'}</span>
            <span className="edit-icon" style={{ color: '#475569', fontSize: 11 }}>✎</span>
          </div>
        )}
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

      {/* Hangar shape */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
        <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Hangar Shape</div>
        <select
          value={hangarShape}
          onChange={e => setHangarShape(e.target.value)}
          style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 4, color: '#e2e8f0', padding: '5px 8px', fontSize: 12 }}
        >
          <option value="rectangular">Rectangular</option>
          <option value="t-shaped">T-Shaped (Big T)</option>
        </select>
      </div>

      {/* Hangar dimensions */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
        <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Hangar Dimensions</div>
        {hangarShape === 't-shaped' ? (
          <div style={{ color: '#475569', fontSize: 11 }}>Fixed: 63′11″ × 36′0″ (Big T blueprint)</div>
        ) : [
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

      {/* Door wall */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
        <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Entrance</div>
        {hangarShape === 't-shaped' ? (
          <div style={{ color: '#475569', fontSize: 11 }}>Fixed: South wall — 41′11″ opening (blueprint)</div>
        ) : (
          <select
            value={doorWall}
            onChange={e => setDoorWall(e.target.value)}
            style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 4, color: '#e2e8f0', padding: '5px 8px', fontSize: 12 }}
          >
            <option value="south">South wall</option>
            <option value="north">North wall</option>
            <option value="east">East wall</option>
            <option value="west">West wall</option>
          </select>
        )}
      </div>

      {/* Roof profile */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
        <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Roof Profile</div>
        {hangarShape === 't-shaped' ? (
          <div style={{ color: '#475569', fontSize: 11 }}>Fixed: Flat roof (blueprint)</div>
        ) : (<>
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
        </>)}
      </div>

      {/* Add aircraft */}
      <div style={{ padding: '12px 16px 0', borderBottom: '1px solid #1e293b', display: 'flex', flexDirection: 'column' }}>
        <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, flexShrink: 0 }}>
          Add Aircraft{locked && <span style={{ color: '#d97706', marginLeft: 6, fontWeight: 400, textTransform: 'none' }}>— locked</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 4 }}>
          {specs.map(spec => (
            <div key={spec.id} style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
              <button
                onClick={() => !locked && addAircraft(spec.id)}
                disabled={locked}
                style={{
                  flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
                  padding: '8px 10px', cursor: locked ? 'not-allowed' : 'pointer', textAlign: 'left',
                  opacity: locked ? 0.4 : 1,
                }}
                onMouseEnter={e => { if (!locked) e.currentTarget.style.borderColor = '#3b82f6' }}
                onMouseLeave={e => { if (!locked) e.currentTarget.style.borderColor = '#334155' }}
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
                style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#475569', cursor: 'pointer', fontSize: 12, padding: '0 8px', flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#60a5fa' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#475569' }}
              >✎</button>
              <button
                onClick={() => setConfirmDeleteSpec(spec)}
                title="Delete spec"
                style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#475569', cursor: 'pointer', fontSize: 14, padding: '0 7px', flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#475569' }}
              >×</button>
            </div>
          ))}

          {/* Custom aircraft button */}
          <button
            onClick={() => { if (locked) return; selectAircraft(null); setShowModal(true) }}
            disabled={locked}
            style={{
              background: 'none', border: '1px dashed #334155', borderRadius: 6,
              padding: '8px 10px', cursor: locked ? 'not-allowed' : 'pointer', textAlign: 'center',
              color: '#475569', fontSize: 12, marginTop: 2, opacity: locked ? 0.4 : 1,
            }}
            onMouseEnter={e => { if (!locked) { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#60a5fa' } }}
            onMouseLeave={e => { if (!locked) { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#475569' } }}
          >
            ＋ Custom Aircraft
          </button>
        </div>
      </div>

      {showModal && <AddAircraftModal onClose={() => setShowModal(false)} />}
      {editSpec && <AddAircraftModal onClose={() => setEditSpec(null)} editSpec={editSpec} />}
      {confirmDeleteSpec && (
        <ConfirmDialog
          title="Remove Aircraft"
          message={`Remove ${confirmDeleteSpec.name} from fleet? Any placed aircraft of this type will also be removed from all hangar layouts.`}
          confirmLabel="Remove"
          onConfirm={async () => { await deleteFleetSpec(confirmDeleteSpec.id); removeSpec(confirmDeleteSpec.id); setConfirmDeleteSpec(null) }}
          onCancel={() => setConfirmDeleteSpec(null)}
        />
      )}

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
                      onClick={() => !locked && rotateAircraft(a.uid)}
                      title={locked ? 'Unlock to rotate' : 'Rotate 45° (or press R)'}
                      disabled={locked}
                      style={{
                        background: 'none', border: '1px solid #334155', borderRadius: 4,
                        color: locked ? '#334155' : '#60a5fa',
                        cursor: locked ? 'not-allowed' : 'pointer',
                        fontSize: 12, padding: '1px 5px', lineHeight: 1.4,
                      }}
                      onMouseEnter={e => { if (!locked) e.currentTarget.style.borderColor = '#3b82f6' }}
                      onMouseLeave={e => { if (!locked) e.currentTarget.style.borderColor = '#334155' }}
                    >
                      ↺
                    </button>
                    {/* Remove button */}
                    <button
                      onClick={() => !locked && removeAircraft(a.uid)}
                      title={locked ? 'Unlock to remove' : 'Remove'}
                      disabled={locked}
                      style={{
                        background: 'none', border: 'none',
                        color: locked ? '#334155' : '#475569',
                        cursor: locked ? 'not-allowed' : 'pointer',
                        fontSize: 14, lineHeight: 1, padding: '0 2px',
                      }}
                      onMouseEnter={e => { if (!locked) e.currentTarget.style.color = '#ef4444' }}
                      onMouseLeave={e => { if (!locked) e.currentTarget.style.color = '#475569' }}
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
      <div style={{ padding: '10px 16px', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          onClick={() => setConfirmDelete(true)}
          style={{ width: '100%', background: 'none', border: '1px solid #334155', borderRadius: 6, color: '#64748b', padding: '7px', fontSize: 12, cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#f87171' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#64748b' }}
        >
          Delete Hangar
        </button>
      </div>

      </> }

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Hangar"
          message="This will permanently delete this hangar and all its layouts and aircraft placements. This cannot be undone."
          confirmLabel="Delete Hangar"
          onConfirm={async () => { await deleteHangar(hangarId); onHangarDeleted() }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
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
