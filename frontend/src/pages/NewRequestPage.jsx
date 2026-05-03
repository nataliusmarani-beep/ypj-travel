import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

const AIRPORTS = ['TIM', 'CGK', 'UPG', 'SUB', 'DPS', 'YIA', 'MDC', 'Other'];

const PURPOSE_OPTIONS = [
  { value: 'VAC',    label: 'Vacation' },
  { value: 'EMG',    label: 'Emergency' },
  { value: 'MED',    label: 'Medical' },
  { value: 'COBUS',  label: 'Company Business' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'OTHER',  label: 'Other' },
];

const PAYMENT_OPTIONS = [
  'Cash',
  'Travel Benefit',
  'Travel Allowance',
  'Special Anniversary',
  'Family Visit',
  'Papuan Reward',
  'Cobus',
  'Emergency',
  'Medical',
];

const emptyPassenger = () => ({
  _profileKey:   '',
  _prefix:       '',
  _isVisitor:    false,
  name:          '',
  category:      'EMP',
  uid:           '',
  sponsor_uid:   '',
  gender:        '',
  dob:           '',
  other_id_type: 'NIK',
  id_number:     '',
  _nik:          '',
  _passport:     '',
  email:         '',
  phone:         '',
});

const isChild     = p => p._prefix === 'Master' || p._prefix === 'Miss';
const genderLabel = g => g === 'MALE' ? 'Male' : g === 'FEMALE' ? 'Female' : '';

