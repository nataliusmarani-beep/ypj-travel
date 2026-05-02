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
  _profileKey:   '',
  _prefix:       '',      // 'Master' | 'Miss' → show DOB field
  name:          '',
  category:      'EMP',
  uid:           '',
  sponsor_uid:   '',
  gender:        'MALE',
  dob:           '',
  other_id_type: 'NIK',
  id_number:     '',
  _nik:          '',
  _passport:     '',
  email:         '',
  phone:         '',
});

const isChild = p => p._prefix === 'Master' || p._prefix === 'Miss';

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
  const [passengers, setPassengers]         = useState([emptyPassenger()]);
  const [profileChoices, setProfileChoices] = useState([]);
  const [myEmployeeId, setMyEmployeeId]     = useState('');
  const [profileReady, setProfileReady]     = useState(false);

  useEffect(() => {
    api.getRTIs().then(d => setRtis(d.filter(r => r.status === 'open'))).catch(() => {});
    Promise.all([api.getMe(), api.getDependents()])
      .then(([me, deps]) => {
        const empId = me.employee_id || '';
        setMyEmployeeId(empId);
        const choices = [
          {
            key:      'self',
            label:    `${me.name || me.email} (Employee)`,
            name:     me.name   || '',
            prefix:   '',
            category: 'EMP',
            gender:   '',
            uid:      empId,
            nik:      '',
            passport: '',
            dob:      me.date_of_birth ? me.date_of_birth.slice(0, 10) : '',
            email:    me.email || '',
          },
          ...deps.map(d => ({
            key:      `dep_${d.id}`,
            label:    `${d.prefix ? d.prefix + ' ' : ''}${d.name} (${d.relation})`,
            name:     `${d.prefix ? d.prefix + ' ' : ''}${d.name}`,
            prefix:   d.prefix       || '',
            category: 'DPN',
            gender:   d.gender       || '',
            uid:      d.dependent_id || '',
            nik:      d.ktp_number   || '',
            passport: d.passport_id  || '',
            dob:      d.date_of_birth ? d.date_of_birth.slice(0, 10) : '',
            email:    '',
          })),
        ];
        setProfileChoices(choices);
        setProfileReady(true);
      })
      .catch(() => setProfileReady(true));
  }, []);

  /* Apply a profile choice to a passenger slot */
  const applyProfileChoice = (idx, key) => {
    if (!key) return;
    const choice = profileChoices.find(c => c.key === key);
    if (!choice) return;
    const idType = choice.nik ? 'NIK' : (choice.passport ? 'Passport' : 'NIK');
    const idNum  = idType === 'NIK' ? choice.nik : choice.passport;
    setPassengers(ps => ps.map((p, i) => i !== idx ? p : {
      ...p,
      _profileKey:   key,
      _prefix:       choice.prefix,
      name:          choice.name,
      category:      choice.category,
      gender:        choice.gender || p.gender,
      uid:           choice.uid,
      sponsor_uid:   choice.category === 'DPN' ? myEmployeeId : '',
      _nik:          choice.nik,
      _passport:     choice.passport,
      other_id_type: idType,
      id_number:     idNum || '',
      dob:           (choice.prefix === 'Master' || choice.prefix === 'Miss') ? choice.dob : '',
      email:         choice.email || p.email,
    }));
  };

  /* When user switches NIK ↔ Passport, swap the auto-filled id_number */
  const handleIdTypeChange = (idx, newType) => {
    setPassengers(ps => ps.map((p, i) => {
      if (i !== idx) return p;
      const autoId = newType === 'NIK' ? p._nik : p._passport;
      return { ...p, other_id_type: newType, id_number: autoId || '' };
    }));
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
      if (!p._profileKey)      return `Passenger ${i+1}: Please select a person from the list.`;
      if (!p.gender)           return `Passenger ${i+1}: Gender is required.`;
      if (isChild(p) && !p.dob) return `Passenger ${i+1}: Date of birth is required for children.`;
      if (!p.id_number.trim()) return `Passenger ${i+1}: ID number is required.`;
      if (p.category === 'DPN' && !p.uid.trim())         return `Passenger ${i+1}: Dependent ID is required.`;
      if (p.category === 'DPN' && !p.sponsor_uid.trim()) return `Passenger ${i+1}: Sponsor UID is required.`;
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
          uid:         p.uid.trim()         || null,
          sponsor_uid: p.sponsor_uid.trim() || null,
          gender:      p.gender,
          dob:         p.dob,
          id_type:     p.other_id_type,      // NIK | Passport
          id_number:   p.id_number.trim(),
          email:       p.email.trim()  || null,
          phone:       p.phone.trim()  || null,
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
          <div className="card-title">Passengers</div>

          {!profileReady && (
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Loading profile…</div>
          )}

          {profileReady && profileChoices.length === 0 && (
            <div className="error-box" style={{ marginBottom: 16 }}>
              No profile data found. Please complete your profile (Employee ID, Dependents) before submitting a request.
            </div>
          )}

          {passengers.map((p, idx) => (
            <div key={idx} className="passenger-card">
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 13 }}>Passenger {idx + 1}</div>
                {passengers.length > 1 && (
                  <button className="btn btn-danger btn-sm" onClick={() => removePassenger(idx)}>Remove</button>
                )}
              </div>

              {/* ── Full Name — profile dropdown only ── */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select
                  className="form-select"
                  value={p._profileKey}
                  onChange={e => applyProfileChoice(idx, e.target.value)}
                >
                  <option value="">— Select person —</option>
                  {profileChoices.map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
                {p._profileKey && (
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', padding: '6px 10px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, marginTop: 6 }}>
                    {p.name}
                  </div>
                )}
              </div>

              {/* ── Category (auto, read-only) + Gender ── */}
              <div className="form-row" style={{ marginBottom: 4 }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <div style={{ fontSize: 13, padding: '7px 10px', background: '#f1f5f9', borderRadius: 6, border: '1px solid var(--border)', color: 'var(--text)', minHeight: 36 }}>
                    {p._profileKey
                      ? (p.category === 'EMP' ? '🧑‍💼 EMP — Employee' : '👨‍👩‍👧 DPN — Dependent')
                      : <span style={{ color: 'var(--muted)' }}>Auto-filled</span>
                    }
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Gender <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select className="form-select" value={p.gender} onChange={e => updatePassenger(idx, 'gender', e.target.value)}>
                    <option value="">— Select —</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
              </div>

              {/* ── Dependent ID + Sponsor UID — DPN only ── */}
              {p.category === 'DPN' && p._profileKey && (
                <div className="form-row" style={{ marginBottom: 4 }}>
                  <div className="form-group">
                    <label className="form-label">Dependent ID <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input
                      className="form-input"
                      value={p.uid}
                      onChange={e => updatePassenger(idx, 'uid', e.target.value)}
                      placeholder="0000910439-01"
                      style={p.uid ? { background: '#f1f5f9', color: 'var(--muted)' } : {}}
                    />
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                      Format: employee ID + sequence (e.g. -01)
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sponsor UID (Employee ID)</label>
                    <input
                      className="form-input"
                      value={myEmployeeId}
                      readOnly
                      style={{ background: '#f1f5f9', color: 'var(--muted)' }}
                    />
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Auto-filled from your profile</div>
                  </div>
                </div>
              )}

              {/* ── Date of Birth — children (Master / Miss) only ── */}
              {isChild(p) && (
                <div className="form-group" style={{ marginBottom: 4 }}>
                  <label className="form-label">Date of Birth <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input className="form-input" type="date" value={p.dob} onChange={e => updatePassenger(idx, 'dob', e.target.value)} />
                </div>
              )}

              {/* ── Other ID Type + ID Number ── */}
              <div className="form-row" style={{ marginBottom: 4 }}>
                <div className="form-group">
                  <label className="form-label">Other ID Type <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select className="form-select" value={p.other_id_type} onChange={e => handleIdTypeChange(idx, e.target.value)}>
                    <option value="NIK">NIK</option>
                    <option value="Passport">Passport</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">ID Number <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    className="form-input"
                    value={p.id_number}
                    onChange={e => updatePassenger(idx, 'id_number', e.target.value)}
                    placeholder={p.other_id_type === 'NIK' ? '16-digit NIK number' : 'Passport number'}
                  />
                  {p._profileKey && !p.id_number && (
                    <div style={{ fontSize: 11, color: '#d97706', marginTop: 3 }}>
                      ⚠️ {p.other_id_type === 'NIK' ? 'NIK' : 'Passport'} not saved in profile — please enter manually
                    </div>
                  )}
                </div>
              </div>

              {/* ── Contact Email + Phone ── */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Contact Email</label>
                  <input className="form-input" type="email" value={p.email} onChange={e => updatePassenger(idx, 'email', e.target.value)} placeholder="email@example.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone / Mobile</label>
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
                  <td>{p.uid || '—'}{p.category === 'DPN' && p.sponsor_uid ? ` (→${p.sponsor_uid})` : ''}</td>
                  <td>{p.gender === 'MALE' ? 'Male' : p.gender === 'FEMALE' ? 'Female' : '—'}</td>
                  <td>{p.dob || '—'}</td>
                  <td>{p.other_id_type}</td>
                  <td>{p.id_number || '—'}</td>
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
