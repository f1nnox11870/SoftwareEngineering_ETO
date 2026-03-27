import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../assets/cart.css'; 

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

function Cart() {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);
    const [cartCount, setCartCount] = useState(0);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState('');
    const [role, setRole] = useState(null);
    const [profileImage, setProfileImage] = useState(null);
    const [coins, setCoins] = useState(null);
    const [megaOpen, setMegaOpen] = useState(false);
    const [hoveredMenu, setHoveredMenu] = useState(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

    const megaRef    = useRef(null);
    const profileRef = useRef(null);
    const notifRef   = useRef(null);
    const coinInterval = useRef(null);

    const fetchCart = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await axios.get('http://localhost:3001/cart', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("ข้อมูลในตะกร้า:", res.data);
            setCartItems(res.data);
            setCartCount(res.data.length);
        } catch (err) {
            console.error("Fetch cart error", err);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('username');
        const savedRole = localStorage.getItem('role');
        if (token) {
            setIsLoggedIn(true);
            if (user) setUsername(user);
            if (savedRole) setRole(savedRole);
            fetchCart();
        } else {
            navigate('/');
        }
    }, [navigate]);

    // Fetch coins & profile image
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

    // Close dropdowns on outside click
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

    const removeItem = async (cartItemId) => {
        if (!window.confirm("คุณต้องการลบหนังสือเล่มนี้ใช่หรือไม่?")) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`http://localhost:3001/cart/${cartItemId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchCart();
        } catch (err) {
            alert("ไม่สามารถลบสินค้าได้");
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

    const totalPrice = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);

    return (
        <div className="cart-page">
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
                 
            {/* ══ HERO (สไตล์เดียวกับ Topup) ══ */}
            <div className="topup-hero">
                <div className="topup-page-inner">
                    <div className="topup-breadcrumb">
                        <span className="topup-breadcrumb-home" onClick={() => navigate('/')}>
                            <i className="fas fa-house"></i>
                        </span>
                        <i className="fas fa-angle-right" style={{ fontSize: 12, color: '#aaa' }}></i>
                        <span className="topup-breadcrumb-cur">รถเข็น</span>
                    </div>
                    <div className="topup-balance-card">
                        <i className="fa-solid fa-coins topup-balance-icon"></i>
                        <div>
                            <div className="topup-balance-label">เหรียญของฉัน</div>
                            <div className="topup-balance-amount">
                                {coins === null
                                    ? <span className="topup-balance-loading">กำลังโหลด…</span>
                                    : <>{coins.toLocaleString()} <span className="topup-balance-unit">เหรียญ</span></>
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═════════ 2. MAIN CONTENT ═════════ */}
            <div className="cart-container">
                <h2 className="cart-title">ตะกร้าสินค้าของฉัน ({cartItems.length} รายการ)</h2>
                {/* ... โค้ดเงื่อนไข cartItems.length === 0 และกล่องซ้ายขวาของคุณ ... */}
                
                {cartItems.length === 0 ? (
                    <div className="empty-cart">
                        <p style={{ color: '#666', fontSize: '18px', marginBottom: '15px' }}>ไม่มีสินค้าในตะกร้า</p>
                        <button className="btn-checkout" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => navigate('/')}>
                            ไปเลือกซื้อหนังสือ
                        </button>
                    </div>
                ) : (
                    <div className="cart-grid">
                        {/* ฝั่งซ้าย: รายการสินค้า */}
                        <div className="cart-items-list">
                            {cartItems.map((item) => (
                                <div key={item.cart_item_id} className="cart-item">
                                    <img src={item.image} alt={item.title} />
                                    <div className="cart-item-info">
                                        <h4>{item.title}</h4>
                                        <p>ผู้เขียน: {item.author}</p>
                                        <p className="cart-item-price">{item.price.toLocaleString()} บาท</p>
                                    </div>
                                    <button className="btn-remove-item" onClick={() => removeItem(item.cart_item_id)}>
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* ฝั่งขวา: สรุปยอดชำระ */}
                        <div className="cart-summary">
                            <h3>สรุปยอดชำระ</h3>
                            <div className="summary-row">
                                <span>ราคาสินค้า</span>
                                <span>{totalPrice.toLocaleString()} บาท</span>
                            </div>
                            <div className="summary-row">
                                <span>ส่วนลด</span>
                                <span style={{ color: '#2ecc71' }}>- 0 บาท</span>
                            </div>
                            <hr className="divider" />
                            <div className="summary-total">
                                <span>ยอดสุทธิ</span>
                                <span>{totalPrice.toLocaleString()} บาท</span>
                            </div>
                            <button className="btn-checkout">
                                ชำระเงิน
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
export default Cart;