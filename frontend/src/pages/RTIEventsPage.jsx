import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function RTIEventsPage({ user }) {
  const [rtis, setRtis]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.getRTIs()
      .then(d => setRtis(d))
      .catch(e => setError(e.message || 'Failed to load RTI events.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: 'var(--muted)', padding: 8 }}>Loading…</div>;

  const openEvents   = rtis.filter(r => r.status === 'open');
  const closedEvents = rtis.filter(r => r.status !== 'open');

  const renderCard = (rti, forceDisabled = false) => {
    const now        = new Date();
    const deadline   = rti.deadline ? new Date(rti.deadline) : null;
    const isPast     = deadline ? deadline < now : forceDisabled;
    const daysLeft   = deadline && !isPast ? Math.ceil((deadline - now) / 86400000) : null;
    const submitted  = rti.my_submitted;
    const disabled   = isPast || forceDisabled;

    return (
      <div key={rti.id} className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)', marginBottom: 4 }}>
              {rti.name}
            </div>
            {rti.description && (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>{rti.description}</div>
            )}
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
              📅 Open: {fmtDate(rti.open_date)} &nbsp;→&nbsp; Deadline: {fmtDate(rti.deadline)}
            </div>
            {rti.routes && rti.routes.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                Routes: {rti.routes.map(rt => `${rt.from_airport} → ${rt.to_airport}`).join(', ')}
              </div>
            )}
            {!isPast && daysLeft !== null && (
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: daysLeft <= 3 ? '#ef4444' : 'var(--teal)',
                marginTop: 4,
              }}>
                {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining` : 'Closes today!'}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            {submitted ? (
              <span className="badge badge-green" style={{ fontSize: 12, padding: '4px 12px' }}>Submitted ✓</span>
            ) : isPast ? (
              <span className="badge badge-grey" style={{ fontSize: 12, padding: '4px 12px' }}>Closed</span>
            ) : null}

            <button
              className={`btn btn-primary btn-sm`}
              disabled={disabled}
              onClick={() => navigate(`/new-request?rti=${rti.id}`)}
              style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              📋 Submit Form
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">RTI Events</div>
          <div className="page-subtitle">Open travel registration events for staff</div>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {openEvents.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
          No open RTI events at the moment. Check back later.
        </div>
      )}

      {openEvents.map(rti => renderCard(rti))}

      {/* Closed / Past Events */}
      {closedEvents.length > 0 && (
        <div>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 8, marginBottom: 12 }}
            onClick={() => setShowClosed(s => !s)}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Past Events ({closedEvents.length})
            </span>
            <span style={{ color: 'var(--muted)', fontSize: 14 }}>{showClosed ? '▲' : '▼'}</span>
          </div>

          {showClosed && closedEvents.map(rti => renderCard(rti, true))}
        </div>
      )}
    </div>
  );
}
