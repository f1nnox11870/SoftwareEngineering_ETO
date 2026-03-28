import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/cart.css';
import '../assets/Favorites.css';

const MENU_ITEMS = [
    { label: 'นิยาย', subs: ['นิยายรักโรแมนติก','นิยายวาย','นิยายแฟนตาซี','นิยายสืบสวน','นิยายกำลังภายใน','ไลท์โนเวล','วรรณกรรมทั่วไป','นิยายยูริ','กวีนิพนธ์','แฟนเฟิค'] },
    { label: 'การ์ตูน',      subs: [] },
    { label: 'อีบุ๊กทั่วไป', subs: [] },
    { label: 'นิตยสาร',      subs: [] },
    { label: 'หนังสือพิมพ์', subs: [] },
    { label: 'อีบุ๊กจัดชุด', subs: [] },
];
const ROMANCE_SUBS = ['นิยายรักวัยรุ่น','นิยายรักแฟนตาซี','นิยายรักจีนโบราณ','นิยายรักจีนปัจจุบัน','นิยายรักกำลังภายใน','นิยายรักผู้ใหญ่'];

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

function buildNotifications(historyData, topupData) {
    const notifs = [];
    topupData.forEach(t => {
        const icon  = t.status === 'approved' ? '🪙' : t.status === 'rejected' ? '❌' : '⏳';
        const title = t.status === 'approved' ? `เติมเหรียญสำเร็จ +${Number(t.total_coins).toLocaleString()} เหรียญ`
                    : t.status === 'rejected' ? 'คำขอเติมเหรียญถูกปฏิเสธ'
                    : 'คำขอเติมเหรียญรอการตรวจสอบ';
        const desc  = t.status === 'approved' ? `ชำระ ฿${t.amount} — รับ ${Number(t.total_coins).toLocaleString()} เหรียญแล้ว`
                    : t.status === 'rejected' ? (t.note || 'กรุณาติดต่อฝ่ายสนับสนุน')
                    : `แพ็กเกจ ฿${t.amount} — รอแอดมินตรวจสอบ`;
        notifs.push({ id: `topup-${t.id}`, icon, title, desc, time: formatTime(t.created_at), unread: t.status === 'approved' });
    });
    historyData.slice(0, 10).forEach(h => {
        const icon  = h.type === 'book' ? '📚' : h.type === 'topup' ? '🪙' : '📄';
        const title = h.type === 'book' ? 'ซื้อหนังสือสำเร็จ' : h.type === 'topup' ? 'เติมเหรียญสำเร็จ' : 'ปลดล็อกตอนสำเร็จ';
        notifs.push({ id: `hist-${h.id}`, icon, title, desc: h.title, time: formatTime(h.purchased_at), unread: false });
    });
    return notifs.slice(0, 20);
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
    const [megaOpen, setMegaOpen]         = useState(false);
    const [hoveredMenu, setHoveredMenu]   = useState(null);
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

        // Notifications
        Promise.all([
            axios.get('http://localhost:3001/topup/my-requests', { headers }).catch(() => ({ data: [] })),
            axios.get('http://localhost:3001/history', { headers }).catch(() => ({ data: [] })),
        ]).then(([topupRes, histRes]) => setNotifications(buildNotifications(histRes.data, topupRes.data)));

        // Cart count
        axios.get('http://localhost:3001/cart', { headers })
            .then(res => setCartCount(res.data.length))
            .catch(() => {});
    }, [navigate]);

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
    const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    const markOneRead = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));

    const handleLogout = () => { localStorage.clear(); navigate('/'); };

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
        <div className="cart-page">

            {/* ══ NAVBAR ══ */}
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
                                    <div className="mega-menu-inner">
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
                                                <div className="mega-item hovered"><span>นิยายรักโรแมนติก</span><i className="fas fa-chevron-right"></i></div>
                                                {MENU_ITEMS[0].subs.slice(1).map(s => <div key={s} className="mega-item"><span>{s}</span></div>)}
                                            </div>
                                        )}
                                        {hoveredMenu === 'นิยาย' && (
                                            <div className="mega-col">
                                                {ROMANCE_SUBS.map(s => <div key={s} className="mega-item"><span>{s}</span></div>)}
                                            </div>
                                        )}
                                    </div>
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

                                {/* 🔔 Notification จริง */}
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
                                                {notifications.length === 0 ? (
                                                    <div style={{ padding: '24px', textAlign: 'center', color: '#aaa', fontSize: 13 }}>
                                                        ยังไม่มีการแจ้งเตือน
                                                    </div>
                                                ) : notifications.map(n => (
                                                    <div key={n.id} className={`notif-item ${n.unread ? 'unread' : ''}`} onClick={() => markOneRead(n.id)}>
                                                        <div className="notif-icon-wrap">{n.icon}</div>
                                                        <div className="notif-body">
                                                            <div className="notif-item-title">{n.title}</div>
                                                            <div className="notif-item-desc">{n.desc}</div>
                                                            <div className="notif-item-time">{n.time}</div>
                                                        </div>
                                                        {n.unread && <div className="notif-dot"></div>}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="notif-footer" onClick={() => setNotifOpen(false)}>ดูการแจ้งเตือนทั้งหมด</div>
                                        </div>
                                    )}
                                </div>

                                {/* ❤️ Favorites — active indicator */}
                                <button className="nav-icon-btn pos-rel" onClick={() => navigate('/favorites')}>
                                    <i className="fas fa-heart" style={{ color: '#ff4e63' }}></i>
                                    {favorites.length > 0 && <span className="nbadge red">{favorites.length}</span>}
                                </button>
                                <button className="nav-icon-btn pos-rel" onClick={() => navigate('/cart')}>
                                    <i className="fas fa-shopping-cart"></i>
                                    {cartCount > 0 && <span className="nbadge red">{cartCount}</span>}
                                </button>

                                <div className="profile-wrap" ref={profileRef}>
                                    <button className="nav-user-btn" onClick={() => setProfileOpen(v => !v)}>
                                        {profileImage
                                            ? <img src={profileImage} alt="avatar" className="nav-avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                                            : <i className="fas fa-user-circle nav-avatar"></i>
                                        }
                                        <div className="nav-user-info">
                                            <span className="nav-username">{username}</span>
                                        </div>
                                    </button>
                                    {profileOpen && (
                                        <div className="profile-dropdown">
                                            <div className="pd-header">
                                                {profileImage
                                                    ? <img src={profileImage} alt="avatar" className="pd-avatar-icon" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                                                    : <i className="fas fa-user-circle pd-avatar-icon"></i>
                                                }
                                                <div><div className="pd-name">{username}</div></div>
                                            </div>
                                            <div className="pd-divider"></div>
                                            {coins !== null && (
                                                <>
                                                    <div className="pd-coins-row">
                                                        <div className="pd-coins-label">
                                                            <i className="fas fa-coins pd-coins-icon"></i>
                                                            <span>เหรียญของฉัน</span>
                                                        </div>
                                                        <span className="pd-coins-value">{coins.toLocaleString()}</span>
                                                    </div>
                                                    <div className="pd-divider"></div>
                                                </>
                                            )}
                                            <div className="pd-group-title">การใช้งาน</div>
                                            <div className="pd-item" onClick={() => navigate('/myshelf')}><i className="fas fa-layer-group"></i> ชั้นหนังสือ</div>
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

            {/* ══ HERO / BREADCRUMB ══ */}
            <div className="topup-hero">
                <div className="topup-page-inner">
                    <div className="topup-breadcrumb">
                        <span className="topup-breadcrumb-home" onClick={() => navigate('/')}>
                            <i className="fas fa-house"></i>
                        </span>
                        <i className="fas fa-angle-right" style={{ fontSize: 12 }}></i>
                        <span className="topup-breadcrumb-cur">รายการโปรด</span>
                    </div>
                </div>
            </div>

            {/* ══ MAIN CONTENT ══ */}
            <div className="cart-container">
                <h2 className="cart-title" style={{ borderColor: '#ff4e63' }}>
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