import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function RTIEventsPage({ user }) {
  const [rtis, setRtis]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.getRTIs()
      .then(d => setRtis(d))
      .catch(e => setError(e.message || 'Failed to load RTI events.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: 'var(--muted)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
        <div style={{ fontSize: 14 }}>Loading events…</div>
      </div>
    </div>
  );

  const openEvents   = rtis.filter(r => r.status === 'open');
  const closedEvents = rtis.filter(r => r.status !== 'open');

  const renderCard = (rti, forceDisabled = false) => {
    const now       = new Date();
    const deadline  = rti.deadline ? new Date(rti.deadline) : null;
    const isPast    = deadline ? deadline < now : forceDisabled;
    const daysLeft  = deadline && !isPast ? Math.ceil((deadline - now) / 86400000) : null;
    const submitted = rti.my_submitted;
    const disabled  = isPast || forceDisabled;

    const urgency = daysLeft !== null && daysLeft <= 3;

    return (
      <div key={rti.id} style={{
        background: '#fff', borderRadius: 16,
        padding: '20px 24px', marginBottom: 12,
        boxShadow: urgency && !disabled
          ? '0 0 0 2px #ef4444, 0 4px 16px rgba(239,68,68,.1)'
          : '0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04)',
        opacity: disabled ? 0.7 : 1,
        transition: 'box-shadow .2s',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>{rti.name}</div>
              {submitted && (
                <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#dcfce7' }}>
                  ✓ Submitted
                </span>
              )}
              {isPast && !submitted && (
                <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, color: 'var(--muted)', background: '#f1f5f9' }}>
                  Closed
                </span>
              )}
            </div>

            {rti.description && (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>{rti.description}</div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: 'var(--muted)' }}>
              <span>📅 Opens: <strong style={{ color: 'var(--text)' }}>{fmtDate(rti.open_date)}</strong></span>
              <span>⏰ Deadline: <strong style={{ color: isPast ? '#dc2626' : 'var(--text)' }}>{fmtDate(rti.deadline)}</strong></span>
            </div>

            {rti.routes && rti.routes.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {rti.routes.map((rt, i) => (
                  <span key={i} style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    color: '#1d4ed8', background: '#dbeafe',
                  }}>
                    {rt.from_airport} → {rt.to_airport}
                  </span>
                ))}
              </div>
            )}

            {!isPast && daysLeft !== null && (
              <div style={{
                marginTop: 10,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                color: urgency ? '#dc2626' : '#0d9488',
                background: urgency ? '#fee2e2' : '#ccfbf1',
              }}>
                {urgency ? '⚠️' : '⏳'} {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining` : 'Closes today!'}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <button
              style={{
                padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
                background: disabled
                  ? '#f1f5f9'
                  : submitted
                    ? '#dcfce7'
                    : 'linear-gradient(135deg, #1e3a5f, #2563eb)',
                color: disabled ? 'var(--muted)' : submitted ? '#16a34a' : '#fff',
                boxShadow: disabled ? 'none' : '0 4px 12px rgba(37,99,235,.3)',
                opacity: disabled && !submitted ? 0.6 : 1,
              }}
              disabled={disabled}
              onClick={() => navigate(`/new-request?rti=${rti.id}`)}
            >
              {submitted ? '✓ Submitted' : disabled ? 'Closed' : '📋 Submit Form'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #16a34a 100%)',
        borderRadius: 20, padding: '24px 28px', marginBottom: 24,
        boxShadow: '0 4px 20px rgba(30,58,95,.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            📅 Routine Travel Itinerary (RTI)
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>RTI Events</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>Open travel registration events for staff</div>
        </div>
        {openEvents.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,.2)', borderRadius: 12, padding: '8px 18px',
            color: '#fff', fontWeight: 700, fontSize: 14, position: 'relative',
          }}>
            {openEvents.length} open event{openEvents.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
          {error}
        </div>
      )}

      {openEvents.length === 0 ? (
        <div style={{
          background: '#fff', borderRadius: 16, padding: '56px 24px', textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04)',
        }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>No open RTI events</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Check back later for upcoming travel registration events.</div>
        </div>
      ) : (
        openEvents.map(rti => renderCard(rti))
      )}

      {/* Closed / Past Events */}
      {closedEvents.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              cursor: 'pointer', marginBottom: 12,
              padding: '10px 16px', borderRadius: 12,
              background: showClosed ? 'var(--bg)' : 'transparent',
            }}
            onClick={() => setShowClosed(s => !s)}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Past Events ({closedEvents.length})
            </span>
            <span style={{ color: 'var(--muted)', fontSize: 14, marginLeft: 'auto' }}>
              {showClosed ? '▲ Hide' : '▼ Show'}
            </span>
          </div>
          {showClosed && closedEvents.map(rti => renderCard(rti, true))}
        </div>
      )}
    </div>
  );
}
