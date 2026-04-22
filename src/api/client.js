const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function getToken() {
  return localStorage.getItem('token')
}

export function setToken(token) {
  localStorage.setItem('token', token)
}

export function clearToken() {
  localStorage.removeItem('token')
}

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    if (getToken()) {
      clearToken()
      window.location.reload()
    }
    const err = await res.json().catch(() => ({ detail: 'Unauthorized' }))
    throw new Error(err.detail || 'Unauthorized')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail || 'Request failed')
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  get:  (path)       => request(path, { method: 'GET' }),
  put:  (path, body) => request(path, { method: 'PUT',  body: JSON.stringify(body) }),
  patch:(path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del:  (path)       => request(path, { method: 'DELETE' }),
}
