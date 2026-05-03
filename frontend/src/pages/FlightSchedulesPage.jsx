import { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FlightSchedulesPage({ user, showToast }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const fileRef = useRef(null);

  const isPIC = user.role === 'Manager' || user.role === 'PIC Travel';

  const load = () => {
    setLoading(true);
    api.getAirfastSchedules()
      .then(setSchedules)
      .catch(() => showToast('Failed to load schedules.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      showToast('Only PDF files are allowed.', 'error');
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.uploadAirfastSchedule(fd);
      showToast('Schedule uploaded successfully.', 'success');
      load();
    } catch (err) {
      showToast(err.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDownload = async (s) => {
    setDownloading(s.id);
    try {
      const blob = await api.downloadAirfastSchedule(s.id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = s.filename; a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('Download failed.', 'error');
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete "${s.filename}"? This cannot be undone.`)) return;
    try {
      await api.deleteAirfastSchedule(s.id);
      showToast('Schedule deleted.', 'success');
      load();
    } catch {
      showToast('Delete failed.', 'error');
    }
  };

  const active  = schedules.find(s => s.status === 'active');
  const expired = schedules.filter(s => s.status === 'expired');

  return (
    <div>
      {/* ── Hero Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #b91c1c 0%, #ea580c 100%)',
        borderRadius: 20, padding: '28px 32px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
        boxShadow: '0 4px 24px rgba(185,28,28,.25)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.7)', letterSpacing: 1.5, marginBottom: 6, textTransform: 'uppercase' }}>
            ✈️ Schedule Management
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
            Airfast Schedule Management
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', marginTop: 4 }}>
            Airfast Indonesia Flight Schedule — view &amp; download the latest schedule
          </div>
        </div>
        {isPIC && (
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '11px 22px', borderRadius: 12,
            background: '#fff', color: '#b91c1c',
            fontWeight: 700, fontSize: 14, cursor: uploading ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,.15)',
            opacity: uploading ? 0.7 : 1,
          }}>
            {uploading ? '⏳ Uploading…' : '⬆️ Upload New Schedule'}
            <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
          </label>
        )}
      </div>

      {/* ── Active Schedule highlight ── */}
      {active && (
        <div style={{
          background: '#fff', borderRadius: 16, padding: '20px 24px', marginBottom: 20,
          border: '2px solid #16a34a',
          boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(22,163,74,.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: '#dcfce7',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
              }}>📄</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>{active.filename}</span>
                  <span style={{
                    padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: '#dcfce7', color: '#15803d',
                  }}>● Active</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Uploaded {fmtDate(active.uploaded_at)} · by {active.uploaded_by_name || '—'} · {fmtSize(active.file_size)}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-primary btn-sm"
                style={{ borderRadius: 10, padding: '8px 20px' }}
                onClick={() => handleDownload(active)}
                disabled={downloading === active.id}
              >
                {downloading === active.id ? '⏳ Downloading…' : '⬇️ Download PDF'}
              </button>
              {isPIC && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ borderRadius: 10, color: '#dc2626' }}
                  onClick={() => handleDelete(active)}
                >
                  🗑
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── History Table ── */}
      <div style={{
        background: '#fff', borderRadius: 16, padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🗂️</span> Upload History
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>Loading…</div>
        ) : schedules.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
            <div style={{ fontSize: 14, marginBottom: 6 }}>No schedules uploaded yet.</div>
            {isPIC && <div style={{ fontSize: 12 }}>Click "Upload New Schedule" to add the first one.</div>}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>Upload Date</th>
                  <th>Uploaded By</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s, i) => (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        📄 {s.filename}
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{fmtSize(s.file_size)}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{fmtDate(s.uploaded_at)}</td>
                    <td style={{ fontSize: 13 }}>{s.uploaded_by_name || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: s.status === 'active' ? '#dcfce7' : '#f1f5f9',
                        color:      s.status === 'active' ? '#15803d' : '#64748b',
                      }}>
                        {s.status === 'active' ? '● Active' : 'Expired'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ borderRadius: 8, fontSize: 12, padding: '4px 12px' }}
                          onClick={() => handleDownload(s)}
                          disabled={downloading === s.id}
                          title="Download PDF"
                        >
                          {downloading === s.id ? '⏳' : '⬇️ Download'}
                        </button>
                        {isPIC && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ borderRadius: 8, fontSize: 12, padding: '4px 10px', color: '#dc2626' }}
                            onClick={() => handleDelete(s)}
                            title="Delete"
                          >
                            🗑
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
      </div>

      {/* ── Info note for staff ── */}
      {!isPIC && (
        <div style={{
          marginTop: 16, padding: '12px 18px', borderRadius: 10,
          background: '#fffbeb', border: '1px solid #fde68a',
          fontSize: 12, color: '#92400e',
        }}>
          ℹ️ Schedules are updated by PIC Travel. Download the latest active schedule to view available Airfast Indonesia flights.
        </div>
      )}
    </div>
  );
}
