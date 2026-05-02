import { useState, useEffect } from 'react';
import { api } from '../api.js';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const AIRPORTS = ['TIM', 'CGK', 'UPG', 'SUB', 'DPS', 'YIA', 'MDC'];

const emptyForm = () => ({
  name: '', description: '', open_date: '', deadline: '',
  routes: [{ from_airport: 'TIM', to_airport: 'CGK' }],
  announce: false,
});

function StatusBadge({ status }) {
  const map = {
    open:      { color: '#16a34a', bg: '#dcfce7', label: 'Open' },
    closed:    { color: '#64748b', bg: '#f1f5f9', label: 'Closed' },
    cancelled: { color: '#dc2626', bg: '#fee2e2', label: 'Cancelled' },
  };
  const s = map[status] || { color: '#64748b', bg: '#f1f5f9', label: status };
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, color: s.color, background: s.bg,
    }}>{s.label}</span>
  );
}

export default function RTIManagePage({ user }) {
  const [rtis, setRtis]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [editId, setEditId]           = useState(null);
  const [form, setForm]               = useState(emptyForm());
  const [saving, setSaving]           = useState(false);
  const [selectedRti, setSelectedRti] = useState(null);
  const [detailData, setDetailData]   = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { load(); }, []);

  const load = () => {
    setLoading(true);
    api.getRTIs()
      .then(setRtis)
      .catch(e => setError(e.message || 'Failed to load.'))
      .finally(() => setLoading(false));
  };

  const openNew = () => { setEditId(null); setForm(emptyForm()); setShowModal(true); };

  const openEdit = (rti) => {
    setEditId(rti.id);
    setForm({
      name:        rti.name        || '',
      description: rti.description || '',
      open_date:   rti.open_date   ? rti.open_date.slice(0, 10) : '',
      deadline:    rti.deadline    ? rti.deadline.slice(0, 10)  : '',
      routes:      rti.routes && rti.routes.length > 0
        ? rti.routes.map(r => ({ from_airport: r.from_airport, to_airport: r.to_airport }))
        : [{ from_airport: 'TIM', to_airport: 'CGK' }],
      announce: false,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.deadline)    { setError('Deadline is required.'); return; }
    setSaving(true); setError('');
    try {
      if (editId) { await api.updateRTI(editId, form); }
      else        { await api.createRTI(form); }
      setShowModal(false); load();
    } catch (e) {
      setError(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.updateRTI(id, { status: newStatus });
      setRtis(rs => rs.map(r => r.id === id ? { ...r, status: newStatus } : r));
    } catch (e) {
      setError(e.message || 'Update failed.');
    }
  };

  const openDetail = async (rti) => {
    setSelectedRti(rti);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const d = await api.getRTI(rti.id);
      setDetailData(d);
    } catch {
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExportDetail = async () => {
    if (!selectedRti) return;
    try {
      const blob = await api.exportRequests(`?rti_id=${selectedRti.id}`);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `rti_${selectedRti.id}_export.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message || 'Export failed.');
    }
  };

  const addRoute    = () => setForm(f => ({ ...f, routes: [...f.routes, { from_airport: 'TIM', to_airport: 'CGK' }] }));
  const removeRoute = (idx) => setForm(f => ({ ...f, routes: f.routes.filter((_, i) => i !== idx) }));
  const updateRoute = (idx, field, val) => setForm(f => ({
    ...f, routes: f.routes.map((r, i) => i === idx ? { ...r, [field]: val } : r),
  }));

  const openCount = rtis.filter(r => r.status === 'open').length;

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
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Manage RTI Events</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>
            {openCount} open · {rtis.length} total events
          </div>
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
          + New RTI Event
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* Detail View */}
      {selectedRti && (
        <div style={{
          background: '#fff', borderRadius: 16, padding: '20px 24px', marginBottom: 20,
          boxShadow: '0 0 0 2px #2563eb, 0 4px 16px rgba(37,99,235,.1)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)', marginBottom: 4 }}>{selectedRti.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Deadline: {fmtDate(selectedRti.deadline)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={{
                  padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                  background: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer',
                }}
                onClick={handleExportDetail}
              >
                ⬇️ Export
              </button>
              <button
                style={{
                  padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                  background: '#f1f5f9', color: 'var(--muted)', border: 'none', cursor: 'pointer',
                }}
                onClick={() => setSelectedRti(null)}
              >
                ✕ Close
              </button>
            </div>
          </div>

          {detailLoading ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 13 }}>Loading submissions…</div>
            </div>
          ) : detailData ? (
            <>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', borderRadius: 10, marginBottom: 14,
                background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, fontSize: 13,
              }}>
                👤 {detailData.submission_count ?? (detailData.submissions?.length ?? 0)} Submission{(detailData.submission_count ?? detailData.submissions?.length ?? 0) !== 1 ? 's' : ''}
              </div>
              {detailData.submissions && detailData.submissions.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Submitted</th><th>Submitter</th><th>Route</th><th style={{ textAlign: 'center' }}>Pax</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.submissions.map(s => (
                        <tr key={s.id}>
                          <td style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtDate(s.created_at)}</td>
                          <td style={{ fontWeight: 600 }}>{s.submitter_name || s.user_name || '—'}</td>
                          <td>{s.outbound_from} → {s.outbound_to}</td>
                          <td style={{ textAlign: 'center' }}>{s.passenger_count ?? '—'}</td>
                          <td>
                            <span style={{
                              padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                              color: s.status === 'confirmed' ? '#16a34a' : '#2563eb',
                              background: s.status === 'confirmed' ? '#dcfce7' : '#dbeafe',
                            }}>{s.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>
                  No submissions yet for this event.
                </div>
              )}
            </>
          ) : (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Could not load submissions.</div>
          )}
        </div>
      )}

      {/* RTI List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: 'var(--muted)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
            <div style={{ fontSize: 14 }}>Loading events…</div>
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
                <th>Event Name</th>
                <th>Open Date</th>
                <th>Deadline</th>
                <th>Routes</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rtis.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 48 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
                    <div>No RTI events yet. Create one to get started.</div>
                  </td>
                </tr>
              )}
              {rtis.map(rti => (
                <tr key={rti.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{rti.name}</div>
                    {rti.description && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{rti.description}</div>}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(rti.open_date)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(rti.deadline)}</td>
                  <td>
                    {rti.routes && rti.routes.map((r, i) => (
                      <span key={i} style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 6,
                        fontSize: 11, fontWeight: 600, marginRight: 4,
                        color: '#1d4ed8', background: '#dbeafe',
                      }}>{r.from_airport}→{r.to_airport}</span>
                    ))}
                  </td>
                  <td><StatusBadge status={rti.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ borderRadius: 8, fontSize: 11 }}
                        onClick={() => openDetail(rti)}
                      >
                        📊 View
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ borderRadius: 8, fontSize: 11 }}
                        onClick={() => openEdit(rti)}
                      >
                        Edit
                      </button>
                      {rti.status === 'open' && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ borderRadius: 8, fontSize: 11, color: '#d97706' }}
                          onClick={() => handleStatusChange(rti.id, 'closed')}
                        >
                          Close
                        </button>
                      )}
                      {rti.status !== 'cancelled' && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ borderRadius: 8, fontSize: 11, color: '#dc2626' }}
                          onClick={() => handleStatusChange(rti.id, 'cancelled')}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 600, borderRadius: 20 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editId ? 'Edit RTI Event' : 'New RTI Event'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
                  {error}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Event Name *</label>
                <input
                  className="form-input" style={{ borderRadius: 10 }}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. School Holiday 2025"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea" style={{ borderRadius: 10 }}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional details about this event"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Open Date</label>
                  <input className="form-input" style={{ borderRadius: 10 }} type="date" value={form.open_date} onChange={e => setForm(f => ({ ...f, open_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Deadline *</label>
                  <input className="form-input" style={{ borderRadius: 10 }} type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                </div>
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, marginTop: 4 }}>
                Routes
              </div>
              {form.routes.map((r, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <select className="form-select" style={{ flex: 1, borderRadius: 8 }} value={r.from_airport} onChange={e => updateRoute(idx, 'from_airport', e.target.value)}>
                    {AIRPORTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <span style={{ color: 'var(--muted)', fontWeight: 700, fontSize: 16 }}>→</span>
                  <select className="form-select" style={{ flex: 1, borderRadius: 8 }} value={r.to_airport} onChange={e => updateRoute(idx, 'to_airport', e.target.value)}>
                    {AIRPORTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  {form.routes.length > 1 && (
                    <button
                      style={{ padding: '6px 10px', borderRadius: 8, background: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                      onClick={() => removeRoute(idx)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: 8, marginBottom: 16 }}
                onClick={addRoute}
              >
                + Add Route
              </button>

              {!editId && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 10, background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                }}>
                  <input
                    type="checkbox"
                    id="announce"
                    checked={form.announce}
                    onChange={e => setForm(f => ({ ...f, announce: e.target.checked }))}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <label htmlFor="announce" style={{ fontSize: 13, fontWeight: 600, color: '#15803d', cursor: 'pointer' }}>
                    📢 Announce to all staff via email
                  </label>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" style={{ borderRadius: 10 }} onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ borderRadius: 10 }} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
