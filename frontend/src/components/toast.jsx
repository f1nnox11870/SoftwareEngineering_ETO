import React, { useEffect } from 'react';

// type: 'success' | 'error' | 'warning' | 'info'
function Toast({ message, type = 'info', onClose, duration = 3000 }) {
    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [message]);

    if (!message) return null;

    const styles = {
        success: { bg: '#e6f9f0', border: '#34c780', icon: '✅', color: '#1a7a4a' },
        error:   { bg: '#fff0f0', border: '#ff4d4f', icon: '❌', color: '#c0392b' },
        warning: { bg: '#fffbe6', border: '#faad14', icon: '⚠️', color: '#b07d00' },
        info:    { bg: '#e6f4ff', border: '#1890ff', icon: 'ℹ️', color: '#0958d9' },
    };
    const s = styles[type] || styles.info;

    return (
        <div style={{
            position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 99999, minWidth: '280px', maxWidth: '420px',
            background: s.bg, border: `1.5px solid ${s.border}`,
            borderRadius: '12px', padding: '14px 20px',
            display: 'flex', alignItems: 'center', gap: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.13)',
            animation: 'fadeInDown 0.25s ease',
        }}>
            <style>{`@keyframes fadeInDown{from{opacity:0;transform:translateX(-50%) translateY(-16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
            <span style={{ fontSize: '20px' }}>{s.icon}</span>
            <span style={{ flex: 1, color: s.color, fontWeight: 500, fontSize: '15px' }}>{message}</span>
            <button onClick={onClose} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: s.color, fontSize: '18px', lineHeight: 1, padding: 0,
            }}>×</button>
        </div>
    );
}

export default Toast;