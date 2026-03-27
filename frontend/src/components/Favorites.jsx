import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/Favorites.css';

function Favorites() {
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState([]);

    const token = localStorage.getItem('token');

    // 🔥 โหลด favorites จาก DB
    useEffect(() => {
        if (!token) {
            navigate('/'); // 👈 กัน user ไม่ login
            return;
        }

        const fetchFavorites = async () => {
            try {
                const res = await fetch('http://localhost:3001/favorites/full', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!res.ok) throw new Error('โหลด favorites ไม่สำเร็จ');

                const data = await res.json();
                setFavorites(data);

            } catch (err) {
                console.error("Fetch Favorites Error:", err);
            }
        };

        fetchFavorites();
    }, [token, navigate]); // 👈 สำคัญ

    // ❌ ลบ favorite
    const removeFavorite = async (bookId) => {
        try {
            const res = await fetch('http://localhost:3001/favorites/toggle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ bookId })
            });

            if (!res.ok) throw new Error('ลบ favorite ไม่สำเร็จ');

            const data = await res.json();

            // 👇 อัปเดต UI เฉพาะตอน backend success
            if (data.status === 'removed' || data.status === 'ok') {
                setFavorites(prev => prev.filter(b => b.id !== bookId));
            }

        } catch (err) {
            console.error("Remove Favorite Error:", err);
        }
    };

    return (
        <div className="favorites-page">
            <h1 className="fav-title">❤️ รายการโปรด</h1>

            {favorites.length === 0 ? (
                <div className="fav-empty">
                    <p>ยังไม่มีรายการโปรด</p>
                    <button onClick={() => navigate('/')}>
                        ไปเลือกหนังสือ
                    </button>
                </div>
            ) : (
                <div className="fav-grid">
                    {favorites.map(book => (
                        <div key={book.id} className="bcard">

                            <div className="bcard-cover">
                                {book.image ? (
                                    <img src={book.image} alt={book.title} />
                                ) : (
                                    <div className="bcard-img-placeholder">
                                        <i className="fas fa-image"></i>
                                    </div>
                                )}

                                <button
                                    className="bcard-fav active"
                                    onClick={() => removeFavorite(book.id)}
                                >
                                    <i className="fas fa-heart"></i>
                                </button>
                            </div>

                            <div className="bcard-details">
                                <div className="bcard-title">{book.title}</div>

                                <div className="bcard-category">{book.category}</div>

                                <div className="bcard-author">{book.author}</div>

                                <div className="bcard-price-row">
                                    <span>
                                        {book.price == 0 ? 'ฟรี' : `฿ ${book.price}`}
                                    </span>

                                    <button onClick={() => navigate(`/book/${book.id}`)}>
                                        👁 View
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