import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMe, updateProfile } from '../api/hangar'

export default function Profile() {
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [orgName, setOrgName] = useState('')
  const [logo, setLogo] = useState(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchMe()
      .then(me => { setOrgName(me.org_name); setLogo(me.logo); setEmail(me.email) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function handleLogoFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setLogo(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!orgName.trim()) return setError('Organization name is required')
    setSaving(true)
    setError(null)
    try {
      await updateProfile(orgName.trim(), logo)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <div style={{ borderBottom: '1px solid #1e293b', padding: '0 40px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0a0f1e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: 6 }} />
          <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 17 }}>HangarSpace</span>
        </div>
        <button onClick={() => navigate('/dashboard')}
          style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#94a3b8', fontSize: 13, padding: '6px 14px', cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.color = '#e2e8f0' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#94a3b8' }}
        >Dashboard</button>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '64px 40px' }}>

        <div style={{ marginBottom: 40 }}>
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Account</div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.5px' }}>Organization Profile</h1>
        </div>

        {loading ? (
          <div style={{ color: '#64748b' }}>Loading...</div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* Logo */}
            <div>
              <div style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500, marginBottom: 14 }}>FBO Logo</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div
                  onClick={() => fileRef.current.click()}
                  style={{ width: 80, height: 80, borderRadius: 16, overflow: 'hidden', cursor: 'pointer', border: '2px solid #1e293b', flexShrink: 0, position: 'relative' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#1e293b'}
                >
                  {logo ? (
                    <img src={logo} alt="FBO logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 28 }}>✈</span>
                    </div>
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
                  >
                    <span style={{ color: 'white', fontSize: 18, opacity: 0 }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0}
                    >✎</span>
                  </div>
                </div>
                <div>
                  <button type="button" onClick={() => fileRef.current.click()}
                    style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#94a3b8', fontSize: 13, padding: '7px 16px', cursor: 'pointer', display: 'block', marginBottom: 8 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#60a5fa' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#94a3b8' }}
                  >Upload logo</button>
                  {logo && (
                    <button type="button" onClick={() => setLogo(null)}
                      style={{ background: 'none', border: 'none', color: '#475569', fontSize: 12, cursor: 'pointer', padding: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                      onMouseLeave={e => e.currentTarget.style.color = '#475569'}
                    >Remove</button>
                  )}
                  <div style={{ color: '#475569', fontSize: 11, marginTop: logo ? 6 : 0 }}>PNG, JPG or SVG. Displayed across your account.</div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoFile} style={{ display: 'none' }} />
              </div>
            </div>

            {/* Org name */}
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                required
                style={{ width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#f1f5f9', padding: '11px 14px', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#1e293b'}
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Email</label>
              <input
                type="text"
                value={email}
                readOnly
                style={{ width: '100%', background: '#0a0f1e', border: '1px solid #1e293b', borderRadius: 8, color: '#475569', padding: '11px 14px', fontSize: 14, boxSizing: 'border-box', cursor: 'default' }}
              />
              <div style={{ color: '#334155', fontSize: 11, marginTop: 5 }}>Email cannot be changed</div>
            </div>

            {error && (
              <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13 }}>{error}</div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button type="submit" disabled={saving}
                style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', border: 'none', borderRadius: 8, color: '#fff', padding: '11px 28px', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
              >{saving ? 'Saving...' : 'Save changes'}</button>
              {saved && <span style={{ color: '#22c55e', fontSize: 13, fontWeight: 500 }}>Saved</span>}
            </div>

          </form>
        )}
      </div>
    </div>
  )
}
