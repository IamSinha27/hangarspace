import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchFleet, deleteFleetSpec, updateFleetSpec, addFleetSpec, clearFleet } from '../api/hangar'
import { useStore } from '../store/useStore'
import AddAircraftModal from '../ui/AddAircraftModal'
import ConfirmDialog from '../ui/ConfirmDialog'

const M_TO_FT = 3.28084
const toFt = m => (m * M_TO_FT).toFixed(1)

export default function Fleet() {
  const navigate = useNavigate()
  const [specs, setSpecs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editSpec, setEditSpec] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const initFleet = useStore(s => s.initFleet)

  useEffect(() => {
    fetchFleet()
      .then(s => { setSpecs(s); initFleet(s) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id) {
    try {
      await deleteFleetSpec(id)
      const updated = specs.filter(s => s.id !== id)
      setSpecs(updated)
      initFleet(updated)
    } catch (e) {
      setError(e.message)
    } finally {
      setConfirmDelete(null)
    }
  }

  async function handleClearFleet() {
    try {
      await clearFleet()
      setSpecs([])
      initFleet([])
    } catch (e) {
      setError(e.message)
    } finally {
      setConfirmClear(false)
    }
  }

  function handleSpecSaved(saved) {
    const updated = editSpec
      ? specs.map(s => s.id === saved.id ? saved : s)
      : [...specs, saved]
    setSpecs(updated)
    initFleet(updated)
    setEditSpec(null)
    setShowAdd(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <div style={{ borderBottom: '1px solid #1e293b', padding: '0 40px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0a0f1e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: 6 }} />
          <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 17 }}>Hangarspace</span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button onClick={() => navigate('/dashboard')}
            style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#94a3b8', fontSize: 13, padding: '6px 14px', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.color = '#e2e8f0' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#94a3b8' }}
          >Dashboard</button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 40px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40 }}>
          <div>
            <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Organization</div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.5px' }}>Aircraft Fleet</h1>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>
              {specs.length > 0 ? `${specs.length} aircraft type${specs.length !== 1 ? 's' : ''} in your fleet` : 'No aircraft added yet'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {specs.length > 0 && (
              <button onClick={() => setConfirmClear(true)}
                style={{ background: 'none', border: '1px solid #334155', borderRadius: 8, color: '#64748b', padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#f87171' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#64748b' }}
              >Clear Fleet</button>
            )}
            <button onClick={() => setShowAdd(true)}
              style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', border: 'none', borderRadius: 8, color: '#fff', padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Aircraft
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '12px 16px', color: '#fca5a5', fontSize: 14, marginBottom: 24 }}>{error}</div>
        )}

        {loading ? (
          <div style={{ color: '#64748b' }}>Loading fleet...</div>
        ) : specs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#334155' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✈️</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#475569', marginBottom: 8 }}>No aircraft in your fleet</div>
            <div style={{ fontSize: 14, marginBottom: 24 }}>Add aircraft types to start placing them in hangars</div>
            <button onClick={() => setShowAdd(true)}
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#94a3b8', padding: '10px 20px', fontSize: 14, cursor: 'pointer' }}>
              + Add Aircraft
            </button>
          </div>
        ) : (
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 100px', padding: '12px 20px', borderBottom: '1px solid #1e293b', background: '#0a0f1e' }}>
              {['Aircraft', 'Length', 'Wingspan', 'Tail Height', 'Wing Type', 'Wing Height', ''].map(h => (
                <div key={h} style={{ color: '#475569', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            {specs.map((spec, i) => (
              <div key={spec.id}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 100px', padding: '14px 20px', borderBottom: i < specs.length - 1 ? '1px solid #1e293b' : 'none', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background = '#111827'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 14 }}>{spec.name}</div>
                <div style={{ color: '#94a3b8', fontSize: 13 }}>{toFt(spec.length)}′</div>
                <div style={{ color: '#94a3b8', fontSize: 13 }}>{toFt(spec.wingspan)}′</div>
                <div style={{ color: '#94a3b8', fontSize: 13 }}>{toFt(spec.tailHeight)}′</div>
                <div>
                  <span style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 4, color: '#64748b', fontSize: 11, padding: '2px 8px', textTransform: 'capitalize' }}>
                    {spec.wingType}
                  </span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: 13 }}>{toFt(spec.wingRootHeight)}′</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setEditSpec(spec)}
                    style={{ background: 'none', border: '1px solid #334155', borderRadius: 5, color: '#64748b', fontSize: 12, padding: '4px 10px', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#60a5fa' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#64748b' }}
                  >Edit</button>
                  <button onClick={() => setConfirmDelete(spec)}
                    style={{ background: 'none', border: '1px solid #334155', borderRadius: 5, color: '#64748b', fontSize: 12, padding: '4px 10px', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#f87171' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#64748b' }}
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddAircraftModal
          onClose={() => setShowAdd(false)}
          onSaved={handleSpecSaved}
        />
      )}

      {editSpec && (
        <AddAircraftModal
          editSpec={editSpec}
          onClose={() => setEditSpec(null)}
          onSaved={handleSpecSaved}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Remove Aircraft"
          message={`Remove ${confirmDelete.name} from your fleet? Any placed aircraft of this type will also be removed from all hangar layouts.`}
          confirmLabel="Remove"
          onConfirm={() => handleDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {confirmClear && (
        <ConfirmDialog
          title="Clear Fleet"
          message={`This will permanently remove all ${specs.length} aircraft type${specs.length !== 1 ? 's' : ''} from your fleet and clear any placed aircraft from all hangar layouts. This cannot be undone.`}
          confirmLabel="Clear Fleet"
          onConfirm={handleClearFleet}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </div>
  )
}
