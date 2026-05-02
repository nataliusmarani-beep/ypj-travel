import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

const AIRPORTS = ['TIM', 'CGK', 'UPG', 'SUB', 'DPS', 'YIA', 'MDC', 'Other'];

const PURPOSE_OPTIONS = [
  { value: 'VAC',    label: 'Vacation' },
  { value: 'EMG',    label: 'Emergency' },
  { value: 'MED',    label: 'Medical' },
  { value: 'COBUS',  label: 'Cobus' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'OTHER',  label: 'Other' },
];

const PAYMENT_OPTIONS = ['Cash', 'Travel Benefit', 'Cobus', 'Emergency', 'Medical'];

const emptyPassenger = () => ({
  name: '', category: 'EMP', uid: '', sponsor_uid: '',
  gender: 'MALE', dob: '', id_type: 'KTP', id_number: '',
  email: '', phone: '',
});

function StepIndicator({ step }) {
  const steps = ['Trip Details', 'Passengers', 'Review & Submit'];
  return (
    <div className="step-indicator">
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className={`step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`}>
            <div className="step-num">{step > i + 1 ? '✓' : i + 1}</div>
            <span style={{ fontSize: 13 }}>{s}</span>
          </div>
          {i < steps.length - 1 && <div className="step-divider" />}
        </div>
      ))}
    </div>
  );
}

