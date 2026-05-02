import { useState, useEffect } from 'react';
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
      <div className="page-header">
        <div>
          <div className="page-title">My Requests</div>
          <div className="page-subtitle">Your travel request history</div>
        </div>
      </div>

      {error   && <div className="error-box">{error}</div>}
      {loading && <div style={{ color: 'var(--muted)' }}>Loading…</div>}

      {!loading && (
        <>
          {/* Filter */}
          <div className="filter-bar">
            <div className="form-group">
              <label className="form-label">Filter by Status</label>
              <select className="form-select" value={filterStatus} onChange={e => setFilter(e.target.value)} style={{ width: 180 }}>
                <option value="all">All Statuses</option>
                {Object.entries(STATUS_MAP).map(([v, { label }]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', alignSelf: 'flex-end', paddingBottom: 2 }}>
              {filtered.length} request{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
              No requests found.
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => {
                    const sb      = STATUS_MAP[r.status] || { cls: 'badge-grey', label: r.status };
                    const isOpen  = expanded === r.id;
                    const det     = detail[r.id];

                    return (
                      <>
                        <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => loadDetail(r.id)}>
                          <td style={{ color: 'var(--muted)', fontWeight: 600 }}>{idx + 1}</td>
                          <td>{fmtDate(r.created_at)}</td>
                          <td>
                            <div>{r.outbound_from} → {r.outbound_to}</div>
                            {r.has_return && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.inbound_from} → {r.inbound_to}</div>}
                          </td>
                          <td>{fmtDate(r.outbound_date)}</td>
                          <td>{r.transport_type}</td>
                          <td>{r.purpose}</td>
                          <td>{r.passenger_count ?? (det?.passengers?.length ?? '—')}</td>
                          <td><span className={`badge ${sb.cls}`}>{sb.label}</span></td>
                          <td>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={e => { e.stopPropagation(); loadDetail(r.id); }}
                            >
                              {isOpen ? '▲ Hide' : '▼ Details'}
                            </button>
                          </td>
                        </tr>
                        {isOpen && det && (
                          <tr key={`${r.id}-detail`}>
                            <td colSpan={9} style={{ background: '#f8fafc', padding: '14px 16px' }}>
                              {det.pic_notes && (
                                <div style={{ marginBottom: 12, fontSize: 13 }}>
                                  <strong>PIC Notes:</strong> {det.pic_notes}
                                </div>
                              )}
                              {det.notes && (
                                <div style={{ marginBottom: 12, fontSize: 13 }}>
                                  <strong>Notes:</strong> {det.notes}
                                </div>
                              )}
                              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>Passengers</div>
                              {det.passengers && det.passengers.length > 0 ? (
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
                                        <td>{p.name}</td>
                                        <td>{p.category}</td>
                                        <td>{p.uid}</td>
                                        <td>{p.gender}</td>
                                        <td>{p.id_type}</td>
                                        <td>{p.id_number}</td>
                                        <td>{p.booking_ref || '—'}</td>
                                        <td>{p.seat_number || '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div style={{ color: 'var(--muted)', fontSize: 13 }}>No passenger data.</div>
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
