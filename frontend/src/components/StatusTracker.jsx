const FLOW_STEPS = [
  { key: 'submitted',        label: 'Submitted' },
  { key: 'processing',       label: 'Processing' },
  { key: 'booked',           label: 'Booked' },
  { key: 'awaiting_payment', label: 'Awaiting Payment' },
  { key: 'confirmed',        label: 'Confirmed' },
];

export default function StatusTracker({ status }) {
  if (status === 'cancelled') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', background: '#fef2f2',
        borderRadius: 10, border: '1px solid #fecaca', margin: '12px 0',
      }}>
        <span style={{ fontSize: 16 }}>✕</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>This request has been cancelled</span>
      </div>
    );
  }

  const currentIdx = FLOW_STEPS.findIndex(s => s.key === status);

  return (
    <div style={{ padding: '14px 0 10px', overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', minWidth: 300 }}>
        {FLOW_STEPS.map((step, i) => {
          const done    = i < currentIdx;
          const active  = i === currentIdx;
          const future  = i > currentIdx;
          const isFirst = i === 0;
          const isLast  = i === FLOW_STEPS.length - 1;
          const dotColor      = (done || active) ? '#22c55e' : '#d1d5db';
          const leftLineColor = done || active ? '#22c55e' : '#d1d5db';
          const rightLineColor = done ? '#22c55e' : '#d1d5db';

          return (
            <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                fontSize: 10, fontWeight: 700, lineHeight: 1.3, textAlign: 'center',
                color: future ? '#9ca3af' : '#111827', marginBottom: 6,
              }}>
                {step.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <div style={{ flex: 1, height: 3, background: isFirst ? 'transparent' : leftLineColor }} />
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: dotColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: active ? '0 0 0 4px rgba(34,197,94,.25)' : 'none',
                }}>
                  {(done || active) && (
                    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                      <path d="M1 4.5L4 7.5L10 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1, height: 3, background: isLast ? 'transparent' : rightLineColor }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
