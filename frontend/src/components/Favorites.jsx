import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/style.css'; // หากคุณใช้ไฟล์ CSS อื่นในการจัดหน้า สามารถเปลี่ยนชื่อไฟล์ได้ครับ

function Favorites() {
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchFavorites();
    }, []);

    const fetchFavorites = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await axios.get('http://localhost:3001/favorites/full', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFavorites(res.data);
        } catch (error) {
            console.error("Error fetching favorites:", error);
            
            // 🔻 เพิ่มโค้ดดักจับ 403 ตรงนี้ 🔻
            if (error.response && error.response.status === 403) {
                alert("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
                localStorage.clear(); // ล้างข้อมูลเก่าทิ้ง
                window.location.href = '/'; // เด้งกลับหน้าแรก
            }
        } finally {
            setLoading(false);
        }
    };

    // ฟังก์ชันสำหรับกดยกเลิกหัวใจ (Unfavorite) จากหน้านี้
    const handleRemoveFavorite = async (bookId) => {
        const token = localStorage.getItem('token');
        try {
            // เรียก API /favorites/toggle ที่คุณสร้างไว้
            await axios.post('http://localhost:3001/favorites/toggle', { bookId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // อัปเดตหน้าจอโดยกรองหนังสือเล่มที่ถูกลบออกไป
            setFavorites(favorites.filter(book => book.id !== bookId));
        } catch (error) {
            console.error("Error removing favorite:", error);
            alert("เกิดข้อผิดพลาดในการลบรายการโปรด");
        }
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '18px' }}>กำลังโหลดรายการโปรด... ⏳</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Sarabun, sans-serif' }}>
            
            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', marginBottom: '20px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-arrow-left"></i> กลับหน้าหลัก
            </button>
            
            <h2 style={{ borderBottom: '2px solid #ff4e63', paddingBottom: '10px', color: '#333' }}>
                ❤️ หนังสือเล่มโปรดของคุณ
            </h2>

            {favorites.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '80px', color: '#888' }}>
                    <i className="fas fa-heart-broken" style={{ fontSize: '64px', marginBottom: '20px', color: '#eee' }}></i>
                    <p style={{ fontSize: '18px' }}>ยังไม่มีหนังสือในรายการโปรดเลยครับ ไปหาอ่านกันเถอะ!</p>
                    <button 
                        onClick={() => navigate('/')} 
                        style={{ padding: '12px 24px', background: '#ff4e63', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '15px', fontSize: '16px', fontWeight: 'bold' }}>
                        เลือกดูหนังสือ
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px', marginTop: '30px' }}>
                    {favorites.map(book => (
                        <div key={book.id} style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', position: 'relative', border: '1px solid #eee' }}>
                            <img 
                                src={book.image} 
                                alt={book.title} 
                                style={{ width: '100%', height: '260px', objectFit: 'cover', cursor: 'pointer' }} 
                                onClick={() => navigate(`/read/${book.id}`)} 
                            />
                            <div style={{ padding: '15px' }}>
                                <h4 style={{ margin: '0 0 5px 0', fontSize: '16px', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {book.title}
                                </h4>
                                <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>{book.author}</p>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px' }}>
                                    <button 
                                        onClick={() => navigate(`/read/${book.id}`)}
                                        style={{ flex: 1, marginRight: '5px', padding: '8px', background: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                                        📖 อ่านเลย
                                    </button>
                                    <button 
                                        onClick={() => handleRemoveFavorite(book.id)}
                                        style={{ padding: '8px 12px', background: '#ffe4e6', color: '#ff4e63', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                                        title="ลบออกจากรายการโปรด">
                                        <i className="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Favorites;