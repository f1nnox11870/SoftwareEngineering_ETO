import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Login from './login';
import Register from './Register';
import { io } from 'socket.io-client';

const MAIN_CATEGORIES = [
    { label: 'นิยาย', key: 'novel', tab: 'นิยาย' },
    { label: 'การ์ตูน(มังงะ)', key: 'manga', tab: 'การ์ตูน/มังงะ' },
];

// ── Notification helpers ──
function parseSQLiteDate(dateStr) {
    if (!dateStr) return null;
    // ลบ 'Z' ท้ายออกก่อน (กัน double-Z) แล้วค่อยแปลง space → T แล้วต่อ Z ใหม่
    // SQLite CURRENT_TIMESTAMP เป็น UTC เสมอ ต้องการ Z เพื่อให้ JS อ่านเป็น UTC
    const clean = dateStr.replace(/Z$/i, '').trim();
    const normalized = clean.includes('T') ? clean + 'Z' : clean.replace(' ', 'T') + 'Z';
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
}

function formatTime(dateStr) {
    if (!dateStr) return '';
    const date = parseSQLiteDate(dateStr);
    if (!date) return '';

    const diff = Date.now() - date.getTime();
    const min = Math.floor(diff / 60000);

    if (diff >= 24 * 60 * 60 * 1000) {
        const day   = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year  = date.getFullYear() + 543;
        const hh    = String(date.getHours()).padStart(2, '0');
        const mm    = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hh}:${mm}`;
    }

    if (min < 1)  return 'เมื่อกี้';
    if (min < 60) return `${min} นาทีที่แล้ว`;
    const hr = Math.floor(min / 60);
    return `${hr} ชั่วโมงที่แล้ว`;
}

function buildNotifications(historyData, topupData, newChapterData = [], userNotifData = [], readIds = new Set()) {
    const notifs = [];

    // ── ตอนใหม่ ──
    // แก้ไข: ใช้ episode_id, episode_number, episode_title, created_at
    // ให้ตรงกับ field ที่ server ส่งมาจริงๆ
    newChapterData.forEach(c => {
        const nid = `newchap-${c.episode_id}`;
        notifs.push({
            id: nid,
            title: `มีตอนใหม่: ${c.book_title}`,
            desc: `ตอนที่ ${c.episode_number}${c.episode_title ? ` — ${c.episode_title}` : ''} เพิ่งเผยแพร่แล้ว`,
            time: formatTime(c.created_at), // แก้ไข: เปลี่ยนจาก c.published_at → c.created_at
            unread: !readIds.has(nid),
            tag: 'new_chapter',
            book_id: c.book_id,
        });
    });

    // ── การแจ้งเตือนเติมเหรียญจาก server (approved / rejected / pending) ──
    userNotifData.forEach(n => {
        const nid = `usernotif-${n.id}`;
        notifs.push({
            id: nid,
            title: n.title,
            desc: n.message || '',
            time: formatTime(n.created_at),
            unread: !n.is_read,
            tag: n.type,
            serverNotifId: n.id,
            book_id: n.book_id || null,
        });
    });

    // ── topup_requests ที่ยัง pending (ยังไม่มีใน user_notifications) ──
    const coveredRefIds = new Set(userNotifData.map(n => n.ref_id).filter(Boolean));
    topupData.forEach(t => {
        if (t.status === 'pending' && !coveredRefIds.has(t.id)) {
            const nid = `topup-${t.id}`;
            notifs.push({
                id: nid,
                title: 'คำขอเติมเหรียญรอการตรวจสอบ',
                desc: `แพ็กเกจ ฿${t.amount} — รอแอดมินตรวจสอบ`,
                time: formatTime(t.created_at),
                unread: false,
                tag: 'topup_pending',
            });
        }
    });

    return notifs.slice(0, 20);
}

function loadReadIds() {
    try { return new Set(JSON.parse(localStorage.getItem('notif_read_ids') || '[]')); }
    catch { return new Set(); }
}

function saveReadId(id) {
    try {
        const s = loadReadIds();
        s.add(id);
        const arr = [...s].slice(-200);
        localStorage.setItem('notif_read_ids', JSON.stringify(arr));
    } catch {}
}

function Navbar() {
    const navigate = useNavigate();

    // ── Auth / UI State ──
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername]     = useState('');
    const [role, setRole]             = useState(null);
    const [profileImage, setProfileImage] = useState(null);
    const [coins, setCoins]           = useState(null);
    const [cartCount, setCartCount]   = useState(0);
    const [favoriteIds, setFavoriteIds] = useState([]);

    const [megaOpen, setMegaOpen]     = useState(false);
    const [hoveredMenu, setHoveredMenu] = useState(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [notifOpen, setNotifOpen]   = useState(false);

    const [dbCategories, setDbCategories] = useState({ novel: [], manga: [] });
    const [navSearch, setNavSearch]   = useState('');

    // ── Notification State ──
    const [notifications, setNotifications] = useState([]);
    const [adminNotifications, setAdminNotifications] = useState([]);
    const [, setTimeTick] = useState(0); // tick ทุก 1 นาที เพื่อ re-render เวลา

    // ── Login / Register Modal ──
    const [modal, setModal] = useState(null);

    const megaRef    = useRef(null);
    const profileRef = useRef(null);
    const notifRef   = useRef(null);
    const coinInterval = useRef(null);

    // ── Fetch categories ──
    useEffect(() => {
        axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/books/categories')
            .then(res => setDbCategories(res.data))
            .catch(() => {});
    }, []);

    // ── Socket.IO: รับ real-time alert ──
    useEffect(() => {
        if (!isLoggedIn) return;

        const socket = io('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}');

        socket.on('new_episode_alert', (data) => {
            const token = localStorage.getItem('token');
            if (token) {
                refreshNotifications(token);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [isLoggedIn]);

    // ── Init on mount ──
    useEffect(() => {
        const token     = localStorage.getItem('token');
        const user      = localStorage.getItem('username');
        const savedRole = localStorage.getItem('role');

        if (!token) return;

        setIsLoggedIn(true);
        if (user)      setUsername(user);
        if (savedRole) setRole(savedRole);

        const headers = { Authorization: `Bearer ${token}` };

        axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/profile', { headers })
            .then(res => {
                setCoins(res.data.coins ?? 0);
                setProfileImage(res.data.image || null);
                if (res.data.username) setUsername(res.data.username);
                if (res.data.role)     setRole(res.data.role);
            })
            .catch(() => {});

        axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/cart', { headers })
            .then(res => setCartCount(res.data.length || 0))
            .catch(() => {});

        axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/favorites', { headers })
            .then(res => setFavoriteIds(res.data.map(i => i.book_id)))
            .catch(() => {});

        refreshNotifications(token);
        refreshAdminNotifications(token, savedRole);
    }, []);

    // ── Coin + Notification polling ──
    useEffect(() => {
        if (!isLoggedIn) { clearInterval(coinInterval.current); return; }
        const token = localStorage.getItem('token');
        coinInterval.current = setInterval(() => {
            axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/profile', { headers: { Authorization: `Bearer ${token}` } })
                .then(res => setCoins(res.data.coins ?? 0))
                .catch(() => {});
            refreshAdminNotifications(token);
            refreshNotifications(token);
        }, 30000);
        return () => clearInterval(coinInterval.current);
    }, [isLoggedIn, role]);

    // ── ฟัง event จาก AdminTopup เมื่อ approve/reject → refresh ทันที ──
    useEffect(() => {
        const handler = () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            refreshAdminNotifications(token);
            refreshNotifications(token);
        };
        window.addEventListener('topup-action', handler);
        return () => window.removeEventListener('topup-action', handler);
    }, []);

    // ── Tick ทุก 1 นาที เพื่ออัปเดตเวลาใน notification (เช่น "5 นาทีที่แล้ว") ──
    useEffect(() => {
        const timer = setInterval(() => setTimeTick(t => t + 1), 60000);
        return () => clearInterval(timer);
    }, []);

    // ── Close dropdowns on outside click ──
    useEffect(() => {
        const handler = (e) => {
            if (megaRef.current    && !megaRef.current.contains(e.target))    setMegaOpen(false);
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
            if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Notification helpers ──
    const refreshNotifications = async (token) => {
        const headers = { Authorization: `Bearer ${token}` };
        const readIds = loadReadIds();
        const [topupRes, histRes, newChapRes, userNotifRes] = await Promise.all([
            axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/topup/my-requests', { headers }).catch(() => ({ data: [] })),
            axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/history', { headers }).catch(() => ({ data: [] })),
            axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/notifications/new-chapters', { headers }).catch(() => ({ data: [] })),
            axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/user/notifications', { headers }).catch(() => ({ data: [] })),
        ]);
        setNotifications(buildNotifications(histRes.data, topupRes.data, newChapRes.data, userNotifRes.data, readIds));
    };

    // ── Admin notification helpers ──
    const refreshAdminNotifications = async (token, currentRole) => {
        const r = currentRole || role;
        if (r !== 'admin') return;
        try {
            const res = await axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/admin/notifications', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAdminNotifications(res.data);
        } catch {}
    };

    const markAdminAllRead = async () => {
        const token = localStorage.getItem('token');
        setAdminNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
        await axios.put('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/admin/notifications/read-all', {}, {
            headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {});
    };

    const markAdminOneRead = async (notif) => {
        const token = localStorage.getItem('token');
        setAdminNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: 1 } : n));
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/admin/notifications/${notif.id}/read`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {});
        if (notif.type === 'topup_pending') {
            setNotifOpen(false);
            navigate('/admin-topup');
        }
    };

    const unreadCount = notifications.filter(n => n.unread).length
        + (role === 'admin' ? adminNotifications.filter(n => !n.is_read).length : 0);

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => {
            if (n.unread) saveReadId(n.id);
            return { ...n, unread: false };
        }));
        const token = localStorage.getItem('token');
        if (token) {
            axios.put('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/user/notifications/read-all', {},
                { headers: { Authorization: `Bearer ${token}` } }
            ).catch(() => {});

            const newChapIds = notifications
                .filter(n => n.tag === 'new_chapter' && n.unread)
                .map(n => Number(n.id.replace('newchap-', '')));
            if (newChapIds.length > 0) {
                axios.post('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/notifications/new-chapters/seen',
                    { episodeIds: newChapIds },
                    { headers: { Authorization: `Bearer ${token}` } }
                ).catch(() => {});
            }
        }
    };

    const markOneRead = (id) => {
        saveReadId(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
        const notif = notifications.find(n => n.id === id);
        const token = localStorage.getItem('token');

        if (notif && notif.serverNotifId && token) {
            axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/user/notifications/${notif.serverNotifId}/read`, {},
                { headers: { Authorization: `Bearer ${token}` } }
            ).catch(() => {});
        }

        if (notif && notif.tag === 'new_chapter') {
            const episodeId = Number(id.replace('newchap-', ''));
            if (token && episodeId) {
                axios.post('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/notifications/new-chapters/seen',
                    { episodeIds: [episodeId] },
                    { headers: { Authorization: `Bearer ${token}` } }
                ).catch(() => {});
            }
            if (notif.book_id) {
                setNotifOpen(false);
                navigate(`/read/${notif.book_id}`);
            }
        }

        if (notif && (notif.tag === 'new_episode' || notif.tag === 'episode_updated')) {
            if (notif.book_id) {
                setNotifOpen(false);
                navigate(`/read/${notif.book_id}`);
            }
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        setIsLoggedIn(false);
        setUsername('');
        setProfileOpen(false);
        setCoins(null);
        setCartCount(0);
        navigate('/');
    };

    return (
        <>
        <header className="navbar">
            <div className="navbar-inner">
                <div className="nav-left">
                    <div className="nav-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                        <div className="nav-logo-box"><i className="fas fa-book-open"></i></div>
                    </div>
                    <div className="mega-wrap" ref={megaRef}>
                        <button className="nav-hamburger" onClick={() => setMegaOpen(v => !v)}>
                            <i className="fas fa-bars"></i><span>เลือกหมวด</span>
                        </button>
                        {megaOpen && (
                            <div className="mega-menu">
                                <div className="mega-col">
                                    {MAIN_CATEGORIES.map(item => (
                                        <div key={item.label}
                                            className={`mega-item ${hoveredMenu === item.key ? 'hovered' : ''}`}
                                            onMouseEnter={() => setHoveredMenu(item.key)}
                                            onClick={() => { navigate(`/?tab=${encodeURIComponent(item.tab)}`); setMegaOpen(false); }}>
                                            <span>{item.label}</span>
                                            {dbCategories[item.key]?.length > 0 && <i className="fas fa-chevron-right"></i>}
                                        </div>
                                    ))}
                                </div>
                                {hoveredMenu && (() => {
                                    const cat  = MAIN_CATEGORIES.find(c => c.key === hoveredMenu);
                                    const subs = dbCategories[hoveredMenu] || [];
                                    if (!cat || subs.length === 0) return null;
                                    return (
                                        <div className="mega-col">
                                            <div className="mega-item" style={{ fontWeight: 600, color: '#b5651d' }}
                                                onClick={() => { navigate(`/?tab=${encodeURIComponent(cat.tab)}`); setMegaOpen(false); }}>
                                                <span>ทั้งหมด ({subs.reduce((s, c) => s + c.count, 0)})</span>
                                            </div>
                                            {subs.map(sub => (
                                                <div key={sub.name} className="mega-item"
                                                    onClick={() => { navigate(`/?tab=${encodeURIComponent(cat.tab)}&sub=${encodeURIComponent(sub.name)}`); setMegaOpen(false); }}>
                                                    <span>{sub.name}</span>
                                                    <span style={{ fontSize: '11px', color: '#aaa', marginLeft: 'auto' }}>{sub.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>

                <div className="nav-center">
                    
                </div>

                <div className="nav-right">
                    {isLoggedIn ? (
                        <>
                            <div className="notif-wrap" ref={notifRef} style={{ position: 'relative' }}>
                                <button
                                    className="nav-icon-btn pos-rel"
                                    onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                                >
                                    <i className="fas fa-bell"></i>
                                    {unreadCount > 0 && <span className="nbadge">{unreadCount}</span>}
                                </button>

                                {notifOpen && (
                                    <div className="notif-dropdown">
                                        <div className="notif-header">
                                            <span className="notif-title">การแจ้งเตือน</span>
                                            {unreadCount > 0 && (
                                                <button className="notif-markall" onClick={() => { markAllRead(); if (role === 'admin') markAdminAllRead(); }}>อ่านทั้งหมด</button>
                                            )}
                                        </div>
                                        <div className="notif-list">

                                            {/* ── ส่วน admin ── */}
                                            {role === 'admin' && adminNotifications.length > 0 && (
                                                <>
                                                    <div style={{ padding: '6px 14px 4px', fontSize: 11, color: '#ff4e63', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', background: '#fff8f8', borderBottom: '1px solid #ffe0e5' }}>
                                                        <i className="fas fa-shield-alt" style={{ marginRight: 5 }}></i>Admin
                                                    </div>
                                                    {adminNotifications.slice(0, 10).map(n => (
                                                        <div
                                                            key={`admin-${n.id}`}
                                                            className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                                                            onClick={() => markAdminOneRead(n)}
                                                        >
                                                            <div className="notif-icon-col" style={{ marginRight: 10, fontSize: 18 }}>
                                                                <i className="fas fa-coins" style={{ color: '#f59e0b' }}></i>
                                                            </div>
                                                            <div className="notif-body">
                                                                <div className="notif-item-title">{n.title}</div>
                                                                <div className="notif-item-desc">{n.message}</div>
                                                                <div className="notif-item-time">{formatTime(n.created_at)}</div>
                                                            </div>
                                                            {!n.is_read && <div className="notif-dot"></div>}
                                                        </div>
                                                    ))}
                                                    {notifications.length > 0 && (
                                                        <div style={{ padding: '6px 14px 4px', fontSize: 11, color: '#888', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', borderBottom: '1px solid #eee' }}>
                                                            ทั่วไป
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* ── ส่วน user ปกติ ── */}
                                            {notifications.length === 0 && (role !== 'admin' || adminNotifications.length === 0) ? (
                                                <div style={{ padding: '24px', textAlign: 'center', color: '#aaa', fontSize: 13 }}>
                                                    ยังไม่มีการแจ้งเตือน
                                                </div>
                                            ) : (
                                                notifications.map(n => (
                                                    <div key={n.id} className={`notif-item ${n.unread ? 'unread' : ''}`} onClick={() => markOneRead(n.id)}>
                                                        <div className="notif-icon-col" style={{ marginRight: 10, fontSize: 20 }}>
                                                            {n.tag === 'new_chapter' ? '📖'
                                                                : n.tag === 'new_episode' ? '📖'
                                                                : n.tag === 'episode_updated' ? '✏️'
                                                                : n.tag === 'topup_approved' ? '✅'
                                                                : n.tag === 'topup_rejected' ? '❌'
                                                                : n.tag === 'topup_pending' ? '⏳'
                                                                : n.title.includes('เติมเหรียญ') ? '🪙' : '🔔'}
                                                        </div>
                                                        <div className="notif-body">
                                                            <div className="notif-item-title">{n.title}</div>
                                                            <div className="notif-item-desc">{n.desc}</div>
                                                            <div className="notif-item-time">{n.time}</div>
                                                        </div>
                                                        {n.unread && <div className="notif-dot"></div>}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <div className="notif-footer"></div>
                                    </div>
                                )}
                            </div>

                            <button className="nav-icon-btn pos-rel" onClick={() => navigate('/favorites')}>
                                <i className="fas fa-heart" style={{ color: '#ff4e63' }}></i>
                                {favoriteIds.length > 0 && <span className="nbadge red">{favoriteIds.length}</span>}
                            </button>
                            <button className="nav-icon-btn pos-rel" onClick={() => navigate('/cart')}>
                                <i className="fas fa-shopping-cart"></i>
                                {cartCount > 0 && <span className="nbadge red">{cartCount}</span>}
                            </button>
                            <div className="profile-wrap" ref={profileRef}>
                                <button className="nav-user-btn" onClick={() => setProfileOpen(v => !v)}>
                                    {profileImage
                                        ? <img src={profileImage} alt="Profile" className="nav-avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                                        : <i className="fas fa-user-circle nav-avatar"></i>}
                                    <div className="nav-user-info"><span className="nav-username">{username}</span></div>
                                </button>
                                {profileOpen && (
                                    <div className="profile-dropdown">
                                        <div className="pd-header">
                                            {profileImage
                                                ? <img src={profileImage} alt="Profile" className="pd-avatar-icon" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                                : <i className="fas fa-user-circle pd-avatar-icon"></i>}
                                            <div><div className="pd-name">{username}</div></div>
                                        </div>
                                        {coins !== null && (
                                            <>
                                                <div className="pd-divider"></div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', alignItems: 'center' }}>
                                                    <div style={{ color: '#555', fontWeight: 'bold' }}>
                                                        <i className="fas fa-coins" style={{ color: '#f1c40f', marginRight: '8px' }}></i>
                                                        <span>เหรียญของฉัน</span>
                                                    </div>
                                                    <span style={{ color: '#ff4e63', fontWeight: 'bold', fontSize: '14px' }}>{coins.toLocaleString()}</span>
                                                </div>
                                            </>
                                        )}
                                        <div className="pd-divider"></div>
                                        <div className="pd-item" onClick={() => navigate('/myshelf')}><i className="fas fa-layer-group"></i> ชั้นหนังสือ</div>
                                        <div className="pd-item" onClick={() => navigate('/history')}><i className="fas fa-history"></i> ประวัติซื้อ</div>
                                        <div className="pd-item" onClick={() => navigate('/topup')}><i className="fas fa-coins"></i> ซื้อเหรียญ</div>
                                        <div className="pd-item" onClick={() => navigate('/transaction')}><i className="fas fa-exchange-alt"></i> รายการเติมเงิน</div>
                                        {role === 'admin' && (
                                            <>
                                                <div className="pd-divider"></div>
                                                <div className="pd-group-title" style={{ padding: '6px 20px 4px', fontSize: 11, color: '#aaa', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Admin</div>
                                                <div className="pd-item" onClick={() => navigate('/admin')}><i className="fas fa-cogs"></i> จัดการเนื้อหา</div>
                                                <div className="pd-item" onClick={() => navigate('/admin-topup')}><i className="fas fa-file-invoice-dollar"></i> ตรวจสอบสลิป</div>
                                            </>
                                        )}
                                        <div className="pd-divider"></div>
                                        <div className="pd-item" onClick={() => navigate('/settingprofile')}><i className="fas fa-cog"></i> ตั้งค่าบัญชี</div>
                                        <div className="pd-divider"></div>
                                        <div className="pd-logout" onClick={handleLogout}><i className="fas fa-sign-out-alt"></i> ออกจากระบบ</div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <button className="btn-login" onClick={() => setModal('login')}>เข้าสู่ระบบ</button>
                            <button className="btn-register" onClick={() => setModal('register')}>สมัครสมาชิก</button>
                        </>
                    )}
                </div>
            </div>
        </header>

        {/* ── Login / Register Modal ── */}
        {modal && (
            <div
                className="modal-overlay"
                onClick={e => { if (e.target.classList.contains('modal-overlay')) setModal(null); }}
                style={{
                    position: 'fixed', inset: 0, zIndex: 99999,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px',
                    backdropFilter: 'blur(4px)',
                }}
            >
                {modal === 'login' ? (
                    <Login
                        onClose={() => setModal(null)}
                        onSwitch={() => setModal('register')}
                        onLoginSuccess={(name) => {
                            setIsLoggedIn(true);
                            setUsername(name);
                            setModal(null);
                            const token = localStorage.getItem('token');
                            const savedRole = localStorage.getItem('role');
                            if (savedRole) setRole(savedRole);
                            if (token) {
                                const headers = { Authorization: `Bearer ${token}` };
                                axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/profile', { headers })
                                    .then(res => {
                                        setCoins(res.data.coins ?? 0);
                                        setProfileImage(res.data.image || null);
                                        if (res.data.role) setRole(res.data.role);
                                    }).catch(() => {});
                                axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/cart', { headers })
                                    .then(res => setCartCount(res.data.length || 0)).catch(() => {});
                                axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/favorites', { headers })
                                    .then(res => setFavoriteIds(res.data.map(i => i.book_id))).catch(() => {});
                                refreshNotifications(token);
                            }
                        }}
                    />
                ) : (
                    <Register
                        onClose={() => setModal(null)}
                        onSwitch={() => setModal('login')}
                        onRegisterSuccess={() => {}}
                    />
                )}
            </div>
        )}
        </>
    );
}

export default Navbar;