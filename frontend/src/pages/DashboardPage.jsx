import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

function greetingInfo() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning',   emoji: '☀️',  bg: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)' };
  if (h < 17) return { text: 'Good afternoon', emoji: '🌤️', bg: 'linear-gradient(135deg, #1e3a5f 0%, #0d9488 100%)' };
  return       { text: 'Good evening',         emoji: '🌙', bg: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' };
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_BADGE = {
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
  const s = STATUS_BADGE[status] || { color: '#64748b', bg: '#f1f5f9', label: status };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
      color: s.color, background: s.bg,
    }}>{s.label}</span>
  );
}

function StatCard({ icon, value, label, color = 'var(--navy)', accent, onClick, isActive }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: isActive ? color : '#fff',
        borderRadius: 16, padding: '20px 24px',
        boxShadow: isActive
          ? `0 4px 20px ${color}33`
          : '0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04)',
        display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 140,
        cursor: onClick ? 'pointer' : 'default',
        border: isActive ? `2px solid ${color}` : '2px solid transparent',
        transition: 'all .15s',
        transform: isActive ? 'translateY(-2px)' : 'none',
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: isActive ? 'rgba(255,255,255,.2)' : (accent || '#f0f4ff'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: isActive ? '#fff' : color }}>{value ?? '—'}</div>
        <div style={{ fontSize: 12, marginTop: 4, fontWeight: 500, color: isActive ? 'rgba(255,255,255,.8)' : 'var(--muted)' }}>{label}</div>
      </div>
    </div>
  );
}

