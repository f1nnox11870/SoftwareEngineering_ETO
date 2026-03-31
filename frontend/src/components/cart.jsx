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

/* ══════════════════════════════════════════
   🎨 MODAL COMPONENTS
══════════════════════════════════════════ */

/** Generic Confirm Modal */
function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'ยืนยัน', cancelLabel = 'ยกเลิก', type = 'default' }) {
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    const iconMap = {
        delete:   { icon: 'fas fa-trash-alt',        color: '#ff4e63', bg: '#fff1f3' },
        checkout: { icon: 'fas fa-shopping-bag',      color: '#ff4e63', bg: '#fff1f3' },
        default:  { icon: 'fas fa-question-circle',   color: '#ff4e63', bg: '#fff1f3' },
    };
    const { icon, color, bg } = iconMap[type] || iconMap.default;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <div className="modal-icon-wrap" style={{ background: bg }}>
                    <i className={icon} style={{ color }} />
                </div>
                <h3 className="modal-title">{title}</h3>
                <p className="modal-message">{message}</p>
                <div className="modal-actions">
                    <button className="modal-btn modal-btn-cancel" onClick={onClose}>{cancelLabel}</button>
                    <button className="modal-btn modal-btn-confirm" onClick={onConfirm}>{confirmLabel}</button>
                </div>
            </div>
        </div>
    );
}

