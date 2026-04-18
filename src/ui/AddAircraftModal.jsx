import { useState } from 'react'
import { useStore } from '../store/useStore'
import { addFleetSpec, updateFleetSpec } from '../api/hangar'

const FT_TO_M = 0.3048
const M_TO_FT = 3.28084

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

const FIELD = ({ label, name, value, onChange, type = 'number', options }) => (
  <div style={{ marginBottom: 10 }}>
    <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, marginBottom: 3 }}>{label}</label>
    {options ? (
      <select
        value={value}
        onChange={e => onChange(name, e.target.value)}
        style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 4, color: '#e2e8f0', padding: '5px 8px', fontSize: 12 }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    ) : (
      <input
        type={type}
        value={value}
        onChange={e => onChange(name, e.target.value)}
        style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 4, color: '#e2e8f0', padding: '5px 8px', fontSize: 12, boxSizing: 'border-box' }}
      />
    )}
  </div>
)

function specToFields(spec) {
  return {
    name:          spec.name,
    length:        (spec.length        * M_TO_FT).toFixed(1),
    wingspan:      (spec.wingspan      * M_TO_FT).toFixed(1),
    tailHeight:    (spec.tailHeight    * M_TO_FT).toFixed(1),
    fuselageWidth: (spec.fuselageWidth * M_TO_FT).toFixed(1),
    wingType:      spec.wingType,
    wingRootHeight:(spec.wingRootHeight* M_TO_FT).toFixed(1),
    wingThickness: (spec.wingThickness * M_TO_FT).toFixed(1),
    elevatorSpan:  ((spec.elevatorSpan ?? 0) * M_TO_FT).toFixed(1),
  }
}

const DEFAULTS = {
  name: '',
  length: '',
  wingspan: '',
  tailHeight: '',
  fuselageWidth: '4',
  wingType: 'low',
  wingRootHeight: '0',
  wingThickness: '0.8',
  elevatorSpan: '0',
}

export default function AddAircraftModal({ onClose, onSaved, editSpec = null }) {
  const addCustomSpec = useStore(s => s.addCustomSpec)
  const updateSpec    = useStore(s => s.updateSpec)
  const [fields, setFields] = useState(editSpec ? specToFields(editSpec) : DEFAULTS)
  const [error, setError] = useState('')

  const isEdit = editSpec !== null
  const set = (name, value) => setFields(f => ({ ...f, [name]: value }))

  const handleSubmit = async () => {
    if (!fields.name.trim()) return setError('Name is required')
    if (!fields.length || !fields.wingspan || !fields.tailHeight) return setError('Length, Wingspan and Tail Height are required')

    const parsed = {
      name:          fields.name.trim(),
      length:        parseFloat(fields.length)         * FT_TO_M,
      wingspan:      parseFloat(fields.wingspan)       * FT_TO_M,
      tailHeight:    parseFloat(fields.tailHeight)     * FT_TO_M,
      fuselageWidth: parseFloat(fields.fuselageWidth)  * FT_TO_M,
      wingType:      fields.wingType,
      wingRootHeight:parseFloat(fields.wingRootHeight) * FT_TO_M,
      wingThickness: parseFloat(fields.wingThickness)  * FT_TO_M,
      elevatorSpan:  parseFloat(fields.elevatorSpan)   * FT_TO_M,
    }

    if (isEdit) {
      try {
        const saved = await updateFleetSpec(editSpec.id, parsed)
        updateSpec(editSpec.id, saved)
        onSaved?.(saved)
      } catch (e) {
        return setError(e.message)
      }
    } else {
      try {
        const saved = await addFleetSpec(parsed)
        addCustomSpec(saved)
        onSaved?.(saved)
      } catch (e) {
        return setError(e.message)
      }
    }
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: '#0f172a', border: '1px solid #1e3a5f', borderRadius: 8,
        padding: 20, width: 300, maxHeight: '90vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ color: '#60a5fa', fontWeight: 700, fontSize: 14 }}>
            {isEdit ? `Edit — ${editSpec.name}` : 'Add Custom Aircraft'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        <FIELD label="Name *"              name="name"          value={fields.name}          onChange={set} type="text" />
        <FIELD label="Length (ft) *"       name="length"        value={fields.length}        onChange={set} />
        <FIELD label="Wingspan (ft) *"     name="wingspan"      value={fields.wingspan}      onChange={set} />
        <FIELD label="Tail Height (ft) *"  name="tailHeight"    value={fields.tailHeight}    onChange={set} />
        <FIELD label="Fuselage Width (ft)" name="fuselageWidth" value={fields.fuselageWidth} onChange={set} />
        <FIELD label="Wing Type"           name="wingType"      value={fields.wingType}      onChange={set}
          options={[{ value: 'high', label: 'High-wing' }, { value: 'mid', label: 'Mid-wing' }, { value: 'low', label: 'Low-wing' }]}
        />
        <FIELD label="Wing Height (ft)"    name="wingRootHeight" value={fields.wingRootHeight} onChange={set} />
        <FIELD label="Wing Thickness (ft)" name="wingThickness"  value={fields.wingThickness}  onChange={set} />
        <FIELD label="Elevator Span (ft)"  name="elevatorSpan"  value={fields.elevatorSpan}   onChange={set} />

        {error && <div style={{ color: '#f87171', fontSize: 11, marginBottom: 10 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={{
            flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 5,
            color: '#94a3b8', cursor: 'pointer', padding: '7px 0', fontSize: 12,
          }}>Cancel</button>
          <button onClick={handleSubmit} style={{
            flex: 1, background: '#1e3a5f', border: '1px solid #3b82f6', borderRadius: 5,
            color: '#60a5fa', cursor: 'pointer', padding: '7px 0', fontSize: 12, fontWeight: 600,
          }}>{isEdit ? 'Save Changes' : 'Add Aircraft'}</button>
        </div>

      </div>
    </div>
  )
}
