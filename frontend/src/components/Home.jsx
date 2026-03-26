import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/style.css';
import Login from './login';
import Register from './Register';

const TABS = ['แนะนำ', 'โปรโมชั่น', 'จัดชุด', 'นิยาย', 'การ์ตูน', 'อีบุ๊กทั่วไป', 'ข่าว/นิตยสาร', 'เร็วๆ นี้'];

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
    { id: 1, icon: '🪙', title: 'เติมเหรียญสำเร็จ',   desc: 'คุณได้รับ 150 เหรียญเรียบร้อยแล้ว',           time: '5 นาทีที่แล้ว',    unread: true  },
    { id: 2, icon: '🔥', title: 'โปรโมชั่นพิเศษ!',    desc: 'ซื้อเหรียญวันนี้รับโบนัสพิเศษสูงสุด 30%',     time: '1 ชั่วโมงที่แล้ว', unread: true  },
    { id: 3, icon: '📚', title: 'หนังสือใหม่มาแล้ว',  desc: 'Record of Ragnarok เล่ม 12 วางจำหน่ายแล้ว',  time: '3 ชั่วโมงที่แล้ว', unread: false },
    { id: 4, icon: '🎉', title: 'ยินดีต้อนรับ!',       desc: 'สมัครสมาชิกสำเร็จ รับเหรียญฟรี 20 เหรียญ',   time: 'เมื่อวาน',          unread: false },
    { id: 5, icon: '💳', title: 'ประวัติการซื้อ',      desc: 'คุณซื้อ "นิยายรักสุดขอบฟ้า" เรียบร้อยแล้ว', time: '2 วันที่แล้ว',      unread: false },
];

// 5 banner slides
const BANNERS = [
    { bg: '#c9d6df', label: 'Banner 1' },
    { bg: '#e2c9d6', label: 'Banner 2' },
    { bg: '#c9e2d6', label: 'Banner 3' },
    { bg: '#d6c9e2', label: 'Banner 4' },
    { bg: '#e2d6c9', label: 'Banner 5' },
];

const MOCK_MANGA = Array(10).fill(null).map((_, i) => ({
    id: i + 1,
    title: 'Record of Ragnarok',
    subtitle: 'มหาศึกเทพเจ้าชนมนุษย์ เล่ม ' + (i + 1),
    author: 'ผู้เขียน: นักเขียน',
    publisher: 'สำนักพิมพ์: PHOENIX Next',
    category: 'มังงะ',
    rating: 5.0,
    price: '120.00',
    originalPrice: null,
}));

const MOCK_NOVELS = Array(10).fill(null).map((_, i) => ({
    id: i + 1,
    title: 'นิยายรักสุดขอบฟ้า',
    subtitle: 'ความรักที่ไม่มีวันลืม เล่ม ' + (i + 1),
    author: 'ผู้เขียน: นักเขียน',
    publisher: 'สำนักพิมพ์: สยามอินเตอร์',
    category: 'นิยายวาย',
    rating: 5.0,
    price: '359.00',
    originalPrice: i % 3 === 0 ? '423.00' : null,
}));