/** Generic Alert/Result Modal */
function AlertModal({ isOpen, onClose, title, message, type = 'success' }) {
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    const iconMap = {
        success: { icon: 'fas fa-check-circle', color: '#22c55e', bg: '#f0fdf4' },
        error:   { icon: 'fas fa-times-circle',  color: '#ff4e63', bg: '#fff1f3' },
        warning: { icon: 'fas fa-exclamation-triangle', color: '#f59e0b', bg: '#fffbeb' },
        info:    { icon: 'fas fa-info-circle',   color: '#3b82f6', bg: '#eff6ff' },
    };
    const { icon, color, bg } = iconMap[type] || iconMap.success;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <div className="modal-icon-wrap" style={{ background: bg }}>
                    <i className={icon} style={{ color }} />
                </div>
                <h3 className="modal-title">{title}</h3>
                <p className="modal-message">{message}</p>
                <div className="modal-actions modal-actions-single">
                    <button className="modal-btn modal-btn-confirm" onClick={onClose}>ตกลง</button>
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════
   🛒 CART COMPONENT
══════════════════════════════════════════ */
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

    // ── Modal states ──
    const [removeModal, setRemoveModal]     = useState({ open: false, itemId: null, title: '' });
    const [checkoutModal, setCheckoutModal] = useState({ open: false });
    const [alertModal, setAlertModal]       = useState({ open: false, title: '', message: '', type: 'success', onClose: null });

    const megaRef    = useRef(null);
    const profileRef = useRef(null);
    const notifRef   = useRef(null);
    const coinInterval = useRef(null);

    const showAlert = (title, message, type = 'success', callback = null) => {
        setAlertModal({ open: true, title, message, type, onClose: callback });
    };

    const fetchCart = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await axios.get('http://localhost:3001/cart', { headers: { Authorization: `Bearer ${token}` } });
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
        axios.get('http://localhost:3001/books/categories').then(res => setDbCategories(res.data)).catch(() => {});
    }, []);

    useEffect(() => {
        if (!isLoggedIn) { setCoins(null); clearInterval(coinInterval.current); return; }
        const token = localStorage.getItem('token');
        const fetchProfile = async () => {
            try {
                const res = await axios.get('http://localhost:3001/profile', { headers: { Authorization: `Bearer ${token}` } });
                setCoins(res.data.coins ?? 0); setProfileImage(res.data.image || null);
            } catch { setCoins(0); }
        };
        fetchProfile();
        refreshNotifications(token);
        axios.get('http://localhost:3001/favorites', { headers: { Authorization: `Bearer ${token}` } })
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
                axios.get('http://localhost:3001/topup/my-requests', { headers }).catch(() => ({ data: [] })),
                axios.get('http://localhost:3001/history', { headers }).catch(() => ({ data: [] })),
                axios.get('http://localhost:3001/notifications/new-chapters', { headers }).catch(() => ({ data: [] })),
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

    // ── ลบสินค้า (ใช้ Modal แทน window.confirm) ──
    const removeItem = (cartItemId, itemTitle) => {
        setRemoveModal({ open: true, itemId: cartItemId, title: itemTitle });
    };

    const confirmRemove = async () => {
        const { itemId } = removeModal;
        setRemoveModal({ open: false, itemId: null, title: '' });
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`http://localhost:3001/cart/${itemId}`, { headers: { Authorization: `Bearer ${token}` } });
            fetchCart();
        } catch (err) {
            showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถลบสินค้าได้ กรุณาลองใหม่อีกครั้ง', 'error');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token'); localStorage.removeItem('username');
        setIsLoggedIn(false); setUsername(''); setProfileOpen(false); setCoins(null); setCartCount(0);
        navigate('/');
    };

    // ── ชำระเงิน (ใช้ Modal แทน window.confirm & alert) ──
    const handleCheckout = () => {
        if (coins < totalPrice) {
            showAlert(
                'เหรียญไม่เพียงพอ',
                `คุณมี ${coins?.toLocaleString()} เหรียญ แต่ต้องใช้ ${totalPrice.toLocaleString()} เหรียญ\nกรุณาเติมเหรียญก่อนนะครับ`,
                'warning',
                () => navigate('/topup')
            );
            return;
        }
        setCheckoutModal({ open: true });
    };

    const confirmCheckout = async () => {
        setCheckoutModal({ open: false });
        const token = localStorage.getItem('token');
        try {
            const res = await axios.post('http://localhost:3001/cart/checkout', {}, { headers: { Authorization: `Bearer ${token}` } });
            setCoins(res.data.remainingCoins);
            setCartItems([]);
            setCartCount(0);
            showAlert('ชำระเงินสำเร็จ! 🎉', res.data.message, 'success');
        } catch (err) {
            showAlert('เกิดข้อผิดพลาด', err.response?.data?.message || 'เกิดข้อผิดพลาดในการชำระเงิน', 'error');
        }
    };

    const totalPrice = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);

    return (
        <div className="home-page shelf-page">
            <Navbar/>

            {/* ══ MODALS ══ */}

            {/* Modal ยืนยันลบ */}
            <ConfirmModal
                isOpen={removeModal.open}
                onClose={() => setRemoveModal({ open: false, itemId: null, title: '' })}
                onConfirm={confirmRemove}
                title="ลบออกจากตะกร้า?"
                message={`คุณต้องการลบ "${removeModal.title}" ออกจากตะกร้าสินค้าใช่หรือไม่?`}
                confirmLabel="ลบเลย"
                cancelLabel="ยกเลิก"
                type="delete"
            />

            {/* Modal ยืนยันชำระเงิน */}
            <ConfirmModal
                isOpen={checkoutModal.open}
                onClose={() => setCheckoutModal({ open: false })}
                onConfirm={confirmCheckout}
                title="ยืนยันการชำระเงิน"
                message={`ชำระเงิน ${totalPrice.toLocaleString()} เหรียญ เพื่อซื้อหนังสือทั้งหมด ${cartItems.length} เล่ม ใช่หรือไม่?`}
                confirmLabel="ชำระเงินเลย"
                cancelLabel="ยกเลิก"
                type="checkout"
            />

            {/* Modal แจ้งผลลัพธ์ */}
            <AlertModal
                isOpen={alertModal.open}
                onClose={() => {
                    const cb = alertModal.onClose;
                    setAlertModal({ open: false, title: '', message: '', type: 'success', onClose: null });
                    if (cb) cb();
                }}
                title={alertModal.title}
                message={alertModal.message}
                type={alertModal.type}
            />

            {/* ══ HERO ══ */}
            <div className="topup-hero">
                <div className="topup-page-inner">
                    <div className="topup-breadcrumb">
                        <span className="topup-breadcrumb-home" onClick={() => navigate('/')}><i className="fas fa-house" style={{ color: '#999' }}></i></span>
                        <i className="fas fa-angle-right" style={{ fontSize: 12, color: '#aaa', margin: '0 8px' }}></i>
                        <span className="topup-breadcrumb-cur">รถเข็น</span>
                    </div>
                </div>
            </div>

            {/* ══ MAIN CONTENT ══ */}
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
                                    <button className="btn-remove-item" onClick={() => removeItem(item.cart_item_id, item.title)}>
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="cart-summary">
                            <h3>สรุปยอดชำระ</h3>
                            <div className="summary-row">
                                <span>ราคาสินค้า</span>
                                <span>{totalPrice.toLocaleString()} เหรียญ</span>
                            </div>
                            <div className="summary-coins-check" style={{ marginTop: '10px', padding: '10px', background: '#fff8f8', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span>เหรียญของคุณ:</span>
                                    <span style={{ fontWeight: 'bold' }}>{coins?.toLocaleString()} เหรียญ</span>
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
                                <span>{totalPrice.toLocaleString()} เหรียญ</span>
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