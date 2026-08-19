import React from 'react';

export default function Input({ label, id, error, ...props }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label htmlFor={id} style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px', color: '#374151' }}>
          {label}
        </label>
      )}
      <input
        id={id}
        {...props}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: `1px solid ${error ? '#f87171' : '#d1d5db'}`,
          borderRadius: '6px',
          fontSize: '14px',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => { e.target.style.borderColor = '#6366f1'; }}
        onBlur={(e)  => { e.target.style.borderColor = error ? '#f87171' : '#d1d5db'; }}
      />
      {error && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>{error}</p>}
    </div>
  );
}
