import { useState } from 'react';
import { api } from '../api.js';

export default function LoginPage({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const user = await api.login({ email: email.trim().toLowerCase(), password });
      onLogin(user);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #2563eb 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', top: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />
      <div style={{ position: 'absolute', bottom: -60, right: -60, width: 250, height: 250, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />
      <div style={{ position: 'absolute', top: '40%', right: '10%', width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,.03)' }} />

      <div style={{
        background: 'white',
        borderRadius: 24,
        padding: '44px 40px',
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 34, margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(37,99,235,.35)',
          }}>✈️</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--navy)', letterSpacing: -0.5 }}>YPJ Travel</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, fontWeight: 500 }}>Campus Travel Management System</div>
        </div>

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
            <label className="form-label">Email Address</label>
            <input
              className="form-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@ypj.sch.id"
              disabled={loading}
              style={{ borderRadius: 10 }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your password"
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
              transition: 'opacity .15s',
            }}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <div style={{
          marginTop: 24, fontSize: 12, color: 'var(--muted)',
          textAlign: 'center', lineHeight: 1.6,
          borderTop: '1px solid var(--border)', paddingTop: 16,
        }}>
          Use your school email and the password provided by your administrator.
        </div>
      </div>
    </div>
  );
}
