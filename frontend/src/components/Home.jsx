import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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

const BANNERS = [
    { bg: '#c9d6df', label: 'Banner 1' },
    { bg: '#e2c9d6', label: 'Banner 2' },
    { bg: '#c9e2d6', label: 'Banner 3' },
    { bg: '#d6c9e2', label: 'Banner 4' },
    { bg: '#e2d6c9', label: 'Banner 5' },
];

// ── BookCard ──────────────────────────────────────────
function BookCard({ book, isLoggedIn, onView,onAddToCart }) {
    const [fav, setFav] = useState(false);
    return (
        <div className="bcard" style={{ background: 'none', border: 'none', padding: '0' }}>
            
            {/* --- ส่วนที่ 1: รูปภาพและปุ่ม Hover --- */}
            <div className="bcard-cover" style={{ height: '230px', position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
                <div className="bcard-img-placeholder" style={{ padding: 0, width: '100%', height: '100%' }}>
                    {book.image ? (
                        <img src={book.image} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eee' }}>
                            <i className="fas fa-image" style={{ fontSize: '40px', color: '#ccc' }}></i>
                        </div>
                    )}
                    
                    {book.subtitle && book.subtitle.includes('เล่ม 1') && (
                        <span className="bcard-vol-badge">เล่ม 1</span>
                    )}
                </div>

                {isLoggedIn && (
                    <button
                        className={`bcard-fav ${fav ? 'active' : ''}`}
                        style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}
                        onClick={e => { e.stopPropagation(); setFav(v => !v); }}
                    >
                        <i className={fav ? 'fas fa-heart' : 'far fa-heart'}></i>
                    </button>
                )}

                <div className="bcard-info">
                    <div className="bcard-price-row" style={{ justifyContent: 'center', width: '100%' }}>
                        {isLoggedIn && (
                            <button className="bcard-cart" onClick={e => { e.stopPropagation(); onAddToCart(book.id); }} style={{ width: '40px', height: '40px', borderRadius: '50%' }}>
                                <i className="fas fa-shopping-cart"></i>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* --- ส่วนที่ 2: รายละเอียดใต้รูปภาพ (แสดงตลอดเวลา) --- */}
            <div className="bcard-details" style={{ 
                marginTop: '10px', 
                textAlign: 'left',
                background: '#fff',
                padding: '10px',
                borderRadius: '8px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
            }}>
                <div className="bcard-title" title={book.title} style={{ 
                    fontSize: '14px', 
                    fontWeight: 'bold', 
                    color: '#333',
                    marginBottom: '4px',
                    display: '-webkit-box',
                    WebkitLineClamp: '2',
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: '1.2',
                    height: '34px' 
                }}>
                    {book.title}
                </div>

                <div className="bcard-category" style={{ 
                    fontSize: '11px', 
                    color: '#fff', 
                    background: '#ff4e63', 
                    display: 'inline-block', 
                    padding: '2px 8px', 
                    borderRadius: '10px', 
                    marginBottom: '6px' 
                }}>
                    {book.category || 'ไม่ระบุหมวดหมู่'}
                </div>
                
                <div className="bcard-author" style={{ 
                    fontSize: '12px', 
                    color: '#888', 
                    marginBottom: '8px', 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis' 
                }}>
                    <strong style={{ color: '#555' }}>Author: </strong>
                    {book.author || 'ไม่ระบุชื่อผู้แต่ง'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="bcard-price-bottom" style={{ fontSize: '14px', fontWeight: 'bold', color: '#ff4e63' }}>
                        {book.price === 0 || book.price === '0' || book.price === '0.00' ? 'ฟรี' : `฿ ${book.price}`}
                    </div>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); onView(book); }}
                        style={{ 
                            background: '#333', color: '#fff', border: 'none', 
                            padding: '4px 10px', borderRadius: '4px', fontSize: '12px', 
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' 
                        }}
                    >
                        <i className="fas fa-eye"></i> View
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── BookRow ───────────────────────────────────────────
function BookRow({ title, books, isLoggedIn, showSeeAll = true, onView,onAddToCart }) {
    const rowRef = useRef(null);
    const scroll = (dir) => {
        if (rowRef.current) rowRef.current.scrollBy({ left: dir * 700, behavior: 'smooth' });
    };

    if (!books || books.length === 0) return null;

    {books.map(book => (
        <BookCard key={book.id} book={book} isLoggedIn={isLoggedIn} onView={onView} onAddToCart={onAddToCart} />
    ))}
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
                        <BookCard key={book.id} book={book} isLoggedIn={isLoggedIn} onView={onView} />
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
    
    // State สำหรับข้อมูลหนังสือและหน้าต่าง View
    const [books, setBooks] = useState([]);
    const [viewBook, setViewBook] = useState(null); // เก็บหนังสือที่ถูกกด View
    const [cartCount, setCartCount] = useState(0);

    const fetchCartCount = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await axios.get('http://localhost:3001/cart', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCartCount(res.data.length); 
        } catch (err) {
            console.error("Error fetching cart:", err);
        }
    };

    const addToCart = async (bookId) => {
    const token = localStorage.getItem('token');
    if (!token) {
        alert("กรุณาเข้าสู่ระบบก่อนครับ");
        return;
    }

    try {
        await axios.post('http://localhost:3001/cart/add', 
            { book_id: bookId }, 
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        //นับเรียลไทม์ cart
        setCartCount(prev => prev + 1); 
        
        setViewBook(null); // ปิดหน้าต่าง
        alert("เพิ่มลงตะกร้าเรียบร้อยแล้ว!");

    } catch (err) {
        // ให้มัน log ออกมาใน Console ด้วย จะได้ตามสืบง่าย
        console.error("Cart Add Error:", err); 

        if (err.response) {
            // ถ้าระบบตอบกลับมา
            if (err.response.status === 400) {
                alert("หนังสือเล่มนี้อยู่ในตะกร้าแล้วครับ");
            } else if (err.response.status === 401 || err.response.status === 403) {
                alert("เซสชันหมดอายุ กรุณาล็อกอินใหม่อีกครั้งครับ");
                localStorage.clear(); // ล้างข้อมูลที่หมดอายุ
                window.location.reload(); // รีเฟรชหน้าต่างเพื่อให้ไปล็อกอินใหม่
            } else {
                alert(`Backend ฟ้องว่า: ${err.response.data.message || 'Error ' + err.response.status}`);
            }
        } else {
            // ถ้าเซิร์ฟเวอร์ไม่ตอบสนองเลย (เช่น ลืมรัน node)
            alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (อย่าลืมเช็กว่ารัน node server.js อยู่ไหม)");
        }
    }
};
    
    const [username, setUsername]       = useState('');
    const [isLoggedIn, setIsLoggedIn]   = useState(false);
    const [role, setRole] = useState(null);
    const [profileImage, setProfileImage] = useState(null);

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

    // ดึงข้อมูลหนังสือทั้งหมดจาก Database
    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const res = await axios.get('http://localhost:3001/books');
                setBooks(res.data);
            } catch (err) {
                console.error("Error fetching books:", err);
            }
        };
        fetchBooks();
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const user  = localStorage.getItem('username');
        if (token) { setIsLoggedIn(true); if (user) setUsername(user)
            fetchCartCount();; }
    }, []);

    // Fetch coins
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

    const goSlide = (idx) => {
        const next = Math.max(0, Math.min(BANNERS.length - 1, idx));
        setBannerIdx(next);
        if (bannerRef.current) {
            const slideW = bannerRef.current.scrollWidth / BANNERS.length;
            bannerRef.current.scrollTo({ left: next * slideW, behavior: 'smooth' });
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target.classList.contains('modal-overlay')) setModal(null);
    };

    // กรองหนังสือ
    const mangaBooks = books.filter(b => b.category === 'มังงะ' || b.category === 'การ์ตูน');
    const novelBooks = books.filter(b => b.category === 'นิยาย' || b.category?.includes('นิยาย'));

    return (
        <div className="home-page">

            {/* ══ NAVBAR ══ */}
            <header className="navbar">
                <div className="navbar-inner">

                <div className="nav-left">
                    <div className="nav-logo" onClick={() => navigate('/')} style={{cursor:'pointer'}}>
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
                                <button className="nav-icon-btn pos-rel" onClick={() => navigate('/cart')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', position: 'relative', color: '#333' }}>
                                    <i className="fas fa-shopping-cart"></i>
                                    {cartCount > 0 && <span className="nbadge red" style={{ position: 'absolute', top: '-5px', right: '-8px', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '50%', border: '2px solid #fff' }}>{cartCount}</span>}
                                </button>
                                <div className="profile-wrap" ref={profileRef}>
                                    <button className="nav-user-btn" onClick={() => setProfileOpen(v => !v)}>
                                        {/* 👈 เปลี่ยนจากไอคอน <i> ธรรมดา เป็นเงื่อนไขเช็ครูป */}
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
                                            
                                            {/* 🔻 ส่วนที่เพิ่มเข้ามา: แสดงเหรียญ 🔻 */}
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
                                            {/* 🔺 สิ้นสุดส่วนแสดงเหรียญ 🔺 */}

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

            {/* ══ BOOK ROWS (ส่ง onView เข้าไปด้วย) ══ */}
            <BookRow title="มังงะ&การ์ตูน" books={mangaBooks} isLoggedIn={isLoggedIn} onView={setViewBook} onAddToCart={addToCart} />
            <BookRow title="นิยาย" books={novelBooks} isLoggedIn={isLoggedIn} onView={setViewBook} onAddToCart={addToCart} />
            
            {books.length === 0 && (
                <div style={{ textAlign: 'center', padding: '50px 0', color: '#888' }}>
                    กำลังโหลดข้อมูลหนังสือ หรือ ยังไม่มีหนังสือในระบบ...
                </div>
            )}

            {/* ══ MODAL เข้าสู่ระบบ / สมัครสมาชิก ══ */}
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

            {/* ══ MODAL สำหรับดูรายละเอียดหนังสือ (View Description) ══ */}
            {viewBook && (
                <div className="modal-overlay" onClick={() => setViewBook(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', padding: '25px', borderRadius: '12px', maxWidth: '550px', width: '90%', position: 'relative', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        
                        <button onClick={() => setViewBook(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>
                            <i className="fas fa-times"></i>
                        </button>
                        
                        <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                            <img src={viewBook.image || 'https://via.placeholder.com/150'} alt={viewBook.title} style={{ width: '130px', height: '190px', objectFit: 'cover', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }} />
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: '0 0 10px 0', color: '#222', fontSize: '20px', lineHeight: '1.3' }}>{viewBook.title}</h3>
                                <div style={{ fontSize: '14px', color: '#666', marginBottom: '6px' }}><strong>ผู้แต่ง:</strong> {viewBook.author || 'ไม่ระบุ'}</div>
                                <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                                    <strong>หมวดหมู่:</strong> <span style={{ background: '#ff4e63', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', marginLeft: '5px' }}>{viewBook.category}</span>
                                </div>
                                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#ff4e63', marginTop: '10px' }}>
                                    {viewBook.price === 0 || viewBook.price === '0' || viewBook.price === '0.00' ? 'อ่านฟรี' : `฿ ${viewBook.price}`}
                                </div>
                            </div>
                        </div>

                        <hr style={{ margin: '20px 0 15px 0', border: 'none', borderTop: '1px solid #eee' }} />
                        
                        <h4 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '16px' }}>เรื่องย่อ / รายละเอียด</h4>
                        
                        <div style={{ fontSize: '14px', color: '#555', lineHeight: '1.6', maxHeight: '180px', overflowY: 'auto', paddingRight: '10px' }}>
                            {viewBook.description || 'ไม่มีรายละเอียดสำหรับหนังสือเล่มนี้'}
                        </div>

                        <div style={{ marginTop: '25px', display: 'flex', gap: '10px' }}>
                            {isLoggedIn && (
                                <button 
                                    onClick={() => addToCart(viewBook.id)}
                                    style={{ flex: 1, padding: '12px', background: '#ff4e63', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
                                    <i className="fas fa-shopping-cart"></i> เพิ่มลงตะกร้า
                                </button>
                            )}
                            <button 
                                onClick={() => navigate(`/read/${viewBook.id}`)} 
                                style={{ flex: isLoggedIn ? 1 : 'none', width: isLoggedIn ? 'auto' : '100%', padding: '12px', background: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
                                📖 อ่านเลย
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Home;