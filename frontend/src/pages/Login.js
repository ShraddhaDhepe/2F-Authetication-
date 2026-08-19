import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';
import { C } from '../theme';

export default function Login() {
  const { login, verify2FALogin, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [form,        setForm]        = useState({ email: '', password: '' });
  const [errors,      setErrors]      = useState({});
  const [showPass,    setShowPass]    = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId,      setUserId]      = useState(null);
  const [otp,         setOtp]         = useState('');
  const [otpError,    setOtpError]    = useState('');
  const [otpLoading,  setOtpLoading]  = useState(false);

  function validate() {
    const e = {};
    if (!form.email)    e.email    = 'Email is required.';
    if (!form.password) e.password = 'Password is required.';
    return e;
  }

  async function handleLogin(e) {
    e.preventDefault();
    clearError();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    const result = await login(form.email, form.password);
    if (result.success) {
      if (result.requires2FA) { setRequires2FA(true); setUserId(result.userId); }
      else navigate('/dashboard');
    }
  }

  async function handleOTPSubmit(e) {
    e.preventDefault();
    if (!otp || otp.length !== 6) { setOtpError('Enter the 6-digit OTP.'); return; }
    setOtpError(''); setOtpLoading(true);
    const result = await verify2FALogin(otp, userId);
    setOtpLoading(false);
    if (result.success) navigate('/dashboard');
    else setOtpError(result.message);
  }

  if (requires2FA) {
    return (
      <div style={S.page}>
        <LeftPanel
          icon="🔒"
          title="Two-Factor Auth"
          subtitle="Your account is protected with an extra layer of security."
          extra={
            <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
              {[1,2,3,4,5,6].map(i => (
                <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(255,255,255,0.35)' }} />
              ))}
            </div>
          }
        />
        <div style={S.right}>
          <div style={S.formBox}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={S.otpIconWrap}>📱</div>
              <h2 style={S.formTitle}>Enter OTP</h2>
              <p style={S.formSub}>A 6-digit code was sent to your registered mobile number</p>
            </div>
            <Alert type="error" message={otpError} onClose={() => setOtpError('')} />
            <form onSubmit={handleOTPSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={S.label}>One-Time Password</label>
                <input
                  type="text" placeholder="• • • • • •" maxLength={6}
                  value={otp} autoComplete="one-time-code"
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  style={{ ...fldStyle(otpError), fontSize: '26px', textAlign: 'center', letterSpacing: '10px', fontWeight: '700' }}
                />
              </div>
              <button type="submit" disabled={otpLoading} style={S.btn}>
                {otpLoading ? 'Verifying…' : 'Verify Code →'}
              </button>
              <button type="button" onClick={() => { setRequires2FA(false); setOtp(''); }} style={S.btnOutline}>
                ← Back to Login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <LeftPanel
        icon="🔐"
        title="SecureAuth"
        subtitle="Professional authentication platform with JWT, 2FA & OTP verification."
        features={['JWT Access & Refresh Tokens', 'SMS Two-Factor Auth', 'Indian Mobile OTP', 'Secure Password Reset']}
      />
      <div style={S.right}>
        <div style={S.formBox}>
          <div style={S.formHeader}>
            <h2 style={S.formTitle}>Welcome Back 👋</h2>
            <p style={S.formSub}>Sign in to your account to continue</p>
          </div>
          <Alert type="error" message={error} onClose={clearError} />
          <form onSubmit={handleLogin} noValidate>
            <Field label="Email Address" error={errors.email}>
              <input type="email" placeholder="you@example.com"
                value={form.email} autoComplete="email"
                onChange={e => setForm({...form, email: e.target.value})}
                style={fldStyle(errors.email)} />
            </Field>
            <Field label="Password" error={errors.password}>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} placeholder="Your password"
                  value={form.password} autoComplete="current-password"
                  onChange={e => setForm({...form, password: e.target.value})}
                  style={{ ...fldStyle(errors.password), paddingRight: '44px' }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={S.eyeBtn}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </Field>
            <div style={{ textAlign: 'right', marginTop: '-10px', marginBottom: '20px' }}>
              <Link to="/forgot-password" style={{ fontSize: '13px', color: C.primary, textDecoration: 'none', fontWeight: '500' }}>
                Forgot password?
              </Link>
            </div>
            <button type="submit" disabled={loading} style={S.btn}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>
          <p style={S.switchText}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: C.primary, fontWeight: '600', textDecoration: 'none' }}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function LeftPanel({ icon, title, subtitle, features, extra }) {
  return (
    <div style={S.left}>
      <div style={S.leftInner}>
        <div style={S.panelIcon}>{icon}</div>
        <h1 style={S.panelTitle}>{title}</h1>
        <p style={S.panelSub}>{subtitle}</p>
        {features && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {features.map(f => (
              <div key={f} style={S.featureItem}>
                <span style={S.check}>✓</span> {f}
              </div>
            ))}
          </div>
        )}
        {extra}
        <div style={{...S.blob, top: '-80px', right: '-80px' }} />
        <div style={{...S.blob, bottom: '-60px', left: '-60px', width: '220px', height: '220px' }} />
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
  page:       { display: 'flex', minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" },
  left:       { flex: '0 0 400px', background: `linear-gradient(150deg, ${C.panelFrom} 0%, ${C.panelMid} 55%, ${C.panelTo} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px', position: 'relative', overflow: 'hidden' },
  leftInner:  { position: 'relative', zIndex: 1, color: '#fff' },
  panelIcon:  { fontSize: '52px', marginBottom: '14px' },
  panelTitle: { fontSize: '28px', fontWeight: '800', margin: '0 0 10px', color: '#fff' },
  panelSub:   { fontSize: '14px', color: 'rgba(255,255,255,0.82)', margin: '0 0 32px', lineHeight: '1.6' },
  featureItem:{ fontSize: '14px', color: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', gap: '10px' },
  check:      { background: 'rgba(255,255,255,0.18)', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 },
  blob:       { position: 'absolute', borderRadius: '50%', width: '260px', height: '260px', background: 'rgba(255,255,255,0.06)' },
  right:      { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.pageBg, padding: '40px 20px', overflowY: 'auto' },
  formBox:    { width: '100%', maxWidth: '420px', background: C.cardBg, borderRadius: '16px', padding: '40px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' },
  formHeader: { marginBottom: '28px' },
  formTitle:  { fontSize: '24px', fontWeight: '700', color: C.textDark, margin: '0 0 6px' },
  formSub:    { fontSize: '14px', color: C.textMid, margin: 0 },
  label:      { display: 'block', fontSize: '13px', fontWeight: '600', color: C.textMid, marginBottom: '6px' },
  eyeBtn:     { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: 0 },
  btn:        { width: '100%', padding: '12px', background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginBottom: '8px' },
  btnOutline: { width: '100%', padding: '11px', background: 'transparent', color: C.textMid, border: `1.5px solid ${C.border}`, borderRadius: '8px', fontSize: '14px', cursor: 'pointer' },
  switchText: { textAlign: 'center', fontSize: '14px', color: C.textMid, marginTop: '20px' },
  otpIconWrap:{ fontSize: '52px', marginBottom: '12px' },
};
