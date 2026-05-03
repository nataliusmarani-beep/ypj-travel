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
                {filterStatus === 'all' ? "You haven't submitted any travel requests yet." : `No requests with status "${STATUS_MAP[filterStatus]?.label || filterStatus}".`}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(r => {
                const isOpen = expanded === r.id;
                const det    = detail[r.id];

                return (
                  <div key={r.id} style={{
                    background: '#fff', borderRadius: 16, overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04)',
                    border: isOpen ? '1.5px solid var(--primary)' : '1.5px solid transparent',
                  }}>
                    {/* ── Request card header ── */}
                    <div
                      style={{ padding: '16px 18px', cursor: 'pointer' }}
                      onClick={() => loadDetail(r.id)}
                    >
                      {/* Row 1: # + status + date */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>#{r.id}</span>
                          <StatusPill status={r.status} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtDate(r.submitted_at)}</span>
                      </div>

                      {/* Row 2: Route */}
                      <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)', marginBottom: 4 }}>
                        {r.outbound_from} → {r.outbound_to}
                      </div>
                      {r.has_inbound && (
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                          ↩ {r.inbound_from} → {r.inbound_to}
                        </div>
                      )}

                      {/* Row 3: chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {[
                          ['✈️', r.transport_type],
                          ['📅', fmtDate(r.outbound_date)],
                          ['🎯', PURPOSE_LABEL[r.travel_purpose] || r.travel_purpose],
                          ['👥', `${r.passenger_count ?? '?'} pax`],
                        ].map(([icon, val]) => val && (
                          <span key={icon} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: '#f1f5f9', borderRadius: 20,
                            padding: '3px 10px', fontSize: 11, color: 'var(--text)',
                          }}>
                            {icon} {val}
                          </span>
                        ))}
                      </div>

                      {/* Toggle */}
                      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>
                        {isOpen ? '▲ Hide details' : '▼ Show details'}
                      </div>
                    </div>

                    {/* ── Expanded detail ── */}
                    {isOpen && det && (
                      <div style={{ borderTop: '1px solid var(--border)', background: '#f8fafc', padding: '16px 18px' }}>

                        {/* PIC Notes */}
                        {det.pic_notes && (
                          <div style={{
                            background: '#fffbeb', border: '1px solid #fde68a',
                            borderRadius: 10, padding: '10px 14px', marginBottom: 14,
                          }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>📋 PIC Notes</div>
                            <div style={{ fontSize: 13, color: '#78350f' }}>{det.pic_notes}</div>
                            {det.pic_action_by && (
                              <div style={{ marginTop: 6, fontSize: 11, color: '#a16207', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span>👤</span>
                                <strong>{det.pic_action_by}</strong>
                                {det.pic_action_at && <span style={{ color: '#ca8a04' }}>· {fmtDate(det.pic_action_at)}</span>}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Requestor notes */}
                        {det.notes && (
                          <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--text)' }}>
                            <strong>Notes:</strong> {det.notes}
                          </div>
                        )}

                        {/* Passengers */}
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                          Passengers ({det.passengers?.length || 0})
                        </div>

                        {det.passengers && det.passengers.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {det.passengers.map((p, pi) => (
                              <div key={p.id} style={{
                                background: '#fff', border: '1px solid var(--border)',
                                borderRadius: 10, padding: '12px 14px',
                              }}>
                                {/* Passenger name + badge */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>
                                    {pi + 1}. {p.passenger_name}
                                  </div>
                                  <span style={{
                                    padding: '2px 9px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                                    background: p.category === 'EMP' ? '#dbeafe' : p.category === 'DPN' ? '#fef3c7' : '#f3e8ff',
                                    color: p.category === 'EMP' ? '#1d4ed8' : p.category === 'DPN' ? '#b45309' : '#7c3aed',
                                  }}>{p.category}</span>
                                </div>

                                {/* Key-value rows */}
                                {[
                                  ['UID',         p.uid],
                                  ['Gender',      p.gender],
                                  ['ID Type',     p.id_type],
                                  ['ID Number',   p.id_number],
                                  ['Booking Ref', p.booking_ref],
                                ].map(([label, val]) => val ? (
                                  <div key={label} style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    alignItems: 'center', paddingTop: 6,
                                    borderTop: '1px solid #f1f5f9', fontSize: 12,
                                  }}>
                                    <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
                                    <span style={{ color: 'var(--text)', fontWeight: 500, textAlign: 'right' }}>{val}</span>
                                  </div>
                                ) : null)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: 'var(--muted)', fontSize: 13 }}>No passenger data available.</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
