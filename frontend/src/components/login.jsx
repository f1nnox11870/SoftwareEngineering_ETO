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
            const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/login`, { username, password });
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
                <p className="register-link">
                    ยังไม่มีบัญชี?{' '}
                    <button className="switch-link-btn" onClick={onSwitch}>สมัครสมาชิก</button>
                </p>
            </div>
        </div>
    );
}

export default Login;