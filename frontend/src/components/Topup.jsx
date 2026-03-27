import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Login from './login';
import Register from './Register';
import '../assets/topup.css';

// ── ข้อมูล ──────────────────────────────────────────────
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
    { id: 1, icon: '🪙', title: 'เติมเหรียญสำเร็จ', desc: 'คุณได้รับ 150 เหรียญเรียบร้อยแล้ว', time: '5 นาทีที่แล้ว', unread: true },
    { id: 2, icon: '🔥', title: 'โปรโมชั่นพิเศษ!', desc: 'ซื้อเหรียญวันนี้รับโบนัสพิเศษสูงสุด 30%', time: '1 ชั่วโมงที่แล้ว', unread: true },
    { id: 3, icon: '📚', title: 'หนังสือใหม่มาแล้ว', desc: 'Record of Ragnarok เล่ม 12 วางจำหน่ายแล้ว', time: '3 ชั่วโมงที่แล้ว', unread: false },
    { id: 4, icon: '🎉', title: 'ยินดีต้อนรับ!', desc: 'สมัครสมาชิกสำเร็จ รับเหรียญฟรี 20 เหรียญ', time: 'เมื่อวาน', unread: false },
    { id: 5, icon: '💳', title: 'ประวัติการซื้อ', desc: 'คุณซื้อ "นิยายรักสุดขอบฟ้า" เรียบร้อยแล้ว', time: '2 วันที่แล้ว', unread: false },
];

const PROMO_PACKAGES = [
    { id: 'p1', coins: 100, bonus: 50, total: 150, price: '49.00', badge: 'ลด 30%', badgeType: 'sale', icon: 'coins' },
    { id: 'p2', coins: 217, bonus: 80, total: 297, price: '129.00', badge: 'HOT', badgeType: 'hot', icon: 'coins' },
];

const STANDARD_PACKAGES = [
    { id: 's1', coins: 40,   bonus: 0,  total: 40,  price: '19.00',    badge: '',      badgeType: '',        icon: 'coins-dim' },
    { id: 's2', coins: 100,  bonus: 5,  total: 105, price: '49.00',    badge: '',      badgeType: '',        icon: 'coins' },
    { id: 's3', coins: 169,  bonus: 10, total: 179, price: '79.00',    badge: '',      badgeType: '',        icon: 'coins' },
    { id: 's4', coins: 217,  bonus: 10, total: 227, price: '129.00',   badge: 'นิยม', badgeType: 'popular', icon: 'coins' },
    { id: 's5', coins: 350,  bonus: 20, total: 370, price: '249.00',   badge: '',      badgeType: '',        icon: 'coins' },
    { id: 's6', coins: 500,  bonus: 50, total: 550, price: '349.00',   badge: 'ดีที่สุด', badgeType: 'best', icon: 'sack' },
];

const EXTRA_PACKAGES = [
    { id: 'e1', coins: 800,  bonus: 100, total: 900,  price: '549.00',   badge: '',      badgeType: '',     icon: 'gem' },
    { id: 'e2', coins: 1200, bonus: 200, total: 1400, price: '849.00',   badge: 'คุ้มสุด', badgeType: 'best', icon: 'crown' },
    { id: 'e3', coins: 2000, bonus: 500, total: 2500, price: '1,399.00', badge: 'VIP',   badgeType: 'best', icon: 'star' },
];

// ── QR Canvas ─────────────────────────────────────────
function QRCanvas({ price, coins }) {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const size = 180;
        ctx.clearRect(0, 0, size, size);
        const cell = 5;
        const cols = size / cell;
        ctx.fillStyle = '#1a1a1a';
        let seed = price.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + coins * 37;
        function rand() { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; }
        for (let r = 0; r < cols; r++) {
            for (let c = 0; c < cols; c++) {
                const inFinder = (r < 7 && c < 7) || (r < 7 && c >= cols - 7) || (r >= cols - 7 && c < 7);
                const inFinderInner = (r >= 2 && r <= 4 && c >= 2 && c <= 4) || (r >= 2 && r <= 4 && c >= cols - 5 && c <= cols - 3) || (r >= cols - 5 && r <= cols - 3 && c >= 2 && c <= 4);
                const inFinderBorder = ((r === 0 || r === 6) && c <= 6) || ((c === 0 || c === 6) && r <= 6) || ((r === 0 || r === 6) && c >= cols - 7) || ((c === cols - 1 || c === cols - 7) && r <= 6) || ((r === cols - 1 || r === cols - 7) && c <= 6) || ((c === 0 || c === 6) && r >= cols - 7);
                let fill = false;
                if (inFinderBorder) fill = true;
                else if (inFinderInner) fill = true;
                else if (!inFinder) fill = rand() > 0.5;
                if (fill) ctx.fillRect(c * cell, r * cell, cell - 0.5, cell - 0.5);
            }
        }
        ctx.fillStyle = 'white';
        ctx.fillRect(size / 2 - 21, size / 2 - 21, 42, 42);
    }, [price, coins]);
    return <canvas ref={canvasRef} width={180} height={180} />;
}

