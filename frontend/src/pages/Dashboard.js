import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Alert from '../components/Alert';
import Input from '../components/Input';
import { C } from '../theme';

export default function Dashboard() {
  const { logout, enable2FA, verify2FASetup, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [profile,        setProfile]        = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [twoFAStep,      setTwoFAStep]      = useState('idle');
  const [otp,            setOtp]            = useState('');
  const [otpError,       setOtpError]       = useState('');
  const [msg,            setMsg]            = useState('');
  const [activeTab,      setActiveTab]      = useState('overview');
  const [refreshMsg,     setRefreshMsg]     = useState('');
  const [tokenRefreshed, setTokenRefreshed] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await api.get('/profile');
        setProfile(res.data.data.user);
      } catch (err) {
        if (err.response?.status === 401) navigate('/login');
      } finally {
        setProfileLoading(false);
      }
    }
    fetchProfile();
  }, [navigate]);

  async function handleLogout() { await logout(); navigate('/login'); }

  async function handleEnable2FA() {
    clearError();
    const result = await enable2FA();
    if (result.success) { setTwoFAStep('pending'); setMsg('OTP sent to your phone!'); }
  }

  async function handleVerify2FA(e) {
    e.preventDefault();
    if (!otp || otp.length !== 6) { setOtpError('Enter the 6-digit OTP.'); return; }
    setOtpError('');
    const result = await verify2FASetup(otp);
    if (result.success) {
      setTwoFAStep('done');
      setProfile(p => ({ ...p, is_2fa_enabled: true }));
      setMsg('2FA activated on your account!');
      setOtp(''); setActiveTab('security');
    } else { setOtpError(result.message); }
  }

  async function handleRefreshToken() {
    const rt = localStorage.getItem('refreshToken');
    if (!rt) { setRefreshMsg('No refresh token found.'); return; }
    try {
      const res = await api.post('/auth/token/refresh', { refreshToken: rt });
      localStorage.setItem('accessToken',  res.data.data.accessToken);
      localStorage.setItem('refreshToken', res.data.data.refreshToken);
      setRefreshMsg('Tokens rotated successfully!');
      setTokenRefreshed(true);
      setTimeout(() => setTokenRefreshed(false), 2000);
    } catch { setRefreshMsg('Token refresh failed.'); }
  }

  if (profileLoading) {
    return (
      <div style={S.loadingPage}>
        <div style={S.spinner} />
        <p style={{ color: C.textMid, marginTop: '16px' }}>Loading dashboard…</p>
      </div>
    );
  }

  const initials = profile?.email?.slice(0, 2).toUpperCase() || 'U';
  const phone = profile?.phone?.startsWith('+91')
    ? `+91 ${profile.phone.slice(3, 8)}XXXXX` : profile?.phone || null;

  return (
    <div style={S.page}>
      {/* ── Sidebar ── */}
      <div style={S.sidebar}>
        <div style={S.sidebarTop}>
          <span style={{ fontSize: '22px' }}>🔐</span>
          <span style={S.sidebarBrand}>SecureAuth</span>
        </div>
        <nav style={S.nav}>
          {[{ id: 'overview', icon: '👤', label: 'Profile' },
            { id: 'security', icon: '🛡️', label: 'Security' },
            { id: 'tokens',   icon: '🔑', label: 'Tokens' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ ...S.navItem, ...(activeTab === tab.id ? S.navActive : {}) }}>
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </nav>
        <button onClick={handleLogout} style={S.logoutBtn}>🚪 Logout</button>
      </div>

      {/* ── Main ── */}
      <div style={S.main}>
        <div style={S.topBar}>
          <div>
            <h1 style={S.pageTitle}>
              {activeTab === 'overview' ? 'My Profile' : activeTab === 'security' ? 'Security' : 'Tokens'}
            </h1>
            <p style={S.pageSub}>
              {activeTab === 'overview' ? 'Your account details' : activeTab === 'security' ? 'Manage 2FA and password security' : 'JWT token management'}
            </p>
          </div>
          <div style={S.avatar}>{initials}</div>
        </div>

        <Alert type="error"   message={error} onClose={clearError} />
        <Alert type="success" message={msg}   onClose={() => setMsg('')} />

        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <div style={S.grid}>
            <div style={{ ...S.card, gridColumn: 'span 2' }}>
              <div style={S.profileHead}>
                <div style={S.bigAvatar}>{initials}</div>
                <div>
                  <h2 style={S.profileName}>{profile?.email}</h2>
                  <span style={{ ...S.badge, background: C.successBg, color: C.primaryText }}>● Active</span>
                  {profile?.is_2fa_enabled && <span style={{ ...S.badge, background: C.primaryLight, color: C.primaryText, marginLeft: '8px' }}>🔐 2FA On</span>}
                </div>
              </div>
              <div style={S.infoGrid}>
                <InfoCard icon="📧" label="Email"       value={profile?.email} />
                <InfoCard icon="📱" label="Phone"       value={phone || 'Not added'} muted={!phone} />
                <InfoCard icon="📅" label="Member Since" value={new Date(profile?.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
                <InfoCard icon="🛡️" label="2FA Status"  value={profile?.is_2fa_enabled ? 'Enabled' : 'Disabled'} highlight={profile?.is_2fa_enabled} />
              </div>
            </div>
            <StatCard icon="✅" label="Account"       value="Verified"                                           bg={C.successBg}   fg={C.primaryText} />
            <StatCard icon="🛡️" label="Security Level" value={profile?.is_2fa_enabled ? 'High' : 'Medium'}  bg={C.primaryLight} fg={C.primaryText} />
          </div>
        )}

        {/* ── Security ── */}
        {activeTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={S.card}>
              <div style={S.cardHead}>
                <div>
                  <h3 style={S.cardTitle}>Two-Factor Authentication</h3>
                  <p style={S.cardDesc}>Protect your account with SMS OTP on every login</p>
                </div>
                <span style={{ ...S.badge, padding: '6px 14px', fontSize: '13px', background: profile?.is_2fa_enabled ? C.successBg : C.warningBg, color: profile?.is_2fa_enabled ? C.primaryText : '#92400e' }}>
                  {profile?.is_2fa_enabled ? '✓ Enabled' : '○ Disabled'}
                </span>
              </div>
              {profile?.is_2fa_enabled ? (
                <div style={S.successBox}>
                  <span style={{ fontSize: '24px' }}>🎉</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: '600', color: C.primaryText }}>2FA is active</p>
                    <p style={{ margin: '2px 0 0', fontSize: '13px', color: C.primary }}>Every login requires an OTP sent to {phone || 'your phone'}</p>
                  </div>
                </div>
              ) : (
                <>
                  {!profile?.phone && <div style={S.warnBox}>⚠️ Add a phone number to your profile before enabling 2FA.</div>}
                  {twoFAStep === 'idle' && (
                    <button onClick={handleEnable2FA} disabled={loading || !profile?.phone}
                      style={{ ...S.actionBtn, opacity: !profile?.phone ? 0.5 : 1 }}>
                      {loading ? 'Sending OTP…' : '🔐 Enable 2FA'}
                    </button>
                  )}
                  {twoFAStep === 'pending' && (
                    <form onSubmit={handleVerify2FA} style={{ marginTop: '16px' }}>
                      <p style={{ fontSize: '14px', color: C.textMid, marginBottom: '16px' }}>
                        📱 Enter the OTP sent to <strong>{phone}</strong>
                      </p>
                      <Input id="otp2fa" label="OTP Code" type="text"
                        placeholder="Enter 6-digit code" maxLength={6}
                        value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                        error={otpError} autoComplete="one-time-code" />
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="submit" disabled={loading} style={S.actionBtn}>
                          {loading ? 'Verifying…' : '✓ Verify & Activate'}
                        </button>
                        <button type="button" onClick={() => { setTwoFAStep('idle'); setOtp(''); }} style={S.cancelBtn}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
            <div style={S.card}>
              <h3 style={S.cardTitle}>Password Security</h3>
              <p style={S.cardDesc}>Your password is hashed with bcrypt (cost factor 12)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                {['Bcrypt hashing (cost 12)', 'Never stored in plain text', 'Secure reset via OTP', 'Rate-limited login attempts'].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: C.textMid }}>
                    <span style={{ color: C.success, fontWeight: '700' }}>✓</span> {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tokens ── */}
        {activeTab === 'tokens' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={S.card}>
              <h3 style={S.cardTitle}>Access Token</h3>
              <p style={S.cardDesc}>Short-lived JWT (15 min) sent in Authorization header.</p>
              <div style={S.tokenBox}>
                <span style={S.tokenText}>
                  {localStorage.getItem('accessToken') ? localStorage.getItem('accessToken').slice(0, 64) + '…' : 'No token'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                {[['HS256', C.primaryLight, C.primaryText], ['15 min', C.successBg, C.primaryText], ['Bearer', C.accentLight, '#92400e']].map(([t, bg, fg]) => (
                  <span key={t} style={{ ...S.badge, background: bg, color: fg }}>{t}</span>
                ))}
              </div>
            </div>
            <div style={S.card}>
              <h3 style={S.cardTitle}>Refresh Token</h3>
              <p style={S.cardDesc}>Long-lived opaque token (7d). SHA-256 hashed in DB. Revocable.</p>
              <div style={S.tokenBox}>
                <span style={S.tokenText}>
                  {localStorage.getItem('refreshToken') ? '••••••••••••••••••••••••' + localStorage.getItem('refreshToken').slice(-8) : 'No token'}
                </span>
              </div>
              <button onClick={handleRefreshToken}
                style={{ ...S.actionBtn, marginTop: '16px', background: tokenRefreshed ? `linear-gradient(135deg,${C.success},#059669)` : undefined }}>
                {tokenRefreshed ? '✓ Rotated!' : '🔄 Rotate Token Pair'}
              </button>
              {refreshMsg && <p style={{ fontSize: '13px', color: C.textMid, marginTop: '8px' }}>{refreshMsg}</p>}
            </div>
            <div style={S.card}>
              <h3 style={S.cardTitle}>Token Flow</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                {[['1','Login','Issues access + refresh tokens'],
                  ['2','API Calls','Send Bearer token in Authorization header'],
                  ['3','Expiry','Access token expires after 15 minutes'],
                  ['4','Refresh','Get new access token using refresh token'],
                  ['5','Logout','Refresh token revoked — session ends']].map(([n,l,d]) => (
                  <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: `linear-gradient(135deg,${C.primary},${C.primaryDark})`, color: '#fff', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</div>
                    <div>
                      <p style={{ margin: 0, fontWeight: '600', fontSize: '14px', color: C.textDark }}>{l}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: C.textMid }}>{d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value, muted, highlight }) {
  return (
    <div style={{ background: C.infoBg, borderRadius: '10px', padding: '16px' }}>
      <div style={{ fontSize: '20px', marginBottom: '6px' }}>{icon}</div>
      <p style={{ margin: 0, fontSize: '11px', color: C.textLight, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: '600', color: muted ? C.textLight : highlight ? C.primary : C.textDark }}>{value}</p>
    </div>
  );
}

function StatCard({ icon, label, value, bg, fg }) {
  return (
    <div style={{ background: C.cardBg, borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{ fontSize: '26px', background: bg, borderRadius: '10px', padding: '10px' }}>{icon}</div>
      <div>
        <p style={{ margin: 0, fontSize: '12px', color: C.textLight, fontWeight: '600' }}>{label}</p>
        <p style={{ margin: '3px 0 0', fontSize: '17px', fontWeight: '700', color: C.textDark }}>{value}</p>
      </div>
    </div>
  );
}

const S = {
  page:        { display: 'flex', minHeight: '100vh', background: C.pageBg, fontFamily: "'Inter', -apple-system, sans-serif" },
  loadingPage: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.pageBg },
  spinner:     { width: '38px', height: '38px', border: `3px solid ${C.border}`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  sidebar:     { width: '230px', background: C.sidebar, display: 'flex', flexDirection: 'column', padding: '24px 14px', flexShrink: 0 },
  sidebarTop:  { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', paddingLeft: '8px' },
  sidebarBrand:{ color: '#fff', fontWeight: '700', fontSize: '16px' },
  nav:         { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  navItem:     { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '14px', fontWeight: '500', textAlign: 'left' },
  navActive:   { background: 'rgba(255,255,255,0.1)', color: '#fff' },
  logoutBtn:   { padding: '10px 12px', background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' },
  main:        { flex: 1, padding: '32px', overflowY: 'auto' },
  topBar:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' },
  pageTitle:   { margin: 0, fontSize: '22px', fontWeight: '700', color: C.textDark },
  pageSub:     { margin: '4px 0 0', fontSize: '14px', color: C.textMid },
  avatar:      { width: '42px', height: '42px', background: `linear-gradient(135deg,${C.primary},${C.primaryDark})`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '15px' },
  grid:        { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' },
  card:        { background: C.cardBg, borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  cardHead:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  cardTitle:   { fontSize: '16px', fontWeight: '700', color: C.textDark, margin: '0 0 4px' },
  cardDesc:    { fontSize: '13px', color: C.textMid, margin: 0 },
  profileHead: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '22px', paddingBottom: '20px', borderBottom: `1px solid ${C.border}` },
  bigAvatar:   { width: '58px', height: '58px', background: `linear-gradient(135deg,${C.primary},${C.primaryDark})`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '20px', flexShrink: 0 },
  profileName: { margin: '0 0 8px', fontSize: '17px', fontWeight: '700', color: C.textDark },
  badge:       { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  infoGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  successBox:  { display: 'flex', alignItems: 'center', gap: '14px', background: C.successBg, border: `1px solid ${C.successBorder}`, borderRadius: '10px', padding: '16px' },
  warnBox:     { background: C.warningBg, border: `1px solid #fcd34d`, borderRadius: '10px', padding: '14px', fontSize: '13px', color: '#92400e', marginBottom: '16px' },
  actionBtn:   { padding: '10px 20px', background: `linear-gradient(135deg,${C.primary},${C.primaryDark})`, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  cancelBtn:   { padding: '10px 20px', background: 'transparent', color: C.textMid, border: `1.5px solid ${C.border}`, borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  tokenBox:    { background: C.sidebar, borderRadius: '8px', padding: '14px 16px', marginTop: '12px' },
  tokenText:   { fontFamily: 'monospace', fontSize: '12px', color: '#5eead4', wordBreak: 'break-all' },
  accentLight: C.accentLight,
};
