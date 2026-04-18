import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from './useStore'

const SPEC = {
  id: 'test-spec',
  length: 8,
  wingspan: 10,
  tailHeight: 2.5,
  fuselageWidth: 1,
  wingRootHeight: 1,
  wingThickness: 0.25,
  elevatorSpan: 0,
}

beforeEach(() => {
  useStore.setState({
    placedAircraft: [],
    selected: null,
    clipboard: null,
    collisions: new Set(),
    wingCollisions: new Set(),
    heightViolations: new Set(),
    boundaryViolations: new Set(),
    dragging: false,
    locked: false,
    doorWall: 'south',
    layoutSaveMsg: null,
    configSaveMsg: null,
    specs: [],
  })
})

// ─── setDoorWall ───────────────────────────────────────────────────────────────

describe('setDoorWall', () => {
  it('updates doorWall', () => {
    useStore.getState().setDoorWall('north')
    expect(useStore.getState().doorWall).toBe('north')
  })

  it('overwrites previous value', () => {
    useStore.getState().setDoorWall('east')
    useStore.getState().setDoorWall('west')
    expect(useStore.getState().doorWall).toBe('west')
  })
})

// ─── save status messages ──────────────────────────────────────────────────────

describe('setLayoutSaveMsg / setConfigSaveMsg', () => {
  it('setLayoutSaveMsg writes to store', () => {
    useStore.getState().setLayoutSaveMsg('Layout saved')
    expect(useStore.getState().layoutSaveMsg).toBe('Layout saved')
  })

  it('setConfigSaveMsg writes to store', () => {
    useStore.getState().setConfigSaveMsg('Settings saved')
    expect(useStore.getState().configSaveMsg).toBe('Settings saved')
  })

  it('setLayoutSaveMsg can be cleared to null', () => {
    useStore.getState().setLayoutSaveMsg('Unsaved')
    useStore.getState().setLayoutSaveMsg(null)
    expect(useStore.getState().layoutSaveMsg).toBeNull()
  })

  it('layout and config messages are independent', () => {
    useStore.getState().setLayoutSaveMsg('Layout saved')
    useStore.getState().setConfigSaveMsg('Settings saved')
    expect(useStore.getState().layoutSaveMsg).toBe('Layout saved')
    expect(useStore.getState().configSaveMsg).toBe('Settings saved')
  })
})

// ─── toggleLocked ─────────────────────────────────────────────────────────────

describe('toggleLocked', () => {
  it('locks an unlocked store', () => {
    useStore.getState().toggleLocked()
    expect(useStore.getState().locked).toBe(true)
  })

  it('unlocks a locked store', () => {
    useStore.setState({ locked: true })
    useStore.getState().toggleLocked()
    expect(useStore.getState().locked).toBe(false)
  })

  it('clears selected when locking', () => {
    useStore.setState({ selected: 'aircraft_1', locked: false })
    useStore.getState().toggleLocked()
    expect(useStore.getState().selected).toBeNull()
  })

  it('clears selected when unlocking', () => {
    useStore.setState({ selected: 'aircraft_1', locked: true })
    useStore.getState().toggleLocked()
    expect(useStore.getState().selected).toBeNull()
  })
})

// ─── addAircraft ──────────────────────────────────────────────────────────────

describe('addAircraft', () => {
  it('appends to placedAircraft', () => {
    useStore.setState({ specs: [SPEC] })
    useStore.getState().addAircraft('test-spec')
    expect(useStore.getState().placedAircraft).toHaveLength(1)
    expect(useStore.getState().placedAircraft[0].specId).toBe('test-spec')
  })

  it('assigns unique uids', () => {
    useStore.setState({ specs: [SPEC] })
    useStore.getState().addAircraft('test-spec')
    useStore.getState().addAircraft('test-spec')
    const [a, b] = useStore.getState().placedAircraft
    expect(a.uid).not.toBe(b.uid)
  })

  it('starts at x=0, z=0, rotation=0', () => {
    useStore.setState({ specs: [SPEC] })
    useStore.getState().addAircraft('test-spec')
    const { x, z, rotation } = useStore.getState().placedAircraft[0]
    expect(x).toBe(0)
    expect(z).toBe(0)
    expect(rotation).toBe(0)
  })
})

// ─── removeAircraft ───────────────────────────────────────────────────────────

