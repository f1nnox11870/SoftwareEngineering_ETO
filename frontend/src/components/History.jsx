import React from 'react';
import '../assets/History.css';
import { useNavigate } from 'react-router-dom';

const History = () => {
    const navigate = useNavigate();

    const historyData = [
        { id: 1, title: 'Deep Learning 101', date: '20/05/2024', status: 'คืนแล้ว' },
        { id: 2, title: 'The Art of CSS', date: '18/05/2024', status: 'กำลังอ่าน' },
        { id: 3, title: 'React for Beginners', date: '15/05/2024', status: 'คืนแล้ว' },
    ];

    return (
        <div className="history-page">
            <div className="history-container">
                <h1 className="history-title">⏱ ประวัติการใช้งาน</h1>
                
                <div className="history-list">
                    {historyData.length > 0 ? (
                        historyData.map((item) => (
                            <div key={item.id} className="history-item">
                                <div className="item-info">
                                    <h3>{item.title}</h3>
                                    <p>วันที่ใช้งาน: {item.date}</p>
                                </div>
                                <div className={`item-status ${item.status === 'กำลังอ่าน' ? 'reading' : ''}`}>
                                    {item.status}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="history-empty">
                            <p>ยังไม่มีประวัติการใช้งาน</p>
                        </div>
                    )}
                </div>

                <button className="btn-back-home" onClick={() => navigate('/home')}>
                    กลับหน้าหลัก
                </button>
            </div>
        </div>
    );
};

export default History;