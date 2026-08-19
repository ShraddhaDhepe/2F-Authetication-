import React from 'react';

export default function Card({ title, subtitle, children }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        {title && (
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h1 style={{ margin: '0 0 8px', fontSize: '24px', color: '#111827', fontWeight: '700' }}>{title}</h1>
            {subtitle && <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
