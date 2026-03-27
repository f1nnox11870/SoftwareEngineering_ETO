import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../assets/cart.css'; 
import '../assets/style.css'; 

// 🌟 Import Modal ของ Login และ Register มาใช้งาน (เหมือน Home.jsx)
import Login from './login';
import Register from './Register';

function Cart() {
    const navigate = useNavigate();
    
    
    // 1. STATES สำหรับ Navbar 
    
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState('');
    const [role, setRole] = useState('user');
    const [profileImage, setProfileImage] = useState(null);
    const [balance, setBalance] = useState(null); // ใช้ balance รับค่าเหรียญจาก backend
    const [cartCount, setCartCount] = useState(0);
    const [modal, setModal] = useState(null); // ควบคุม Popup Login/Register
    
    const [megaOpen, setMegaOpen] = useState(false);
    const [hoveredMenu, setHoveredMenu] = useState('นิยาย');
    const [notifOpen, setNotifOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    
    const megaRef = useRef(null);
    const notifRef = useRef(null);
    const profileRef = useRef(null);

    // ข้อมูลจำลองสำหรับเมนู
    const MENU_ITEMS = [
        { label: 'นิยาย', subs: ['นิยายรักโรแมนติก','นิยายวาย','นิยายแฟนตาซี','นิยายสืบสวน','นิยายกำลังภายใน','ไลท์โนเวล','วรรณกรรมทั่วไป','นิยายยูริ','กวีนิพนธ์','แฟนเฟิค'] },
        { label: 'การ์ตูน', subs: [] },
        { label: 'อีบุ๊กทั่วไป', subs: [] },
    ];
    const ROMANCE_SUBS = ['นิยายรักวัยรุ่น','นิยายรักแฟนตาซี','นิยายรักจีนโบราณ','นิยายรักจีนปัจจุบัน','นิยายรักกำลังภายใน','นิยายรักผู้ใหญ่'];

    // ข้อมูลจำลองการแจ้งเตือน
    const [notifications, setNotifications] = useState([
        { id: 1, icon: '🪙', title: 'เติมเหรียญสำเร็จ', desc: 'คุณได้รับ 150 เหรียญเรียบร้อยแล้ว', time: '2 นาทีที่แล้ว', unread: true },
        { id: 2, icon: '📖', title: 'หนังสือใหม่', desc: 'นิยายที่คุณติดตามอัปเดตตอนใหม่แล้ว', time: '1 ชั่วโมงที่แล้ว', unread: true }
    ]);
    const unreadCount = notifications.filter(n => n.unread).length;

    
    // 2. STATES สำหรับตะกร้าสินค้า
   
    const [cartItems, setCartItems] = useState([]);

    
    // 3. ฟังก์ชันสำหรับ Navbar 
    
    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/';
    };

    const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    const markOneRead = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));

    const handleLoginSuccess = () => {
        setModal(null);
        setIsLoggedIn(true);
        setUsername(localStorage.getItem('username'));
        fetchData(); 
    };

    // ฟังก์ชันดึงข้อมูลโปรไฟล์และตะกร้า
    const fetchData = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const resUser = await axios.get('http://localhost:3001/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsername(resUser.data.username);
            setRole(resUser.data.role || 'user');
            setProfileImage(resUser.data.image);
            setBalance(resUser.data.balance);

            const resCart = await axios.get('http://localhost:3001/cart', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCartItems(resCart.data);
            setCartCount(resCart.data.length);
        } catch (err) {
            console.error("Fetch data error", err);
        }
    };

    // UseEffect ทำงานตอนเปิดหน้า
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            setIsLoggedIn(true);
            fetchData();
        }
        
        // ฟังก์ชันสำหรับคลิกพื้นที่ว่างแล้วปิด Dropdown
        const handleClickOutside = (e) => {
            if (megaRef.current && !megaRef.current.contains(e.target)) setMegaOpen(false);
            if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    
    // 4. ฟังก์ชันสำหรับตะกร้าสินค้า
    
    const removeItem = async (cartItemId) => {
        if (!window.confirm("ต้องการลบรายการนี้?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:3001/cart/${cartItemId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData(); 
        } catch (err) { console.error(err); }
    };

    const totalPrice = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);

    return (
        <div className="cart-page">
            <header className="navbar">
                <div className="navbar-inner">
                    <div className="nav-left">
                        <div className="nav-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                            <div className="nav-logo-box"><i className="fas fa-book-open"></i></div>
                        </div>
                        <div className="mega-wrap" ref={megaRef}>
                            <button className="nav-hamburger" onClick={() => setMegaOpen(v => !v)}>
                                <i className="fas fa-bars"></i> <span>เลือกหมวด</span>
                            </button>
                            {megaOpen && (
                                <div className="mega-menu">
                                    <div className="mega-col">
                                        {MENU_ITEMS.map(item => (
                                            <div key={item.label} className={`mega-item ${hoveredMenu === item.label ? 'hovered' : ''}`} onMouseEnter={() => setHoveredMenu(item.label)}>
                                                <span>{item.label}</span>
                                                {item.subs.length > 0 && <i className="fas fa-chevron-right"></i>}
                                            </div>
                                        ))}
                                    </div>
                                    {hoveredMenu === 'นิยาย' && (
                                        <>
                                            <div className="mega-col">
                                                <div className="mega-item hovered"><span>นิยายรักโรแมนติก</span> <i className="fas fa-chevron-right"></i></div>
                                                {MENU_ITEMS[0].subs.slice(1).map(s => <div key={s} className="mega-item"><span>{s}</span></div>)}
                                            </div>
                                            <div className="mega-col">
                                                {ROMANCE_SUBS.map(s => <div key={s} className="mega-item"><span>{s}</span></div>)}
                                            </div>
                                        </>
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
                                {role === 'admin' && <button className="btn-admin" onClick={() => navigate('/admin')}>จัดการเนื้อหา</button>}
                                
                                <div className="notif-wrap" ref={notifRef}>
                                    <button className="nav-icon-btn pos-rel" onClick={() => { setNotifOpen(v => !v); setProfileOpen(false); }}>
                                        <i className="fas fa-bell"></i>
                                        {unreadCount > 0 && <span className="nbadge">{unreadCount}</span>}
                                    </button>
                                    {notifOpen && (
                                        <div className="notif-dropdown">
                                            <div className="notif-header">
                                                <span className="notif-title">การแจ้งเตือน</span>
                                                {unreadCount > 0 && <button className="notif-markall" onClick={markAllRead}>อ่านทั้งหมด</button>}
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

                                <button className="nav-icon-btn pos-rel" onClick={() => navigate('/favorites')}>
                                    <i className="fas fa-heart"></i>
                                    <span className="nbadge red">1</span>
                                </button>
                                
                                <button className="nav-icon-btn pos-rel" onClick={() => navigate('/cart')}>
                                    <i className="fas fa-shopping-cart"></i>
                                    {cartCount > 0 && <span className="nbadge red">{cartCount}</span>}
                                </button>
                                
                                <div className="profile-wrap" ref={profileRef}>
                                    <button className="nav-user-btn" onClick={() => setProfileOpen(v => !v)}>
                                        {profileImage ? <img src={profileImage} alt="P" className="nav-avatar" style={{width:'32px', height:'32px', borderRadius:'50%', objectFit: 'cover'}}/> : <i className="fas fa-user-circle nav-avatar"></i>}
                                        <div className="nav-user-info"><span className="nav-username">{username}</span></div>
                                    </button>
                                    {profileOpen && (
                                        <div className="profile-dropdown">
                                            <div className="pd-header">
                                                {profileImage ? <img src={profileImage} alt="P" style={{width:'40px', height:'40px', borderRadius:'50%', objectFit: 'cover'}}/> : <i className="fas fa-user-circle pd-avatar-icon"></i>}
                                                <div>
                                                    <div className="pd-name">{username}</div>
                                                    <div className="pd-sub">{role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งานทั่วไป'}</div>
                                                </div>
                                            </div>
                                            
                                            {/* 🌟 แก้ปัญหาหน้าจอขาวตอนเปิดโปรไฟล์ โดยเช็คว่ามี balance หรือไม่ */}
                                            {balance !== null && balance !== undefined && (
                                                <div className="pd-coins-row">
                                                    <div className="pd-coins-label"><i className="fas fa-coins pd-coins-icon"></i><span>เหรียญของฉัน</span></div>
                                                    <span className="pd-coins-value">{Number(balance).toLocaleString()}</span>
                                                </div>
                                            )}
                                            
                                            <div className="pd-divider"></div>
                                            <div className="pd-item"><i className="fas fa-layer-group"></i> ชั้นหนังสือ</div>
                                            <div className="pd-item" onClick={() => navigate('/history')}><i className="fas fa-history"></i> ประวัติซื้อ</div>
                                            <div className="pd-item" onClick={() => navigate('/topup')}><i className="fas fa-coins"></i> ซื้อเหรียญ</div>
                                            <div className="pd-divider"></div>
                                            <div className="pd-item" onClick={() => navigate('/settingprofile')}><i className="fas fa-cog"></i> ตั้งค่าบัญชี</div>
                                            <div className="pd-divider"></div>
                                            <div className="pd-logout" onClick={handleLogout}><i className="fas fa-sign-out-alt"></i> ออกจากระบบ</div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="nav-auth-btns">
                                <button className="btn-login" onClick={() => setModal('login')}>เข้าสู่ระบบ</button>
                                <button className="btn-register" onClick={() => setModal('register')}>สมัครสมาชิก</button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* ════════════════════════════════════════════════════
                ส่วนที่ 2: HERO BREADCRUMB
            ════════════════════════════════════════════════════ */}
            <div className="topup-hero">
                <div className="topup-page-inner">
                    <div className="topup-breadcrumb">
                        <span className="topup-breadcrumb-home" onClick={() => navigate('/')}><i className="fas fa-house"></i></span>
                        <i className="fas fa-angle-right" style={{ fontSize: 12, color: '#aaa' }}></i>
                        <span className="topup-breadcrumb-cur">ตะกร้าสินค้า</span>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════
                ส่วนที่ 3: CART CONTENT (ส่วนเนื้อหาตะกร้า)
            ════════════════════════════════════════════════════ */}
            <div className="cart-container">
                <h2 className="cart-title">รายการในตะกร้า ({cartCount})</h2>
                {cartItems.length === 0 ? (
                    <div className="empty-cart" style={{ textAlign: 'center', padding: '50px 0', color: '#888' }}>
                        {isLoggedIn ? 'ไม่มีสินค้าในตะกร้า' : 'กรุณาเข้าสู่ระบบเพื่อดูตะกร้าสินค้าของคุณ'}
                    </div>
                ) : (
                    <div className="cart-layout">
                        <div className="cart-items-list">
                            {cartItems.map(item => (
                                <div key={item.cart_item_id} className="cart-item-card">
                                    <img src={item.image} alt={item.title} className="cart-item-img" />
                                    <div className="cart-item-info">
                                        <h4>{item.title}</h4>
                                        <p>{item.author}</p>
                                        <div className="cart-item-price">{item.price} บาท</div>
                                    </div>
                                    <button className="btn-remove-item" onClick={() => removeItem(item.cart_item_id)}>
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="cart-summary">
                            <h3>สรุปยอดชำระ</h3>
                            <div className="summary-row"><span>ราคาสินค้า</span><span>{totalPrice.toLocaleString()} บาท</span></div>
                            <hr className="divider" />
                            <div className="summary-total"><span>ยอดสุทธิ</span><span>{totalPrice.toLocaleString()} บาท</span></div>
                            <button className="btn-checkout">ชำระเงิน</button>
                        </div>
                    </div>
                )}
            </div>

            {/* ════════════════════════════════════════════════════
                ส่วนที่ 4: MODALS (แสดงหน้าต่าง Login/Register ซ้อนขึ้นมา)
            ════════════════════════════════════════════════════ */}
            {modal === 'login' && <Login onClose={() => setModal(null)} onSwitch={() => setModal('register')} onSuccess={handleLoginSuccess} />}
            {modal === 'register' && <Register onClose={() => setModal(null)} onSwitch={() => setModal('login')} />}
        </div>
    );
}

export default Cart;