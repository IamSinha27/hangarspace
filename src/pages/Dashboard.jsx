import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchHangars, createHangar, deleteHangar, fetchMe, renameHangar } from '../api/hangar'
import { clearToken } from '../api/client'
import ConfirmDialog from '../ui/ConfirmDialog'

const M_TO_FT = 3.28084
const toFt = m => (m * M_TO_FT).toFixed(0)

const T_DIMS = { length_m: 19.48, width_m: 10.97 }

const DEFAULT_FORM = {
  name: '',
  shape: 'rectangular',
  length_m: 30.48,
  width_m: 41.45,
  height_m: 8.53,
  roof_type: 'flat',
  roof_peak_height_m: 8.53,
  roof_eave_height_m: 6.10,
  buffer_m: 0.9144,
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [orgName, setOrgName] = useState('')
  const [logo, setLogo] = useState(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [hangars, setHangars] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // hangar id to delete

  useEffect(() => {
    Promise.all([fetchMe(), fetchHangars()])
      .then(([me, hangars]) => { setOrgName(me.org_name); setLogo(me.logo); setHangars(hangars) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    try {
      const h = await createHangar(form)
      setHangars(prev => [...prev, h])
      setShowCreate(false)
      setForm(DEFAULT_FORM)
    } catch (e) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteHangar(id)
      setHangars(prev => prev.filter(h => h.id !== id))
    } catch (e) {
      setError(e.message)
    } finally {
      setConfirmDelete(null)
    }
  }

  async function handleRename(id, name) {
    try {
      await renameHangar(id, name)
      setHangars(prev => prev.map(h => h.id === id ? { ...h, name } : h))
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>

      {/* Top nav */}
      <div style={{ borderBottom: '1px solid #1e293b', padding: '0 40px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0a0f1e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: 6 }} />
          <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>Hangarspace</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/fleet')}
            style={{ background: '#0f2240', border: '1px solid #2563eb', borderRadius: 6, color: '#60a5fa', padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1e3a5f'; e.currentTarget.style.color = '#93c5fd' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#0f2240'; e.currentTarget.style.color = '#60a5fa' }}
          >Manage Fleet</button>
          {/* Profile avatar + dropdown */}
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setShowProfileMenu(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '4px 10px', borderRadius: 8, border: `1px solid ${showProfileMenu ? '#334155' : 'transparent'}` }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#334155'}
              onMouseLeave={e => { if (!showProfileMenu) e.currentTarget.style.borderColor = 'transparent' }}
            >
              {orgName && <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{orgName}</div>}
              <div style={{ width: 34, height: 34, borderRadius: 8, overflow: 'hidden', border: '2px solid #1e293b', flexShrink: 0 }}>
                {logo ? (
                  <img src={logo} alt="org logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>✈</span>
                  </div>
                )}
              </div>
            </div>

            {showProfileMenu && (
              <>
                {/* backdrop to close on outside click */}
                <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowProfileMenu(false)} />
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, overflow: 'hidden', minWidth: 160, zIndex: 11, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                  <button
                    onClick={() => { setShowProfileMenu(false); navigate('/profile') }}
                    style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e2e8f0', fontSize: 13, textAlign: 'left', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >Edit Profile</button>
                  <div style={{ height: 1, background: '#1e293b' }} />
                  <button
                    onClick={() => { clearToken(); navigate('/login') }}
                    style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#f87171', fontSize: 13, textAlign: 'left', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >Log out</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Page content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 40px' }}>

        {/* Hero row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40 }}>
          <div>
            <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Dashboard</div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.5px' }}>
              {orgName ? `Welcome back, ${orgName}` : 'Your Hangars'}
            </h1>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>
              {hangars.length > 0 ? `${hangars.length} hangar${hangars.length !== 1 ? 's' : ''} · click to open the 3D editor` : 'Get started by creating your first hangar'}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', border: 'none', borderRadius: 8, color: '#fff', padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Hangar
          </button>
        </div>

        {error && (
          <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '12px 16px', color: '#fca5a5', fontSize: 14, marginBottom: 24 }}>
            {error}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ background: '#0f172a', borderRadius: 12, height: 140, opacity: 0.4, animation: 'pulse 1.5s ease infinite' }} />
            ))}
          </div>
        ) : hangars.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#334155' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏗</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#475569', marginBottom: 8 }}>No hangars yet</div>
            <div style={{ fontSize: 14, marginBottom: 24 }}>Create your first hangar to start optimizing aircraft parking</div>
            <button onClick={() => setShowCreate(true)}
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#94a3b8', padding: '10px 20px', fontSize: 14, cursor: 'pointer' }}>
              + Create Hangar
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {hangars.map(h => (
              <HangarCard key={h.id} hangar={h} onOpen={() => navigate(`/hangars/${h.id}`)} onDelete={e => { e.stopPropagation(); setConfirmDelete(h.id) }} onRename={(name) => handleRename(h.id, name)} />
            ))}
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Hangar"
          message="This will permanently delete the hangar and all its layouts and aircraft placements. This cannot be undone."
          confirmLabel="Delete Hangar"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleCreate} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 32, width: 380, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#f1f5f9', marginBottom: 4 }}>New Hangar</div>
              <div style={{ color: '#64748b', fontSize: 13 }}>Dimensions in feet — converted internally to meters</div>
            </div>

            <Field label="Hangar Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required placeholder="e.g. North Hangar" />

            <div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, fontWeight: 500 }}>Hangar Shape</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { value: 'rectangular', label: 'Rectangular' },
                  { value: 't-shaped', label: 'T-Shaped (Big T)' },
                ].map(({ value, label }) => (
                  <button key={value} type="button"
                    onClick={() => {
                      if (value === 't-shaped') {
                        setForm(f => ({ ...f, shape: 't-shaped', length_m: T_DIMS.length_m, width_m: T_DIMS.width_m, roof_type: 'flat' }))
                      } else {
                        setForm(f => ({ ...f, shape: 'rectangular', length_m: DEFAULT_FORM.length_m, width_m: DEFAULT_FORM.width_m }))
                      }
                    }}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: form.shape === value ? '1px solid #3b82f6' : '1px solid #334155', background: form.shape === value ? '#1e3a5f' : '#1e293b', color: form.shape === value ? '#60a5fa' : '#64748b' }}>
                    {label}
                  </button>
                ))}
              </div>
              {form.shape === 't-shaped' && (
                <div style={{ color: '#475569', fontSize: 11, marginTop: 5 }}>Fixed blueprint: 63′ × 36′ — dimensions locked</div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, opacity: form.shape === 't-shaped' ? 0.5 : 1 }}>
              <Field label="Length (ft)" type="number" value={toFt(form.length_m)} onChange={v => setForm(f => ({ ...f, length_m: v / M_TO_FT }))} disabled={form.shape === 't-shaped'} />
              <Field label="Width (ft)" type="number" value={toFt(form.width_m)} onChange={v => setForm(f => ({ ...f, width_m: v / M_TO_FT }))} disabled={form.shape === 't-shaped'} />
              <Field label="Height (ft)" type="number" value={toFt(form.height_m)} onChange={v => setForm(f => ({ ...f, height_m: v / M_TO_FT }))} />
            </div>

            <div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, fontWeight: 500 }}>Roof Type</div>
              {form.shape === 't-shaped' ? (
                <div style={{ color: '#475569', fontSize: 11 }}>Fixed: Flat roof (blueprint)</div>
              ) : <div style={{ display: 'flex', gap: 8 }}>
                {['flat', 'gabled', 'arched'].map(type => (
                  <button key={type} type="button"
                    onClick={() => setForm(f => ({ ...f, roof_type: type }))}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize', border: form.roof_type === type ? '1px solid #3b82f6' : '1px solid #334155', background: form.roof_type === type ? '#1e3a5f' : '#1e293b', color: form.roof_type === type ? '#60a5fa' : '#64748b' }}>
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="button" onClick={() => setShowCreate(false)}
                style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#94a3b8', padding: '10px', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
                Cancel
              </button>
              <button type="submit" disabled={creating}
                style={{ flex: 2, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', border: 'none', borderRadius: 8, color: '#fff', padding: '10px', fontSize: 14, fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1 }}>
                {creating ? 'Creating...' : 'Create Hangar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function HangarCard({ hangar, onOpen, onDelete, onRename }) {
  const [hovered, setHovered] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(hangar.name)

  function commitRename() {
    const trimmed = nameInput.trim()
    if (trimmed && trimmed !== hangar.name) onRename(trimmed)
    else setNameInput(hangar.name)
    setEditingName(false)
  }

  return (
    <div
      onClick={editingName ? undefined : onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? '#111827' : '#0f172a', border: `1px solid ${hovered ? '#3b82f6' : '#1e293b'}`, borderRadius: 12, padding: 22, cursor: editingName ? 'default' : 'pointer', position: 'relative', transition: 'all 0.15s ease' }}
    >
      {/* Top-right actions */}
      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 4, color: '#64748b', fontSize: 10, padding: '2px 7px', textTransform: 'capitalize', fontWeight: 500 }}>
          {hangar.roof_type}
        </span>
        <button
          onClick={e => { e.stopPropagation(); setNameInput(hangar.name); setEditingName(true) }}
          title="Rename"
          style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 4, color: '#94a3b8', cursor: 'pointer', fontSize: 12, padding: '2px 7px', lineHeight: 1.4 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#60a5fa' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#94a3b8' }}
        >✎</button>
        <button
          onClick={onDelete}
          style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
          onMouseLeave={e => e.currentTarget.style.color = '#334155'}
        >×</button>
      </div>

      {/* Icon */}
      <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #1e3a5f, #1e293b)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 14 }}>
        🏭
      </div>

      {editingName ? (
        <input
          autoFocus
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setNameInput(hangar.name); setEditingName(false) } }}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', background: '#1e293b', border: '1px solid #3b82f6', borderRadius: 6, color: '#f1f5f9', fontSize: 16, fontWeight: 700, padding: '3px 8px', marginBottom: 10, boxSizing: 'border-box', outline: 'none' }}
        />
      ) : (
        <div style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9', marginBottom: 10 }}>{hangar.name}</div>
      )}

      {/* Dimension pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[
          { label: 'L', value: `${toFt(hangar.length_m)}′` },
          { label: 'W', value: `${toFt(hangar.width_m)}′` },
          { label: 'H', value: `${toFt(hangar.height_m)}′` },
        ].map(d => (
          <span key={d.label} style={{ background: '#1e293b', borderRadius: 5, padding: '3px 8px', fontSize: 12, color: '#94a3b8' }}>
            <span style={{ color: '#475569', fontSize: 10, marginRight: 3 }}>{d.label}</span>{d.value}
          </span>
        ))}
      </div>

      {hovered && (
        <div style={{ marginTop: 14, color: '#3b82f6', fontSize: 12, fontWeight: 500 }}>Open in editor →</div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required, placeholder, disabled }) {
  return (
    <div>
      <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 5, fontWeight: 500 }}>{label}</div>
      <input type={type} value={value} required={required} placeholder={placeholder} disabled={disabled}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: disabled ? '#475569' : '#e2e8f0', padding: '9px 10px', fontSize: 13, boxSizing: 'border-box', outline: 'none', cursor: disabled ? 'not-allowed' : 'text' }}
        onFocus={e => { if (!disabled) e.target.style.borderColor = '#3b82f6' }}
        onBlur={e => e.target.style.borderColor = '#334155'}
      />
    </div>
  )
}
