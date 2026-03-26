import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/Favorites.css';

function Favorites() {
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState([]);

    useEffect(() => {
        const data = localStorage.getItem('favorites');
        if (data) {
            try {
                setFavorites(JSON.parse(data));
            } catch {
                setFavorites([]);
            }
        }
    }, []);

    const removeFavorite = (id) => {
        const updated = favorites.filter(item => item.id !== id);
        setFavorites(updated);
        localStorage.setItem('favorites', JSON.stringify(updated));
    };

    return (
        <div className="favorites-page">
            <h1 className="fav-title">❤️ รายการโปรด</h1>

            {favorites.length === 0 ? (
                <div className="fav-empty">
                    <p>ยังไม่มีรายการโปรด</p>
                    <button className="btn-back" onClick={() => navigate('/')}>
                        ไปเลือกหนังสือ
                    </button>
                </div>
            ) : (
                <div className="fav-grid">
                    {favorites.map(book => (
                        <div key={book.id} className="bcard">
                            <div className="bcard-cover">
                                <div className="bcard-img-placeholder">
                                    <i className="fas fa-image"></i>
                                </div>
                                <button
                                    className="bcard-fav active" 
                                    onClick={() => removeFavorite(book.id)}
                                >
                                    <i className="fas fa-heart"></i>
                                </button>
                            </div>

                            <div className="bcard-info">
                                <div className="bcard-title">{book.title}</div>
                                <div className="bcard-sub">{book.subtitle}</div>
                                <div className="bcard-meta">{book.author}</div>
                                <div className="bcard-cat">{book.category}</div>

                                <div className="bcard-price-row">
                                    <span className="bcard-price">
                                        {book.price} บาท
                                    </span>
                                </div>

                                <button className="btn-view" onClick={() => navigate('/')}>
                                    ดูรายละเอียด
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
} 

export default Favorites;