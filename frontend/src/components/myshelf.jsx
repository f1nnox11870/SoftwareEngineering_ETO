import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../assets/myshelf.css';

const MENU_ITEMS = [
    { label: 'นิยาย',        subs: ['นิยายรักโรแมนติก','นิยายวาย','นิยายแฟนตาซี','นิยายสืบสวน','นิยายกำลังภายใน','ไลท์โนเวล','วรรณกรรมทั่วไป','นิยายยูริ','กวีนิพนธ์','แฟนเฟิค'] },
    { label: 'การ์ตูน',      subs: [] },
    { label: 'อีบุ๊กทั่วไป', subs: [] },
    { label: 'นิตยสาร',      subs: [] },
    { label: 'หนังสือพิมพ์', subs: [] },
    { label: 'อีบุ๊กจัดชุด', subs: [] },
];

const MOCK_NOTIFICATIONS = [
    { id: 1, icon: '🪙', title: 'เติมเหรียญสำเร็จ',   desc: 'คุณได้รับ 150 เหรียญเรียบร้อยแล้ว',           time: '5 นาทีที่แล้ว',    unread: true  },
    { id: 2, icon: '🔥', title: 'โปรโมชั่นพิเศษ!',    desc: 'ซื้อเหรียญวันนี้รับโบนัสพิเศษสูงสุด 30%',     time: '1 ชั่วโมงที่แล้ว', unread: true  },
    { id: 3, icon: '📚', title: 'หนังสือใหม่มาแล้ว',  desc: 'Record of Ragnarok เล่ม 12 วางจำหน่ายแล้ว',  time: '3 ชั่วโมงที่แล้ว', unread: false },
    { id: 4, icon: '🎉', title: 'ยินดีต้อนรับ!',       desc: 'สมัครสมาชิกสำเร็จ รับเหรียญฟรี 20 เหรียญ',   time: 'เมื่อวาน',          unread: false },
    { id: 5, icon: '💳', title: 'ประวัติการซื้อ',      desc: 'คุณซื้อ "นิยายรักสุดขอบฟ้า" เรียบร้อยแล้ว', time: '2 วันที่แล้ว',      unread: false },
];

// ── ฟอร์แมตวันที่ ──
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
};

