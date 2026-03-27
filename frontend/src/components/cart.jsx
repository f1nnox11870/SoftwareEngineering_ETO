import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../assets/cart.css'; 

function Cart() {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);
    const [cartCount, setCartCount] = useState(0);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState('');

    const fetchCart = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await axios.get('http://localhost:3001/cart', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("ข้อมูลในตะกร้า:", res.data);
            
            setCartItems(res.data);
            setCartCount(res.data.length);
        } catch (err) {
            console.error("Fetch cart error", err);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('username');
        if (token) {
            setIsLoggedIn(true);
            if (user) setUsername(user);
            fetchCart();
        } else {
            navigate('/');
        }
    }, [navigate]);

    const removeItem = async (cartItemId) => {
        if (!window.confirm("คุณต้องการลบหนังสือเล่มนี้ใช่หรือไม่?")) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`http://localhost:3001/cart/${cartItemId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchCart();
        } catch (err) {
            alert("ไม่สามารถลบสินค้าได้");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        setIsLoggedIn(false);
        setCartCount(0);
        navigate('/');
    };

    const totalPrice = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);

    return (
        <div className="cart-page">
            {/* ═════════ 1. NAVBAR (ตามแบบในภาพ) ═════════ */}
            <nav className="navbar">
                <div className="navbar-inner">
                    {/* Left: Logo & Menu */}
                    <div className="nav-left">
                        <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer', color: '#ff4e63', fontSize: '28px', fontWeight: '800', letterSpacing: '1px' }}>
                            MEB
                        </div>
                        <div className="nav-menu" style={{ display: 'flex', gap: '20px', alignItems: 'center', marginLeft: '20px' }}>
                            <a href="#" style={{ color: '#333', textDecoration: 'none', fontSize: '18px' }}><i className="fas fa-home"></i></a>
                            <a href="#" style={{ color: '#333', textDecoration: 'none', fontSize: '15px' }}>หนังสือ</a>
                            <a href="#" style={{ color: '#333', textDecoration: 'none', fontSize: '15px' }}>มังงะ&การ์ตูน</a>
                            <a href="#" style={{ color: '#333', textDecoration: 'none', fontSize: '15px' }}>นิยาย</a>
                            <a href="#" style={{ color: '#333', textDecoration: 'none', fontSize: '15px' }}>อีบุ๊กทั่วไป</a>
                            <a href="#" style={{ color: '#333', textDecoration: 'none', fontSize: '15px' }}>ข่าว/นิตยสาร</a>
                        </div>
                    </div>

                    {/* Center: Search Bar */}
                    <div className="nav-center">
                        <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: '#f5f5f5', borderRadius: '30px', padding: '8px 20px', width: '400px', border: '1px solid #eee' }}>
                            <i className="fas fa-search" style={{ color: '#ff4e63', marginRight: '10px' }}></i>
                            <input 
                                type="text" 
                                placeholder="ค้นหาหนังสือ, นิยาย, การ์ตูน, ผู้เขียน..." 
                                style={{ border: 'none', background: 'transparent', flex: 1, outline: 'none', fontSize: '14px' }}
                            />
                        </div>
                    </div>

                    {/* Right: Icons & Profile */}
                    <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button className="nav-icon-btn pos-rel" onClick={() => navigate('/cart')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', position: 'relative', color: '#333' }}>
                            <i className="fas fa-shopping-cart"></i>
                            {cartCount > 0 && <span className="nbadge red" style={{ position: 'absolute', top: '-5px', right: '-8px', background: '#ff4e63', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '50%', border: '2px solid #fff' }}>{cartCount}</span>}
                        </button>
                        <button className="nav-icon-btn pos-rel" style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', position: 'relative', color: '#333' }}>
                            <i className="fas fa-bell"></i>
                            <span className="nbadge red" style={{ position: 'absolute', top: '-5px', right: '-8px', background: '#ff4e63', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '50%', border: '2px solid #fff' }}>1</span>
                        </button>
                        
                        {isLoggedIn ? (
                            <div className="profile-btn" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={handleLogout}>
                                <img src="https://via.placeholder.com/35" alt="Avatar" style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover' }} />
                                <span style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>{username}</span>
                                <i className="fas fa-chevron-down" style={{ fontSize: '12px', color: '#666' }}></i>
                            </div>
                        ) : (
                            <button style={{ background: '#ff4e63', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
                                เข้าสู่ระบบ
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* ═════════ 2. HERO & BREADCRUMB (ตามแบบในภาพ) ═════════ */}
            <div className="cart-header-section" style={{ background: '#fff' }}>
                {/* Breadcrumb แถบสีเทาอ่อน */}
                <div className="breadcrumb" style={{ background: '#f9f9f9', padding: '12px 40px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#666' }}>
                    <i className="fas fa-home" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}></i>
                    <i className="fas fa-chevron-right" style={{ fontSize: '10px', color: '#ccc' }}></i>
                    <span style={{ color: '#ff4e63', fontWeight: '600' }}>รถเข็น</span>
                </div>
                
                {/* Hero Title รถเข็น */}
                <div className="cart-hero-title" style={{ padding: '30px 40px', display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '1px solid #eee' }}>
                    <i className="fas fa-shopping-cart" style={{ fontSize: '32px', color: '#ff4e63' }}></i>
                    <h1 style={{ fontSize: '24px', margin: 0, color: '#222' }}>รถเข็น</h1>
                </div>
            </div>

            {/* ═════════ 3. ส่วนรายการสินค้าตะกร้า (โค้ดเดิม) ═════════ */}
            <div className="cart-container" style={{ maxWidth: '1100px', margin: '30px auto', padding: '0 40px' }}>
                <h2 className="cart-title">ตะกร้าสินค้าของฉัน ({cartItems.length} รายการ)</h2>
                {/* ... โค้ดเงื่อนไข cartItems.length === 0 และกล่องซ้ายขวาของคุณ ... */}
                
                {cartItems.length === 0 ? (
                    <div className="empty-cart">
                        <p style={{ color: '#666', fontSize: '18px', marginBottom: '15px' }}>ไม่มีสินค้าในตะกร้า</p>
                        <button className="btn-checkout" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => navigate('/')}>
                            ไปเลือกซื้อหนังสือ
                        </button>
                    </div>
                ) : (
                    <div className="cart-grid">
                        {/* ฝั่งซ้าย: รายการสินค้า */}
                        <div className="cart-items-list">
                            {cartItems.map((item) => (
                                <div key={item.cart_item_id} className="cart-item">
                                    <img src={item.image} alt={item.title} />
                                    <div className="cart-item-info">
                                        <h4>{item.title}</h4>
                                        <p>ผู้เขียน: {item.author}</p>
                                        <p className="cart-item-price">{item.price.toLocaleString()} บาท</p>
                                    </div>
                                    <button className="btn-remove-item" onClick={() => removeItem(item.cart_item_id)}>
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* ฝั่งขวา: สรุปยอดชำระ */}
                        <div className="cart-summary">
                            <h3>สรุปยอดชำระ</h3>
                            <div className="summary-row">
                                <span>ราคาสินค้า</span>
                                <span>{totalPrice.toLocaleString()} บาท</span>
                            </div>
                            <div className="summary-row">
                                <span>ส่วนลด</span>
                                <span style={{ color: '#2ecc71' }}>- 0 บาท</span>
                            </div>
                            <hr className="divider" />
                            <div className="summary-total">
                                <span>ยอดสุทธิ</span>
                                <span>{totalPrice.toLocaleString()} บาท</span>
                            </div>
                            <button className="btn-checkout">
                                ชำระเงิน
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
export default Cart;