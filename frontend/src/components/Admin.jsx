import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Admin() {
  const navigate = useNavigate();

  // States
  const [title, setTitle] = useState("");
  const [image, setImage] = useState(""); // จะเก็บเป็น Base64 String
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState(""); // เก็บค่าราคา
  const [isDragging, setIsDragging] = useState(false);
  
  // 🔒 เช็คสิทธิ์ Admin
  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      navigate("/");
    }
  }, [navigate]);

  // ฟังก์ชันจัดการไฟล์รูปภาพ
  const handleFile = (file) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target.result); // แปลงรูปเป็น Base64
      };
      reader.readAsDataURL(file);
    } else {
      alert("กรุณาเลือกไฟล์รูปภาพเท่านั้นครับ");
    }
  };

  // Drag & Drop Handlers
  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => { setIsDragging(false); };
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!image) return alert("กรุณาอัปโหลดรูปหน้าปกด้วยครับ");

    try {
      await axios.post(
        "http://localhost:3001/admin/add-book",
        // ส่ง price ไปพร้อมกับข้อมูลอื่นๆ (แปลงเป็นตัวเลขเพื่อความชัวร์)
        { title, author, category, description, image, price: Number(price) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("เพิ่มเนื้อหาสำเร็จ!");
      // ล้างฟอร์ม
      setTitle(""); setImage(""); setAuthor(""); setCategory(""); setDescription(""); setPrice("");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  // สไตล์สำหรับโซนลากวาง
  const dropZoneStyle = {
    width: "100%",
    height: "250px",
    border: isDragging ? "3px dashed #ff4e63" : "2px dashed #ccc",
    borderRadius: "15px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: isDragging ? "#fff0f1" : "#fafafa",
    cursor: "pointer",
    transition: "all 0.3s ease",
    overflow: "hidden",
    marginBottom: "20px"
  };

  return (
    <div style={{ maxWidth: "600px", margin: "50px auto", padding: "20px", fontFamily: "Sarabun" }}>
      <h1 style={{ textAlign: "center", color: "#333" }}>เพิ่มเนื้อหาใหม่</h1>
      
      <form onSubmit={handleSubmit}>
        <label>ชื่อเรื่อง</label>
        <input style={inputStyle} type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />

        <label>รูปหน้าปก (ลากไฟล์มาวางที่นี่)</label>
        <div 
          style={dropZoneStyle}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => document.getElementById("fileInput").click()}
        >
          {image ? (
            <img src={image} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ textAlign: "center", color: "#888" }}>
              <i className="fas fa-cloud-upload-alt" style={{ fontSize: "40px" }}></i>
              <p>ลากรูปมาวางที่นี่ หรือ คลิกเพื่อเลือกไฟล์</p>
            </div>
          )}
          <input 
            id="fileInput"
            type="file" 
            hidden 
            accept="image/*" 
            onChange={(e) => handleFile(e.target.files[0])} 
          />
        </div>

        <label>ผู้แต่ง</label>
        <input style={inputStyle} type="text" value={author} onChange={(e) => setAuthor(e.target.value)} />

        <label>หมวดหมู่</label>
        <input style={inputStyle} type="text" value={category} onChange={(e) => setCategory(e.target.value)} />

        {/* --- ส่วนที่เพิ่มเข้ามาใหม่: ช่องกรอกราคา --- */}
        <label>ราคา (บาท)</label>
        <input 
          style={inputStyle} 
          type="number" 
          min="0"
          value={price} 
          onChange={(e) => setPrice(e.target.value)} 
          placeholder="เช่น 199 หรือเว้นว่าง/ใส่ 0 เพื่อให้อ่านฟรี"
        />

        <label>คำอธิบาย</label>
        <textarea style={{ ...inputStyle, height: "100px" }} value={description} onChange={(e) => setDescription(e.target.value)} />

        <button type="submit" style={btnStyle}>บันทึกข้อมูลและอัปเดตหน้า Home</button>
      </form>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "12px", marginBottom: "15px", border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box" };
const btnStyle = { width: "100%", padding: "15px", background: "#ff4e63", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", cursor: "pointer" };

export default Admin;