function MyShelf() {
    const navigate = useNavigate();

    // ── Auth / UI ──
    const [isLoggedIn, setIsLoggedIn]     = useState(false);
    const [username, setUsername]         = useState('');
    const [role, setRole]                 = useState(null);
    const [profileImage, setProfileImage] = useState(null);
    const [coins, setCoins]               = useState(null);
    const [cartCount, setCartCount]       = useState(0);
    const [megaOpen, setMegaOpen]         = useState(false);
    const [hoveredMenu, setHoveredMenu]   = useState(null);
    const [profileOpen, setProfileOpen]   = useState(false);
    const [notifOpen, setNotifOpen]       = useState(false);
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

    // ── Shelf ──
    const [books, setBooks]       = useState([]);
    const [loading, setLoading]   = useState(true);
    const [viewMode, setViewMode] = useState('grid');   // 'grid' | 'list'
    const [search, setSearch]     = useState('');
    const [filterCat, setFilterCat] = useState('ทั้งหมด');
    const [categories, setCategories] = useState(['ทั้งหมด']);

    const megaRef    = useRef(null);
    const profileRef = useRef(null);
    const notifRef   = useRef(null);
    const coinInterval = useRef(null);

    // ══════════════════════════════════════════
    //  Fetch: หนังสือในชั้น
    // ══════════════════════════════════════════
    const fetchShelf = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:3001/library', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data || [];
            setBooks(data);
            // สร้าง category list ไดนามิค
            const cats = ['ทั้งหมด', ...new Set(data.map(b => b.category).filter(Boolean))];
            setCategories(cats);
        } catch (err) {
            console.error('Fetch shelf error:', err);
        } finally {
            setLoading(false);
        }
    };

    // ══════════════════════════════════════════
    //  Fetch: เหรียญ + รูปโปรไฟล์
    // ══════════════════════════════════════════
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
            } catch {
                setCoins(0);
            }
        };
        if (isLoggedIn) {
            fetchCoins();
            coinInterval.current = setInterval(fetchCoins, 30000);
            return () => clearInterval(coinInterval.current);
        } else {
            setCoins(null);
            clearInterval(coinInterval.current);
        }
        return () => clearInterval(coinInterval.current);
    }, [isLoggedIn]);

    // ══════════════════════════════════════════
    //  Fetch: จำนวนตะกร้า
    // ══════════════════════════════════════════
    const fetchCartCount = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await axios.get('http://localhost:3001/cart', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCartCount(res.data.length);
        } catch { /* ignore */ }
    };

    // ══════════════════════════════════════════
    //  Init
    // ══════════════════════════════════════════
    useEffect(() => {
        const token    = localStorage.getItem('token');
        const user     = localStorage.getItem('username');
        const savedRole = localStorage.getItem('role');
        if (token) {
            setIsLoggedIn(true);
            if (user) setUsername(user);
            if (savedRole) setRole(savedRole);
            fetchShelf();
            fetchCartCount();
        } else {
            navigate('/');
        }
    }, [navigate]);

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

    // ── Notification helpers ──
    const unreadCount  = notifications.filter(n => n.unread).length;
    const markAllRead  = () => setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    const markOneRead  = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));

    // ── Logout ──
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
    const filteredBooks = books.filter(b => {
        const matchSearch = b.title?.toLowerCase().includes(search.toLowerCase()) ||
                            b.author?.toLowerCase().includes(search.toLowerCase());
        const matchCat    = filterCat === 'ทั้งหมด' || b.category === filterCat;
        return matchSearch && matchCat;
    });

    // ── นับ stats ──
    const totalBooks    = books.length;
    const totalCoinsSpent = books.reduce((sum, b) => sum + (b.price || 0), 0);
    const uniqueCats    = new Set(books.map(b => b.category).filter(Boolean)).size;

    return (
        <div className="shelf-page">
            {/* ═════════ 1. NAVBAR (เหมือน Home.jsx) ═════════ */}
            <header className="navbar">
                <div className="navbar-inner">

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
                                        <div className="mega-col">
                                            <div className="mega-item hovered">
                                                <span>นิยายรักโรแมนติก</span>
                                                <i className="fas fa-chevron-right"></i>
                                            </div>
                                            {MENU_ITEMS[0].subs.slice(1).map(s => (
                                                <div key={s} className="mega-item"><span>{s}</span></div>
                                            ))}
                                        </div>
                                    )}
                                    {hoveredMenu === 'นิยาย' && (
                                        <div className="mega-col">
                                            {ROMANCE_SUBS.map(s => (
                                                <div key={s} className="mega-item"><span>{s}</span></div>
                                            ))}
                                        </div>
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
                                    <button
                                        className="btn-admin"
                                        onClick={() => navigate('/admin')}
                                    >
                                        จัดการเนื้อหา
                                    </button>
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
                                                {unreadCount > 0 && (
                                                    <button className="notif-markall" onClick={markAllRead}>อ่านทั้งหมด</button>
                                                )}
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
                                <button
                                    className="nav-icon-btn pos-rel"
                                    onClick={() => navigate('/favorites')}
                                >
                                    <i className="fas fa-heart"></i>
                                    <span className="nbadge red">1</span>
                                </button>
                                <button className="nav-icon-btn pos-rel" onClick={() => navigate('/cart')}>
                                    <i className="fas fa-shopping-cart"></i>
                                    {cartCount > 0 && <span className="nbadge red">{cartCount}</span>}
                                </button>
                                <div className="profile-wrap" ref={profileRef}>
                                    <button className="nav-user-btn" onClick={() => setProfileOpen(v => !v)}>
                                        {profileImage ? (
                                            <img src={profileImage} alt="Profile" className="nav-avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
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
                                                    <img src={profileImage} alt="Profile" className="pd-avatar-icon" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                                ) : (
                                                    <i className="fas fa-user-circle pd-avatar-icon"></i>
                                                )}
                                                <div>
                                                    <div className="pd-name">{username}</div>
                                                </div>
                                            </div>
                                            {coins !== null && (
                                                <>
                                                    <div className="pd-divider"></div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', alignItems: 'center' }}>
                                                        <div style={{ color: '#555', fontWeight: 'bold' }}>
                                                            <i className="fas fa-coins" style={{ color: '#f1c40f', marginRight: '8px' }}></i>
                                                            <span>เหรียญของฉัน</span>
                                                        </div>
                                                        <span style={{ color: '#ff4e63', fontWeight: 'bold', fontSize: '16px' }}>
                                                            {coins.toLocaleString()} 🪙
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                            <div className="pd-divider"></div>
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
                        ) : (
                            <>
                                <button className="btn-login" onClick={() => navigate('/')}>เข้าสู่ระบบ</button>
                                <button className="btn-register" onClick={() => navigate('/')}>สมัครสมาชิก</button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* ══════════════════ HERO / BREADCRUMB ══════════════════ */}
            <div className="shelf-hero">
                <div className="shelf-page-inner">
                    <div className="shelf-breadcrumb">
                        <span className="shelf-breadcrumb-home" onClick={() => navigate('/')}>
                            <i className="fas fa-house"></i>
                        </span>
                        <i className="fas fa-angle-right" style={{ fontSize: 12 }}></i>
                        <span className="shelf-breadcrumb-cur">ชั้นหนังสือของฉัน</span>
                    </div>
                </div>
            </div>

            {/* ══════════════════ MAIN CONTENT ══════════════════ */}
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
                        <i className="fas fa-layer-group" style={{ marginRight: '10px', color: '#ff4e63' }}></i>
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

                {/* ── Content ── */}
                {loading ? (
                    <div className="shelf-loading">
                        <i className="fas fa-spinner"></i>
                        กำลังโหลดชั้นหนังสือ...
                    </div>
                ) : filteredBooks.length === 0 ? (
                    <div className="shelf-empty">
                        <div className="shelf-empty-icon">📚</div>
                        {books.length === 0 ? (
                            <>
                                <p>ยังไม่มีหนังสือในชั้น ไปเลือกซื้อกันเลย!</p>
                                <button className="shelf-empty-btn" onClick={() => navigate('/')}>
                                    <i className="fas fa-store" style={{ marginRight: '8px' }}></i>
                                    ไปเลือกซื้อหนังสือ
                                </button>
                            </>
                        ) : (
                            <p>ไม่พบหนังสือที่ค้นหา ลองเปลี่ยนคำค้นหาดูนะ</p>
                        )}
                    </div>
                ) : viewMode === 'grid' ? (
                    /* ════ GRID VIEW ════ */
                    <div className="shelf-grid">
                        {filteredBooks.map(book => (
                            <div key={book.id} className="shelf-book-card"
                                onClick={() => navigate(`/book/${book.id}`)}>
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
                                            onClick={e => { e.stopPropagation(); navigate(`/book/${book.id}`); }}>
                                            <i className="fas fa-book-open"></i> อ่านเลย
                                        </button>
                                    </div>
                                </div>
                                <div className="shelf-book-info">
                                    <p className="shelf-book-title">{book.title}</p>
                                    <p className="shelf-book-author">{book.author}</p>
                                    <div className="shelf-book-meta">
                                        <span style={{ color: '#ff4e63', fontWeight: 600, fontSize: '12px' }}>
                                            {book.price > 0 ? `${book.price.toLocaleString()} 🪙` : 'ฟรี'}
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
                                onClick={() => navigate(`/book/${book.id}`)}>
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
                                        <span className="shelf-tag" style={{ background: '#f0fff4', color: '#2ecc71' }}>
                                            <i className="fas fa-check" style={{ marginRight: '3px' }}></i>เป็นเจ้าของ
                                        </span>
                                    </div>
                                    <p className="shelf-list-price">
                                        {book.price > 0 ? `ราคา ${book.price.toLocaleString()} 🪙` : 'หนังสือฟรี'}
                                    </p>
                                </div>
                                <span className="shelf-list-date">
                                    ซื้อเมื่อ {formatDate(book.purchased_at)}
                                </span>
                                <button className="shelf-list-read-btn"
                                    onClick={e => { e.stopPropagation(); navigate(`/book/${book.id}`); }}>
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