/* ── RTI Countdown Ticker ──────────────────────────────────────── */
function RtiTicker({ rtis }) {
  if (!rtis || rtis.length === 0) return null;

  const now = new Date();
  const items = rtis.map(rti => {
    const deadline = rti.deadline ? new Date(rti.deadline) : null;
    const daysLeft = deadline ? Math.ceil((deadline - now) / 86400000) : null;
    const isPast   = deadline && deadline < now;
    if (isPast) return null;

    const urgent   = daysLeft !== null && daysLeft <= 3;
    const warning  = daysLeft !== null && daysLeft <= 7 && daysLeft > 3;
    const label    = daysLeft === 0
      ? 'closes TODAY'
      : daysLeft === 1
        ? '1 day left'
        : `${daysLeft} days left`;

    return { rti, label, urgent, warning };
  }).filter(Boolean);

  if (items.length === 0) return null;

  const hasUrgent  = items.some(i => i.urgent);
  const hasWarning = items.some(i => i.warning);

  const bg      = hasUrgent  ? '#fef2f2' : hasWarning ? '#fffbeb' : '#f0fdf4';
  const border  = hasUrgent  ? '#fca5a5' : hasWarning ? '#fde68a' : '#86efac';
  const iconClr = hasUrgent  ? '#dc2626' : hasWarning ? '#d97706' : '#16a34a';
  const textClr = hasUrgent  ? '#991b1b' : hasWarning ? '#92400e' : '#14532d';

  const tickerText = items.map(({ rti, label, urgent }) =>
    `${urgent ? '🔴' : '📅'}  ${rti.name}  —  ${label} to submit`
  ).join('     ·     ');

  return (
    <div style={{
      background: bg, border: `1px solid ${border}`,
      borderRadius: 10, marginBottom: 18,
      display: 'flex', alignItems: 'center', overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,.06)',
    }}>
      {/* Static label */}
      <div style={{
        padding: '9px 14px', background: iconClr, color: '#fff',
        fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap',
        letterSpacing: 0.5, flexShrink: 0,
      }}>
        📢 RTI NOTICE
      </div>

      {/* Scrolling text */}
      <div style={{ overflow: 'hidden', flex: 1, position: 'relative' }}>
        <div className="rti-ticker-text" style={{ color: textClr, fontWeight: 600, fontSize: 13 }}>
          {/* duplicate for seamless loop */}
          <span>{tickerText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{tickerText}</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage({ user }) {
  const [stats, setStats]           = useState(null);
  const [requests, setRequests]     = useState([]);
  const [rtis, setRtis]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeFilter, setFilter]   = useState(null);
  const navigate                    = useNavigate();

  const isPIC = user.role === 'Manager' || user.role === 'PIC Travel';
  const gi    = greetingInfo();
  const firstName = user.name?.split(' ')[0] || 'there';

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  useEffect(() => {
    const loads = [
      api.getStats().then(setStats).catch(() => {}),
      api.getRequests(isPIC ? '?limit=50' : '?my=1&limit=5')
        .then(d => setRequests(d.requests || d))
        .catch(() => {}),
      api.getRTIs()
        .then(d => setRtis(d.filter(r => r.status === 'open')))
        .catch(() => {}),
    ];
    Promise.all(loads).finally(() => setLoading(false));
  }, [isPIC]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: 'var(--muted)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>✈️</div>
        <div style={{ fontSize: 14 }}>Loading…</div>
      </div>
    </div>
  );

  /* ─────────────────────────── HERO BANNER ─────────────────────────── */
  const HeroBanner = ({ children, actions }) => (
    <div style={{
      background: gi.bg, borderRadius: 20, padding: '28px 32px',
      marginBottom: 24, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      boxShadow: '0 4px 24px rgba(30,58,95,.18)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* decorative circle */}
      <div style={{
        position: 'absolute', right: -40, top: -40,
        width: 200, height: 200, borderRadius: '50%',
        background: 'rgba(255,255,255,.06)', pointerEvents: 'none',
      }} />
      <div style={{ position: 'absolute', right: 80, bottom: -60,
        width: 150, height: 150, borderRadius: '50%',
        background: 'rgba(255,255,255,.04)', pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 18, position: 'relative' }}>
        {/* Avatar */}
        {user.avatar ? (
          <img src={user.avatar} alt="avatar" style={{
            width: 60, height: 60, borderRadius: '50%',
            border: '3px solid rgba(255,255,255,.4)',
            objectFit: 'cover', flexShrink: 0,
          }} />
        ) : (
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'rgba(255,255,255,.18)',
            border: '3px solid rgba(255,255,255,.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: '#fff', fontWeight: 700, flexShrink: 0,
          }}>
            {user.name?.charAt(0).toUpperCase() || '?'}
          </div>
        )}
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
            {gi.text}, {firstName}! {gi.emoji}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', marginTop: 4 }}>
            {today}
          </div>
          {children}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', position: 'relative' }}>
        {actions}
      </div>
    </div>
  );

  /* ─────────────────────────── STAFF VIEW ─────────────────────────── */
  if (!isPIC) {
    const myTotal   = stats?.my_total    ?? requests.length;
    const myPending = stats?.my_pending  ?? requests.filter(r => ['submitted','processing'].includes(r.status)).length;
    const myConfirm = stats?.my_confirmed ?? requests.filter(r => r.status === 'confirmed').length;

    return (
      <div>
        <RtiTicker rtis={rtis} />
        <HeroBanner
          actions={
            <button
              className="btn"
              style={{
                background: '#fff', color: 'var(--navy)',
                fontWeight: 700, padding: '10px 22px', borderRadius: 12,
                border: 'none', fontSize: 14, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,.15)',
              }}
              onClick={() => navigate('/new-request')}
            >
              ✈️&nbsp; New Travel Request
            </button>
          }
        >
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', marginTop: 6 }}>
            {user.unit && user.campus_location
              ? `${user.unit} · ${user.campus_location}`
              : user.role}
          </div>
        </HeroBanner>

        {/* Stat Cards */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <StatCard icon="📋" value={myTotal}   label="Total Requests"   color="var(--navy)"  accent="#e0e7ff" />
          <StatCard icon="⏳" value={myPending} label="In Progress"      color="#d97706"      accent="#fef3c7" />
          <StatCard icon="✅" value={myConfirm} label="Confirmed"        color="#16a34a"      accent="#dcfce7" />
        </div>

        {/* Open RTI Events */}
        {rtis.length > 0 && (
          <div style={{
            background: '#fff', borderRadius: 16, padding: '20px 24px', marginBottom: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>📅</span> Open Group Travel
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rtis.map(rti => {
                const deadline  = rti.deadline ? new Date(rti.deadline) : null;
                const now       = new Date();
                const daysLeft  = deadline ? Math.ceil((deadline - now) / 86400000) : null;
                const isPast    = deadline && deadline < now;
                const alreadyDone = rti.my_submitted;

                return (
                  <div key={rti.id} style={{
                    background: 'var(--bg)', borderRadius: 12, padding: '14px 18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: 12,
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14 }}>{rti.name}</div>
                      {rti.description && (
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{rti.description}</div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                        {fmtDate(rti.open_date)} → {fmtDate(rti.deadline)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {!isPast && daysLeft !== null && !alreadyDone && (
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          color: daysLeft <= 3 ? '#dc2626' : '#0d9488',
                          background: daysLeft <= 3 ? '#fee2e2' : '#ccfbf1',
                        }}>
                          {daysLeft > 0 ? `${daysLeft}d left` : 'Closes today'}
                        </span>
                      )}
                      {alreadyDone ? (
                        <span style={{
                          padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                          color: '#16a34a', background: '#dcfce7',
                        }}>✓ Submitted</span>
                      ) : isPast ? (
                        <span style={{
                          padding: '4px 12px', borderRadius: 20, fontSize: 12,
                          color: 'var(--muted)', background: '#f1f5f9',
                        }}>Closed</span>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ borderRadius: 10 }}
                          onClick={() => navigate(`/new-request?rti=${rti.id}`)}
                        >
                          📋 Submit
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Requests */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🗂️</span> My Recent Requests
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/my-requests')}>
              View all →
            </button>
          </div>
          {requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>✈️</div>
              <div style={{ fontSize: 14, marginBottom: 14 }}>No travel requests yet.</div>
              <button className="btn btn-primary btn-sm" style={{ borderRadius: 10 }} onClick={() => navigate('/new-request')}>
                Submit your first request
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {requests.slice(0, 5).map(r => (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexWrap: 'wrap', gap: 8,
                  padding: '10px 14px', borderRadius: 10, background: 'var(--bg)',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                      {r.outbound_from} → {r.outbound_to}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {fmtDate(r.outbound_date)} · {PURPOSE_LABEL[r.travel_purpose] || r.travel_purpose || r.purpose}
                    </div>
                  </div>
                  <StatusPill status={r.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─────────────────────────── PIC / MANAGER VIEW ─────────────────────────── */
  const submitted   = stats?.submitted   ?? 0;
  const processing  = stats?.processing  ?? 0;
  const total_month = stats?.total_month ?? 0;
  const total_all   = stats?.total_all   ?? 0;

  return (
    <div>
      <RtiTicker rtis={rtis} />
      <HeroBanner
        actions={
          <>
            <button
              className="btn"
              style={{
                background: 'rgba(255,255,255,.18)', color: '#fff',
                fontWeight: 600, padding: '10px 18px', borderRadius: 12,
                border: '1px solid rgba(255,255,255,.3)', fontSize: 13, cursor: 'pointer',
              }}
              onClick={() => navigate('/rti-manage')}
            >
              + New RTI Event
            </button>
            <button
              className="btn"
              style={{
                background: '#fff', color: 'var(--navy)',
                fontWeight: 700, padding: '10px 18px', borderRadius: 12,
                border: 'none', fontSize: 13, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,.15)',
              }}
              onClick={() => navigate('/requests')}
            >
              📋 View All Requests
            </button>
          </>
        }
      >
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', marginTop: 6 }}>
          {user.role} · {user.unit || 'All Units'}
        </div>
      </HeroBanner>

      {/* Attention banner for pending items */}
      {(submitted > 0 || processing > 0) && (
        <div style={{
          background: 'linear-gradient(90deg, #fffbeb, #fef3c7)',
          border: '1px solid #fde68a', borderRadius: 12, padding: '12px 20px',
          marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ fontSize: 13, color: '#92400e', fontWeight: 600 }}>
            {submitted > 0 && `${submitted} request${submitted !== 1 ? 's' : ''} awaiting action`}
            {submitted > 0 && processing > 0 && ' · '}
            {processing > 0 && `${processing} currently in processing`}
          </div>
          <button
            className="btn btn-sm"
            style={{
              marginLeft: 'auto', background: '#d97706', color: '#fff',
              border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', padding: '5px 14px',
            }}
            onClick={() => navigate('/requests?status=submitted')}
          >
            Review →
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard icon="📥" value={submitted}   label="Needs Action" color="#2563eb" accent="#dbeafe"
          isActive={activeFilter === 'submitted'}
          onClick={() => setFilter(f => f === 'submitted' ? null : 'submitted')} />
        <StatCard icon="⚙️" value={processing}  label="Processing"   color="#d97706" accent="#fef3c7"
          isActive={activeFilter === 'processing'}
          onClick={() => setFilter(f => f === 'processing' ? null : 'processing')} />
        <StatCard icon="📅" value={total_month} label="This Month"   color="var(--navy)" accent="#e0e7ff"
          isActive={activeFilter === 'this_month'}
          onClick={() => setFilter(f => f === 'this_month' ? null : 'this_month')} />
        <StatCard icon="🗃️" value={total_all}   label="All Time"     color="#64748b" accent="#f1f5f9"
          isActive={activeFilter === 'all'}
          onClick={() => setFilter(f => f === 'all' ? null : 'all')} />
      </div>

      {/* Recent Requests */}
      {(() => {
        const now = new Date();
        const filtered = activeFilter === 'submitted'
          ? requests.filter(r => r.status === 'submitted')
          : activeFilter === 'processing'
          ? requests.filter(r => r.status === 'processing')
          : activeFilter === 'this_month'
          ? requests.filter(r => {
              const d = new Date(r.submitted_at);
              return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
            })
          : activeFilter === 'all'
          ? requests
          : requests.slice(0, 5);

        const filterLabel = activeFilter === 'submitted' ? 'Needs Action'
          : activeFilter === 'processing' ? 'Processing'
          : activeFilter === 'this_month' ? 'This Month'
          : activeFilter === 'all' ? 'All Time'
          : 'Recent Requests';

        const viewAllQuery = activeFilter === 'submitted' ? '?status=submitted'
          : activeFilter === 'processing' ? '?status=processing'
          : '';

        return (
          <div style={{
            background: '#fff', borderRadius: 16, padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>📋</span> {filterLabel}
                {activeFilter && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, background: '#f1f5f9', color: 'var(--muted)',
                    borderRadius: 20, padding: '2px 8px',
                  }}>{filtered.length}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {activeFilter && (
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setFilter(null)}>
                    ✕ Clear
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/requests${viewAllQuery}`)}>
                  View all →
                </button>
              </div>
            </div>
            {filtered.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
                No requests found.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Submitter</th>
                      <th>Route</th>
                      <th>Date</th>
                      <th>Purpose</th>
                      <th style={{ textAlign: 'center' }}>Pax</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.submitter_name || r.user_name || '—'}</td>
                        <td>{r.outbound_from} → {r.outbound_to}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.outbound_date)}</td>
                        <td>{PURPOSE_LABEL[r.travel_purpose] || r.travel_purpose || r.purpose}</td>
                        <td style={{ textAlign: 'center' }}>{r.passenger_count ?? '—'}</td>
                        <td><StatusPill status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
