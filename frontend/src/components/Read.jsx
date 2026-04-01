import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from './navbar';

function Read() {
    const { id } = useParams(); // รับ ID หนังสือจาก URL
    const navigate = useNavigate();
    
    const [book, setBook] = useState(null);
    const [episodes, setEpisodes] = useState([]);
    const [currentEpisode, setCurrentEpisode] = useState(null); // ตอนที่กำลังอ่าน
    
    // จำลองระบบจำว่าตอนไหนถูกปลดล็อกแล้วบ้าง
    const [unlockedEpisodes, setUnlockedEpisodes] = useState([]);

    useEffect(() => {
        fetchBookData();
        fetchUnlockedEpisodes(); 
        fetchReadingHistory();
    }, [id]);
    useEffect(() => {
        if (currentEpisode) {
            updateReadingHistory(currentEpisode.episode_number);
        }
    }, [currentEpisode]);
    const fetchUnlockedEpisodes = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/unlocked/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUnlockedEpisodes(res.data);
            } catch (error) {
                console.error("Error fetching unlocked episodes", error);
            }
        }
    };

    const fetchBookData = async () => {
        try {
            // 1. ดึงข้อมูลหนังสือทั้งหมดมาเพื่อหาเล่มที่ตรงกับ ID
            const bookRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/books`);
            const foundBook = bookRes.data.find(b => b.id.toString() === id.toString());
            setBook(foundBook);

            // 2. ดึงรายการตอนของหนังสือเล่มนี้
            const epRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/books/${id}/episodes`);
            // แนะนำให้เรียงลำดับตอนเสมอ เพื่อให้ปุ่ม Next/Prev ทำงานถูกต้อง
            const sortedEpisodes = epRes.data.sort((a, b) => a.episode_number - b.episode_number);
            setEpisodes(sortedEpisodes);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    // ฟังก์ชันตรวจสอบว่าตอนนี้ "ฟรี" หรือ "ติดเหรียญ"
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

            const confirmBuy = window.confirm(`ตอนนี้ติดเหรียญ \nต้องการใช้ 10 เหรียญเพื่อปลดล็อก "${ep.title}" หรือไม่?`);
            if (confirmBuy) {
                try {
                    const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/unlock`, {
                        bookId: id,
                        episodeId: ep.id,
                        coinCost: 5 
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    // ซื้อสำเร็จ
                    setUnlockedEpisodes([...unlockedEpisodes, ep.id]);
                    alert("ปลดล็อกสำเร็จ! ขอให้อ่านให้สนุกครับ ");
                    
                    // เปิดให้อ่านเลยทันที
                    setCurrentEpisode(ep);
                    window.scrollTo(0, 0);

                } catch (error) {
                    alert(error.response?.data?.message || "เกิดข้อผิดพลาดในการปลดล็อก (เหรียญอาจไม่พอ)");
                }
            }
        } else {
            // ถ้าไม่ติดล็อก (อ่านฟรี หรือ ซื้อแล้ว)
            setCurrentEpisode(ep);
            window.scrollTo(0, 0);
        }
    };

    // --- ระบบปุ่มนำทาง (Navigation) ---
    const getCurrentIndex = () => {
        if (!currentEpisode) return -1;
        return episodes.findIndex(ep => ep.id === currentEpisode.id);
    };

    const navigateEpisode = (direction) => {
        const currentIndex = getCurrentIndex();
        const targetIndex = currentIndex + direction;
        if (targetIndex >= 0 && targetIndex < episodes.length) {
            handleReadEpisode(episodes[targetIndex], targetIndex);
        }
    };

    const hasPrev = getCurrentIndex() > 0;
    const hasNext = getCurrentIndex() >= 0 && getCurrentIndex() < episodes.length - 1;

    // 🌟 State สำหรับระบบจดจำการอ่าน 🌟
    const [maxEpRead, setMaxEpRead] = useState(0);

    // 🌟 ดึงประวัติการอ่าน (ตอนที่อ่านไกลที่สุด) 🌟
    const fetchReadingHistory = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/history/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMaxEpRead(res.data.max_episode_number || 0);
        } catch (error) {
            console.error("Error fetching history", error);
        }
    };

    // 🌟 บันทึกประวัติการอ่านเมื่อเปิดอ่านตอนใหม่ 🌟
    const updateReadingHistory = async (epNum) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/history/update`, {
                book_id: id,
                episode_number: epNum
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // อัปเดตตัวเลขใน State ทันทีถ้าตอนที่เพิ่งกดอ่านเลขเยอะกว่าของเดิม
            if (Number(epNum) > maxEpRead) {
                setMaxEpRead(Number(epNum));
            }
        } catch (error) {
            console.error("Error updating history", error);
        }
    };

    // ฟังก์ชันเรนเดอร์เนื้อหา (แยกระหว่างนิยายกับมังงะ)
    const MANGA_CATS = ['มังงะ', 'การ์ตูน', 'การ์ตูนโรแมนติก', 'การ์ตูนแอคชั่น',
        'การ์ตูนแฟนตาซี', 'การ์ตูนตลก', 'การ์ตูนสยองขวัญ', 'การ์ตูนกีฬา', 'การ์ตูนวาย', 'การ์ตูนยูริ'];

    const renderContent = () => {
        if (!currentEpisode) return null;

        if (MANGA_CATS.includes(book.category)) {
            try {
                const images = JSON.parse(currentEpisode.content);
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0a0a0a', minHeight: '80vh' }}>
                        {images.map((img, idx) => (
                            <img key={idx} src={img} alt={`page-${idx+1}`} style={{ width: '100%',maxWidth: '100%', height: 'auto', display: 'block', marginBottom: '10px', boxShadow: '0 5px 15px rgba(0,0,0,0.5)' }} />
                        ))}
                    </div>
                );
            } catch (e) {
                return <div style={{ padding: '50px', textAlign: 'center', color: '#ff4e63', background: '#111' }}>เกิดข้อผิดพลาดในการโหลดรูปภาพมังงะ</div>;
            }
        } else {
            return (
                <div style={{ padding: '40px 30px', minHeight: '60vh', background: '#fff' }}>
                    <div style={{ maxWidth: '800px', margin: '0 auto', lineHeight: '1.9', fontSize: '18px', color: '#1a1a1a', whiteSpace: 'pre-wrap', fontFamily: 'Sarabun, sans-serif' }}>
                        {currentEpisode.content}
                    </div>
                </div>
            );
        }
    };

    if (!book) return <div style={{ textAlign: 'center', padding: '100px', fontSize: '18px', color: '#666' }}>กำลังโหลดข้อมูล... <i className="fas fa-spinner fa-spin"></i></div>;

    // Styles
    const btnStyle = { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' };

    return (
        <div style={{ background: '#f0f2f5', minHeight: '100vh', fontFamily: 'Kanit, sans-serif', paddingBottom: '40px' }}>
            
            {/* Navbar */}
            <Navbar />

            {/* 🔴 โหมดกำลังอ่านเนื้อหา (Reading View) */}
            {currentEpisode ? (
                <div style={{ maxWidth: MANGA_CATS.includes(book.category) ? '1200px' : '900px', margin: '0 auto', background: MANGA_CATS.includes(book.category) ? '#111' : '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: '12px', overflow: 'hidden', marginTop: '20px' }}>
                    
                    {/* แถบด้านบน */}
                    <div style={{ padding: '15px 25px', background: '#fff', borderBottom: '1px solid #eaeaea', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
                        <button 
                            onClick={() => setCurrentEpisode(null)}
                            style={{ ...btnStyle, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}
                            onMouseOver={(e) => e.target.style.background = '#e2e8f0'}
                            onMouseOut={(e) => e.target.style.background = '#f1f5f9'}
                        >
                            <i className="fas fa-arrow-left"></i> ย้อนกลับ
                        </button>
                    </div>

                    {/* Header ข้อมูลตอน */}
                    <div style={{ padding: '25px', background: '#fff' }}>
                        <div style={{ padding: '20px'}}>
                            <div style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '15px', marginBottom: '15px' }}>
                                <h2 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '24px' }}>{book.title}</h2>
                                <p style={{ margin: 0, color: '#64748b' }}><i className="fas fa-pen-nib"></i> ผู้แต่ง: {book.author}</p>
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 10px 0', color: '#334155', fontSize: '18px' }}>
                                    <span style={{ color: 'black' }}> ตอนที่ {currentEpisode.episode_number} :</span> {currentEpisode.title}
                                </h3>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '14px', lineHeight: '1.6', background: '#fff', padding: '10px 15px', borderRadius: '8px' }}>
                                    {book.description || "ขอให้สนุกกับการอ่านในตอนนี้ครับ!"}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    {/* เนื้อหา */}
                    <div style={{ borderTop: '1px solid #eee' }}>
                        {renderContent()}
                    </div>

                    {/* Footer นำทาง */}
                    <div style={{ padding: '20px 30px', background: '#fff', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button 
                            onClick={() => navigateEpisode(-1)}
                            disabled={!hasPrev}
                            style={{ ...btnStyle, background: hasPrev ? '#f1f5f9' : '#f8f9fa', color: hasPrev ? '#333' : '#ccc' }}
                        >
                            <i className="fas fa-chevron-left"></i> ตอนก่อนหน้า
                        </button>

                        <button 
                            onClick={() => navigateEpisode(1)}
                            disabled={!hasNext}
                            style={{ ...btnStyle, background: hasNext ? '#b5651d' : '#f8f9fa', color: hasNext ? '#fff' : '#ccc' }}
                        >
                            ตอนถัดไป <i className="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            ) : (
                
                /*  โหมดหน้ารายการตอน (Table of Contents) */
                <div style={{ maxWidth: '1000px', margin: '30px auto', padding: '0 20px' }}>
                    <div style={{ background: '#fff', padding: '30px'}}>
                        <button onClick={() => navigate(-1)} style={{ border: 'none', padding: '8px 15px', color: '#555', cursor: 'pointer', marginBottom: '25px', fontWeight: 'bold' }}>
                            <i className="fas fa-angle-left"></i> ย้อนกลับ
                        </button>
                        
                        {/* Hero Section ข้อมูลหนังสือ */}
                        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginBottom: '40px', background: 'none', padding: '25px'}}>
                            <img src={book.image} alt="cover" style={{ width: '160px', height: '230px', objectFit: 'cover' }} />
                            <div style={{ flex: 1, minWidth: '300px' }}>
                                
                                <h1 style={{ margin: '15px 0 10px 0', fontSize: '32px', color: '#0f172a' }}>{book.title}</h1>
                                <p style={{ color: '#475569', fontSize: '16px', margin: '0 0 10px 0' }}><i className="fas fa-user-edit"></i> ผู้แต่ง: {book.author}</p>
                                <p style={{ color: 'black', fontSize: '14px', lineHeight: '1.6'}}>{book.description}</p>
                                <span style={{ background: 'gray', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>{book.category}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid',color: 'gray', paddingBottom: '10px', marginBottom: '25px' }}>
                            <h2 style={{ margin: 0, color: '#0f172a' }}><i className="fas fa-list-ul" style={{ marginRight: '8px' }}></i> รายการตอน</h2>
                            <span style={{ background: 'none', color: 'black', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', fontSize: '16px' }}>ทั้งหมด {episodes.length} ตอน</span>
                        </div>
                        
                        {episodes.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '50px', color: '#888', background: '#f8f9fa', borderRadius: '12px' }}>
                                <i className="fas fa-folder-open" style={{ fontSize: '40px', marginBottom: '15px', color: '#ddd' }}></i>
                                <p>ยังไม่มีเนื้อหาในหนังสือเล่มนี้</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px' }}>
                                {episodes.map((ep, index) => {
                                    const locked = isLocked(index, ep.id);
                                    //  เช็คว่าตอนนี้อ่านไปหรือยัง (ถ้าน้อยกว่าหรือเท่ากับตอนที่อ่านไกลสุด = อ่านแล้ว)
                                    const isRead = Number(ep.episode_number) <= maxEpRead;

                                    return (
                                        <div 
                                            key={ep.id} 
                                            onClick={() => handleReadEpisode(ep, index)}
                                            style={{ 
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                                padding: '18px 20px', 
                                                background: locked ? '#fafafa' : '#fff',
                                                border: locked ? '1px solid #eaeaea' : '1px solid #e0e7ff', 
                                                borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s',
                                                boxShadow: locked ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
                                                opacity: isRead ? 0.8 : 1
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.borderColor = 'none';
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.borderColor = locked ? '#eaeaea' : '#e0e7ff';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                            }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontSize: '16px', fontWeight: 'bold', color: locked ? '#94a3b8' : 'black', display: 'flex', alignItems: 'center' }}>
                                                    ตอนที่ {ep.episode_number}
                                                    {isRead && (
                                                        <span style={{ marginLeft: '10px', color: '#10b981', background: '#d1fae5', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                                                            <i className="fas fa-check-circle"></i> อ่านแล้ว
                                                        </span>
                                                    )}
                                                </span>
                                                <span style={{ fontSize: '16px', color: locked ? '#64748b' : '#1e293b', fontWeight: locked ? 'normal' : '500' }}>
                                                    {ep.title}
                                                </span>
                                            </div>
                                            <div>
                                                {locked ? (
                                                    <span style={{ background: '#fff', border: '1px solid #ffcc80', color: '#f57c00', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <i className="fas fa-lock"></i> 10 เหรียญ
                                                    </span>
                                                ) : (
                                                    <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        {index < 3 ? <><i className="fas fa-gift"></i> อ่านฟรี</> : <><i className="fas fa-unlock"></i> ซื้อแล้ว</>}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
                
            )}
        </div>
    );
}

export default Read;