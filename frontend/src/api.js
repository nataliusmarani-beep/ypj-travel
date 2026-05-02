const BASE = '/api';

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  // Export returns a blob
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('spreadsheet')) return res.blob();
  return res.json();
}

export const api = {
  // Auth
  login:       (b)    => req('POST',  '/auth/login', b),
  logout:      ()     => req('POST',  '/auth/logout'),
  me:          ()     => req('GET',   '/auth/me'),
  setPassword: (b)    => req('POST',  '/auth/set-password', b),

  // Users
  getUsers:    ()     => req('GET',   '/users'),
  getMe:       ()     => req('GET',   '/users/me'),
  updateMe:    (b)    => req('PATCH', '/users/me', b),
  createUser:  (b)    => req('POST',  '/users', b),
  updateUser:  (id,b) => req('PUT',   `/users/${id}`, b),
  inviteUser:  (id)   => req('POST',  `/users/${id}/invite`),

  // Travel Requests
  getRequests: (q='') => req('GET',   `/requests${q}`),
  getRequest:  (id)   => req('GET',   `/requests/${id}`),
  submitRequest:(b)   => req('POST',  '/requests', b),
  updateStatus:(id,b) => req('PATCH', `/requests/${id}/status`, b),
  updatePassenger:(rid,pid,b) => req('PATCH', `/requests/${rid}/passengers/${pid}`, b),
  getStats:    ()     => req('GET',   '/requests/meta/stats'),

  // RTI Events
  getRTIs:     ()     => req('GET',   '/rti'),
  getRTI:      (id)   => req('GET',   `/rti/${id}`),
  createRTI:   (b)    => req('POST',  '/rti', b),
  updateRTI:   (id,b) => req('PUT',   `/rti/${id}`, b),

  // Flights
  getFlights:  (q='') => req('GET',   `/flights${q}`),
  createFlight:(b)    => req('POST',  '/flights', b),
  updateFlight:(id,b) => req('PUT',   `/flights/${id}`, b),
  deleteFlight:(id)   => req('DELETE',`/flights/${id}`),

  // Export
  exportRequests: (q='') => req('GET', `/export/requests${q}`),
};
