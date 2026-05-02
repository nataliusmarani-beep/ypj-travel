import { useState, useEffect } from 'react';
import { api } from '../api.js';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_MAP = {
  submitted:        { color: '#2563eb', bg: '#dbeafe', label: 'Submitted' },
  processing:       { color: '#d97706', bg: '#fef3c7', label: 'Processing' },
  booked:           { color: '#0d9488', bg: '#ccfbf1', label: 'Booked' },
  awaiting_payment: { color: '#ea580c', bg: '#ffedd5', label: 'Awaiting Payment' },
  confirmed:        { color: '#16a34a', bg: '#dcfce7', label: 'Confirmed' },
  cancelled:        { color: '#dc2626', bg: '#fee2e2', label: 'Cancelled' },
};

const PURPOSE_LABEL = {
  VAC: 'Vacation', EMG: 'Emergency', MED: 'Medical',
  COBUS: 'Company Business', FAMILY: 'Family', OTHER: 'Other',
};

function StatusPill({ status }) {
  const s = STATUS_MAP[status] || { color: '#64748b', bg: '#f1f5f9', label: status };
  return (
    <span style={{
      display: 'inline-block', padding: '3px 11px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
      color: s.color, background: s.bg,
    }}>{s.label}</span>
  );
}

export default function MyRequestsPage({ user }) {
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [filterStatus, setFilter] = useState('all');
  const [expanded, setExpanded]   = useState(null);
  const [detail, setDetail]       = useState({});

  useEffect(() => {
    api.getRequests('?my=1')
      .then(d => setRequests(d.requests || d))
      .catch(e => setError(e.message || 'Failed to load requests.'))
      .finally(() => setLoading(false));
  }, []);

  const loadDetail = async (id) => {
    if (detail[id]) { setExpanded(expanded === id ? null : id); return; }
    try {
      const d = await api.getRequest(id);
      setDetail(prev => ({ ...prev, [id]: d }));
      setExpanded(id);
    } catch (e) {
      setError(e.message || 'Failed to load request details.');
    }
  };

  const filtered = filterStatus === 'all'
    ? requests
    : requests.filter(r => r.status === filterStatus);

  return (
    <div>
      {/* Page Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
        borderRadius: 20, padding: '24px 28px', marginBottom: 24,
        boxShadow: '0 4px 20px rgba(30,58,95,.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            📋 My Requests
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Travel Request History</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>Track and review all your travel requests</div>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: 'var(--muted)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✈️</div>
            <div style={{ fontSize: 14 }}>Loading your requests…</div>
          </div>
        </div>
      ) : (
        <>
          {/* Filter Bar */}
          <div style={{
            background: '#fff', borderRadius: 14, padding: '14px 20px',
            marginBottom: 16, display: 'flex', alignItems: 'center',
            gap: 16, flexWrap: 'wrap',
            boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.03)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Filter by Status</label>
              <select
                className="form-select"
                value={filterStatus}
                onChange={e => setFilter(e.target.value)}
                style={{ width: 180, borderRadius: 8 }}
              >
                <option value="all">All Statuses</option>
                {Object.entries(STATUS_MAP).map(([v, { label }]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
              {filtered.length} request{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{
              background: '#fff', borderRadius: 16, padding: '56px 24px', textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04)',
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>No requests found</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {filterStatus === 'all' ? 'You haven\'t submitted any travel requests yet.' : `No requests with status "${STATUS_MAP[filterStatus]?.label || filterStatus}".`}
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
                    <th>#</th>
                    <th>Submitted</th>
                    <th>Route</th>
                    <th>Travel Date</th>
                    <th>Transport</th>
                    <th>Purpose</th>
                    <th>Pax</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => {
                    const isOpen = expanded === r.id;
                    const det    = detail[r.id];

                    return (
                      <>
                        <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => loadDetail(r.id)}>
                          <td style={{ color: 'var(--muted)', fontWeight: 600, width: 40 }}>{idx + 1}</td>
                          <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--muted)' }}>{fmtDate(r.created_at)}</td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.outbound_from} → {r.outbound_to}</div>
                            {r.has_return && <div style={{ fontSize: 11, color: 'var(--muted)' }}>↩ {r.inbound_from} → {r.inbound_to}</div>}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.outbound_date)}</td>
                          <td style={{ fontSize: 12 }}>{r.transport_type}</td>
                          <td style={{ fontSize: 12 }}>{PURPOSE_LABEL[r.travel_purpose] || r.travel_purpose || r.purpose}</td>
                          <td style={{ textAlign: 'center' }}>{r.passenger_count ?? (det?.passengers?.length ?? '—')}</td>
                          <td><StatusPill status={r.status} /></td>
                          <td>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={e => { e.stopPropagation(); loadDetail(r.id); }}
                              style={{ fontSize: 11, borderRadius: 8, whiteSpace: 'nowrap' }}
                            >
                              {isOpen ? '▲ Hide' : '▼ Details'}
                            </button>
                          </td>
                        </tr>
                        {isOpen && det && (
                          <tr key={`${r.id}-detail`}>
                            <td colSpan={9} style={{ background: '#f8fafc', padding: '16px 20px' }}>
                              {det.pic_notes && (
                                <div style={{
                                  background: '#fffbeb', border: '1px solid #fde68a',
                                  borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: 13,
                                }}>
                                  <strong style={{ color: '#92400e' }}>PIC Notes:</strong> <span style={{ color: '#78350f' }}>{det.pic_notes}</span>
                                </div>
                              )}
                              {det.notes && (
                                <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text)' }}>
                                  <strong>Notes:</strong> {det.notes}
                                </div>
                              )}
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                                Passengers
                              </div>
                              {det.passengers && det.passengers.length > 0 ? (
                                <div style={{ overflowX: 'auto' }}>
                                  <table className="table" style={{ fontSize: 12 }}>
                                    <thead>
                                      <tr>
                                        <th>Name</th><th>Cat</th><th>UID</th><th>Gender</th>
                                        <th>ID Type</th><th>ID No.</th><th>Booking Ref</th><th>Seat</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {det.passengers.map(p => (
                                        <tr key={p.id}>
                                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                                          <td>
                                            <span style={{
                                              padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                                              background: p.category === 'EMP' ? '#dbeafe' : p.category === 'DPN' ? '#fef3c7' : '#f3e8ff',
                                              color: p.category === 'EMP' ? '#1d4ed8' : p.category === 'DPN' ? '#b45309' : '#7c3aed',
                                            }}>{p.category}</span>
                                          </td>
                                          <td>{p.uid || '—'}</td>
                                          <td>{p.gender || '—'}</td>
                                          <td>{p.id_type || '—'}</td>
                                          <td>{p.id_number || '—'}</td>
                                          <td>{p.booking_ref || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                                          <td>{p.seat_number || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div style={{ color: 'var(--muted)', fontSize: 13 }}>No passenger data available.</div>
                              )}
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
        </>
      )}
    </div>
  );
}
