import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import '../assets/admintopup.css'; 
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
    try { return new Set(JSON.parse(localStorage.getItem('notif_read_ids') || '[]')); }
    catch { return new Set(); }
}
function saveReadId(id) {
    try {
        const s = loadReadIds(); s.add(id);
        localStorage.setItem('notif_read_ids', JSON.stringify([...s].slice(-200)));
    } catch {}
}

function AdminTopup() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // ── Navbar state (เหมือน Topup) ──
    const [isLoggedIn, setIsLoggedIn]     = useState(false);
    const [username, setUsername]         = useState('');
    const [profileImage, setProfileImage] = useState(null);
    const [role, setRole]                 = useState(null);
    const [coins, setCoins]               = useState(null);
    const [cartCount, setCartCount]       = useState(0);
    const [favoriteIds, setFavoriteIds]   = useState([]);
    const [navSearch, setNavSearch]       = useState('');
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

    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedRole = localStorage.getItem('role');
        const user  = localStorage.getItem('username');
        if (!token || savedRole !== 'admin') { navigate('/'); return; }
        setIsLoggedIn(true);
        if (user) setUsername(user);
        setRole(savedRole);
        fetchRequests();
    }, [navigate]);

    useEffect(() => {
        axios.get('http://localhost:3001/books/categories')
            .then(res => setDbCategories(res.data)).catch(() => {});
    }, []);

    useEffect(() => {
        const h = (e) => {
            if (megaRef.current    && !megaRef.current.contains(e.target))    setMegaOpen(false);
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
            if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    useEffect(() => {
        if (!isLoggedIn) { setCoins(null); clearInterval(coinInterval.current); return; }
        const token = localStorage.getItem('token');
        const fetchProfile = async () => {
            try {
                const res = await axios.get('http://localhost:3001/profile', { headers: { Authorization: `Bearer ${token}` } });
                setCoins(res.data.coins ?? 0);
                setProfileImage(res.data.image || null);
            } catch { setCoins(0); }
        };
        fetchProfile();
        refreshNotifications(token);
        axios.get('http://localhost:3001/favorites', { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setFavoriteIds(res.data.map(i => i.book_id))).catch(() => {});
        axios.get('http://localhost:3001/cart', { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setCartCount(res.data.length)).catch(() => {});
        coinInterval.current = setInterval(fetchProfile, 30000);
        return () => clearInterval(coinInterval.current);
    }, [isLoggedIn]);

    const refreshNotifications = async (token) => {
        const headers = { Authorization: `Bearer ${token}` };
        const readIds = loadReadIds();
        try {
            const [topupRes, histRes] = await Promise.all([
                axios.get('http://localhost:3001/topup/my-requests', { headers }).catch(() => ({ data: [] })),
                axios.get('http://localhost:3001/history', { headers }).catch(() => ({ data: [] })),
            ]);
            const notifs = [];
            topupRes.data.forEach(t => {
                const nid   = `topup-${t.id}`;
                const title = t.status === 'approved'
                    ? `เติมเหรียญสำเร็จ +${Number(t.total_coins).toLocaleString()} เหรียญ`
                    : t.status === 'rejected' ? 'คำขอเติมเหรียญถูกปฏิเสธ' : 'คำขอเติมเหรียญรอการตรวจสอบ';
                const desc  = t.status === 'approved'
                    ? `ชำระ ฿${t.amount} — รับ ${Number(t.total_coins).toLocaleString()} เหรียญแล้ว`
                    : t.status === 'rejected' ? (t.note || 'กรุณาติดต่อฝ่ายสนับสนุน')
                    : `แพ็กเกจ ฿${t.amount} — รอแอดมินตรวจสอบ`;
                notifs.push({ id: nid, title, desc, time: formatTime(t.created_at), unread: !readIds.has(nid) && t.status === 'approved' });
            });
            histRes.data.slice(0, 8).forEach(h => {
                const nid   = `hist-${h.id}`;
                const title = h.type === 'book' ? 'ซื้อหนังสือสำเร็จ' : 'เติมเหรียญสำเร็จ';
                notifs.push({ id: nid, title, desc: h.title, time: formatTime(h.purchased_at), unread: false });
            });
            setNotifications(notifs.slice(0, 20));
        } catch {}
    };

    const unreadCount = notifications.filter(n => n.unread).length;
    const markAllRead = () => setNotifications(prev => prev.map(n => { if (n.unread) saveReadId(n.id); return { ...n, unread: false }; }));
    const markOneRead = (id) => { saveReadId(id); setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n)); };

    const handleLogout = () => {
        localStorage.removeItem('token'); localStorage.removeItem('username');
        setIsLoggedIn(false); setUsername(''); setProfileOpen(false); setCoins(null);
        navigate('/');
    };

    // ── Admin topup logic ──
    const fetchRequests = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:3001/admin/topups', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(res.data);
        } catch (error) {
            console.error("Error fetching topups", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        // ใช้ SweetAlert2 แทน window.confirm
        const result = await Swal.fire({
            title: 'ยืนยันการอนุมัติ?',
            text: "แน่ใจหรือไม่ว่าได้รับยอดเงินเข้าบัญชีเรียบร้อยแล้ว?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#4CAF50',
            cancelButtonColor: '#d33',
            confirmButtonText: 'ใช่, อนุมัติเลย',
            cancelButtonText: 'ยกเลิก'
        });

        if (!result.isConfirmed) return;

        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:3001/admin/topups/${id}/approve`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // แจ้งเตือนสำเร็จ
            Swal.fire({
                title: 'สำเร็จ!',
                text: 'อนุมัติเรียบร้อย ระบบเพิ่มเหรียญให้ผู้ใช้แล้ว',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            fetchRequests();
        } catch (error) {
            Swal.fire('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการอนุมัติ', 'error');
        }
    };

    const handleReject = async (id) => {
        // ใช้ SweetAlert2 แทน window.prompt
        const { value: note } = await Swal.fire({
            title: 'ปฏิเสธคำขอ',
            input: 'text',
            inputLabel: 'ระบุเหตุผลที่ปฏิเสธ (เช่น สลิปไม่ชัดเจน / ยอดเงินไม่ตรง):',
            inputValue: 'สลิปไม่ถูกต้อง หรือยอดเงินไม่เข้าบัญชี',
            showCancelButton: true,
            confirmButtonText: 'ยืนยันการปฏิเสธ',
            cancelButtonText: 'ยกเลิก',
            cancelButtonColor: 'gray',
            confirmButtonColor: '#F44336',
            inputValidator: (value) => {
                if (!value) return 'กรุณาระบุเหตุผลในการปฏิเสธ!';
            }
        });

        if (!note) return;

        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:3001/admin/topups/${id}/reject`, { note }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // แจ้งเตือนปฏิเสธสำเร็จ
            Swal.fire({
                title: 'ปฏิเสธสำเร็จ',
                text: 'ปฏิเสธคำขอเรียบร้อยแล้ว',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            fetchRequests();
        } catch (error) {
            Swal.fire('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการปฏิเสธ', 'error');
        }
    };

    return (
        <div className="home-page shelf-page">
            <Navbar />
            {/* ══ HERO (คงเดิม) ══ */}
            <div className="topup-hero">
                <div className="topup-page-inner">
                    <div className="topup-breadcrumb">
                        <span className="topup-breadcrumb-home" onClick={() => navigate('/')}><i className="fas fa-house" style={{ color: '#999' }}></i></span>
                        <i className="fas fa-angle-right" style={{ fontSize: 12, color: '#aaa', margin: '0 8px' }}></i>
                        <span className="topup-breadcrumb-cur">ตรวจสอบสลิป (Admin)</span>
                    </div>
                </div>
            </div>

            {/* ══ MAIN CONTENT (ใช้ CSS Classes แทน Inline) ══ */}
            <div className="admin-topup-container">
                <h2 className="admin-topup-title">
                    <i className="fas fa-money-check-alt"></i> ตรวจสอบการแจ้งชำระเงิน (Top-up)
                </h2>

                {loading ? (
                    <p>กำลังโหลดข้อมูล...</p>
                ) : requests.length === 0 ? (
                    <div className="admin-topup-empty">
                        <i className="fas fa-check-circle admin-topup-empty-icon"></i>
                        <h3>ไม่มีรายการรอตรวจสอบ</h3>
                        <p>เคลียร์งานหมดแล้ว เยี่ยมมาก!</p>
                    </div>
                ) : (
                    <div className="admin-topup-grid">
                        {requests.map(req => (
                            <div key={req.id} className="admin-topup-card">
                                <div className="admin-topup-card-header">
                                    <strong><i className="fas fa-user"></i> {req.username}</strong>
                                    <span className="admin-topup-date">{new Date(req.created_at).toLocaleString()}</span>
                                </div>
                                <p><strong>แพ็กเกจ:</strong> {req.package_id} (ได้ {req.coins} เหรียญ)</p>
                                <p>
                                    <strong>ยอดที่ต้องโอน:</strong> 
                                    <span className="admin-topup-amount">{req.amount} บาท</span>
                                </p>
                                <div className="admin-topup-img-wrapper">
                                    <p className="admin-topup-img-caption">รูปสลิปหลักฐาน:</p>
                                    <img
                                        src={`http://localhost:3001${req.slip_image}`}
                                        alt="Slip"
                                        className="admin-topup-slip"
                                        onClick={() => window.open(`http://localhost:3001${req.slip_image}`, '_blank')}
                                    />
                                </div>
                                <div className="admin-topup-actions">
                                    <button className="btn-approve" onClick={() => handleApprove(req.id)}>
                                        <i className="fas fa-check"></i> อนุมัติ
                                    </button>
                                    <button className="btn-reject" onClick={() => handleReject(req.id)}>
                                        <i className="fas fa-times"></i> ปฏิเสธ
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

export default AdminTopup;