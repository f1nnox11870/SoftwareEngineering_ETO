import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import '../assets/style.css';
import Login from './login';
import Register from './Register';
import Navbar from './navbar';


const TABS = ['แนะนำ', 'นิยาย', 'การ์ตูน/มังงะ'];

// หมวดใหญ่ (แสดงใน mega-menu) — subcategory จะดึงจาก DB จริง
const MAIN_CATEGORIES = [
    { label: 'นิยาย',           key: 'novel', tab: 'นิยาย'          },
    { label: 'การ์ตูน(มังงะ)', key: 'manga', tab: 'การ์ตูน/มังงะ'  },
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
            unread: !readIds.has(nid),   // ถ้าเคยอ่านแล้ว (จาก localStorage) ให้ unread = false
            tag: 'new_chapter',
            book_id: c.book_id,          // เก็บ book_id เพื่อ navigate
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

// ── helpers สำหรับ localStorage read-state ──────────────────────────────────
function loadReadIds() {
    try { return new Set(JSON.parse(localStorage.getItem('notif_read_ids') || '[]')); }
    catch { return new Set(); }
}
function saveReadId(id) {
    try {
        const s = loadReadIds();
        s.add(id);
        // เก็บสูงสุด 200 รายการ กัน storage บวม
        const arr = [...s].slice(-200);
        localStorage.setItem('notif_read_ids', JSON.stringify(arr));
    } catch {}
}

const BANNERS = [
    { bg: '#c9d6df', label: 'Banner 1' },
    { bg: '#e2c9d6', label: 'Banner 2' },
    { bg: '#c9e2d6', label: 'Banner 3' },
    { bg: '#d6c9e2', label: 'Banner 4' },
    { bg: '#e2d6c9', label: 'Banner 5' },
];

// ── BookCard ──────────────────────────────────────────
function BookCard({ 
    book, 
    isLoggedIn, 
    onView, 
    onAddToCart, 
    isFavorite, 
    isPurchased,
    purchasedIds,
    handleToggleFavorite 
}) {
    const hasPurchased = isPurchased || (purchasedIds && purchasedIds.some(id => Number(id) === Number(book.id)));
    const isFree = book.price === 0 || book.price === '0' || book.price === '0.00';

    return (
        <div
            className="bcard2"
            onClick={() => onView(book)}
            style={{ cursor: 'pointer' }}
        >
            {/* ── ปก ── */}
            <div className="bcard2-cover">
                {book.image ? (
                    <img src={book.image} alt={book.title} className="bcard2-img" />
                ) : (
                    <div className="bcard2-no-img">
                        <i className="fas fa-book" />
                    </div>
                )}

                {/* badge เล่มที่ (ถ้ามี subtitle เล่ม X) */}
                {book.subtitle && /เล่ม\s*\d+/.test(book.subtitle) && (
                    <span className="bcard2-vol">
                        {book.subtitle.match(/เล่ม\s*\d+/)[0]}
                    </span>
                )}

                {/* badge ซื้อแล้ว */}
                {isLoggedIn && hasPurchased && (
                    <span className="bcard2-owned">
                         เป็นเจ้าของแล้ว
                    </span>
                )}
            </div>

            {/* ── ข้อมูล ── */}
            <div className="bcard2-body">
                {/* ชื่อ (2 บรรทัด) */}
                <div className="bcard2-title">{book.title}</div>

                {/* ผู้แต่ง */}
                {book.author && (
                    <div className="bcard2-author">{book.author}</div>
                )}

                {/* หมวดหมู่ */}
                <div className="bcard2-cat">{book.category || 'ทั่วไป'}</div>

                {/* heart / fav toggle */}
                <div
                    className="bcard2-stars"
                    onClick={e => { e.stopPropagation(); if (isLoggedIn) handleToggleFavorite(e, book); }}
                    style={{ cursor: isLoggedIn ? 'pointer' : 'default', userSelect: 'none' }}
                    title={isLoggedIn ? (isFavorite ? 'เอาออกจากรายการโปรด' : 'เพิ่มในรายการโปรด') : ''}
                >
                    <i className={isFavorite ? 'fas fa-heart' : 'far fa-heart'}
                       style={{ color: isFavorite ? 'red' : '#ccc', transition: 'color 0.2s' }} />
                    <span>{book.likes || 0}</span>
                </div>

                {/* ราคา + cart */}
                <div className="bcard2-footer">
                    <span className="bcard2-price">
                        {isFree ? 'ฟรี' : `${Number(book.price).toFixed(0)} เหรียญ`}
                    </span>
                    {isLoggedIn && !hasPurchased && (
                        <button
                            className="bcard2-cart"
                            onClick={e => { e.stopPropagation(); onAddToCart(book.id); }}
                            title="เพิ่มลงตะกร้า"
                        >
                            <i className="fas fa-shopping-basket" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── BookRow ───────────────────────────────────────────
// 🔻 1. เพิ่ม favoriteIds เข้าไปในวงเล็บ 🔻
function BookRow({ title, books, isLoggedIn, showSeeAll = true, onView, onAddToCart, favoriteIds = [], purchasedIds = [] , handleToggleFavorite}) {
    const rowRef = useRef(null);
    const scroll = (dir) => {
        if (rowRef.current) rowRef.current.scrollBy({ left: dir * 700, behavior: 'smooth' });
    };

    if (!books || books.length === 0) return null;

    return (
        <section className="brow-section">
            <div className="brow-header">
                <h2 className="brow-title">{title}</h2>
            </div>
            <div className="brow-wrap">
                <button className="brow-arrow left" onClick={() => scroll(-1)}>
                    <i className="fas fa-chevron-left"></i>
                </button>
                <div className="brow-track" ref={rowRef}>
                    {books.map(book => (
                        <BookCard 
                            key={book.id} 
                            book={book} 
                            isLoggedIn={isLoggedIn} 
                            onView={onView} 
                            onAddToCart={onAddToCart}
                            isFavorite={favoriteIds.includes(book.id)} /* 👈 ใช้ favoriteIds ตรงนี้ได้แล้ว! */
                            purchasedIds={purchasedIds}
                            isPurchased={purchasedIds.some(id => Number(id) === Number(book.id)) || (typeof purchasedBooks !== 'undefined' && purchasedBooks.some(id => Number(id) === Number(book.id)))}
                            handleToggleFavorite={handleToggleFavorite}
                        />
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
    const location = useLocation();
    const [banners, setBanners] = useState([]);
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
    // 1. เพิ่ม State สำหรับเก็บหมวดที่ต้องการดูทั้งหมด (วางไว้ด้านบนใน function Home)
    const [viewAllCategory, setViewAllCategory] = useState(null); 
    const [topupHistory, setTopupHistory] = useState([]);
    const fetchTopupHistory = async () => {
    try {
        const token = localStorage.getItem('token');
        const res = await axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/topup-history', {
            headers: { Authorization: `Bearer ${token}` }
        });
        setTopupHistory(res.data);
    } catch (err) {
        console.error("Error fetching history", err);
    }
};
// 2. ฟังก์ชันสำหรับจัดการข้อมูลที่จะแสดง (วางไว้ก่อน return)
const getDisplayBooks = (categoryName) => {
    return books
        .filter(b => b.category === categoryName)
        .sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0));
};
    // ── ภายใน function Home ────────────────────────────────
const handleToggleFavorite = async (e, book) => {
    if (e) e.stopPropagation(); // กันไม่ให้กดแล้วไปเปิดหน้าดูรายละเอียด
    
    const token = localStorage.getItem('token');
    if (!token) {
        showModal("warn", "กรุณาเข้าสู่ระบบก่อนกดถูกใจครับ", "🔒 ต้องเข้าสู่ระบบ");
        return;
    }

    try {
        const res = await axios.post('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/favorites/toggle', 
            { bookId: book.id }, 
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.status === "added") {
            // 1. เพิ่ม ID เข้าไปในรายการโปรดเพื่อให้หัวใจเป็นสีแดง
            setFavoriteIds(prev => [...prev, book.id]);
            // 2. 🔥 สำคัญ: อัปเดตตัวเลข likes ใน State books ทันที
            setBooks(prevBooks => prevBooks.map(b => 
                b.id === book.id ? { ...b, likes: (Number(b.likes) || 0) + 1 } : b
            ));
        } else if (res.data.status === "removed") {
            // 1. ลบ ID ออกจากรายการโปรด
            setFavoriteIds(prev => prev.filter(id => id !== book.id));
            // 2. 🔥 สำคัญ: ลดยอด likes ใน State books ทันที
            setBooks(prevBooks => prevBooks.map(b => 
                b.id === book.id ? { ...b, likes: Math.max(0, (Number(b.likes) || 0) - 1) } : b
            ));
        }
    } catch (error) {
        console.error("Error toggling favorite:", error);
    }
};
    const [purchasedIds, setPurchasedIds] = useState([]);
    // State สำหรับข้อมูลหนังสือและหน้าต่าง View
    const [books, setBooks] = useState([]);
    const [viewBook, setViewBook] = useState(null); // เก็บหนังสือที่ถูกกด View
    const [cartCount, setCartCount] = useState(0);
    const [favoriteIds, setFavoriteIds] = useState([]);
    const [purchasedBooks, setPurchasedBooks] = useState([]);


    
    const fetchPurchasedIds = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/purchased', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPurchasedIds(res.data); // data จะมาเป็น array ของ book_id เช่น [1, 5, 12]
        } catch (error) {
            console.error("Error fetching purchased books:", error);
        }
    };
    const fetchFavoriteIds = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        try {
            const res = await axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/favorites', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // ข้อมูลจะมาในรูปแบบ [{book_id: 1}, {book_id: 3}] เราจะแปลงให้เป็น [1, 3] เพื่อง่ายต่อการเช็ค
            const ids = res.data.map(item => item.book_id);
            setFavoriteIds(ids);
        } catch (error) {
            console.error("Error fetching favorites:", error);
        }
    };
    useEffect(() => {
        if (banners.length <= 1) return; // ถ้ามีรูปเดียวไม่ต้องเลื่อน
        const interval = setInterval(() => {
            setCurrentBannerIndex(prev => (prev + 1) % banners.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [banners.length]);

    // 2. ฟังก์ชันกดปุ่มเลื่อนไปทางขวา
    const nextBanner = () => {
        setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    };

    // 3. ฟังก์ชันกดปุ่มเลื่อนไปทางซ้าย
    const prevBanner = () => {
        setCurrentBannerIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
    };
    // 🔺 สิ้นสุดโค้ด Slider 🔺
    useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
        // 1. ดึงข้อมูลรายการโปรด (หัวใจ)
        fetchFavoriteIds(); 
        fetchPurchasedIds();
        // 2. ดึงข้อมูล "หนังสือที่ซื้อเป็นเจ้าของแล้ว" (คนละส่วนกัน)
        axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/library/check', {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => {
            // เอา ID หนังสือที่ซื้อแล้วทั้งหมด มาเก็บไว้ใน State
            if (Array.isArray(res.data)) setPurchasedBooks(res.data);
        })
        .catch(err => console.log("Error fetching library:", err));
        const handleFocus = () => {
            if (token) fetchPurchasedIds();
        };
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }
}, []);
    const fetchCartCount = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        try {
            const res = await axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/cart', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // ตรงนี้ปรับให้ตรงกับโค้ด set state ตะกร้าเดิมของคุณ (เช่น setCartCount(res.data.length))
            setCartCount(res.data.length || 0); 
        } catch (error) {
            console.error("Error fetching cart:", error);
            
            // 🔻 เพิ่มการดักจับ Error 403 ตรงนี้ 🔻
            if (error.response && error.response.status === 403) {
                showModal("error", "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้งครับ", "⚠️ เซสชันหมดอายุ");
                localStorage.clear(); // ล้าง Token เก่าทิ้ง
                setIsLoggedIn(false);
                window.location.reload(); // รีเฟรชหน้าเว็บ 1 รอบ
            }
        }
    };

    const addToCart = async (bookId) => {
    const token = localStorage.getItem('token');
    if (!token) {
        showModal("warn", "กรุณาเข้าสู่ระบบก่อนเพิ่มสินค้าลงตะกร้าครับ", "🔒 ต้องเข้าสู่ระบบ");
        return;
    }

    try {
        await axios.post('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/cart/add', 
            { book_id: bookId }, 
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        //นับเรียลไทม์ cart
        setCartCount(prev => prev + 1); 
        
        setViewBook(null); // ปิดหน้าต่าง
        showModal("success", "เพิ่มหนังสือลงตะกร้าเรียบร้อยแล้ว!", "🛒 สำเร็จ");

    } catch (err) {
        // ให้มัน log ออกมาใน Console ด้วย จะได้ตามสืบง่าย
        console.error("Cart Add Error:", err); 

        if (err.response) {
            // ถ้าระบบตอบกลับมา
            if (err.response.status === 400) {
                showModal("warn", "หนังสือเล่มนี้อยู่ในตะกร้าของคุณแล้วครับ", " แจ้งเตือน");
            } else if (err.response.status === 401 || err.response.status === 403) {
                showModal("error", "เซสชันหมดอายุ กรุณาล็อกอินใหม่อีกครั้งครับ", " เซสชันหมดอายุ");
                localStorage.clear(); // ล้างข้อมูลที่หมดอายุ
                window.location.reload(); // รีเฟรชหน้าต่างเพื่อให้ไปล็อกอินใหม่
            } else {
                showModal("error", err.response.data.message || `Error ${err.response.status}`, " เกิดข้อผิดพลาด");
            }
        } else {
            // ถ้าเซิร์ฟเวอร์ไม่ตอบสนองเลย (เช่น ลืมรัน node)
            showModal("error", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่า server กำลังทำงานอยู่", " ไม่สามารถเชื่อมต่อ");
        }
    }
};
    
    const [username, setUsername]       = useState('');
    const [isLoggedIn, setIsLoggedIn]   = useState(false);
    const [role, setRole] = useState(null);
    const [profileImage, setProfileImage] = useState(null);

    const [modal, setModal]             = useState(null);
    const [activeTab, setActiveTab]     = useState('แนะนำ');
    const [activeSubCategory, setActiveSubCategory] = useState(null); // subcategory ที่เลือก
    const [dbCategories, setDbCategories] = useState({ novel: [], manga: [] }); // ดึงจาก API
    const [megaOpen, setMegaOpen]       = useState(false);

    // รับ query params ?tab=...&sub=... เมื่อ navigate มาจากหน้าอื่น
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        const sub = params.get('sub');
        if (tab) setActiveTab(tab);
        if (sub) setActiveSubCategory(sub);
    }, [location.search]);
    const [hoveredMenu, setHoveredMenu] = useState(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [bannerIdx, setBannerIdx]     = useState(0);
    const [coins, setCoins]             = useState(null);
    const [notifOpen, setNotifOpen]           = useState(false);
    const [notifications, setNotifications]   = useState([]);
    const [appModal, setAppModal]             = useState(null); // { type:'success'|'error'|'warn'|'info', title:'', message:'' }
    const showModal = (type, message, title = '') => setAppModal({ type, message, title });

    const megaRef    = useRef(null);
    const profileRef = useRef(null);
    const bannerRef  = useRef(null);
    const notifRef   = useRef(null);
    const coinInterval = useRef(null);
    
    // เพิ่ม State นี้เข้าไปเพื่อเก็บข้อความคอมเมนต์ของแต่ละโพสต์
    const [commentInputs, setCommentInputs] = useState({});
    // เพิ่ม State นี้เข้าไป
    const [newsPosts, setNewsPosts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('latest');
    const [selectedGenre, setSelectedGenre] = useState('all');
    // ดึงข้อมูลหนังสือทั้งหมดจาก Database
    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const res = await axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/books');
                setBooks(res.data);
            } catch (err) {
                console.error("Error fetching books:", err);
            }
        };
        fetchBooks();
        fetchBanners();
        // ดึง subcategories จริงจาก DB
        axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/books/categories')
            .then(res => setDbCategories(res.data))
            .catch(err => console.error('Error fetching categories:', err));
    }, []);
    useEffect(() => {
    // ดึงข้อมูลอื่นๆ ที่คุณมีอยู่แล้ว...
    
    // ดึงข้อมูลโพสต์ "เร็วๆ นี้"
    // ตัวอย่างฟังก์ชันดึงโพสต์ใน Home.jsx
const fetchPosts = async () => {
    try {
        // ดึง Token จาก LocalStorage
        const token = localStorage.getItem("token");
        
        // ส่ง GET ขอข้อมูล โดยแนบ Token ไปใน Headers ด้วย (ถึงแม้ว่า Backend จะไม่บังคับ แต่เราส่งไปเพื่อให้รู้ userId)
        const res = await axios.get("${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/posts", {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        
        // ใน res.data จะมีคอลัมน์ user_vote: 'like', 'dislike' หรือ null กลับมาแล้ว
        setNewsPosts(res.data);
    } catch (err) {
        console.error("Error fetching posts:", err);
    }
};
    
    fetchPosts();
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
                try {
                    const res = await axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/profile', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setCoins(res.data.coins ?? 0); 
                    setProfileImage(res.data.image || null); 
                } catch (error) {
                    console.error("Error fetching profile:", error);
                    
                    // 🔻 เพิ่มการดักจับ Error 403 ตรงนี้ 🔻
                    if (error.response && error.response.status === 403) {
                        localStorage.clear();
                        setIsLoggedIn(false);
                        window.location.reload();
                    } else {
                        setCoins(0);
                    }
                }
            } else {
                setCoins(null);
            }
        };

        if (isLoggedIn) {
            fetchCoins();
            const token = localStorage.getItem('token');
            if (token) refreshNotifications(token);
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
    const markAllRead = () => {
        setNotifications(prev => prev.map(n => {
            if (n.unread) saveReadId(n.id);
            return { ...n, unread: false };
        }));
        // บันทึก new_chapter ที่ยังไม่เคย seen ไปยัง backend ด้วย
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
        saveReadId(id);  // บันทึกลง localStorage ทันที
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
        // ถ้าเป็น new_chapter → บันทึก backend + navigate ไปหน้าเรื่องนั้น
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
    const refreshNotifications = async (token) => {
        const headers = { Authorization: `Bearer ${token}` };
        const readIds = loadReadIds();   // โหลด IDs ที่เคยอ่านแล้วจาก localStorage
        const [topupRes, histRes, newChapRes] = await Promise.all([
            axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/topup/my-requests', { headers }).catch(() => ({ data: [] })),
            axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/history', { headers }).catch(() => ({ data: [] })),
            axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/notifications/new-chapters', { headers }).catch(() => ({ data: [] })),
        ]);
        setNotifications(buildNotifications(histRes.data, topupRes.data, newChapRes.data, readIds));
    };
    const fetchBanners = async () => {
        try {
            const res = await axios.get('${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/banners'); // ดึงข้อมูลแบนเนอร์จาก API ที่เพิ่งสร้าง
            setBanners(res.data); // เอาแบนเนอร์ไปใส่ใน State
        } catch (error) {
            console.error("Error fetching banners:", error);
        }
    };
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
    // 🟢 ฟังก์ชันกด Like
const handleLikePost = async (postId) => {
    try {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/posts/${postId}/like`);
        // อัปเดตตัวเลขบนหน้าจอทันทีโดยไม่ต้องรีเฟรช
        setNewsPosts(prev => prev.map(post => 
            post.id === postId ? { ...post, likes_count: (post.likes_count || 0) + 1 } : post
        ));
    } catch (err) {
        console.error("Error liking post:", err);
    }
};

// 🔴 ฟังก์ชันกด Dislike
const handleDislikePost = async (postId) => {
    try {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/posts/${postId}/dislike`);
        // อัปเดตตัวเลขบนหน้าจอทันที
        setNewsPosts(prev => prev.map(post => 
            post.id === postId ? { ...post, dislikes_count: (post.dislikes_count || 0) + 1 } : post
        ));
    } catch (err) {
        console.error("Error disliking post:", err);
    }
};

// 🟢 ฟังก์ชันจัดการ โหวต (Like / Dislike)
// 🟢 ฟังก์ชันจัดการ โหวตแบบ Toggle (Like / Dislike)
const handleVotePost = async (postId, typeToVote) => {
    const token = localStorage.getItem("token");
    if (!token) {
        showModal("warn", "กรุณาเข้าสู่ระบบก่อนกดโหวตครับ", "🔒 ต้องเข้าสู่ระบบ");
        return;
    }

    try {
        // เรียก API ไปที่ Backend
        const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/posts/${postId}/vote`, 
            { type: typeToVote }, 
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        const { action, newVote } = res.data; // ดึงสถานะว่าเกิดอะไรขึ้น (added, removed, switched) และสถานะโหวตปัจจุบัน

        // 🌟 อัปเดตหน้าจอทันที แบบ Smart Update 🌟
        setNewsPosts(prevPosts => prevPosts.map(post => {
            if (post.id === postId) {
                // เก็บค่าวาเราเคยกดอะไรไว้ก่อนหน้านี้
                const oldVote = post.user_vote;
                
                // สร้าง object โพสต์อันใหม่เพื่อไปอัปเดต State
                let updatedPost = { 
                    ...post, 
                    user_vote: newVote // อัปเดตสถานะโหวตปัจจุบัน (เป็น 'like', 'dislike' หรือ null)
                };

                // คำนวณตัวเลข count ใหม่ ตาม Action ที่ Backend บอกมา
                if (action === 'added') {
                    // กดใหม่ -> บวก Count ของปุ่มที่กดเพิ่ม 1
                    const columnToIncrement = typeToVote === 'like' ? 'likes_count' : 'dislikes_count';
                    updatedPost[columnToIncrement] = (post[columnToIncrement] || 0) + 1;
                } else if (action === 'removed') {
                    // กดซ้ำยกเลิก -> ลด Count ของปุ่มเดิมลง 1
                    const columnToDecrement = typeToVote === 'like' ? 'likes_count' : 'dislikes_count';
                    updatedPost[columnToDecrement] = (post[columnToDecrement] || 0) - 1;
                } else if (action === 'switched') {
                    // กดสลับ -> สลับ Count (อันเกอลด อันใหม่บวก)
                    if (typeToVote === 'like') {
                        updatedPost.likes_count = (post.likes_count || 0) + 1;
                        updatedPost.dislikes_count = (post.dislikes_count || 0) - 1;
                    } else {
                        updatedPost.dislikes_count = (post.dislikes_count || 0) + 1;
                        updatedPost.likes_count = (post.likes_count || 0) - 1;
                    }
                }

                return updatedPost;
            }
            return post;
        }));
    } catch (err) {
        // หากมี Error (เช่น Token หมดอายุ)
        console.error("Error voting:", err);
    }
};

// 💬 ฟังก์ชันกดส่งคอมเมนต์ (ปรับให้อัปเดตหน้าจอทันที)
// 💬 ฟังก์ชันกดส่งคอมเมนต์
const handleSubmitComment = async (postId) => {
    const text = commentInputs[postId];
    if (!text || text.trim() === "") return;

    const token = localStorage.getItem("token");
    try {
        // 1. ส่งข้อมูลคอมเมนต์ไปบันทึก
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/posts/${postId}/comment`, 
            { text }, 
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // 🌟 2. ดึงข้อมูลโพสต์ใหม่ (ต้องส่ง Token ไปด้วย เพื่อให้รู้ว่าเราเคยกดไลค์ไว้) 🌟
        const res = await axios.get("${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/posts", {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        setNewsPosts(res.data);
        
        // ล้างช่องคอมเมนต์ให้ว่าง
        setCommentInputs(prev => ({ ...prev, [postId]: "" }));
    } catch (err) {
        showModal("warn", "กรุณาเข้าสู่ระบบก่อนแสดงความคิดเห็นครับ", "🔒 ต้องเข้าสู่ระบบ");
    }
};
    const handleOverlayClick = (e) => {
        if (e.target.classList.contains('modal-overlay')) setModal(null);
    };
    const mangaCategories = ['มังงะ', 'การ์ตูน', 'การ์ตูนโรแมนติก', 'การ์ตูนแอคชั่น',
        'การ์ตูนแฟนตาซี', 'การ์ตูนตลก', 'การ์ตูนสยองขวัญ', 'การ์ตูนกีฬา', 'การ์ตูนวาย', 'การ์ตูนยูริ'];
    const novelCategories = ['นิยาย', 'นิยายรักโรแมนติก', 'นิยายวาย', 'นิยายแฟนตาซี', 'นิยายสืบสวน',
        'นิยายกำลังภายใน', 'ไลท์โนเวล', 'วรรณกรรมทั่วไป', 'นิยายยูริ', 'กวีนิพนธ์', 'แฟนเฟิค'];

    const mangaBooks = books
        .filter(b => activeSubCategory
            ? b.category === activeSubCategory
            : mangaCategories.includes(b.category))
        .sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0));

// 2. หมวดนิยาย (กรองเอาเฉพาะหมวดนี้ + เรียงตาม Likes มากไปน้อย)
const novelBooks = books
        .filter(b => activeSubCategory
            ? b.category === activeSubCategory
            : novelCategories.includes(b.category))
        .sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0));

// 3. (ถ้ามี) หมวดแนะนำรวม (รวมทุกหมวดที่ไลก์เยอะที่สุด 10 เล่มแรก)
    const recommendedBooks = [...books]
    .sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0))
    .slice(0, 10);

    // ── ฟังก์ชัน sort กลาง ──
    const applySortFilter = (arr) => {
        const q = searchQuery.toLowerCase();
        return arr
            .filter(book => {
                const matchTitle = book.title.toLowerCase().includes(q) ||
                    (book.author && book.author.toLowerCase().includes(q));
                const matchGenre = selectedGenre === 'all' || book.category === selectedGenre;
                return matchTitle && matchGenre;
            })
            .sort((a, b) => {
                if (sortBy === 'priceLow')      return Number(a.price) - Number(b.price);
                if (sortBy === 'priceHigh')     return Number(b.price) - Number(a.price);
                if (sortBy === 'likesHigh')     return (Number(b.likes) || 0) - (Number(a.likes) || 0);
                if (sortBy === 'likesLow')      return (Number(a.likes) || 0) - (Number(b.likes) || 0);
                if (sortBy === 'episodesHigh')  return (Number(b.episode_count) || 0) - (Number(a.episode_count) || 0);
                if (sortBy === 'episodesLow')   return (Number(a.episode_count) || 0) - (Number(b.episode_count) || 0);
                if (sortBy === 'authorAZ')      return (a.author || '').localeCompare(b.author || '', 'th');
                if (sortBy === 'authorZA')      return (b.author || '').localeCompare(a.author || '', 'th');
                return b.id - a.id; // latest
            });
    };

    // กรองหนังสือ
    const filteredNovels = applySortFilter(novelBooks);
    const filteredManga  = applySortFilter(mangaBooks);
    // ตรวจสอบว่าซื้อหนังสือเล่มที่กำลังดูอยู่ (viewBook) หรือยัง
    const isOwned = isLoggedIn && Array.isArray(purchasedBooks) && viewBook 
    ? purchasedBooks.some(id => Number(id) === Number(viewBook.id))
    : false;
    return (
        <div className="home-page">

            <Navbar/>

            {/* ══ SUB-TABS BAR ══ */}
            <div className="sub-tabs">
                <div className="sub-tabs-inner">
                    {TABS.map(tab => (
                        <button key={tab}
                            className={`sub-tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => { setActiveTab(tab); setActiveSubCategory(null); }}>
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── แสดง subcategory ที่กำลัง filter อยู่ ── */}
            {activeSubCategory && (
                <div style={{
                    maxWidth: '1400px', margin: '0 auto', padding: '8px 20px',
                    display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#555'
                }}>
                    <span style={{ color: '#aaa' }}>หมวดหมู่</span>
                    <i className="fas fa-chevron-right" style={{ fontSize: '10px', color: '#ccc' }}></i>
                    <span style={{
                        background: '#ff4e63', color: '#fff',
                        padding: '3px 12px', borderRadius: '20px', fontWeight: 600, fontSize: '13px'
                    }}>
                        {activeSubCategory}
                    </span>
                    <button
                        onClick={() => setActiveSubCategory(null)}
                        style={{
                            background: 'none', border: '1px solid #ddd', borderRadius: '20px',
                            padding: '2px 10px', fontSize: '12px', cursor: 'pointer', color: '#888',
                            marginLeft: '4px'
                        }}
                    >
                        ✕ ล้างตัวกรอง
                    </button>
                </div>
            )}
            {/* ══ MAIN CONTENT (constrained between logo and user icon) ══ */}
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px', boxSizing: 'border-box' }}>

            {/* ══ BANNER MULTI-SLIDER (โชว์ทีละ 4 รูป) ══ */}
            <section className="banner-wrap" style={{ 
                width: '95%', maxWidth: '1400px', margin: '20px auto', maxHeight: '250px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                position: 'relative' // สำคัญ! เพื่อให้ปุ่มลอยอยู่ด้านข้าง
            }}>
                
                {banners.length > 0 ? (
                    <>
                        {/* 🌟 1. ส่วนแสดงรูปภาพ (คำนวณให้โชว์ 4 รูปพร้อมกัน) */}
                        <div style={{ 
                            display: 'flex', gap: '15px', width: '100%', height: '220px', 
                            overflow: 'hidden', padding: '10px' 
                        }}>
                            {/* สร้าง Array ความยาวสูงสุด 4 ช่อง เพื่อดึงรูปมาแสดง */}
                            {Array.from({ length: Math.min(4, banners.length) }).map((_, idx) => {
                                // คำนวณ Index ให้วนลูปกลับไปรูปแรกถ้าเลื่อนจนสุด
                                const bannerIdx = (currentBannerIndex + idx) % banners.length;
                                const banner = banners[bannerIdx];

                                return (
                                    <div key={`${banner.id}-${idx}`} style={{ 
                                        flex: 1, // ให้ทุกรูปแบ่งพื้นที่เท่าๆ กัน (ถ้ามี 4 รูปก็รูปละ 25%)
                                        height: '100%', borderRadius: '8px', overflow: 'hidden',
                                        boxShadow: '0 3px 6px rgba(0,0,0,0.15)',
                                        transition: 'transform 0.3s ease'
                                    }}>
                                        {banner.link ? (
                                            <a href={banner.link} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', height: '100%' }}>
                                                <img 
                                                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${banner.image}`} 
                                                    alt={banner.title || 'Banner'} 
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} 
                                                />
                                            </a>
                                        ) : (
                                            <img 
                                                src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${banner.image}`} 
                                                alt={banner.title || 'Banner'} 
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} 
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* 🌟 2. ปุ่มกด ซ้าย-ขวา (โชว์เมื่อมีรูปมากกว่า 4 รูป หรืออยากให้เลื่อนวน) */}
                        {banners.length > 1 && (
                            <>
                                <button onClick={prevBanner} style={{
                                    position: 'absolute', left: '-15px', top: '50%', transform: 'translateY(-50%)',
                                    background: '#fff', border: '1px solid #ddd', borderRadius: '50%',
                                    width: '45px', height: '45px', cursor: 'pointer', fontSize: '18px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                    zIndex: 2, color: '#555'
                                }}>
                                    <i className="fas fa-chevron-left"></i>
                                </button>
                                
                                <button onClick={nextBanner} style={{
                                    position: 'absolute', right: '-15px', top: '50%', transform: 'translateY(-50%)',
                                    background: '#fff', border: '1px solid #ddd', borderRadius: '50%',
                                    width: '45px', height: '45px', cursor: 'pointer', fontSize: '18px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                    zIndex: 2, color: '#555'
                                }}>
                                    <i className="fas fa-chevron-right"></i>
                                </button>
                            </>
                        )}
                    </>
                ) : (
                    // ถ้าไม่มีแบนเนอร์
                    <div className="banner-img-placeholder" style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eee', color: '#888', borderRadius: '12px' }}>
                        Welcome to ETOEBOOK.com | เว็บนิยาย มังงะ ไลท์โนเวล
                    </div>
                )}
            </section>
            {(activeTab === 'นิยาย' || activeTab === 'การ์ตูน/มังงะ') && (() => {
                const isNovel = activeTab === 'นิยาย';
                const genreOptions = isNovel ? novelCategories : mangaCategories;
                const displayBooks = isNovel ? filteredNovels : filteredManga;
                return (
                    <div style={{ animation: 'fadeIn 0.4s' }}>
                        {/* ══ Search / Sort / Genre Bar ══ */}
                        <div style={{
                            display: 'flex', flexWrap: 'wrap', gap: '10px',
                            alignItems: 'center', marginBottom: '22px',
                            padding: '16px 18px',
                            background: '#fff', borderRadius: '12px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        }}>
                            {/* Search */}
                            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
                                <i className="fas fa-search" style={{
                                    position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                                    color: '#aaa', fontSize: '14px', pointerEvents: 'none'
                                }} />
                                <input
                                    type="text"
                                    placeholder="ค้นหาชื่อเรื่อง หรือ ผู้แต่ง..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%', padding: '9px 12px 9px 36px',
                                        border: '1px solid #e0e0e0', borderRadius: '8px',
                                        fontSize: '14px', boxSizing: 'border-box',
                                        outline: 'none', fontFamily: 'Sarabun',
                                        transition: 'border 0.2s',
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#b5651d'}
                                    onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                                />
                            </div>

                            {/* Genre filter */}
                            <div style={{ position: 'relative', flex: '1 1 170px', minWidth: '150px' }}>
                                <i className="fas fa-tag" style={{
                                    position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                                    color: '#aaa', fontSize: '13px', pointerEvents: 'none'
                                }} />
                                <select
                                    value={selectedGenre}
                                    onChange={e => setSelectedGenre(e.target.value)}
                                    style={{
                                        width: '100%', padding: '9px 12px 9px 34px',
                                        border: '1px solid #e0e0e0', borderRadius: '8px',
                                        fontSize: '14px', cursor: 'pointer',
                                        background: '#fff', appearance: 'none',
                                        fontFamily: 'Sarabun', outline: 'none',
                                        transition: 'border 0.2s',
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#b5651d'}
                                    onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                                >
                                    <option value="all">🏷 ทุกแนว</option>
                                    {genreOptions.map(g => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                                <i className="fas fa-chevron-down" style={{
                                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                    color: '#aaa', fontSize: '11px', pointerEvents: 'none'
                                }} />
                            </div>

                            {/* Sort */}
                            <div style={{ position: 'relative', flex: '1 1 190px', minWidth: '170px' }}>
                                <i className="fas fa-sort-amount-down" style={{
                                    position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                                    color: '#aaa', fontSize: '13px', pointerEvents: 'none'
                                }} />
                                <select
                                    value={sortBy}
                                    onChange={e => setSortBy(e.target.value)}
                                    style={{
                                        width: '100%', padding: '9px 12px 9px 34px',
                                        border: '1px solid #e0e0e0', borderRadius: '8px',
                                        fontSize: '14px', cursor: 'pointer',
                                        background: '#fff', appearance: 'none',
                                        fontFamily: 'Sarabun', outline: 'none',
                                        transition: 'border 0.2s',
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#b5651d'}
                                    onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                                >
                                    <option value="latest">🕐 ล่าสุด</option>
                                    <option value="likesHigh">❤️ ยอดนิยมมากสุด</option>
                                    <option value="likesLow">🤍 ยอดนิยมน้อยสุด</option>
                                    <option value="priceLow">💰 ราคาต่ำ → สูง</option>
                                    <option value="priceHigh">💎 ราคาสูง → ต่ำ</option>
                                    <option value="episodesHigh">📚 ตอนมากสุด</option>
                                    <option value="episodesLow">📖 ตอนน้อยสุด</option>
                                    <option value="authorAZ">✍️ ผู้แต่ง ก-ฮ</option>
                                    <option value="authorZA">✍️ ผู้แต่ง ฮ-ก</option>
                                </select>
                                <i className="fas fa-chevron-down" style={{
                                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                    color: '#aaa', fontSize: '11px', pointerEvents: 'none'
                                }} />
                            </div>

                            {/* Result count + clear */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#888', flexShrink: 0 }}>
                                <span>พบ <strong style={{ color: '#b5651d' }}>{displayBooks.length}</strong> เรื่อง</span>
                                {(searchQuery || selectedGenre !== 'all' || sortBy !== 'latest') && (
                                    <button
                                        onClick={() => { setSearchQuery(''); setSelectedGenre('all'); setSortBy('latest'); }}
                                        style={{
                                            border: '1px solid #e0e0e0', borderRadius: '6px',
                                            background: '#fafafa', padding: '5px 10px',
                                            fontSize: '12px', cursor: 'pointer', color: '#888',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseOver={e => { e.currentTarget.style.background = '#fff0f0'; e.currentTarget.style.color = '#ff4e63'; e.currentTarget.style.borderColor = '#ff4e63'; }}
                                        onMouseOut={e => { e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#e0e0e0'; }}
                                    >
                                        ✕ ล้างตัวกรอง
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ══ Grid หนังสือ ══ */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 160px)', gap: '20px', justifyContent: 'start' }}>
                            {displayBooks.length > 0 ? (
                                displayBooks.map(book => (
                                    <BookCard
                                        key={book.id}
                                        book={book}
                                        isLoggedIn={isLoggedIn}
                                        onView={setViewBook}
                                        onAddToCart={addToCart}
                                        isFavorite={favoriteIds.includes(book.id)}
                                        purchasedIds={purchasedIds}
                                        handleToggleFavorite={handleToggleFavorite}
                                    />
                                ))
                            ) : (
                                <div style={{ gridColumn: 'span 7', textAlign: 'center', padding: '60px 20px', color: '#bbb' }}>
                                    <i className="fas fa-search" style={{ fontSize: '36px', marginBottom: '14px', display: 'block' }} />
                                    <p style={{ margin: 0, fontSize: '15px' }}>ไม่พบผลลัพธ์ที่ตรงกับเงื่อนไขที่เลือก</p>
                                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#ccc' }}>ลองเปลี่ยนคำค้น หรือปรับตัวกรองดูนะครับ</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
            {activeTab === 'เร็วๆ นี้' && (
                <div style={{ maxWidth: '700px', margin: '0 auto', animation: 'fadeIn 0.5s' }}>
                    <h3 style={{ marginBottom: '20px', color: '#333' }}>
                        <i className="fas fa-bullhorn" style={{ color: '#ff4e63' }}></i> อัปเดตข่าวสารและผลงานเร็วๆ นี้
                    </h3>

                    {/* วนลูปแสดงโพสต์ทั้งหมด */}
                    {newsPosts?.map(post => (
                        <div key={post.id} className="post-card" style={{ 
                            background: '#fff', 
                            borderRadius: '15px', 
                            padding: '20px', 
                            marginBottom: '20px', 
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)' 
                        }}>
                            
                            {/* --- 1. ส่วนเนื้อหาและรูปภาพ --- */}
                            {post.caption && <p style={{ fontSize: '16px', lineHeight: '1.5', color: '#333', whiteSpace: 'pre-wrap' }}>{post.caption}</p>}
                            
                            {post.image_url && (
                                <img 
                                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${post.image_url}`} 
                                    alt="Post" 
                                    style={{ width: '100%', borderRadius: '10px', marginTop: '10px', maxHeight: '400px', objectFit: 'cover' }} 
                                />
                            )}

                            {/* --- 2. ส่วนแถบปุ่ม Like / Dislike / Comment --- */}
                            <div style={{ display: 'flex', gap: '20px', marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                                            <button 
                                    onClick={() => handleVotePost(post.id, 'like')} 
                                    style={{ 
                                        background: 'none', border: 'none', cursor: 'pointer', 
                                        display: 'flex', alignItems: 'center', gap: '5px',
                                        transition: 'all 0.2sease',
                                        // 🌟 ส่วนสำคัญ: ตัดสินสีของปุ่ม Like 🌟
                                        color: post.user_vote === 'like' ? '#1877f2' : '#666',
                                    }}
                                >
                                    <i className={`fas fa-thumbs-up`}></i> {post.likes_count || 0}
                                </button>
                                
                                {/* 🔴 ปุ่ม Dislike - เปลี่ยนสีแดงเมื่อ User เคยกด Dislike ไว้ */}
                                <button 
                                    onClick={() => handleVotePost(post.id, 'dislike')} 
                                    style={{ 
                                        background: 'none', border: 'none', cursor: 'pointer', 
                                        display: 'flex', alignItems: 'center', gap: '5px',
                                        transition: 'all 0.2sease',
                                        // 🌟 ส่วนสำคัญ: ตัดสินสีของปุ่ม Dislike 🌟
                                        color: post.user_vote === 'dislike' ? '#ff4e63' : '#666',
                                    }}
                                >
                                    <i className={`fas fa-thumbs-down`}></i> {post.dislikes_count || 0}
                                </button>
                            </div>

                            {/* --- 🌟 3. ส่วนแสดงคอมเมนต์ (ใหม่) 🌟 --- */}
                                {post.comments && post.comments.length > 0 && (
                                    <div style={{ marginTop: '15px', padding: '10px 0', borderTop: '1px dashed #eee' }}>
                                        {post.comments.map(comment => (
                                            <div key={comment.id} style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                                                {/* รูปโปรไฟล์คนคอมเมนต์ */}
                                                <img 
                                                    src={
                                                        comment.profile_image 
                                                            // เช็คว่าถ้าเป็นลิงก์เว็บ (http) หรือเป็นรูป Base64 (data:image) ให้ใช้ค่าเดิมได้เลย
                                                            ? (comment.profile_image.startsWith('http') || comment.profile_image.startsWith('data:image')
                                                                ? comment.profile_image 
                                                                // ถ้าไม่ใช่ ค่อยเอามาต่อกับ localhost
                                                                : `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${comment.profile_image.startsWith('/') ? '' : '/'}${comment.profile_image}`)
                                                            : 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
                                                    } 
                                                    alt="profile" 
                                                    style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #ddd' }}
                                                    onError={(e) => {
                                                        e.target.onerror = null; 
                                                        e.target.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                                                    }}
                                                />
                                                {/* กล่องข้อความคอมเมนต์ */}
                                                <div style={{ background: '#f1f2f6', padding: '8px 14px', borderRadius: '15px', flex: 1 }}>
                                                    <strong style={{ fontSize: '13px', color: '#333' }}>{comment.username || 'ผู้ใช้งาน'}</strong>
                                                    <p style={{ margin: '3px 0 0 0', fontSize: '14px', color: '#444' }}>{comment.comment_text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                {/* --- 3. ส่วนกล่องแสดงความคิดเห็น --- */}
                <div style={{ marginTop: '15px', background: '#f8f9fa', padding: '15px', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                            type="text" 
                            placeholder={isLoggedIn ? "แสดงความคิดเห็น..." : "กรุณาเข้าสู่ระบบเพื่อคอมเมนต์"} 
                            disabled={!isLoggedIn}
                            value={commentInputs[post.id] || ""}
                            onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                            onKeyPress={(e) => { if(e.key === 'Enter') handleSubmitComment(post.id); }} // กด Enter เพื่อส่งได้
                            style={{ flex: 1, padding: '10px 15px', borderRadius: '20px', border: '1px solid #ddd', outline: 'none' }}
                        />
                        <button 
                            onClick={() => handleSubmitComment(post.id)}
                            disabled={!isLoggedIn || !commentInputs[post.id]}
                            style={{ 
                                background: (isLoggedIn && commentInputs[post.id]) ? '#ff4e63' : '#ccc', 
                                color: '#fff', border: 'none', padding: '0 20px', borderRadius: '20px', 
                                cursor: (isLoggedIn && commentInputs[post.id]) ? 'pointer' : 'not-allowed' 
                            }}
                        >
                            ส่ง
                        </button>
                    </div>
                </div>

                        </div>
                    ))}

                    {/* กรณีไม่มีโพสต์เลย */}
                    {(!newsPosts || newsPosts.length === 0) && (
                        <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                            <i className="fas fa-newspaper" style={{ fontSize: '40px', marginBottom: '15px', color: '#ddd' }}></i>
                            <p>ยังไม่มีข่าวสารอัปเดตในขณะนี้</p>
                        </div>
                    )}
                </div>
            )}
            {/* ══ BOOK ROWS (ส่ง onView เข้าไปด้วย) ══ */}
            {/* ══ ส่วนเนื้อหาหลัก: สลับหน้าแรก กับ หน้าดูทั้งหมด ══ */}
            <div className="books-display-area">
                
                {viewAllCategory ? (
                    /* 🔹 หน้า "ดูทั้งหมด" (แสดงเมื่อมีการคลิก ดูทั้งหมด) */
                    <div className="view-all-page" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px', gap: '15px' }}>
                            <button 
                                onClick={() => setViewAllCategory(null)} 
                            >
                                <i className="fas fa-arrow-left"></i> กลับหน้าหลัก
                            </button>
                            <h2 style={{ margin: 0 }}>{viewAllCategory} ยอดนิยม ทั้งหมด</h2>
                        </div>

                        {/* Grid Layout */}
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, 160px)', 
                            gap: '20px',
                            rowGap: '40px',
                            justifyContent: 'start'
                        }}>
                            {(viewAllCategory === 'การ์ตูน/มังงะ' ? mangaBooks : novelBooks).map(book => (
                <BookCard 
                    key={book.id}
                    book={book}
                    isLoggedIn={isLoggedIn}
                    onView={setViewBook}
                    onAddToCart={addToCart}
                    isFavorite={favoriteIds.includes(book.id)}
                    isPurchased={purchasedIds.includes(book.id)}
                    handleToggleFavorite={handleToggleFavorite}
                />
            ))}
            </div>
        </div>
    ) : (
        /* 🔸 หน้าแรกปกติ (Tab แนะนำ) */
        activeTab === 'แนะนำ' && (
            <>
                {/* หมวดมังงะ */}
                <div className="section-heading">
                    <h3 className="section-heading-title">มังงะ&การ์ตูน (ยอดนิยม)</h3>
                    <button className="section-heading-all" onClick={() => setViewAllCategory('การ์ตูน/มังงะ')}>
                        ดูทั้งหมด <i className="fas fa-chevron-right"></i>
                    </button>
                </div>
                <BookRow 
                    books={mangaBooks.slice(0, 7)}
                    isLoggedIn={isLoggedIn} 
                    onView={setViewBook} 
                    onAddToCart={addToCart}
                    favoriteIds={favoriteIds} 
                    purchasedIds={purchasedIds}
                    handleToggleFavorite={handleToggleFavorite}
                />

                <div style={{ height: '40px' }}></div>

                {/* หมวดนิยาย */}
                <div className="section-heading">
                    <h3 className="section-heading-title">นิยาย (ยอดนิยม)</h3>
                    <button className="section-heading-all" onClick={() => setViewAllCategory('นิยาย')}>
                        ดูทั้งหมด <i className="fas fa-chevron-right"></i>
                    </button>
                </div>
                <BookRow 
                    books={novelBooks.slice(0, 7)}
                    isLoggedIn={isLoggedIn} 
                    onView={setViewBook} 
                    onAddToCart={addToCart}
                    favoriteIds={favoriteIds} 
                    purchasedIds={purchasedIds}
                    handleToggleFavorite={handleToggleFavorite}
                />
            </>
        )
    )}
</div>
            
            {books.length === 0 && (
                <div style={{ textAlign: 'center', padding: '50px 0', color: '#888' }}>
                    กำลังโหลดข้อมูลหนังสือ หรือ ยังไม่มีหนังสือในระบบ...
                </div>
            )}
            </div>{/* end main content wrapper */}

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
                        
                        {/* ปุ่มปิด + ปุ่ม fav */}
                        <button onClick={() => setViewBook(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888', outline: 'none' }}>
                            <i className="fas fa-times"></i>
                        </button>
                        {isLoggedIn && (
                            <button
                                onClick={(e) => handleToggleFavorite(e, viewBook)}
                                style={{
                                    position: 'absolute', top: '15px', right: '50px',
                                    background: 'none', border: 'none', fontSize: '22px',
                                    cursor: 'pointer',
                                    color: favoriteIds.includes(viewBook.id) ? '#ff4e63' : '#ccc',
                                    transition: 'color 0.2s',
                                    outline: 'none'
                                }}
                                title={favoriteIds.includes(viewBook.id) ? 'เอาออกจากรายการโปรด' : 'เพิ่มในรายการโปรด'}
                            >
                                <i className={favoriteIds.includes(viewBook.id) ? 'fas fa-heart' : 'far fa-heart'} />
                            </button>
                        )}
                        
                        <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                            <img src={viewBook.image || 'https://via.placeholder.com/150'} alt={viewBook.title} style={{ width: '130px', height: '190px', objectFit: 'cover', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }} />
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: '0 0 10px 0', color: '#222', fontSize: '20px', lineHeight: '1.3' }}>{viewBook.title}</h3>
                                <div style={{ fontSize: '14px', color: '#666', marginBottom: '6px' }}><strong>ผู้แต่ง:</strong> {viewBook.author || 'ไม่ระบุ'}</div>
                                <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                                    <strong>หมวดหมู่:</strong> <span style={{color: '#b5651d', fontSize: '14px', fontweight:"bold", marginLeft: '5px' }}>{viewBook.category}</span>
                                </div>
                                <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'black', marginTop: '10px' }}>
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
                            {isOwned ? (
                                <button 
                                    onClick={() => navigate(`/read/${viewBook.id}`)} 
                                    style={{ 
                                        width: '100%', padding: '12px', 
                                        background: '#b5651d', color: '#fff', 
                                        border: 'none', borderRadius: '6px', 
                                        cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' 
                                    }}>
                                     อ่านเลย
                                </button>
                            ) : (
                                <>
                                    {isLoggedIn && !purchasedIds.some(id => Number(id) === Number(viewBook.id)) && !purchasedBooks.some(id => Number(id) === Number(viewBook.id)) && (
                                <button 
                                    onClick={() => addToCart(viewBook.id)}
                                    style={{ 
                                        flex: 1, padding: '12px', background: '#b5651d', 
                                        color: '#fff', border: 'none', borderRadius: '6px', 
                                        cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' 
                                    }}>
                                    <i className="fas fa-shopping-cart"></i> เพิ่มลงตะกร้า
                                </button>
                            )}

                            {/* ปุ่มอ่าน: ถ้าซื้อแล้วปุ่มจะขยายเต็ม และเปลี่ยนคำเป็น "อ่านเลย" */}
                            <button 
                                onClick={() => navigate(`/read/${viewBook.id}`)}
                                style={{ 
                                    flex: (isLoggedIn && !purchasedIds.some(id => Number(id) === Number(viewBook.id)) && !purchasedBooks.some(id => Number(id) === Number(viewBook.id))) ? 1 : 'none', 
                                    width: (isLoggedIn && !purchasedIds.some(id => Number(id) === Number(viewBook.id)) && !purchasedBooks.some(id => Number(id) === Number(viewBook.id))) ? 'auto' : '100%', 
                                    padding: '12px', background: '#f5f5f5', 
                                    color: '#333', border: '1px solid #ddd', 
                                    borderRadius: '6px', cursor: 'pointer', 
                                    fontWeight: 'bold', fontSize: '15px' 
                                }}>
                                {(purchasedIds.some(id => Number(id) === Number(viewBook.id)) || purchasedBooks.some(id => Number(id) === Number(viewBook.id))) ? ' อ่านเลย' : ' ทดลองอ่าน'}
                            </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ══ APP MODAL (แทน alert) ══ */}
            {appModal && (
                <div
                    onClick={() => setAppModal(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 99999,
                        background: 'rgba(0,0,0,0.35)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px',
                        backdropFilter: 'blur(3px)',
                        animation: 'fadeIn 0.15s ease'
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#fff',
                            borderRadius: '20px',
                            padding: '36px 32px 28px',
                            maxWidth: '360px',
                            width: '100%',
                            textAlign: 'center',
                            boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
                            position: 'relative',
                            animation: 'slideUp 0.2s ease'
                        }}
                    >
                        {/* ไอคอนวงกลมด้านบน */}
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%',
                            margin: '0 auto 16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 30,
                            background:
                                appModal.type === 'success' ? '#e8f5e9' :
                                appModal.type === 'error'   ? '#fdecea' :
                                appModal.type === 'warn'    ? '#fff8e1' : '#e3f2fd',
                        }}>
                            {appModal.type === 'success' ? '' :
                             appModal.type === 'error'   ? '' :
                             appModal.type === 'warn'    ? '' : 'ℹ'}
                        </div>

                        {/* หัวข้อ */}
                        {appModal.title && (
                            <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>
                                {appModal.title}
                            </div>
                        )}

                        {/* ข้อความ */}
                        <p style={{ margin: '0 0 24px', color: '#555', fontSize: 14, lineHeight: 1.7 }}>
                            {appModal.message}
                        </p>

                        {/* ปุ่มตกลง */}
                        <button
                            onClick={() => setAppModal(null)}
                            style={{
                                background:
                                    appModal.type === 'success' ? '#2ecc71' :
                                    appModal.type === 'error'   ? '#e74c3c' :
                                    appModal.type === 'warn'    ? '#f39c12' : '#3498db',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '11px 40px',
                                fontSize: 15,
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'opacity 0.15s',
                                width: '100%',
                                letterSpacing: 0.3
                            }}
                            onMouseOver={e => e.currentTarget.style.opacity = '0.88'}
                            onMouseOut={e => e.currentTarget.style.opacity = '1'}
                        >
                            ตกลง
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}

export default Home;