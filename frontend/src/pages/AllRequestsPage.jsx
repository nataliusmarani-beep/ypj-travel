import { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import StatusTracker from '../components/StatusTracker.jsx';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_MAP = {
  submitted:        { color: '#2563eb', bg: '#dbeafe', label: 'Submitted' },
  processing:       { color: '#d97706', bg: '#fef3c7', label: 'Processing' },
  booked:           { color: '#0d9488', bg: '#ccfbf1', label: 'Booked' },
  awaiting_payment: { color: '#ea580c', bg: '#ffedd5', label: 'Payment' },
  confirmed:        { color: '#16a34a', bg: '#dcfce7', label: 'Confirmed' },
  cancelled:        { color: '#dc2626', bg: '#fee2e2', label: 'Cancelled' },
};

const PURPOSE_LABEL = {
  VAC: 'Vacation', EMG: 'Emergency', MED: 'Medical',
  COBUS: 'Company Business', FAMILY: 'Family', OTHER: 'Other',
};

const PURPOSE_OPTIONS = ['VAC', 'EMG', 'MED', 'COBUS', 'FAMILY', 'OTHER'];

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

export default function AllRequestsPage({ user }) {
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const [fStatus, setFStatus]     = useState('');
  const [fPurpose, setFPurpose]   = useState('');
  const [fTransport, setFTransport] = useState('');
  const [fDateFrom, setFDateFrom] = useState('');
  const [fDateTo, setFDateTo]     = useState('');
  const [fSearch, setFSearch]     = useState('');

  const [expanded, setExpanded]   = useState(null);
  const [detail, setDetail]       = useState({});
  const [statusModal, setStatusModal] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [picNotes, setPicNotes]   = useState('');
  const [updating, setUpdating]   = useState(false);

  const [bookingModal, setBookingModal] = useState(null); // { request, detail }

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

  const openBookingModal = async (r) => {
    // Ensure detail is loaded
    let det = detail[r.id];
    if (!det) {
      try {
        det = await api.getRequest(r.id);
        setDetail(prev => ({ ...prev, [r.id]: det }));
      } catch { return; }
    }
    setBookingModal({ request: r, detail: det });
  };

  const handleSectionSave = async (requestId, section, formData, updatedFields) => {
    const result = await api.updateSection(requestId, formData);
    const newStatus = result.status;
    setRequests(rs => rs.map(r => r.id === requestId ? { ...r, status: newStatus } : r));
    setDetail(prev => {
      const d = prev[requestId];
      if (!d) return prev;
      return { ...prev, [requestId]: { ...d, ...updatedFields } };
    });
    setBookingModal(prev => prev
      ? { ...prev, request: { ...prev.request, status: newStatus }, detail: { ...prev.detail, ...updatedFields } }
      : null
    );
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
      {/* Page Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #0d9488 100%)',
        borderRadius: 20, padding: '24px 28px', marginBottom: 24,
        boxShadow: '0 4px 20px rgba(30,58,95,.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            📋 Management
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>All Travel Requests</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>Manage and process all staff travel requests</div>
        </div>
        <button
          onClick={handleExport}
          style={{
            background: '#fff', color: 'var(--navy)',
            fontWeight: 700, padding: '10px 20px', borderRadius: 12,
            border: 'none', fontSize: 13, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,.15)', position: 'relative',
          }}
        >
          ⬇️ Export Excel
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div style={{
        background: '#fff', borderRadius: 14, padding: '16px 20px', marginBottom: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.03)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          🔍 Filters
        </div>
        <div className="all-requests-filters">
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Status</label>
            <select className="form-select" value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ width: '100%', borderRadius: 8 }}>
              <option value="">All</option>
              {Object.entries(STATUS_MAP).map(([v,{label}]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Purpose</label>
            <select className="form-select" value={fPurpose} onChange={e => setFPurpose(e.target.value)} style={{ width: '100%', borderRadius: 8 }}>
              <option value="">All</option>
              {PURPOSE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Transport</label>
            <select className="form-select" value={fTransport} onChange={e => setFTransport(e.target.value)} style={{ width: '100%', borderRadius: 8 }}>
              <option value="">All</option>
              <option value="plane">Plane</option>
              <option value="bus">Bus</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Date From</label>
            <input className="form-input" type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)} style={{ width: '100%', borderRadius: 8 }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Date To</label>
            <input className="form-input" type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)} style={{ width: '100%', borderRadius: 8 }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Search</label>
            <input className="form-input" placeholder="Name, route…" value={fSearch} onChange={e => setFSearch(e.target.value)} style={{ width: '100%', borderRadius: 8 }} />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: 'var(--muted)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✈️</div>
            <div style={{ fontSize: 14 }}>Loading requests…</div>
          </div>
        </div>
      ) : (
        <div style={{
          background: '#fff', borderRadius: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04)',
        }}>
          <div style={{ overflowX: 'auto', borderRadius: 16 }}>
          <table className="table" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Submitted</th>
                <th>Submitter</th>
                <th>Route</th>
                <th>Date</th>
                <th style={{ textAlign: 'center' }}>Pax</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)', padding: 48 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                    <div>No requests found for the selected filters.</div>
                  </td>
                </tr>
              )}
              {requests.map((r, idx) => {
                const isOpen = expanded === r.id;
                const det    = detail[r.id];
                return (
                  <>
                    <tr key={r.id}>
                      <td style={{ color: 'var(--muted)', fontWeight: 700, width: 40, fontSize: 12 }}>#{r.id}</td>
                      <td style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmtDateTime(r.submitted_at)}</td>
                      <td style={{ fontWeight: 600 }}>{r.submitter_name || r.user_name || '—'}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.outbound_from} → {r.outbound_to}</div>
                        {r.has_return && <div style={{ fontSize: 11, color: 'var(--muted)' }}>↩ {r.inbound_from} → {r.inbound_to}</div>}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.outbound_date)}</td>
                      <td style={{ textAlign: 'center' }}>{r.passenger_count ?? '—'}</td>
                      <td style={{ fontSize: 12 }}>{PURPOSE_LABEL[r.travel_purpose] || r.travel_purpose || r.purpose}</td>
                      <td><StatusPill status={r.status} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ borderRadius: 8, fontSize: 11 }}
                            onClick={() => loadDetail(r.id)}
                          >
                            {isOpen ? '▲' : '▼'} Details
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ borderRadius: 8, fontSize: 11 }}
                            onClick={() => openBookingModal(r)}
                          >
                            📋 Booking
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ borderRadius: 8, fontSize: 11 }}
                            onClick={() => openStatusModal(r)}
                          >
                            ⚙️
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && det && (
                      <tr key={`${r.id}-det`}>
                        <td colSpan={9} style={{ background: '#f8fafc', padding: '16px 20px' }}>
                          <StatusTracker status={r.status} />
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
                          <div style={{ overflowX: 'auto' }}>
                            <table className="table" style={{ fontSize: 12 }}>
                              <thead>
                                <tr>
                                  <th>Name</th><th>Cat</th><th>UID</th><th>Gender</th>
                                  <th>ID</th><th>Booking Ref</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(det.passengers || []).map(p => (
                                  <tr key={p.id}>
                                    <td style={{ fontWeight: 600 }}>{p.passenger_name}</td>
                                    <td>
                                      <span style={{
                                        padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                                        background: p.category === 'EMP' ? '#dbeafe' : p.category === 'DPN' ? '#fef3c7' : '#f3e8ff',
                                        color: p.category === 'EMP' ? '#1d4ed8' : p.category === 'DPN' ? '#b45309' : '#7c3aed',
                                      }}>{p.category}</span>
                                    </td>
                                    <td>{p.uid || '—'}</td>
                                    <td>{p.gender || '—'}</td>
                                    <td>{p.id_type}: {p.id_number}</td>
                                    <td>{p.booking_ref || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {statusModal && (
        <div className="modal-overlay" onClick={() => setStatusModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ borderRadius: 20 }}>
            <div className="modal-header">
              <div className="modal-title">Update Request Status</div>
              <button className="modal-close" onClick={() => setStatusModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{
                background: '#f8fafc', borderRadius: 10, padding: '10px 14px',
                marginBottom: 16, fontSize: 13, color: 'var(--navy)', fontWeight: 600,
              }}>
                {statusModal.submitter_name || statusModal.user_name} · {statusModal.outbound_from} → {statusModal.outbound_to}
              </div>
              <div className="form-group">
                <label className="form-label">New Status</label>
                <select className="form-select" style={{ borderRadius: 10 }} value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  {Object.entries(STATUS_MAP).map(([v,{label}]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">PIC Notes</label>
                <textarea className="form-textarea" style={{ borderRadius: 10 }} value={picNotes} onChange={e => setPicNotes(e.target.value)} placeholder="Optional notes visible to the staff member…" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" style={{ borderRadius: 10 }} onClick={() => setStatusModal(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ borderRadius: 10 }} onClick={handleUpdateStatus} disabled={updating}>
                {updating ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {bookingModal && (
        <BookingFlowModal
          request={bookingModal.request}
          detail={bookingModal.detail}
          onClose={() => setBookingModal(null)}
          onSectionSave={handleSectionSave}
        />
      )}
    </div>
  );
}

// ── Booking Flow Modal ─────────────────────────────────────────────────────
const STEP_KEYS = ['submitted', 'processing', 'booked', 'awaiting_payment', 'confirmed'];

function AttachBtn({ label, onDownload }) {
  return (
    <button type="button" onClick={onDownload} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
    }}>⬇ {label}</button>
  );
}

function FilePickField({ file, setFile, existingName, onDownload }) {
  return (
    <div>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 8,
        border: '1.5px dashed var(--border)', borderRadius: 8,
        padding: '9px 12px', cursor: 'pointer', background: '#f8fafc',
        fontSize: 12, color: 'var(--muted)',
      }}>
        <span>📎</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file ? file.name : existingName || 'Click to attach (.pdf, .eml, .msg, image)…'}
        </span>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.msg,.eml" style={{ display: 'none' }}
          onChange={e => setFile(e.target.files[0] || null)} />
      </label>
      {existingName && !file && (
        <div style={{ marginTop: 4 }}>
          <AttachBtn label={`Download: ${existingName}`} onDownload={onDownload} />
        </div>
      )}
    </div>
  );
}

function BookingFlowModal({ request, detail, onClose, onSectionSave }) {
  const status     = request.status;
  const currentIdx = STEP_KEYS.indexOf(status);
  const isStepDone   = (key) => STEP_KEYS.indexOf(key) <= currentIdx;
  const isStepActive = (key) => STEP_KEYS.indexOf(key) === currentIdx + 1;

  const [processingNotes, setProcessingNotes] = useState(detail.pic_notes || '');
  const [processingFile, setProcessingFile]   = useState(null);

  const [bookingRefs, setBookingRefs] = useState(
    Object.fromEntries((detail.passengers || []).map(p => [p.id, p.booking_ref || '']))
  );
  const [paymentDeadline, setPaymentDeadline] = useState(
    detail.payment_deadline ? new Date(detail.payment_deadline).toISOString().slice(0, 16) : ''
  );

  const [paymentNotes, setPaymentNotes] = useState(detail.payment_notes || '');
  const [paymentFile, setPaymentFile]   = useState(null);

  const [saving, setSaving]   = useState(false);
  const [saveErr, setSaveErr] = useState('');

  const dlAttachment = async () => {
    const blob = await api.downloadAttachment(request.id);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = detail.booking_attachment_name; a.click();
  };
  const dlPayment = async () => {
    const blob = await api.downloadPaymentAttachment(request.id);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = detail.payment_attachment_name; a.click();
  };

  const save = async (section) => {
    setSaving(true); setSaveErr('');
    try {
      const fd = new FormData();
      fd.append('section', section);
      let updatedFields = {};

      if (section === 'processing') {
        fd.append('pic_notes', processingNotes);
        if (processingFile) fd.append('attachment', processingFile);
        updatedFields = {
          pic_notes: processingNotes,
          booking_attachment_name: processingFile ? processingFile.name : detail.booking_attachment_name,
        };
      } else if (section === 'booked') {
        fd.append('payment_deadline', paymentDeadline ? new Date(paymentDeadline).toISOString() : '');
        fd.append('booking_refs_json', JSON.stringify(
          Object.entries(bookingRefs).map(([pax_id, booking_ref]) => ({ pax_id: parseInt(pax_id), booking_ref }))
        ));
        updatedFields = {
          payment_deadline: paymentDeadline ? new Date(paymentDeadline).toISOString() : null,
          passengers: (detail.passengers || []).map(p => ({ ...p, booking_ref: bookingRefs[p.id] ?? p.booking_ref })),
        };
      } else if (section === 'payment') {
        fd.append('payment_notes', paymentNotes);
        if (paymentFile) fd.append('attachment', paymentFile);
        updatedFields = {
          payment_notes: paymentNotes,
          payment_attachment_name: paymentFile ? paymentFile.name : detail.payment_attachment_name,
        };
      }

      await onSectionSave(request.id, section, fd, updatedFields);
    } catch (e) {
      setSaveErr(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const Step = ({ stepKey, num, title, doneContent, activeContent }) => {
    const done   = isStepDone(stepKey);
    const active = isStepActive(stepKey) || (status === 'confirmed' && stepKey === 'confirmed');
    const future = !done && !active;

    const borderColor = done ? '#86efac' : active ? '#2563eb' : '#e2e8f0';
    const bg          = done ? '#f0fdf4' : active ? '#fff' : '#f8fafc';

    return (
      <div style={{ borderRadius: 12, border: `1.5px solid ${borderColor}`, background: bg, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: (done || active) ? `1px solid ${done ? '#bbf7d0' : '#e8edf5'}` : 'none',
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
            background: done ? '#22c55e' : active ? '#2563eb' : '#d1d5db',
            color: '#fff', fontSize: done ? 13 : 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{done ? '✓' : num}</div>
          <span style={{ fontWeight: 700, fontSize: 13, color: future ? '#94a3b8' : done ? '#15803d' : '#1e3a5f' }}>{title}</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600,
            color: done ? '#16a34a' : active ? '#2563eb' : '#94a3b8' }}>
            {done ? 'Complete' : active ? 'In Progress' : 'Pending'}
          </span>
        </div>
        {(done || active) && (
          <div style={{ padding: '12px 16px' }}>
            {done ? doneContent : activeContent}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{
        borderRadius: 20, maxWidth: 520, maxHeight: '88vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Booking Flow — #{request.id}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {request.submitter_name} · {request.outbound_from} → {request.outbound_to}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px' }}>
          {saveErr && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#dc2626' }}>
              {saveErr}
            </div>
          )}

          {/* Step 1 — Submitted */}
          <Step stepKey="submitted" num={1} title="Submitted"
            doneContent={
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Submitted by <strong>{request.submitter_name}</strong> on {request.submitted_at ? new Date(request.submitted_at).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'}
              </div>
            }
          />

          {/* Step 2 — Processing */}
          <Step stepKey="processing" num={2} title="Processing"
            doneContent={
              <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {detail.pic_notes && <div><strong>Comment:</strong> {detail.pic_notes}</div>}
                {detail.booking_attachment_name && (
                  <div><strong>Attachment:</strong> {detail.booking_attachment_name} <AttachBtn label="Download" onDownload={dlAttachment} /></div>
                )}
              </div>
            }
            activeContent={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Comment</label>
                  <textarea className="form-textarea" style={{ borderRadius: 8 }} rows={3}
                    value={processingNotes} onChange={e => setProcessingNotes(e.target.value)}
                    placeholder="Processing notes visible to the staff member…" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Booking Email <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(.pdf, .eml, .msg)</span></label>
                  <FilePickField file={processingFile} setFile={setProcessingFile}
                    existingName={detail.booking_attachment_name} onDownload={dlAttachment} />
                </div>
                <button className="btn btn-primary" style={{ borderRadius: 8 }} onClick={() => save('processing')} disabled={saving}>
                  {saving ? 'Saving…' : 'Save & Mark Processing →'}
                </button>
              </div>
            }
          />

          {/* Step 3 — Booked */}
          <Step stepKey="booked" num={3} title="Booked"
            doneContent={
              <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(detail.passengers || []).map(p => (
                  <div key={p.id}><strong>{p.passenger_name}:</strong> {p.booking_ref || '—'}</div>
                ))}
                {detail.payment_deadline && (
                  <div><strong>Payment Deadline:</strong> {new Date(detail.payment_deadline).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
                )}
              </div>
            }
            activeContent={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(detail.passengers || []).map(p => (
                  <div key={p.id} className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Booking Ref — {p.passenger_name}</label>
                    <input className="form-input" style={{ borderRadius: 8 }} placeholder="e.g. ABC123"
                      value={bookingRefs[p.id] ?? ''} onChange={e => setBookingRefs(prev => ({ ...prev, [p.id]: e.target.value }))} />
                  </div>
                ))}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Payment Deadline</label>
                  <input className="form-input" type="datetime-local" style={{ borderRadius: 8 }}
                    value={paymentDeadline} onChange={e => setPaymentDeadline(e.target.value)} />
                </div>
                <button className="btn btn-primary" style={{ borderRadius: 8 }} onClick={() => save('booked')} disabled={saving}>
                  {saving ? 'Saving…' : 'Save & Mark Booked →'}
                </button>
              </div>
            }
          />

          {/* Step 4 — Payment */}
          <Step stepKey="awaiting_payment" num={4} title="Payment"
            doneContent={
              <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {detail.payment_notes && <div><strong>Notes:</strong> {detail.payment_notes}</div>}
                {detail.payment_attachment_name && (
                  <div><strong>Attachment:</strong> {detail.payment_attachment_name} <AttachBtn label="Download" onDownload={dlPayment} /></div>
                )}
              </div>
            }
            activeContent={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Payment Notes</label>
                  <textarea className="form-textarea" style={{ borderRadius: 8 }} rows={2}
                    value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)}
                    placeholder="Payment confirmation details…" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Payment Email <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(.pdf, .eml, .msg)</span></label>
                  <FilePickField file={paymentFile} setFile={setPaymentFile}
                    existingName={detail.payment_attachment_name} onDownload={dlPayment} />
                </div>
                <button className="btn btn-primary" style={{ borderRadius: 8 }} onClick={() => save('payment')} disabled={saving}>
                  {saving ? 'Saving…' : 'Save & Mark Payment →'}
                </button>
              </div>
            }
          />

          {/* Step 5 — Confirmed */}
          <Step stepKey="confirmed" num={5} title="Confirmed"
            doneContent={
              <div style={{ fontSize: 12, color: '#15803d', display: 'flex', alignItems: 'center', gap: 6 }}>
                ✅ Ticket issued and request confirmed.
              </div>
            }
            activeContent={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>
                  All booking details are complete. Press the button below to mark the ticket as issued and complete this request.
                </div>
                <button style={{
                  background: '#16a34a', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }} onClick={() => save('confirmed')} disabled={saving}>
                  {saving ? 'Saving…' : '✅ Issue Ticket & Complete'}
                </button>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}
