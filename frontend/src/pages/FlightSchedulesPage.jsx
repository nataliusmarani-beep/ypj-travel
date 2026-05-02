import { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';

const AIRLINES = [
  'Airfast Indonesia', 'Garuda Indonesia', 'Lion Air',
  'Citilink', 'Batik Air', 'Wings Air', 'Other',
];
const AIRPORTS = ['TIM', 'CGK', 'UPG', 'SUB', 'DPS', 'YIA', 'MDC', 'Other'];

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const emptyFlight = () => ({
  airline: 'Garuda Indonesia',
  flight_type: 'DOM',
  flight_number: '',
  from_airport: 'TIM',
  to_airport: 'CGK',
  flight_date: '',
  departure_time: '',
  arrival_time: '',
  available_seats: '',
  notes: '',
});

export default function FlightSchedulesPage({ user }) {
  const [flights, setFlights]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId]       = useState(null);
  const [form, setForm]           = useState(emptyFlight());
  const [saving, setSaving]       = useState(false);
  const [fDateFrom, setFDateFrom] = useState('');
  const [fDateTo, setFDateTo]     = useState('');
  const [fFrom, setFFrom]         = useState('');
  const [fTo, setFTo]             = useState('');

  const buildQuery = useCallback(() => {
    const p = new URLSearchParams();
    if (fDateFrom) p.set('date_from', fDateFrom);
    if (fDateTo)   p.set('date_to',   fDateTo);
    if (fFrom)     p.set('from',      fFrom);
    if (fTo)       p.set('to',        fTo);
    const q = p.toString();
    return q ? `?${q}` : '';
  }, [fDateFrom, fDateTo, fFrom, fTo]);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.getFlights(buildQuery())
      .then(d => setFlights(d.flights || d))
      .catch(e => setError(e.message || 'Failed to load.'))
      .finally(() => setLoading(false));
  }, [buildQuery]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditId(null); setForm(emptyFlight()); setError(''); setShowModal(true); };

  const openEdit = (f) => {
    setEditId(f.id);
    setForm({
      airline:        f.airline        || 'Garuda Indonesia',
      flight_type:    f.flight_type    || 'DOM',
      flight_number:  f.flight_number  || '',
      from_airport:   f.from_airport   || 'TIM',
      to_airport:     f.to_airport     || 'CGK',
      flight_date:    f.flight_date    ? f.flight_date.slice(0, 10) : '',
      departure_time: f.departure_time || '',
      arrival_time:   f.arrival_time   || '',
      available_seats: f.available_seats != null ? String(f.available_seats) : '',
      notes:          f.notes          || '',
    });
    setError(''); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.airline)      { setError('Airline is required.'); return; }
    if (!form.from_airport) { setError('Departure airport is required.'); return; }
    if (!form.to_airport)   { setError('Destination airport is required.'); return; }
    if (!form.flight_date)  { setError('Flight date is required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, available_seats: form.available_seats !== '' ? Number(form.available_seats) : null };
      if (editId) { await api.updateFlight(editId, payload); }
      else        { await api.createFlight(payload); }
      setShowModal(false); load();
    } catch (e) {
      setError(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this flight schedule?')) return;
    try {
      await api.deleteFlight(id);
      setFlights(fs => fs.filter(f => f.id !== id));
    } catch (e) {
      setError(e.message || 'Delete failed.');
    }
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div>
      {/* Page Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #ea580c 100%)',
        borderRadius: 20, padding: '24px 28px', marginBottom: 24,
        boxShadow: '0 4px 20px rgba(30,58,95,.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            ✈️ Schedule Management
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Flight Schedules</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>Manage available flight options for travel requests</div>
        </div>
        <button
          onClick={openNew}
          style={{
            background: '#fff', color: 'var(--navy)',
            fontWeight: 700, padding: '10px 20px', borderRadius: 12,
            border: 'none', fontSize: 13, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,.15)', position: 'relative',
          }}
        >
          + Add Flight
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div style={{
        background: '#fff', borderRadius: 14, padding: '16px 20px', marginBottom: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.03)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          🔍 Filters
        </div>
        <div className="filter-bar">
          <div className="form-group">
            <label className="form-label">Date From</label>
            <input className="form-input" type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)} style={{ width: 140, borderRadius: 8 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Date To</label>
            <input className="form-input" type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)} style={{ width: 140, borderRadius: 8 }} />
          </div>
          <div className="form-group">
            <label className="form-label">From Airport</label>
            <select className="form-select" value={fFrom} onChange={e => setFFrom(e.target.value)} style={{ width: 110, borderRadius: 8 }}>
              <option value="">All</option>
              {AIRPORTS.filter(a => a !== 'Other').map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">To Airport</label>
            <select className="form-select" value={fTo} onChange={e => setFTo(e.target.value)} style={{ width: 110, borderRadius: 8 }}>
              <option value="">All</option>
              {AIRPORTS.filter(a => a !== 'Other').map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: 'var(--muted)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✈️</div>
            <div style={{ fontSize: 14 }}>Loading schedules…</div>
          </div>
        </div>
      ) : (
        <div style={{
          background: '#fff', borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04)',
        }}>
          <table className="table">
            <thead>
              <tr>
                <th>Airline</th>
                <th>Type</th>
                <th>Flight #</th>
                <th>Route</th>
                <th>Date</th>
                <th>Dep.</th>
                <th>Arr.</th>
                <th style={{ textAlign: 'center' }}>Seats</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {flights.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', color: 'var(--muted)', padding: 48 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>✈️</div>
                    <div>No flight schedules found.</div>
                  </td>
                </tr>
              )}
              {flights.map(f => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 600 }}>{f.airline}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                      color: f.flight_type === 'INT' ? '#7c3aed' : '#1d4ed8',
                      background: f.flight_type === 'INT' ? '#f3e8ff' : '#dbeafe',
                    }}>{f.flight_type}</span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{f.flight_number || '—'}</td>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{f.from_airport} → {f.to_airport}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(f.flight_date)}</td>
                  <td>{f.departure_time || '—'}</td>
                  <td>{f.arrival_time   || '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    {f.available_seats != null ? (
                      <span style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                        color: f.available_seats > 10 ? '#16a34a' : f.available_seats > 0 ? '#d97706' : '#dc2626',
                        background: f.available_seats > 10 ? '#dcfce7' : f.available_seats > 0 ? '#fef3c7' : '#fee2e2',
                      }}>{f.available_seats}</span>
                    ) : '—'}
                  </td>
                  <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--muted)' }}>
                    {f.notes || '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary btn-sm" style={{ borderRadius: 8, fontSize: 11 }} onClick={() => openEdit(f)}>Edit</button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ borderRadius: 8, fontSize: 11, color: '#dc2626' }}
                        onClick={() => handleDelete(f.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 580, borderRadius: 20 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editId ? 'Edit Flight Schedule' : 'Add Flight Schedule'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
                  {error}
                </div>
              )}
              <div className="form-row">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Airline *</label>
                  <select className="form-select" style={{ borderRadius: 10 }} value={form.airline} onChange={e => setField('airline', e.target.value)}>
                    {AIRLINES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" style={{ borderRadius: 10 }} value={form.flight_type} onChange={e => setField('flight_type', e.target.value)}>
                    <option value="DOM">DOM — Domestic</option>
                    <option value="INT">INT — International</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Flight Number</label>
                  <input className="form-input" style={{ borderRadius: 10 }} value={form.flight_number} onChange={e => setField('flight_number', e.target.value)} placeholder="e.g. GA-402" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">From Airport *</label>
                  <select className="form-select" style={{ borderRadius: 10 }} value={form.from_airport} onChange={e => setField('from_airport', e.target.value)}>
                    {AIRPORTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">To Airport *</label>
                  <select className="form-select" style={{ borderRadius: 10 }} value={form.to_airport} onChange={e => setField('to_airport', e.target.value)}>
                    {AIRPORTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Flight Date *</label>
                  <input className="form-input" style={{ borderRadius: 10 }} type="date" value={form.flight_date} onChange={e => setField('flight_date', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Departure Time</label>
                  <input className="form-input" style={{ borderRadius: 10 }} type="time" value={form.departure_time} onChange={e => setField('departure_time', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Arrival Time</label>
                  <input className="form-input" style={{ borderRadius: 10 }} type="time" value={form.arrival_time} onChange={e => setField('arrival_time', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Available Seats</label>
                  <input className="form-input" style={{ borderRadius: 10 }} type="number" min="0" value={form.available_seats} onChange={e => setField('available_seats', e.target.value)} placeholder="e.g. 180" />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input className="form-input" style={{ borderRadius: 10 }} value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Optional" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" style={{ borderRadius: 10 }} onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ borderRadius: 10 }} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Flight'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
