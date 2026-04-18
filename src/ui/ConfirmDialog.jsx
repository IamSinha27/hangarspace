export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 28, width: 360, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
        <div style={{ width: 40, height: 40, background: '#450a0a', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 16 }}>⚠</div>
        <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{title}</div>
        <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel}
            style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#94a3b8', padding: '10px', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            style={{ flex: 1, background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: 8, color: '#fca5a5', padding: '10px', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
