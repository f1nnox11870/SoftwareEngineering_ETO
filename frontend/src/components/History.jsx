import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/history.css';
import Navbar from './navbar';

// ── Constants ──
const MAIN_CATEGORIES = [
    { label: 'นิยาย',           key: 'novel', tab: 'นิยาย'          },
    { label: 'การ์ตูน(มังงะ)', key: 'manga', tab: 'การ์ตูน/มังงะ'  },
];

// ── Notification helpers ──
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
        const nid   = `newchap-${c.chapter_id}`;
        const title = `มีตอนใหม่: ${c.book_title}`;
        const desc  = `ตอนที่ ${c.chapter_number}${c.chapter_title ? ` — ${c.chapter_title}` : ''} เพิ่งเผยแพร่แล้ว`;
        notifs.push({
            id: nid, title, desc,
            time: formatTime(c.published_at),
            unread: !readIds.has(nid),
            tag: 'new_chapter',
            book_id: c.book_id,
        });
    });

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

function History() {
    const navigate = useNavigate();

    // ── Navbar states ──
    const [isLoggedIn, setIsLoggedIn]     = useState(false);
    const [username, setUsername]         = useState('');
    const [profileImage, setProfileImage] = useState(null);
    const [role, setRole]                 = useState(null);
    const [coins, setCoins]               = useState(null);
    const [cartCount, setCartCount]       = useState(0);
    const [favoriteIds, setFavoriteIds]   = useState([]);
    const [navSearch, setNavSearch]       = useState('');
    const [megaOpen, setMegaOpen]         = useState(false);
    const [hoveredMenu, setHoveredMenu]   = useState(null);
    const [dbCategories, setDbCategories] = useState({ novel: [], manga: [] });
    const [profileOpen, setProfileOpen]   = useState(false);
    const [notifOpen, setNotifOpen]       = useState(false);
    const [notifications, setNotifications] = useState([]);

    // ── History states ──
    const [historyData, setHistoryData]       = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    // ── Refs ──
    const megaRef    = useRef(null);
    const profileRef = useRef(null);
    const notifRef   = useRef(null);

    // ── Fetch ──
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/'); return; }
        setIsLoggedIn(true);
        setRole(localStorage.getItem('role'));

        const headers = { Authorization: `Bearer ${token}` };

        // Profile
        axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/profile', { headers })
            .then(res => {
                setUsername(res.data.username);
                setCoins(res.data.coins ?? 0);
                setProfileImage(res.data.image || null);
            })
            .catch(() => handleLogout());

        // History
        axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/history', { headers })
            .then(res => { setHistoryData(res.data); setLoadingHistory(false); })
            .catch(err => { console.error('Error fetching history:', err); setLoadingHistory(false); });

        // Favorite IDs
        axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/favorites', { headers })
            .then(res => setFavoriteIds(res.data.map(item => item.book_id)))
            .catch(() => {});

        // Cart count
        axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/cart', { headers })
            .then(res => setCartCount(res.data.length))
            .catch(() => {});

        // Notifications
        const readIds = loadReadIds();
        Promise.all([
            axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/topup/my-requests', { headers }).catch(() => ({ data: [] })),
            axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/history', { headers }).catch(() => ({ data: [] })),
            axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/notifications/new-chapters', { headers }).catch(() => ({ data: [] })),
        ]).then(([topupRes, histRes, newChapRes]) =>
            setNotifications(buildNotifications(histRes.data, topupRes.data, newChapRes.data, readIds))
        );
    }, [navigate]);

    // ── Subcategories ──
    useEffect(() => {
        axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/books/categories')
            .then(res => setDbCategories(res.data))
            .catch(() => {});
    }, []);

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
        <div className="home-page shelf-page">
            <Navbar/>

            {/* ══ HERO / BREADCRUMB ══ */}
            <div className="topup-hero">
                <div className="topup-page-inner">
                    <div className="topup-breadcrumb">
                        <span className="topup-breadcrumb-home" onClick={() => navigate('/')}>
                            <i className="fas fa-house" style={{ color: '#999' }}></i>
                        </span>
                        <i className="fas fa-angle-right" style={{ fontSize: 12, color: '#aaa', margin: '0 8px' }}></i>
                        <span className="topup-breadcrumb-cur">ประวัติการสั่งซื้อ</span>
                    </div>
                </div>
            </div>

            {/* ══ MAIN CONTENT ══ */}
            <div className="setting-center-wrapper">
                <div className="page" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                    <h1 className="heading" style={{ marginBottom: '20px' }}>ประวัติการสั่งซื้อ</h1>

                    {loadingHistory ? (
                        <div style={{ textAlign: 'center', padding: '50px 0', color: '#666' }}>
                            <i className="fas fa-spinner fa-spin" style={{ fontSize: '30px', marginBottom: '10px' }}></i>
                            <p>กำลังโหลดข้อมูล...</p>
                        </div>
                    ) : historyData.length === 0 ? (
                        <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                            <div style={{ fontSize: '64px', color: '#eee', marginBottom: '20px' }}>
                                <i className="fas fa-receipt"></i>
                            </div>
                            <h2 style={{ color: '#333', marginBottom: '10px' }}>ยังไม่มีรายการซื้อ</h2>
                            <p style={{ color: '#999' }}>เมื่อคุณซื้อหนังสือหรือตอนนิยาย รายการจะปรากฏที่นี่</p>
                            <button className="logout-btn" style={{ marginTop: '20px' }} onClick={() => navigate('/')}>ไปเลือกซื้อหนังสือ</button>
                        </div>
                    ) : (
                        <div className="history-list">
                            {historyData.map((item) => (
                                <div key={item.id} className="card" style={{
                                    padding: '25px 20px',
                                    marginBottom: '2px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderLeft: `3px solid ${item.type === 'book' ? '#1976d2' : '#c2185b'}`
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{
                                            width: '45px', height: '45px', borderRadius: '40%',
                                            backgroundColor: item.type === 'book' ? 'gray' : 'gray',
                                            color: item.type === 'book' ? 'white' : 'white',
                                            display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px'
                                        }}>
                                            <i className={item.type === 'book' ? 'fas fa-book' : 'fas fa-file-alt'}></i>
                                        </div>
                                        <div>
                                            <h3 style={{ margin: '0 0 5px 0', fontSize: '16px', color: '#333' }}>
                                                {item.title}
                                            </h3>
                                            <span style={{ fontSize: '13px', color: '#888' }}>
                                                <i className="far fa-clock" style={{ marginRight: '5px' }}></i>
                                                {new Date(item.purchased_at).toLocaleString('th-TH', {
                                                    year: 'numeric', month: 'short', day: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })} น.
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 'bold', color: 'red', fontSize: '18px' }}>
                                            - {item.price} เหรียญ
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', backgroundColor: '#f5f5f5', padding: '2px 8px', borderRadius: '4px', display: 'inline-block' }}>
                                            {item.type === 'book' ? 'ซื้อหนังสือทั้งเล่ม' : 'ปลดล็อกตอน'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default History;