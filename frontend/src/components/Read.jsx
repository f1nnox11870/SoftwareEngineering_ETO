import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Read() {
    const { id } = useParams(); // รับ ID หนังสือจาก URL
    const navigate = useNavigate();
    
    const [book, setBook] = useState(null);
    const [episodes, setEpisodes] = useState([]);
    const [currentEpisode, setCurrentEpisode] = useState(null); // ตอนที่กำลังอ่าน
    
    // จำลองระบบจำว่าตอนไหนถูกปลดล็อกแล้วบ้าง (ของจริงควรเซฟลง Database)
    const [unlockedEpisodes, setUnlockedEpisodes] = useState([]);

    useEffect(() => {
        fetchBookData();
        fetchUnlockedEpisodes(); // 👈 เพิ่มบรรทัดนี้เพื่อเรียกดูตอนที่ซื้อแล้ว
    }, [id]);
    const fetchUnlockedEpisodes = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const res = await axios.get(`http://localhost:3001/unlocked/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUnlockedEpisodes(res.data); // เอาประวัติจากฐานข้อมูลมาใส่ในระบบ
            } catch (error) {
                console.error("Error fetching unlocked episodes", error);
            }
        }
    };
    const fetchBookData = async () => {
        try {
            // 1. ดึงข้อมูลหนังสือทั้งหมดมาเพื่อหาเล่มที่ตรงกับ ID
            const bookRes = await axios.get('http://localhost:3001/books');
            const foundBook = bookRes.data.find(b => b.id.toString() === id.toString());
            setBook(foundBook);

            // 2. ดึงรายการตอนของหนังสือเล่มนี้
            const epRes = await axios.get(`http://localhost:3001/books/${id}/episodes`);
            setEpisodes(epRes.data);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    // ฟังก์ชันตรวจสอบว่าตอนนี้ "ฟรี" หรือ "ติดเหรียญ"
    // ให้ฟรี 3 ตอนแรก (index 0, 1, 2)
    const isLocked = (index, epId) => {
        if (index < 3) return false; // 3 ตอนแรกฟรี
        if (unlockedEpisodes.includes(epId)) return false; // ปลดล็อกแล้ว
        return true; // นอกนั้นล็อก
    };

    // ฟังก์ชันกดอ่านตอน
    const handleReadEpisode = async (ep, index) => {
        if (isLocked(index, ep.id)) {
            const token = localStorage.getItem('token');
            if (!token) {
                alert("กรุณาเข้าสู่ระบบก่อนทำการซื้อตอนครับ 🔒");
                return;
            }

            const confirmBuy = window.confirm(`ตอนนี้ติดเหรียญ 🪙\nต้องการใช้ 5 เหรียญเพื่อปลดล็อก "${ep.title}" หรือไม่?`);
            if (confirmBuy) {
                try {
                    // 🔻 ส่งคำสั่งไปหักเหรียญและบันทึกลงฐานข้อมูล 🔻
                    const res = await axios.post('http://localhost:3001/unlock', {
                        bookId: id,
                        episodeId: ep.id,
                        coinCost: 5 // ราคา 5 เหรียญ (ถ้าอนาคตมีราคาแต่ละตอนไม่เท่ากัน สามารถดึงจาก ep.price ได้)
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    // ถ้าผ่าน (ซื้อสำเร็จ)
                    setUnlockedEpisodes([...unlockedEpisodes, ep.id]); // ปลดล็อกในหน้าจอทันที
                    alert("ปลดล็อกสำเร็จ! ขอให้อ่านให้สนุกครับ 🎉");

                } catch (error) {
                    // ถ้าไม่ผ่าน (เช่น เหรียญไม่พอ)
                    alert(error.response?.data?.message || "เกิดข้อผิดพลาดในการปลดล็อก");
                }
            }
        } else {
            // ถ้าไม่ติดล็อก (อ่านฟรี หรือ ซื้อแล้ว)
            setCurrentEpisode(ep);
            window.scrollTo(0, 0);
        }
    };

    // ฟังก์ชันเรนเดอร์เนื้อหา (แยกระหว่างนิยายกับมังงะ)
    const renderContent = () => {
        if (!currentEpisode) return null;

        if (book.category === "มังงะ") {
            try {
                // มังงะเก็บเนื้อหาเป็น Array รูปภาพ (JSON String)
                const images = JSON.parse(currentEpisode.content);
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
                        {images.map((img, idx) => (
                            <img key={idx} src={img} alt={`page-${idx+1}`} style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
                        ))}
                    </div>
                );
            } catch (e) {
                return <p style={{ color: 'red', textAlign: 'center' }}>เกิดข้อผิดพลาดในการโหลดรูปภาพมังงะ</p>;
            }
        } else {
            // นิยายเก็บเป็นข้อความปกติ
            return (
                <div style={{ padding: '20px', lineHeight: '1.8', fontSize: '18px', color: '#333', whiteSpace: 'pre-wrap' }}>
                    {currentEpisode.content}
                </div>
            );
        }
    };

    if (!book) return <div style={{ textAlign: 'center', marginTop: '50px' }}>กำลังโหลดข้อมูล...</div>;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'Sarabun, sans-serif', padding: '20px' }}>
            
            {/* 🔴 โหมดกำลังอ่านเนื้อหา */}
            {currentEpisode ? (
                <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    <div style={{ padding: '15px 20px', background: '#f8f9fa', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button 
                            onClick={() => setCurrentEpisode(null)}
                            style={{ background: 'none', border: '1px solid #ddd', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            <i className="fas fa-arrow-left"></i> กลับไปหน้ารายการตอน
                        </button>
                        <h3 style={{ margin: 0, color: '#333' }}>ตอนที่ {currentEpisode.episode_number}: {currentEpisode.title}</h3>
                    </div>
                    
                    {/* แสดงเนื้อหานิยาย หรือ รูปมังงะ */}
                    <div style={{ minHeight: '50vh', background: book.category === 'มังงะ' ? '#222' : '#fff' }}>
                        {renderContent()}
                    </div>

                    <div style={{ padding: '20px', textAlign: 'center', background: '#f8f9fa', borderTop: '1px solid #ddd' }}>
                        <button 
                            onClick={() => setCurrentEpisode(null)}
                            style={{ background: '#ff4e63', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
                        >
                            จบตอน
                        </button>
                    </div>
                </div>
            ) : (
                
                /* 🔵 โหมดหน้ารายการตอน (Table of Contents) */
                <div style={{ background: '#fff', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', marginBottom: '20px', fontSize: '16px' }}>
                        <i className="fas fa-home"></i> กลับหน้าหลัก
                    </button>
                    
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                        <img src={book.image} alt="cover" style={{ width: '120px', height: '170px', objectFit: 'cover', borderRadius: '6px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }} />
                        <div>
                            <span style={{ background: '#ffe4e6', color: '#ff4e63', padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{book.category}</span>
                            <h1 style={{ margin: '10px 0 5px 0', fontSize: '24px', color: '#333' }}>{book.title}</h1>
                            <p style={{ color: '#666', margin: 0 }}>ผู้แต่ง: {book.author}</p>
                            <p style={{ color: '#888', fontSize: '14px', marginTop: '10px' }}>มีทั้งหมด {episodes.length} ตอน</p>
                        </div>
                    </div>

                    <h2 style={{ borderBottom: '2px solid #ff4e63', paddingBottom: '10px', marginBottom: '20px' }}>รายการตอนทั้งหมด</h2>
                    
                    {episodes.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#888' }}>ยังไม่มีเนื้อหาในหนังสือเล่มนี้</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {episodes.map((ep, index) => {
                                const locked = isLocked(index, ep.id);
                                return (
                                    <div 
                                        key={ep.id} 
                                        onClick={() => handleReadEpisode(ep, index)}
                                        style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            padding: '15px 20px', 
                                            background: locked ? '#f9f9f9' : '#fff',
                                            border: '1px solid #eee', 
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: '0.2s',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.borderColor = '#ff4e63'}
                                        onMouseOut={(e) => e.currentTarget.style.borderColor = '#eee'}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <span style={{ fontSize: '16px', fontWeight: 'bold', color: locked ? '#999' : '#333' }}>
                                                ตอนที่ {ep.episode_number}
                                            </span>
                                            <span style={{ color: locked ? '#888' : '#555' }}>{ep.title}</span>
                                        </div>
                                        <div>
                                            {locked ? (
                                                <span style={{ color: '#ff9800', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <i className="fas fa-lock"></i> 5 🪙
                                                </span>
                                            ) : (
                                                <span style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    {index < 3 ? 'อ่านฟรี' : '🔓 ปลดล็อกแล้ว'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default Read;