export default function NewRequestPage({ user }) {
  const navigate              = useNavigate();
  const [searchParams]        = useSearchParams();
  const rtiParam              = searchParams.get('rti') || '';

  const [step, setStep]       = useState(1);
  const [rtis, setRtis]       = useState([]);
  const [error, setError]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId]   = useState(null);

  /* Step 1 fields */
  const [reqType, setReqType]       = useState(rtiParam ? 'RTI' : 'Regular');
  const [rtiId, setRtiId]           = useState(rtiParam);
  const [transport, setTransport]   = useState('Plane');
  const [purpose, setPurpose]       = useState('VAC');
  const [payment, setPayment]       = useState('Travel Benefit');
  const [outType, setOutType]       = useState('DOM');
  const [outFrom, setOutFrom]       = useState('TIM');
  const [outFromOther, setOutFromOther] = useState('');
  const [outTo, setOutTo]           = useState('CGK');
  const [outToOther, setOutToOther] = useState('');
  const [outDate, setOutDate]       = useState('');
  const [hasReturn, setHasReturn]   = useState(false);
  const [inType, setInType]         = useState('DOM');
  const [inFrom, setInFrom]         = useState('CGK');
  const [inFromOther, setInFromOther] = useState('');
  const [inTo, setInTo]             = useState('TIM');
  const [inToOther, setInToOther]   = useState('');
  const [inDate, setInDate]         = useState('');
  const [notes, setNotes]           = useState('');

  /* Step 2 */
  const [passengers, setPassengers]       = useState([emptyPassenger()]);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    api.getRTIs().then(d => setRtis(d.filter(r => r.status === 'open'))).catch(() => {});
  }, []);

  /* Load self + dependents from profile */
  const loadFromProfile = async () => {
    setProfileLoading(true);
    try {
      const [me, deps] = await Promise.all([api.getMe(), api.getDependents()]);
      const list = [
        {
          name:        me.name        || '',
          category:    'EMP',
          uid:         me.employee_id || '',
          sponsor_uid: '',
          gender:      'MALE',
          dob:         '',
          id_type:     'Employee ID',
          id_number:   me.employee_id || '',
          email:       me.email       || '',
          phone:       '',
        },
        ...deps.map(d => ({
          name:        (d.prefix ? d.prefix + ' ' : '') + (d.name || ''),
          category:    'DPN',
          uid:         d.dependent_id || '',
          sponsor_uid: me.employee_id  || '',
          gender:      d.gender        || 'MALE',
          dob:         '',
          id_type:     d.ktp_number ? 'KTP' : 'Dependent ID',
          id_number:   d.ktp_number || d.dependent_id || '',
          email:       '',
          phone:       '',
        })),
      ];
      setPassengers(list.length > 0 ? list : [emptyPassenger()]);
    } catch {
      /* silent — user can fill manually */
    } finally {
      setProfileLoading(false);
    }
  };

  const resolveAirport = (val, other) => val === 'Other' ? other : val;

  /* ── Validation ── */
  const validateStep1 = () => {
    if (reqType === 'RTI' && !rtiId) return 'Please select an RTI event.';
    if (!outFrom || !outTo)          return 'Please fill in outbound airports.';
    if (outFrom === 'Other' && !outFromOther.trim()) return 'Please specify the departure airport.';
    if (outTo   === 'Other' && !outToOther.trim())   return 'Please specify the destination airport.';
    if (!outDate)                    return 'Please select an outbound travel date.';
    if (hasReturn) {
      if (!inDate) return 'Please select a return date.';
      if (inFrom === 'Other' && !inFromOther.trim()) return 'Please specify the return departure airport.';
      if (inTo   === 'Other' && !inToOther.trim())   return 'Please specify the return destination airport.';
    }
    return '';
  };

  const validateStep2 = () => {
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (!p.name.trim())      return `Passenger ${i+1}: Name is required.`;
      if (!p.uid.trim())       return `Passenger ${i+1}: UID is required.`;
      if (p.category === 'DPN' && !p.sponsor_uid.trim()) return `Passenger ${i+1}: Sponsor UID is required for dependents.`;
      if (!p.dob)              return `Passenger ${i+1}: Date of birth is required.`;
      if (!p.id_number.trim()) return `Passenger ${i+1}: ID number is required.`;
    }
    return '';
  };

  const handleNextStep1 = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError('');
    setStep(2);
  };

  const handleNextStep2 = () => {
    const err = validateStep2();
    if (err) { setError(err); return; }
    setError('');
    setStep(3);
  };

  const handleSubmit = async () => {
    setSubmitting(true); setError('');
    try {
      const payload = {
        request_type:    reqType,
        rti_id:          reqType === 'RTI' ? rtiId : null,
        transport_type:  transport,
        purpose,
        payment_method:  payment,
        outbound_type:   outType,
        outbound_from:   resolveAirport(outFrom, outFromOther),
        outbound_to:     resolveAirport(outTo, outToOther),
        outbound_date:   outDate,
        has_return:      hasReturn,
        inbound_type:    hasReturn ? inType : null,
        inbound_from:    hasReturn ? resolveAirport(inFrom, inFromOther) : null,
        inbound_to:      hasReturn ? resolveAirport(inTo, inToOther) : null,
        inbound_date:    hasReturn ? inDate : null,
        notes,
        passengers:      passengers.map(p => ({
          name:        p.name.trim(),
          category:    p.category,
          uid:         p.uid.trim(),
          sponsor_uid: p.sponsor_uid.trim() || null,
          gender:      p.gender,
          dob:         p.dob,
          id_type:     p.id_type,
          id_number:   p.id_number.trim(),
          email:       p.email.trim() || null,
          phone:       p.phone.trim() || null,
        })),
      };
      const result = await api.submitRequest(payload);
      setSuccessId(result.id || result.request_id || 'submitted');
    } catch (e) {
      setError(e.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* Passenger helpers */
  const updatePassenger = (idx, field, value) => {
    setPassengers(ps => ps.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const addPassenger    = () => setPassengers(ps => [...ps, emptyPassenger()]);
  const removePassenger = (idx) => setPassengers(ps => ps.filter((_, i) => i !== idx));

  /* ── Success Screen ── */
  if (successId) {
    return (
      <div>
        <div className="page-header">
          <div className="page-title">Request Submitted</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>
            Your request has been submitted!
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
            Request ID: <strong>{successId}</strong><br />
            PIC Travel will review and process your request.
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/my-requests')}>View My Requests</button>
            <button className="btn btn-primary"   onClick={() => { setStep(1); setSuccessId(null); setPassengers([emptyPassenger()]); }}>Submit Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">New Travel Request</div>
          <div className="page-subtitle">Fill in the details for your trip</div>
        </div>
      </div>

      <StepIndicator step={step} />
      {error && <div className="error-box">{error}</div>}

      {/* ── Step 1: Trip Details ── */}
      {step === 1 && (
        <div className="card">
          <div className="card-title">Trip Details</div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Request Type</label>
              <select className="form-select" value={reqType} onChange={e => setReqType(e.target.value)}>
                <option value="Regular">Regular</option>
                <option value="RTI">RTI</option>
              </select>
            </div>
            {reqType === 'RTI' && (
              <div className="form-group">
                <label className="form-label">RTI Event</label>
                <select className="form-select" value={rtiId} onChange={e => setRtiId(e.target.value)}>
                  <option value="">— Select RTI Event —</option>
                  {rtis.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Transport Type</label>
              <select className="form-select" value={transport} onChange={e => setTransport(e.target.value)}>
                <option value="Plane">✈️ Plane</option>
                <option value="Bus">🚌 Bus</option>
                <option value="Both">Both</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Travel Purpose</label>
              <select className="form-select" value={purpose} onChange={e => setPurpose(e.target.value)}>
                {PURPOSE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value} — {o.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select className="form-select" value={payment} onChange={e => setPayment(e.target.value)}>
                {PAYMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Outbound */}
          <div className="section-title">Outbound Trip</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={outType} onChange={e => setOutType(e.target.value)}>
                <option value="DOM">Domestic (DOM)</option>
                <option value="INT">International (INT)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">From Airport</label>
              <select className="form-select" value={outFrom} onChange={e => setOutFrom(e.target.value)}>
                {AIRPORTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              {outFrom === 'Other' && (
                <input className="form-input" style={{ marginTop: 6 }} placeholder="Airport code / name" value={outFromOther} onChange={e => setOutFromOther(e.target.value)} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">To Airport</label>
              <select className="form-select" value={outTo} onChange={e => setOutTo(e.target.value)}>
                {AIRPORTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              {outTo === 'Other' && (
                <input className="form-input" style={{ marginTop: 6 }} placeholder="Airport code / name" value={outToOther} onChange={e => setOutToOther(e.target.value)} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Departure Date</label>
              <input className="form-input" type="date" value={outDate} onChange={e => setOutDate(e.target.value)} />
            </div>
          </div>

          {/* Return toggle */}
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="hasReturn"
              checked={hasReturn}
              onChange={e => setHasReturn(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            <label htmlFor="hasReturn" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
              Add Return Trip
            </label>
          </div>

          {/* Inbound */}
          {hasReturn && (
            <>
              <div className="section-title">Return Trip</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={inType} onChange={e => setInType(e.target.value)}>
                    <option value="DOM">Domestic (DOM)</option>
                    <option value="INT">International (INT)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">From Airport</label>
                  <select className="form-select" value={inFrom} onChange={e => setInFrom(e.target.value)}>
                    {AIRPORTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  {inFrom === 'Other' && (
                    <input className="form-input" style={{ marginTop: 6 }} placeholder="Airport code / name" value={inFromOther} onChange={e => setInFromOther(e.target.value)} />
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">To Airport</label>
                  <select className="form-select" value={inTo} onChange={e => setInTo(e.target.value)}>
                    {AIRPORTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  {inTo === 'Other' && (
                    <input className="form-input" style={{ marginTop: 6 }} placeholder="Airport code / name" value={inToOther} onChange={e => setInToOther(e.target.value)} />
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Return Date</label>
                  <input className="form-input" type="date" value={inDate} onChange={e => setInDate(e.target.value)} />
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special requests or information…" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-primary" onClick={handleNextStep1}>Next: Passengers →</button>
          </div>
        </div>
      )}

      {/* ── Step 2: Passengers ── */}
      {step === 2 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="card-title" style={{ margin: 0 }}>Passengers</div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={loadFromProfile}
              disabled={profileLoading}
              title="Pre-fill with your profile data and dependents"
            >
              {profileLoading ? 'Loading…' : '👤 Load from Profile'}
            </button>
          </div>
          {passengers.map((p, idx) => (
            <div key={idx} className="passenger-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 13 }}>Passenger {idx + 1}</div>
                {passengers.length > 1 && (
                  <button className="btn btn-danger btn-sm" onClick={() => removePassenger(idx)}>Remove</button>
                )}
              </div>

              <div className="form-row">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={p.name} onChange={e => updatePassenger(idx, 'name', e.target.value)} placeholder="As on ID document" />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={p.category} onChange={e => updatePassenger(idx, 'category', e.target.value)}>
                    <option value="EMP">EMP — Employee</option>
                    <option value="DPN">DPN — Dependent</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-select" value={p.gender} onChange={e => updatePassenger(idx, 'gender', e.target.value)}>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">UID</label>
                  <input className="form-input" value={p.uid} onChange={e => updatePassenger(idx, 'uid', e.target.value)} placeholder="e.g. 12345 or 12345-01" />
                </div>
                {p.category === 'DPN' && (
                  <div className="form-group">
                    <label className="form-label">Sponsor UID</label>
                    <input className="form-input" value={p.sponsor_uid} onChange={e => updatePassenger(idx, 'sponsor_uid', e.target.value)} placeholder="Employee UID of sponsor" />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input className="form-input" type="date" value={p.dob} onChange={e => updatePassenger(idx, 'dob', e.target.value)} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">ID Type</label>
                  <select className="form-select" value={p.id_type} onChange={e => updatePassenger(idx, 'id_type', e.target.value)}>
                    <option value="KTP">KTP</option>
                    <option value="Employee ID">Employee ID</option>
                    <option value="Dependent ID">Dependent ID</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">ID Number</label>
                  <input className="form-input" value={p.id_number} onChange={e => updatePassenger(idx, 'id_number', e.target.value)} placeholder="ID number" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Contact Email</label>
                  <input className="form-input" type="email" value={p.email} onChange={e => updatePassenger(idx, 'email', e.target.value)} placeholder="email@example.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={p.phone} onChange={e => updatePassenger(idx, 'phone', e.target.value)} placeholder="+62 …" />
                </div>
              </div>
            </div>
          ))}

          <button className="btn btn-secondary" onClick={addPassenger} style={{ marginBottom: 20 }}>
            + Add Passenger
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={() => { setStep(1); setError(''); }}>← Back</button>
            <button className="btn btn-primary"   onClick={handleNextStep2}>Next: Review →</button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review ── */}
      {step === 3 && (
        <div className="card">
          <div className="card-title">Review & Submit</div>

          <div className="section-title">Trip Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
            {[
              ['Type',      reqType + (rtiId ? ` — ${rtis.find(r=>r.id==rtiId)?.name||rtiId}` : '')],
              ['Transport', transport],
              ['Purpose',   purpose],
              ['Payment',   payment],
              ['Outbound',  `${resolveAirport(outFrom,outFromOther)} → ${resolveAirport(outTo,outToOther)}`],
              ['Depart',    outDate],
              ...(hasReturn ? [
                ['Return',  `${resolveAirport(inFrom,inFromOther)} → ${resolveAirport(inTo,inToOther)}`],
                ['Return Date', inDate],
              ] : []),
            ].map(([k, v]) => (
              <div key={k} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{v || '—'}</div>
              </div>
            ))}
          </div>
          {notes && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Notes: {notes}</div>}

          <div className="section-title">Passengers ({passengers.length})</div>
          <table className="table" style={{ marginBottom: 24 }}>
            <thead>
              <tr>
                <th>#</th><th>Name</th><th>Cat</th><th>UID</th><th>Gender</th><th>DOB</th><th>ID Type</th><th>ID No.</th>
              </tr>
            </thead>
            <tbody>
              {passengers.map((p, i) => (
                <tr key={i}>
                  <td>{i+1}</td>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>{p.uid}{p.sponsor_uid ? ` (→${p.sponsor_uid})` : ''}</td>
                  <td>{p.gender}</td>
                  <td>{p.dob}</td>
                  <td>{p.id_type}</td>
                  <td>{p.id_number}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={() => { setStep(2); setError(''); }}>← Back</button>
            <button className="btn btn-success" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : '✓ Submit Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
