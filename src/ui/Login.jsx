import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register } from '../api/hangar'
import { setToken } from '../api/client'

export default function Login() {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [logo, setLogo] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const isLogin = mode === 'login'

  function handleLogoFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setLogo(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = isLogin
        ? await login(email, password)
        : await register(orgName, email, password, logo)
      setToken(res.access_token)
      navigate('/dashboard')
    } catch {
      setError(isLogin ? 'Invalid email or password.' : 'Could not create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#020617', display: 'flex', fontFamily: 'system-ui, sans-serif' }}>

      {/* Left panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 64px', maxWidth: 480 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: 8 }} />
          <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 18 }}>Hangarspace</span>
        </div>

        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.5px' }}>
          {isLogin ? 'Welcome back' : 'Create your account'}
        </h1>
        <p style={{ margin: '0 0 36px', color: '#64748b', fontSize: 14 }}>
          {isLogin ? 'Sign in to access your hangars' : 'Set up your organization to get started'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!isLogin && (
            <FormField label="Organization Name" value={orgName} onChange={setOrgName} placeholder="e.g. Riverside FBO" required />
          )}
          {!isLogin && (
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>FBO Logo <span style={{ color: '#475569' }}>(optional)</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  onClick={() => fileRef.current.click()}
                  style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', cursor: 'pointer', border: '1px solid #1e293b', flexShrink: 0 }}
                >
                  {logo ? (
                    <img src={logo} alt="logo preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 20 }}>✈</span>
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => fileRef.current.click()}
                  style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 7, color: '#64748b', fontSize: 13, padding: '8px 16px', cursor: 'pointer' }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#1e293b'}
                >{logo ? 'Change logo' : 'Upload logo'}</button>
                {logo && (
                  <button type="button" onClick={() => setLogo(null)}
                    style={{ background: 'none', border: 'none', color: '#475569', fontSize: 12, cursor: 'pointer', padding: 0 }}
                  >Remove</button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoFile} style={{ display: 'none' }} />
            </div>
          )}
          <FormField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                placeholder="••••••••"
                required
                onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#f1f5f9', padding: '11px 42px 11px 14px', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#1e293b'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 16, lineHeight: 1, padding: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
                onMouseLeave={e => e.currentTarget.style.color = '#475569'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            border: 'none', borderRadius: 8, color: '#fff',
            padding: '12px', fontSize: 15, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, marginTop: 4,
          }}>
            {loading ? (isLogin ? 'Signing in...' : 'Creating account...') : (isLogin ? 'Sign in' : 'Create account')}
          </button>
        </form>

        <p style={{ marginTop: 24, color: '#64748b', fontSize: 13 }}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span
            onClick={() => { setMode(isLogin ? 'register' : 'login'); setError(null) }}
            style={{ color: '#60a5fa', cursor: 'pointer', fontWeight: 500 }}
          >
            {isLogin ? 'Create one' : 'Sign in'}
          </span>
        </p>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(59,130,246,0.08) 0%, transparent 60%), radial-gradient(circle at 70% 70%, rgba(99,102,241,0.08) 0%, transparent 60%)' }} />
        <div style={{ textAlign: 'center', padding: 40, position: 'relative' }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>✈️</div>
          <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 22, marginBottom: 12 }}>3D Hangar Optimizer</div>
          <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, maxWidth: 280 }}>
            Maximize aircraft parking density with real-time collision detection and layout optimization.
          </div>
          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['Real-time collision detection', 'Multiple roof profiles', 'Save & restore layouts'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569', fontSize: 13 }}>
                <span style={{ color: '#3b82f6' }}>✓</span> {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function FormField({ label, type = 'text', value, onChange, placeholder, required }) {
  return (
    <div>
      <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{label}</label>
      <input
        type={type} value={value} placeholder={placeholder} required={required}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#f1f5f9', padding: '11px 14px', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
        onFocus={e => e.target.style.borderColor = '#3b82f6'}
        onBlur={e => e.target.style.borderColor = '#1e293b'}
      />
    </div>
  )
}
