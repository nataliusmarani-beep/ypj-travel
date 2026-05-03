import { useEffect } from 'react';

const COLORS = {
  success: { bg: '#dcfce7', border: '#86efac', text: '#15803d', icon: '✅' },
  error:   { bg: '#fee2e2', border: '#fca5a5', text: '#dc2626', icon: '❌' },
  info:    { bg: '#dbeafe', border: '#93c5fd', text: '#1d4ed8', icon: 'ℹ️' },
};

export default function Toast({ message, type = 'info', onClose }) {
  const c = COLORS[type] || COLORS.info;

  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, minWidth: 260, maxWidth: 420,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      borderRadius: 12, padding: '12px 18px',
      boxShadow: '0 4px 20px rgba(0,0,0,.15)',
      display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 14, fontWeight: 600,
      animation: 'fadeInUp .2s ease',
    }}>
      <span>{c.icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 16, color: c.text, opacity: 0.6, padding: 0,
      }}>×</button>
    </div>
  );
}
