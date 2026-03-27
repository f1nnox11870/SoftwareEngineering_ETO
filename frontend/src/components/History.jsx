import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/settingprofile.css'; // <--- สำคัญ: ต้องให้ Path ตรงกับที่เก็บไฟล์ CSS

// ── Constants (ก๊อปมาให้ครบเหมือนหน้า SettingProfile) ──
const MENU_ITEMS = [
    { label: 'นิยาย', subs: ['นิยายรักโรแมนติก','นิยายวาย','นิยายแฟนตาซี','นิยายสืบสวน','นิยายกำลังภายใน', 'ไลท์โนเวล','วรรณกรรมทั่วไป','นิยายยูริ','กวีนิพนธ์','แฟนเฟิค'] },
    { label: 'การ์ตูน', subs: [] },
    { label: 'อีบุ๊กทั่วไป', subs: [] },
    { label: 'นิตยสาร', subs: [] },
    { label: 'หนังสือพิมพ์', subs: [] },
    { label: 'อีบุ๊กจัดชุด', subs: [] },
];
const ROMANCE_SUBS = ['นิยายรักวัยรุ่น','นิยายรักแฟนตาซี','นิยายรักจีนโบราณ','นิยายรักจีนปัจจุบัน','นิยายรักกำลังภายใน','นิยายรักผู้ใหญ่'];
const MOCK_NOTIFICATIONS = [
    { id: 1, icon: '🪙', title: 'เติมเหรียญสำเร็จ', desc: 'คุณได้รับ 150 เหรียญเรียบร้อยแล้ว', time: '5 นาทีที่แล้ว', unread: true },
    { id: 2, icon: '🔥', title: 'โปรโมชั่นพิเศษ!', desc: 'ซื้อเหรียญวันนี้รับโบนัสพิเศษสูงสุด 30%', time: '1 ชั่วโมงที่แล้ว', unread: true },
];

