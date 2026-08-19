import React from 'react';
import { C } from '../theme';

export default function Alert({ type = 'error', message, onClose }) {
  if (!message) return null;

  const styles = {
    error:   { bg: C.errorBg,   border: '#fca5a5', text: '#991b1b' },
    success: { bg: C.successBg, border: C.successBorder, text: C.primaryText },
    info:    { bg: C.infoBg,    border: C.successBorder, text: C.primaryText },
    warning: { bg: C.warningBg, border: '#fcd34d', text: '#92400e' },
  };

  const s = styles[type] || styles.error;

  return (
    <div style={{
      padding: '11px 14px', marginBottom: '16px', borderRadius: '8px',
      border: `1px solid ${s.border}`, backgroundColor: s.bg, color: s.text,
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      fontSize: '13px', lineHeight: '1.5',
    }}>
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.text, marginLeft: '10px', fontWeight: 'bold', fontSize: '14px', padding: 0 }}>
          ✕
        </button>
      )}
    </div>
  );
}
