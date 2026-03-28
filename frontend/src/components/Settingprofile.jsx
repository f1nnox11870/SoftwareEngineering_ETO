import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/settingprofile.css';

// ── Constants ──
const MENU_ITEMS = [
    { label: 'นิยาย',        subs: ['นิยายรักโรแมนติก','นิยายวาย','นิยายแฟนตาซี','นิยายสืบสวน','นิยายกำลังภายใน','ไลท์โนเวล','วรรณกรรมทั่วไป','นิยายยูริ','กวีนิพนธ์','แฟนเฟิค'] },
    { label: 'การ์ตูน',      subs: [] },
    { label: 'อีบุ๊กทั่วไป', subs: [] },
    { label: 'นิตยสาร',      subs: [] },
    { label: 'หนังสือพิมพ์', subs: [] },
    { label: 'อีบุ๊กจัดชุด', subs: [] },
];
const ROMANCE_SUBS = ['นิยายรักวัยรุ่น','นิยายรักแฟนตาซี','นิยายรักจีนโบราณ','นิยายรักจีนปัจจุบัน','นิยายรักกำลังภายใน','นิยายรักผู้ใหญ่'];

const MOCK_NOTIFICATIONS = [
    { id: 1, icon: '🪙', title: 'เติมเหรียญสำเร็จ',   desc: 'คุณได้รับ 150 เหรียญเรียบร้อยแล้ว',           time: '5 นาทีที่แล้ว',    unread: true  },
    { id: 2, icon: '🔥', title: 'โปรโมชั่นพิเศษ!',    desc: 'ซื้อเหรียญวันนี้รับโบนัสพิเศษสูงสุด 30%',     time: '1 ชั่วโมงที่แล้ว', unread: true  },
    { id: 3, icon: '📚', title: 'หนังสือใหม่มาแล้ว',  desc: 'Record of Ragnarok เล่ม 12 วางจำหน่ายแล้ว',  time: '3 ชั่วโมงที่แล้ว', unread: false },
    { id: 4, icon: '🎉', title: 'ยินดีต้อนรับ!',       desc: 'สมัครสมาชิกสำเร็จ รับเหรียญฟรี 20 เหรียญ',   time: 'เมื่อวาน',          unread: false },
    { id: 5, icon: '💳', title: 'ประวัติการซื้อ',      desc: 'คุณซื้อ "นิยายรักสุดขอบฟ้า" เรียบร้อยแล้ว', time: '2 วันที่แล้ว',      unread: false },
];

// ── PasswordField Component ──
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

