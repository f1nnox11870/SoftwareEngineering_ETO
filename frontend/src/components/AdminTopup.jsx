import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function AdminTopup() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');
        
        // ถ้าไม่ใช่ Admin ให้เตะกลับหน้าแรก
        if (!token || role !== 'admin') {
            navigate('/');
            return;
        }
        fetchRequests();
    }, [navigate]);

    const fetchRequests = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:3001/admin/topups', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(res.data);
        } catch (error) {
            console.error("Error fetching topups", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        if (!window.confirm("ยืนยันว่าได้รับยอดเงินเข้าบัญชีแล้ว และต้องการอนุมัติเหรียญ?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:3001/admin/topups/${id}/approve`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("✅ อนุมัติสำเร็จ! ระบบเพิ่มเหรียญให้ผู้ใช้แล้ว");
            fetchRequests(); // รีเฟรชข้อมูล
        } catch (error) {
            alert("เกิดข้อผิดพลาดในการอนุมัติ");
        }
    };

    const handleReject = async (id) => {
        const note = window.prompt("ระบุเหตุผลที่ปฏิเสธ (เช่น สลิปไม่ชัดเจน / ยอดเงินไม่ตรง):", "สลิปไม่ถูกต้อง หรือยอดเงินไม่เข้าบัญชี");
        if (note === null) return; 

        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:3001/admin/topups/${id}/reject`, { note }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("❌ ปฏิเสธคำขอเรียบร้อยแล้ว");
            fetchRequests(); // รีเฟรชข้อมูล
        } catch (error) {
            alert("เกิดข้อผิดพลาดในการปฏิเสธ");
        }
    };

    return (
        <div style={{ padding: '40px', background: '#f5f7fa', minHeight: '100vh', fontFamily: 'Kanit, sans-serif' }}>
            <button onClick={() => navigate('/')} style={{ marginBottom: '20px', padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#333', color: '#fff', cursor: 'pointer' }}>
                <i className="fas fa-arrow-left"></i> กลับหน้าหลัก
            </button>
            
            <h2 style={{ color: '#00316d', marginBottom: '20px' }}><i className="fas fa-money-check-alt"></i> ตรวจสอบการแจ้งชำระเงิน (Top-up)</h2>

            {loading ? (
                <p>กำลังโหลดข้อมูล...</p>
            ) : requests.length === 0 ? (
                <div style={{ padding: '50px', textAlign: 'center', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                    <i className="fas fa-check-circle" style={{ fontSize: '50px', color: '#4CAF50', marginBottom: '15px' }}></i>
                    <h3>ไม่มีรายการรอตรวจสอบ</h3>
                    <p style={{ color: '#777' }}>เคลียร์งานหมดแล้ว เยี่ยมมาก!</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                    {requests.map(req => (
                        <div key={req.id} style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
                                <strong><i className="fas fa-user"></i> {req.username}</strong>
                                <span style={{ color: '#888', fontSize: '12px' }}>{new Date(req.created_at).toLocaleString()}</span>
                            </div>

                            <p><strong>แพ็กเกจ:</strong> {req.package_id} (ได้ {req.coins} 🪙)</p>
                            <p><strong>ยอดที่ต้องโอน:</strong> <span style={{ color: '#ff4e63', fontWeight: 'bold', fontSize: '18px' }}>{req.amount} บาท</span></p>
                            
                            <div style={{ marginTop: '15px', marginBottom: '20px', textAlign: 'center' }}>
                                <p style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>รูปสลิปหลักฐาน:</p>
                                <img 
                                    src={`http://localhost:3001${req.slip_image}`} 
                                    alt="Slip" 
                                    style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', border: '1px solid #ddd', borderRadius: '8px', cursor: 'zoom-in' }}
                                    onClick={() => window.open(`http://localhost:3001${req.slip_image}`, '_blank')}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => handleApprove(req.id)} style={{ flex: 1, padding: '12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    <i className="fas fa-check"></i> อนุมัติ
                                </button>
                                <button onClick={() => handleReject(req.id)} style={{ flex: 1, padding: '12px', background: '#F44336', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    <i className="fas fa-times"></i> ปฏิเสธ
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default AdminTopup;