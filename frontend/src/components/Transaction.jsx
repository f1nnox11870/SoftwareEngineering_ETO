import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Login from './login';
import Register from './Register';
import '../assets/transaction.css';
import Navbar from './navbar';

const MAIN_CATEGORIES = [
    { label: 'นิยาย',           key: 'novel', tab: 'นิยาย'          },
    { label: 'การ์ตูน(มังงะ)', key: 'manga', tab: 'การ์ตูน/มังงะ'  },
];

//  Notification helpers 
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

    // ── แจ้งเตือนตอนใหม่ (หนังสือที่ซื้อหรือกดใจ) ──────────────────────────
    newChapterData.forEach(c => {
        const nid   = `newchap-${c.chapter_id}`;
        const title = `มีตอนใหม่: ${c.book_title}`;
        const desc  = `ตอนที่ ${c.chapter_number}${c.chapter_title ? ` — ${c.chapter_title}` : ''} เพิ่งเผยแพร่แล้ว`;
        notifs.push({
            id: nid,
            title,
            desc,
            time: formatTime(c.published_at),
            unread: !readIds.has(nid),
            tag: 'new_chapter',
            book_id: c.book_id,
        });
    });

    // ── เติมเหรียญ ────────────────────────────────────────────────────────────
    topupData.forEach(t => {
        const nid   = `topup-${t.id}`;
        const title = t.status === 'approved'
            ? `เติมเหรียญสำเร็จ +${Number(t.total_coins).toLocaleString()} เหรียญ`
            : t.status === 'rejected' ? 'คำขอเติมเหรียญถูกปฏิเสธ'
            : 'คำขอเติมเหรียญรอการตรวจสอบ';
        const desc = t.status === 'approved'
            ? `ชำระ ฿${t.amount} — รับ ${Number(t.total_coins).toLocaleString()} เหรียญแล้ว`
            : t.status === 'rejected' ? (t.note || 'กรุณาติดต่อฝ่ายสนับสนุน')
            : `แพ็กเกจ ฿${t.amount} — รอแอดมินตรวจสอบ`;
        notifs.push({ id: nid, title, desc, time: formatTime(t.created_at), unread: !readIds.has(nid) && t.status === 'approved' });
    });

    // ── ประวัติซื้อ ───────────────────────────────────────────────────────────
    historyData.slice(0, 8).forEach(h => {
        const nid   = `hist-${h.id}`;
        const title = h.type === 'book' ? 'ซื้อหนังสือสำเร็จ' : h.type === 'topup' ? 'เติมเหรียญสำเร็จ' : 'ปลดล็อกตอนสำเร็จ';
        notifs.push({ id: nid, title, desc: h.title, time: formatTime(h.purchased_at), unread: false });
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


const Transaction = () => {
    const navigate = useNavigate();

    // ── Navbar state ──
    const [isLoggedIn, setIsLoggedIn]       = useState(false);
    const [username, setUsername]           = useState('');
    const [profileImage, setProfileImage]   = useState(null);
    const [role, setRole]                   = useState(null);
    const [modal, setModal]                 = useState(null);
    const [coins, setCoins]                 = useState(null);
    const [cartCount, setCartCount]         = useState(0);
    const [favoriteIds, setFavoriteIds]   = useState([]);
    const [megaOpen, setMegaOpen]           = useState(false);
    const [hoveredMenu, setHoveredMenu]     = useState(null);
    const [dbCategories, setDbCategories]   = useState({ novel: [], manga: [] });
    const [profileOpen, setProfileOpen]     = useState(false);
    const [notifOpen, setNotifOpen]         = useState(false);
    const [notifications, setNotifications] = useState([]);
    const megaRef      = useRef(null);
    const profileRef   = useRef(null);
    const notifRef     = useRef(null);
    const coinInterval = useRef(null);

    // ── Page state ──
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null); // modal detail

    // ── Init ──
    useEffect(() => {
        const token = localStorage.getItem('token');
        const user  = localStorage.getItem('username');
        if (token) {
            setIsLoggedIn(true);
            if (user) setUsername(user);
            setRole(localStorage.getItem('role'));
        }
    }, []);

    const fetchFavoriteIds = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        try {
            const res = await axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/favorites', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // แปลงข้อมูลให้กลายเป็น Array ของ ID ก่อนนำไปใช้
            const ids = res.data.map(item => item.book_id);
            setFavoriteIds(ids);
        } catch (error) {
            console.error("Error fetching favorites:", error);
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const res = await axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCoins(res.data.coins ?? 0);
                setProfileImage(res.data.image || null);
            } catch { setCoins(0); }
        };
        if (isLoggedIn) {
            const token = localStorage.getItem('token');
            fetchProfile();
            refreshNotifications(token);
            fetchFavoriteIds();
            axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/cart', { headers: { Authorization: `Bearer ${token}` } })
                .then(res => setCartCount(res.data.length)).catch(() => {});
            coinInterval.current = setInterval(fetchProfile, 30000);
        } else {
            setCoins(null);
            clearInterval(coinInterval.current);
        }
        return () => clearInterval(coinInterval.current);
    }, [isLoggedIn]);

    useEffect(() => {
        const h = (e) => {
            if (megaRef.current    && !megaRef.current.contains(e.target))    setMegaOpen(false);
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
            if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const unreadCount = notifications.filter(n => n.unread).length;
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
            axios.post('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/notifications/new-chapters/seen',
                { episodeIds: newChapIds },
                { headers: { Authorization: `Bearer ${token}` } }
            ).catch(() => {});
        }
    };
    const markOneRead = (id) => {
        saveReadId(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
        const notif = notifications.find(n => n.id === id);
        if (notif && notif.tag === 'new_chapter') {
            const token = localStorage.getItem('token');
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
    };
    const refreshNotifications = async (token) => {
        const headers = { Authorization: `Bearer ${token}` };
        const readIds = loadReadIds();
        const [topupRes, histRes, newChapRes] = await Promise.all([
            axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/topup/my-requests', { headers }).catch(() => ({ data: [] })),
            axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/history', { headers }).catch(() => ({ data: [] })),
            axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/notifications/new-chapters', { headers }).catch(() => ({ data: [] })),
        ]);
        setNotifications(buildNotifications(histRes.data, topupRes.data, newChapRes.data, readIds));
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        setIsLoggedIn(false); setUsername(''); setProfileOpen(false); setCoins(null);
    };
    const handleLoginSuccess = (name) => { setIsLoggedIn(true); setUsername(name); setModal(null); };
    const handleOverlayClick = (e) => { if (e.target.classList.contains('modal-overlay')) setModal(null); };

    // ── Page logic ──
    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/topup-history', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data);
        } catch (err) {
            console.error('Fetch error:', err.response || err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchHistory(); }, []);

    // ดึง subcategories จาก DB
    useEffect(() => {
        axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/books/categories')
            .then(res => setDbCategories(res.data))
            .catch(() => {});
    }, []);

    const statusMap = {
        pending:  { label: 'รอดำเนินการ', icon: 'fa-clock',        color: '#f39c12', bg: 'rgba(243,156,18,0.08)'  },
        approved: { label: 'สำเร็จ',       icon: 'fa-circle-check', color: '#2ecc71', bg: 'rgba(46,204,113,0.08)'  },
        rejected: { label: 'ปฏิเสธ',       icon: 'fa-circle-xmark', color: '#e74c3c', bg: 'rgba(231,76,60,0.08)'   },
    };

    const fmtDate = (str) =>
        new Date(str).toLocaleString('th-TH', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }) + ' น.';

    return (
        <div className="home-page">
            <Navbar/>

            {/* ══ HERO HEADER ══ */}
            <div className="topup-hero">
                <div className="topup-page-inner">
                    <div className="topup-breadcrumb">
                        <span className="topup-breadcrumb-home" onClick={() => navigate('/')}><i className="fas fa-house" style={{ color: '#999' }}></i></span>
                        <i className="fas fa-angle-right" style={{ fontSize: 12, color: '#aaa' }}></i>
                        <span className="topup-breadcrumb-cur">รายการเติมเงิน</span>
                    </div>
                </div>
            </div>

            {/* ══ MAIN CONTENT ══ */}
            <div className="txn-main">
                <div className="txn-inner">

                    {/* toolbar */}
                    <div className="txn-toolbar">
                        <span className="txn-toolbar-label">
                            {!loading && `${history.length} รายการ`}
                        </span>
                        <button className="txn-refresh-btn" onClick={fetchHistory}>
                            <i className="fas fa-rotate-right"></i> รีเฟรช
                        </button>
                    </div>

                    {/* list */}
                    {loading ? (
                        <div className="txn-empty">
                            <i className="fas fa-spinner fa-spin txn-empty-icon"></i>
                            <p>กำลังโหลดข้อมูล…</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="txn-empty">
                            <i className="fas fa-file-invoice-dollar txn-empty-icon"></i>
                            <p>ยังไม่มีประวัติการเติมเงิน</p>
                            <button className="txn-goto-btn" onClick={() => navigate('/topup')}>
                                <i className="fas fa-coins"></i> เติมเหรียญเลย
                            </button>
                        </div>
                    ) : (
                        <div className="txn-list">
                            {history.map((item) => {
                                const s = statusMap[item.status] || statusMap.pending;
                                return (
                                    <div key={item.id} className="txn-row" onClick={() => setSelectedItem(item)} style={{ cursor: 'pointer' }}>
                                        <div className="txn-row-left">
                                            <div className="txn-coin-dot" style={{ background: s.bg }}>
                                                <i className="fa-solid fa-coins" style={{ color: '#f0a500' }}></i>
                                            </div>
                                            <div>
                                                <div className="txn-row-title">
                                                    เติม <strong>{Number(item.coins).toLocaleString()}</strong> เหรียญ
                                                    {item.bonus > 0 && (
                                                        <span className="txn-bonus-tag">+{item.bonus} โบนัส</span>
                                                    )}
                                                </div>
                                                <div className="txn-row-date">{fmtDate(item.created_at)}</div>
                                            </div>
                                        </div>
                                        <div className="txn-row-right">
                                            <div className="txn-row-amount">฿{Number(item.amount).toLocaleString()}</div>
                                            <div className="txn-badge" style={{ color: s.color, background: s.bg }}>
                                                <i className={`fas ${s.icon}`}></i> {s.label}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {!loading && history.length > 0 && (
                        <p className="txn-note">
                            <i className="fas fa-circle-info"></i>
                            รายการจะถูกตรวจสอบโดยแอดมินภายใน 5–15 นาที
                        </p>
                    )}
                </div>
            </div>


            {/* ══ TRANSACTION DETAIL MODAL ══ */}
            {selectedItem && (() => {
                const s = statusMap[selectedItem.status] || statusMap.pending;
                return (
                    <div
                        onClick={() => setSelectedItem(null)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 9999,
                            background: 'rgba(0,0,0,0.55)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backdropFilter: 'blur(6px)',
                            padding: '20px',
                        }}
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: '#fff',
                                borderRadius: '20px',
                                width: '100%',
                                maxWidth: '460px',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
                                animation: 'modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                padding: '20px 24px 16px',
                                borderBottom: '1px solid #f0f0f0',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: '50%',
                                        background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <i className="fa-solid fa-coins" style={{ color: '#f0a500', fontSize: 18 }}></i>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>รายละเอียดการเติมเหรียญ</div>
                                        <div style={{ fontSize: 12, color: '#aaa' }}>#{selectedItem.id}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#aaa', lineHeight: 1 }}
                                >✕</button>
                            </div>

                            {/* Body */}
                            <div style={{ padding: '20px 24px' }}>

                                {/* Status badge */}
                                <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '6px 14px', borderRadius: 20,
                                    background: s.bg, color: s.color,
                                    fontWeight: 700, fontSize: 13, marginBottom: 20,
                                }}>
                                    <i className={`fas ${s.icon}`}></i> {s.label}
                                </div>

                                {/* Info rows */}
                                {[
                                    { label: 'ชื่อผู้ใช้',    value: selectedItem.username || localStorage.getItem('username') || '—', icon: 'fa-user' },
                                    { label: 'จำนวนเหรียญ',   value: `${Number(selectedItem.coins).toLocaleString()} เหรียญ${selectedItem.bonus > 0 ? ` (+${selectedItem.bonus} โบนัส)` : ''}`, icon: 'fa-coins' },
                                    { label: 'ยอดชำระ',       value: `฿${Number(selectedItem.amount).toLocaleString()}`, icon: 'fa-money-bill-wave' },
                                    { label: 'แพ็กเกจ',       value: selectedItem.package_id || '—', icon: 'fa-box' },
                                    { label: 'วันที่ทำรายการ', value: fmtDate(selectedItem.created_at), icon: 'fa-calendar' },
                                    ...(selectedItem.approved_at ? [{ label: 'วันที่อนุมัติ', value: fmtDate(selectedItem.approved_at), icon: 'fa-calendar-check' }] : []),
                                    ...(selectedItem.note ? [{ label: 'หมายเหตุ', value: selectedItem.note, icon: 'fa-circle-info' }] : []),
                                ].map(({ label, value, icon }) => (
                                    <div key={label} style={{
                                        display: 'flex', alignItems: 'flex-start', gap: 12,
                                        padding: '10px 0', borderBottom: '1px solid #f5f5f5',
                                    }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: 8,
                                            background: '#f8f8f8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            <i className={`fas ${icon}`} style={{ color: '#b5651d', fontSize: 13 }}></i>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, color: '#aaa', marginBottom: 2 }}>{label}</div>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>{value}</div>
                                        </div>
                                    </div>
                                ))}

                                {/* Slip image */}
                                {selectedItem.slip_image ? (
                                    <div style={{ marginTop: 20 }}>
                                        <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                                            <i className="fas fa-image" style={{ marginRight: 6 }}></i>สลิปการโอนเงิน
                                        </div>
                                        <div style={{
                                            borderRadius: 12, overflow: 'hidden',
                                            border: '1.5px solid #f0e6d8',
                                            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                                        }}>
                                            <img
                                                src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${selectedItem.slip_image}`}
                                                alt="สลิปโอนเงิน"
                                                style={{ width: '100%', display: 'block' }}
                                                onError={e => { e.target.style.display = 'none'; }}
                                            />
                                        </div>
                                        <a
                                            href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${selectedItem.slip_image}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                                marginTop: 10, fontSize: 13, color: '#b5651d', fontWeight: 600, textDecoration: 'none',
                                            }}
                                        >
                                            <i className="fas fa-arrow-up-right-from-square"></i> เปิดสลิปในแท็บใหม่
                                        </a>
                                    </div>
                                ) : (
                                    <div style={{
                                        marginTop: 20, padding: '16px', borderRadius: 12,
                                        background: '#fafafa', border: '1.5px dashed #e0e0e0',
                                        textAlign: 'center', color: '#bbb', fontSize: 13,
                                    }}>
                                        <i className="fas fa-image" style={{ fontSize: 24, marginBottom: 8, display: 'block' }}></i>
                                        ไม่มีสลิปแนบมา
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div style={{ padding: '12px 24px 20px' }}>
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    style={{
                                        width: '100%', padding: '12px', borderRadius: 12,
                                        background: '#b5651d', color: '#fff',
                                        border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                                    }}
                                >
                                    ปิด
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ══ LOGIN/REGISTER MODAL ══ */}
            {modal && (
                <div className="modal-overlay" onClick={handleOverlayClick}>
                    {modal === 'login'    && <Login    onClose={() => setModal(null)} onSwitch={() => setModal('register')} onLoginSuccess={handleLoginSuccess} />}
                    {modal === 'register' && <Register onClose={() => setModal(null)} onSwitch={() => setModal('login')} />}
                </div>
            )}
        </div>
    );
};

// add animation
const styleTag = document.createElement('style');
styleTag.textContent = `@keyframes modalIn { from { opacity:0; transform:scale(0.88) translateY(16px) } to { opacity:1; transform:scale(1) translateY(0) } }`;
if (!document.head.querySelector('[data-txn-anim]')) { styleTag.setAttribute('data-txn-anim','1'); document.head.appendChild(styleTag); }

export default Transaction;