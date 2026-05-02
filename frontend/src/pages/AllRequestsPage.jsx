import { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_MAP = {
  submitted:        { cls: 'badge-blue',   label: 'Submitted' },
  processing:       { cls: 'badge-amber',  label: 'Processing' },
  booked:           { cls: 'badge-teal',   label: 'Booked' },
  awaiting_payment: { cls: 'badge-orange', label: 'Awaiting Payment' },
  confirmed:        { cls: 'badge-green',  label: 'Confirmed' },
  cancelled:        { cls: 'badge-red',    label: 'Cancelled' },
};

const PURPOSE_OPTIONS = ['VAC', 'EMG', 'MED', 'COBUS', 'FAMILY', 'OTHER'];

export default function AllRequestsPage({ user }) {
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  /* Filters */
  const [fStatus, setFStatus]     = useState('');
  const [fPurpose, setFPurpose]   = useState('');
  const [fTransport, setFTransport] = useState('');
  const [fDateFrom, setFDateFrom] = useState('');
  const [fDateTo, setFDateTo]     = useState('');
  const [fSearch, setFSearch]     = useState('');

  /* Detail / Status modal */
  const [expanded, setExpanded]   = useState(null);
  const [detail, setDetail]       = useState({});
  const [statusModal, setStatusModal] = useState(null); // request object
  const [newStatus, setNewStatus] = useState('');
  const [picNotes, setPicNotes]   = useState('');
  const [updating, setUpdating]   = useState(false);

  /* Passenger edit modal */
  const [paxModal, setPaxModal]   = useState(null); // {requestId, passenger}
  const [paxBooking, setPaxBooking] = useState('');
  const [paxSeat, setPaxSeat]     = useState('');
  const [savingPax, setSavingPax] = useState(false);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (fStatus)    params.set('status',    fStatus);
    if (fPurpose)   params.set('purpose',   fPurpose);
    if (fTransport) params.set('transport', fTransport);
    if (fDateFrom)  params.set('date_from', fDateFrom);
    if (fDateTo)    params.set('date_to',   fDateTo);
    if (fSearch)    params.set('search',    fSearch);
    const q = params.toString();
    return q ? `?${q}` : '';
  }, [fStatus, fPurpose, fTransport, fDateFrom, fDateTo, fSearch]);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.getRequests(buildQuery())
      .then(d => setRequests(d.requests || d))
      .catch(e => setError(e.message || 'Failed to load.'))
      .finally(() => setLoading(false));
  }, [buildQuery]);

  useEffect(() => { load(); }, [load]);

  const loadDetail = async (id) => {
    if (detail[id]) { setExpanded(expanded === id ? null : id); return; }
    try {
      const d = await api.getRequest(id);
      setDetail(prev => ({ ...prev, [id]: d }));
      setExpanded(id);
    } catch {}
  };

  const openStatusModal = (r) => {
    setStatusModal(r);
    setNewStatus(r.status);
    setPicNotes(r.pic_notes || '');
  };

  const handleUpdateStatus = async () => {
    if (!newStatus) return;
    setUpdating(true);
    try {
      await api.updateStatus(statusModal.id, { status: newStatus, pic_notes: picNotes });
      setRequests(rs => rs.map(r => r.id === statusModal.id ? { ...r, status: newStatus, pic_notes: picNotes } : r));
      setStatusModal(null);
    } catch (e) {
      setError(e.message || 'Update failed.');
    } finally {
      setUpdating(false);
    }
  };

  const openPaxModal = (requestId, pax) => {
    setPaxModal({ requestId, pax });
    setPaxBooking(pax.booking_ref || '');
    setPaxSeat(pax.seat_number || '');
  };

  const handleSavePax = async () => {
    setSavingPax(true);
    try {
      const updated = await api.updatePassenger(paxModal.requestId, paxModal.pax.id, {
        booking_ref: paxBooking, seat_number: paxSeat,
      });
      setDetail(prev => {
        const d = prev[paxModal.requestId];
        if (!d) return prev;
        return {
          ...prev,
          [paxModal.requestId]: {
            ...d,
            passengers: d.passengers.map(p => p.id === paxModal.pax.id ? { ...p, booking_ref: paxBooking, seat_number: paxSeat } : p),
          },
        };
      });
      setPaxModal(null);
    } catch (e) {
      setError(e.message || 'Save failed.');
    } finally {
      setSavingPax(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await api.exportRequests(buildQuery());
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `requests_export_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message || 'Export failed.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">All Requests</div>
          <div className="page-subtitle">Manage and process travel requests</div>
        </div>
        <button className="btn btn-success" onClick={handleExport}>⬇️ Export Excel</button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {/* Filters */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div className="filter-bar">
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ width: 160 }}>
              <option value="">All</option>
              {Object.entries(STATUS_MAP).map(([v,{label}]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Purpose</label>
            <select className="form-select" value={fPurpose} onChange={e => setFPurpose(e.target.value)} style={{ width: 130 }}>
              <option value="">All</option>
              {PURPOSE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Transport</label>
            <select className="form-select" value={fTransport} onChange={e => setFTransport(e.target.value)} style={{ width: 120 }}>
              <option value="">All</option>
              <option value="Plane">Plane</option>
              <option value="Bus">Bus</option>
              <option value="Both">Both</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date From</label>
            <input className="form-input" type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)} style={{ width: 140 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Date To</label>
            <input className="form-input" type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)} style={{ width: 140 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Search</label>
            <input className="form-input" placeholder="Name, route…" value={fSearch} onChange={e => setFSearch(e.target.value)} style={{ width: 160 }} />
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
                <th>#</th>
                <th>Submitted</th>
                <th>Submitter</th>
                <th>Route</th>
                <th>Date</th>
                <th>Pax</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No requests found.</td></tr>
              )}
              {requests.map((r, idx) => {
                const sb     = STATUS_MAP[r.status] || { cls: 'badge-grey', label: r.status };
                const isOpen = expanded === r.id;
                const det    = detail[r.id];
                return (
                  <>
                    <tr key={r.id}>
                      <td style={{ color: 'var(--muted)', fontWeight: 600 }}>{idx + 1}</td>
                      <td>{fmtDate(r.created_at)}</td>
                      <td>{r.submitter_name || r.user_name || '—'}</td>
                      <td>
                        {r.outbound_from} → {r.outbound_to}
                        {r.has_return && <div style={{ fontSize: 11, color: 'var(--muted)' }}>↩ {r.inbound_from} → {r.inbound_to}</div>}
                      </td>
                      <td>{fmtDate(r.outbound_date)}</td>
                      <td>{r.passenger_count ?? '—'}</td>
                      <td>{r.purpose}</td>
                      <td><span className={`badge ${sb.cls}`}>{sb.label}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => loadDetail(r.id)}>
                            {isOpen ? '▲' : '▼'} Details
                          </button>
                          <button className="btn btn-primary btn-sm" onClick={() => openStatusModal(r)}>
                            Update
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && det && (
                      <tr key={`${r.id}-det`}>
                        <td colSpan={9} style={{ background: '#f8fafc', padding: '14px 16px' }}>
                          {det.pic_notes && <div style={{ marginBottom: 8, fontSize: 13 }}><strong>PIC Notes:</strong> {det.pic_notes}</div>}
                          {det.notes     && <div style={{ marginBottom: 8, fontSize: 13 }}><strong>Notes:</strong> {det.notes}</div>}
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>Passengers</div>
                          <table className="table" style={{ fontSize: 12 }}>
                            <thead>
                              <tr>
                                <th>Name</th><th>Cat</th><th>UID</th><th>Gender</th>
                                <th>ID</th><th>Booking Ref</th><th>Seat</th><th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {(det.passengers || []).map(p => (
                                <tr key={p.id}>
                                  <td>{p.name}</td>
                                  <td>{p.category}</td>
                                  <td>{p.uid}</td>
                                  <td>{p.gender}</td>
                                  <td>{p.id_type}: {p.id_number}</td>
                                  <td>{p.booking_ref || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                                  <td>{p.seat_number || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                                  <td>
                                    <button className="btn btn-ghost btn-sm" onClick={() => openPaxModal(r.id, p)}>Edit</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Status Update Modal */}
      {statusModal && (
        <div className="modal-overlay" onClick={() => setStatusModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Update Status</div>
              <button className="modal-close" onClick={() => setStatusModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                {statusModal.submitter_name || statusModal.user_name} — {statusModal.outbound_from} → {statusModal.outbound_to}
              </div>
              <div className="form-group">
                <label className="form-label">New Status</label>
                <select className="form-select" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  {Object.entries(STATUS_MAP).map(([v,{label}]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">PIC Notes</label>
                <textarea className="form-textarea" value={picNotes} onChange={e => setPicNotes(e.target.value)} placeholder="Optional notes for the staff member…" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setStatusModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateStatus} disabled={updating}>
                {updating ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Passenger Edit Modal */}
      {paxModal && (
        <div className="modal-overlay" onClick={() => setPaxModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Edit Passenger — {paxModal.pax.name}</div>
              <button className="modal-close" onClick={() => setPaxModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Booking Reference</label>
                <input className="form-input" value={paxBooking} onChange={e => setPaxBooking(e.target.value)} placeholder="e.g. ABC123" />
              </div>
              <div className="form-group">
                <label className="form-label">Seat Number</label>
                <input className="form-input" value={paxSeat} onChange={e => setPaxSeat(e.target.value)} placeholder="e.g. 12A" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPaxModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSavePax} disabled={savingPax}>
                {savingPax ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
