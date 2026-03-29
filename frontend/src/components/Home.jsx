import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/style.css';
import Login from './login';
import Register from './Register';


const TABS = ['แนะนำ', 'โปรโมชั่น', 'จัดชุด', 'นิยาย', 'การ์ตูน/มังงะ', 'อีบุ๊กทั่วไป', 'ข่าว/นิตยสาร', 'เร็วๆ นี้'];

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
    purchasedIds, // ใช้ตัวนี้เป็นหลัก
    handleToggleFavorite 
}) {
    // คำนวณหาว่าซื้อหรือยังจาก Array IDs ที่ส่งมา (รองรับทั้งหน้าแนะนำและหน้านิยาย)
    const hasPurchased = isPurchased || (purchasedIds && purchasedIds.some(id => Number(id) === Number(book.id)));

    return (
        <div className="bcard" style={{ background: 'none', border: 'none', padding: '0' }}>
            
            {/* --- ส่วนที่ 1: หน้าปกหนังสือและปุ่มลัด --- */}
            <div className="bcard-cover" style={{ height: '230px', position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
                <div className="bcard-img-placeholder" style={{ padding: 0, width: '100%', height: '100%' }}>
                    {book.image ? (
                        <img src={book.image} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eee' }}>
                            <i className="fas fa-image" style={{ fontSize: '40px', color: '#ccc' }}></i>
                        </div>
                    )}
                    
                    {book.subtitle && book.subtitle.includes('เล่ม 1') && (
                        <span className="bcard-vol-badge">เล่ม 1</span>
                    )}
                </div>

                {/* ปุ่มหัวใจ */}
                {isLoggedIn && (
                    <button
                        className={`bcard-fav ${isFavorite ? 'active' : ''}`}
                        style={{ 
                            position: 'absolute', top: '10px', right: '10px', zIndex: 10,
                            color: isFavorite ? '#ff4e63' : '#ccc',
                            background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%',
                            width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        onClick={(e) => handleToggleFavorite(e, book)} 
                    >
                        <i className={isFavorite ? 'fas fa-heart' : 'far fa-heart'} style={{ fontSize: '18px' }}></i>
                    </button>
                )}

                <div className="bcard-info">
                    <div className="bcard-price-row" style={{ justifyContent: 'center', width: '100%' }}>
                        
                        {/* 💡 แก้ไขตรงนี้: ถ้าซื้อแล้ว (!hasPurchased) ปุ่มรถเข็นต้องไม่ขึ้น */}
                        {isLoggedIn && !hasPurchased && (
                            <button 
                                className="bcard-cart" 
                                onClick={e => { e.stopPropagation(); onAddToCart(book.id); }} 
                                style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: '#ff4e63', color: '#fff', cursor: 'pointer' }}
                            >
                                <i className="fas fa-shopping-cart"></i>
                            </button>
                        )}
                        
                        {/* 💡 แสดงป้ายซื้อแล้ว */}
                        {isLoggedIn && hasPurchased && (
                            <div style={{ color: '#4caf50', fontSize: '16px', fontWeight: 'bold', background: 'rgba(255,255,255,0.95)', padding: '5px 15px', borderRadius: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                <i className="fas fa-check-circle"></i> ซื้อแล้ว
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- ส่วนที่ 2: รายละเอียดด้านล่าง --- */}
            <div className="bcard-details" style={{ marginTop: '10px', textAlign: 'left', background: '#fff', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                <div className="bcard-title" style={{ fontSize: '14px', fontWeight: 'bold', height: '34px', overflow: 'hidden' }}>{book.title}</div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '5px 0' }}>
                    <div style={{ fontSize: '11px', color: '#fff', background: '#ff4e63', padding: '2px 8px', borderRadius: '10px' }}>
                        {book.category || 'ทั่วไป'}
                    </div>
                    <div style={{ color: '#ff4e63', fontSize: '13px', fontWeight: 'bold' }}>
                        <i className={isFavorite ? 'fas fa-heart' : 'far fa-heart'}></i> {book.likes || 0}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ff4e63' }}>
                        {book.price === 0 || book.price === '0' ? 'ฟรี' : `฿ ${book.price}`}
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onView(book); }}
                        style={{ background: '#333', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                    >
                        <i className="fas fa-eye"></i> View
                    </button>
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
                {showSeeAll && <a href="#" className="brow-seeall">ดูทั้งหมด</a>}
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
    const [banners, setBanners] = useState([]);
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
    // 1. เพิ่ม State สำหรับเก็บหมวดที่ต้องการดูทั้งหมด (วางไว้ด้านบนใน function Home)
    const [viewAllCategory, setViewAllCategory] = useState(null); 
    const [topupHistory, setTopupHistory] = useState([]);
    const fetchTopupHistory = async () => {
    try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:3001/topup-history', {
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
        alert("กรุณาเข้าสู่ระบบก่อนกดถูกใจครับ 🔒");
        return;
    }

    try {
        const res = await axios.post('http://localhost:3001/favorites/toggle', 
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
            const res = await axios.get('http://localhost:3001/purchased', {
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
            const res = await axios.get('http://localhost:3001/favorites', {
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
        axios.get('http://localhost:3001/library/check', {
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
            const res = await axios.get('http://localhost:3001/cart', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // ตรงนี้ปรับให้ตรงกับโค้ด set state ตะกร้าเดิมของคุณ (เช่น setCartCount(res.data.length))
            setCartCount(res.data.length || 0); 
        } catch (error) {
            console.error("Error fetching cart:", error);
            
            // 🔻 เพิ่มการดักจับ Error 403 ตรงนี้ 🔻
            if (error.response && error.response.status === 403) {
                alert("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้งครับ 🔒");
                localStorage.clear(); // ล้าง Token เก่าทิ้ง
                setIsLoggedIn(false);
                window.location.reload(); // รีเฟรชหน้าเว็บ 1 รอบ
            }
        }
    };

    const addToCart = async (bookId) => {
    const token = localStorage.getItem('token');
    if (!token) {
        alert("กรุณาเข้าสู่ระบบก่อนครับ");
        return;
    }

    try {
        await axios.post('http://localhost:3001/cart/add', 
            { book_id: bookId }, 
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        //นับเรียลไทม์ cart
        setCartCount(prev => prev + 1); 
        
        setViewBook(null); // ปิดหน้าต่าง
        alert("เพิ่มลงตะกร้าเรียบร้อยแล้ว!");

    } catch (err) {
        // ให้มัน log ออกมาใน Console ด้วย จะได้ตามสืบง่าย
        console.error("Cart Add Error:", err); 

        if (err.response) {
            // ถ้าระบบตอบกลับมา
            if (err.response.status === 400) {
                alert("หนังสือเล่มนี้อยู่ในตะกร้าแล้วครับ");
            } else if (err.response.status === 401 || err.response.status === 403) {
                alert("เซสชันหมดอายุ กรุณาล็อกอินใหม่อีกครั้งครับ");
                localStorage.clear(); // ล้างข้อมูลที่หมดอายุ
                window.location.reload(); // รีเฟรชหน้าต่างเพื่อให้ไปล็อกอินใหม่
            } else {
                alert(`Backend ฟ้องว่า: ${err.response.data.message || 'Error ' + err.response.status}`);
            }
        } else {
            // ถ้าเซิร์ฟเวอร์ไม่ตอบสนองเลย (เช่น ลืมรัน node)
            alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (อย่าลืมเช็กว่ารัน node server.js อยู่ไหม)");
        }
    }
};
    
    const [username, setUsername]       = useState('');
    const [isLoggedIn, setIsLoggedIn]   = useState(false);
    const [role, setRole] = useState(null);
    const [profileImage, setProfileImage] = useState(null);

    const [modal, setModal]             = useState(null);
    const [activeTab, setActiveTab]     = useState('แนะนำ');
    const [megaOpen, setMegaOpen]       = useState(false);
    const [hoveredMenu, setHoveredMenu] = useState(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [bannerIdx, setBannerIdx]     = useState(0);
    const [coins, setCoins]             = useState(null);
    const [notifOpen, setNotifOpen]           = useState(false);
    const [notifications, setNotifications]   = useState(MOCK_NOTIFICATIONS);

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
    // ดึงข้อมูลหนังสือทั้งหมดจาก Database
    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const res = await axios.get('http://localhost:3001/books');
                setBooks(res.data);
            } catch (err) {
                console.error("Error fetching books:", err);
            }
        };
        fetchBooks();
        fetchBanners();
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
        const res = await axios.get("http://localhost:3001/posts", {
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
                    const res = await axios.get('http://localhost:3001/profile', {
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
    const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    const markOneRead = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
    const fetchBanners = async () => {
        try {
            const res = await axios.get('http://localhost:3001/banners'); // ดึงข้อมูลแบนเนอร์จาก API ที่เพิ่งสร้าง
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
        await axios.post(`http://localhost:3001/posts/${postId}/like`);
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
        await axios.post(`http://localhost:3001/posts/${postId}/dislike`);
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
        alert("กรุณาเข้าสู่ระบบก่อนกดโหวตครับ");
        return;
    }

    try {
        // เรียก API ไปที่ Backend
        const res = await axios.post(`http://localhost:3001/posts/${postId}/vote`, 
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
        await axios.post(`http://localhost:3001/posts/${postId}/comment`, 
            { text }, 
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // 🌟 2. ดึงข้อมูลโพสต์ใหม่ (ต้องส่ง Token ไปด้วย เพื่อให้รู้ว่าเราเคยกดไลค์ไว้) 🌟
        const res = await axios.get("http://localhost:3001/posts", {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        setNewsPosts(res.data);
        
        // ล้างช่องคอมเมนต์ให้ว่าง
        setCommentInputs(prev => ({ ...prev, [postId]: "" }));
    } catch (err) {
        alert("ต้องเข้าสู่ระบบก่อนคอมเมนต์ครับ");
    }
};
    const handleOverlayClick = (e) => {
        if (e.target.classList.contains('modal-overlay')) setModal(null);
    };
    const mangaBooks = books
    .filter(b => b.category === 'มังงะ' || b.category === 'การ์ตูน')
    .sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0));

// 2. หมวดนิยาย (กรองเอาเฉพาะหมวดนี้ + เรียงตาม Likes มากไปน้อย)
const novelBooks = books
    .filter(b => b.category === 'นิยาย')
    .sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0));

// 3. (ถ้ามี) หมวดแนะนำรวม (รวมทุกหมวดที่ไลก์เยอะที่สุด 10 เล่มแรก)
    const recommendedBooks = [...books]
    .sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0))
    .slice(0, 10);
    // กรองหนังสือ
    const filteredNovels = (novelBooks || [])
    .filter(book => book.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
        if (sortBy === 'priceLow') return a.price - b.price;
        if (sortBy === 'priceHigh') return b.price - a.price;
        if (sortBy === 'likesLow') return (a.likes || 0) - (b.likes || 0);
        if (sortBy === 'likesHigh') return (b.likes || 0) - (a.likes || 0);
        return b.id - a.id; // เริ่มต้นที่ไอดีล่าสุด
    });
    // ตรวจสอบว่าซื้อหนังสือเล่มที่กำลังดูอยู่ (viewBook) หรือยัง
    const isOwned = isLoggedIn && Array.isArray(purchasedBooks) && viewBook 
    ? purchasedBooks.some(id => Number(id) === Number(viewBook.id))
    : false;
    return (
        <div className="home-page">

            {/* ══ NAVBAR ══ */}
            <header className="navbar">
                <div className="navbar-inner">

                <div className="nav-left">
                    <div className="nav-logo" onClick={() => navigate('/')} style={{cursor:'pointer'}}>
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
                                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: '10px' }}>
                                        <button 
                                            onClick={() => navigate('/admin')}
                                            style={{
                                                padding: '6px 12px',          // ลดขนาดความอ้วนของปุ่ม
                                                fontSize: '13px',             // ลดขนาดตัวอักษรนิดหน่อย
                                                borderRadius: '20px',         // ทำขอบให้มนๆ แบบเม็ดยา
                                                border: 'none',
                                                background: '#1e293b',        // สีเทาเข้มๆ ดูคลาสสิค
                                                color: '#fff',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',                   // ระยะห่างระหว่างไอคอนกับตัวหนังสือ
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                                transition: '0.2s'
                                            }}
                                            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                                            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                                        >
                                            <i className="fas fa-cogs"></i> จัดการเนื้อหา
                                        </button>

                                        <button 
                                            onClick={() => navigate('/admin-topup')}
                                            style={{ 
                                                marginLeft: '8px',            // ขยับห่างจากปุ่มแรกนิดนึง
                                                padding: '1px 30px',
                                                fontSize: '13px',
                                                borderRadius: '20px',
                                                border: 'none',
                                                background: '#ff9800',        // สีส้มเด่นๆ
                                                color: '#fff',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'left',
                                                gap: '6px',
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                                transition: '0.2s'
                                            }}
                                            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                                            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                                        >
                                            <i className="fas fa-file-invoice-dollar"></i> ตรวจสอบสลิป
                                        </button>
                                    </div>
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
                                            <div className="notif-footer" onClick={() => setNotifOpen(false)}>ดูการแจ้งเตือนทั้งหมด</div>
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
                                <button className="nav-icon-btn pos-rel" onClick={() => navigate('/cart')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', position: 'relative', color: '#333' }}>
                                    <i className="fas fa-shopping-cart"></i>
                                    {cartCount > 0 && <span className="nbadge red" style={{ position: 'absolute', top: '-5px', right: '-8px', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '50%', border: '2px solid #fff' }}>{cartCount}</span>}
                                </button>
                                <div className="profile-wrap" ref={profileRef}>
                                    <button className="nav-user-btn" onClick={() => setProfileOpen(v => !v)}>
                                        {/* 👈 เปลี่ยนจากไอคอน <i> ธรรมดา เป็นเงื่อนไขเช็ครูป */}
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
                                            
                                            {/* 🔻 ส่วนที่เพิ่มเข้ามา: แสดงเหรียญ 🔻 */}
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
                                            {/* 🔺 สิ้นสุดส่วนแสดงเหรียญ 🔺 */}

                                            <div className="pd-divider"></div>
                                            <div className="pd-item" onClick={() => navigate('/myshelf')}><i className="fas fa-layer-group"></i> ชั้นหนังสือ</div>
                                            <div className="pd-item" onClick={() => navigate('/history')}><i className="fas fa-history"></i> ประวัติซื้อ</div>
                                            <div className="pd-item" onClick={() => navigate('/topup')}><i className="fas fa-coins"></i> ซื้อเหรียญ</div>
                                            <div className="pd-item" onClick={() => navigate('/transaction')}><i className="fas fa-exchange-alt"></i> รายการเติมเงิน</div>
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
                                <button className="btn-login"    onClick={() => setModal('login')}>เข้าสู่ระบบ</button>
                                <button className="btn-register" onClick={() => setModal('register')}>สมัครสมาชิก</button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* ══ SUB-TABS BAR ══ */}
            <div className="sub-tabs">
                <div className="sub-tabs-inner">
                    {TABS.map(tab => (
                        <button key={tab}
                            className={`sub-tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}>
                            {tab}
                        </button>
                    ))}
                </div>
            </div>
                    {/* --- ส่วนเนื้อหาตาม Tab --- */}

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
                                                    src={`http://localhost:3001${banner.image}`} 
                                                    alt={banner.title || 'Banner'} 
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} 
                                                />
                                            </a>
                                        ) : (
                                            <img 
                                                src={`http://localhost:3001${banner.image}`} 
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
                                    zIndex: 2, color: '#ff4e63'
                                }}>
                                    <i className="fas fa-chevron-left"></i>
                                </button>
                                
                                <button onClick={nextBanner} style={{
                                    position: 'absolute', right: '-15px', top: '50%', transform: 'translateY(-50%)',
                                    background: '#fff', border: '1px solid #ddd', borderRadius: '50%',
                                    width: '45px', height: '45px', cursor: 'pointer', fontSize: '18px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                    zIndex: 2, color: '#ff4e63'
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
            {activeTab === 'นิยาย' && (
                    <div style={{ animation: 'fadeIn 0.5s' }}>
                        {/* --- 1. ส่วนควบคุม (Search & Sort) --- */}
                        <div style={{ 
                            display: 'flex', gap: '15px', marginBottom: '25px', 
                            alignItems: 'center', flexWrap: 'wrap', background: '#f9f9f9',
                            padding: '15px', borderRadius: '12px' 
                        }}>
                            {/* ช่องค้นหา */}
                            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                                <i className="fas fa-search" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#999' }}></i>
                                <input 
                                    type="text" 
                                    placeholder="ค้นหาชื่อเรื่องหรือนักเขียน..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ width: '100%', padding: '10px 15px 10px 40px', borderRadius: '25px', border: '1px solid #ddd', outline: 'none' }}
                                />
                            </div>

                            {/* ตัวเลือกการจัดเรียง */}
                            <select 
                                value={sortBy} 
                                onChange={(e) => setSortBy(e.target.value)}
                                style={{ padding: '8px 15px', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer' }}
                            >
                                <option value="latest">มาใหม่ล่าสุด</option>
                                <option value="priceLow">ราคา: น้อยไปมาก</option>
                                <option value="priceHigh">ราคา: มากไปน้อย</option>
                                <option value="likesHigh">หัวใจ: มากไปน้อย</option>
                                <option value="likesLow">หัวใจ: น้อยไปมาก</option>
                            </select>
                        </div>

                        {/* --- 2. ส่วนแสดงผลรายการนิยาย --- */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
                            {/* ใช้ filteredNovels ที่เราเขียน Logic กรองไว้แล้วมาวน Loop */}
                            {filteredNovels.length > 0 ? (
                                filteredNovels.map(book => (
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
                                <div style={{ gridColumn: 'span 7', textAlign: 'center', padding: '50px', color: '#999' }}>
                                    <i className="fas fa-search" style={{ fontSize: '30px', marginBottom: '10px' }}></i>
                                    <p>ไม่พบผลลัพธ์ที่ตรงกับคำค้นหาของคุณ</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {/* --- ส่วนเนื้อหา Tab มังงะ --- */}
            {activeTab === 'การ์ตูน/มังงะ' && (
                <>
                    {/* Filter Bar สำหรับมังงะ */}
                    <div className="filter-container" style={{ 
                        display: 'flex', gap: '15px', marginBottom: '20px', 
                        alignItems: 'center', flexWrap: 'wrap', padding: '0 10px' 
                    }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }}></i>
                            <input 
                                type="text" 
                                placeholder="ค้นหามังงะที่น่าสนใจ..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ 
                                    width: '100%', padding: '12px 15px 12px 40px', 
                                    borderRadius: '30px', border: '1px solid #efefef',
                                    backgroundColor: '#f8f9fa', outline: 'none'
                                }}
                            />
                        </div>

                        {/* เรียงลำดับสำหรับมังงะ */}
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd' }}
                        >
                            <option value="latest">มาใหม่ล่าสุด</option>
                            <option value="likesHigh">ยอดใจสูงสุด</option>
                            <option value="priceLow">ราคา: น้อยไปมาก</option>
                            <option value="priceHigh">ราคา: มากไปน้อย</option>
                        </select>
                    </div>

                    {/* รายการมังงะ (ใช้ mangaBooks ที่คุณประกาศไว้ด้านบนมา Filter) */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(7, 1fr)', 
                        gap: '20px',
                        rowGap: '30px'
                    }}>
                        {mangaBooks
                            .filter(book => book.title.toLowerCase().includes(searchQuery.toLowerCase()))
                            .sort((a, b) => {
                                if (sortBy === 'priceHigh') return b.price - a.price;
                                if (sortBy === 'priceLow') return a.price - b.price;
                                if (sortBy === 'likesHigh') return (b.likes || 0) - (a.likes || 0);
                                return b.id - a.id; 
                            })
                            .map(book => (
                                <BookCard 
                                    key={book.id}
                                    book={book}
                                    isLoggedIn={isLoggedIn}
                                    onView={setViewBook}
                                    onAddToCart={addToCart}
                                    isFavorite={favoriteIds.includes(book.id)}
                                    purchasedIds={purchasedIds} // ส่งตัวนี้เพื่อให้ขึ้น "ซื้อแล้ว"
                                    handleToggleFavorite={handleToggleFavorite}
                                />
                            ))
                        }
                    </div>

                    {/* กรณีค้นหาไม่เจอ */}
                    {mangaBooks.filter(book => book.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                        <div style={{ textAlign: 'center', padding: '50px', color: '#888' }}>
                            ไม่พบมังงะที่ค้นหา...
                        </div>
                    )}
                </>
            )}
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
                                    src={`http://localhost:3001${post.image_url}`} 
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
                                                                : `http://localhost:3001${comment.profile_image.startsWith('/') ? '' : '/'}${comment.profile_image}`)
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
                                style={{ 
                                    background: '#333', color: '#fff', border: 'none', 
                                    padding: '10px 20px', borderRadius: '8px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '8px' 
                                }}
                            >
                                <i className="fas fa-arrow-left"></i> กลับหน้าหลัก
                            </button>
                            <h2 style={{ margin: 0 }}>{viewAllCategory}ยอดนิยม ทั้งหมด</h2>
                        </div>

                        {/* Grid Layout: แถวละ 7 เล่ม */}
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(7, 1fr)', 
                            gap: '20px',
                            rowGap: '40px' 
                        }}>
                            {(viewAllCategory === 'การ์ตูน' ? mangaBooks : novelBooks).map(book => (
                <BookCard 
                    key={book.id}
                    book={book}
                    isLoggedIn={isLoggedIn}
                    onView={setViewBook}  // ส่งฟังก์ชันนี้ไป เพื่อให้กดปุ่ม View แล้วเปิด Modal ได้
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 10px' }}>
                    <h3 style={{ margin: 0 }}>มังงะ&การ์ตูน (ยอดนิยม)</h3>
                    <button 
                        onClick={() => setViewAllCategory('การ์ตูน')}
                        style={{ background: 'none', border: 'none', color: '#ff4e63', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        ดูทั้งหมด <i className="fas fa-chevron-right"></i>
                    </button>
                </div>
                <BookRow 
                    books={mangaBooks.slice(0, 7)} // โชว์แค่ 7 เล่มแรก
                    isLoggedIn={isLoggedIn} 
                    onView={setViewBook} 
                    onAddToCart={addToCart}
                    favoriteIds={favoriteIds} 
                    purchasedIds={purchasedIds}
                    handleToggleFavorite={handleToggleFavorite}
                />

                <div style={{ height: '40px' }}></div>

                {/* หมวดนิยาย */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 10px' }}>
                    <h3 style={{ margin: 0 }}>นิยาย (ยอดนิยม)</h3>
                    <button 
                        onClick={() => setViewAllCategory('นิยาย')}
                        style={{ background: 'none', border: 'none', color: '#ff4e63', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        ดูทั้งหมด <i className="fas fa-chevron-right"></i>
                    </button>
                </div>
                <BookRow 
                    books={novelBooks.slice(0, 7)} // โชว์แค่ 7 เล่มแรก
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
                        
                        <button onClick={() => setViewBook(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>
                            <i className="fas fa-times"></i>
                        </button>
                        
                        <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                            <img src={viewBook.image || 'https://via.placeholder.com/150'} alt={viewBook.title} style={{ width: '130px', height: '190px', objectFit: 'cover', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }} />
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: '0 0 10px 0', color: '#222', fontSize: '20px', lineHeight: '1.3' }}>{viewBook.title}</h3>
                                <div style={{ fontSize: '14px', color: '#666', marginBottom: '6px' }}><strong>ผู้แต่ง:</strong> {viewBook.author || 'ไม่ระบุ'}</div>
                                <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                                    <strong>หมวดหมู่:</strong> <span style={{ background: '#ff4e63', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', marginLeft: '5px' }}>{viewBook.category}</span>
                                </div>
                                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#ff4e63', marginTop: '10px' }}>
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
                                        background: '#2ecc71', color: '#fff', 
                                        border: 'none', borderRadius: '6px', 
                                        cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' 
                                    }}>
                                    📖 อ่านเลย
                                </button>
                            ) : (
                                <>
                                    {isLoggedIn && !purchasedIds.some(id => Number(id) === Number(viewBook.id)) && !purchasedBooks.some(id => Number(id) === Number(viewBook.id)) && (
                                <button 
                                    onClick={() => addToCart(viewBook.id)}
                                    style={{ 
                                        flex: 1, padding: '12px', background: '#ff4e63', 
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
                                {(purchasedIds.some(id => Number(id) === Number(viewBook.id)) || purchasedBooks.some(id => Number(id) === Number(viewBook.id))) ? '📖 อ่านเลย' : '📖 ทดลองอ่าน'}
                            </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            
        </div>
    );
}

export default Home;