import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/home.css';
import sakuraVideo from '../assets/sakura.mp4'; // ตรวจสอบ path ไฟล์วิดีโอ

function Home() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');

    useEffect(() => {
        // ตรวจสอบว่ามี Token หรือไม่ ถ้าไม่มีให้เด้งกลับไปหน้า Login
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
        }
        
        // จำลองการดึงชื่อผู้ใช้ (ในอนาคตควร Decode จาก JWT Token)
        const storedUser = localStorage.getItem('username'); 
        if (storedUser) setUsername(storedUser);
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const scrollCarousel = (direction) => {
        const track = document.querySelector('.carousel-track');
        const scrollAmount = 300; 
        track.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
    };

    return (
        <div className="home-page">
            <video autoPlay muted loop className="bg-video">
                <source src={sakuraVideo} type="video/mp4" />
            </video>

            <nav className="navbar">
                <div className="brand">E-Book Library</div>
                <ul className="nav-links">
                    <li><a href="#">Home</a></li>
                    <li><a href="#">Your Cart</a></li>
                    <li><a href="#">Favorites</a></li>
                    <li><a href="#">Top Up</a></li>
                    <li><a href="#">Profile</a></li>
                </ul>
                <div className="user-profile">
                    <span className="username">{username}</span>
                    <button className="logout-btn" onClick={handleLogout}>Log out</button>
                </div>
            </nav>

            <section className="search-section">
                <input type="text" placeholder="Search" />
            </section>

            <section className="new-books-section">
                <h2>New Arrivals</h2>
                <div className="carousel-container">
                    <button className="carousel-btn prev" onClick={() => scrollCarousel(-1)}>&#10094;</button>
                    <div className="carousel-track">
                        {/* คุณสามารถใช้ .map() วนลูปการแสดงผลหนังสือได้ที่นี่ */}
                        {[1, 2, 3, 4, 5, 6].map((item) => (
                            <div className="book-card" key={item}>
                                <img src={`/assets/book${(item % 3) + 1}.jpg`} alt="" />
                                <h3>New Book {item}</h3>
                                <button className="read-btn">Read</button>
                            </div>
                        ))}
                    </div>
                    <button className="carousel-btn next" onClick={() => scrollCarousel(1)}>&#10095;</button>
                </div>
            </section>

            <section className="book-container">
                {/* ตัวอย่างการแสดงรายการหนังสือปกติ */}
                <div className="book-card">
                    <img src="/assets/book1.jpg" alt="" />
                    <h3>Book 1</h3>
                    <p className="book-category">Novel</p>
                    <div className="book-actions">
                        <button className="read-btn">Read</button>
                        <button className="favorite-btn">&#10084;</button>
                    </div>
                </div>
                {/* เพิ่มการวนลูปหนังสืออื่นๆ ตามต้องการ */}
            </section>
        </div>
    );
}

export default Home;