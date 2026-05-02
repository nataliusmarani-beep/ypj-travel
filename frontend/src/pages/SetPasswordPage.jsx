import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api.js';

export default function SetPasswordPage() {
  const [searchParams]          = useSearchParams();
  const token                   = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!token) {
      setError('Invalid or missing token. Please use the link from your welcome email.');
      return;
    }
    setLoading(true);
    try {
      await api.setPassword({ token, password });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to set password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0d9488 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />
      <div style={{ position: 'absolute', bottom: -60, right: -60, width: 250, height: 250, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />

      <div style={{
        background: 'white',
        borderRadius: 24,
        padding: '44px 40px',
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        position: 'relative',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'linear-gradient(135deg, #1e3a5f, #0d9488)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 34, margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(13,148,136,.35)',
          }}>✈️</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--navy)', letterSpacing: -0.5 }}>YPJ Travel</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, fontWeight: 500 }}>Set Your Password</div>
        </div>

        {success ? (
          <div>
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12,
              padding: '16px 20px', marginBottom: 20, textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 700, color: '#15803d', fontSize: 14 }}>Password set successfully!</div>
              <div style={{ fontSize: 12, color: '#16a34a', marginTop: 4 }}>You can now sign in with your new password.</div>
            </div>
            <Link
              to="/login"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '100%', padding: '12px 16px', marginTop: 8,
                background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
                color: '#fff', fontWeight: 700, fontSize: 15,
                border: 'none', borderRadius: 12, textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(37,99,235,.4)',
              }}
            >
              Go to Sign In →
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
                padding: '10px 14px', marginBottom: 18, fontSize: 13, color: '#dc2626',
              }}>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  className="form-input"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  disabled={loading}
                  style={{ borderRadius: 10 }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  className="form-input"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  disabled={loading}
                  style={{ borderRadius: 10 }}
                />
              </div>
              <button
                type="submit"
                style={{
                  width: '100%', marginTop: 8, padding: '12px 16px',
                  background: loading ? '#93c5fd' : 'linear-gradient(135deg, #1e3a5f, #2563eb)',
                  color: '#fff', fontWeight: 700, fontSize: 15,
                  border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(37,99,235,.4)',
                }}
                disabled={loading}
              >
                {loading ? 'Saving…' : 'Save Password →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
