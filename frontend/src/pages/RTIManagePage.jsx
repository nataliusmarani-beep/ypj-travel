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

export default function RTIManagePage({ user }) {
  const [rtis, setRtis]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(emptyForm());
  const [saving, setSaving]     = useState(false);
  const [selectedRti, setSelectedRti] = useState(null); // detail view
  const [detailData, setDetailData]   = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = () => {
    setLoading(true);
    api.getRTIs()
      .then(setRtis)
      .catch(e => setError(e.message || 'Failed to load.'))
      .finally(() => setLoading(false));
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm());
    setShowModal(true);
  };

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
    if (!form.name.trim())  { setError('Name is required.'); return; }
    if (!form.deadline)     { setError('Deadline is required.'); return; }
    setSaving(true); setError('');
    try {
      if (editId) {
        await api.updateRTI(editId, form);
      } else {
        await api.createRTI(form);
      }
      setShowModal(false);
      load();
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

  const statusBadge = (s) => {
    if (s === 'open')     return <span className="badge badge-green">Open</span>;
    if (s === 'closed')   return <span className="badge badge-grey">Closed</span>;
    if (s === 'cancelled') return <span className="badge badge-red">Cancelled</span>;
    return <span className="badge badge-grey">{s}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Manage RTI Events</div>
          <div className="page-subtitle">Create and manage RTI travel registration events</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ New RTI Event</button>
      </div>

      {error && <div className="error-box">{error}</div>}
      {loading && <div style={{ color: 'var(--muted)' }}>Loading…</div>}

      {/* RTI Detail View */}
      {selectedRti && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div className="card-title" style={{ marginBottom: 4 }}>{selectedRti.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Deadline: {fmtDate(selectedRti.deadline)}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-success btn-sm" onClick={handleExportDetail}>⬇️ Export</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedRti(null)}>✕ Close</button>
            </div>
          </div>
          {detailLoading ? (
            <div style={{ color: 'var(--muted)' }}>Loading submissions…</div>
          ) : detailData ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>
                {detailData.submission_count ?? (detailData.submissions?.length ?? 0)} Submission(s)
              </div>
              {detailData.submissions && detailData.submissions.length > 0 ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Submitted</th><th>Submitter</th><th>Route</th><th>Pax</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailData.submissions.map(s => (
                      <tr key={s.id}>
                        <td>{fmtDate(s.created_at)}</td>
                        <td>{s.submitter_name || s.user_name || '—'}</td>
                        <td>{s.outbound_from} → {s.outbound_to}</td>
                        <td>{s.passenger_count ?? '—'}</td>
                        <td><span className={`badge badge-${s.status === 'confirmed' ? 'green' : 'blue'}`}>{s.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>No submissions yet.</div>
              )}
            </>
          ) : (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Could not load detail.</div>
          )}
        </div>
      )}

      {/* RTI List */}
      {!loading && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Open Date</th>
                <th>Deadline</th>
                <th>Routes</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rtis.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No RTI events yet.</td></tr>
              )}
              {rtis.map(rti => (
                <tr key={rti.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{rti.name}</div>
                    {rti.description && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{rti.description}</div>}
                  </td>
                  <td>{fmtDate(rti.open_date)}</td>
                  <td>{fmtDate(rti.deadline)}</td>
                  <td style={{ fontSize: 12 }}>
                    {rti.routes && rti.routes.map(r => `${r.from_airport}→${r.to_airport}`).join(', ')}
                  </td>
                  <td>{statusBadge(rti.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openDetail(rti)}>📊 View</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(rti)}>Edit</button>
                      {rti.status === 'open' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleStatusChange(rti.id, 'closed')} style={{ color: '#d97706' }}>Close</button>
                      )}
                      {rti.status !== 'cancelled' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleStatusChange(rti.id, 'cancelled')} style={{ color: '#ef4444' }}>Cancel</button>
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
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editId ? 'Edit RTI Event' : 'New RTI Event'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {error && <div className="error-box">{error}</div>}
              <div className="form-group">
                <label className="form-label">Event Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. School Holiday 2025" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional details about this event" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Open Date</label>
                  <input className="form-input" type="date" value={form.open_date} onChange={e => setForm(f => ({ ...f, open_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Deadline *</label>
                  <input className="form-input" type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                </div>
              </div>

              <div className="section-title" style={{ marginTop: 4 }}>Routes</div>
              {form.routes.map((r, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <select className="form-select" value={r.from_airport} onChange={e => updateRoute(idx, 'from_airport', e.target.value)} style={{ flex: 1 }}>
                    {AIRPORTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <span style={{ color: 'var(--muted)', fontWeight: 700 }}>→</span>
                  <select className="form-select" value={r.to_airport} onChange={e => updateRoute(idx, 'to_airport', e.target.value)} style={{ flex: 1 }}>
                    {AIRPORTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  {form.routes.length > 1 && (
                    <button className="btn btn-danger btn-sm" onClick={() => removeRoute(idx)}>✕</button>
                  )}
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" onClick={addRoute} style={{ marginBottom: 16 }}>+ Add Route</button>

              {!editId && (
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    id="announce"
                    checked={form.announce}
                    onChange={e => setForm(f => ({ ...f, announce: e.target.checked }))}
                    style={{ width: 16, height: 16 }}
                  />
                  <label htmlFor="announce" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
                    Announce to all staff
                  </label>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
