import React, { useState } from 'react';
import axios from 'axios';

// props: onClose, onSwitch (ไป Register), onLoginSuccess
function Login({ onClose, onSwitch, onLoginSuccess }) {
    const [username, setUsername] = useState(''); // ตัวแปรนี้จะเก็บ อีเมล หรือ ชื่อผู้ใช้ ที่กรอกเข้ามา
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/login', { username, password });
            localStorage.setItem('token', response.data.token);
            const payload = JSON.parse(atob(response.data.token.split('.')[1]));
            localStorage.setItem('role', payload.role);
            
            // 🔻 อัปเดต: บันทึก "ชื่อผู้ใช้งานตัวจริง" ที่ได้จาก Database ไม่ใช่อีเมลที่กรอกเข้ามา
            const actualUsername = response.data.username;
            localStorage.setItem('username', actualUsername);
            
            if (onLoginSuccess) onLoginSuccess(actualUsername); // 🔻 ส่งชื่อจริงไปแสดงผล
            if (onClose) onClose();
        } catch (error) {
            setMessage(error.response?.data?.message || 'Login failed');
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = '${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/auth/google';
    };

    return (
        <div className="modal-card">
            <div className="right-panel">
                <button className="close-btn" onClick={onClose}><i className="fa fa-times"></i></button>

                <h2>ยินดีต้อนรับ เข้าสู่ระบบเลย!</h2>
                <p className="tagline">เข้าสู่ระบบด้วยบัญชีของคุณเพื่อเริ่มต้นใช้งาน</p>

                <form onSubmit={handleSubmit}>
                    <div className="field-group">
                        <label className="field-label">
                            อีเมลหรือชื่อผู้ใช้<span className="required">*</span>
                        </label>
                        <input
                            className="field-input"
                            type="text"
                            placeholder="อีเมล หรือ ชื่อผู้ใช้"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="field-group">
                        <label className="field-label">
                            รหัสผ่าน<span className="required">*</span>
                        </label>
                        {/* 🔻 อัปเดต: จัดการ layout ปุ่มตาดูรหัสผ่านให้ตรงกับหน้า Register */}
                        <div style={{ position: 'relative' }}>
                            <input
                                className="field-input"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="รหัสผ่าน"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{ paddingRight: '44px', width: '100%', boxSizing: 'border-box' }}
                            />
                            <button
                                type="button"
                                className="eye-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                {showPassword
                                    ? <i className="fa fa-eye-slash"></i>
                                    : <i className="fa fa-eye"></i>
                                }
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="submit-btn">เข้าสู่ระบบ</button>
                </form>

                {message && <p className="status-message">{message}</p>}

                <div className="or-row">
                    <hr /><span>หรือ</span><hr />
                </div>

                <button className="social-btn" onClick={handleGoogleLogin}>
                    <svg viewBox="0 0 24 24" width="18" height="18" style={{ marginRight: '8px' }}>
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    เข้าสู่ระบบด้วย Google
                </button>

                <p className="register-link">
                    ยังไม่มีบัญชี?{' '}
                    <button className="switch-link-btn" onClick={onSwitch}>สมัครสมาชิก</button>
                </p>
            </div>
        </div>
    );
}

export default Login;