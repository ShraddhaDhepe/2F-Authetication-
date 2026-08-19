import React from 'react';

export default function Button({ children, loading, variant = 'primary', ...props }) {
  const variants = {
    primary: { bg: '#6366f1', hover: '#4f46e5', color: '#fff' },
    danger:  { bg: '#ef4444', hover: '#dc2626', color: '#fff' },
    outline: { bg: 'transparent', hover: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' },
  };
  const v = variants[variant] || variants.primary;

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      style={{
        width: '100%',
        padding: '10px 16px',
        background: v.bg,
        color: v.color,
        border: v.border || 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: loading || props.disabled ? 'not-allowed' : 'pointer',
        opacity: loading || props.disabled ? 0.7 : 1,
        transition: 'background 0.2s',
        marginBottom: '8px',
      }}
      onMouseEnter={(e) => { if (!loading && !props.disabled) e.currentTarget.style.background = v.hover; }}
      onMouseLeave={(e) => { if (!loading && !props.disabled) e.currentTarget.style.background = v.bg; }}
    >
      {loading ? 'Please wait...' : children}
    </button>
  );
}
