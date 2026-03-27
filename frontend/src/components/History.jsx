import React from 'react';
import '../assets/History.css';
import { useNavigate } from 'react-router-dom';

const History = () => {
    const navigate = useNavigate();

    // ข้อมูลหนังสือฝั่งซ้าย - เพิ่มเล่มที่ 3
    const borrowedBooks = [
        { 
            id: 101, 
            title: 'Deep Learning 101', 
            image: 'https://m.media-amazon.com/images/I/71PP6mNJYTL._AC_UF1000,1000_QL80_.jpg',
            dueDate: '01/06/2026'
        },
        { 
            id: 102, 
            title: 'The Art of CSS', 
            image: 'https://m.media-amazon.com/images/I/51-mH76S99L._AC_UF1000,1000_QL80_.jpg',
            dueDate: '05/06/2026'
        },
        { 
            id: 103, 
            title: 'React Beginners', 
            image: 'https://m.media-amazon.com/images/I/5144M-Y32VL._AC_UF1000,1000_QL80_.jpg',
            dueDate: '10/06/2026'
        }
    ];

    const historyData = [
        { id: 1, title: 'Deep Learning 101', date: '20/05/2024', status: 'คืนแล้ว' },
        { id: 2, title: 'The Art of CSS', date: '18/05/2024', status: 'กำลังอ่าน' },
        { id: 3, title: 'React Beginners', date: '15/05/2024', status: 'คืนแล้ว' },
    ];

    return (
        <div className="history-page">
            <nav className="navbar-history">
                <div className="brand-history" onClick={() => navigate('/home')}>E-Book Library</div>
                <ul className="nav-links-history">
                    <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/home'); }}>Home</a></li>
                    <li><a href="#">Your Cart</a></li>
                    <li><a href="#">Favorites</a></li>
                    <li><a href="#">Top Up</a></li>
                    <li><a href="#">Profile</a></li>
                </ul>
                <div className="user-profile-history">
                    <button className="logout-btn-history" onClick={() => navigate('/')}>Log out</button>
                </div>
            </nav>

            <div className="history-main-wrapper">
                {/* ฝั่งซ้าย: หนังสือ 3 เล่ม */}
                <div className="history-left-side">
                    <h2 className="left-side-title">📚 กำลังยืมอยู่</h2>
                    <div className="simple-borrow-list">
                        {borrowedBooks.map((book) => (
                            <div key={book.id} className="simple-borrow-item">
                                <img src={book.image} alt={book.title} className="simple-img" />
                                <div className="simple-info">
                                    <h3>{book.title}</h3>
                                    <p>กำหนดคืน: {book.dueDate}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ฝั่งขวา: ตู้แคบลงแต่สูงขึ้น */}
                <div className="history-container">
                    <h1 className="history-title">⏱ ประวัติการใช้งาน</h1>
                    <div className="history-list">
                        {historyData.map((item) => (
                            <div key={item.id} className="history-item">
                                <div className="item-info">
                                    <h3>{item.title}</h3>
                                    <p>วันที่ใช้งาน: {item.date}</p>
                                </div>
                                <div className={`item-status ${item.status === 'กำลังอ่าน' ? 'reading' : ''}`}>
                                    {item.status}
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="btn-back-home" onClick={() => navigate('/home')}>
                        กลับหน้าหลัก
                    </button>
                </div>
            </div>
        </div>
    );
};

export default History;