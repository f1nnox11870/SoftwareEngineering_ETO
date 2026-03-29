import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Admin() {
  const navigate = useNavigate();

  // ================= STATES =================
  const [activeTab, setActiveTab] = useState("addBook");
  const [books, setBooks] = useState([]);

  // State สำหรับเพิ่มหนังสือใหม่
  const [title, setTitle] = useState("");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // State สำหรับจัดการตอนย่อย
  const [selectedBookId, setSelectedBookId] = useState("");
  const [episodes, setEpisodes] = useState([]);
  const [epNumber, setEpNumber] = useState("");
  const [epTitle, setEpTitle] = useState("");
  const [epContent, setEpContent] = useState(""); // สำหรับนิยาย (Text)
  const [epImages, setEpImages] = useState([]);   // สำหรับมังงะ (Array of Base64)

  // 🛠️ State สำหรับระบบโพสต์ "เร็วๆ นี้"
  const [newsPosts, setNewsPosts] = useState([]);
  const [postCaption, setPostCaption] = useState("");
  const [postImage, setPostImage] = useState(null);
  const [postPreview, setPostPreview] = useState(null); // สำหรับโชว์รูปก่อนอัปโหลด
  // ดึงข้อมูลหนังสือที่ถูกเลือกมาดูว่าหมวดหมู่อะไร
  const selectedBook = books.find(b => b.id.toString() === selectedBookId.toString());
  const isManga = selectedBook?.category === "มังงะ";
    // 🛠️เพิ่ม State สำหรับแบนเนอร์ 🛠️
  const [banners, setBanners] = useState([]);
  const [newBannerImage, setNewBannerImage] = useState(null);
  // ================= EFFECTS =================
  useEffect(() => {
        fetchBanners(); // ดึงข้อมูลแบนเนอร์
    }, []);
  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      navigate("/");
    } else {
      fetchBooks();
    }
  }, [navigate]);

  useEffect(() => {
    if (selectedBookId) {
      fetchEpisodes(selectedBookId);
      // เคลียร์ฟอร์มเมื่อเปลี่ยนหนังสือ
      setEpContent(""); 
      setEpImages([]);
    } else {
      setEpisodes([]);
    }
  }, [selectedBookId]);

  // ================= API CALLS =================
  const fetchBooks = async () => {
    try {
      const res = await axios.get("http://localhost:3001/books");
      setBooks(res.data);
    } catch (err) {
      console.error("Error fetching books:", err);
    }
  };

  const fetchEpisodes = async (bookId) => {
    try {
      const res = await axios.get(`http://localhost:3001/books/${bookId}/episodes`);
      setEpisodes(res.data);
    } catch (err) {
      console.error("Error fetching episodes:", err);
    }
  };

  // ================= HANDLERS =================
  const handleFile = (file) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setImage(e.target.result);
      reader.readAsDataURL(file);
    } else {
      alert("กรุณาเลือกไฟล์รูปภาพเท่านั้นครับ");
    }
  };

  // อัปโหลดรูปภาพหลายรูปสำหรับ "มังงะ"
  const handleMultipleFiles = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(f => f.type.startsWith("image/"));
    
    if (validFiles.length !== files.length) {
      alert("บางไฟล์ไม่ใช่รูปภาพ ระบบจะข้ามไฟล์นั้นไปนะครับ");
    }

    Promise.all(validFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.readAsDataURL(file);
      });
    })).then(base64Array => {
      // นำรูปภาพใหม่ไปต่อท้ายรูปเดิม (เผื่อกดเลือกเพิ่มทีหลัง)
      setEpImages(prev => [...prev, ...base64Array]);
    });
  };

  // ลบรูปภาพพรีวิวมังงะทีละรูป
  const removeEpImage = (indexToRemove) => {
    setEpImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  // 🛠️ จุดที่ 4.1: ฟังก์ชันดึงแบนเนอร์ 🛠️
    const fetchBanners = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await axios.get('http://localhost:3001/banners'); // ใครก็ดึงได้ ไม่ต้องส่ง token
            setBanners(res.data);
        } catch (error) {
            console.error("Error fetching banners:", error);
        }
    };

    // 🛠️ จุดที่ 4.2: ฟังก์ชันสำหรับแอดแบนเนอร์ 🛠️
    const handleAddBanner = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) return;

        if (!newBannerImage) {
            alert("กรุณาเลือกรูปภาพแบนเนอร์ครับ");
            return;
        }

        const formData = new FormData();
        formData.append('image', newBannerImage);
        // formData.append('title', newBannerTitle);
        // formData.append('link', newBannerLink);

        try {
            await axios.post('http://localhost:3001/banners/add', formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}` 
                }
            });
            alert("เพิ่มแบนเนอร์สำเร็จ!");
            setNewBannerImage(null); // ล้างไฟล์รูปภาพใน input
            fetchBanners(); // โหลดรายการแบนเนอร์ใหม่
        } catch (error) {
            console.error("Error adding banner:", error);
            alert("เกิดข้อผิดพลาดในการเพิ่มแบนเนอร์");
        }
    };

    // 🛠️ จุดที่ 4.3: ฟังก์ชันสำหรับลบแบนเนอร์ 🛠️
    const handleDeleteBanner = async (id) => {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบแบนเนอร์นี้?")) return;

        try {
            await axios.delete(`http://localhost:3001/banners/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("ลบแบนเนอร์สำเร็จ!");
            fetchBanners(); // โหลดรายการแบนเนอร์ใหม่
        } catch (error) {
            console.error("Error deleting banner:", error);
            alert("เกิดข้อผิดพลาดในการลบแบนเนอร์");
        }
    };
  const handleAddBook = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!image) return alert("กรุณาอัปโหลดรูปหน้าปกด้วยครับ");
    if (!category) return alert("กรุณาเลือกหมวดหมู่ด้วยครับ");

    try {
      await axios.post(
        "http://localhost:3001/admin/add-book",
        { title, author, category, description, image, price: Number(price) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("เพิ่มหนังสือสำเร็จ!");
      setTitle(""); setImage(""); setAuthor(""); setCategory(""); setDescription(""); setPrice("");
      fetchBooks();
    } catch (err) {
      alert(err.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleAddEpisode = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!selectedBookId) return alert("กรุณาเลือกหนังสือก่อนครับ");

    let payloadContent = "";

    // จัดการข้อมูลส่งไปเซิร์ฟเวอร์ตามหมวดหมู่
    if (isManga) {
      if (epImages.length === 0) return alert("กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูปครับ");
      // แปลง Array รูปเป็น Text (JSON string) เพื่อเก็บลง Database
      payloadContent = JSON.stringify(epImages); 
    } else {
      if (!epContent.trim()) return alert("กรุณากรอกเนื้อหาด้วยครับ");
      payloadContent = epContent;
    }

    try {
      await axios.post(
        "http://localhost:3001/admin/add-episode",
        { book_id: selectedBookId, episode_number: epNumber, title: epTitle, content: payloadContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("เพิ่มตอนใหม่สำเร็จ!");
      setEpNumber(""); setEpTitle(""); setEpContent(""); setEpImages([]);
      fetchEpisodes(selectedBookId);
    } catch (err) {
      alert(err.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleDeleteEpisode = async (epId) => {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบตอนนี้? (ลบแล้วลบเลย)")) return;
    const token = localStorage.getItem("token");

    try {
      await axios.delete(`http://localhost:3001/admin/delete-episode/${epId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("ลบตอนสำเร็จ");
      fetchEpisodes(selectedBookId);
    } catch (err) {
      alert(err.response?.data?.message || "เกิดข้อผิดพลาดในการลบ");
    }
  };
  // ดึงข้อมูลโพสต์ทั้งหมด
  const fetchPosts = async () => {
    try {
      const res = await axios.get("http://localhost:3001/posts");
      setNewsPosts(res.data);
    } catch (err) {
      console.error("Error fetching posts:", err);
    }
  };

  // จัดการเลือกรูปโพสต์
  const handlePostImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPostImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setPostPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // สร้างโพสต์ใหม่
  const handleCreatePost = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!postCaption && !postImage) return alert("กรุณาใส่ข้อความหรือรูปภาพอย่างน้อยหนึ่งอย่างครับ");

    const formData = new FormData();
    formData.append("caption", postCaption);
    if (postImage) formData.append("image", postImage);

    try {
      await axios.post("http://localhost:3001/admin/add-post", formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}` 
        }
      });
      alert("สร้างโพสต์สำเร็จ!");
      setPostCaption(""); setPostImage(null); setPostPreview(null);
      fetchPosts(); // โหลดรายการใหม่
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการสร้างโพสต์");
    }
  };

  // ลบโพสต์
  const handleDeletePost = async (id) => {
    if (!window.confirm("ต้องการลบโพสต์นี้ใช่หรือไม่?")) return;
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`http://localhost:3001/admin/delete-post/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPosts();
    } catch (err) {
      alert("ลบโพสต์ไม่สำเร็จ");
    }
  };

  // เพิ่ม fetchPosts ใน useEffect แรกสุดที่มีอยู่แล้ว
  useEffect(() => {
    fetchPosts();
  }, []);
  // ================= STYLES =================
  const dropZoneStyle = { width: "100%", height: "250px", border: isDragging ? "3px dashed #ff4e63" : "2px dashed #ccc", borderRadius: "15px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: isDragging ? "#fff0f1" : "#fafafa", cursor: "pointer", transition: "all 0.3s ease", overflow: "hidden", marginBottom: "20px" };
  const inputStyle = { width: "100%", padding: "12px", marginBottom: "15px", border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box", fontSize: "14px", fontFamily: "Sarabun" };
  const btnStyle = { width: "100%", padding: "15px", background: "#ff4e63", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", transition: "0.2s" };

  return (
    <div style={{ maxWidth: "800px", margin: "50px auto", padding: "20px", fontFamily: "Sarabun", background: "#fff", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
      
      <h1 style={{ textAlign: "center", color: "#333", marginBottom: "20px" }}>ระบบจัดการเนื้อหา (Admin Panel)</h1>
      <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginBottom: "30px", borderBottom: "2px solid #eee" }}>
        <button 
          style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer", background: "none", border: "none", borderBottom: activeTab === "addBook" ? "3px solid #ff4e63" : "3px solid transparent", color: activeTab === "addBook" ? "#ff4e63" : "#555", fontWeight: "bold" }}
          onClick={() => setActiveTab("addBook")}
        >
          <i className="fas fa-book" style={{ marginRight: "8px" }}></i> เพิ่มเรื่องใหม่
        </button>
        <button 
          style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer", background: "none", border: "none", borderBottom: activeTab === "manageEpisodes" ? "3px solid #ff4e63" : "3px solid transparent", color: activeTab === "manageEpisodes" ? "#ff4e63" : "#555", fontWeight: "bold" }}
          onClick={() => setActiveTab("manageEpisodes")}
        >
          <i className="fas fa-list-ol" style={{ marginRight: "8px" }}></i> จัดการตอน (Episodes)
        </button>
      </div>

      {/* ================= TAB 1: เพิ่มหนังสือใหม่ ================= */}
      {activeTab === "addBook" && (
        <form onSubmit={handleAddBook}>
          <label>ชื่อเรื่อง</label>
          <input style={inputStyle} type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />

          <label>รูปหน้าปก (ลากไฟล์มาวางที่นี่)</label>
          <div 
            style={dropZoneStyle}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById("fileInput").click()}
          >
            {image ? (
              <img src={image} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ textAlign: "center", color: "#888" }}>
                <p>ลากรูปมาวางที่นี่ หรือ คลิกเพื่อเลือกไฟล์</p>
              </div>
            )}
            <input id="fileInput" type="file" hidden accept="image/*" onChange={(e) => handleFile(e.target.files[0])} />
          </div>

          <label>ผู้แต่ง</label>
          <input style={inputStyle} type="text" value={author} onChange={(e) => setAuthor(e.target.value)} />

          <label>หมวดหมู่</label>
          <select style={{ ...inputStyle, cursor: "pointer" }} value={category} onChange={(e) => setCategory(e.target.value)} required>
            <option value="" disabled>-- กรุณาเลือกหมวดหมู่ --</option>
            <option value="นิยาย">นิยาย</option>
            <option value="มังงะ">มังงะ / การ์ตูน</option>
          </select>

          <label>ราคา (บาท)</label>
          <input style={inputStyle} type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="เช่น 199 หรือเว้นว่าง/ใส่ 0 เพื่อให้อ่านฟรี" />

          <label>คำอธิบาย</label>
          <textarea style={{ ...inputStyle, height: "100px", resize: "vertical" }} value={description} onChange={(e) => setDescription(e.target.value)} />

          <button type="submit" style={btnStyle}>บันทึกข้อมูลและอัปเดตหน้า Home</button>
        </form>
      )}

      {/* ================= TAB 2: จัดการตอน (Episodes) ================= */}
      {activeTab === "manageEpisodes" && (
        <div>
          <label style={{ fontWeight: "bold" }}>เลือกหนังสือที่ต้องการจัดการตอน:</label>
          <select 
            style={{ ...inputStyle, cursor: "pointer", border: "2px solid #ff4e63" }} 
            value={selectedBookId} 
            onChange={(e) => setSelectedBookId(e.target.value)}
          >
            <option value="">-- กรุณาเลือกหนังสือ --</option>
            {books.map(book => (
              <option key={book.id} value={book.id}>[ID: {book.id}] {book.title} ({book.category})</option>
            ))}
          </select>

          {selectedBookId && (
            <>
              {/* รายการตอนที่มีอยู่ */}
              <div style={{ background: "#f9f9f9", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
                <h3 style={{ marginTop: 0, color: "#333", borderBottom: "1px solid #ddd", paddingBottom: "10px" }}>ตอนทั้งหมดในเรื่องนี้</h3>
                {episodes.length === 0 ? (
                  <p style={{ color: "#888", textAlign: "center", padding: "10px 0" }}>ยังไม่มีตอนในหนังสือเล่มนี้</p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {episodes.map(ep => (
                      <li key={ep.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#fff", border: "1px solid #ddd", borderRadius: "6px", marginBottom: "8px" }}>
                        <div>
                          <strong style={{ color: "#ff4e63", marginRight: "10px" }}>ตอนที่ {ep.episode_number}</strong>
                          <span>{ep.title}</span>
                        </div>
                        <button 
                          onClick={() => handleDeleteEpisode(ep.id)}
                          style={{ background: "#ff4d4f", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer" }}
                        >
                          ลบ
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* ฟอร์มสร้างตอนใหม่ */}
              <div style={{ border: "1px solid #eee", padding: "20px", borderRadius: "8px" }}>
                <h3 style={{ marginTop: 0 }}>
                  เพิ่มตอนใหม่ {isManga ? "📘 (โหมดอัปโหลดรูปมังงะ)" : "📝 (โหมดเขียนนิยาย)"}
                </h3>
                
                <form onSubmit={handleAddEpisode}>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ flex: 1 }}>
                      <label>ตอนที่ (ลำดับ)</label>
                      <input style={inputStyle} type="number" required min="1" value={epNumber} onChange={e => setEpNumber(e.target.value)} placeholder="เช่น 1, 2, 3" />
                    </div>
                    <div style={{ flex: 3 }}>
                      <label>ชื่อตอน</label>
                      <input style={inputStyle} type="text" required value={epTitle} onChange={e => setEpTitle(e.target.value)} placeholder="เช่น บทนำ, การพบเจอ..." />
                    </div>
                  </div>

                  {/* ===== ส่วนนี้จะเปลี่ยนไปตาม Category ที่เลือก ===== */}
                  {isManga ? (
                    <div style={{ marginBottom: "15px" }}>
                      <label style={{ fontWeight: "bold", color: "#ff4e63" }}>อัปโหลดหน้ามังงะ (เลือกได้หลายรูปพร้อมกัน)</label>
                      <input 
                        style={inputStyle} 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        onChange={handleMultipleFiles} 
                      />
                      
                      {/* แกลลอรี่พรีวิวรูปมังงะ */}
                      {epImages.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "10px", padding: "10px", border: "1px dashed #ccc", borderRadius: "8px" }}>
                          {epImages.map((img, index) => (
                            <div key={index} style={{ position: "relative", width: "100px", height: "140px", border: "1px solid #ddd", borderRadius: "4px", overflow: "hidden" }}>
                              <img src={img} alt={`page-${index}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              <button 
                                type="button"
                                onClick={() => removeEpImage(index)}
                                style={{ position: "absolute", top: "4px", right: "4px", background: "red", color: "white", border: "none", borderRadius: "50%", width: "22px", height: "22px", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}
                              >
                                X
                              </button>
                              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.6)", color: "white", fontSize: "12px", textAlign: "center", padding: "2px" }}>
                                หน้า {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label style={{ fontWeight: "bold" }}>เนื้อหาของตอน (นิยาย)</label>
                      <textarea 
                        style={{ ...inputStyle, height: "250px", resize: "vertical", fontFamily: "inherit" }} 
                        value={epContent} 
                        onChange={e => setEpContent(e.target.value)} 
                        placeholder="พิมพ์หรือวางเนื้อหานิยาย/บทความลงที่นี่..."
                      />
                    </div>
                  )}

                  <button type="submit" style={btnStyle}>+ บันทึกเนื้อหาตอนใหม่</button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
      {/* 🛠️ จุดที่ 3: เพิ่ม UI จัดการแบนเนอร์ 🛠️ */}
            <section className="admin-banners" style={{ marginTop: '40px', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                <h2 style={{ color: '#ff4e63', borderBottom: '2px solid #ff4e63', paddingBottom: '10px' }}>
                    <i className="fas fa-image" style={{ marginRight: '10px' }}></i> จัดการแบนเนอร์ (Home Page)
                </h2>
                
                {/* ส่วนอัปโหลดแบนเนอร์ใหม่ */}
                <form onSubmit={handleAddBanner} style={{ marginTop: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <label style={{ fontSize: '14px', fontWeight: 'bold' }}>เพิ่มแบนเนอร์ใหม่:</label>
                    <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => setNewBannerImage(e.target.files[0])} 
                        style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                    <button type="submit" style={{ padding: '12px 24px', background: '#ff4e63', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                        <i className="fas fa-upload" style={{ marginRight: '8px' }}></i> อัปโหลด
                    </button>
                </form>
                
                {/* แสดงรายการแบนเนอร์ที่มีอยู่ */}
                <div style={{ marginTop: '30px' }}>
                    <h3 style={{ fontSize: '16px', color: '#555' }}>รายการแบนเนอร์ที่มีอยู่ ({banners.length})</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', marginTop: '15px' }}>
                        {banners.map(banner => (
                            <div key={banner.id} style={{ position: 'relative', background: '#f5f5f5', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                                <img 
                                    src={`http://localhost:3001${banner.image}`} 
                                    alt={banner.title || 'Banner'} 
                                    style={{ width: '100%', height: '120px', objectFit: 'cover' }} 
                                />
                                <button 
                                    onClick={() => handleDeleteBanner(banner.id)}
                                    style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(255,255,255,0.7)', color: '#ff4e63', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}
                                    title="ลบแบนเนอร์"
                                >
                                    <i className="fas fa-trash-alt"></i>
                                </button>
                                {/* ถ้ามี title/link สามารถแสดงได้ตรงนี้ */}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            
            {/* ... (โค้ด UI ส่วนที่เหลือเดิม) ... */}
            {/* 🛠️ ส่วนจัดการโพสต์ "เร็วๆ นี้" 🛠️ */}
      <section className="admin-posts" style={{ marginTop: '40px', padding: '20px', background: '#fff', borderRadius: '15px', border: '2px solid #eee' }}>
          <h2 style={{ color: '#333', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
              <i className="fas fa-bullhorn" style={{ marginRight: '10px', color: '#ff4e63' }}></i> สร้างโพสต์ใหม่ (Coming Soon)
          </h2>

          <form onSubmit={handleCreatePost} style={{ marginTop: '20px' }}>
              <label>ข้อความบรรยาย (Caption)</label>
              <textarea 
                  style={{ ...inputStyle, height: '100px', resize: 'vertical' }} 
                  placeholder="เขียนอะไรบางอย่าง..." 
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
              />

              <label>แนบรูปภาพ (ถ้ามี)</label>
              <input type="file" accept="image/*" onChange={handlePostImageChange} style={inputStyle} />
              
              {postPreview && (
                  <div style={{ marginBottom: '15px', textAlign: 'center' }}>
                      <img src={postPreview} alt="Preview" style={{ maxWidth: '100%', borderRadius: '8px', maxHeight: '200px' }} />
                  </div>
              )}

              <button type="submit" style={btnStyle}>📢 ประกาศข่าวเลย</button>
          </form>

          {/* รายการโพสต์ที่เคยสร้างไว้ */}
          <div style={{ marginTop: '30px' }}>
              <h3 style={{ fontSize: '16px', color: '#666' }}>รายการข่าวสารล่าสุด</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                  {newsPosts.map(post => (
                      <div key={post.id} style={{ display: 'flex', gap: '15px', padding: '10px', border: '1px solid #eee', borderRadius: '8px', alignItems: 'center', position: 'relative' }}>
                          {post.image_url && (
                              <img src={`http://localhost:3001${post.image_url}`} alt="Post" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                          )}
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                              <p style={{ margin: 0, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{post.caption || "(ไม่มีข้อความ)"}</p>
                              <small style={{ color: '#999' }}>{new Date(post.created_at).toLocaleString('th-TH')}</small>
                          </div>
                          <button onClick={() => handleDeletePost(post.id)} style={{ color: '#ff4e63', border: 'none', background: 'none', cursor: 'pointer' }}>
                              <i className="fas fa-trash"></i>
                          </button>
                      </div>
                  ))}
              </div>
          </div>
      </section>
    </div>
  );
}

export default Admin;