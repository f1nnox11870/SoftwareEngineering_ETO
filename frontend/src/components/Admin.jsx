import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import '../assets/admin.css';
import Navbar from "./navbar";

const MAIN_CATEGORIES = [
    { label: 'นิยาย',           key: 'novel', tab: 'นิยาย'          },
    { label: 'การ์ตูน(มังงะ)', key: 'manga', tab: 'การ์ตูน/มังงะ'  },
];

const NOVEL_GENRES = ['นิยาย', 'นิยายรักโรแมนติก', 'นิยายวาย', 'นิยายแฟนตาซี', 'นิยายสืบสวน',
    'นิยายกำลังภายใน', 'ไลท์โนเวล', 'วรรณกรรมทั่วไป', 'นิยายยูริ', 'กวีนิพนธ์', 'แฟนเฟิค'];
const MANGA_GENRES = ['มังงะ', 'การ์ตูน', 'การ์ตูนโรแมนติก', 'การ์ตูนแอคชั่น',
    'การ์ตูนแฟนตาซี', 'การ์ตูนตลก', 'การ์ตูนสยองขวัญ', 'การ์ตูนกีฬา', 'การ์ตูนวาย', 'การ์ตูนยูริ'];

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
    return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}
function loadReadIds() {
    try { return new Set(JSON.parse(localStorage.getItem('notif_read_ids') || '[]')); } catch { return new Set(); }
}
function saveReadId(id) {
    try { const s = loadReadIds(); s.add(id); localStorage.setItem('notif_read_ids', JSON.stringify([...s].slice(-200))); } catch {}
}

