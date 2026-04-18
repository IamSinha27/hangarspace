import { api } from './client'

function normalizeSpec(s) {
  return {
    id:             s.id,
    name:           s.name,
    length:         s.length_m,
    wingspan:       s.wingspan_m,
    tailHeight:     s.tail_height_m,
    fuselageWidth:  s.fuselage_width_m,
    wingRootHeight: s.wing_root_height_m,
    wingThickness:  s.wing_thickness_m,
    wingType:       s.wing_type,
    elevatorSpan:   s.elevator_span_m,
  }
}

export async function login(email, password) {
  return api.post('/auth/login', { email, password })
}

export async function register(orgName, email, password, logo = null) {
  return api.post('/auth/register', { org_name: orgName, email, password, logo })
}

export async function updateProfile(orgName, logo) {
  return api.patch('/auth/profile', { org_name: orgName, logo })
}

export async function fetchMe() {
  return api.get('/auth/me')
}

export async function fetchFleet() {
  const specs = await api.get('/fleet')
  return specs.map(normalizeSpec)
}

export async function updateFleetSpec(id, spec) {
  const updated = await api.patch(`/fleet/${id}`, {
    name:               spec.name,
    length_m:           spec.length,
    wingspan_m:         spec.wingspan,
    tail_height_m:      spec.tailHeight,
    fuselage_width_m:   spec.fuselageWidth,
    wing_root_height_m: spec.wingRootHeight,
    wing_thickness_m:   spec.wingThickness,
    wing_type:          spec.wingType,
    elevator_span_m:    spec.elevatorSpan ?? 0,
  })
  return normalizeSpec(updated)
}

export async function deleteFleetSpec(id) {
  return api.del(`/fleet/${id}`)
}

export async function clearFleet() {
  return api.del('/fleet')
}

export async function addFleetSpec(spec) {
  const created = await api.post('/fleet', {
    name:               spec.name,
    length_m:           spec.length,
    wingspan_m:         spec.wingspan,
    tail_height_m:      spec.tailHeight,
    fuselage_width_m:   spec.fuselageWidth,
    wing_root_height_m: spec.wingRootHeight,
    wing_thickness_m:   spec.wingThickness,
    wing_type:          spec.wingType,
    elevator_span_m:    spec.elevatorSpan ?? 0,
  })
  return normalizeSpec(created)
}

export async function fetchHangars() {
  return api.get('/hangars')
}

export async function fetchHangar(id) {
  return api.get(`/hangars/${id}`)
}

export async function updateHangar(id, hangar, roof, buffer) {
  return api.patch(`/hangars/${id}`, {
    name: hangar.name,
    length_m: hangar.length,
    width_m: hangar.width,
    height_m: hangar.height,
    roof_type: roof.type,
    roof_peak_height_m: roof.peakHeight,
    roof_eave_height_m: roof.eaveHeight,
    buffer_m: buffer,
  })
}

export async function renameHangar(id, name) {
  return api.patch(`/hangars/${id}`, { name })
}

export async function createHangar(body) {
  return api.post('/hangars', body)
}

export async function deleteHangar(id) {
  return api.del(`/hangars/${id}`)
}

export async function saveLayout(hangarId, placedAircraft) {
  return api.put(`/hangars/${hangarId}/layout`, {
    placed_aircraft: placedAircraft.map(a => ({
      spec_id:      a.specId,
      x_m:          a.x,
      z_m:          a.z,
      rotation_rad: a.rotation,
    })),
  })
}
