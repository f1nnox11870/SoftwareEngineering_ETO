import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Login from './login';
import Register from './Register';
import '../assets/topup.css';
import Transaction from './Transaction';
import Navbar from './navbar';
const MAIN_CATEGORIES = [
    { label: 'นิยาย',           key: 'novel', tab: 'นิยาย'          },
    { label: 'การ์ตูน(มังงะ)', key: 'manga', tab: 'การ์ตูน/มังงะ'  },
];

const PROMO_PACKAGES = [
    { id: 'p1', coins: 100, bonus: 50, total: 150, price: '49.00', badge: 'ลด 30%', badgeType: 'sale', icon: 'coins' },
    { id: 'p2', coins: 217, bonus: 80, total: 297, price: '129.00', badge: 'HOT', badgeType: 'hot', icon: 'coins' },
];
const STANDARD_PACKAGES = [
    { id: 's1', coins: 40,   bonus: 0,  total: 40,  price: '19.00',  badge: '',          badgeType: '',        icon: 'coins-dim' },
    { id: 's2', coins: 100,  bonus: 5,  total: 105, price: '49.00',  badge: '',          badgeType: '',        icon: 'coins' },
    { id: 's3', coins: 169,  bonus: 10, total: 179, price: '79.00',  badge: '',          badgeType: '',        icon: 'coins' },
    { id: 's4', coins: 217,  bonus: 10, total: 227, price: '129.00', badge: 'นิยม',     badgeType: 'popular', icon: 'coins' },
    { id: 's5', coins: 350,  bonus: 20, total: 370, price: '249.00', badge: '',          badgeType: '',        icon: 'coins' },
    { id: 's6', coins: 500,  bonus: 50, total: 550, price: '349.00', badge: 'ดีที่สุด', badgeType: 'best',   icon: 'sack' },
];
const EXTRA_PACKAGES = [
    { id: 'e1', coins: 800,  bonus: 100, total: 900,  price: '549.00',  badge: '',         badgeType: '',     icon: 'gem' },
    { id: 'e2', coins: 1200, bonus: 200, total: 1400, price: '849.00',  badge: 'คุ้มสุด', badgeType: 'best', icon: 'crown' },
    { id: 'e3', coins: 2000, bonus: 500, total: 2500, price: '1399.00', badge: 'VIP',      badgeType: 'best', icon: 'star' },
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

function buildNotifications(historyData, topupData, newChapterData = [], readIds = new Set()) {
    const notifs = [];

    // ── แจ้งเตือนตอนใหม่ (หนังสือที่ซื้อหรือกดใจ) ──────────────────────────
    newChapterData.forEach(c => {
        const nid   = `newchap-${c.chapter_id}`;
        const title = `มีตอนใหม่: ${c.book_title}`;
        const desc  = `ตอนที่ ${c.chapter_number}${c.chapter_title ? ` — ${c.chapter_title}` : ''} เพิ่งเผยแพร่แล้ว`;
        notifs.push({
            id: nid,
            title,
            desc,
            time: formatTime(c.published_at),
            unread: !readIds.has(nid),
            tag: 'new_chapter',
            book_id: c.book_id,
        });
    });

    // ── เติมเหรียญ ────────────────────────────────────────────────────────────
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

    // ── ประวัติซื้อ ───────────────────────────────────────────────────────────
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
function PackageCard({ pkg, onSelect }) {
    const iconMap = {
        coins:       <i className="fa-solid fa-coins"       style={{ color: '#f0a500' }}></i>,
        'coins-dim': <i className="fa-solid fa-coins"       style={{ color: '#cda63a' }}></i>,
        sack:        <i className="fa-solid fa-sack-dollar" style={{ color: '#e65100' }}></i>,
        gem:         <i className="fa-solid fa-gem"         style={{ color: '#2196f3' }}></i>,
        crown:       <i className="fa-solid fa-crown"       style={{ color: '#f0a500' }}></i>,
        star:        <i className="fa-solid fa-star"        style={{ color: '#ff9800' }}></i>,
    };
    const badgeColorMap = { sale: '#b5651d', hot: '#9c27b0', popular: '#2e7d32', best: '#8B4513' };
    return (
        <div className="coin-card" onClick={() => onSelect(pkg)}>
            {pkg.badge && <div className="card-badge" style={{ background: badgeColorMap[pkg.badgeType] || '#2e7d32' }}>{pkg.badge}</div>}
            <div className="coin-card-icon">{iconMap[pkg.icon]}</div>
            <div className="coin-card-amount">{pkg.coins.toLocaleString()}</div>
            {pkg.bonus > 0 && <div className="coin-card-bonus">+{pkg.bonus} โบนัส</div>}
            <div className="coin-card-total">{pkg.bonus > 0 ? `รวม ${pkg.total.toLocaleString()} เหรียญ` : 'เหรียญพื้นฐาน'}</div>
            <button className="coin-card-price" onClick={e => { e.stopPropagation(); onSelect(pkg); }}>฿{pkg.price}</button>
        </div>
    );
}


function Topup() {
    const navigate = useNavigate();

    const [isLoggedIn, setIsLoggedIn]     = useState(false);
    const [username, setUsername]         = useState('');
    const [profileImage, setProfileImage] = useState(null);
    const [role, setRole]                 = useState(null);
    const [modal, setModal]               = useState(null);
    const [balance, setBalance]           = useState(null);
    const [coins, setCoins]               = useState(null);
    const [navSearch, setNavSearch] = useState('');
    const [cartCount, setCartCount]       = useState(0);
    const [favoriteIds, setFavoriteIds] = useState([]);
    const [megaOpen, setMegaOpen]         = useState(false);
    const [hoveredMenu, setHoveredMenu]   = useState(null);
    const [dbCategories, setDbCategories] = useState({ novel: [], manga: [] });
    const [profileOpen, setProfileOpen]   = useState(false);
    const [notifOpen, setNotifOpen]       = useState(false);
    const [notifications, setNotifications] = useState([]);
    const megaRef    = useRef(null);
    const profileRef = useRef(null);
    const notifRef   = useRef(null);
    const coinInterval = useRef(null);

    const [showExtra, setShowExtra]     = useState(false);
    const [promoCode, setPromoCode]     = useState('');
    const [confirmPkg, setConfirmPkg]   = useState(null);
    const [qrPkg, setQrPkg]            = useState(null);
    const [successMsg, setSuccessMsg]   = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [countdown, setCountdown]     = useState(900);
    const timerRef = useRef(null);
    const [qrCodeUrl, setQrCodeUrl]   = useState('');
    const [qrLoading, setQrLoading]   = useState(false);
    const [qrError, setQrError]       = useState('');
    const [slipFile, setSlipFile]         = useState(null);
    const [slipPreview, setSlipPreview]   = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError]   = useState('');
    const slipInputRef = useRef(null);


    useEffect(() => {
        const token = localStorage.getItem('token');
        const user  = localStorage.getItem('username');
        if (token) { setIsLoggedIn(true); if (user) setUsername(user); setRole(localStorage.getItem('role')); }
    }, []);

    // ดึง subcategories จาก DB
    useEffect(() => {
        axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/books/categories')
            .then(res => setDbCategories(res.data))
            .catch(() => {});
    }, []);

     const refreshNotifications = async (token) => {
        const headers = { Authorization: `Bearer ${token}` };
        const readIds = loadReadIds();
        const [topupRes, histRes, newChapRes] = await Promise.all([
            axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/topup/my-requests', { headers }).catch(() => ({ data: [] })),
            axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/history', { headers }).catch(() => ({ data: [] })),
            axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/notifications/new-chapters', { headers }).catch(() => ({ data: [] })),
        ]);
        setNotifications(buildNotifications(histRes.data, topupRes.data, newChapRes.data, readIds));
    };

    const handleNavSearch = () => {
        if (navSearch.trim()) {
            navigate(`/?search=${encodeURIComponent(navSearch)}`);
        }
    };
    
    const fetchFavoriteIds = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        try {
            const res = await axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/favorites', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const ids = res.data.map(item => item.book_id);
            setFavoriteIds(ids);
        } catch (error) {
            console.error("Error fetching favorites:", error);
        }
    };
    
    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const res = await axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/profile', { headers: { Authorization: `Bearer ${token}` } });
                setCoins(res.data.coins ?? 0);
                setBalance(res.data.coins ?? 0);
                setProfileImage(res.data.image || null);
            } catch { setCoins(0); setBalance(0); }
        };
        if (isLoggedIn) {
            const token = localStorage.getItem('token');
            fetchProfile();
            refreshNotifications(token);
            fetchFavoriteIds();
            axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/cart', { headers: { Authorization: `Bearer ${token}` } })
                .then(res => setCartCount(res.data.length)).catch(() => {});
            coinInterval.current = setInterval(fetchProfile, 30000);
        } else {
            setCoins(null); setBalance(null);
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
            axios.post('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/notifications/new-chapters/seen',
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
                axios.post('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/notifications/new-chapters/seen',
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

    useEffect(() => {
        if (qrPkg) {
            setCountdown(900);
            timerRef.current = setInterval(() => {
                setCountdown(s => { if (s <= 1) { clearInterval(timerRef.current); return 0; } return s - 1; });
            }, 1000);
        } else clearInterval(timerRef.current);
        return () => clearInterval(timerRef.current);
    }, [qrPkg]);

    const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const handleLogout = () => {
        localStorage.removeItem('token'); localStorage.removeItem('username');
        setIsLoggedIn(false); setUsername(''); setProfileOpen(false); setCoins(null); setBalance(null);
    };
    const handleLoginSuccess = (name) => { setIsLoggedIn(true); setUsername(name); setModal(null); };
    const handleOverlayClick = (e) => { if (e.target.classList.contains('modal-overlay')) setModal(null); };

    const openConfirm = (pkg) => setConfirmPkg(pkg);
    const closeConfirm = () => setConfirmPkg(null);

    const openQR = async () => {
        const pkg = confirmPkg;
        setQrPkg(pkg); setConfirmPkg(null);
        setSlipFile(null); setSlipPreview(null); setSubmitError('');
        setQrCodeUrl(''); setQrError(''); setQrLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/generate-qr?amount=${parseFloat(pkg.price.replace(',', ''))}`);
            setQrCodeUrl(res.data.qrImage);
        } catch { setQrError('ไม่สามารถสร้าง QR Code ได้ กรุณาลองใหม่'); }
        finally { setQrLoading(false); }
    };
    const closeQR = () => {
        setQrPkg(null); setQrCodeUrl(''); setQrError('');
        setSlipFile(null); setSlipPreview(null); setSubmitError('');
    };
    const closeAll = () => { setShowSuccess(false); setConfirmPkg(null); setQrPkg(null); };
    const handleSlipChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { setSubmitError('ขนาดไฟล์ต้องไม่เกิน 10MB'); return; }
        setSlipFile(file); setSubmitError('');
        const reader = new FileReader();
        reader.onload = (ev) => setSlipPreview(ev.target.result);
        reader.readAsDataURL(file);
    };
    const removeSlip = () => { setSlipFile(null); setSlipPreview(null); if (slipInputRef.current) slipInputRef.current.value = ''; };

    const handleSubmitTopup = async () => {
    if (!slipFile) { setSubmitError('กรุณาแนบสลิปก่อนยืนยัน'); return; }
    const token = localStorage.getItem('token');
    if (!token) { closeQR(); setModal('login'); return; }

    setIsSubmitting(true); 
    setSubmitError('');

    try {
        const fd = new FormData();
        fd.append('package_id', qrPkg.id);
        fd.append('coins', qrPkg.coins);
        fd.append('bonus', qrPkg.bonus || 0);
        fd.append('total_coins', qrPkg.total);
        fd.append('amount', qrPkg.price.replace(',', ''));
        fd.append('slip', slipFile);

        await axios.post('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/topup/request', fd, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });

        const pkg = qrPkg;
        
        // ✨ การจัดการ UI หลังจากสำเร็จ
        setSlipFile(null); 
        setSlipPreview(null);
        if (slipInputRef.current) slipInputRef.current.value = ''; // ล้างค่าที่ช่องเลือกไฟล์

        setSuccessMsg(`ส่งคำขอเติม ${pkg.total.toLocaleString()} เหรียญสำเร็จ!\nแอดมินจะตรวจสอบและเพิ่มเหรียญให้ภายใน 15 นาที 🎉`);
        setShowSuccess(true);
        
        refreshNotifications(token); // อัปเดตแจ้งเตือน
        closeQR(); // ปิดหน้าต่างสแกน

    } catch (err) {
        setSubmitError(err.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally { 
        setIsSubmitting(false); 
    }
};
    return (
        <div className="home-page">
            <Navbar/>

            {/* ══ HERO ══ */}
            <div className="topup-hero">
                <div className="topup-page-inner">
                    <div className="topup-breadcrumb">
                        <span className="topup-breadcrumb-home" onClick={() => navigate('/')}><i className="fas fa-house" style={{ color: '#999' }}></i></span>
                        <i className="fas fa-angle-right" style={{ fontSize: 12, color: '#aaa' }}></i>
                        <span className="topup-breadcrumb-cur">ร้านขายเหรียญ</span>
                    </div>
                    <div className="topup-balance-card">
                        <i className="fa-solid fa-coins topup-balance-icon"></i>
                        <div>
                            <div className="topup-balance-label">เหรียญของฉัน</div>
                            <div className="topup-balance-amount">
                                {balance === null
                                    ? <span className="topup-balance-loading">กำลังโหลด…</span>
                                    : <>{balance.toLocaleString()} <span className="topup-balance-unit">เหรียญ</span></>
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══ MAIN ══ */}
            <div className="topup-main">
                <div className="topup-page-inner">
                    <div className="topup-layout">
                        <div className="topup-shop-left">
                            <div className="topup-section-title">
                                <i className="fa-solid fa-fire" style={{ color: '#ff3b30' }}></i>
                                โปรโมชั่นพิเศษ
                                <span className="topup-badge-hot">🔥 LIMITED</span>
                            </div>
                            <div className="coin-grid coin-grid-2 mb-32">
                                {PROMO_PACKAGES.map(pkg => <PackageCard key={pkg.id} pkg={pkg} onSelect={openConfirm} />)}
                            </div>
                            <div className="topup-section-title">
                                <i className="fa-solid fa-coins" style={{ color: '#f0a500' }}></i>เหรียญ + โบนัส
                            </div>
                            <div className="coin-grid mb-16">
                                {STANDARD_PACKAGES.map(pkg => <PackageCard key={pkg.id} pkg={pkg} onSelect={openConfirm} />)}
                            </div>
                            <button className="topup-show-more" onClick={() => setShowExtra(v => !v)}>
                                <i className={`fas fa-chevron-${showExtra ? 'up' : 'down'}`}></i>
                                {showExtra ? 'ดูน้อยลง' : 'ดูแพ็กเกจเพิ่มเติม'}
                            </button>
                            {showExtra && (
                                <div className="coin-grid mt-16">
                                    {EXTRA_PACKAGES.map(pkg => <PackageCard key={pkg.id} pkg={pkg} onSelect={openConfirm} />)}
                                </div>
                            )}
                        </div>
                        <div className="topup-sidebar">

                            <div className="topup-notice-box">
                                <div className="topup-notice-title">
                                    <i className="fas fa-circle-info" style={{ color: '#b5651d' }}></i> หมายเหตุ
                                </div>
                                <div>• เหรียญที่ซื้อไม่สามารถคืนได้</div>
                                <div>• โบนัสจะได้รับเมื่อชำระเงินสำเร็จ</div>
                                <div>• เหรียญใช้ได้เฉพาะในแอปนี้เท่านั้น</div>
                                <div>• หากมีปัญหาติดต่อ <strong style={{ color: '#b5651d' }}>ฝ่ายสนับสนุน</strong></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══ CONFIRM MODAL ══ */}
            {confirmPkg && (
                <div className="topup-overlay" onClick={e => e.target.classList.contains('topup-overlay') && closeConfirm()}>
                    <div className="topup-modal">
                        <button className="topup-modal-close" onClick={closeConfirm}>✕</button>
                        <div className="topup-confirm-icon">🪙</div>
                        <div className="topup-modal-title">ยืนยันการซื้อ</div>
                        <div className="topup-modal-subtitle">ตรวจสอบรายละเอียดก่อนชำระเงิน</div>
                        <div className="topup-confirm-box">
                            <div className="topup-confirm-row"><span className="label">แพ็กเกจ</span><span className="value">{confirmPkg.coins.toLocaleString()} เหรียญ</span></div>
                            {confirmPkg.bonus > 0 && <div className="topup-confirm-row"><span className="label">โบนัส</span><span className="value" style={{ color: '#4caf50' }}>+{confirmPkg.bonus} เหรียญ</span></div>}
                            <div className="topup-confirm-row"><span className="label">รวมที่ได้รับ</span><span className="value">{confirmPkg.total.toLocaleString()} เหรียญ</span></div>
                            <div className="topup-confirm-row"><span className="label">ยอดชำระ</span><span className="value price">฿{confirmPkg.price}</span></div>
                        </div>
                        <div className="topup-modal-actions">
                            <button className="topup-btn-cancel" onClick={closeConfirm}>ยกเลิก</button>
                            <button className="topup-btn-confirm" onClick={openQR}><i className="fas fa-qrcode" style={{ marginRight: 6 }}></i>ชำระด้วย QR</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ QR + สลิป MODAL ══ */}
            {qrPkg && (
                <div className="topup-overlay" onClick={e => e.target.classList.contains('topup-overlay') && closeQR()}>
                    <div className="topup-modal" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
                        <button className="topup-modal-close" onClick={closeQR}>✕</button>
                        <div className="topup-qr-header"><h2>สแกน QR ชำระเงิน</h2><p>ใช้แอปธนาคารสแกน QR Code เพื่อชำระเงิน</p></div>
                        <div className="topup-qr-amount">
                            <span className="amt">฿{qrPkg.price}</span>
                            <span className="lbl">บาท — {qrPkg.total.toLocaleString()} เหรียญ</span>
                        </div>
                        <div className="topup-qr-wrapper">
                            <div className="topup-qr-frame">
                                {qrLoading && <div className="topup-qr-loading"><i className="fas fa-spinner fa-spin"></i><div>กำลังสร้าง QR…</div></div>}
                                {qrError   && <div className="topup-qr-error"><i className="fas fa-exclamation-triangle"></i><div>{qrError}</div><button className="topup-qr-retry" onClick={openQR}>ลองใหม่</button></div>}
                                {qrCodeUrl && !qrLoading && <img src={qrCodeUrl} alt="PromptPay QR Code" className="topup-qr-real-img" />}
                            </div>
                        </div>
                        <div className="topup-countdown-row">⏱ หมดเวลาใน <span className="topup-countdown-num">{fmtTime(countdown)}</span></div>
                        <div className="topup-qr-steps">
                            {['บัญชี: นายณภัทร เอี่ยมพรม']}
                        </div>
                        <div className="topup-slip-section">
                            <div className="topup-slip-label"><i className="fas fa-receipt"></i>แนบสลิปการโอนเงิน<span className="topup-slip-required">* จำเป็น</span></div>
                            {slipPreview ? (
                                <div className="topup-slip-preview-wrap">
                                    <img src={slipPreview} alt="slip preview" className="topup-slip-preview-img" />
                                    <button className="topup-slip-remove" onClick={removeSlip}>✕ เปลี่ยนรูป</button>
                                </div>
                            ) : (
                                <div className="topup-slip-dropzone" onClick={() => slipInputRef.current?.click()}>
                                    <i className="fas fa-cloud-upload-alt topup-slip-upload-icon"></i>
                                    <div className="topup-slip-upload-text">คลิกเพื่อเลือกสลิป</div>
                                    <div className="topup-slip-upload-hint">JPG, PNG, WebP (สูงสุด 10MB)</div>
                                </div>
                            )}
                            <input ref={slipInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" onChange={handleSlipChange} style={{ display: 'none' }} />
                            {submitError && <div className="topup-slip-error"><i className="fas fa-exclamation-circle"></i> {submitError}</div>}
                        </div>
                        <button 
                            className="topup-btn-done" 
                            onClick={handleSubmitTopup} 
                            disabled={isSubmitting || !slipFile}
                            style={{ 
                                opacity: (!slipFile || isSubmitting) ? 0.55 : 1, 
                                cursor: (!slipFile || isSubmitting) ? 'not-allowed' : 'pointer',
                                marginBottom: '20px' // เพิ่มระยะห่างด้านล่างปุ่ม
                            }}>
                            {isSubmitting ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }}></i>กำลังส่ง…</> : <><i className="fas fa-paper-plane" style={{ marginRight: 6 }}></i>ส่งสลิปยืนยันการชำระ</>}
                        </button>
                       
                    </div>
                </div>
            )}

            {/* ══ SUCCESS ══ */}
            {showSuccess && (
                <div className="topup-success-overlay">
                    <div className="topup-success-box">
                        <div className="topup-success-check">✓</div>
                        <h2>ส่งสลิปสำเร็จ!</h2>
                        <p style={{ whiteSpace: 'pre-line' }}>{successMsg}</p>
                        <button className="topup-btn-ok" onClick={closeAll}>รับทราบ</button>
                    </div>
                </div>
            )}

            {/* ══ LOGIN/REGISTER ══ */}
            {modal && (
                <div className="modal-overlay" onClick={handleOverlayClick}>
                    {modal === 'login'    && <Login    onClose={() => setModal(null)} onSwitch={() => setModal('register')} onLoginSuccess={handleLoginSuccess} />}
                    {modal === 'register' && <Register onClose={() => setModal(null)} onSwitch={() => setModal('login')} />}
                </div>
            )}
        </div>
    );
}

export default Topup;