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

  // ดึงข้อมูลหนังสือที่ถูกเลือกมาดูว่าหมวดหมู่อะไร
  const selectedBook = books.find(b => b.id.toString() === selectedBookId.toString());
  const isManga = selectedBook?.category === "มังงะ";

  // ================= EFFECTS =================
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
    </div>
  );
}

export default Admin;