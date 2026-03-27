import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/settingprofile.css'; 

// ── Constants สำหรับ Navbar (ก๊อปมาให้เหมือนกันทุกหน้า) ──
const MENU_ITEMS = [
    { label: 'นิยาย', subs: ['นิยายรักโรแมนติก','นิยายวาย','นิยายแฟนตาซี','นิยายสืบสวน','นิยายกำลังภายใน', 'ไลท์โนเวล','วรรณกรรมทั่วไป','นิยายยูริ','กวีนิพนธ์','แฟนเฟิค'] },
    { label: 'การ์ตูน', subs: [] },
    { label: 'อีบุ๊กทั่วไป', subs: [] },
    { label: 'นิตยสาร', subs: [] },
    { label: 'หนังสือพิมพ์', subs: [] },
    { label: 'อีบุ๊กจัดชุด', subs: [] },
];
const ROMANCE_SUBS = ['นิยายรักวัยรุ่น','นิยายรักแฟนตาซี','นิยายรักจีนโบราณ','นิยายรักจีนปัจจุบัน','นิยายรักกำลังภายใน','นิยายรักผู้ใหญ่'];

function Favorites() {
    const navigate = useNavigate();

    // --- States สำหรับ Navbar & Data ---
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [avatar, setAvatar] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [coins, setCoins] = useState(null);
    const [megaOpen, setMegaOpen] = useState(false);
    const [hoveredMenu, setHoveredMenu] = useState(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    
    // State สำหรับเก็บรายการที่ชอบ (ตัวอย่าง)
    const [favBooks, setFavBooks] = useState([
        /* ตัวอย่างข้อมูล: { id: 1, title: 'หนังสือเล่มที่ 1', author: 'นักเขียน A', image: 'url-image' } */
    ]);

    const profileRef = useRef(null);
    const megaRef = useRef(null);
    const notifRef = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            setIsLoggedIn(true);
            axios.get('http://localhost:3001/profile', {
                headers: { Authorization: `Bearer ${token}` }
            }).then(res => {
                setUsername(res.data.username);
                setEmail(res.data.email || '');
                setAvatar(res.data.image || null);
                setCoins(res.data.coins ?? 0);
            }).catch(() => handleLogout());
        } else {
            navigate('/'); 
        }
    }, [navigate]);

    // คลิกข้างนอกเพื่อปิด Dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (megaRef.current && !megaRef.current.contains(e.target)) setMegaOpen(false);
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
            if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    return (
        <div className="home-page">
            {/* ── 1. NAVBAR (ชุดเดิมเป๊ะ) ── */}
            <header className="navbar">
                <div className="navbar-inner">
                    <div className="nav-left">
                        <div className="nav-logo" onClick={() => navigate('/')} style={{cursor:'pointer'}}>
                            <div className="nav-logo-box"><i className="fas fa-book-open"></i></div>
                        </div>
                        <div className="mega-wrap" ref={megaRef}>
                            <button className="nav-hamburger" onClick={() => setMegaOpen(!megaOpen)}>
                                <i className="fas fa-bars"></i><span>เลือกหมวด</span>
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
                                        <div className="mega-col">
                                            {MENU_ITEMS[0].subs.map(s => <div key={s} className="mega-item"><span>{s}</span></div>)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="nav-center">
                        <div className="nav-search">
                            <input type="text" placeholder="ค้นหาหนังสือที่ชอบ..." />
                            <button><i className="fas fa-search"></i></button>
                        </div>
                    </div>

                    <div className="nav-right">
                        <button className="nav-icon-btn"><i className="fas fa-shopping-cart"></i></button>
                        <div className="profile-wrap" ref={profileRef}>
                            <button className="nav-user-btn" onClick={() => setProfileOpen(!profileOpen)}>
                                {avatar ? <img src={avatar} alt="avatar" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} /> : <i className="fas fa-user-circle nav-avatar" style={{fontSize: 30}}></i>}
                                <span className="nav-username" style={{marginLeft: 8, color: 'black'}}>{username}</span>
                            </button>
                            {profileOpen && (
                                <div className="profile-dropdown">
                                    <div className="pd-header"><div className="pd-name">{username}</div></div>
                                    <div className="pd-divider"></div>
                                    <div className="pd-item" onClick={() => navigate('/history')}><i className="fas fa-history"></i> ประวัติซื้อ</div>
                                    <div className="pd-item" onClick={() => navigate('/favorites')}><i className="fas fa-heart"></i> รายการที่ชอบ</div>
                                    <div className="pd-item" onClick={() => navigate('/settingprofile')}><i className="fas fa-cog"></i> ตั้งค่าบัญชี</div>
                                    <div className="pd-divider"></div>
                                    <div className="pd-logout" onClick={handleLogout}><i className="fas fa-sign-out-alt"></i> ออกจากระบบ</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* ── 2. CONTENT หน้า FAVORITES ── */}
            <div className="setting-center-wrapper">
                <div className="page">
                    <div className="breadcrumb">
                        <span>หน้าหลัก</span> / <span style={{color: '#ff4d4d'}}>รายการที่ชอบ</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                        <h1 className="heading" style={{ margin: 0 }}>รายการที่ชอบ <i className="fas fa-heart" style={{color: '#ff4d4d'}}></i></h1>
                        <span style={{ color: '#666', fontSize: '14px' }}>ทั้งหมด {favBooks.length} รายการ</span>
                    </div>

                    {favBooks.length > 0 ? (
                        <div className="fav-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '25px' }}>
                            {/* ตรงนี้ไว้ Map ข้อมูลหนังสือ */}
                        </div>
                    ) : (
                        /* กรณีไม่มีรายการที่ชอบ */
                        <div className="card" style={{ padding: '80px 20px', textAlign: 'center' }}>
                            <div style={{ fontSize: '70px', color: '#ffebee', marginBottom: '20px' }}>
                                <i className="fas fa-heart"></i>
                            </div>
                            <h2 style={{ color: '#333', fontSize: '24px' }}>ยังไม่มีรายการโปรด</h2>
                            <p style={{ color: '#999', marginTop: '10px' }}>กดหัวใจให้กับหนังสือที่คุณถูกใจเพื่อเก็บไว้ที่นี่</p>
                            <button 
                                className="logout-btn" 
                                style={{ marginTop: '30px', background: '#ff4d4d', borderColor: '#ff4d4d' }} 
                                onClick={() => navigate('/')}
                            >
                                ไปสำรวจหนังสือ
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Favorites;