// ── PackageCard ────────────────────────────────────────
function PackageCard({ pkg, onSelect }) {
    const iconMap = {
        coins:     <i className="fa-solid fa-coins" style={{ color: '#f0a500' }}></i>,
        'coins-dim': <i className="fa-solid fa-coins" style={{ color: '#cda63a' }}></i>,
        sack:      <i className="fa-solid fa-sack-dollar" style={{ color: '#e65100' }}></i>,
        gem:       <i className="fa-solid fa-gem" style={{ color: '#2196f3' }}></i>,
        crown:     <i className="fa-solid fa-crown" style={{ color: '#f0a500' }}></i>,
        star:      <i className="fa-solid fa-star" style={{ color: '#ff9800' }}></i>,
    };
    const badgeColorMap = {
        sale: '#b5651d', hot: '#9c27b0', popular: '#2e7d32', best: '#8B4513',
    };

    return (
        <div className="coin-card" onClick={() => onSelect(pkg)}>
            {pkg.badge && (
                <div className="card-badge" style={{ background: badgeColorMap[pkg.badgeType] || '#2e7d32' }}>
                    {pkg.badge}
                </div>
            )}
            <div className="coin-card-icon">{iconMap[pkg.icon]}</div>
            <div className="coin-card-amount">{pkg.coins.toLocaleString()}</div>
            {pkg.bonus > 0 && <div className="coin-card-bonus">+{pkg.bonus} โบนัส</div>}
            <div className="coin-card-total">{pkg.bonus > 0 ? `รวม ${pkg.total.toLocaleString()} เหรียญ` : 'เหรียญพื้นฐาน'}</div>
            <button className="coin-card-price" onClick={e => { e.stopPropagation(); onSelect(pkg); }}>
                ฿{pkg.price}
            </button>
        </div>
    );
}