/* ── Modern Step Indicator ── */
function StepIndicator({ step }) {
  const steps = [
    { label: 'Trip Details', icon: '✈️' },
    { label: 'Passengers',   icon: '👤' },
    { label: 'Review & Submit', icon: '✅' },
  ];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      background: '#fff', borderRadius: 14, padding: '16px 24px',
      marginBottom: 24,
      boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04)',
    }}>
      {steps.map((s, i) => {
        const done   = step > i + 1;
        const active = step === i + 1;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: done ? 16 : 14,
                background: done   ? '#dcfce7'
                          : active ? 'linear-gradient(135deg, #1e3a5f, #2563eb)'
                          : '#f1f5f9',
                color:   done   ? '#16a34a'
                       : active ? '#fff'
                       : '#94a3b8',
                boxShadow: active ? '0 4px 12px rgba(37,99,235,.3)' : 'none',
              }}>
                {done ? '✓' : active ? s.icon : i + 1}
              </div>
              <span style={{
                fontSize: 13, fontWeight: active ? 700 : 500,
                color: active ? 'var(--navy)' : done ? '#16a34a' : '#94a3b8',
                whiteSpace: 'nowrap',
              }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: '0 12px',
                background: done ? '#bbf7d0' : '#e2e8f0',
                borderRadius: 2,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Section heading used inside cards ── */
function SectionHeading({ children }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 700, color: 'var(--navy)',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      marginTop: 20, marginBottom: 12,
      paddingBottom: 8, borderBottom: '2px solid #e0e7ff',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {children}
    </div>
  );
}

/* ── Read-only info display ── */
function ReadonlyField({ value, muted, hint }) {
  return (
    <>
      <div style={{
        padding: '8px 12px', background: '#f8fafc',
        border: '1px solid var(--border)', borderRadius: 10,
        fontSize: 13, color: muted ? 'var(--muted)' : 'var(--text)',
        minHeight: 38, display: 'flex', alignItems: 'center',
      }}>
        {value || <span style={{ color: 'var(--muted)' }}>—</span>}
      </div>
      {hint && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{hint}</div>}
    </>
  );
}

export default function NewRequestPage({ user }) {
  const navigate           = useNavigate();
  const [searchParams]     = useSearchParams();
  const rtiParam           = searchParams.get('rti') || '';

  const [step, setStep]    = useState(1);
  const [rtis, setRtis]    = useState([]);
  const [error, setError]  = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId]   = useState(null);

  /* Step 1 fields */
  const [reqType, setReqType]         = useState(rtiParam ? 'RTI' : 'Regular');
  const [rtiId, setRtiId]             = useState(rtiParam);
  const [transport, setTransport]     = useState('Airplane');
  const [airplaneType, setAirplaneType] = useState('Commercial');
  const [purpose, setPurpose]         = useState('VAC');
  const [payment, setPayment]         = useState('Travel Benefit');
  const [outType, setOutType]         = useState('DOM');
  const [outFrom, setOutFrom]         = useState('TIM');
  const [outFromOther, setOutFromOther] = useState('');
  const [outTo, setOutTo]             = useState('CGK');
  const [outToOther, setOutToOther]   = useState('');
  const [outDate, setOutDate]         = useState('');
  const [busOutRoute, setBusOutRoute] = useState('');
  const [busInRoute, setBusInRoute]   = useState('');
  const [hasReturn, setHasReturn]     = useState(false);
  const [inType, setInType]           = useState('DOM');
  const [inFrom, setInFrom]           = useState('CGK');
  const [inFromOther, setInFromOther] = useState('');
  const [inTo, setInTo]               = useState('TIM');
  const [inToOther, setInToOther]     = useState('');
  const [inDate, setInDate]           = useState('');
  const [notes, setNotes]             = useState('');

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
            name:     me.name     || '',
            prefix:   '',
            category: 'EMP',
            gender:   me.gender   || '',
            uid:      empId,
            nik:      me.nik_number  || '',
            passport: me.passport_id || '',
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
      _isVisitor:    false,
      name:          choice.name,
      category:      choice.category,
      gender:        choice.gender,
      uid:           choice.uid,
      sponsor_uid:   choice.category === 'DPN' ? myEmployeeId : '',
      _nik:          choice.nik,
      _passport:     choice.passport,
      other_id_type: idType,
      id_number:     idNum || '',
      dob:           choice.dob || '',
      email:         choice.email || p.email,
    }));
  };

  const handleIdTypeChange = (idx, newType) => {
    setPassengers(ps => ps.map((p, i) => {
      if (i !== idx) return p;
      const autoId = newType === 'NIK' ? p._nik : p._passport;
      return { ...p, other_id_type: newType, id_number: autoId || '' };
    }));
  };

  const resolveAirport = (val, other) => val === 'Other' ? other : val;

  const validateStep1 = () => {
    if (reqType === 'RTI' && !rtiId) return 'Please select an RTI event.';
    if (transport === 'Bus') {
      if (!busOutRoute) return 'Please select a bus route.';
      if (!outDate)     return 'Please select a departure date.';
      if (hasReturn) {
        if (!busInRoute) return 'Please select a return bus route.';
        if (!inDate)     return 'Please select a return date.';
      }
    } else {
      if (!outFrom || !outTo)          return 'Please fill in outbound airports.';
      if (outFrom === 'Other' && !outFromOther.trim()) return 'Please specify the departure airport.';
      if (outTo   === 'Other' && !outToOther.trim())   return 'Please specify the destination airport.';
      if (!outDate)                    return 'Please select an outbound travel date.';
      if (hasReturn) {
        if (!inDate) return 'Please select a return date.';
        if (inFrom === 'Other' && !inFromOther.trim()) return 'Please specify the return departure airport.';
        if (inTo   === 'Other' && !inToOther.trim())   return 'Please specify the return destination airport.';
      }
    }
    return '';
  };

  const validateStep2 = () => {
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      const n = `Passenger ${i+1}`;
      if (p._isVisitor) {
        if (!p.name.trim())      return `${n}: Full name is required.`;
        if (!p.gender)           return `${n}: Gender is required.`;
        if (!p.id_number.trim()) return `${n}: ID number is required.`;
      } else {
        if (!p._profileKey)               return `${n}: Please select a person from the list.`;
        if (!p.gender)                    return `${n}: Gender not set in profile — please update your profile.`;
        if (isChild(p) && !p.dob)         return `${n}: Date of birth is required for children.`;
        if (!p.id_number.trim())          return `${n}: ID number is required.`;
        if (p.category === 'DPN' && !p.uid.trim())         return `${n}: Dependent ID is required.`;
        if (p.category === 'DPN' && !p.sponsor_uid.trim()) return `${n}: Sponsor UID is required.`;
      }
      if (!p.email.trim()) return `${n}: Contact email is required.`;
      if (!p.phone.trim()) return `${n}: Phone / mobile number is required.`;
    }
    return '';
  };

  const handleNextStep1 = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError(''); setStep(2);
  };

  const handleNextStep2 = () => {
    const err = validateStep2();
    if (err) { setError(err); return; }
    setError(''); setStep(3);
  };

  /* Derive bus from/to from route key */
  const busFrom = route => route === 'TPN-TIM' ? 'TPN' : route === 'TIM-TPN' ? 'TIM' : '';
  const busTo   = route => route === 'TPN-TIM' ? 'TIM' : route === 'TIM-TPN' ? 'TPN' : '';

  const handleSubmit = async () => {
    setSubmitting(true); setError('');
    try {
      const isBus = transport === 'Bus';
      const payload = {
        request_type:    reqType,
        rti_event_id:    reqType === 'RTI' ? rtiId : null,
        transport_type:  isBus ? 'bus' : 'plane',
        airplane_type:   !isBus ? airplaneType : null,
        travel_purpose:  purpose,
        payment_method:  isBus ? null : payment,
        outbound_type:   isBus ? 'DOM' : outType,
        outbound_from:   isBus ? busFrom(busOutRoute) : resolveAirport(outFrom, outFromOther),
        outbound_to:     isBus ? busTo(busOutRoute)   : resolveAirport(outTo, outToOther),
        outbound_date:   outDate,
        has_inbound:     hasReturn,
        inbound_type:    hasReturn ? (isBus ? 'DOM' : inType) : null,
        inbound_from:    hasReturn ? (isBus ? busFrom(busInRoute) : resolveAirport(inFrom, inFromOther)) : null,
        inbound_to:      hasReturn ? (isBus ? busTo(busInRoute)   : resolveAirport(inTo, inToOther))    : null,
        inbound_date:    hasReturn ? inDate : null,
        notes,
        passengers: passengers.map(p => ({
          passenger_name: p.name.trim(),
          category:       p._isVisitor ? 'VST' : p.category,
          uid:            p.uid.trim()  || null,
          sponsor_uid:    p._isVisitor  ? myEmployeeId : (p.sponsor_uid.trim() || null),
          gender:         p.gender      || null,
          date_of_birth:  p.dob         || null,
          id_type:        p.other_id_type,
          id_number:      p.id_number.trim(),
          contact_email:  p.email.trim(),
          phone:          p.phone.trim(),
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

  const updatePassenger = (idx, field, value) =>
    setPassengers(ps => ps.map((p, i) => i === idx ? { ...p, [field]: value } : p));

  const addPassenger    = () => setPassengers(ps => [...ps, emptyPassenger()]);
  const removePassenger = (idx) => setPassengers(ps => ps.filter((_, i) => i !== idx));

  /* ── Input/select style helpers ── */
  const inputSx  = { borderRadius: 10 };
  const selectSx = { borderRadius: 10 };

  /* ── Success Screen ── */
  if (successId) {
    return (
      <div>
        {/* Page Header */}
        <div style={{
          background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
          borderRadius: 20, padding: '24px 28px', marginBottom: 24,
          boxShadow: '0 4px 20px rgba(21,128,61,.25)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.07)' }} />
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', position: 'relative' }}>Request Submitted</div>
        </div>

        <div style={{
          background: '#fff', borderRadius: 20, padding: '56px 40px', textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 4px 24px rgba(0,0,0,.06)',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, #15803d, #16a34a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, margin: '0 auto 20px',
            boxShadow: '0 8px 24px rgba(22,163,74,.35)',
          }}>✅</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>
            Your request has been submitted!
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
            Request ID: <strong style={{ color: 'var(--navy)' }}>#{successId}</strong>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32 }}>
            PIC Travel will review and process your request. You will be notified of status updates.
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              style={{
                padding: '11px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                background: '#f1f5f9', color: 'var(--navy)', border: 'none', cursor: 'pointer',
              }}
              onClick={() => navigate('/my-requests')}
            >
              View My Requests
            </button>
            <button
              style={{
                padding: '11px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', color: '#fff',
                border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37,99,235,.35)',
              }}
              onClick={() => { setStep(1); setSuccessId(null); setPassengers([emptyPassenger()]); }}
            >
              + Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Error box ── */
  const ErrorBox = ({ msg }) => msg ? (
    <div style={{
      background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12,
      padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#dc2626',
      display: 'flex', alignItems: 'flex-start', gap: 8,
    }}>
      <span>⚠️</span> {msg}
    </div>
  ) : null;

  return (
    <div>
      {/* Page Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
        borderRadius: 20, padding: '24px 28px', marginBottom: 24,
        boxShadow: '0 4px 20px rgba(30,58,95,.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            ✈️ Travel Request
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>New Travel Request</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>Fill in the details for your trip</div>
        </div>
      </div>

      <StepIndicator step={step} />
      <ErrorBox msg={error} />

      {/* ═══════════════ STEP 1: Trip Details ═══════════════ */}
      {step === 1 && (
        <div style={{
          background: '#fff', borderRadius: 16, padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04)',
        }}>
          <SectionHeading>🗂️ Request Info</SectionHeading>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Request Type</label>
              <select className="form-select" style={selectSx} value={reqType} onChange={e => setReqType(e.target.value)}>
                <option value="Regular">Regular</option>
                <option value="RTI">RTI — Registered Travel</option>
              </select>
            </div>
            {reqType === 'RTI' && (
              <div className="form-group">
                <label className="form-label">RTI Event</label>
                <select className="form-select" style={selectSx} value={rtiId} onChange={e => setRtiId(e.target.value)}>
                  <option value="">— Select RTI Event —</option>
                  {rtis.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Transport Type</label>
              <select className="form-select" style={selectSx} value={transport} onChange={e => setTransport(e.target.value)}>
                <option value="Airplane">✈️ Airplane</option>
                <option value="Bus">🚌 Bus</option>
              </select>
            </div>
            {transport === 'Airplane' && (
              <div className="form-group">
                <label className="form-label">Airplane Type</label>
                <select className="form-select" style={selectSx} value={airplaneType} onChange={e => setAirplaneType(e.target.value)}>
                  <option value="Airfast Indonesia">Airfast Indonesia</option>
                  <option value="Commercial">Commercial</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Travel Purpose</label>
              <select className="form-select" style={selectSx} value={purpose} onChange={e => setPurpose(e.target.value)}>
                {PURPOSE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value} — {o.label}</option>)}
              </select>
            </div>
            {transport === 'Airplane' && (
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-select" style={selectSx} value={payment} onChange={e => setPayment(e.target.value)}>
                  {PAYMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            )}
          </div>

          <SectionHeading>🛫 Outbound Trip</SectionHeading>
          {transport === 'Bus' ? (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Bus Route</label>
                <select className="form-select" style={selectSx} value={busOutRoute} onChange={e => setBusOutRoute(e.target.value)}>
                  <option value="">— Select Route —</option>
                  <option value="TPN-TIM">🚌 Tembagapura → Timika</option>
                  <option value="TIM-TPN">🚌 Timika → Tembagapura</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Departure Date</label>
                <input className="form-input" style={inputSx} type="date" value={outDate} onChange={e => setOutDate(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" style={selectSx} value={outType} onChange={e => setOutType(e.target.value)}>
                  <option value="DOM">Domestic (DOM)</option>
                  <option value="INT">International (INT)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">From Airport</label>
                <select className="form-select" style={selectSx} value={outFrom} onChange={e => setOutFrom(e.target.value)}>
                  {AIRPORTS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                {outFrom === 'Other' && (
                  <input className="form-input" style={{ ...inputSx, marginTop: 6 }} placeholder="Airport code / name" value={outFromOther} onChange={e => setOutFromOther(e.target.value)} />
                )}
              </div>
              <div className="form-group">
                <label className="form-label">To Airport</label>
                <select className="form-select" style={selectSx} value={outTo} onChange={e => setOutTo(e.target.value)}>
                  {AIRPORTS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                {outTo === 'Other' && (
                  <input className="form-input" style={{ ...inputSx, marginTop: 6 }} placeholder="Airport code / name" value={outToOther} onChange={e => setOutToOther(e.target.value)} />
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Departure Date</label>
                <input className="form-input" style={inputSx} type="date" value={outDate} onChange={e => setOutDate(e.target.value)} />
              </div>
            </div>
          )}

          {/* Return toggle */}
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            padding: '9px 16px', borderRadius: 10, userSelect: 'none', marginBottom: 4,
            background: hasReturn ? '#dbeafe' : '#f8fafc',
            border: `1.5px solid ${hasReturn ? '#93c5fd' : 'var(--border)'}`,
            fontSize: 13, fontWeight: 600,
            color: hasReturn ? '#1d4ed8' : 'var(--muted)',
          }}>
            <input
              type="checkbox"
              id="hasReturn"
              checked={hasReturn}
              onChange={e => setHasReturn(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            🔄 Add Inbound Trip
          </label>

          {hasReturn && (
            <>
              <SectionHeading>🛬 Inbound Trip</SectionHeading>
              {transport === 'Bus' ? (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Bus Route</label>
                    <select className="form-select" style={selectSx} value={busInRoute} onChange={e => setBusInRoute(e.target.value)}>
                      <option value="">— Select Route —</option>
                      <option value="TPN-TIM">🚌 Tembagapura → Timika</option>
                      <option value="TIM-TPN">🚌 Timika → Tembagapura</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Return Date</label>
                    <input className="form-input" style={inputSx} type="date" value={inDate} onChange={e => setInDate(e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-select" style={selectSx} value={inType} onChange={e => setInType(e.target.value)}>
                      <option value="DOM">Domestic (DOM)</option>
                      <option value="INT">International (INT)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">From Airport</label>
                    <select className="form-select" style={selectSx} value={inFrom} onChange={e => setInFrom(e.target.value)}>
                      {AIRPORTS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    {inFrom === 'Other' && (
                      <input className="form-input" style={{ ...inputSx, marginTop: 6 }} placeholder="Airport code / name" value={inFromOther} onChange={e => setInFromOther(e.target.value)} />
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">To Airport</label>
                    <select className="form-select" style={selectSx} value={inTo} onChange={e => setInTo(e.target.value)}>
                      {AIRPORTS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    {inTo === 'Other' && (
                      <input className="form-input" style={{ ...inputSx, marginTop: 6 }} placeholder="Airport code / name" value={inToOther} onChange={e => setInToOther(e.target.value)} />
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Return Date</label>
                    <input className="form-input" style={inputSx} type="date" value={inDate} onChange={e => setInDate(e.target.value)} />
                  </div>
                </div>
              )}
            </>
          )}

          <SectionHeading>📝 Additional Info</SectionHeading>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" style={{ borderRadius: 10 }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special requests or additional information…" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button
              style={{
                padding: '11px 28px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', color: '#fff',
                border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,.3)',
              }}
              onClick={handleNextStep1}
            >
              Next: Passengers →
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════ STEP 2: Passengers ═══════════════ */}
      {step === 2 && (
        <div>
          {!profileReady && (
            <div style={{
              background: '#fff', borderRadius: 14, padding: '14px 20px', marginBottom: 16,
              fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,.06)',
            }}>
              <span>⏳</span> Loading your profile…
            </div>
          )}

          {passengers.map((p, idx) => (
            <div key={idx} style={{
              background: '#fff', borderRadius: 16, padding: '20px 24px', marginBottom: 16,
              boxShadow: p._isVisitor
                ? '0 0 0 2px #f59e0b, 0 4px 16px rgba(245,158,11,.08)'
                : '0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04)',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0,
                  }}>{idx + 1}</div>
                  <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14 }}>
                    Passenger {idx + 1}
                    {p.name && <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 13 }}> — {p.name}</span>}
                  </div>
                </div>
                {passengers.length > 1 && (
                  <button
                    style={{
                      padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer',
                    }}
                    onClick={() => removePassenger(idx)}
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Visitor toggle */}
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 18,
                padding: '8px 16px', borderRadius: 10, cursor: 'pointer', userSelect: 'none',
                background: p._isVisitor ? '#fef3c7' : '#f8fafc',
                border: `1.5px solid ${p._isVisitor ? '#f59e0b' : 'var(--border)'}`,
                fontSize: 13, fontWeight: 600,
                color: p._isVisitor ? '#92400e' : 'var(--muted)',
              }}>
                <input
                  type="checkbox"
                  checked={p._isVisitor}
                  onChange={e => {
                    const isV = e.target.checked;
                    setPassengers(ps => ps.map((x, i) => i !== idx ? x : {
                      ...emptyPassenger(),
                      _isVisitor:  isV,
                      sponsor_uid: isV ? myEmployeeId : '',
                      category:    isV ? 'VST' : 'EMP',
                    }));
                  }}
                  style={{ width: 15, height: 15 }}
                />
                🙋 This passenger is a VISITOR
              </label>

              {/* ── VISITOR form ── */}
              {p._isVisitor && (
                <>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="form-label">Full Name <span style={{ color: '#ef4444' }}>*</span></label>
                    <input className="form-input" style={inputSx} value={p.name}
                      onChange={e => updatePassenger(idx, 'name', e.target.value)}
                      placeholder="Visitor's full name as on ID" />
                  </div>

                  <div className="form-row" style={{ marginBottom: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <div style={{
                        padding: '8px 12px', background: '#fef3c7',
                        border: '1px solid #f59e0b', borderRadius: 10,
                        fontSize: 13, fontWeight: 700, color: '#92400e',
                      }}>
                        🙋 VST — Visitor
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Gender <span style={{ color: '#ef4444' }}>*</span></label>
                      <select className="form-select" style={selectSx} value={p.gender} onChange={e => updatePassenger(idx, 'gender', e.target.value)}>
                        <option value="">— Select —</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row" style={{ marginBottom: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Visitor ID</label>
                      <input className="form-input" style={inputSx} value={p.uid}
                        onChange={e => updatePassenger(idx, 'uid', e.target.value)}
                        placeholder="Visitor ID / Badge number" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Sponsor UID (Employee ID) <span style={{ color: '#ef4444' }}>*</span></label>
                      <ReadonlyField value={myEmployeeId} muted hint="Auto-filled from your profile" />
                    </div>
                  </div>

                  <div className="form-row" style={{ marginBottom: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Other ID Type <span style={{ color: '#ef4444' }}>*</span></label>
                      <select className="form-select" style={selectSx} value={p.other_id_type} onChange={e => updatePassenger(idx, 'other_id_type', e.target.value)}>
                        <option value="NIK">NIK</option>
                        <option value="Passport">Passport</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">ID Number <span style={{ color: '#ef4444' }}>*</span></label>
                      <input className="form-input" style={inputSx} value={p.id_number}
                        onChange={e => updatePassenger(idx, 'id_number', e.target.value)}
                        placeholder={p.other_id_type === 'NIK' ? '16-digit NIK number' : 'Passport number'} />
                    </div>
                  </div>
                </>
              )}

              {/* ── NORMAL (profile) form ── */}
              {!p._isVisitor && (
                <>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="form-label">Full Name <span style={{ color: '#ef4444' }}>*</span></label>
                    <select className="form-select" style={selectSx} value={p._profileKey} onChange={e => applyProfileChoice(idx, e.target.value)}>
                      <option value="">— Select person from profile —</option>
                      {profileChoices.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                    {p._profileKey && (
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: 'var(--navy)',
                        padding: '7px 12px', background: '#f0f9ff',
                        border: '1px solid #bae6fd', borderRadius: 10, marginTop: 6,
                      }}>
                        {p.name}
                      </div>
                    )}
                  </div>

                  <div className="form-row" style={{ marginBottom: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <div style={{
                        padding: '8px 12px', background: '#f8fafc',
                        border: '1px solid var(--border)', borderRadius: 10,
                        fontSize: 13, minHeight: 38, display: 'flex', alignItems: 'center',
                      }}>
                        {p._profileKey
                          ? (p.category === 'EMP'
                              ? <span style={{ fontWeight: 700, color: '#1d4ed8' }}>🧑‍💼 EMP — Employee</span>
                              : <span style={{ fontWeight: 700, color: '#b45309' }}>👨‍👩‍👧 DPN — Dependent</span>)
                          : <span style={{ color: 'var(--muted)' }}>Auto-filled</span>}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Gender</label>
                      {p.gender ? (
                        <ReadonlyField value={genderLabel(p.gender)} />
                      ) : (
                        <>
                          <select className="form-select" style={selectSx} value={p.gender} onChange={e => updatePassenger(idx, 'gender', e.target.value)}>
                            <option value="">— Select —</option>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                          </select>
                          {p._profileKey && <div style={{ fontSize: 11, color: '#d97706', marginTop: 3 }}>⚠️ Gender not set in profile</div>}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Employee ID — EMP only */}
                  {p.category === 'EMP' && p._profileKey && (
                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <label className="form-label">Employee ID</label>
                      <ReadonlyField value={p.uid} muted hint={!p.uid ? '⚠️ Employee ID not set in profile — please update your profile' : ''} />
                    </div>
                  )}

                  {/* Dependent ID + Sponsor UID — DPN only */}
                  {p.category === 'DPN' && p._profileKey && (
                    <div className="form-row" style={{ marginBottom: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Dependent ID <span style={{ color: '#ef4444' }}>*</span></label>
                        <input className="form-input" style={inputSx} value={p.uid}
                          onChange={e => updatePassenger(idx, 'uid', e.target.value)}
                          placeholder="0000910439-01" />
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Format: employee ID + sequence (e.g. -01)</div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Sponsor UID (Employee ID) <span style={{ color: '#ef4444' }}>*</span></label>
                        <ReadonlyField value={myEmployeeId} muted hint="Auto-filled from your profile" />
                      </div>
                    </div>
                  )}

                  {/* Date of Birth + Age — shown for all profile passengers */}
                  {p._profileKey && (
                    <div className="form-row" style={{ marginBottom: 12 }}>
                      <div className="form-group">
                        <label className="form-label">
                          Date of Birth {isChild(p) && <span style={{ color: '#ef4444' }}>*</span>}
                        </label>
                        {isChild(p) ? (
                          <input className="form-input" style={inputSx} type="date" value={p.dob}
                            onChange={e => updatePassenger(idx, 'dob', e.target.value)} />
                        ) : (
                          <ReadonlyField value={p.dob ? new Date(p.dob).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : ''} muted hint="From profile" />
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Age</label>
                        <input
                          className="form-input" style={{ ...inputSx, background: '#f8fafc', cursor: 'not-allowed' }}
                          type="number"
                          value={p.dob ? Math.max(0, Math.floor((Date.now() - new Date(p.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))) : ''}
                          readOnly
                          placeholder="Auto-filled from DOB"
                        />
                      </div>
                    </div>
                  )}

                  {/* Other ID Type + ID Number */}
                  <div className="form-row" style={{ marginBottom: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Other ID Type <span style={{ color: '#ef4444' }}>*</span></label>
                      <select className="form-select" style={selectSx} value={p.other_id_type} onChange={e => handleIdTypeChange(idx, e.target.value)}>
                        <option value="NIK">NIK</option>
                        <option value="Passport">Passport</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">ID Number <span style={{ color: '#ef4444' }}>*</span></label>
                      <input className="form-input" style={inputSx} value={p.id_number}
                        onChange={e => updatePassenger(idx, 'id_number', e.target.value)}
                        placeholder={p.other_id_type === 'NIK' ? '16-digit NIK number' : 'Passport number'} />
                      {p._profileKey && !p.id_number && (
                        <div style={{ fontSize: 11, color: '#d97706', marginTop: 3 }}>
                          ⚠️ {p.other_id_type === 'NIK' ? 'NIK' : 'Passport'} not saved in profile — enter manually
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Contact — always shown */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                  📞 Contact Details
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Contact Email <span style={{ color: '#ef4444' }}>*</span></label>
                    <input className="form-input" style={inputSx} type="email" value={p.email}
                      onChange={e => updatePassenger(idx, 'email', e.target.value)}
                      placeholder="Preferred to personal email (active)" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone / Mobile <span style={{ color: '#ef4444' }}>*</span></label>
                    <input className="form-input" style={inputSx} value={p.phone}
                      onChange={e => updatePassenger(idx, 'phone', e.target.value)}
                      placeholder="The active number" />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            style={{
              padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700,
              background: '#f0f4ff', color: '#2563eb',
              border: '1.5px dashed #93c5fd', cursor: 'pointer', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
            onClick={addPassenger}
          >
            + Add Passenger
          </button>

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingTop: 16, borderTop: '1px solid var(--border)',
          }}>
            <button
              style={{
                padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                background: '#f1f5f9', color: 'var(--navy)', border: 'none', cursor: 'pointer',
              }}
              onClick={() => { setStep(1); setError(''); }}
            >
              ← Back
            </button>
            <button
              style={{
                padding: '11px 28px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', color: '#fff',
                border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,.3)',
              }}
              onClick={handleNextStep2}
            >
              Next: Review →
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════ STEP 3: Review & Submit ═══════════════ */}
      {step === 3 && (
        <div style={{
          background: '#fff', borderRadius: 16, padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04)',
        }}>
          <SectionHeading>🗂️ Trip Summary</SectionHeading>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 10, marginBottom: 20 }}>
            {[
              ['Request Type', reqType + (rtiId ? ` — ${rtis.find(r=>r.id==rtiId)?.name||rtiId}` : '')],
              ['Transport',    transport === 'Airplane' ? `✈️ Airplane (${airplaneType})` : '🚌 Bus'],
              ['Purpose',      purpose],
              ...(transport === 'Airplane' ? [['Payment', payment]] : []),
              ['Outbound', transport === 'Bus'
                ? (busOutRoute === 'TPN-TIM' ? 'Tembagapura → Timika' : busOutRoute === 'TIM-TPN' ? 'Timika → Tembagapura' : '—')
                : `${resolveAirport(outFrom,outFromOther)} → ${resolveAirport(outTo,outToOther)}`],
              ['Depart Date',  outDate],
              ...(hasReturn ? [
                ['Inbound', transport === 'Bus'
                  ? (busInRoute === 'TPN-TIM' ? 'Tembagapura → Timika' : busInRoute === 'TIM-TPN' ? 'Timika → Tembagapura' : '—')
                  : `${resolveAirport(inFrom,inFromOther)} → ${resolveAirport(inTo,inToOther)}`],
                ['Inbound Date', inDate],
              ] : []),
            ].map(([k, v]) => (
              <div key={k} style={{
                background: '#f8fafc', borderRadius: 10, padding: '10px 14px',
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{v || '—'}</div>
              </div>
            ))}
          </div>
          {notes && (
            <div style={{
              background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
              padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#78350f',
            }}>
              <strong>Notes:</strong> {notes}
            </div>
          )}

          <SectionHeading>👤 Passengers ({passengers.length})</SectionHeading>
          <div style={{ overflowX: 'auto', marginBottom: 24 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>Cat</th><th>UID</th><th>Gender</th><th>DOB</th><th>ID Type</th><th>ID Number</th>
                </tr>
              </thead>
              <tbody>
                {passengers.map((p, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--muted)', fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                        background: p.category === 'EMP' ? '#dbeafe' : p.category === 'DPN' ? '#fef3c7' : '#f3e8ff',
                        color: p.category === 'EMP' ? '#1d4ed8' : p.category === 'DPN' ? '#b45309' : '#7c3aed',
                      }}>{p.category}</span>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {p.uid || '—'}
                      {p.category === 'DPN' && p.sponsor_uid ? <span style={{ color: 'var(--muted)' }}> →{p.sponsor_uid}</span> : ''}
                    </td>
                    <td>{p.gender === 'MALE' ? 'Male' : p.gender === 'FEMALE' ? 'Female' : '—'}</td>
                    <td style={{ fontSize: 12 }}>{p.dob || '—'}</td>
                    <td style={{ fontSize: 12 }}>{p.other_id_type}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.id_number || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12,
            padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#15803d',
          }}>
            ✅ Please review all details above before submitting. Once submitted, PIC Travel will be notified to process your request.
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              style={{
                padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                background: '#f1f5f9', color: 'var(--navy)', border: 'none', cursor: 'pointer',
              }}
              onClick={() => { setStep(2); setError(''); }}
            >
              ← Back
            </button>
            <button
              style={{
                padding: '11px 32px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                background: submitting ? '#86efac' : 'linear-gradient(135deg, #15803d, #16a34a)',
                color: '#fff', border: 'none',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(22,163,74,.35)',
              }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? '⏳ Submitting…' : '✓ Submit Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