function History() {
    const navigate = useNavigate();

    // --- States สำหรับ Navbar ---
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [avatar, setAvatar] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [role, setRole] = useState(null);
    const [coins, setCoins] = useState(null);
    const [megaOpen, setMegaOpen] = useState(false);
    const [hoveredMenu, setHoveredMenu] = useState(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

    // --- Refs ---
    const profileRef = useRef(null);
    const megaRef = useRef(null);
    const notifRef = useRef(null);

    // 1. ดึงข้อมูล Profile (เหมือนหน้า Setting)
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
                setCoins(res.data.coins ?? 0);
            }).catch(() => handleLogout());
        } else {
            navigate('/'); // ถ้าไม่ login ให้เด้งกลับหน้าแรก
        }
    }, [navigate]);

    // 2. คลิกข้างนอกเพื่อปิด Dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (megaRef.current && !megaRef.current.contains(e.target)) setMegaOpen(false);
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
            if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    const unreadCount = notifications.filter(n => n.unread).length;

    return (
        <div className="home-page">
            {/* ── ส่วนที่ 1: NAVBAR (ยกมาจากหน้า Setting เป๊ะๆ) ── */}
            <header className="navbar">
                <div className="navbar-inner">
                    <div className="nav-left">
                        <div className="nav-logo" onClick={() => navigate('/')} style={{cursor:'pointer'}}>
                            <div className="nav-logo-box"><i className="fas fa-book-open"></i></div>
                        </div>
                        <div className="mega-wrap" ref={megaRef}>
                            <button className="nav-hamburger" onClick={() => setMegaOpen(!megaOpen)}>
                                <i className="fas fa-bars"></i><span>เลือกหมวด</span>
                            </button>
                            {megaOpen && (
                                <div className="mega-menu">
                                    <div className="mega-col">
                                        {MENU_ITEMS.map(item => (
                                            <div key={item.label} className={`mega-item ${hoveredMenu === item.label ? 'hovered' : ''}`} onMouseEnter={() => setHoveredMenu(item.label)}>
                                                <span>{item.label}</span>
                                                {item.subs.length > 0 && <i className="fas fa-chevron-right"></i>}
                                            </div>
                                        ))}
                                    </div>
                                    {hoveredMenu === 'นิยาย' && (
                                        <>
                                            <div className="mega-col">
                                                <div className="mega-item hovered"><span>นิยายรักโรแมนติก</span><i className="fas fa-chevron-right"></i></div>
                                                {MENU_ITEMS[0].subs.slice(1).map(s => <div key={s} className="mega-item"><span>{s}</span></div>)}
                                            </div>
                                            <div className="mega-col">
                                                {ROMANCE_SUBS.map(s => <div key={s} className="mega-item"><span>{s}</span></div>)}
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
                                {role === 'admin' && <button className="btn-admin" onClick={() => navigate('/admin')}>จัดการเนื้อหา</button>}
                                <div className="notif-wrap" ref={notifRef}>
                                    <button className="nav-icon-btn pos-rel" onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}>
                                        <i className="fas fa-bell"></i>
                                        {unreadCount > 0 && <span className="nbadge">{unreadCount}</span>}
                                    </button>
                                    {notifOpen && (
                                        <div className="notif-dropdown">
                                            <div className="notif-header"><span className="notif-title">การแจ้งเตือน</span></div>
                                            <div className="notif-list">
                                                {notifications.map(n => (
                                                    <div key={n.id} className={`notif-item ${n.unread ? 'unread' : ''}`}>
                                                        <div className="notif-icon">{n.icon}</div>
                                                        <div className="notif-body">
                                                            <div className="notif-item-title">{n.title}</div>
                                                            <div className="notif-item-desc">{n.desc}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button className="nav-icon-btn pos-rel"><i className="fas fa-shopping-cart"></i></button>
                                <div className="profile-wrap" ref={profileRef}>
                                    <button className="nav-user-btn" onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}>
                                        {avatar ? <img src={avatar} alt="avatar" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} /> : <i className="fas fa-user-circle nav-avatar" style={{fontSize: 30}}></i>}
                                        <div className="nav-user-info"><span className="nav-username">{username}</span></div>
                                    </button>
                                    {profileOpen && (
                                        <div className="profile-dropdown">
                                            <div className="pd-header">
                                                <div className="pd-name">{username}</div>
                                                <div className="pd-sub">{email || 'ไม่มีอีเมล'}</div>
                                            </div>
                                            <div className="pd-divider"></div>
                                            <div className="pd-coins-row">
                                                <div className="pd-coins-label"><i className="fas fa-coins pd-coins-icon"></i><span>เหรียญของฉัน</span></div>
                                                <span className="pd-coins-value">{coins?.toLocaleString()}</span>
                                            </div>
                                            <div className="pd-divider"></div>
                                            <div className="pd-item" onClick={() => navigate('/history')}><i className="fas fa-history"></i> ประวัติซื้อ</div>
                                            <div className="pd-item" onClick={() => navigate('/settingprofile')}><i className="fas fa-cog"></i> ตั้งค่าบัญชี</div>
                                            <div className="pd-divider"></div>
                                            <div className="pd-logout" onClick={handleLogout}><i className="fas fa-sign-out-alt"></i> ออกจากระบบ</div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* ── ส่วนที่ 2: CONTENT หน้า HISTORY (โครงสร้างแบบหน้า Setting) ── */}
            <div className="setting-center-wrapper">
                <div className="page">
                    <div className="breadcrumb">
                        <span>หน้าหลัก</span> / <span>ประวัติการสั่งซื้อ</span>
                    </div>
                    <h1 className="heading">ประวัติการสั่งซื้อ</h1>
                    
                    <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '64px', color: '#eee', marginBottom: '20px' }}>
                            <i className="fas fa-receipt"></i>
                        </div>
                        <h2 style={{ color: '#333', marginBottom: '10px' }}>ยังไม่มีรายการซื้อ</h2>
                        <p style={{ color: '#999' }}>เมื่อคุณซื้อหนังสือ รายการจะปรากฏที่นี่</p>
                        <button className="logout-btn" style={{ marginTop: '20px' }} onClick={() => navigate('/')}>ไปเลือกซื้อหนังสือ</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default History;