function Admin() {
  const navigate = useNavigate();

  // ================= STATES (เดิม) =================
  const [activeTab, setActiveTab] = useState("addBook");
  const [books, setBooks] = useState([]);
  const [title, setTitle] = useState("");
  const [image, setImage] = useState("");       // base64 สำหรับ preview
  const [imageFile, setImageFile] = useState(null); // File object สำหรับ upload
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [genre, setGenre] = useState("");
  const [price, setPrice] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [episodes, setEpisodes] = useState([]);
  const [epNumber, setEpNumber] = useState("");
  const [epTitle, setEpTitle] = useState("");
  const [epContent, setEpContent] = useState("");
  const [epImages, setEpImages] = useState([]);
  const selectedBook = books.find(b => b.id.toString() === selectedBookId.toString());
  const isManga = selectedBook && MANGA_GENRES.includes(selectedBook.category);
  const [banners, setBanners] = useState([]);
  const [newBannerImage, setNewBannerImage] = useState(null);

  // ── Navbar state (เพิ่มใหม่ เหมือน Topup) ──
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

  // ================= EFFECTS (เดิม) =================
  useEffect(() => { fetchBanners(); }, []);
  useEffect(() => {
    const savedRole = localStorage.getItem("role");
    if (savedRole !== "admin") { navigate("/"); } else { fetchBooks(); }
  }, [navigate]);
  useEffect(() => {
    if (selectedBookId) { fetchEpisodes(selectedBookId); setEpContent(""); setEpImages([]); }
    else { setEpisodes([]); }
  }, [selectedBookId]);

  // ── Navbar effects (เพิ่มใหม่) ──
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user  = localStorage.getItem('username');
    const savedRole = localStorage.getItem('role');
    if (token) { setIsLoggedIn(true); if (user) setUsername(user); setRole(savedRole); }
  }, []);
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/books/categories`).then(res => setDbCategories(res.data)).catch(() => {});
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
        const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/profile`, { headers: { Authorization: `Bearer ${token}` } });
        setCoins(res.data.coins ?? 0); setProfileImage(res.data.image || null);
      } catch { setCoins(0); }
    };
    fetchProfile();
    refreshNotifications(token);
    axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/favorites`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setFavoriteIds(res.data.map(i => i.book_id))).catch(() => {});
    axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/cart`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setCartCount(res.data.length)).catch(() => {});
    coinInterval.current = setInterval(fetchProfile, 30000);
    return () => clearInterval(coinInterval.current);
  }, [isLoggedIn]);

  const refreshNotifications = async (token) => {
    const headers = { Authorization: `Bearer ${token}` };
    const readIds = loadReadIds();
    try {
      const [topupRes, histRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/topup/my-requests`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/history`, { headers }).catch(() => ({ data: [] })),
      ]);
      const notifs = [];
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
  const markOneRead = (id) => { saveReadId(id); setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n)); };
  const handleLogout = () => {
    localStorage.removeItem('token'); localStorage.removeItem('username');
    setIsLoggedIn(false); setUsername(''); setProfileOpen(false); setCoins(null);
    navigate('/');
  };

  // ================= API CALLS (เดิม) =================
  const fetchBooks = async () => {
    try { 
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/books`);
      setBooks(Array.isArray(res.data) ? res.data : []);
    }
    catch (err) { console.error("Error fetching books:", err); }
  };
  const fetchEpisodes = async (bookId) => {
    try { const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/books/${bookId}/episodes`); setEpisodes(res.data); }
    catch (err) { console.error("Error fetching episodes:", err); }
  };

  // ================= HANDLERS (เดิม) =================
  const handleFile = (file) => {
    if (file && file.type.startsWith("image/")) {
      setImageFile(file); // เก็บ File object ไว้ upload
      const reader = new FileReader(); reader.onload = (e) => setImage(e.target.result); reader.readAsDataURL(file);
    } else { alert("กรุณาเลือกไฟล์รูปภาพเท่านั้นครับ"); }
  };
  const handleMultipleFiles = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(f => f.type.startsWith("image/"));
    if (validFiles.length !== files.length) alert("บางไฟล์ไม่ใช่รูปภาพ ระบบจะข้ามไฟล์นั้นไปนะครับ");
    Promise.all(validFiles.map(file => new Promise((resolve) => {
      const reader = new FileReader(); reader.onload = (ev) => resolve(ev.target.result); reader.readAsDataURL(file);
    }))).then(base64Array => setEpImages(prev => [...prev, ...base64Array]));
  };
  const removeEpImage = (indexToRemove) => setEpImages(prev => prev.filter((_, index) => index !== indexToRemove));
  
  const fetchBanners = async () => {
    const token = localStorage.getItem('token'); if (!token) return;
    try { const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/banners`); setBanners(res.data); }
    catch (error) { console.error("Error fetching banners:", error); }
  };
  const handleAddBanner = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token'); if (!token) return;
    if (!newBannerImage) { alert("กรุณาเลือกรูปภาพแบนเนอร์ครับ"); return; }
    const formData = new FormData(); formData.append('image', newBannerImage);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/banners/add`, formData, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } });
      alert("เพิ่มแบนเนอร์สำเร็จ!"); setNewBannerImage(null); fetchBanners();
    } catch (error) { console.error("Error adding banner:", error); alert("เกิดข้อผิดพลาดในการเพิ่มแบนเนอร์"); }
  };
  const handleDeleteBanner = async (id) => {
    const token = localStorage.getItem('token'); if (!token) return;
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบแบนเนอร์นี้?")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/banners/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      alert("ลบแบนเนอร์สำเร็จ!"); fetchBanners();
    } catch (error) { console.error("Error deleting banner:", error); alert("เกิดข้อผิดพลาดในการลบแบนเนอร์"); }
  };
  
  const handleAddBook = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!image) return alert("กรุณาอัปโหลดรูปหน้าปกด้วยครับ");
    if (!category) return alert("กรุณาเลือกหมวดหมู่ด้วยครับ");
    if (!genre) return alert("กรุณาเลือกแนวหนังสือด้วยครับ");
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("author", author);
      formData.append("category", genre);
      formData.append("genre", genre);
      formData.append("description", description);
      formData.append("price", Number(price));
      formData.append("image", imageFile); // ✅ ใช้ File object โดยตรง ไม่ต้องแปลง base64

      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/admin/add-book`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("เพิ่มหนังสือสำเร็จ!"); 
      setTitle(""); setImage(""); setImageFile(null); setAuthor(""); setCategory(""); setGenre(""); setDescription(""); setPrice(""); 
      fetchBooks();
    } catch (err) { alert(err.response?.data?.message || "เกิดข้อผิดพลาด"); }
  };
  const handleAddEpisode = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!selectedBookId) return alert("กรุณาเลือกหนังสือก่อนครับ");
    let payloadContent = "";
    if (isManga) {
      if (epImages.length === 0) return alert("กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูปครับ");
      payloadContent = JSON.stringify(epImages);
    } else {
      if (!epContent.trim()) return alert("กรุณากรอกเนื้อหาด้วยครับ");
      payloadContent = epContent;
    }
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/admin/add-episode`, { book_id: selectedBookId, episode_number: epNumber, title: epTitle, content: payloadContent }, { headers: { Authorization: `Bearer ${token}` } });
      alert("เพิ่มตอนใหม่สำเร็จ!"); setEpNumber(""); setEpTitle(""); setEpContent(""); setEpImages([]); fetchEpisodes(selectedBookId);
    } catch (err) { alert(err.response?.data?.message || "เกิดข้อผิดพลาด"); }
  };
  const handleDeleteEpisode = async (epId) => {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบตอนนี้? (ลบแล้วลบเลย)")) return;
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/admin/delete-episode/${epId}`, { headers: { Authorization: `Bearer ${token}` } });
      alert("ลบตอนสำเร็จ"); fetchEpisodes(selectedBookId);
    } catch (err) { alert(err.response?.data?.message || "เกิดข้อผิดพลาดในการลบ"); }
  };
  const handleDeleteBook = async (bookId, bookTitle) => {
    if (!window.confirm(`ลบ "${bookTitle}" ใช่ไหมครับ?\n\n⚠️ ตอนทั้งหมดในเรื่องนี้จะถูกลบด้วย`)) return;
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/admin/delete-book/${bookId}`, { headers: { Authorization: `Bearer ${token}` } });
      alert("ลบหนังสือสำเร็จ!"); fetchBooks();
    } catch (err) { alert(err.response?.data?.message || "เกิดข้อผิดพลาดในการลบ"); }
  };

  // ================= STYLES (เดิม) =================
  const dropZoneStyle = { width: "100%", height: "250px", border: isDragging ? "3px dashed #ff4e63" : "2px dashed #ccc", borderRadius: "15px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: isDragging ? "#fff0f1" : "#fafafa", cursor: "pointer", transition: "all 0.3s ease", overflow: "hidden", marginBottom: "20px" };
  const inputStyle = { width: "100%", padding: "12px", marginBottom: "15px", border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box", fontSize: "14px", fontFamily: "Sarabun" };
  const btnStyle = { width: "100%", padding: "15px", background: "#b5651d", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", transition: "0.2s" };

  return (
    <div className="home-page shelf-page">
      <Navbar />

      {/* ══ HERO ══ */}
      <div className="topup-hero">
        <div className="topup-page-inner" >
          <div className="topup-breadcrumb" >
            <span className="topup-breadcrumb-home" onClick={() => navigate('/')}><i className="fas fa-house" style={{ color: '#999' }}></i></span>
            <i className="fas fa-angle-right" style={{ fontSize: 12, color: '#aaa', margin: '0 8px' }}></i>
            <span className="topup-breadcrumb-cur">ระบบจัดการเนื้อหา (Admin)</span>
          </div>
        </div>
      </div>

      {/* ══ MAIN CONTENT ══ */}
      <div style={{ maxWidth: "800px", margin: "40px auto", padding: "20px", fontFamily: "Sarabun", background: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" , borderRadius: "0"}}>
        <h1 style={{ textAlign: "center", color: "#333", marginBottom: "20px" }}>ระบบจัดการเนื้อหา (Admin Panel)</h1>
        <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginBottom: "30px", borderBottom: "2px solid #eee" }}>
          <button style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer", background: "none", border: "none", borderBottom: activeTab === "addBook" ? "3px solid #b5651d" : "3px solid transparent", color: activeTab === "addBook" ? "#b5651d" : "#555", fontWeight: "bold", borderRadius: "0" }} onClick={() => setActiveTab("addBook")}>
            <i className="fas fa-book" style={{ marginRight: "8px" }}></i> เพิ่มเรื่องใหม่
          </button>
          <button style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer", background: "none", border: "none", borderBottom: activeTab === "manageEpisodes" ? "3px solid #b5651d" : "3px solid transparent", color: activeTab === "manageEpisodes" ? "#b5651d" : "#555", fontWeight: "bold", borderRadius: "0" }} onClick={() => setActiveTab("manageEpisodes")}>
            <i className="fas fa-list-ol" style={{ marginRight: "8px" }}></i> จัดการตอน (Episodes)
          </button>
          <button style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer", background: "none", border: "none", borderBottom: activeTab === "manageBooks" ? "3px solid #ff4e63" : "3px solid transparent", color: activeTab === "manageBooks" ? "#ff4e63" : "#555", fontWeight: "bold", borderRadius: "0" }} onClick={() => setActiveTab("manageBooks")}>
            <i className="fas fa-trash-alt" style={{ marginRight: "8px" }}></i> จัดการหนังสือ
          </button>
        </div>

        {activeTab === "addBook" && (
          <form onSubmit={handleAddBook}>
            <label>ชื่อเรื่อง</label>
            <input style={inputStyle} type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <label>รูปหน้าปก (ลากไฟล์มาวางที่นี่)</label>
            <div style={dropZoneStyle} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }} onClick={() => document.getElementById("fileInput").click()}>
              {image ? <img src={image} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ textAlign: "center", color: "#888" }}><p>ลากรูปมาวางที่นี่ หรือ คลิกเพื่อเลือกไฟล์</p></div>}
              <input id="fileInput" type="file" hidden accept="image/*" onChange={(e) => handleFile(e.target.files[0])} />
            </div>
            <label>ผู้แต่ง</label>
            <input style={inputStyle} type="text" value={author} onChange={(e) => setAuthor(e.target.value)} />
            <label>หมวดหมู่หลัก</label>
            <select style={{ ...inputStyle, cursor: "pointer" }} value={category} onChange={(e) => { setCategory(e.target.value); setGenre(""); }} required>
              <option value="" disabled>-- กรุณาเลือกประเภทหลัก --</option>
              <option value="novel">📖 นิยาย</option>
              <option value="manga">🎨 มังงะ / การ์ตูน</option>
            </select>

            {/* ── Genre (แนวหนังสือ) แสดงเมื่อเลือก category แล้ว ── */}
            {category && (
              <>
                <label>แนวหนังสือ <span style={{ color: '#ff4e63' }}>*</span></label>
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: '8px',
                  marginBottom: '15px', padding: '12px',
                  border: '1px solid #e0e0e0', borderRadius: '8px',
                  background: '#fafafa'
                }}>
                  {(category === 'novel' ? NOVEL_GENRES : MANGA_GENRES).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGenre(g)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: genre === g ? '2px solid #b5651d' : '1px solid #ddd',
                        background: genre === g ? '#b5651d' : '#fff',
                        color: genre === g ? '#fff' : '#555',
                        fontSize: '13px', cursor: 'pointer',
                        fontFamily: 'Sarabun', fontWeight: genre === g ? 'bold' : 'normal',
                        transition: 'all 0.15s',
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                {genre && (
                  <div style={{ marginBottom: '15px', fontSize: '13px', color: '#888' }}>
                    ✅ เลือกแล้ว: <strong style={{ color: '#b5651d' }}>{genre}</strong>
                  </div>
                )}
              </>
            )}
            <label>ราคา (บาท)</label>
            <input style={inputStyle} type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="เช่น 199 หรือเว้นว่าง/ใส่ 0 เพื่อให้อ่านฟรี" />
            <label>คำอธิบาย</label>
            <textarea style={{ ...inputStyle, height: "100px", resize: "vertical" }} value={description} onChange={(e) => setDescription(e.target.value)} />
            <button type="submit" style={btnStyle}>บันทึกข้อมูลและอัปเดตหน้า Home</button>
          </form>
        )}

        {activeTab === "manageEpisodes" && (
          <div>
            <label style={{ fontWeight: "bold" }}>เลือกหนังสือที่ต้องการจัดการตอน:</label>
            <select style={{ ...inputStyle, cursor: "pointer"}} value={selectedBookId} onChange={(e) => setSelectedBookId(e.target.value)}>
              <option value="">-- กรุณาเลือกหนังสือ --</option>
              {books.map(book => <option key={book.id} value={book.id}>[ID: {book.id}] {book.title} ({book.category})</option>)}
            </select>

            {selectedBookId && (
              <>
                <div style={{ background: "#f9f9f9", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
                  <h3 style={{ marginTop: 0, color: "#333", borderBottom: "1px solid #ddd", paddingBottom: "10px" }}>ตอนทั้งหมดในเรื่องนี้</h3>
                  {episodes.length === 0 ? (
                    <p style={{ color: "#888", textAlign: "center", padding: "10px 0" }}>ยังไม่มีตอนในหนังสือเล่มนี้</p>
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {episodes.map(ep => (
                        <li key={ep.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#fff", border: "1px solid #ddd", borderRadius: "6px", marginBottom: "8px" }}>
                          <div><strong style={{ color: "#ff4e63", marginRight: "10px" }}>ตอนที่ {ep.episode_number}</strong><span>{ep.title}</span></div>
                          <button onClick={() => handleDeleteEpisode(ep.id)} style={{ background: "#ff4d4f", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer" }}>ลบ</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div style={{ border: "1px solid #eee", padding: "20px", borderRadius: "8px" }}>
                  <h3 style={{ marginTop: 0 }}>เพิ่มตอนใหม่ {isManga ? "📘 (โหมดอัปโหลดรูปมังงะ)" : "📝 (โหมดเขียนนิยาย)"}</h3>
                  <form onSubmit={handleAddEpisode}>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <div style={{ flex: 1 }}><label>ตอนที่ (ลำดับ)</label><input style={inputStyle} type="number" required min="1" value={epNumber} onChange={e => setEpNumber(e.target.value)} placeholder="เช่น 1, 2, 3" /></div>
                      <div style={{ flex: 3 }}><label>ชื่อตอน</label><input style={inputStyle} type="text" required value={epTitle} onChange={e => setEpTitle(e.target.value)} placeholder="เช่น บทนำ, การพบเจอ..." /></div>
                    </div>
                    {isManga ? (
                      <div style={{ marginBottom: "15px" }}>
                        <label style={{ fontWeight: "bold", color: "#ff4e63" }}>อัปโหลดหน้ามังงะ (เลือกได้หลายรูปพร้อมกัน)</label>
                        <input style={inputStyle} type="file" multiple accept="image/*" onChange={handleMultipleFiles} />
                        {epImages.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "10px", padding: "10px", border: "1px dashed #ccc", borderRadius: "8px" }}>
                            {epImages.map((img, index) => (
                              <div key={index} style={{ position: "relative", width: "100px", height: "140px", border: "1px solid #ddd", borderRadius: "4px", overflow: "hidden" }}>
                                <img src={img} alt={`page-${index}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                <button type="button" onClick={() => removeEpImage(index)} style={{ position: "absolute", top: "4px", right: "4px", background: "red", color: "white", border: "none", borderRadius: "50%", width: "22px", height: "22px", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>X</button>
                                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.6)", color: "white", fontSize: "12px", textAlign: "center", padding: "2px" }}>หน้า {index + 1}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label style={{ fontWeight: "bold" }}>เนื้อหาของตอน (นิยาย)</label>
                        <textarea style={{ ...inputStyle, height: "250px", resize: "vertical", fontFamily: "inherit" }} value={epContent} onChange={e => setEpContent(e.target.value)} placeholder="พิมพ์หรือวางเนื้อหานิยาย/บทความลงที่นี่..." />
                      </div>
                    )}
                    <button type="submit" style={btnStyle}>+ บันทึกเนื้อหาตอนใหม่</button>
                  </form>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "manageBooks" && (
          <div>
            <h3 style={{ color: "#333", marginBottom: "16px" }}>หนังสือทั้งหมด ({books.length} เรื่อง)</h3>
            {books.length === 0 ? (
              <p style={{ color: "#888", textAlign: "center" }}>ยังไม่มีหนังสือในระบบ</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {books.map(book => (
                  <div key={book.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "#f9f9f9", border: "1px solid #eee", borderRadius: "8px" }}>
                    <img
                      src={book.image}
                      alt={book.title}
                      style={{ width: "50px", height: "70px", objectFit: "cover", borderRadius: "4px", flexShrink: 0 }}
                      onError={(e) => { e.target.src = "https://via.placeholder.com/50x70?text=No+Img"; }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: "bold", fontSize: "15px", color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{book.title}</div>
                      <div style={{ fontSize: "13px", color: "#888", marginTop: "2px" }}>{book.author} • {book.category}</div>
                      <div style={{ fontSize: "13px", color: "#b5651d", marginTop: "2px" }}>{book.price > 0 ? `${book.price} เหรียญ` : "ฟรี"}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteBook(book.id, book.title)}
                      style={{ background: "#ff4d4f", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontFamily: "Sarabun", fontWeight: "bold", fontSize: "14px", flexShrink: 0 }}
                    >
                      <i className="fas fa-trash-alt" style={{ marginRight: "6px" }}></i>ลบ
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ จัดการ BANNERS ══ */}
        <section className="admin-banners" style={{ marginTop: '40px', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: '#b5651d', borderBottom: '2px solid #0000', paddingBottom: '10px' }}><i className="fas fa-image" style={{ marginRight: '10px' }}></i> จัดการแบนเนอร์ (Home Page)</h2>
          <form onSubmit={handleAddBanner} style={{ marginTop: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>เพิ่มแบนเนอร์ใหม่:</label>
            <input type="file" accept="image/*" onChange={(e) => setNewBannerImage(e.target.files[0])} style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
            <button type="submit" style={{ padding: '12px 24px', background: 'gray', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}><i className="fas fa-upload" style={{ marginRight: '8px' }}></i> อัปโหลด</button>
          </form>
          <div style={{ marginTop: '30px' }}>
            <h3 style={{ fontSize: '16px', color: '#555' }}>รายการแบนเนอร์ที่มีอยู่ ({banners.length})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', marginTop: '15px' }}>
              {banners.map(banner => (
                <div key={banner.id} style={{ position: 'relative', background: '#f5f5f5', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                  <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${banner.image}`} alt={banner.title || 'Banner'} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                  <button onClick={() => handleDeleteBanner(banner.id)} style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(255,255,255,0.7)', color: '#ff4e63', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }} title="ลบแบนเนอร์"><i className="fas fa-trash-alt"></i></button>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

export default Admin;