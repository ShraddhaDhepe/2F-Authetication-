import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';
import { C } from '../theme';

export default function ForgotPassword() {
  const { forgotPassword, resetPassword, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [step,     setStep]    = useState('request');
  const [phone,    setPhone]   = useState('');
  const [userId,   setUserId]  = useState(null);
  const [otp,      setOtp]     = useState('');
  const [newPass,  setNewPass] = useState('');
  const [confirm,  setConfirm] = useState('');
  const [msg,      setMsg]     = useState('');
  const [errs,     setErrs]    = useState({});
  const [showPass, setShowPass]= useState(false);

  // ── Step 1: request OTP via phone ─────────────────────────────────────────
  async function handleRequest(e) {
    e.preventDefault(); clearError();
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      setErrs({ phone: 'Enter a valid 10-digit Indian mobile number.' });
      return;
    }
    setErrs({});
    const result = await forgotPassword(phone);
    if (result.success) {
      setMsg('OTP sent to your mobile number!');
      if (result.userId) {
        setUserId(result.userId);
        setTimeout(() => { setMsg(''); setStep('reset'); }, 1800);
      }
    }
  }

  // ── Step 2: verify OTP + set new password ─────────────────────────────────
  async function handleReset(e) {
    e.preventDefault(); clearError();
    const e2 = {};
    if (!otp || otp.length !== 6)         e2.otp     = 'Enter the 6-digit OTP.';
    if (!newPass)                          e2.newPass  = 'Password is required.';
    else if (newPass.length < 8)           e2.newPass  = 'Min 8 characters.';
    else if (!/[A-Z]/.test(newPass))       e2.newPass  = 'Needs an uppercase letter.';
    else if (!/[0-9]/.test(newPass))       e2.newPass  = 'Needs a number.';
    else if (!/[!@#$%^&*]/.test(newPass))  e2.newPass  = 'Needs a special character.';
    if (newPass !== confirm)               e2.confirm  = 'Passwords do not match.';
    if (Object.keys(e2).length) { setErrs(e2); return; }
    setErrs({});
    const result = await resetPassword(userId, otp, newPass);
    if (result.success) {
      setMsg(result.message);
      setTimeout(() => navigate('/login'), 2000);
    }
  }

  return (
    <div style={S.page}>
      {/* ── Left panel ── */}
      <div style={S.left}>
        <div style={S.leftInner}>
          <div style={S.panelIcon}>{step === 'request' ? '🔑' : '🔒'}</div>
          <h1 style={S.panelTitle}>{step === 'request' ? 'Forgot Password?' : 'Reset Password'}</h1>
          <p style={S.panelSub}>
            {step === 'request'
              ? "Enter your registered Indian mobile number. We'll send a one-time OTP to reset your password."
              : 'Enter the OTP received on your phone and set a new password.'}
          </p>

          {/* Step indicators */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            {[
              ['1', 'Enter mobile number', step === 'request', step === 'reset'],
              ['2', 'Verify OTP',          step === 'reset',   false],
              ['3', 'Set new password',    false,              false],
            ].map(([num, label, active, done], i) => (
              <React.Fragment key={i}>
                {i > 0 && <div style={{ width: '2px', height: '14px', background: 'rgba(255,255,255,0.2)', marginLeft: '13px' }} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                    background: done ? C.success : active ? '#fff' : 'rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: '700',
                    color: done ? '#fff' : active ? C.primary : 'rgba(255,255,255,0.45)',
                  }}>
                    {done ? '✓' : num}
                  </div>
                  <span style={{
                    fontSize: '13px', fontWeight: active ? '600' : '400',
                    color: active ? '#fff' : done ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)',
                  }}>
                    {label}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>

          <div style={{...S.blob, top: '-80px', right: '-80px'}} />
          <div style={{...S.blob, bottom: '-60px', left: '-60px', width: '220px', height: '220px'}} />
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={S.right}>
        <div style={S.formBox}>

          {/* Step 1 */}
          {step === 'request' && (
            <>
              <div style={S.formHeader}>
                <h2 style={S.formTitle}>Account Recovery</h2>
                <p style={S.formSub}>Enter your registered mobile number to receive a reset OTP</p>
              </div>

              <Alert type="success" message={msg}   onClose={() => setMsg('')} />
              <Alert type="error"   message={error} onClose={clearError} />

              <form onSubmit={handleRequest} noValidate>
                <div style={{ marginBottom: '20px' }}>
                  <label style={S.label}>Mobile Number</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={S.countryCode}>🇮🇳 +91</div>
                    <input
                      type="tel" placeholder="9876543210" maxLength={10}
                      value={phone} autoComplete="tel"
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      style={{ ...fldStyle(errs.phone), flex: 1 }}
                    />
                  </div>
                  {errs.phone && <p style={S.errMsg}>{errs.phone}</p>}
                  <p style={S.hint}>The number you registered your account with</p>
                </div>

                <button type="submit" disabled={loading} style={S.btn}>
                  {loading ? 'Sending OTP…' : '📱 Send OTP to Mobile'}
                </button>
              </form>

              <p style={S.switchText}>
                <Link to="/login" style={{ color: C.primary, fontWeight: '600', textDecoration: 'none' }}>← Back to Login</Link>
              </p>
            </>
          )}

          {/* Step 2 */}
          {step === 'reset' && (
            <>
              <div style={S.formHeader}>
                <h2 style={S.formTitle}>Set New Password</h2>
                <p style={S.formSub}>Enter the OTP sent to <strong>+91 {phone}</strong></p>
              </div>

              <Alert type="success" message={msg}   onClose={() => setMsg('')} />
              <Alert type="error"   message={error} onClose={clearError} />

              <div style={S.otpHint}>
                📱 Check SMS on <strong>+91 {phone}</strong> for the 6-digit OTP
              </div>

              <form onSubmit={handleReset} noValidate>
                {/* OTP input */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={S.label}>OTP Code</label>
                  <input
                    type="text" placeholder="• • • • • •" maxLength={6}
                    value={otp} autoComplete="one-time-code"
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    style={{ ...fldStyle(errs.otp), fontSize: '24px', textAlign: 'center', letterSpacing: '10px', fontWeight: '700' }}
                  />
                  {errs.otp && <p style={S.errMsg}>{errs.otp}</p>}
                </div>

                {/* New password */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={S.label}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="Min 8 chars, uppercase, number, special"
                      value={newPass} autoComplete="new-password"
                      onChange={e => setNewPass(e.target.value)}
                      style={{ ...fldStyle(errs.newPass), paddingRight: '44px' }}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} style={S.eyeBtn}>
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {errs.newPass && <p style={S.errMsg}>{errs.newPass}</p>}
                  {/* Strength bar */}
                  {newPass && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                      {[newPass.length >= 8, /[A-Z]/.test(newPass), /[0-9]/.test(newPass), /[!@#$%^&*]/.test(newPass)].map((ok, i) => (
                        <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: ok ? C.success : C.border, transition: 'background 0.3s' }} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div style={{ marginBottom: '22px' }}>
                  <label style={S.label}>Confirm Password</label>
                  <input
                    type="password" placeholder="Repeat new password"
                    value={confirm} autoComplete="new-password"
                    onChange={e => setConfirm(e.target.value)}
                    style={fldStyle(errs.confirm)}
                  />
                  {errs.confirm && <p style={S.errMsg}>{errs.confirm}</p>}
                </div>

                <button type="submit" disabled={loading} style={S.btn}>
                  {loading ? 'Resetting…' : '🔐 Reset Password'}
                </button>
                <button type="button" onClick={() => { setStep('request'); setOtp(''); }} style={S.btnOutline}>
                  ← Try Different Number
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

function fldStyle(error) {
  return {
    width: '100%', padding: '11px 14px', fontSize: '14px',
    border: `1.5px solid ${error ? C.error : C.border}`,
    borderRadius: '8px', outline: 'none', boxSizing: 'border-box',
    background: C.inputBg, color: C.textDark,
  };
}

const S = {
  page:        { display: 'flex', minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" },
  left:        { flex: '0 0 400px', background: `linear-gradient(150deg, ${C.panelFrom} 0%, ${C.panelMid} 55%, ${C.panelTo} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px', position: 'relative', overflow: 'hidden' },
  leftInner:   { position: 'relative', zIndex: 1, color: '#fff' },
  panelIcon:   { fontSize: '52px', marginBottom: '14px' },
  panelTitle:  { fontSize: '26px', fontWeight: '800', margin: '0 0 10px', color: '#fff' },
  panelSub:    { fontSize: '14px', color: 'rgba(255,255,255,0.82)', margin: '0 0 28px', lineHeight: '1.6' },
  blob:        { position: 'absolute', borderRadius: '50%', width: '260px', height: '260px', background: 'rgba(255,255,255,0.06)' },
  right:       { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.pageBg, padding: '40px 20px', overflowY: 'auto' },
  formBox:     { width: '100%', maxWidth: '420px', background: C.cardBg, borderRadius: '16px', padding: '40px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' },
  formHeader:  { marginBottom: '24px' },
  formTitle:   { fontSize: '22px', fontWeight: '700', color: C.textDark, margin: '0 0 6px' },
  formSub:     { fontSize: '14px', color: C.textMid, margin: 0 },
  label:       { display: 'block', fontSize: '13px', fontWeight: '600', color: C.textMid, marginBottom: '6px' },
  errMsg:      { color: C.error, fontSize: '12px', margin: '4px 0 0' },
  hint:        { color: C.textLight, fontSize: '11px', margin: '4px 0 0' },
  otpHint:     { background: C.infoBg, border: `1px solid ${C.successBorder}`, borderRadius: '8px', padding: '12px 14px', fontSize: '13px', color: C.primaryText, marginBottom: '20px' },
  countryCode: { padding: '11px 12px', background: C.infoBg, border: `1.5px solid ${C.border}`, borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: C.textMid, whiteSpace: 'nowrap', flexShrink: 0 },
  eyeBtn:      { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: 0 },
  btn:         { width: '100%', padding: '12px', background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginBottom: '10px' },
  btnOutline:  { width: '100%', padding: '11px', background: 'transparent', color: C.textMid, border: `1.5px solid ${C.border}`, borderRadius: '8px', fontSize: '14px', cursor: 'pointer' },
  switchText:  { textAlign: 'center', fontSize: '14px', marginTop: '20px' },
};
