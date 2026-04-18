import { create } from 'zustand'
import { checkCollisions } from './collisions.js'

const HANGAR = { length: 30.48, width: 41.45, height: 8.53 } // meters (100x136x28 ft)

const DEFAULT_ROOF = {
  type: 'flat',       // 'flat' | 'gabled' | 'arched'
  peakHeight: 8.53,   // meters — center/ridge height (28ft)
  eaveHeight: 6.10,   // meters — side wall height (20ft) — used for gabled/arched
}

const DEFAULT_BUFFER = 0.9144 // 3 ft in meters
const ROTATE_STEP = Math.PI / 4

let uidCounter = 0

function recheck(state, overrides = {}) {
  const placed  = overrides.placedAircraft ?? state.placedAircraft
  const buffer  = overrides.buffer  ?? state.buffer
  const roof    = overrides.roof    ?? state.roof
  return checkCollisions(placed, buffer, state.specs, state.hangar, roof)
}

export const useStore = create((set, get) => ({
  hangar: HANGAR,
  hangarName: '',
  roof: DEFAULT_ROOF,
  buffer: DEFAULT_BUFFER,
  specs: [],
  fleetReady: false,
  fleetError: null,
  placedAircraft: [],
  selected: null,
  clipboard: null, // { specId, rotation }
  collisions: new Set(),
  wingCollisions: new Set(),
  heightViolations: new Set(),
  boundaryViolations: new Set(),
  dragging: false,
  locked: false,

  setHangarName: (hangarName) => set({ hangarName }),

  toggleLocked: () => set(state => ({ locked: !state.locked, selected: null })),

  setHangar: (hangar) => set(state => ({
    hangar,
    ...checkCollisions(state.placedAircraft, state.buffer, state.specs, hangar, state.roof),
  })),

  initFleet: (specs) => set({ specs, fleetReady: true, fleetError: null }),
  setFleetError: (msg) => set({ fleetError: msg, fleetReady: false }),

  addCustomSpec: (spec) => set(state => ({ specs: [...state.specs, spec] })),

  removeSpec: (id) => set(state => ({ specs: state.specs.filter(s => s.id !== id) })),

  // Update an existing spec by id, then recheck collisions
  updateSpec: (id, updated) => set(state => {
    const specs = state.specs.map(s => s.id === id ? { ...s, ...updated } : s)
    return { specs, ...checkCollisions(state.placedAircraft, state.buffer, specs, state.hangar, state.roof) }
  }),

  setRoof: (roof) => set(state => ({
    roof,
    ...recheck(state, { roof }),
  })),

  addAircraft: (specId) => {
    const uid = `aircraft_${++uidCounter}`
    const newAircraft = { uid, specId, x: 0, z: 0, rotation: 0 }
    set(state => {
      const placed = [...state.placedAircraft, newAircraft]
      return { placedAircraft: placed, ...recheck(state, { placedAircraft: placed }) }
    })
  },

  removeAircraft: (uid) => {
    set(state => {
      const placed = state.placedAircraft.filter(a => a.uid !== uid)
      return {
        placedAircraft: placed,
        ...recheck(state, { placedAircraft: placed }),
        selected: state.selected === uid ? null : state.selected,
      }
    })
  },

  moveAircraft: (uid, x, z) => {
    set(state => {
      const placed = state.placedAircraft.map(a => a.uid === uid ? { ...a, x, z } : a)
      return { placedAircraft: placed, ...recheck(state, { placedAircraft: placed }) }
    })
  },

  rotateAircraft: (uid) => {
    set(state => {
      const placed = state.placedAircraft.map(a =>
        a.uid === uid ? { ...a, rotation: (a.rotation + ROTATE_STEP) % (Math.PI * 2) } : a
      )
      return { placedAircraft: placed, ...recheck(state, { placedAircraft: placed }) }
    })
  },

  copyAircraft: (uid) => set(state => {
    const a = state.placedAircraft.find(p => p.uid === uid)
    if (!a) return {}
    return { clipboard: { specId: a.specId, rotation: a.rotation } }
  }),

  pasteAircraft: () => set(state => {
    if (!state.clipboard) return {}
    const uid = `aircraft_${++uidCounter}`
    const newAircraft = { uid, specId: state.clipboard.specId, x: 2, z: 2, rotation: state.clipboard.rotation }
    const placed = [...state.placedAircraft, newAircraft]
    return { placedAircraft: placed, selected: uid, ...recheck(state, { placedAircraft: placed }) }
  }),

  loadPlaced: (placedFromApi) => set(state => {
    const placed = placedFromApi.map((p, i) => ({
      uid: `aircraft_${i}`,
      specId: p.spec_id,
      x: p.x_m,
      z: p.z_m,
      rotation: p.rotation_rad,
    }))
    return { placedAircraft: placed, ...checkCollisions(placed, state.buffer, state.specs, state.hangar, state.roof) }
  }),

  clearHangar: () => set({
    placedAircraft: [],
    selected: null,
    collisions: new Set(),
    wingCollisions: new Set(),
    heightViolations: new Set(),
    boundaryViolations: new Set(),
  }),

  selectAircraft: (uid) => set({ selected: uid }),
  clearSelection: () => set({ selected: null }),
  setDragging: (dragging) => set({ dragging }),

  setBuffer: (buffer) => set(state => ({
    buffer,
    ...recheck(state, { buffer }),
  })),
}))
