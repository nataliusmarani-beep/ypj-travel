import { useState, useEffect } from 'react';
import { api } from '../api.js';

const PURPOSE_OPTIONS = [
  { value: '',       label: 'All Purposes' },
  { value: 'VAC',    label: 'VAC — Vacation' },
  { value: 'EMG',    label: 'EMG — Emergency' },
  { value: 'MED',    label: 'MED — Medical' },
  { value: 'COBUS',  label: 'COBUS — Company Business' },
  { value: 'FAMILY', label: 'FAMILY — Family' },
  { value: 'OTHER',  label: 'OTHER — Other' },
];

export default function ExportPage({ user }) {
  const [rtis, setRtis]           = useState([]);
  const [rtiId, setRtiId]         = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [purpose, setPurpose]     = useState('');
  const [preview, setPreview]     = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    api.getRTIs().then(setRtis).catch(() => {});
  }, []);

  const buildQuery = () => {
    const p = new URLSearchParams();
    if (rtiId)    p.set('rti_id',    rtiId);
    if (dateFrom) p.set('date_from', dateFrom);
    if (dateTo)   p.set('date_to',   dateTo);
    if (purpose)  p.set('purpose',   purpose);
    const q = p.toString();
    return q ? `?${q}` : '';
  };

  const handlePreview = async () => {
    setPreviewing(true); setError(''); setPreview(null);
    try {
      const d = await api.getRequests(buildQuery() || '?limit=1000');
      setPreview((d.requests || d).length);
    } catch (e) {
      setError(e.message || 'Preview failed.');
    } finally {
      setPreviewing(false);
    }
  };

  const handleExport = async () => {
    setExporting(true); setError('');
    try {
      const blob = await api.exportRequests(buildQuery());
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      const label = rtiId ? `rti_${rtiId}` : dateFrom ? `${dateFrom}_${dateTo || 'all'}` : 'all';
      a.download = `ypj_travel_export_${label}_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
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
            📊 Data Export
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Export to Excel</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>Download travel request data as a spreadsheet</div>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* Export Filters */}
      <div style={{
        background: '#fff', borderRadius: 16, padding: '24px',
        marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🔍</span> Export Filters
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">RTI Event</label>
            <select className="form-select" style={{ borderRadius: 10 }} value={rtiId} onChange={e => setRtiId(e.target.value)}>
              <option value="">All Events</option>
              {rtis.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Travel Purpose</label>
            <select className="form-select" style={{ borderRadius: 10 }} value={purpose} onChange={e => setPurpose(e.target.value)}>
              {PURPOSE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Travel Date From</label>
            <input className="form-input" style={{ borderRadius: 10 }} type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Travel Date To</label>
            <input className="form-input" style={{ borderRadius: 10 }} type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>

        {/* Preview */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 0', borderTop: '1px solid var(--border)', marginBottom: 16,
        }}>
          <button
            style={{
              padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: '#f1f5f9', color: 'var(--navy)', border: 'none', cursor: previewing ? 'not-allowed' : 'pointer',
            }}
            onClick={handlePreview}
            disabled={previewing}
          >
            {previewing ? '⏳ Checking…' : '🔍 Preview Count'}
          </button>
          {preview !== null && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 10,
              background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, fontSize: 13,
            }}>
              📋 {preview} request{preview !== 1 ? 's' : ''} will be exported
            </div>
          )}
        </div>

        <button
          style={{
            padding: '12px 28px', borderRadius: 12, fontSize: 14, fontWeight: 700,
            background: exporting ? '#86efac' : 'linear-gradient(135deg, #15803d, #16a34a)',
            color: '#fff', border: 'none', cursor: exporting ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(22,163,74,.35)',
          }}
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? '⏳ Preparing file…' : '⬇️ Download Excel'}
        </button>
      </div>

      {/* Format Guide */}
      <div style={{
        background: '#fff', borderRadius: 16, padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>📄</span> About the Export Format
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
          <p style={{ marginBottom: 10, color: 'var(--text)' }}>
            The exported Excel file contains <strong>one row per passenger</strong>, with the following columns:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '6px 24px' }}>
            {[
              'Request ID, Submitted Date',
              'Submitter Name',
              'Request Type (Regular / RTI)',
              'RTI Event Name',
              'Transport Type, Travel Purpose',
              'Payment Method',
              'Outbound Route & Date',
              'Return Route & Date',
              'Passenger Name, Category',
              'UID, Sponsor UID',
              'Gender, Date of Birth',
              'ID Type, ID Number',
              'Contact Email, Phone',
              'Booking Reference, Seat',
              'Request Status, PIC Notes',
            ].map((col, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ color: '#0d9488', fontWeight: 700 }}>✓</span>
                <span>{col}</span>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)' }}>
            Leave all filters blank to export everything. Combine filters to narrow down results.
          </p>
        </div>
      </div>
    </div>
  );
}