describe('removeAircraft', () => {
  it('removes the aircraft from placedAircraft', () => {
    useStore.setState({ specs: [SPEC] })
    useStore.getState().addAircraft('test-spec')
    const uid = useStore.getState().placedAircraft[0].uid
    useStore.getState().removeAircraft(uid)
    expect(useStore.getState().placedAircraft).toHaveLength(0)
  })

  it('clears selected when the removed aircraft was selected', () => {
    useStore.setState({ specs: [SPEC] })
    useStore.getState().addAircraft('test-spec')
    const uid = useStore.getState().placedAircraft[0].uid
    useStore.setState({ selected: uid })
    useStore.getState().removeAircraft(uid)
    expect(useStore.getState().selected).toBeNull()
  })

  it('does not clear selected when a different aircraft is removed', () => {
    useStore.setState({ specs: [SPEC] })
    useStore.getState().addAircraft('test-spec')
    useStore.getState().addAircraft('test-spec')
    const [a, b] = useStore.getState().placedAircraft
    useStore.setState({ selected: a.uid })
    useStore.getState().removeAircraft(b.uid)
    expect(useStore.getState().selected).toBe(a.uid)
  })
})

// ─── clearHangar ──────────────────────────────────────────────────────────────

describe('clearHangar', () => {
  it('empties placedAircraft', () => {
    useStore.setState({ specs: [SPEC] })
    useStore.getState().addAircraft('test-spec')
    useStore.getState().clearHangar()
    expect(useStore.getState().placedAircraft).toHaveLength(0)
  })

  it('clears selected', () => {
    useStore.setState({ selected: 'some-uid' })
    useStore.getState().clearHangar()
    expect(useStore.getState().selected).toBeNull()
  })

  it('resets all four collision Sets to empty', () => {
    useStore.setState({
      collisions: new Set(['a']),
      wingCollisions: new Set(['b']),
      heightViolations: new Set(['c']),
      boundaryViolations: new Set(['d']),
    })
    useStore.getState().clearHangar()
    const s = useStore.getState()
    expect(s.collisions.size).toBe(0)
    expect(s.wingCollisions.size).toBe(0)
    expect(s.heightViolations.size).toBe(0)
    expect(s.boundaryViolations.size).toBe(0)
  })
})

// ─── copyAircraft / pasteAircraft ─────────────────────────────────────────────

describe('copyAircraft / pasteAircraft', () => {
  it('copies specId and rotation to clipboard', () => {
    useStore.setState({
      specs: [SPEC],
      placedAircraft: [{ uid: 'a1', specId: 'test-spec', x: 0, z: 0, rotation: Math.PI / 4 }],
    })
    useStore.getState().copyAircraft('a1')
    const cb = useStore.getState().clipboard
    expect(cb.specId).toBe('test-spec')
    expect(cb.rotation).toBeCloseTo(Math.PI / 4)
  })

  it('paste adds aircraft and selects it', () => {
    useStore.setState({
      specs: [SPEC],
      clipboard: { specId: 'test-spec', rotation: 0 },
    })
    useStore.getState().pasteAircraft()
    const placed = useStore.getState().placedAircraft
    expect(placed).toHaveLength(1)
    expect(useStore.getState().selected).toBe(placed[0].uid)
  })

  it('paste preserves clipboard rotation', () => {
    useStore.setState({
      specs: [SPEC],
      clipboard: { specId: 'test-spec', rotation: Math.PI / 2 },
    })
    useStore.getState().pasteAircraft()
    expect(useStore.getState().placedAircraft[0].rotation).toBeCloseTo(Math.PI / 2)
  })

  it('paste does nothing when clipboard is null', () => {
    useStore.setState({ clipboard: null })
    useStore.getState().pasteAircraft()
    expect(useStore.getState().placedAircraft).toHaveLength(0)
  })
})

// ─── loadPlaced ───────────────────────────────────────────────────────────────

describe('loadPlaced', () => {
  it('maps API shape to store shape', () => {
    useStore.getState().loadPlaced([
      { spec_id: 'test-spec', x_m: 5, z_m: 3, rotation_rad: Math.PI / 4 },
    ])
    const a = useStore.getState().placedAircraft[0]
    expect(a.specId).toBe('test-spec')
    expect(a.x).toBe(5)
    expect(a.z).toBe(3)
    expect(a.rotation).toBeCloseTo(Math.PI / 4)
  })

  it('assigns a uid to each loaded aircraft', () => {
    useStore.getState().loadPlaced([
      { spec_id: 'test-spec', x_m: 0, z_m: 0, rotation_rad: 0 },
      { spec_id: 'test-spec', x_m: 5, z_m: 0, rotation_rad: 0 },
    ])
    const [a, b] = useStore.getState().placedAircraft
    expect(a.uid).toBeDefined()
    expect(b.uid).toBeDefined()
    expect(a.uid).not.toBe(b.uid)
  })

  it('replaces any previously placed aircraft', () => {
    useStore.setState({ specs: [SPEC] })
    useStore.getState().addAircraft('test-spec')
    useStore.getState().loadPlaced([])
    expect(useStore.getState().placedAircraft).toHaveLength(0)
  })
})
