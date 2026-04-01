import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../assets/myshelf.css';
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

// ── ฟอร์แมตวันที่ ──
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
};
function getImageUrl(path, fallback = 'https://via.placeholder.com/175x260?text=No+Cover') {
    if (!path) return fallback;
    if (path.startsWith('http')) return path;

    // กันเคสไม่มี /
    const clean = path.replace(/^\/+/, '');
    return `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/${clean}`;
}

// ฟังก์ชันสร้าง Array การแจ้งเตือน
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

// ระบบจัดการ ID ที่อ่านแล้วใน LocalStorage
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

function MyShelf() {
    const navigate = useNavigate();

    // ── Auth / UI State (เหมือน Topup.jsx) ──
    const [isLoggedIn, setIsLoggedIn]     = useState(false);
    const [username, setUsername]         = useState('');
    const [role, setRole]                 = useState(null);
    const [profileImage, setProfileImage] = useState(null);
    const [coins, setCoins]               = useState(null);
    const [cartCount, setCartCount]       = useState(0);
    const [favoriteIds, setFavoriteIds]   = useState([]);
    const [navSearch, setNavSearch]       = useState('');
    const [megaOpen, setMegaOpen]         = useState(false);
    const [hoveredMenu, setHoveredMenu]   = useState(null);
    const [dbCategories, setDbCategories] = useState({ novel: [], manga: [] });
    const [profileOpen, setProfileOpen]   = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notifOpen, setNotifOpen]         = useState(false);
    


    // ── Shelf State ──
    const [loading, setLoading]   = useState(true);
    const [viewMode, setViewMode] = useState('grid');   // 'grid' | 'list'
    const [search, setSearch]     = useState('');
    const [filterCat, setFilterCat] = useState('ทั้งหมด');
    const [categories, setCategories] = useState(['ทั้งหมด']);
    
    // ── หนังสือ ──
    const [fullBooks, setFullBooks] = useState([]);
    const [partialBooks, setPartialBooks] = useState([]);
    const [activeTab, setActiveTab] = useState('FULL'); // 'FULL' = เหมาเล่ม, 'PARTIAL' = รายตอน

    const megaRef    = useRef(null);
    const profileRef = useRef(null);
    const notifRef   = useRef(null);
    const coinInterval = useRef(null);


    // ══════════════════════════════════════════
    //  Fetch: ดึงข้อมูลหมวดหมู่จาก DB (เหมือน Topup)
    // ══════════════════════════════════════════
    useEffect(() => {
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/books/categories`)
            .then(res => setDbCategories(res.data))
            .catch(() => {});
    }, []);

    // ══════════════════════════════════════════
    //  Fetch: หนังสือในชั้น
    // ══════════════════════════════════════════
    const fetchLibrary = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        setLoading(true);
        try {
            const [resFull, resPartial] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/library`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/library/episodes`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            
            setFullBooks(resFull.data || []);
            setPartialBooks(resPartial.data || []);

            // สร้าง Categories ไดนามิกจากหนังสือที่มี
            const allBooks = [...(resFull.data || []), ...(resPartial.data || [])];
            const cats = ['ทั้งหมด', ...new Set(allBooks.map(b => b.category).filter(Boolean))];
            setCategories(cats);
        } catch (error) {
            console.error("Error fetching library:", error);
        } finally {
            setLoading(false);
        }
    };

    // ══════════════════════════════════════════
    //  Polling เหรียญทุก 30 วิ (หลัง login แล้ว)
    // ══════════════════════════════════════════
    useEffect(() => {
        if (!isLoggedIn) { clearInterval(coinInterval.current); return; }
        const token = localStorage.getItem('token');
        coinInterval.current = setInterval(() => {
            axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/profile`, { headers: { Authorization: `Bearer ${token}` } })
                .then(res => setCoins(res.data.coins ?? 0))
                .catch(() => {});
        }, 30000);
        return () => clearInterval(coinInterval.current);
    }, [isLoggedIn]);

    // ══════════════════════════════════════════
    //  Init (รันครั้งเดียวตอน mount)
    // ══════════════════════════════════════════
    useEffect(() => {
        const token     = localStorage.getItem('token');
        const user      = localStorage.getItem('username');
        const savedRole = localStorage.getItem('role');

        if (!token) { navigate('/'); return; }

        // เซ็ตจาก localStorage ก่อน ให้ navbar แสดงได้ทันที
        setIsLoggedIn(true);
        if (user)      setUsername(user);
        if (savedRole) setRole(savedRole);

        const headers = { Authorization: `Bearer ${token}` };

        // Profile (เหรียญ + รูป)
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/profile`, { headers })
            .then(res => {
                setCoins(res.data.coins ?? 0);
                setProfileImage(res.data.image || null);
                if (res.data.username) setUsername(res.data.username);
                if (res.data.role)     setRole(res.data.role);
            })
            .catch(() => {});

        // ตะกร้า + Favorites
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/cart`, { headers })
            .then(res => setCartCount(res.data.length || 0))
            .catch(() => {});
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/favorites`, { headers })
            .then(res => setFavoriteIds(res.data.map(i => i.book_id)))
            .catch(() => {});

        // หนังสือในชั้น + Notifications
        fetchLibrary();
        refreshNotifications(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ══════════════════════════════════════════
    //  Close dropdowns on outside click
    // ══════════════════════════════════════════
    useEffect(() => {
        const h = (e) => {
            if (megaRef.current    && !megaRef.current.contains(e.target))    setMegaOpen(false);
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
            if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const unreadCount  = notifications.filter(n => n.unread).length;
    const markAllRead = () => {
        setNotifications(prev => prev.map(n => {
            if (n.unread) saveReadId(n.id);
            return { ...n, unread: false };
        }));
        // บันทึก new_chapter ที่ยังไม่เคย seen ไปยัง backend ด้วย
        const token = localStorage.getItem('token');
        const newChapIds = notifications
            .filter(n => n.tag === 'new_chapter' && n.unread)
            .map(n => Number(n.id.replace('newchap-', '')));
        if (token && newChapIds.length > 0) {
            axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/notifications/new-chapters/seen`,
                { episodeIds: newChapIds },
                { headers: { Authorization: `Bearer ${token}` } }
            ).catch(() => {});
        }
    };
    const markOneRead = (id) => {
        saveReadId(id);  // บันทึกลง localStorage ทันที
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
        // ถ้าเป็น new_chapter → บันทึก backend + navigate ไปหน้าเรื่องนั้น
        const notif = notifications.find(n => n.id === id);
        if (notif && notif.tag === 'new_chapter') {
            const token = localStorage.getItem('token');
            const episodeId = Number(id.replace('newchap-', ''));
            if (token && episodeId) {
                axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/notifications/new-chapters/seen`,
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
        const readIds = loadReadIds();   // โหลด IDs ที่เคยอ่านแล้วจาก localStorage
        const [topupRes, histRes, newChapRes] = await Promise.all([
            axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/topup/my-requests`, { headers }).catch(() => ({ data: [] })),
            axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/history`, { headers }).catch(() => ({ data: [] })),
            axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/notifications/new-chapters`, { headers }).catch(() => ({ data: [] })),
        ]);
        setNotifications(buildNotifications(histRes.data, topupRes.data, newChapRes.data, readIds));
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

    // ── ฟิลเตอร์หนังสือ ──
    const displayBooks = activeTab === 'FULL' ? fullBooks : partialBooks;
    const filteredBooks = displayBooks.filter(b => {
        const matchSearch = b.title?.toLowerCase().includes(search.toLowerCase()) ||
                            b.author?.toLowerCase().includes(search.toLowerCase());
        const matchCat    = filterCat === 'ทั้งหมด' || b.category === filterCat;
        return matchSearch && matchCat;
    });

    const totalBooks    = displayBooks.length;
    const totalCoinsSpent = displayBooks.reduce((sum, b) => sum + (b.price || 0), 0);
    const uniqueCats    = new Set(displayBooks.map(b => b.category).filter(Boolean)).size;

    return (
        <div className="home-page shelf-page">
           <Navbar/>
            {/* ══════════════════ 2. HERO / BREADCRUMB ══════════════════ */}
            <div className="topup-hero">
                <div className="topup-page-inner">
                    <div className="topup-breadcrumb">
                        <span className="topup-breadcrumb-home" onClick={() => navigate('/')}>
                            <i className="fas fa-house" style={{ color: '#999' }}></i>
                        </span>
                        <i className="fas fa-angle-right" style={{ fontSize: 12, color: '#aaa', margin: '0 8px' }}></i>
                        <span className="topup-breadcrumb-cur">ชั้นหนังสือของฉัน</span>
                    </div>
                </div>
            </div>

            {/* ══════════════════ 3. MAIN CONTENT ══════════════════ */}
            <div className="shelf-container">

                {/* ── Stats Bar ── */}
                <div className="shelf-stats">
                    <div className="shelf-stat-card">
                        <div className="shelf-stat-icon red"><i className="fas fa-book"></i></div>
                        <div className="shelf-stat-info">
                            <span className="shelf-stat-num">{totalBooks}</span>
                            <span className="shelf-stat-label">หนังสือทั้งหมด</span>
                        </div>
                    </div>
                    <div className="shelf-stat-card">
                        <div className="shelf-stat-icon blue"><i className="fas fa-layer-group"></i></div>
                        <div className="shelf-stat-info">
                            <span className="shelf-stat-num">{uniqueCats}</span>
                            <span className="shelf-stat-label">หมวดหมู่</span>
                        </div>
                    </div>
                    <div className="shelf-stat-card">
                        <div className="shelf-stat-icon orange"><i className="fas fa-coins"></i></div>
                        <div className="shelf-stat-info">
                            <span className="shelf-stat-num">{totalCoinsSpent.toLocaleString()}</span>
                            <span className="shelf-stat-label">เหรียญที่ใช้ไป</span>
                        </div>
                    </div>
                    <div className="shelf-stat-card">
                        <div className="shelf-stat-icon green"><i className="fas fa-check-circle"></i></div>
                        <div className="shelf-stat-info">
                            <span className="shelf-stat-num">{filteredBooks.length}</span>
                            <span className="shelf-stat-label">กำลังแสดง</span>
                        </div>
                    </div>
                </div>

                {/* ── Top Bar ── */}
                <div className="shelf-topbar">
                    <h2 className="shelf-title">
                        <i className="fas fa-layer-group" style={{ marginRight: '10px', color: 'gray' }}></i>
                        ชั้นหนังสือของฉัน
                    </h2>
                    <div className="shelf-controls">
                        {/* Search */}
                        <div className="shelf-search-wrap">
                            <i className="fas fa-search"></i>
                            <input
                                className="shelf-search"
                                type="text"
                                placeholder="ค้นหาชื่อเรื่อง / ผู้เขียน..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Category Filter */}
                        <select
                            className="shelf-filter-select"
                            value={filterCat}
                            onChange={e => setFilterCat(e.target.value)}
                        >
                            {categories.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>

                        {/* View Toggle */}
                        <div className="shelf-view-toggle">
                            <button
                                className={`shelf-view-btn${viewMode === 'grid' ? ' active' : ''}`}
                                onClick={() => setViewMode('grid')}
                                title="มุมมองตาราง">
                                <i className="fas fa-th"></i>
                            </button>
                            <button
                                className={`shelf-view-btn${viewMode === 'list' ? ' active' : ''}`}
                                onClick={() => setViewMode('list')}
                                title="มุมมองรายการ">
                                <i className="fas fa-list"></i>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Tab สลับหนังสือ ── */}
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', marginTop: '20px' }}>
                    <button 
                        onClick={() => setActiveTab('FULL')}
                        style={{ 
                            padding: '10px 20px', borderRadius: '20px', border: 'none', 
                            background: activeTab === 'FULL' ? '#b5651d' : '#eee', 
                            color: activeTab === 'FULL' ? '#fff' : '#555', 
                            cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s'
                        }}>
                         ซื้อแบบเหมาเล่ม ({fullBooks.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('PARTIAL')}
                        style={{ 
                            padding: '10px 20px', borderRadius: '20px', border: 'none', 
                            background: activeTab === 'PARTIAL' ? '#b5651d' : '#eee', 
                            color: activeTab === 'PARTIAL' ? '#fff' : '#555', 
                            cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s'
                        }}>
                         ซื้อแบบแยกตอน ({partialBooks.length})
                    </button>
                </div>

                {/* ── Content ── */}
                {loading ? (
                    <div className="shelf-loading">
                        <i className="fas fa-spinner"></i>
                        กำลังโหลดชั้นหนังสือ...
                    </div>
                ) : filteredBooks.length === 0 ? (
                    <div className="shelf-empty">
                        <div className="shelf-empty-icon"></div>
                        <p>คุณยังไม่มีหนังสือในหมวดหมู่นี้</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    /* ════ GRID VIEW ════ */
                    <div className="shelf-grid">
                        {filteredBooks.map(book => (
                            <div key={book.id} className="shelf-book-card"
                                onClick={() => navigate(`/read/${book.id}`)}>
                                <div className="shelf-book-cover-wrap">
                                          <img
                                        src={book.image || 'https://via.placeholder.com/175x260?text=No+Cover'}
                                        alt={book.title}
                                        onError={e => { e.target.src = 'https://via.placeholder.com/175x260?text=No+Cover'; }}
                                    />
                                    {book.category && (
                                        <span className="shelf-book-category-badge">{book.category}</span>
                                    )}
                                    <div className="shelf-book-overlay">
                                        <button className="shelf-read-btn"
                                            onClick={e => { e.stopPropagation(); navigate(`/read/${book.id}`); }}>
                                            <i className="fas fa-book-open"></i> อ่านเลย
                                        </button>
                                    </div>
                                </div>
                                <div className="shelf-book-info">
                                    <p className="shelf-book-title">{book.title}</p>
                                    <p className="shelf-book-author">{book.author}</p>
                                    <div className="shelf-book-meta">
                                        <span style={{ color: 'black', fontWeight: 'bold', fontSize: '14px' }}>
                                            {book.price > 0 ? `${book.price.toLocaleString()} เหรียญ` : 'ฟรี'}
                                        </span>
                                        <span className="shelf-book-date">{formatDate(book.purchased_at)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* ════ LIST VIEW ════ */
                    <div className="shelf-list">
                        {filteredBooks.map(book => (
                            <div key={book.id} className="shelf-list-item"
                                onClick={() => navigate(`/read/${book.id}`)}>
                                <img
                                    className="shelf-list-cover"
                                    src={book.image || 'https://via.placeholder.com/65x90?text=N/A'}
                                    alt={book.title}
                                    onError={e => { e.target.src = 'https://via.placeholder.com/65x90?text=N/A'; }}
                                />
                                <div className="shelf-list-info">
                                    <p className="shelf-list-title">{book.title}</p>
                                    <p className="shelf-list-author">
                                        <i className="fas fa-pen-nib" style={{ marginRight: '5px', color: '#aaa' }}></i>
                                        {book.author}
                                    </p>
                                    <div className="shelf-list-tags">
                                        {book.category && <span className="shelf-tag">{book.category}</span>}
                                        <span className="shelf-tag" style={{ background: 'gray', color: 'white' }}>
                                            เป็นเจ้าของ
                                        </span>
                                    </div>
                                    <p className="shelf-list-price">
                                        {book.price > 0 ? `ราคา ${book.price.toLocaleString()} เหรียญ` : 'หนังสือฟรี'}
                                    </p>
                                </div>
                                <span className="shelf-list-date">
                                    ซื้อเมื่อ {formatDate(book.purchased_at)}
                                </span>
                                <button className="shelf-list-read-btn"
                                    onClick={e => { e.stopPropagation(); navigate(`/read/${book.id}`); }}>
                                    <i className="fas fa-book-open"></i> อ่านเลย
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MyShelf;