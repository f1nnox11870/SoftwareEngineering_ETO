import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/settingprofile.css';
import Navbar from './navbar';

// ── Constants ──
const MAIN_CATEGORIES = [
    { label: 'นิยาย',           key: 'novel', tab: 'นิยาย'          },
    { label: 'การ์ตูน(มังงะ)', key: 'manga', tab: 'การ์ตูน/มังงะ'  },
];

// Notification helpers 
function formatTime(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1)   return 'เมื่อกี้';
    if (min < 60)  return `${min} นาทีที่แล้ว`;
    const hr = Math.floor(min / 60);
    if (hr < 24)   return `${hr} ชั่วโมงที่แล้ว`;
    const day = Math.floor(hr / 24);
    if (day === 1) return 'เมื่อวาน';
    if (day < 7)   return `${day} วันที่แล้ว`;
    return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

function buildNotifications(historyData, topupData, newChapterData = [], readIds = new Set()) {
    const notifs = [];
    newChapterData.forEach(c => {
        const nid = `newchap-${c.chapter_id}`;
        notifs.push({
            id: nid, title: `มีตอนใหม่: ${c.book_title}`,
            desc: `ตอนที่ ${c.chapter_number}${c.chapter_title ? ` — ${c.chapter_title}` : ''} เพิ่งเผยแพร่แล้ว`,
            time: formatTime(c.published_at), unread: !readIds.has(nid), tag: 'new_chapter', book_id: c.book_id,
        });
    });
    topupData.forEach(t => {
        const nid = `topup-${t.id}`;
        notifs.push({
            id: nid,
            title: t.status === 'approved' ? `เติมเหรียญสำเร็จ +${Number(t.total_coins).toLocaleString()} เหรียญ` : t.status === 'rejected' ? 'คำขอเติมเหรียญถูกปฏิเสธ' : 'คำขอเติมเหรียญรอการตรวจสอบ',
            desc: t.status === 'approved' ? `ชำระ ฿${t.amount} — รับ ${Number(t.total_coins).toLocaleString()} เหรียญแล้ว` : t.status === 'rejected' ? (t.note || 'กรุณาติดต่อสนับสนุน') : `แพ็กเกจ ฿${t.amount} — รอแอดมินตรวจสอบ`,
            time: formatTime(t.created_at), unread: !readIds.has(nid) && t.status === 'approved'
        });
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

// ── Modal Component ──
function Modal({ modal, onClose }) {
    if (!modal) return null;
    const isSuccess = modal.type === 'success';
    const isError   = modal.type === 'error';
    const isWarning = modal.type === 'warning';

    const iconMap = {
        success: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
        ),
        error: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        ),
        warning: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
        ),
    };

    const colorMap = {
        success: { bg: '#f0fdf4', border: '#bbf7d0', icon: '#16a34a', iconBg: '#dcfce7', btn: '#16a34a', btnHover: '#15803d' },
        error:   { bg: '#fff1f2', border: '#fecdd3', icon: '#dc2626', iconBg: '#fee2e2', btn: '#dc2626', btnHover: '#b91c1c' },
        warning: { bg: '#fffbeb', border: '#fde68a', icon: '#d97706', iconBg: '#fef3c7', btn: '#d97706', btnHover: '#b45309' },
    };
    const c = colorMap[modal.type] || colorMap.success;

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)',
                animation: 'modalOverlayIn 0.2s ease',
            }}>
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#fff',
                    borderRadius: '20px',
                    padding: '36px 32px 28px',
                    maxWidth: '400px',
                    width: '90%',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
                    textAlign: 'center',
                    animation: 'modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                    border: `1.5px solid ${c.border}`,
                }}>
                {/* Icon */}
                <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: c.iconBg, color: c.icon,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 18px',
                    boxShadow: `0 4px 16px ${c.iconBg}`,
                }}>
                    {iconMap[modal.type]}
                </div>

                {/* Title */}
                <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>
                    {modal.title}
                </h3>

                {/* Message */}
                <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#6b7280', lineHeight: 1.6 }}>
                    {modal.message}
                </p>

                {/* Button */}
                <button
                    onClick={onClose}
                    style={{
                        background: c.btn, color: '#fff',
                        border: 'none', borderRadius: '12px',
                        padding: '11px 32px', fontSize: '15px', fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.2s',
                        width: '100%',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = c.btnHover}
                    onMouseLeave={e => e.currentTarget.style.background = c.btn}
                >
                    ตกลง
                </button>
            </div>

            <style>{`
                @keyframes modalOverlayIn { from { opacity:0 } to { opacity:1 } }
                @keyframes modalIn {
                    from { opacity:0; transform: scale(0.88) translateY(16px) }
                    to   { opacity:1; transform: scale(1)    translateY(0)    }
                }
            `}</style>
        </div>
    );
}

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
    const [avatar, setAvatar]             = useState(null);
    const [profileImage, setProfileImage] = useState(null);
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
    const [notifications, setNotifications] = useState([]);
    const [dbCategories, setDbCategories]   = useState({ novel: [], manga: [] });
    const [navSearch, setNavSearch]         = useState('');

    // ── States: Modal ──
    const [modal, setModal] = useState(null); // { type, title, message }

    // ── Refs ──
    const profileRef   = useRef(null);
    const fileInputRef = useRef(null);
    const megaRef      = useRef(null);
    const notifRef     = useRef(null);
    const coinInterval = useRef(null);

    // helper
    const showModal = (type, title, message) => setModal({ type, title, message });

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
    //hide mail
    const maskEmail = (email) => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    return name.slice(0, 3) + '***@' + domain;
    };
    const refreshNotifications = async (token) => {
        const headers = { Authorization: `Bearer ${token}` };
        const readIds = loadReadIds();   // โหลด IDs ที่เคยอ่านแล้วจาก localStorage
        const [topupRes, histRes, newChapRes] = await Promise.all([
            axios.get('http://localhost:3001/topup/my-requests', { headers }).catch(() => ({ data: [] })),
            axios.get('http://localhost:3001/history', { headers }).catch(() => ({ data: [] })),
            axios.get('http://localhost:3001/notifications/new-chapters', { headers }).catch(() => ({ data: [] })),
        ]);
        setNotifications(buildNotifications(histRes.data, topupRes.data, newChapRes.data, readIds));
    };

    // ── Fetch DB Categories (เหมือน myshelf) ──
    useEffect(() => {
        axios.get('http://localhost:3001/books/categories')
            .then(res => setDbCategories(res.data))
            .catch(() => {});
    }, []);


    // ── 1. Init ──
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/'); return; }

        setIsLoggedIn(true);
        setRole(localStorage.getItem('role'));
        fetchCartCount();
        refreshNotifications(token);

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
                showModal('success', 'อัปเดตรูปโปรไฟล์สำเร็จ!', 'รูปโปรไฟล์ของคุณได้รับการอัปเดตเรียบร้อยแล้ว');
            } catch {
                showModal('error', 'อัปโหลดไม่สำเร็จ', 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ กรุณาลองใหม่อีกครั้ง');
            }
            finally { setUploading(false); }
        };
        reader.readAsDataURL(file);
    };

    // ── เปลี่ยนรหัสผ่าน ──
    const handlePasswordUpdate = async () => {
        if (!oldPassword || !newPassword || !confirmPassword)
            return showModal('warning', 'กรอกข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลในทุกช่องให้ครบถ้วน');
        if (newPassword !== confirmPassword)
            return showModal('error', 'รหัสผ่านไม่ตรงกัน', 'รหัสผ่านใหม่และยืนยันรหัสผ่านต้องเหมือนกัน กรุณาตรวจสอบอีกครั้ง');
        if (newPassword.length < 8)
            return showModal('warning', 'รหัสผ่านสั้นเกินไป', 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
        try {
            const token = localStorage.getItem('token');
            await axios.put('http://localhost:3001/profile/password',
                { oldPassword, newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showModal('success', 'เปลี่ยนรหัสผ่านสำเร็จ!', 'รหัสผ่านของคุณได้รับการอัปเดตเรียบร้อยแล้ว');
            setOldPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (err) {
            showModal('error', 'เกิดข้อผิดพลาด', err.response?.data?.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง');
        }
    };

    // ── Notification helpers ──
    const unreadCount  = notifications.filter(n => n.unread).length;
    const markAllRead = () => {
        setNotifications(prev => prev.map(n => {
            if (n.unread) saveReadId(n.id);
            return { ...n, unread: false };
        }));
        const token = localStorage.getItem('token');
        const newChapIds = notifications
            .filter(n => n.tag === 'new_chapter' && n.unread)
            .map(n => Number(n.id.replace('newchap-', '')));
        if (token && newChapIds.length > 0) {
            axios.post('http://localhost:3001/notifications/new-chapters/seen',
                { episodeIds: newChapIds },
                { headers: { Authorization: `Bearer ${token}` } }
            ).catch(() => {});
        }
    };

    const markOneRead = (id) => {
        saveReadId(id);  // บันทึกลง localStorage ทันที
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
        
        const notif = notifications.find(n => n.id === id);
        if (notif && notif.tag === 'new_chapter') {
            const token = localStorage.getItem('token');
            const episodeId = Number(id.replace('newchap-', ''));
            if (token && episodeId) {
                axios.post('http://localhost:3001/notifications/new-chapters/seen',
                    { episodeIds: [episodeId] },
                    { headers: { Authorization: `Bearer ${token}` } }
                ).catch(() => {});
            }
            if (notif.book_id) {
                setNotifOpen(false);
                navigate(`/read/${notif.book_id}`);
            }
        }
    };

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

            {/* ── Modal ── */}
            <Modal modal={modal} onClose={() => setModal(null)} />

            <Navbar/>

            {/* ══════════════════════ HERO / BREADCRUMB (เหมือน myshelf) ══════════════════════ */}
            <div className="topup-hero">
                <div className="topup-page-inner">
                    <div className="topup-breadcrumb">
                        <span className="topup-breadcrumb-home" onClick={() => navigate('/')}>
                            <i className="fas fa-house" style={{ color: '#999' }}></i>
                        </span>
                        <i className="fas fa-angle-right" style={{ fontSize: 12, color: '#aaa', margin: '0 8px' }}></i>
                        <span className="topup-breadcrumb-cur">ตั้งค่าบัญชี</span>
                    </div>
                </div>
            </div>

            {/* ══════════════════════ SETTING CONTENT ══════════════════════ */}
            <div className="setting-center-wrapper">
                <div className="setting-page">

                    <div className="setting-layout">

                        {/* ── Sidebar ── */}
                        <div className="setting-sidebar">
                            <div className="setting-sidebar-inner">
                                {/* User Mini Card */}
                                <div className="setting-user-card">
                                    <div className="setting-user-avatar-wrap">
                                        {avatar ? (
                                            <img src={avatar} alt="avatar" className="setting-user-avatar-img" />
                                        ) : (
                                            <div className="setting-user-avatar-placeholder">
                                                <i className="fas fa-user"></i>
                                            </div>
                                        )}
                                    </div>
                                    <div className="setting-user-info">
                                        <div className="setting-user-name">{username || 'ผู้ใช้งาน'}</div>
                                        <div className="setting-user-email">{maskEmail(email) || 'ไม่ได้ระบุอีเมล'}</div>
                                    </div>
                                </div>

                                <div className="setting-sidebar-divider"></div>

                                {/* Menu */}
                                <button
                                    className={`setting-sidebar-btn ${settingTab === 'account' ? 'active' : ''}`}
                                    onClick={() => setSettingTab('account')}>
                                    <i className="fas fa-id-card"></i>
                                    <span>ข้อมูลบัญชี</span>
                                    {settingTab === 'account' && <i className="fas fa-chevron-right setting-sidebar-arrow"></i>}
                                </button>
                                <button
                                    className={`setting-sidebar-btn ${settingTab === 'password' ? 'active' : ''}`}
                                    onClick={() => setSettingTab('password')}>
                                    <i className="fas fa-lock"></i>
                                    <span>เปลี่ยนรหัสผ่าน</span>
                                    {settingTab === 'password' && <i className="fas fa-chevron-right setting-sidebar-arrow"></i>}
                                </button>
                            </div>
                        </div>

                        {/* ── Main Content ── */}
                        <div className="setting-content">

                            {/* ─── TAB: account ─── */}
                            {settingTab === 'account' && (
                                <div className="setting-card">
                                    <div className="setting-card-header">
                                        <i className="fas fa-id-card" style={{ color: '#b5651d', marginRight: 10 }}></i>
                                        ข้อมูลบัญชี
                                    </div>

                                    {/* Avatar Section */}
                                    <div className="setting-avatar-section">
                                        <p className="setting-section-label">รูปโปรไฟล์</p>
                                        <div className="setting-avatar-row">
                                            <div
                                                className="setting-avatar-wrap"
                                                onClick={() => fileInputRef.current.click()}
                                                title="คลิกเพื่อเปลี่ยนรูป">
                                                {avatar ? (
                                                    <img src={avatar} alt="avatar" className="setting-avatar-img" />
                                                ) : (
                                                    <div className="setting-avatar-placeholder">
                                                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5">
                                                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                                                            <circle cx="8.5" cy="8.5" r="1.5"/>
                                                            <polyline points="21,15 16,10 5,21"/>
                                                        </svg>
                                                    </div>
                                                )}
                                                <div className="setting-avatar-cam">
                                                    {uploading ? (
                                                        <i className="fas fa-spinner fa-spin"></i>
                                                    ) : (
                                                        <i className="fas fa-camera"></i>
                                                    )}
                                                </div>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    style={{ display: 'none' }}
                                                    onChange={handleAvatarChange}
                                                />
                                            </div>
                                            <div className="setting-avatar-hint">
                                                <p className="setting-avatar-hint-title">เปลี่ยนรูปโปรไฟล์</p>
                                                <p className="setting-avatar-hint-desc">คลิกที่รูปเพื่ออัปโหลดรูปภาพใหม่<br/>รองรับ JPG, PNG ขนาดไม่เกิน 5MB</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="setting-divider"></div>

                                    {/* Info Fields */}
                                    <div className="setting-info-grid">
                                        <div className="setting-info-item">
                                            <div className="setting-info-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                                                <i className="fas fa-user"></i>
                                            </div>
                                            <div className="setting-info-body">
                                                <div className="setting-info-label">ชื่อผู้ใช้</div>
                                                <div className="setting-info-value">{username || '—'}</div>
                                            </div>
                                            <div className="setting-info-badge">ไม่สามารถเปลี่ยนได้</div>
                                        </div>

                                        <div className="setting-info-item">
                                            <div className="setting-info-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>
                                                <i className="fas fa-envelope"></i>
                                            </div>
                                            <div className="setting-info-body">
                                                <div className="setting-info-label">อีเมล</div>
                                                <div className="setting-info-value">
                                                    {maskEmail(email) || <span style={{ color: '#aaa', fontStyle: 'italic' }}>ยังไม่ได้ระบุอีเมล</span>}
                                                </div>
                                            </div>
                                        </div>

                                        {coins !== null && (
                                            <div className="setting-info-item">
                                                <div className="setting-info-icon" style={{ background: '#fef9c3', color: '#ca8a04' }}>
                                                    <i className="fas fa-coins"></i>
                                                </div>
                                                <div className="setting-info-body">
                                                    <div className="setting-info-label">เหรียญสะสม</div>
                                                    <div className="setting-info-value" style={{ color: '#b5651d', fontWeight: 700 }}>
                                                        {coins.toLocaleString()} เหรียญ
                                                    </div>
                                                </div>
                                                <button
                                                    className="setting-topup-btn"
                                                    onClick={() => navigate('/topup')}>
                                                    เติมเหรียญ
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ─── TAB: password ─── */}
                            {settingTab === 'password' && (
                                <div className="setting-card">
                                    <div className="setting-card-header">
                                        <i className="fas fa-lock" style={{ color: '#b5651d', marginRight: 10 }}></i>
                                        เปลี่ยนรหัสผ่าน
                                    </div>

                                    <div className="setting-pw-info-box">
                                        <i className="fas fa-shield-alt" style={{ color: '#3b82f6', marginRight: 8 }}></i>
                                        รหัสผ่านที่ดีควรมีความยาวอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวอักษรและตัวเลข
                                    </div>

                                    <div className="pw-fields-wrap">
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
                                    </div>

                                    <div className="setting-save-row">
                                        <button className="setting-save-btn" onClick={handlePasswordUpdate}>
                                            <i className="fas fa-check" style={{ marginRight: 8 }}></i>
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