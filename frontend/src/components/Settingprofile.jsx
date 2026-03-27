import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/settingprofile.css';
// import Login from './login';
// import Register from './Register';

// ── Constants สำหรับ Navbar ──
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
    { id: 1, icon: '🪙', title: 'เติมเหรียญสำเร็จ',   desc: 'คุณได้รับ 150 เหรียญเรียบร้อยแล้ว',          time: '5 นาทีที่แล้ว',    unread: true  },
    { id: 2, icon: '🔥', title: 'โปรโมชั่นพิเศษ!',    desc: 'ซื้อเหรียญวันนี้รับโบนัสพิเศษสูงสุด 30%',     time: '1 ชั่วโมงที่แล้ว', unread: true  },
    { id: 3, icon: '📚', title: 'หนังสือใหม่มาแล้ว',  desc: 'Record of Ragnarok เล่ม 12 วางจำหน่ายแล้ว',  time: '3 ชั่วโมงที่แล้ว', unread: false },
    { id: 4, icon: '🎉', title: 'ยินดีต้อนรับ!',       desc: 'สมัครสมาชิกสำเร็จ รับเหรียญฟรี 20 เหรียญ',   time: 'เมื่อวาน',          unread: false },
    { id: 5, icon: '💳', title: 'ประวัติการซื้อ',      desc: 'คุณซื้อ "นิยายรักสุดขอบฟ้า" เรียบร้อยแล้ว', time: '2 วันที่แล้ว',      unread: false },
];

// ── PasswordField Component (จากโค้ดแรก) ──
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

    // States ข้อมูลผู้ใช้
    const [username, setUsername]     = useState('');
    const [email, setEmail]           = useState('');
    const [avatar, setAvatar]         = useState(null);
    const [role, setRole]             = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [coins, setCoins]           = useState(null);
    const [uploading, setUploading]   = useState(false);

    // States สำหรับเปลี่ยนรหัสผ่าน
    const [settingTab, setSettingTab] = useState('account');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // States สำหรับ Navbar แบบใหม่
    const [megaOpen, setMegaOpen]       = useState(false);
    const [hoveredMenu, setHoveredMenu] = useState(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [notifOpen, setNotifOpen]     = useState(false);
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

    // Refs
    const profileRef   = useRef(null);
    const fileInputRef = useRef(null);
    const megaRef      = useRef(null);
    const notifRef     = useRef(null);
    const coinInterval = useRef(null);

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
                if (res.data.email) setEmail(res.data.email);
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

    // 2. Fetch Coins ทุกๆ 30 วินาที (จากโค้ดที่สอง)
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

    // 3. ปิด dropdown เมื่อคลิกข้างนอก (รวมทั้ง mega menu, แจ้งเตือน, โปรไฟล์)
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (megaRef.current    && !megaRef.current.contains(e.target))    setMegaOpen(false);
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
            if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 4. ฟังก์ชันอัปโหลดรูปโปรไฟล์ (จากโค้ดแรก)
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

    // 5. ฟังก์ชันเปลี่ยนรหัสผ่าน (จากโค้ดแรก)
    const handlePasswordUpdate = async () => {
        if (!oldPassword || !newPassword || !confirmPassword) return alert("กรุณากรอกข้อมูลให้ครบ");
        if (newPassword !== confirmPassword) return alert("รหัสผ่านใหม่ไม่ตรงกัน");
        if (newPassword.length < 8) return alert("รหัสผ่านต้องมี 8 ตัวอักษรขึ้นไป");

        try {
            const token = localStorage.getItem('token');
            await axios.put('http://localhost:3001/profile/password', 
                { oldPassword, newPassword }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert("เปลี่ยนรหัสผ่านสำเร็จ!");
            setOldPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (err) {
            alert(err.response?.data?.message || "เกิดข้อผิดพลาด");
        }
    };

    // 6. ฟังก์ชันสำหรับการแจ้งเตือนและการออกจากระบบ
    const unreadCount = notifications.filter(n => n.unread).length;
    const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    const markOneRead = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        setIsLoggedIn(false); setUsername(''); setAvatar(null); setProfileOpen(false); setCoins(null);
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
            
            {/* ══ NAVBAR (จากโค้ดที่ 2) ══ */}
            <header className="navbar">
                <div className="navbar-inner">
                    <div className="nav-left">
                        <div className="nav-logo">
                            <div className="nav-logo-box"onClick={() => navigate('/')}><i className="fas fa-book-open"></i></div>
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
                        {isLoggedIn && (
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
                                    <button className="nav-user-btn" onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); }}>
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
                                            <div className="pd-item" onClick={() => navigate('/history')}><i className="fas fa-history"></i> ประวัติซื้อ</div>
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
                        )}
                    </div>
                </div>
            </header>

            {/* ══ SETTING CONTENT (จากโค้ดที่ 1) ══ */}
            <div className="setting-center-wrapper">
                <div className="page">
                    <div className="breadcrumb">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                            <polyline points="9,22 9,12 15,12 15,22"/>
                        </svg><span>ตั้งค่าบัญชี</span></div>
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