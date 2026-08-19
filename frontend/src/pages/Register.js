import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';
import { C } from '../theme';

export default function Register() {
  const { register, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [form,     setForm]     = useState({ email: '', password: '', phone: '' });
  const [errors,   setErrors]   = useState({});
  const [success,  setSuccess]  = useState('');
  const [showPass, setShowPass] = useState(false);

  function validate() {
    const e = {};
    if (!form.email) e.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email.';
    if (!form.password) e.password = 'Password is required.';
    else if (form.password.length < 8) e.password = 'Minimum 8 characters.';
    else if (!/[A-Z]/.test(form.password)) e.password = 'Must include an uppercase letter.';
    else if (!/[0-9]/.test(form.password)) e.password = 'Must include a number.';
    else if (!/[!@#$%^&*]/.test(form.password)) e.password = 'Must include a special character.';
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone))
      e.phone = 'Enter valid 10-digit Indian number (starts with 6–9).';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    clearError();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    const phone = form.phone ? `+91${form.phone}` : undefined;
    const result = await register(form.email, form.password, phone);
    if (result.success) {
      setSuccess('Account created! Redirecting…');
      setTimeout(() => navigate('/dashboard'), 1200);
    }
  }

  return (
    <div style={S.page}>
      {/* Left panel */}
      <div style={S.left}>
        <div style={S.leftInner}>
          <div style={S.panelIcon}>🔐</div>
          <h1 style={S.panelTitle}>SecureAuth</h1>
          <p style={S.panelSub}>Enterprise-grade authentication with JWT, 2FA & OTP verification.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {['JWT Access & Refresh Tokens', 'Two-Factor Authentication', 'Indian Mobile OTP', 'Rate-limited & Secure'].map(f => (
              <div key={f} style={S.featureItem}>
                <span style={S.check}>✓</span> {f}
              </div>
            ))}
          </div>
          <div style={{...S.blob, top: '-80px', right: '-80px'}} />
          <div style={{...S.blob, bottom: '-60px', left: '-60px', width: '220px', height: '220px'}} />
        </div>
      </div>

      {/* Right panel */}
      <div style={S.right}>
        <div style={S.formBox}>
          <div style={S.formHeader}>
            <h2 style={S.formTitle}>Create Account</h2>
            <p style={S.formSub}>Join us — it only takes a minute</p>
          </div>

          <Alert type="error"   message={error}   onClose={clearError} />
          <Alert type="success" message={success} />

          <form onSubmit={handleSubmit} noValidate>
            <Field label="Email Address" error={errors.email}>
              <input type="email" placeholder="you@example.com"
                value={form.email} autoComplete="email"
                onChange={e => setForm({...form, email: e.target.value})}
                style={fldStyle(errors.email)} />
            </Field>

            <Field label="Password" error={errors.password}>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'}
                  placeholder="Min 8 chars, A–Z, 0–9, special"
                  value={form.password} autoComplete="new-password"
                  onChange={e => setForm({...form, password: e.target.value})}
                  style={{ ...fldStyle(errors.password), paddingRight: '44px' }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={S.eyeBtn}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
              {/* Strength bar */}
              {form.password && (
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                  {[form.password.length >= 8, /[A-Z]/.test(form.password), /[0-9]/.test(form.password), /[!@#$%^&*]/.test(form.password)].map((ok, i) => (
                    <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: ok ? C.success : C.border, transition: 'background 0.3s' }} />
                  ))}
                </div>
              )}
            </Field>

            <Field label="Mobile Number (optional, for 2FA)" error={errors.phone}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={S.countryCode}>🇮🇳 +91</div>
                <input type="tel" placeholder="9876543210" maxLength={10}
                  value={form.phone} autoComplete="tel"
                  onChange={e => setForm({...form, phone: e.target.value.replace(/\D/g, '')})}
                  style={{ ...fldStyle(errors.phone), flex: 1 }} />
              </div>
              <p style={S.hint}>10-digit Indian number starting with 6, 7, 8 or 9</p>
            </Field>

            <button type="submit" disabled={loading} style={S.btn}>
              {loading ? 'Creating Account…' : 'Create Account →'}
            </button>
          </form>

          <p style={S.switchText}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: C.primary, fontWeight: '600', textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <label style={S.label}>{label}</label>
      {children}
      {error && <p style={{ color: C.error, fontSize: '12px', margin: '4px 0 0' }}>{error}</p>}
    </div>
  );
}

function fldStyle(error) {
  return {
    width: '100%', padding: '11px 14px', fontSize: '14px',
    border: `1.5px solid ${error ? C.error : C.border}`,
    borderRadius: '8px', outline: 'none', boxSizing: 'border-box',
    background: C.inputBg, color: C.textDark, transition: 'border-color 0.2s',
  };
}

const S = {
  page:        { display: 'flex', minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" },
  left:        { flex: '0 0 400px', background: `linear-gradient(150deg, ${C.panelFrom} 0%, ${C.panelMid} 55%, ${C.panelTo} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px', position: 'relative', overflow: 'hidden' },
  leftInner:   { position: 'relative', zIndex: 1, color: '#fff' },
  panelIcon:   { fontSize: '52px', marginBottom: '14px' },
  panelTitle:  { fontSize: '28px', fontWeight: '800', margin: '0 0 10px', color: '#fff' },
  panelSub:    { fontSize: '14px', color: 'rgba(255,255,255,0.82)', margin: '0 0 32px', lineHeight: '1.6' },
  featureItem: { fontSize: '14px', color: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', gap: '10px' },
  check:       { background: 'rgba(255,255,255,0.18)', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 },
  blob:        { position: 'absolute', borderRadius: '50%', width: '260px', height: '260px', background: 'rgba(255,255,255,0.06)' },
  right:       { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.pageBg, padding: '40px 20px', overflowY: 'auto' },
  formBox:     { width: '100%', maxWidth: '420px', background: C.cardBg, borderRadius: '16px', padding: '40px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' },
  formHeader:  { marginBottom: '28px' },
  formTitle:   { fontSize: '24px', fontWeight: '700', color: C.textDark, margin: '0 0 6px' },
  formSub:     { fontSize: '14px', color: C.textMid, margin: 0 },
  label:       { display: 'block', fontSize: '13px', fontWeight: '600', color: C.textMid, marginBottom: '6px' },
  hint:        { color: C.textLight, fontSize: '11px', margin: '4px 0 0' },
  countryCode: { padding: '11px 12px', background: C.infoBg, border: `1.5px solid ${C.border}`, borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: C.textMid, whiteSpace: 'nowrap' },
  eyeBtn:      { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: 0 },
  btn:         { width: '100%', padding: '12px', background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '4px' },
  switchText:  { textAlign: 'center', fontSize: '14px', color: C.textMid, marginTop: '20px' },
};
