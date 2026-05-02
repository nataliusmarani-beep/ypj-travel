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
  const [flights, setFlights]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(emptyFlight());
  const [saving, setSaving]     = useState(false);
  const [fDateFrom, setFDateFrom] = useState('');
  const [fDateTo, setFDateTo]   = useState('');
  const [fFrom, setFFrom]       = useState('');
  const [fTo, setFTo]           = useState('');

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

  const openNew = () => {
    setEditId(null);
    setForm(emptyFlight());
    setError('');
    setShowModal(true);
  };

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
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.airline)       { setError('Airline is required.'); return; }
    if (!form.from_airport)  { setError('Departure airport is required.'); return; }
    if (!form.to_airport)    { setError('Destination airport is required.'); return; }
    if (!form.flight_date)   { setError('Flight date is required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        available_seats: form.available_seats !== '' ? Number(form.available_seats) : null,
      };
      if (editId) {
        await api.updateFlight(editId, payload);
      } else {
        await api.createFlight(payload);
      }
      setShowModal(false);
      load();
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
      <div className="page-header">
        <div>
          <div className="page-title">Flight Schedules</div>
          <div className="page-subtitle">Manage available flight options</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Add Flight</button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {/* Filters */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div className="filter-bar">
          <div className="form-group">
            <label className="form-label">Date From</label>
            <input className="form-input" type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)} style={{ width: 140 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Date To</label>
            <input className="form-input" type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)} style={{ width: 140 }} />
          </div>
          <div className="form-group">
            <label className="form-label">From Airport</label>
            <select className="form-select" value={fFrom} onChange={e => setFFrom(e.target.value)} style={{ width: 110 }}>
              <option value="">All</option>
              {AIRPORTS.filter(a => a !== 'Other').map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">To Airport</label>
            <select className="form-select" value={fTo} onChange={e => setFTo(e.target.value)} style={{ width: 110 }}>
              <option value="">All</option>
              {AIRPORTS.filter(a => a !== 'Other').map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)' }}>Loading…</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Airline</th>
                <th>Type</th>
                <th>Flight #</th>
                <th>Route</th>
                <th>Date</th>
                <th>Departure</th>
                <th>Arrival</th>
                <th>Seats</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {flights.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No flights found.</td></tr>
              )}
              {flights.map(f => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 600 }}>{f.airline}</td>
                  <td><span className={`badge ${f.flight_type === 'INT' ? 'badge-purple' : 'badge-blue'}`}>{f.flight_type}</span></td>
                  <td>{f.flight_number || '—'}</td>
                  <td>{f.from_airport} → {f.to_airport}</td>
                  <td>{fmtDate(f.flight_date)}</td>
                  <td>{f.departure_time || '—'}</td>
                  <td>{f.arrival_time   || '—'}</td>
                  <td>{f.available_seats != null ? f.available_seats : '—'}</td>
                  <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.notes || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(f)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(f.id)}>Del</button>
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
          <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editId ? 'Edit Flight' : 'Add Flight Schedule'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {error && <div className="error-box">{error}</div>}
              <div className="form-row">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Airline *</label>
                  <select className="form-select" value={form.airline} onChange={e => setField('airline', e.target.value)}>
                    {AIRLINES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={form.flight_type} onChange={e => setField('flight_type', e.target.value)}>
                    <option value="DOM">DOM</option>
                    <option value="INT">INT</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Flight Number</label>
                  <input className="form-input" value={form.flight_number} onChange={e => setField('flight_number', e.target.value)} placeholder="e.g. GA-402" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">From Airport *</label>
                  <select className="form-select" value={form.from_airport} onChange={e => setField('from_airport', e.target.value)}>
                    {AIRPORTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">To Airport *</label>
                  <select className="form-select" value={form.to_airport} onChange={e => setField('to_airport', e.target.value)}>
                    {AIRPORTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Flight Date *</label>
                  <input className="form-input" type="date" value={form.flight_date} onChange={e => setField('flight_date', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Departure Time</label>
                  <input className="form-input" type="time" value={form.departure_time} onChange={e => setField('departure_time', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Arrival Time</label>
                  <input className="form-input" type="time" value={form.arrival_time} onChange={e => setField('arrival_time', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Available Seats</label>
                  <input className="form-input" type="number" min="0" value={form.available_seats} onChange={e => setField('available_seats', e.target.value)} placeholder="e.g. 180" />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input className="form-input" value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Optional" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Flight'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
