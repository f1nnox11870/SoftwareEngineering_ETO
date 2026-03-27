import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/settingprofile.css';
import Login from './login';
import Register from './Register';
 
const TABS = ['แนะนำ', 'โปรโมชั่น', 'จัดชุด', 'นิยาย', 'การ์ตูน', 'อีบุ๊กทั่วไป', 'ข่าว/นิตยสาร', 'เร็วๆ นี้'];
 
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
 
// ── PasswordField ─────────────────────────────────────
function PasswordField({ label, hint }) {
    const [show, setShow] = useState(false);
    const [val,  setVal]  = useState('');
    return (
        <div className="pw-field-group">
            <label className="pw-label">{label}</label>
            <div className="pw-input-wrap">
                <input
                    className="pw-input"
                    type={show ? 'text' : 'password'}
                    placeholder={label}
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
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
 
// ── SettingProfile ────────────────────────────────────
function SettingProfile() {
    const navigate = useNavigate();
 
    const [username, setUsername]     = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [role, setRole]             = useState(null);
    const [coins, setCoins]           = useState(null);
    const [avatar, setAvatar]         = useState(null);   // URL รูปปัจจุบัน
    const [uploading, setUploading]   = useState(false);  // loading state
 
    const [settingTab, setSettingTab] = useState('account');
 
    const [modal, setModal]             = useState(null);
    const [activeTab, setActiveTab]     = useState('แนะนำ');
    const [megaOpen, setMegaOpen]       = useState(false);
    const [hoveredMenu, setHoveredMenu] = useState(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [notifOpen, setNotifOpen]     = useState(false);
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
 
    const megaRef      = useRef(null);
    const profileRef   = useRef(null);
    const notifRef     = useRef(null);
    const fileInputRef = useRef(null);
    const coinInterval = useRef(null);
 
    // ── โหลด profile (username + avatar) ──
    useEffect(() => {
        const token = localStorage.getItem('token');
        const user  = localStorage.getItem('username');
        const r     = localStorage.getItem('role');
        if (token) {
            setIsLoggedIn(true);
            setRole(r);
            if (user) setUsername(user);
 
            // ดึง avatar จาก API
            axios.get('http://localhost:3001/profile', {
                headers: { Authorization: `Bearer ${token}` }
            }).then(res => {
                if (res.data.avatar) setAvatar(res.data.avatar);
            }).catch(() => {});
        }
    }, []);
 
    // ── Fetch coins ──
    useEffect(() => {
        const fetchCoins = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const res = await axios.get('http://localhost:3001/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCoins(res.data.coins ?? 0);
            } catch { setCoins(0); }
        };
        if (isLoggedIn) {
            fetchCoins();
            coinInterval.current = setInterval(fetchCoins, 30000);
        } else {
            setCoins(null);
            clearInterval(coinInterval.current);
        }
        return () => clearInterval(coinInterval.current);
    }, [isLoggedIn]);
 
    // ── Click outside ──
    useEffect(() => {
        const h = (e) => {
            if (megaRef.current    && !megaRef.current.contains(e.target))    setMegaOpen(false);
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
            if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
 
    // ── อัปโหลดรูป ──
    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
 
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('avatar', file);
 
        setUploading(true);
        try {
            const res = await axios.post('http://localhost:3001/profile/avatar', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setAvatar(res.data.avatar); // อัปเดต URL ทั้ง setting และ navbar
        } catch (err) {
            alert('อัปโหลดรูปไม่สำเร็จ');
        } finally {
            setUploading(false);
        }
    };
 
    const unreadCount = notifications.filter(n => n.unread).length;
    const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    const markOneRead = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
 
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        setIsLoggedIn(false); setUsername(''); setAvatar(null); setProfileOpen(false); setCoins(null);
    };
    const handleLoginSuccess = (name) => {
        setIsLoggedIn(true); setUsername(name); setModal(null);
    };
    const handleOverlayClick = (e) => {
        if (e.target.classList.contains('modal-overlay')) setModal(null);
    };
 
    // ── Avatar component (ใช้ซ้ำ) ──
    const AvatarImg = ({ size = 30, className = '' }) =>
        avatar ? (
            <img src={avatar} alt="avatar"
                style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
                className={className}
            />
        ) : (
            <i className={`fas fa-user-circle nav-avatar ${className}`} style={{ fontSize: size }}></i>
        );
 
    return (
        <div className="home-page">
 
            {/* ══ NAVBAR ══ */}
            <header className="navbar">
                <div className="navbar-inner">
                    <div className="nav-left">
                        <div className="nav-logo">
                            <div className="nav-logo-box"><i className="fas fa-book-open"></i></div>
                        </div>
                        <div className="mega-wrap" ref={megaRef}>
                            <button className="nav-hamburger" onClick={() => setMegaOpen(v => !v)}>
                                <i className="fas fa-bars"></i><span>เลือกหมวด</span>
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
 
                    <div className="nav-center">
                        <div className="nav-search">
                            <input type="text" placeholder="วันนี้อ่านอะไรดี?" />
                            <button><i className="fas fa-search"></i></button>
                        </div>
                    </div>
 
                    <div className="nav-right">
                        {isLoggedIn ? (
                            <>
                                {role === 'admin' && (
                                    <button className="btn-admin" onClick={() => navigate('/admin')}>จัดการเนื้อหา</button>
                                )}
                                <div className="notif-wrap" ref={notifRef}>
                                    <button className="nav-icon-btn pos-rel" onClick={() => { setNotifOpen(v => !v); setProfileOpen(false); }}>
                                        <i className="fas fa-bell"></i>
                                        {unreadCount > 0 && <span className="nbadge">{unreadCount}</span>}
                                    </button>
                                    {notifOpen && (
                                        <div className="notif-dropdown">
                                            <div className="notif-header">
                                                <span className="notif-title">การแจ้งเตือน</span>
                                                {unreadCount > 0 && <button className="notif-markall" onClick={markAllRead}>อ่านทั้งหมด</button>}
                                            </div>
                                            <div className="notif-list">
                                                {notifications.map(n => (
                                                    <div key={n.id} className={`notif-item ${n.unread ? 'unread' : ''}`} onClick={() => markOneRead(n.id)}>
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
                                            <div className="notif-footer">ดูการแจ้งเตือนทั้งหมด</div>
                                        </div>
                                    )}
                                </div>
                                <button className="nav-icon-btn pos-rel">
                                    <i className="fas fa-heart"></i><span className="nbadge red">1</span>
                                </button>
                                <button className="nav-icon-btn pos-rel">
                                    <i className="fas fa-shopping-cart"></i><span className="nbadge red">1</span>
                                </button>
                                <div className="profile-wrap" ref={profileRef}>
                                    <button className="nav-user-btn" onClick={() => setProfileOpen(v => !v)}>
                                        {/* ── Avatar ใน navbar เปลี่ยนตามรูปที่ upload ── */}
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
                                                    <div className="pd-sub">{username}</div>
                                                </div>
                                            </div>
                                            {coins !== null && (
                                                <>
                                                    <div className="pd-divider"></div>
                                                    <div className="pd-coins-row">
                                                        <div className="pd-coins-label">
                                                            <i className="fas fa-coins pd-coins-icon"></i>
                                                            <span>เหรียญของฉัน</span>
                                                        </div>
                                                        <span className="pd-coins-value">{coins.toLocaleString()}</span>
                                                    </div>
                                                </>
                                            )}
                                            <div className="pd-divider"></div>
                                            <div className="pd-group-title">การใช้งาน</div>
                                            <div className="pd-item"><i className="fas fa-layer-group"></i> ชั้นหนังสือ</div>
                                            <div className="pd-item"><i className="fas fa-history"></i> ประวัติซื้อ</div>
                                            <div className="pd-item" onClick={() => navigate('/topup')}><i className="fas fa-coins"></i> ซื้อเหรียญ</div>
                                            <div className="pd-divider"></div>
                                            <div className="pd-item" onClick={() => navigate('/settingprofile')}><i className="fas fa-cog"></i> ตั้งค่าบัญชี</div>
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
                                <button className="btn-login"    onClick={() => setModal('login')}>เข้าสู่ระบบ</button>
                                <button className="btn-register" onClick={() => setModal('register')}>สมัครสมาชิก</button>
                            </>
                        )}
                    </div>
                </div>
            </header>
 
            {/* ══ SUB-TABS BAR ══ */}
            <div className="sub-tabs">
                <div className="sub-tabs-inner">
                    {TABS.map(tab => (
                        <button key={tab}
                            className={`sub-tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}>
                            {tab}
                        </button>
                    ))}
                </div>
            </div>
 
            {/* ══ SETTING CONTENT ══ */}
            <div className="setting-center-wrapper">
                <div className="page">
 
                    <div className="breadcrumb">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                            <polyline points="9,22 9,12 15,12 15,22"/>
                        </svg>
                        <span className="separator">›</span>
                        <span>ตั้งค่าบัญชี</span>
                    </div>
 
                    <h1 className="heading">ตั้งค่าบัญชี</h1>
 
                    <div className="layout">
                        <div className="sidebar">
                            {['account', 'password'].map(tab => (
                                <button
                                    key={tab}
                                    className={`sidebar-item ${settingTab === tab ? 'active' : ''}`}
                                    onClick={() => setSettingTab(tab)}
                                >
                                    {tab === 'account' ? 'บัญชี' : 'รหัสผ่าน'}
                                </button>
                            ))}
                        </div>
 
                        <div className="content">
 
                            {/* ── Tab: บัญชี ── */}
                            {settingTab === 'account' && (
                                <div className="card">
                                    <p className="avatar-label">รูปโปรไฟล์</p>
 
                                    {/* Avatar upload */}
                                    <div className="avatar-wrap" onClick={() => fileInputRef.current.click()} style={{ cursor: 'pointer' }}>
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
                                        <div className="cam-btn">
                                            {uploading ? (
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b5651d" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                                                    <circle cx="12" cy="12" r="10" strokeDasharray="40" strokeDashoffset="10"/>
                                                </svg>
                                            ) : (
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
                                                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                                                    <circle cx="12" cy="13" r="4"/>
                                                </svg>
                                            )}
                                        </div>
                                        {/* hidden file input */}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={handleAvatarChange}
                                        />
                                    </div>
 
                                    {/* แสดงแค่ username และ email แบบ read-only */}
                                    <div className="field-row">
                                        <div className="field-info">
                                            <div className="field-label">ชื่อผู้ใช้</div>
                                            <div className="field-value">{username || '-'}</div>
                                        </div>
                                    </div>
 
                                    <div className="field-row" style={{ borderBottom: 'none' }}>
                                        <div className="field-info">
                                            <div className="field-label">อีเมล์</div>
                                            <div className="field-value">{username ? `${username}@gmail.com` : '-'}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
 
                            {/* ── Tab: รหัสผ่าน ── */}
                            {settingTab === 'password' && (
                                <div className="card">
                                    <p className="pw-section-title">รหัสผ่านใหม่</p>
                                    <PasswordField
                                        label="รหัสผ่านใหม่"
                                        hint="รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษรขึ้นไป และต้องมีตัวอักษรพิมพ์ใหญ่และตัวเลขอย่างน้อย 1 ตัว"
                                    />
                                    <PasswordField label="ยืนยันรหัสผ่านใหม่" />
                                    <div className="pw-confirm-row">
                                        <button className="save-btn">ยืนยัน</button>
                                    </div>
                                </div>
                            )}
 
                        </div>
                    </div>
                </div>
            </div>
 
            {/* ══ MODAL ══ */}
            {modal && (
                <div className="modal-overlay" onClick={handleOverlayClick}>
                    {modal === 'login' && (
                        <Login onClose={() => setModal(null)} onSwitch={() => setModal('register')} onLoginSuccess={handleLoginSuccess} />
                    )}
                    {modal === 'register' && (
                        <Register onClose={() => setModal(null)} onSwitch={() => setModal('login')} />
                    )}
                </div>
            )}
        </div>
    );
}
 
export default SettingProfile;