// ── BookCard ──────────────────────────────────────────
function BookCard({ book, isLoggedIn }) {
    const [fav, setFav] = useState(false);
    return (
        <div className="bcard">
            <div className="bcard-cover">
                {/* placeholder cover */}
                <div className="bcard-img-placeholder">
                    <i className="fas fa-image"></i>
                    {book.subtitle.includes('เล่ม 1') && (
                        <span className="bcard-vol-badge">เล่ม 1</span>
                    )}
                </div>
                {isLoggedIn && (
                    <button
                        className={`bcard-fav ${fav ? 'active' : ''}`}
                        onClick={e => { e.stopPropagation(); setFav(v => !v); }}
                    >
                        <i className={fav ? 'fas fa-heart' : 'far fa-heart'}></i>
                    </button>
                )}
            </div>
            <div className="bcard-info">
                <div className="bcard-title">{book.title}</div>
                <div className="bcard-sub">{book.subtitle}</div>
                <div className="bcard-meta">{book.author}</div>
                <div className="bcard-meta">{book.publisher}</div>
                <div className="bcard-cat">{book.category}</div>
                <div className="bcard-rating">
                    <i className="fas fa-star"></i> {book.rating.toFixed(1)}
                </div>
                <div className="bcard-price-row">
                    <span className="bcard-price">{book.price} บาท</span>
                    {book.originalPrice && <span className="bcard-orig">{book.originalPrice}</span>}
                    {isLoggedIn && (
                        <button className="bcard-cart" onClick={e => e.stopPropagation()}>
                            <i className="fas fa-shopping-cart"></i>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── BookRow ───────────────────────────────────────────
function BookRow({ title, books, isLoggedIn, showSeeAll = true }) {
    const rowRef = useRef(null);
    const scroll = (dir) => {
        if (rowRef.current) rowRef.current.scrollBy({ left: dir * 700, behavior: 'smooth' });
    };
    return (
        <section className="brow-section">
            <div className="brow-header">
                <h2 className="brow-title">{title}</h2>
                {showSeeAll && <a href="#" className="brow-seeall">ดูทั้งหมด</a>}
            </div>
            <div className="brow-wrap">
                <button className="brow-arrow left" onClick={() => scroll(-1)}>
                    <i className="fas fa-chevron-left"></i>
                </button>
                <div className="brow-track" ref={rowRef}>
                    {books.map(book => (
                        <BookCard key={book.id} book={book} isLoggedIn={isLoggedIn} />
                    ))}
                </div>
                <button className="brow-arrow right" onClick={() => scroll(1)}>
                    <i className="fas fa-chevron-right"></i>
                </button>
            </div>
        </section>
    );
}

// ── Home ──────────────────────────────────────────────
function Home() {
    const navigate = useNavigate();
    const [username, setUsername]       = useState('');
    const [isLoggedIn, setIsLoggedIn]   = useState(false);
    const [role, setRole] = useState(null);


    const [modal, setModal]             = useState(null);
    const [activeTab, setActiveTab]     = useState('แนะนำ');
    const [megaOpen, setMegaOpen]       = useState(false);
    const [hoveredMenu, setHoveredMenu] = useState(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [bannerIdx, setBannerIdx]     = useState(0);
    const [coins, setCoins]             = useState(null);
    const [notifOpen, setNotifOpen]           = useState(false);
    const [notifications, setNotifications]   = useState(MOCK_NOTIFICATIONS);

    const megaRef    = useRef(null);
    const profileRef = useRef(null);
    const bannerRef  = useRef(null);
    const notifRef   = useRef(null);
    const coinInterval = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const user  = localStorage.getItem('username');
        if (token) { setIsLoggedIn(true); if (user) setUsername(user); }
    }, []);

    // Fetch coins จาก API และ poll ทุก 30 วินาที (real-time)
    useEffect(() => {
        const fetchCoins = async () => {
            const token = localStorage.getItem('token');
            const role = localStorage.getItem('role');

            if (token) {
                setIsLoggedIn(true);
                setRole(role);
            }
            if (!token) return;
            try {
                const res = await axios.get('http://localhost:3001/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCoins(res.data.coins ?? 0);
            } catch {
                // ถ้า API ยังไม่มี field coins ให้แสดง 0
                setCoins(0);
            }
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

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        setIsLoggedIn(false); setUsername(''); setProfileOpen(false); setCoins(null);
    };
    const handleLoginSuccess = (name) => {
        setIsLoggedIn(true); setUsername(name); setModal(null);
    };

    // Banner: scroll to exact slide position
    const goSlide = (idx) => {
        const next = Math.max(0, Math.min(BANNERS.length - 1, idx));
        setBannerIdx(next);
        if (bannerRef.current) {
            // each slide = 1/3 of visible width (we show 3 at a time)
            const slideW = bannerRef.current.scrollWidth / BANNERS.length;
            bannerRef.current.scrollTo({ left: next * slideW, behavior: 'smooth' });
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target.classList.contains('modal-overlay')) setModal(null);
    };

    return (
        <div className="home-page">

            {/* ══ NAVBAR ══ */}
            <header className="navbar">
                <div className="navbar-inner">

                <div className="nav-left">
                    {/* Logo icon only */}
                    <div className="nav-logo">
                        <div className="nav-logo-box">
                            <i className="fas fa-book-open"></i>
                        </div>
                    </div>

                    {/* Hamburger */}
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

                {/* Search — Center */}
                <div className="nav-center">
                    <div className="nav-search">
                        <input type="text" placeholder="วันนี้อ่านอะไรดี?" />
                        <button><i className="fas fa-search"></i></button>
                    </div>
                </div>

                {/* Right */}
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
                                <button className="nav-icon-btn pos-rel">
                                    <i className="fas fa-heart"></i>
                                    <span className="nbadge red">1</span>
                                </button>
                                <button className="nav-icon-btn pos-rel">
                                    <i className="fas fa-shopping-cart"></i>
                                    <span className="nbadge red">1</span>
                                </button>
                                <div className="profile-wrap" ref={profileRef}>
                                    <button className="nav-user-btn" onClick={() => setProfileOpen(v => !v)}>
                                        <i className="fas fa-user-circle nav-avatar"></i>
                                        <div className="nav-user-info">
                                            <span className="nav-username">{username}</span>
                                           
                                        </div>
                                    </button>
                                    {profileOpen && (
                                        <div className="profile-dropdown">
                                            <div className="pd-header">
                                                <i className="fas fa-user-circle pd-avatar-icon"></i>
                                                <div>
                                                    <div className="pd-name">{username}</div>
                                                    <div className="pd-sub">{username}</div>
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
                                            <div className="pd-item"><i className="fas fa-history"></i> ประวัติซื้อ</div>
                                            <div className="pd-item" onClick={() => navigate('/topup')}><i className="fas fa-coins"></i> ซื้อเหรียญ</div>
                                            <div className="pd-divider"></div>
                                            <div className="pd-item"><i className="fas fa-cog"></i> ตั้งค่าบัญชี</div>
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
                                <button className="btn-login"    onClick={() => setModal('login')}>เข้าสู่ระบบ</button>
                                <button className="btn-register" onClick={() => setModal('register')}>สมัครสมาชิก</button>
                            </>
                        )}
                    </div>
                </div>

            </header>

            {/* ══ SUB-TABS BAR ══ */}
            <div className="sub-tabs">
                <div className="sub-tabs-inner">
                    {TABS.map(tab => (
                        <button key={tab}
                            className={`sub-tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}>
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* ══ HERO BANNER ══ */}
            <section className="banner-section">
                <div className="banner-viewport">
                    <button
                        className="banner-arrow left"
                        onClick={() => goSlide(bannerIdx - 1)}
                        disabled={bannerIdx === 0}
                    >
                        <i className="fas fa-chevron-left"></i>
                    </button>

                    <div className="banner-track" ref={bannerRef}>
                        {BANNERS.map((b, i) => (
                            <div
                                key={i}
                                className="banner-slide"
                                style={{ background: b.bg }}
                            >
                                <i className="fas fa-image"></i>
                                <span>{b.label}</span>
                            </div>
                        ))}
                    </div>

                    <button
                        className="banner-arrow right"
                        onClick={() => goSlide(bannerIdx + 1)}
                        disabled={bannerIdx >= BANNERS.length - 1}
                    >
                        <i className="fas fa-chevron-right"></i>
                    </button>
                </div>

                <div className="banner-dots">
                    {BANNERS.map((_, i) => (
                        <span
                            key={i}
                            className={`bdot ${i === bannerIdx ? 'active' : ''}`}
                            onClick={() => goSlide(i)}
                        />
                    ))}
                </div>
            </section>

            {/* ══ BOOK ROWS ══ */}
            <BookRow title="มังงะ"  books={MOCK_MANGA}  isLoggedIn={isLoggedIn} />
            <BookRow title="นิยาย" books={MOCK_NOVELS} isLoggedIn={isLoggedIn} />

            {/* ══ MODAL ══ */}
            {modal && (
                <div className="modal-overlay" onClick={handleOverlayClick}>
                    {modal === 'login' && (
                        <Login
                            onClose={() => setModal(null)}
                            onSwitch={() => setModal('register')}
                            onLoginSuccess={handleLoginSuccess}
                        />
                    )}
                    {modal === 'register' && (
                        <Register
                            onClose={() => setModal(null)}
                            onSwitch={() => setModal('login')}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

export default Home;