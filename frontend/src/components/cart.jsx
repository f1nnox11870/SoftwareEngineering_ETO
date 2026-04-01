import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../assets/cart.css';
import Navbar from './navbar';

const MAIN_CATEGORIES = [
    { label: 'นิยาย',           key: 'novel', tab: 'นิยาย'          },
    { label: 'การ์ตูน(มังงะ)', key: 'manga', tab: 'การ์ตูน/มังงะ'  },
];

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
function loadReadIds() {
    try { return new Set(JSON.parse(localStorage.getItem('notif_read_ids') || '[]')); } catch { return new Set(); }
}
function saveReadId(id) {
    try { const s = loadReadIds(); s.add(id); localStorage.setItem('notif_read_ids', JSON.stringify([...s].slice(-200))); } catch {}
}

function Cart() {
    const navigate = useNavigate();
    const [cartItems, setCartItems]   = useState([]);
    const [cartCount, setCartCount]   = useState(0);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername]     = useState('');
    const [role, setRole]             = useState(null);
    const [profileImage, setProfileImage] = useState(null);
    const [coins, setCoins]           = useState(null);
    const [favoriteIds, setFavoriteIds] = useState([]);
    const [navSearch, setNavSearch]   = useState('');
    const [megaOpen, setMegaOpen]     = useState(false);
    const [hoveredMenu, setHoveredMenu] = useState(null);
    const [dbCategories, setDbCategories] = useState({ novel: [], manga: [] });
    const [profileOpen, setProfileOpen] = useState(false);
    const [notifOpen, setNotifOpen]   = useState(false);
    const [notifications, setNotifications] = useState([]);

    const megaRef    = useRef(null);
    const profileRef = useRef(null);
    const notifRef   = useRef(null);
    const coinInterval = useRef(null);

    const fetchCart = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/cart', { headers: { Authorization: `Bearer ${token}` } });
            console.log("ข้อมูลในตะกร้า:", res.data);
            setCartItems(res.data);
            setCartCount(res.data.length);
        } catch (err) { console.error("Fetch cart error", err); }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        const user  = localStorage.getItem('username');
        const savedRole = localStorage.getItem('role');
        if (token) {
            setIsLoggedIn(true);
            if (user) setUsername(user);
            if (savedRole) setRole(savedRole);
            fetchCart();
        } else { navigate('/'); }
    }, [navigate]);

    useEffect(() => {
        axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/books/categories').then(res => setDbCategories(res.data)).catch(() => {});
    }, []);

    useEffect(() => {
        if (!isLoggedIn) { setCoins(null); clearInterval(coinInterval.current); return; }
        const token = localStorage.getItem('token');
        const fetchProfile = async () => {
            try {
                const res = await axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/profile', { headers: { Authorization: `Bearer ${token}` } });
                setCoins(res.data.coins ?? 0); setProfileImage(res.data.image || null);
            } catch { setCoins(0); }
        };
        fetchProfile();
        refreshNotifications(token);
        axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/favorites', { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setFavoriteIds(res.data.map(i => i.book_id))).catch(() => {});
        coinInterval.current = setInterval(fetchProfile, 30000);
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

    const refreshNotifications = async (token) => {
        const headers = { Authorization: `Bearer ${token}` };
        const readIds = loadReadIds();
        try {
            const [topupRes, histRes, newChapRes] = await Promise.all([
                axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/topup/my-requests', { headers }).catch(() => ({ data: [] })),
                axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/history', { headers }).catch(() => ({ data: [] })),
                axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/notifications/new-chapters', { headers }).catch(() => ({ data: [] })),
            ]);
            const notifs = [];
            newChapRes.data.forEach(c => {
                const nid   = `newchap-${c.chapter_id}`;
                const title = `มีตอนใหม่: ${c.book_title}`;
                const desc  = `ตอนที่ ${c.chapter_number}${c.chapter_title ? ` — ${c.chapter_title}` : ''} เพิ่งเผยแพร่แล้ว`;
                notifs.push({ id: nid, title, desc, time: formatTime(c.published_at), unread: !readIds.has(nid), tag: 'new_chapter', book_id: c.book_id });
            });
            topupRes.data.forEach(t => {
                const nid   = `topup-${t.id}`;
                const title = t.status === 'approved' ? `เติมเหรียญสำเร็จ +${Number(t.total_coins).toLocaleString()} เหรียญ`
                    : t.status === 'rejected' ? 'คำขอเติมเหรียญถูกปฏิเสธ' : 'คำขอเติมเหรียญรอการตรวจสอบ';
                const desc  = t.status === 'approved' ? `ชำระ ฿${t.amount} — รับ ${Number(t.total_coins).toLocaleString()} เหรียญแล้ว`
                    : t.status === 'rejected' ? (t.note || 'กรุณาติดต่อฝ่ายสนับสนุน') : `แพ็กเกจ ฿${t.amount} — รอแอดมินตรวจสอบ`;
                notifs.push({ id: nid, title, desc, time: formatTime(t.created_at), unread: !readIds.has(nid) && t.status === 'approved' });
            });
            histRes.data.slice(0, 8).forEach(h => {
                const nid = `hist-${h.id}`;
                notifs.push({ id: nid, title: h.type === 'book' ? 'ซื้อหนังสือสำเร็จ' : 'เติมเหรียญสำเร็จ', desc: h.title, time: formatTime(h.purchased_at), unread: false });
            });
            setNotifications(notifs.slice(0, 20));
        } catch {}
    };

    const unreadCount = notifications.filter(n => n.unread).length;
    const markAllRead = () => setNotifications(prev => prev.map(n => { if (n.unread) saveReadId(n.id); return { ...n, unread: false }; }));
    const markOneRead = (id) => {
        saveReadId(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
        const notif = notifications.find(n => n.id === id);
        if (notif?.tag === 'new_chapter' && notif.book_id) { setNotifOpen(false); navigate(`/read/${notif.book_id}`); }
    };

    const removeItem = async (cartItemId) => {
        if (!window.confirm("คุณต้องการลบหนังสือเล่มนี้ใช่หรือไม่?")) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/cart/${cartItemId}`, { headers: { Authorization: `Bearer ${token}` } });
            fetchCart();
        } catch (err) { alert("ไม่สามารถลบสินค้าได้"); }
    };

    const handleLogout = () => {
        localStorage.removeItem('token'); localStorage.removeItem('username');
        setIsLoggedIn(false); setUsername(''); setProfileOpen(false); setCoins(null); setCartCount(0);
        navigate('/');
    };

    const handleCheckout = async () => {
        const token = localStorage.getItem('token');
        if (coins < totalPrice) {
            alert(`เหรียญไม่พอ! คุณมี ${coins} แต่ต้องใช้ ${totalPrice} 🪙\nกรุณาไปเติมเหรียญก่อนครับ`);
            navigate('/topup'); return;
        }
        if (!window.confirm(`ยืนยันการชำระเงินจำนวน ${totalPrice.toLocaleString()} 🪙 ใช่หรือไม่?`)) return;
        try {
            const res = await axios.post('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/cart/checkout', {}, { headers: { Authorization: `Bearer ${token}` } });
            alert(res.data.message);
            setCoins(res.data.remainingCoins); setCartItems([]); setCartCount(0);
        } catch (err) { alert(err.response?.data?.message || "เกิดข้อผิดพลาดในการชำระเงิน"); }
    };

    const totalPrice = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);

    return (
        <div className="home-page shelf-page">
            <Navbar/>

            {/* ══ HERO (เหมือน Topup) ══ */}
            <div className="topup-hero">
                <div className="topup-page-inner">
                    <div className="topup-breadcrumb">
                        <span className="topup-breadcrumb-home" onClick={() => navigate('/')}><i className="fas fa-house" style={{ color: '#999' }}></i></span>
                        <i className="fas fa-angle-right" style={{ fontSize: 12, color: '#aaa', margin: '0 8px' }}></i>
                        <span className="topup-breadcrumb-cur">รถเข็น</span>
                    </div>
                </div>
            </div>

            {/* ══ MAIN CONTENT (เดิม ไม่แตะ) ══ */}
            <div className="cart-container">
                <h2 className="cart-title">ตะกร้าสินค้าของฉัน ({cartItems.length} รายการ)</h2>
                {cartItems.length === 0 ? (
                    <div className="empty-cart">
                        <p style={{ color: '#666', fontSize: '18px', marginBottom: '15px' }}>ไม่มีสินค้าในตะกร้า</p>
                        <button className="btn-checkout" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => navigate('/')}>
                            ไปเลือกซื้อหนังสือ
                        </button>
                    </div>
                ) : (
                    <div className="cart-grid">
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
                        <div className="cart-summary">
                            <h3>สรุปยอดชำระ</h3>
                            <div className="summary-row">
                                <span>ราคาสินค้า</span>
                                <span>{totalPrice.toLocaleString()} 🪙</span>
                            </div>
                            <div className="summary-coins-check" style={{ marginTop: '10px', padding: '10px', background: '#fff8f8', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span>เหรียญของคุณ:</span>
                                    <span style={{ fontWeight: 'bold' }}>{coins?.toLocaleString()} 🪙</span>
                                </div>
                                {coins < totalPrice && (
                                    <div style={{ marginTop: '10px', textAlign: 'center' }}>
                                        <p style={{ color: '#ff4e63', fontSize: '13px', marginBottom: '10px', fontWeight: 'bold' }}>
                                            <i className="fas fa-exclamation-circle"></i> เหรียญไม่พอ กรุณาเติมเหรียญ
                                        </p>
                                        <button onClick={() => navigate('/topup')}
                                            style={{ width: '100%', padding: '8px 10px', background: '#ff9800', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'all 0.2s' }}
                                            onMouseOver={(e) => e.target.style.background = '#e68a00'}
                                            onMouseOut={(e) => e.target.style.background = '#ff9800'}>
                                            <i className="fas fa-coins"></i> ไปหน้าเติมเหรียญ
                                        </button>
                                    </div>
                                )}
                            </div>
                            <hr className="divider" />
                            <div className="summary-total">
                                <span>ยอดสุทธิ</span>
                                <span>{totalPrice.toLocaleString()} 🪙</span>
                            </div>
                            <button className="btn-checkout" onClick={handleCheckout}
                                disabled={coins < totalPrice} style={{ opacity: coins < totalPrice ? 0.6 : 1 }}>
                                ชำระเงินด้วยเหรียญ
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Cart;