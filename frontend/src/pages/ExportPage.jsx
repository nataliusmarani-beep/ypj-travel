import { useState, useEffect } from 'react';
import { api } from '../api.js';

const PURPOSE_OPTIONS = [
  { value: '',       label: 'All Purposes' },
  { value: 'VAC',    label: 'VAC — Vacation' },
  { value: 'EMG',    label: 'EMG — Emergency' },
  { value: 'MED',    label: 'MED — Medical' },
  { value: 'COBUS',  label: 'COBUS — Cobus' },
  { value: 'FAMILY', label: 'FAMILY — Family' },
  { value: 'OTHER',  label: 'OTHER — Other' },
];

export default function ExportPage({ user }) {
  const [rtis, setRtis]       = useState([]);
  const [rtiId, setRtiId]     = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]   = useState('');
  const [purpose, setPurpose] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [exporting, setExporting]   = useState(false);
  const [error, setError]     = useState('');

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
      const arr = d.requests || d;
      setPreview(arr.length);
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
      const label = rtiId
        ? `rti_${rtiId}`
        : dateFrom
          ? `${dateFrom}_${dateTo || 'all'}`
          : 'all';
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
      <div className="page-header">
        <div>
          <div className="page-title">Export Excel</div>
          <div className="page-subtitle">Download travel request data as a spreadsheet</div>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="card">
        <div className="card-title">Export Filters</div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">RTI Event</label>
            <select className="form-select" value={rtiId} onChange={e => setRtiId(e.target.value)}>
              <option value="">All Events</option>
              {rtis.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Travel Purpose</label>
            <select className="form-select" value={purpose} onChange={e => setPurpose(e.target.value)}>
              {PURPOSE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Travel Date From</label>
            <input className="form-input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Travel Date To</label>
            <input className="form-input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>

        {/* Preview */}
        <div style={{ marginBottom: 20 }}>
          <button className="btn btn-secondary" onClick={handlePreview} disabled={previewing}>
            {previewing ? 'Checking…' : '🔍 Preview Record Count'}
          </button>
          {preview !== null && (
            <span style={{ marginLeft: 14, fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>
              {preview} request{preview !== 1 ? 's' : ''} will be exported
            </span>
          )}
        </div>

        <button
          className="btn btn-success"
          onClick={handleExport}
          disabled={exporting}
          style={{ fontSize: 14, padding: '10px 24px' }}
        >
          {exporting ? 'Preparing file…' : '⬇️ Download Excel'}
        </button>
      </div>

      {/* Help */}
      <div className="card">
        <div className="card-title">About the Export Format</div>
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>
          <p style={{ marginBottom: 8 }}>
            The exported Excel file contains one row per passenger, with the following columns:
          </p>
          <ul style={{ paddingLeft: 20, color: 'var(--muted)' }}>
            <li>Request ID, Submitted Date, Submitter Name</li>
            <li>Request Type (Regular / RTI), RTI Event Name</li>
            <li>Transport Type, Travel Purpose, Payment Method</li>
            <li>Outbound Route (From → To), Outbound Date</li>
            <li>Return Route (From → To), Return Date</li>
            <li>Passenger Name, Category, UID, Sponsor UID</li>
            <li>Gender, Date of Birth, ID Type, ID Number</li>
            <li>Contact Email, Phone</li>
            <li>Booking Reference, Seat Number</li>
            <li>Request Status, PIC Notes</li>
          </ul>
          <p style={{ marginTop: 12, color: 'var(--muted)', fontSize: 12 }}>
            Leave all filters blank to export everything. Combine filters to narrow down results.
          </p>
        </div>
      </div>
    </div>
  );
}
