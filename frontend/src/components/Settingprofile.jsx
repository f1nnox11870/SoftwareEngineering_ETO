import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/settingprofile.css';
import Login from './login';
import Register from './Register';

// ── PasswordField Component ───────────────────────────
function PasswordField({ label, hint, value, onChange }) {
    const [show, setShow] = useState(false);
    return (
        <div className="pw-field-group">
            <label className="pw-label">{label}</label>
            <div className="pw-input-wrap">
                <input
                    className="pw-input"
                    type={show ? 'text' : 'password'}
                    placeholder={label}
                    value={value}
                    onChange={onChange}
                />
                <button className="pw-eye" type="button" onClick={() => setShow(v => !v)}>
                    {show ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                            <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    )}
                </button>
            </div>
            {hint && <p className="pw-hint">{hint}</p>}
        </div>
    );
}

// ── Main SettingProfile Component ─────────────────────
function SettingProfile() {
    const navigate = useNavigate();

    // States สำหรับข้อมูลผู้ใช้
    const [username, setUsername]     = useState('');
    const [email, setEmail]           = useState('');
    const [avatar, setAvatar]         = useState(null);
    const [role, setRole]             = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [uploading, setUploading]   = useState(false);

    // States สำหรับเปลี่ยนรหัสผ่าน
    const [settingTab, setSettingTab] = useState('account');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // States UI อื่นๆ
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);
    const fileInputRef = useRef(null);

    // 1. ดึงข้อมูลโปรไฟล์เมื่อโหลดหน้า
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            setIsLoggedIn(true);
            setRole(localStorage.getItem('role'));
            
            axios.get('http://localhost:3001/profile', {
                headers: { Authorization: `Bearer ${token}` }
            }).then(res => {
                setUsername(res.data.username);
                // รอรับค่า email จาก backend
                if (res.data.email) setEmail(res.data.email);
                // backend ของคุณส่งมาเป็นชื่อตัวแปร image
                if (res.data.image) setAvatar(res.data.image); 
            }).catch(err => {
                console.error("Profile fetch error", err);
                if(err.response?.status === 401 || err.response?.status === 403) {
                    handleLogout();
                }
            });
        } else {
            navigate('/');
        }
    }, [navigate]);

    // ปิด dropdown เมื่อคลิกข้างนอก
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 2. ฟังก์ชันอัปโหลดรูปโปรไฟล์
    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Image = reader.result;
            const token = localStorage.getItem('token');
            try {
                await axios.put('http://localhost:3001/profile/image', 
                    { image: base64Image }, 
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setAvatar(base64Image); 
                alert("อัปเดตรูปโปรไฟล์สำเร็จ!");
            } catch (err) {
                alert('อัปโหลดรูปไม่สำเร็จ');
            } finally {
                setUploading(false);
            }
        };
        reader.readAsDataURL(file); 
    };

    // 3. ฟังก์ชันเปลี่ยนรหัสผ่าน
    const handlePasswordUpdate = async () => {
        if (!oldPassword || !newPassword || !confirmPassword) return alert("กรุณากรอกข้อมูลให้ครบ");
        if (newPassword !== confirmPassword) return alert("รหัสผ่านใหม่ไม่ตรงกัน");
        if (newPassword.length < 8) return alert("รหัสผ่านต้องมี 8 ตัวอักษรขึ้นไป");

        try {
            const token = localStorage.getItem('token');
            const res = await axios.put('http://localhost:3001/profile/password', 
                { oldPassword, newPassword }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert("เปลี่ยนรหัสผ่านสำเร็จ!");
            setOldPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (err) {
            alert(err.response?.data?.message || "เกิดข้อผิดพลาด");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        navigate('/');
    };

    const AvatarImg = ({ size = 30, className = '' }) =>
        avatar ? (
            <img src={avatar} alt="avatar" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} className={className} />
        ) : (
            <i className={`fas fa-user-circle nav-avatar ${className}`} style={{ fontSize: size }}></i>
        );

    return (
        <div className="home-page">
            {/* ══ NAVBAR (แบบย่อสำหรับหน้าตั้งค่า) ══ */}
            <header className="navbar">
                <div className="navbar-inner">
                    <div className="nav-left">
                        <div className="nav-logo" onClick={() => navigate('/')} style={{cursor:'pointer'}}>
                            <div className="nav-logo-box"><i className="fas fa-book-open"></i></div>
                            <span style={{fontWeight:'bold', marginLeft:'10px', fontSize:'18px', color:'#333'}}>กลับหน้าแรก</span>
                        </div>
                    </div>

                    <div className="nav-right">
                        {isLoggedIn && (
                            <div className="profile-wrap" ref={profileRef}>
                                <button className="nav-user-btn" onClick={() => setProfileOpen(v => !v)}>
                                    <AvatarImg size={30} />
                                    <div className="nav-user-info">
                                        <span className="nav-username">{username}</span>
                                    </div>
                                </button>
                                {profileOpen && (
                                    <div className="profile-dropdown">
                                        <div className="pd-header">
                                            <AvatarImg size={36} />
                                            <div>
                                                <div className="pd-name">{username}</div>
                                                <div className="pd-sub">{email || 'ไม่ได้ระบุอีเมล'}</div>
                                            </div>
                                        </div>
                                        <div className="pd-divider"></div>
                                        <div className="pd-logout" onClick={handleLogout}>
                                            <i className="fas fa-sign-out-alt"></i> ออกจากระบบ
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* ══ SETTING CONTENT ══ */}
            <div className="setting-center-wrapper">
                <div className="page">
                    <div className="breadcrumb"><span>ตั้งค่าบัญชี</span></div>
                    <h1 className="heading">ตั้งค่าบัญชี</h1>

                    <div className="layout">
                        <div className="sidebar">
                            <button className={`sidebar-item ${settingTab === 'account' ? 'active' : ''}`} onClick={() => setSettingTab('account')}>บัญชี</button>
                            <button className={`sidebar-item ${settingTab === 'password' ? 'active' : ''}`} onClick={() => setSettingTab('password')}>รหัสผ่าน</button>
                        </div>

                        <div className="content">
                            {settingTab === 'account' && (
                                <div className="card">
                                    <p className="avatar-label">รูปโปรไฟล์</p>
                                    <div className="avatar-wrap" onClick={() => fileInputRef.current.click()} style={{ cursor: 'pointer' }}>
                                        {avatar ? (
                                            <img src={avatar} alt="avatar" className="avatar-img" />
                                        ) : (
                                            <div className="avatar">
                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5">
                                                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/>
                                                </svg>
                                            </div>
                                        )}
                                        <div className="cam-btn">{uploading ? "⏳" : "📷"}</div>
                                        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                                    </div>

                                    <div className="field-row">
                                        <div className="field-info">
                                            <div className="field-label">ชื่อผู้ใช้</div>
                                            <div className="field-value">{username || '-'}</div>
                                        </div>
                                    </div>

                                    <div className="field-row" style={{ borderBottom: 'none' }}>
                                        <div className="field-info">
                                            <div className="field-label">อีเมล</div>
                                            <div className="field-value">{email || <span style={{color:'#999'}}>ยังไม่ได้ระบุอีเมล</span>}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {settingTab === 'password' && (
                                <div className="card">
                                    <p className="pw-section-title">เปลี่ยนรหัสผ่าน</p>
                                    
                                    <PasswordField label="รหัสผ่านปัจจุบัน" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
                                    <PasswordField label="รหัสผ่านใหม่" hint="รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                    <PasswordField label="ยืนยันรหัสผ่านใหม่" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                    
                                    <div className="pw-confirm-row">
                                        <button className="save-btn" onClick={handlePasswordUpdate}>ยืนยันการเปลี่ยนรหัสผ่าน</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SettingProfile;