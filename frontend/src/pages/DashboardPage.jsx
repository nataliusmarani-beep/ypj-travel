import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_BADGE = {
  submitted:        { cls: 'badge-blue',   label: 'Submitted' },
  processing:       { cls: 'badge-amber',  label: 'Processing' },
  booked:           { cls: 'badge-teal',   label: 'Booked' },
  awaiting_payment: { cls: 'badge-orange', label: 'Awaiting Payment' },
  confirmed:        { cls: 'badge-green',  label: 'Confirmed' },
  cancelled:        { cls: 'badge-red',    label: 'Cancelled' },
};

export default function DashboardPage({ user }) {
  const [stats, setStats]     = useState(null);
  const [requests, setRequests] = useState([]);
  const [rtis, setRtis]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const navigate              = useNavigate();

  const isPIC = user.role === 'Manager' || user.role === 'PIC Travel';

  useEffect(() => {
    const loads = [
      api.getStats().then(setStats).catch(() => {}),
      api.getRequests(isPIC ? '?limit=5' : '?my=1&limit=5').then(d => setRequests(d.requests || d)).catch(() => {}),
    ];
    if (!isPIC) {
      loads.push(api.getRTIs().then(d => setRtis(d.filter(r => r.status === 'open'))).catch(() => {}));
    }
    Promise.all(loads).finally(() => setLoading(false));
  }, [isPIC]);

  if (loading) return <div style={{ color: 'var(--muted)', padding: 8 }}>Loading…</div>;
  if (error)   return <div className="error-box">{error}</div>;

  const today = new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  /* ── Staff View ── */
  if (!isPIC) {
    const myTotal   = stats?.my_total   ?? requests.length;
    const myPending = stats?.my_pending ?? requests.filter(r => ['submitted','processing'].includes(r.status)).length;
    const myConfirm = stats?.my_confirmed ?? requests.filter(r => r.status === 'confirmed').length;

    return (
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">{greeting()}, {user.name?.split(' ')[0] || 'there'}!</div>
            <div className="page-subtitle">{today}</div>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/new-request')}>
            ✈️ New Request
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{myTotal}</div>
            <div className="stat-label">My Total Requests</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#d97706' }}>{myPending}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#16a34a' }}>{myConfirm}</div>
            <div className="stat-label">Confirmed</div>
          </div>
        </div>

        {/* Open RTI Events */}
        {rtis.length > 0 && (
          <div className="card">
            <div className="card-title">📅 Open RTI Events</div>
            {rtis.map(rti => {
              const deadline    = rti.deadline ? new Date(rti.deadline) : null;
              const now         = new Date();
              const daysLeft    = deadline ? Math.ceil((deadline - now) / 86400000) : null;
              const isPast      = deadline && deadline < now;
              const alreadyDone = rti.my_submitted;

              return (
                <div key={rti.id} className="passenger-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: 2 }}>{rti.name}</div>
                    {rti.description && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{rti.description}</div>}
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {fmtDate(rti.open_date)} → {fmtDate(rti.deadline)}
                    </div>
                    {!isPast && daysLeft !== null && (
                      <div style={{ fontSize: 12, fontWeight: 600, color: daysLeft <= 3 ? '#ef4444' : 'var(--teal)', marginTop: 3 }}>
                        {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining` : 'Closes today'}
                      </div>
                    )}
                  </div>
                  <div>
                    {alreadyDone ? (
                      <span className="badge badge-green">Submitted ✓</span>
                    ) : isPast ? (
                      <span className="badge badge-grey">Closed</span>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/new-request?rti=${rti.id}`)}
                      >
                        📋 Submit Form
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent Requests */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>My Recent Requests</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/my-requests')}>View all →</button>
          </div>
          {requests.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>No requests yet. <button className="btn btn-primary btn-sm" style={{ marginLeft: 8 }} onClick={() => navigate('/new-request')}>Submit one</button></div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Travel Date</th>
                  <th>Purpose</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.slice(0, 5).map(r => {
                  const sb = STATUS_BADGE[r.status] || { cls: 'badge-grey', label: r.status };
                  return (
                    <tr key={r.id}>
                      <td>{r.outbound_from} → {r.outbound_to}</td>
                      <td>{fmtDate(r.outbound_date)}</td>
                      <td>{r.purpose}</td>
                      <td><span className={`badge ${sb.cls}`}>{sb.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  /* ── PIC / Manager View ── */
  const submitted       = stats?.submitted       ?? 0;
  const processing      = stats?.processing      ?? 0;
  const total_month     = stats?.total_month     ?? 0;
  const total_all       = stats?.total_all       ?? 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">{today}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/rti-manage')}>+ New RTI Event</button>
          <button className="btn btn-primary"   onClick={() => navigate('/requests')}>View All Requests</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#2563eb' }}>{submitted}</div>
          <div className="stat-label">Submitted (Pending)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#d97706' }}>{processing}</div>
          <div className="stat-label">Processing</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{total_month}</div>
          <div className="stat-label">Total This Month</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{total_all}</div>
          <div className="stat-label">Total All Time</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Recent Requests</div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/requests')}>View all →</button>
        </div>
        {requests.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>No requests yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Submitter</th>
                <th>Route</th>
                <th>Date</th>
                <th>Purpose</th>
                <th>Pax</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.slice(0, 5).map(r => {
                const sb = STATUS_BADGE[r.status] || { cls: 'badge-grey', label: r.status };
                return (
                  <tr key={r.id}>
                    <td>{r.submitter_name || r.user_name || '—'}</td>
                    <td>{r.outbound_from} → {r.outbound_to}</td>
                    <td>{fmtDate(r.outbound_date)}</td>
                    <td>{r.purpose}</td>
                    <td>{r.passenger_count ?? '—'}</td>
                    <td><span className={`badge ${sb.cls}`}>{sb.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
