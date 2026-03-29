import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Transaction = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error("No token found");
            return;
        }

        const res = await axios.get('http://localhost:3001/topup-history', {
            headers: { Authorization: `Bearer ${token}` } // ตรวจสอบว่ามีช่องว่างหลัง Bearer
        });
        setHistory(res.data);
        setLoading(false);
    } catch (err) {
        console.error("Fetch error details:", err.response || err); // ดูรายละเอียด Error
        setLoading(false);
    }
};

    // ฟังก์ชันช่วยจัดการสีตามสถานะ
    const getStatusStyle = (status) => {
        switch (status) {
            case 'pending': return { color: '#f39c12', bg: '#fff9e6', text: '⏳ รอดำเนินการ' };
            case 'approved': return { color: '#2ecc71', bg: '#eafff2', text: '✅ สำเร็จ' };
            case 'rejected': return { color: '#e74c3c', bg: '#ffebee', text: '❌ ปฏิเสธ' };
            default: return { color: '#888', bg: '#f5f5f5', text: 'ไม่ทราบสถานะ' };
        }
    };

    return (
        <div style={{ padding: '10px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>รายการล่าสุด</h3>
                <button onClick={fetchHistory} style={{ background: 'none', border: 'none', color: '#ff4e63', cursor: 'pointer', fontSize: '13px' }}>
                    <i className="fas fa-sync-alt"></i> รีเฟรช
                </button>
            </div>

            {loading ? (
                <p style={{ textAlign: 'center', color: '#888' }}>กำลังโหลดข้อมูล...</p>
            ) : history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', background: '#f9f9f9', borderRadius: '12px', color: '#999' }}>
                    <i className="fas fa-file-invoice-dollar" style={{ fontSize: '30px', marginBottom: '10px' }}></i>
                    <p style={{ margin: 0, fontSize: '14px' }}>ยังไม่มีประวัติการเติมเงิน</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {history.map((item) => {
                        const status = getStatusStyle(item.status);
                        return (
                            <div key={item.id} style={{
                                padding: '15px',
                                borderRadius: '12px',
                                background: '#fff',
                                border: '1px solid #eee',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: '0.2s',
                                cursor: 'default'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    {/* Icon วงกลมด้านซ้าย */}
                                    <div style={{ 
                                        width: '45px', height: '45px', borderRadius: '50%', 
                                        background: status.bg, display: 'flex', 
                                        alignItems: 'center', justifyContent: 'center',
                                        fontSize: '20px'
                                    }}>
                                        🪙
                                    </div>
                                    
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#333' }}>
                                            เติม {item.coins} เหรียญ
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#999', marginTop: '3px' }}>
                                            {new Date(item.created_at).toLocaleString('th-TH', { 
                                                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                                            })} น.
                                        </div>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#222' }}>
                                        ฿{item.amount.toLocaleString()}
                                    </div>
                                    <div style={{ 
                                        fontSize: '11px', 
                                        marginTop: '5px',
                                        fontWeight: '600',
                                        color: status.color,
                                        padding: '2px 8px',
                                        borderRadius: '20px',
                                        background: status.bg,
                                        display: 'inline-block'
                                    }}>
                                        {status.text}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#bbb', marginTop: '15px' }}>
                *รายการจะถูกตรวจสอบโดยแอดมินภายใน 5-15 นาที
            </p>
        </div>
    );
};

export default Transaction;