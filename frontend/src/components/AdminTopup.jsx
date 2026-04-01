import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import '../assets/admintopup.css'; 
import Navbar from './navbar';

// ── ฟังก์ชันเดียวกับ navbar.jsx ──────────────────────────────────────────────
// แปลง SQLite datetime string → Date object ให้ถูก timezone
// SQLite ส่งมาเป็น "2026-03-31 08:06:00" (UTC, ไม่มี Z) → ต้องเติม Z
function parseSQLiteDate(dateStr) {
    if (!dateStr) return null;
    // ถ้ายังไม่มี T หรือ Z ให้แปลง space → T และเติม Z
    const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
}

function formatTime(dateStr) {
    if (!dateStr) return '';
    const date = parseSQLiteDate(dateStr);
    if (!date) return '';

    const diff = Date.now() - date.getTime();
    const min  = Math.floor(diff / 60000);

    if (diff >= 24 * 60 * 60 * 1000) {
        const day   = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year  = date.getFullYear() + 543;
        const hh    = String(date.getHours()).padStart(2, '0');
        const mm    = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hh}:${mm}`;
    }
    if (min < 1)  return 'เมื่อกี้';
    if (min < 60) return `${min} นาทีที่แล้ว`;
    const hr = Math.floor(min / 60);
    return `${hr} ชั่วโมงที่แล้ว`;
}

// แสดงวันที่แบบเต็ม วัน/เดือน/ปี(พ.ศ.) เวลา สำหรับตารางข้อมูล
function formatFullDate(dateStr) {
    if (!dateStr) return '-';
    const date = parseSQLiteDate(dateStr);
    if (!date) return '-';
    const day   = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year  = date.getFullYear() + 543;
    const hh    = String(date.getHours()).padStart(2, '0');
    const mm    = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hh}:${mm}`;
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

function buildNotifications(topupData, newChapterData = [], userNotifData = [], readIds = new Set()) {
    const notifs = [];

    // ตอนใหม่
    newChapterData.forEach(c => {
        const nid = `newchap-${c.chapter_id}`;
        notifs.push({
            id: nid,
            title: `มีตอนใหม่: ${c.book_title}`,
            desc: `ตอนที่ ${c.chapter_number}${c.chapter_title ? ` — ${c.chapter_title}` : ''} เพิ่งเผยแพร่แล้ว`,
            time: formatTime(c.published_at),
            unread: !readIds.has(nid),
            tag: 'new_chapter',
            book_id: c.book_id,
        });
    });

    // user_notifications จาก server (approved / rejected)
    userNotifData.forEach(n => {
        const nid = `usernotif-${n.id}`;
        notifs.push({
            id: nid,
            title: n.title,
            desc: n.message || '',
            time: formatTime(n.created_at),
            unread: !n.is_read,
            tag: n.type,
            serverNotifId: n.id,
        });
    });

    // topup ที่ยัง pending (ยังไม่มีใน user_notifications)
    const coveredRefIds = new Set(userNotifData.map(n => n.ref_id).filter(Boolean));
    topupData.forEach(t => {
        if (t.status === 'pending' && !coveredRefIds.has(t.id)) {
            const nid = `topup-${t.id}`;
            notifs.push({
                id: nid,
                title: 'คำขอเติมเหรียญรอการตรวจสอบ',
                desc: `แพ็กเกจ ฿${t.amount} — รอแอดมินตรวจสอบ`,
                time: formatTime(t.created_at),
                unread: false,
                tag: 'topup_pending',
            });
        }
    });

    return notifs.slice(0, 20);
}

function AdminTopup() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading]   = useState(true);
    const navigate = useNavigate();

    // ── Navbar state ──
    const [isLoggedIn, setIsLoggedIn]       = useState(false);
    const [username, setUsername]           = useState('');
    const [profileImage, setProfileImage]   = useState(null);
    const [role, setRole]                   = useState(null);
    const [coins, setCoins]                 = useState(null);
    const [cartCount, setCartCount]         = useState(0);
    const [favoriteIds, setFavoriteIds]     = useState([]);
    const [navSearch, setNavSearch]         = useState('');
    const [megaOpen, setMegaOpen]           = useState(false);
    const [hoveredMenu, setHoveredMenu]     = useState(null);
    const [dbCategories, setDbCategories]   = useState({ novel: [], manga: [] });
    const [profileOpen, setProfileOpen]     = useState(false);
    const [notifOpen, setNotifOpen]         = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [adminNotifications, setAdminNotifications] = useState([]);

    const megaRef    = useRef(null);
    const profileRef = useRef(null);
    const notifRef   = useRef(null);
    const coinInterval = useRef(null);

    // ── Init ──
    useEffect(() => {
        const token     = localStorage.getItem('token');
        const savedRole = localStorage.getItem('role');
        const user      = localStorage.getItem('username');
        if (!token || savedRole !== 'admin') { navigate('/'); return; }
        setIsLoggedIn(true);
        if (user) setUsername(user);
        setRole(savedRole);
        fetchRequests();
    }, [navigate]);

    useEffect(() => {
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/books/categories`)
            .then(res => setDbCategories(res.data)).catch(() => {});
    }, []);

    // ── Close dropdowns on outside click ──
    useEffect(() => {
        const h = (e) => {
            if (megaRef.current    && !megaRef.current.contains(e.target))    setMegaOpen(false);
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
            if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    // ── Profile + Notifications + Polling ──
    useEffect(() => {
        if (!isLoggedIn) { setCoins(null); clearInterval(coinInterval.current); return; }
        const token = localStorage.getItem('token');

        const fetchProfile = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/profile`, { headers: { Authorization: `Bearer ${token}` } });
                setCoins(res.data.coins ?? 0);
                setProfileImage(res.data.image || null);
            } catch { setCoins(0); }
        };

        fetchProfile();
        refreshNotifications(token);
        refreshAdminNotifications(token);

        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/favorites`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setFavoriteIds(res.data.map(i => i.book_id))).catch(() => {});
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/cart`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setCartCount(res.data.length)).catch(() => {});

        // Polling ทุก 30s
        coinInterval.current = setInterval(() => {
            fetchProfile();
            refreshAdminNotifications(token);
        }, 30000);
        return () => clearInterval(coinInterval.current);
    }, [isLoggedIn]);

    // ── Notification helpers (sync กับ navbar.jsx) ──
    const refreshNotifications = async (token) => {
        const headers = { Authorization: `Bearer ${token}` };
        const readIds = loadReadIds();
        const [topupRes, newChapRes, userNotifRes] = await Promise.all([
            axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/topup/my-requests`, { headers }).catch(() => ({ data: [] })),
            axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/notifications/new-chapters`, { headers }).catch(() => ({ data: [] })),
            axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/user/notifications`, { headers }).catch(() => ({ data: [] })),
        ]);
        setNotifications(buildNotifications(topupRes.data, newChapRes.data, userNotifRes.data, readIds));
    };

    const refreshAdminNotifications = async (token) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/admin/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAdminNotifications(res.data);
        } catch {}
    };

    const unreadCount = notifications.filter(n => n.unread).length
        + adminNotifications.filter(n => !n.is_read).length;

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => { if (n.unread) saveReadId(n.id); return { ...n, unread: false }; }));
        const token = localStorage.getItem('token');
        if (token) {
            axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/user/notifications/read-all`, {},
                { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        }
        markAdminAllRead();
    };

    const markAdminAllRead = async () => {
        const token = localStorage.getItem('token');
        setAdminNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/admin/notifications/read-all`, {},
            { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    };

    const markAdminOneRead = async (notif) => {
        const token = localStorage.getItem('token');
        setAdminNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: 1 } : n));
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/admin/notifications/${notif.id}/read`, {},
            { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        if (notif.type === 'topup_pending') {
            setNotifOpen(false);
        }
    };

    const markOneRead = (id) => {
        saveReadId(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
        const notif  = notifications.find(n => n.id === id);
        const token  = localStorage.getItem('token');
        if (notif && notif.serverNotifId && token) {
            axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/user/notifications/${notif.serverNotifId}/read`, {},
                { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token'); localStorage.removeItem('username');
        setIsLoggedIn(false); setUsername(''); setProfileOpen(false); setCoins(null);
        navigate('/');
    };

    // ── Admin topup logic ──
    const fetchRequests = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/admin/topups`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(res.data);
            return res.data;
        } catch (error) {
            console.error("Error fetching topups", error);
            return [];
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
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
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/admin/topups/${id}/approve`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // ลบการ์ดออกจาก list ทันที (optimistic ทำไปแล้ว แต่ confirm อีกรอบ)
            setRequests(prev => prev.filter(r => r.id !== id));
            // refresh admin notifications ใน navbar ทันที
            refreshAdminNotifications(token);
            // บอก navbar component แยก (ถ้ามี) ให้ refresh ด้วย
            window.dispatchEvent(new CustomEvent('topup-action'));
            Swal.fire({
                title: 'สำเร็จ!',
                text: 'อนุมัติเรียบร้อย ระบบเพิ่มเหรียญและแจ้งเตือน user แล้ว',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error("Approve error:", error.response?.status, error.response?.data || error.message);
            const status = error.response?.status;
            if (status === 404) { await fetchRequests(); return; }
            let detail = error.response?.data?.message || error.message || 'ไม่ทราบสาเหตุ';
            if (status === 401) detail = 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่';
            else if (status === 403) detail = 'ไม่มีสิทธิ์ admin หรือ Token ผิด';
            // คืนการ์ดกลับถ้า error จริง
            await fetchRequests();
            Swal.fire('ข้อผิดพลาด', detail, 'error');
        }
    };

    const handleReject = async (id) => {
        const result = await Swal.fire({
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
                if (!value || !value.trim()) return 'กรุณาระบุเหตุผลในการปฏิเสธ!';
            }
        });

        // ถ้ากด Cancel หรือปิด dialog → result.isConfirmed จะเป็น false
        if (!result.isConfirmed || !result.value) return;

        const note = result.value.trim();

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                Swal.fire('ข้อผิดพลาด', 'ไม่พบ Token กรุณาเข้าสู่ระบบใหม่', 'error');
                await fetchRequests();
                return;
            }
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/admin/topups/${id}/reject`, { note }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // ลบการ์ดออกจาก list ทันที
            setRequests(prev => prev.filter(r => r.id !== id));
            // refresh admin notifications ใน navbar ทันที
            refreshAdminNotifications(token);
            // บอก navbar component แยก (ถ้ามี) ให้ refresh ด้วย
            window.dispatchEvent(new CustomEvent('topup-action'));
            Swal.fire({
                title: 'ปฏิเสธสำเร็จ',
                text: 'ปฏิเสธคำขอและแจ้งเตือน user เรียบร้อยแล้ว',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error("Reject error:", error.response?.status, error.response?.data || error.message);
            const status = error.response?.status;
            const errMsg = error.response?.data?.message || error.message || 'ไม่ทราบสาเหตุ';

            // 404 = request ถูกดำเนินการไปแล้ว (ไม่ใช่ pending อีกต่อไป)
            // → refresh list ให้การ์ดหายออกไป โดยไม่ต้องแสดง error
            if (status === 404) {
                fetchRequests();
                return;
            }

            let detail = errMsg;
            if (status === 401) detail = 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่';
            else if (status === 403) detail = 'ไม่มีสิทธิ์ admin หรือ Token ผิด';
            else if (status === 500) detail = `Server error: ${errMsg}`;

            Swal.fire('ข้อผิดพลาด', detail, 'error');
        }
    };

    return (
        <div className="home-page shelf-page">
            <Navbar />
            <div className="topup-hero">
                <div className="topup-page-inner">
                    <div className="topup-breadcrumb">
                        <span className="topup-breadcrumb-home" onClick={() => navigate('/')}><i className="fas fa-house" style={{ color: '#999' }}></i></span>
                        <i className="fas fa-angle-right" style={{ fontSize: 12, color: '#aaa', margin: '0 8px' }}></i>
                        <span className="topup-breadcrumb-cur">ตรวจสอบสลิป (Admin)</span>
                    </div>
                </div>
            </div>

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
                                    {/* ✅ ใช้ formatFullDate แสดง วัน/เดือน/ปี(พ.ศ.) เวลา */}
                                    <span className="admin-topup-date">{formatFullDate(req.created_at)}</span>
                                </div>
                                <p><strong>แพ็กเกจ:</strong> {req.package_id} (ได้ {Number(req.total_coins || req.coins).toLocaleString()} เหรียญ)</p>
                                <p>
                                    <strong>ยอดที่ต้องโอน:</strong>
                                    <span className="admin-topup-amount"> {req.amount} บาท</span>
                                </p>
                                <div className="admin-topup-img-wrapper">
                                    <p className="admin-topup-img-caption">รูปสลิปหลักฐาน:</p>
                                    <img
                                        src={req.slip_image}
                                        alt="Slip"
                                        className="admin-topup-slip"
                                        onClick={() => window.open(req.slip_image, '_blank')}
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