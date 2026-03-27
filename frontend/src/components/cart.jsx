import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Login from './login';
import Register from './Register';
import '../assets/cart.css';

function Cart() {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
    const [modal, setModal] = useState(null);

    const handleDelete = async (cartItemId) => {
    if (!window.confirm("ต้องการลบหนังสือเล่มนี้ออกจากตะกร้าใช่หรือไม่?")) return;

    try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:3001/cart/${cartItemId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        // ลบเสร็จแล้ว อัปเดต UI ทันทีโดยไม่ต้องรีเฟรช
        setCartItems(cartItems.filter(item => item.cart_item_id !== cartItemId));
    } catch (err) {
        alert("ลบไม่สำเร็จ กรุณาลองใหม่");
    }
};
    // ... (useEffect เหมือนเดิม) ...

    const totalPrice = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);

    return (
        <div className="home-page">
            <nav className="navbar">
                {/* Navbar คงเดิมตามที่คุณทำไว้ */}
            </nav>

            <main className="cart-container">
                <h2 className="cart-title">
                    ตะกร้าสินค้าของฉัน ({cartItems.length})
                </h2>

                {cartItems.length === 0 ? (
                    <div className="cart-empty-state">
                        <i className="fas fa-shopping-basket cart-empty-icon"></i>
                        <p>ไม่มีสินค้าในตะกร้า</p>
                        <button onClick={() => navigate('/')} className="topup-btn-done" style={{ marginTop: '20px', width: 'auto', padding: '10px 30px' }}>
                            ไปเลือกซื้อหนังสือ
                        </button>
                    </div>
                ) : (
                    <div className="cart-grid">
                        <div className="cart-items-list">
                            {cartItems.map((item) => (
                                <div key={item.cart_item_id} className="cart-item">
                                    {/* 1. เช็คที่ src ต้องเป็น item.image */}
                                    <img 
                                        src={item.image} 
                                        alt={item.title} 
                                        className="cart-item-img" 
                                        onError={(e) => e.target.src = 'https://via.placeholder.com/100x140?text=No+Image'} 
                                    />
                                    
                                    <div className="cart-item-info">
                                        {/* 2. เช็คที่หัวข้อต้องเป็น item.title */}
                                        <h4>{item.title}</h4>
                                        
                                        {/* 3. เช็คที่ราคาต้องเป็น item.price */}
                                        <p className="cart-item-price">
                                            {Number(item.price || 0).toLocaleString()} บาท
                                        </p>
                                    </div>

                                    <button className="btn-remove-item" onClick={() => handleDelete(item.cart_item_id)}>
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="cart-summary">
                            <h3>สรุปยอดชำระ</h3>
                            <div className="summary-row">
                                <span>ราคาสินค้า</span>
                                <span>{totalPrice} บาท</span>
                            </div>
                            <hr className="divider" />
                            <div className="summary-total">
                                <span>ยอดสุทธิ</span>
                                <span>{totalPrice} บาท</span>
                            </div>
                            <button className="topup-btn-done" style={{ marginTop: '20px' }}>ชำระเงิน</button>
                        </div>
                    </div>
                )}
            </main>

            {/* Modal คงเดิม */}
        </div>
    );
}

export default Cart;