// ── Main SettingProfile Component ──
function SettingProfile() {
    const navigate = useNavigate();

    // ── States: ข้อมูลผู้ใช้ ──
    const [username, setUsername]         = useState('');
    const [email, setEmail]               = useState('');
    const [avatar, setAvatar]             = useState(null);      // รูปใน setting card
    const [profileImage, setProfileImage] = useState(null);      // รูปใน navbar
    const [role, setRole]                 = useState(null);
    const [isLoggedIn, setIsLoggedIn]     = useState(false);
    const [coins, setCoins]               = useState(null);
    const [cartCount, setCartCount]       = useState(0);
    const [uploading, setUploading]       = useState(false);

    // ── States: เปลี่ยนรหัสผ่าน ──
    const [settingTab, setSettingTab]           = useState('account');
    const [oldPassword, setOldPassword]         = useState('');
    const [newPassword, setNewPassword]         = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // ── States: Navbar ──
    const [megaOpen, setMegaOpen]           = useState(false);
    const [hoveredMenu, setHoveredMenu]     = useState(null);
    const [profileOpen, setProfileOpen]     = useState(false);
    const [notifOpen, setNotifOpen]         = useState(false);
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

    // ── Refs ──
    const profileRef   = useRef(null);
    const fileInputRef = useRef(null);
    const megaRef      = useRef(null);
    const notifRef     = useRef(null);
    const coinInterval = useRef(null);

    // ── fetchCartCount ──
    const fetchCartCount = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await axios.get('http://localhost:3001/cart', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCartCount(res.data.length || 0);
        } catch { /* ignore */ }
    };

    // ── 1. Init: ดึงโปรไฟล์ + role + cart ──
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/'); return; }

        setIsLoggedIn(true);
        setRole(localStorage.getItem('role'));
        fetchCartCount();

        axios.get('http://localhost:3001/profile', {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
            setUsername(res.data.username || '');
            if (res.data.email) setEmail(res.data.email);
            if (res.data.image) { setAvatar(res.data.image); setProfileImage(res.data.image); }
            setCoins(res.data.coins ?? 0);
        }).catch(err => {
            console.error('Profile fetch error', err);
            if (err.response?.status === 401 || err.response?.status === 403) handleLogout();
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]);

    // ── 2. Fetch Coins ทุก 30 วิ ──
    useEffect(() => {
        const fetchCoins = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const res = await axios.get('http://localhost:3001/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCoins(res.data.coins ?? 0);
                setProfileImage(res.data.image || null);
            } catch { setCoins(0); }
        };
        if (isLoggedIn) {
            coinInterval.current = setInterval(fetchCoins, 30000);
            return () => clearInterval(coinInterval.current);
        } else {
            setCoins(null);
            clearInterval(coinInterval.current);
        }
        return () => clearInterval(coinInterval.current);
    }, [isLoggedIn]);

    // ── 3. ปิด dropdown เมื่อคลิกข้างนอก ──
    useEffect(() => {
        const h = (e) => {
            if (megaRef.current    && !megaRef.current.contains(e.target))    setMegaOpen(false);
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
            if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    // ── อัปโหลดรูปโปรไฟล์ ──
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
                setProfileImage(base64Image);
                alert('อัปเดตรูปโปรไฟล์สำเร็จ!');
            } catch { alert('อัปโหลดรูปไม่สำเร็จ'); }
            finally { setUploading(false); }
        };
        reader.readAsDataURL(file);
    };

    // ── เปลี่ยนรหัสผ่าน ──
    const handlePasswordUpdate = async () => {
        if (!oldPassword || !newPassword || !confirmPassword) return alert('กรุณากรอกข้อมูลให้ครบ');
        if (newPassword !== confirmPassword) return alert('รหัสผ่านใหม่ไม่ตรงกัน');
        if (newPassword.length < 8) return alert('รหัสผ่านต้องมี 8 ตัวอักษรขึ้นไป');
        try {
            const token = localStorage.getItem('token');
            await axios.put('http://localhost:3001/profile/password',
                { oldPassword, newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('เปลี่ยนรหัสผ่านสำเร็จ!');
            setOldPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (err) { alert(err.response?.data?.message || 'เกิดข้อผิดพลาด'); }
    };

    // ── Notification helpers ──
    const unreadCount = notifications.filter(n => n.unread).length;
    const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    const markOneRead = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));

    // ── Logout ──
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        setIsLoggedIn(false); setUsername(''); setAvatar(null);
        setProfileImage(null); setProfileOpen(false); setCoins(null);
        navigate('/');
    };

    // ════════════════════════════════════════════
    return (
        <div className="home-page">

            {/* ══════════════════════ NAVBAR ══════════════════════ */}
            <header className="navbar">
                <div className="navbar-inner">

                    {/* ── Left ── */}
                    <div className="nav-left">
                        <div className="nav-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                            <div className="nav-logo-box">
                                <i className="fas fa-book-open"></i>
                            </div>
                        </div>

                        <div className="mega-wrap" ref={megaRef}>
                            <button className="nav-hamburger" onClick={() => setMegaOpen(v => !v)}>
                                <i className="fas fa-bars"></i>
                                <span>เลือกหมวด</span>
                            </button>
                            {megaOpen && (
                                <div className="mega-menu">
                                    <div className="mega-col">
                                        {MENU_ITEMS.map(item => (
                                            <div key={item.label}
                                                className={`mega-item ${hoveredMenu === item.label ? 'hovered' : ''}`}
                                                onMouseEnter={() => setHoveredMenu(item.label)}>
                                                <span>{item.label}</span>
                                                {item.subs.length > 0 && <i className="fas fa-chevron-right"></i>}
                                            </div>
                                        ))}
                                    </div>
                                    {hoveredMenu === 'นิยาย' && (
                                        <>
                                            <div className="mega-col">
                                                <div className="mega-item hovered">
                                                    <span>นิยายรักโรแมนติก</span>
                                                    <i className="fas fa-chevron-right"></i>
                                                </div>
                                                {MENU_ITEMS[0].subs.slice(1).map(s => (
                                                    <div key={s} className="mega-item"><span>{s}</span></div>
                                                ))}
                                            </div>
                                            <div className="mega-col">
                                                {ROMANCE_SUBS.map(s => (
                                                    <div key={s} className="mega-item"><span>{s}</span></div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Center ── */}
                    <div className="nav-center">
                        <div className="nav-search">
                            <input type="text" placeholder="วันนี้อ่านอะไรดี?" />
                            <button><i className="fas fa-search"></i></button>
                        </div>
                    </div>

                    {/* ── Right ── */}
                    <div className="nav-right">
                        {isLoggedIn ? (
                            <>
                                {role === 'admin' && (
                                    <button className="btn-admin" onClick={() => navigate('/admin')}>
                                        จัดการเนื้อหา
                                    </button>
                                )}

                                {/* 🔔 แจ้งเตือน */}
                                <div className="notif-wrap" ref={notifRef}>
                                    <button className="nav-icon-btn pos-rel"
                                        onClick={() => { setNotifOpen(v => !v); setProfileOpen(false); }}>
                                        <i className="fas fa-bell"></i>
                                        {unreadCount > 0 && <span className="nbadge">{unreadCount}</span>}
                                    </button>
                                    {notifOpen && (
                                        <div className="notif-dropdown">
                                            <div className="notif-header">
                                                <span className="notif-title">การแจ้งเตือน</span>
                                                {unreadCount > 0 && (
                                                    <button className="notif-markall" onClick={markAllRead}>อ่านทั้งหมด</button>
                                                )}
                                            </div>
                                            <div className="notif-list">
                                                {notifications.map(n => (
                                                    <div key={n.id}
                                                        className={`notif-item ${n.unread ? 'unread' : ''}`}
                                                        onClick={() => markOneRead(n.id)}>
                                                        <div className="notif-icon">{n.icon}</div>
                                                        <div className="notif-body">
                                                            <div className="notif-item-title">{n.title}</div>
                                                            <div className="notif-item-desc">{n.desc}</div>
                                                            <div className="notif-item-time">{n.time}</div>
                                                        </div>
                                                        {n.unread && <div className="notif-dot"></div>}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="notif-footer" onClick={() => setNotifOpen(false)}>
                                                ดูการแจ้งเตือนทั้งหมด
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ❤️ รายการโปรด */}
                                <button className="nav-icon-btn pos-rel" onClick={() => navigate('/favorites')}>
                                    <i className="fas fa-heart"></i>
                                </button>

                                {/* 🛒 ตะกร้า */}
                                <button className="nav-icon-btn pos-rel" onClick={() => navigate('/cart')}>
                                    <i className="fas fa-shopping-cart"></i>
                                    {cartCount > 0 && <span className="nbadge red">{cartCount}</span>}
                                </button>

                                {/* 👤 โปรไฟล์ */}
                                <div className="profile-wrap" ref={profileRef}>
                                    <button className="nav-user-btn"
                                        onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); }}>
                                        {profileImage ? (
                                            <img src={profileImage} alt="Profile" className="nav-avatar"
                                                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <i className="fas fa-user-circle nav-avatar"></i>
                                        )}
                                        <div className="nav-user-info">
                                            <span className="nav-username">{username}</span>
                                        </div>
                                    </button>

                                    {profileOpen && (
                                        <div className="profile-dropdown">
                                            <div className="pd-header">
                                                {profileImage ? (
                                                    <img src={profileImage} alt="Profile" className="pd-avatar-icon"
                                                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                                ) : (
                                                    <i className="fas fa-user-circle pd-avatar-icon"></i>
                                                )}
                                                <div>
                                                    <div className="pd-name">{username}</div>
                                                    <div className="pd-sub">{email || 'ไม่ได้ระบุอีเมล'}</div>
                                                </div>
                                            </div>

                                            {coins !== null && (
                                                <>
                                                    <div className="pd-divider"></div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', alignItems: 'center' }}>
                                                        <div style={{ color: '#555', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <i className="fas fa-coins" style={{ color: '#f1c40f' }}></i>
                                                            <span>เหรียญของฉัน</span>
                                                        </div>
                                                        <span style={{ color: '#ff4e63', fontWeight: 'bold', fontSize: '16px' }}>
                                                            {coins.toLocaleString()} 🪙
                                                        </span>
                                                    </div>
                                                </>
                                            )}

                                            <div className="pd-divider"></div>
                                            <div className="pd-item" onClick={() => navigate('/myshelf')}>
                                                <i className="fas fa-layer-group"></i> ชั้นหนังสือ
                                            </div>
                                            <div className="pd-item" onClick={() => navigate('/history')}>
                                                <i className="fas fa-history"></i> ประวัติซื้อ
                                            </div>
                                            <div className="pd-item" onClick={() => navigate('/topup')}>
                                                <i className="fas fa-coins"></i> ซื้อเหรียญ
                                            </div>
                                            <div className="pd-divider"></div>
                                            <div className="pd-item" onClick={() => navigate('/settingprofile')}>
                                                <i className="fas fa-cog"></i> ตั้งค่าบัญชี
                                            </div>
                                            <div className="pd-divider"></div>
                                            <div className="pd-logout" onClick={handleLogout}>
                                                <i className="fas fa-sign-out-alt"></i> ออกจากระบบ
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <button className="btn-login" onClick={() => navigate('/')}>เข้าสู่ระบบ</button>
                                <button className="btn-register" onClick={() => navigate('/')}>สมัครสมาชิก</button>
                            </>
                        )}
                    </div>

                </div>
            </header>

            {/* ══════════════════════ HERO / BREADCRUMB ══════════════════════ */}
            <div className="topup-hero">
                <div className="topup-page-inner">
                    <div className="topup-breadcrumb">
                        <span className="topup-breadcrumb-home" onClick={() => navigate('/')}>
                            <i className="fas fa-house"></i>
                        </span>
                        <i className="fas fa-angle-right" style={{ fontSize: 12, color: '#aaa' }}></i>
                        <span className="topup-breadcrumb-cur">ตั้งค่าบัญชี</span>
                    </div>
                </div>
            </div>

            {/* ══════════════════════ SETTING CONTENT ══════════════════════ */}
            <div className="setting-center-wrapper">
                <div className="page">
                    <h1 className="heading">ตั้งค่าบัญชี</h1>

                    <div className="layout">
                        {/* Sidebar */}
                        <div className="sidebar">
                            <button
                                className={`sidebar-item ${settingTab === 'account' ? 'active' : ''}`}
                                onClick={() => setSettingTab('account')}>
                                บัญชี
                            </button>
                            <button
                                className={`sidebar-item ${settingTab === 'password' ? 'active' : ''}`}
                                onClick={() => setSettingTab('password')}>
                                รหัสผ่าน
                            </button>
                        </div>

                        {/* Content */}
                        <div className="content">
                            {settingTab === 'account' && (
                                <div className="card">
                                    <p className="avatar-label">รูปโปรไฟล์</p>
                                    <div className="avatar-wrap"
                                        onClick={() => fileInputRef.current.click()}
                                        style={{ cursor: 'pointer' }}>
                                        {avatar ? (
                                            <img src={avatar} alt="avatar" className="avatar-img" />
                                        ) : (
                                            <div className="avatar">
                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5">
                                                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                                    <polyline points="21,15 16,10 5,21"/>
                                                </svg>
                                            </div>
                                        )}
                                        <div className="cam-btn">{uploading ? '⏳' : '📷'}</div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={handleAvatarChange}
                                        />
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
                                            <div className="field-value">
                                                {email || <span style={{ color: '#999' }}>ยังไม่ได้ระบุอีเมล</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {settingTab === 'password' && (
                                <div className="card">
                                    <p className="pw-section-title">เปลี่ยนรหัสผ่าน</p>
                                    <PasswordField
                                        label="รหัสผ่านปัจจุบัน"
                                        value={oldPassword}
                                        onChange={e => setOldPassword(e.target.value)}
                                    />
                                    <PasswordField
                                        label="รหัสผ่านใหม่"
                                        hint="รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                    />
                                    <PasswordField
                                        label="ยืนยันรหัสผ่านใหม่"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                    />
                                    <div className="pw-confirm-row">
                                        <button className="save-btn" onClick={handlePasswordUpdate}>
                                            ยืนยันการเปลี่ยนรหัสผ่าน
                                        </button>
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