// ── Topup (Main Page) ──────────────────────────────────
function Topup() {
    const navigate = useNavigate();

    // auth state
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername]     = useState('');
    const [modal, setModal]           = useState(null); // 'login' | 'register' | null
    const [balance, setBalance]       = useState(null); // null = loading, 0+ = loaded
    const [coins, setCoins]           = useState(null); // สำหรับ navbar

    // navbar state
    const [megaOpen, setMegaOpen]       = useState(false);
    const [hoveredMenu, setHoveredMenu] = useState(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [notifOpen, setNotifOpen]     = useState(false);
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
    const [activeTab, setActiveTab]     = useState('อีบุ๊กทั่วไป');
    const megaRef    = useRef(null);
    const profileRef = useRef(null);
    const notifRef   = useRef(null);
    const coinInterval = useRef(null);

    // topup state
    const [showExtra, setShowExtra]         = useState(false);
    const [promoCode, setPromoCode]         = useState('');
    const [confirmPkg, setConfirmPkg]       = useState(null);  // package being confirmed
    const [qrPkg, setQrPkg]                = useState(null);   // package in QR modal
    const [successMsg, setSuccessMsg]       = useState('');
    const [showSuccess, setShowSuccess]     = useState(false);
    const [countdown, setCountdown]         = useState(900);
    const timerRef = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const user  = localStorage.getItem('username');
        if (token) { setIsLoggedIn(true); if (user) setUsername(user); }
    }, []);

    // Fetch coins จาก API และ poll ทุก 30 วินาที (real-time)
    useEffect(() => {
        const fetchCoins = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const res = await axios.get('http://localhost:3001/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const amt = res.data.coins ?? 0;
                setCoins(amt);
                setBalance(amt);
            } catch {
                setCoins(0);
                setBalance(0);
            }
        };
        if (isLoggedIn) {
            fetchCoins();
            coinInterval.current = setInterval(fetchCoins, 30000);
        } else {
            setCoins(null);
            setBalance(null);
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

    // countdown
    useEffect(() => {
        if (qrPkg) {
            setCountdown(900);
            timerRef.current = setInterval(() => {
                setCountdown(s => { if (s <= 1) { clearInterval(timerRef.current); return 0; } return s - 1; });
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [qrPkg]);

    const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        setIsLoggedIn(false); setUsername(''); setProfileOpen(false); setCoins(null); setBalance(null);
    };
    const handleLoginSuccess = (name) => {
        setIsLoggedIn(true); setUsername(name); setModal(null);
    };
    const handleOverlayClick = (e) => {
        if (e.target.classList.contains('modal-overlay')) setModal(null);
    };

    const openConfirm = (pkg) => setConfirmPkg(pkg);
    const closeConfirm = () => setConfirmPkg(null);
    const openQR = () => { setQrPkg(confirmPkg); setConfirmPkg(null); };
    const closeQR = () => setQrPkg(null);
    const simulateSuccess = () => {
        const newTotal = (balance ?? 0) + qrPkg.total;
        setBalance(newTotal);
        setCoins(newTotal);
        setSuccessMsg(`คุณได้รับ ${qrPkg.total.toLocaleString()} เหรียญแล้ว ขอบคุณที่ใช้บริการ 🎉`);
        setQrPkg(null);
        setShowSuccess(true);
    };
    const closeAll = () => { setShowSuccess(false); setConfirmPkg(null); setQrPkg(null); };

    return (
        <div className="home-page">

            {/* ══ NAVBAR  ══ */}
            <header className="navbar">
                <div className="navbar-inner">
                    <div className="nav-left">
                        <div className="nav-logo">
                            <div className="nav-logo-box" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
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
                                                    <button className="notif-markall" onClick={markAllRead}>
                                                        อ่านทั้งหมด
                                                    </button>
                                                )}
                                            </div>
                                            <div className="notif-list">
                                                {notifications.map(n => (
                                                    <div
                                                        key={n.id}
                                                        className={`notif-item ${n.unread ? 'unread' : ''}`}
                                                        onClick={() => markOneRead(n.id)}
                                                    >
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
                                            <div className="notif-footer">ดูการแจ้งเตือนทั้งหมด</div>
                                        </div>
                                    )}
                                </div>
                                <button className="nav-icon-btn pos-rel"><i className="fas fa-heart"></i></button>
                                <button className="nav-icon-btn pos-rel"><i className="fas fa-shopping-cart"></i></button>
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
                                            <div className="pd-item"><i className="fas fa-layer-group"></i> ชั้นหนังสือ</div>
                                            <div className="pd-item" onClick={() => navigate('/history')}><i className="fas fa-history"></i> ประวัติซื้อ</div>
                                            <div className="pd-item" onClick={() => navigate('/topup')}><i className="fas fa-coins"></i> ซื้อเหรียญ</div>
                                            <div className="pd-divider"></div>
                                            <div className="pd-item" onClick={() => navigate('/settingprofile')}><i className="fas fa-cog" ></i> ตั้งค่าบัญชี</div>
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
            {/* ══ HERO ══ */}
            <div className="topup-hero">
                <div className="topup-page-inner">
                    <div className="topup-breadcrumb">
                        <span className="topup-breadcrumb-home" onClick={() => navigate('/')}>
                            <i className="fas fa-house"></i>
                        </span>
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

                        {/* LEFT */}
                        <div className="topup-shop-left">

                            {/* โปรโมชั่น */}
                            <div className="topup-section-title">
                                <i className="fa-solid fa-fire" style={{ color: '#ff3b30' }}></i>
                                โปรโมชั่นพิเศษ
                                <span className="topup-badge-hot">🔥 LIMITED</span>
                            </div>
                            <div className="coin-grid coin-grid-2 mb-32">
                                {PROMO_PACKAGES.map(pkg => (
                                    <PackageCard key={pkg.id} pkg={pkg} onSelect={openConfirm} />
                                ))}
                            </div>

                            {/* มาตรฐาน */}
                            <div className="topup-section-title">
                                <i className="fa-solid fa-coins" style={{ color: '#f0a500' }}></i>
                                เหรียญ + โบนัส
                            </div>
                            <div className="coin-grid mb-16">
                                {STANDARD_PACKAGES.map(pkg => (
                                    <PackageCard key={pkg.id} pkg={pkg} onSelect={openConfirm} />
                                ))}
                            </div>

                            {/* ดูเพิ่มเติม */}
                            <button className="topup-show-more" onClick={() => setShowExtra(v => !v)}>
                                <i className={`fas fa-chevron-${showExtra ? 'up' : 'down'}`}></i>
                                {showExtra ? 'ดูน้อยลง' : 'ดูแพ็กเกจเพิ่มเติม'}
                            </button>
                            {showExtra && (
                                <div className="coin-grid mt-16">
                                    {EXTRA_PACKAGES.map(pkg => (
                                        <PackageCard key={pkg.id} pkg={pkg} onSelect={openConfirm} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* SIDEBAR */}
                        <div className="topup-sidebar">
                            <div className="topup-promo-box">
                                <div className="topup-section-title" style={{ marginBottom: 4, fontSize: 15 }}>
                                    <i className="fas fa-tag" style={{ color: '#b5651d' }}></i> โค้ดส่วนลด
                                </div>
                                <div style={{ fontSize: 12, color: '#aaa', marginBottom: 10 }}>กรอกโค้ดเพื่อรับส่วนลดพิเศษ</div>
                                <div className="topup-promo-row">
                                    <input
                                        type="text"
                                        placeholder="เช่น COIN20"
                                        value={promoCode}
                                        onChange={e => setPromoCode(e.target.value)}
                                    />
                                    <button onClick={() => alert('ตรวจสอบโค้ดแล้ว!')}>ใช้</button>
                                </div>
                            </div>
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
                        <div className="topup-modal-subtitle">กรุณาตรวจสอบรายละเอียดก่อนชำระเงิน</div>
                        <div className="topup-confirm-box">
                            <div className="topup-confirm-row">
                                <span className="label">รายการ</span>
                                <span className="value">เหรียญ {confirmPkg.total.toLocaleString()} เหรียญ</span>
                            </div>
                            <div className="topup-confirm-row">
                                <span className="label">บัญชี</span>
                                <span className="value">{isLoggedIn ? username : 'Guest'}</span>
                            </div>
                            <div className="topup-confirm-row">
                                <span className="label">ยอดชำระ</span>
                                <span className="value price">฿{confirmPkg.price} บาท</span>
                            </div>
                        </div>
                        <div className="topup-modal-actions">
                            <button className="topup-btn-cancel" onClick={closeConfirm}>ยกเลิก</button>
                            <button className="topup-btn-confirm" onClick={openQR}>✔ ยืนยันชำระเงิน</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ QR MODAL ══ */}
            {qrPkg && (
                <div className="topup-overlay" onClick={e => e.target.classList.contains('topup-overlay') && closeQR()}>
                    <div className="topup-modal" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
                        <button className="topup-modal-close" onClick={closeQR}>✕</button>
                        <div className="topup-qr-header">
                            <h2>สแกน QR ชำระเงิน</h2>
                            <p>ใช้แอปธนาคารสแกน QR Code เพื่อชำระเงิน</p>
                        </div>
                        <div className="topup-qr-amount">
                            <span className="amt">฿{qrPkg.price}</span>
                            <span className="lbl">บาท (Thai Baht)</span>
                        </div>
                        <div className="topup-qr-wrapper">
                            <div className="topup-qr-frame">
                                <QRCanvas price={qrPkg.price} coins={qrPkg.total} />
                                <div className="topup-qr-logo">🪙</div>
                            </div>
                        </div>
                        <div className="topup-countdown-row">
                            ⏱ หมดเวลาใน <span className="topup-countdown-num">{fmtTime(countdown)}</span>
                        </div>
                        <div className="topup-qr-steps">
                            {['เปิดแอปธนาคารของคุณ','เลือก "สแกน QR" หรือ "จ่ายเงิน"','สแกน QR Code และยืนยันการชำระ','รอรับเหรียญภายใน 1-5 นาที'].map((s, i) => (
                                <div key={i} className="topup-step"><div className="num">{i + 1}</div><div>{s}</div></div>
                            ))}
                        </div>
                        <button className="topup-btn-done" onClick={simulateSuccess}>ฉันชำระเงินแล้ว</button>
                    </div>
                </div>
            )}

            {/* ══ SUCCESS ══ */}
            {showSuccess && (
                <div className="topup-success-overlay">
                    <div className="topup-success-box">
                        <div className="topup-success-check">✓</div>
                        <h2>ชำระเงินสำเร็จ!</h2>
                        <p>{successMsg}</p>
                        <button className="topup-btn-ok" onClick={closeAll}>กลับหน้าหลัก</button>
                    </div>
                </div>
            )}

            {/* ══ LOGIN/REGISTER MODAL ══ */}
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

export default Topup;