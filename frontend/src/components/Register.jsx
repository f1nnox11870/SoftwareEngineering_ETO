import React, { useState } from 'react';
import axios from 'axios';
import '../assets/register.css';

// props: onClose, onSwitch (ไป Login), onRegisterSuccess
function Register({ onClose, onSwitch, onRegisterSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState(''); // มี State email แล้ว

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/register`, { username, email, password });
            setMessage(response.data.message);
            if (onRegisterSuccess) onRegisterSuccess();
            // สลับไปหน้า Login หลังสมัครสำเร็จ
            setTimeout(() => { if (onSwitch) onSwitch(); }, 1000);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Registration failed');
        }
    };

    return (
        <div className="modal-card">

            <div className="right-panel">
                <button className="close-btn" onClick={onClose}><i className="fa fa-times"></i></button>

                <h2>สร้างบัญชีใหม่</h2>
                <p className="tagline">กรอกข้อมูลด้านล่างเพื่อเริ่มต้นใช้งาน</p>

                <form onSubmit={handleSubmit}>
                    <div className="field-group">
                        <label className="field-label">
                            ชื่อผู้ใช้<span className="required">*</span>
                        </label>
                        <input
                            className="field-input"
                            type="text"
                            placeholder="ชื่อผู้ใช้"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    {/* 🔻 ส่วนที่เพิ่มเข้ามา: ช่องกรอกอีเมล 🔻 */}
                    <div className="field-group">
                        <label className="field-label">
                            อีเมล<span className="required">*</span>
                        </label>
                        <input
                            className="field-input"
                            type="email"
                            placeholder="อีเมล"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    {/* 🔺 สิ้นสุดส่วนที่เพิ่มเข้ามา 🔺 */}

                    <div className="field-group">
                        <label className="field-label">
                            รหัสผ่าน<span className="required">*</span>
                        </label>
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

                    <button type="submit" className="submit-btn">สมัครสมาชิก</button>
                </form>

                {message && <p className="status-message">{message}</p>}

                <div className="or-row">
                    <hr /><span>หรือ</span><hr />
                </div>

                <p className="login-link">
                    มีบัญชีแล้ว?{' '}
                    <button className="switch-link-btn" onClick={onSwitch}>เข้าสู่ระบบ</button>
                </p>
            </div>
        </div>
    );
}

export default Register;