import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/cart.css';
import '../assets/Favorites.css';
import Navbar from './navbar';

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

function Favorites() {
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

    // ── Favorites states ──
    const [favorites, setFavorites]   = useState([]);
    const [loading, setLoading]       = useState(true);
    const [removingId, setRemovingId] = useState(null);

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
        axios.get('http://localhost:3001/profile', { headers })
            .then(res => {
                setUsername(res.data.username);
                setCoins(res.data.coins ?? 0);
                setProfileImage(res.data.image || null);
            })
            .catch(() => { localStorage.clear(); navigate('/'); });

        // Favorites
        axios.get('http://localhost:3001/favorites/full', { headers })
            .then(res => { setFavorites(res.data); setLoading(false); })
            .catch(err => {
                if (err.response?.status === 403) { localStorage.clear(); navigate('/'); }
                setLoading(false);
            });

        // Favorite IDs (for badge)
        axios.get('http://localhost:3001/favorites', { headers })
            .then(res => setFavoriteIds(res.data.map(item => item.book_id)))
            .catch(() => {});

        // Notifications
        const readIds = loadReadIds();
        Promise.all([
            axios.get('http://localhost:3001/topup/my-requests', { headers }).catch(() => ({ data: [] })),
            axios.get('http://localhost:3001/history', { headers }).catch(() => ({ data: [] })),
            axios.get('http://localhost:3001/notifications/new-chapters', { headers }).catch(() => ({ data: [] })),
        ]).then(([topupRes, histRes, newChapRes]) =>
            setNotifications(buildNotifications(histRes.data, topupRes.data, newChapRes.data, readIds))
        );

        // Cart count
        axios.get('http://localhost:3001/cart', { headers })
            .then(res => setCartCount(res.data.length))
            .catch(() => {});
    }, [navigate]);

    // ── Subcategories ──
    useEffect(() => {
        axios.get('http://localhost:3001/books/categories')
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
            axios.post('http://localhost:3001/notifications/new-chapters/seen',
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

    const handleRemoveFavorite = async (bookId) => {
        const token = localStorage.getItem('token');
        setRemovingId(bookId);
        try {
            await axios.post('http://localhost:3001/favorites/toggle', { bookId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFavorites(prev => prev.filter(b => b.id !== bookId));
        } catch {
            alert('เกิดข้อผิดพลาดในการลบรายการโปรด');
        } finally {
            setRemovingId(null);
        }
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
                        <span className="topup-breadcrumb-cur">รายการโปรด</span>
                    </div>
                </div>
            </div>

            {/* ══ MAIN CONTENT ══ */}
            <div className="cart-container">
                <h2 className="cart-title" style={{ borderColor: '#b5651d' }}>
                    <i className="fas fa-heart" style={{ marginRight: 8, color: '#ff4e63' }}></i>
                    หนังสือเล่มโปรดของคุณ
                    {!loading && <span style={{ fontSize: 15, fontWeight: 400, color: '#888', marginLeft: 8 }}>({favorites.length} เล่ม)</span>}
                </h2>

                {loading ? (
                    <div className="hist-loading">
                        <i className="fas fa-spinner fa-spin"></i>
                        <p>กำลังโหลดรายการโปรด…</p>
                    </div>
                ) : favorites.length === 0 ? (
                    <div className="empty-cart">
                        <i className="fas fa-heart-broken" style={{ fontSize: 56, color: '#ffcdd2', marginBottom: 16, display: 'block' }}></i>
                        <p style={{ color: '#888', fontSize: 18, marginBottom: 16 }}>ยังไม่มีหนังสือในรายการโปรดเลย</p>
                        <button className="btn-checkout" style={{ width: 'auto', padding: '10px 28px' }} onClick={() => navigate('/')}>
                            ไปเลือกหนังสือ
                        </button>
                    </div>
                ) : (
                    <div className="fav-grid">
                        {favorites.map(book => (
                            <div key={book.id} className="fav-card">
                                {/* Cover */}
                                <div className="fav-cover" onClick={() => navigate(`/read/${book.id}`)}>
                                    <img
                                        src={book.image}
                                        alt={book.title}
                                        className="fav-cover-img"
                                        onError={e => { e.target.style.display = 'none'; }}
                                    />
                                    <div className="fav-cover-overlay">
                                        <i className="fas fa-book-open"></i> อ่านเลย
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="fav-info">
                                    <div className="fav-book-title" title={book.title}>{book.title}</div>
                                    <div className="fav-book-author">{book.author}</div>
                                    {book.category && (
                                        <span className="fav-book-cat">{book.category}</span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="fav-actions">
                                    <button className="fav-btn-read" onClick={() => navigate(`/read/${book.id}`)}>
                                        <i className="fas fa-book-open"></i> อ่าน
                                    </button>
                                    <button
                                        className="fav-btn-remove"
                                        onClick={() => handleRemoveFavorite(book.id)}
                                        disabled={removingId === book.id}
                                        title="ลบออกจากรายการโปรด"
                                    >
                                        {removingId === book.id
                                            ? <i className="fas fa-spinner fa-spin"></i>
                                            : <i className="fas fa-heart-broken"></i>
                                        }
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Favorites;
