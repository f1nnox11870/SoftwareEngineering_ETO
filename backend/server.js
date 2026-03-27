const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('✅ Connected to the users database.');
    }
});

// ================= DATABASE SETUP =================

// 📚 books table
db.run(`CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    author TEXT,
    category TEXT,
    description TEXT,
    image TEXT,
    price REAL DEFAULT 0,
    likes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// 📖 episodes table
db.run(`CREATE TABLE IF NOT EXISTS episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER,
    episode_number INTEGER,
    title TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id)
)`);
// 🔓 unlocked_episodes table (เก็บข้อมูลว่า User คนไหนปลดล็อกตอนไหนไปแล้ว)
db.run(`CREATE TABLE IF NOT EXISTS unlocked_episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    book_id INTEGER,
    episode_id INTEGER,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, episode_id) -- ป้องกันการซื้อตอนเดิมซ้ำ
)`);
// 👤 users table
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user',
    image TEXT,
    coins INTEGER DEFAULT 0
    
)`, async (err) => {
    if (err) {
        console.error(err.message);
    } else {
        db.run(`ALTER TABLE users ADD COLUMN coins INTEGER DEFAULT 0`, (err) => {
            if (!err) console.log("✅ Added 'coins' column to existing users table.");
        });
        console.log('✅ Users table ready');
        await createAdmin();
    }
});

// 🛒 cart_items table
db.run(`CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    book_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (book_id) REFERENCES books(id)
)`, (err) => {
    if (err) {
        console.error("Error creating cart_items table:", err.message);
    } else {
        console.log("✅ cart_items table ready.");
    }
});

// ❤️ favorites table
db.run(`CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    book_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, book_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (book_id) REFERENCES books(id)
)`, (err) => {
    if (err) {
        console.error("Error creating favorites table:", err.message);
    } else {
        console.log("✅ favorites table ready.");
    }
});

// 📚 purchased_books table (เก็บประวัติการเป็นเจ้าของหนังสือ)
db.run(`CREATE TABLE IF NOT EXISTS purchased_books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    book_id INTEGER,
    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, book_id) 
)`, (err) => {
    if (err) console.error("Error creating purchased_books table:", err);
    else console.log("✅ Table 'purchased_books' is ready.");
});

// สร้าง admin
const createAdmin = async () => {
    const username = 'admin123';
    const password = '11111111';
    const email = 'admin@example.com';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 💰 กำหนดจำนวนเหรียญให้แอดมินตรงนี้ (เช่น 999,999 เหรียญ)
    const adminCoins = 999999; 

    // 1. ลองสร้างบัญชีแอดมิน (กรณีรันครั้งแรก)
    db.run(
        `INSERT OR IGNORE INTO users (username, email, password, role, coins) VALUES (?, ?, ?, ?, ?)`,
        [username, email, hashedPassword, 'admin', adminCoins],
        function (err) {
            if (err) {
                console.error(err.message);
            } else {
                console.log('✅ Admin ready');
                
                // 2. อัปเดตเหรียญซ้ำอีกรอบ (กรณีแอดมินมีบัญชีอยู่แล้วในฐานข้อมูล จะได้เหรียญอัปเดตตามด้วย)
                db.run(`UPDATE users SET coins = ? WHERE username = ?`, [adminCoins, username], (updateErr) => {
                    if (updateErr) console.error("Error updating admin coins:", updateErr.message);
                    else console.log(`🪙 Admin coins updated to ${adminCoins}`);
                });
            }
        }
    );
};


// ================= MIDDLEWARE =================

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
        return res.status(401).json({ message: "กรุณาเข้าสู่ระบบ (Token required)" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Session หมดอายุ หรือ Token ไม่ถูกต้อง" });
        }
        req.user = user; 
        next(); 
    });
};


// ================= API ENDPOINTS =================

// 📝 Register ENDPOINT
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body; 
    
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, Email และ Password ขาดหายไป' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
    
    db.run(sql, [username, email, hashedPassword], function (err) {
        if (err) {
            if(err.message.includes('UNIQUE')) {
                return res.status(409).json({ message: 'ชื่อผู้ใช้งาน หรือ อีเมล นี้ถูกสมัครไปแล้ว' });
            }
            return res.status(500).json({ message: 'Database error' });
        }
        res.status(201).json({ message: 'User registered successfully', userId: this.lastID });
    });
});

// 🔑 Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body; 
    
    const sql = 'SELECT * FROM users WHERE username = ? OR email = ?';

    db.get(sql, [username, username], async (err, user) => {
        if (err) {
            return res.status(500).json({ message: 'Server error' });
        }
        if (!user) {
            return res.status(404).json({ message: 'ไม่พบชื่อผู้ใช้งานหรืออีเมลนี้' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
        }
        
        const token = jwt.sign({ id: user.id , username: user.username , role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Login successful', token, username: user.username });
    });
});
//กดซื้อตอน (หักเหรียญ + บันทึกลง Database)
app.post('/unlock', verifyToken, (req, res) => {
    const userId = req.user.id;
    const { bookId, episodeId, coinCost } = req.body; // รับค่ามาจากหน้าเว็บ

    // 2.1 เช็คก่อนว่าเหรียญพอไหม
    db.get(`SELECT coins FROM users WHERE id = ?`, [userId], (err, user) => {
        if (err || !user) return res.status(500).json({ message: "Error fetching user" });
        
        if (user.coins < coinCost) {
            return res.status(400).json({ message: "เหรียญไม่พอ กรุณาเติมเหรียญก่อนครับ 🪙" });
        }

        // 2.2 ถ้าเหรียญพอ ให้หักเหรียญ
        db.run(`UPDATE users SET coins = coins - ? WHERE id = ?`, [coinCost, userId], function(err) {
            if (err) return res.status(500).json({ message: "เกิดข้อผิดพลาดในการหักเหรียญ" });

            // 2.3 บันทึกประวัติว่าซื้อตอนนี้แล้ว
            db.run(`INSERT OR IGNORE INTO unlocked_episodes (user_id, book_id, episode_id) VALUES (?, ?, ?)`, 
            [userId, bookId, episodeId], function(err) {
                if (err) return res.status(500).json({ message: "เกิดข้อผิดพลาดในการบันทึกตอน" });
                
                res.json({ message: "ปลดล็อกสำเร็จ!", remainingCoins: user.coins - coinCost });
            });
        });
    });
});
// 🛒 Get Cart Items (ดึงของในตะกร้ามานับจำนวน)
app.get('/cart', verifyToken, (req, res) => {
    const userId = req.user.id;
    // ใช้ JOIN เพื่อดึงข้อมูลจากตาราง books มาแสดงคู่กับ item ในตะกร้า
    const sql = `
        SELECT ci.id AS cart_item_id, b.id AS book_id, b.title, b.image, b.price, b.author
        FROM cart_items ci
        JOIN books b ON ci.book_id = b.id
        WHERE ci.user_id = ?`;

    db.all(sql, [userId], (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json(rows);
    });
});

// ➕ Add to Cart Endpoint
app.post('/cart/add', verifyToken, (req, res) => {
    const userId = req.user.id;
    const bookId = req.body.book_id || req.body.bookId;

    // 1. เช็คก่อนว่ามีของชิ้นนี้ในตะกร้าหรือยัง
    const checkSql = "SELECT * FROM cart_items WHERE user_id = ? AND book_id = ?";
    db.get(checkSql, [userId, bookId], (err, row) => {
        if (err) return res.status(500).json({ message: "Database error" });
        
        if (row) {
            // ถ้าเจอข้อมูล แปลว่าซ้ำ
            return res.status(400).json({ message: "หนังสือเล่มนี้อยู่ในตะกร้าแล้ว" });
        }

        // 2. ถ้าไม่ซ้ำ ถึงจะทำการ INSERT
        const insertSql = "INSERT INTO cart_items (user_id, book_id) VALUES (?, ?)";
        db.run(insertSql, [userId, bookId], function(err) {
            if (err) return res.status(500).json({ message: "Error adding to cart" });
            res.status(201).json({ message: "เพิ่มลงตะกร้าเรียบร้อย" });
        });
    });
});
// 🗑️ Delete Cart Item
app.delete('/cart/:id', verifyToken, (req, res) => {
    const userId = req.user.id;
    const cartItemId = req.params.id;

    const sql = "DELETE FROM cart_items WHERE id = ? AND user_id = ?";
    db.run(sql, [cartItemId, userId], function(err) {
        if (err) return res.status(500).json({ message: "Error deleting item" });
        res.json({ message: "ลบสินค้าเรียบร้อยแล้ว" });
    });
});

// ➕ Add Book (Admin)
app.post('/admin/add-book', verifyToken, (req, res) => {
    const { title, author, category, description, image, price } = req.body; 

    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Admin only" });
    }

    const sql = `INSERT INTO books (title, author, category, description, image, price, likes) 
                 VALUES (?, ?, ?, ?, ?, ?, 0)`;
    
    db.run(sql, [title, author, category, description, image, price || 0], function(err) {
        if (err) {
            console.error("Database error:", err.message);
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.status(201).json({ 
            message: 'Book added successfully', 
            bookId: this.lastID 
        });
    });
});
// ================= จัดการเนื้อหาย่อย (Episodes) =================

// 📖 1. ดึงตอนทั้งหมดของหนังสือเล่มที่เลือก
app.get('/books/:id/episodes', (req, res) => {
    const sql = `SELECT * FROM episodes WHERE book_id = ? ORDER BY episode_number ASC`;
    db.all(sql, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(rows);
    });
});

// ➕ 2. เพิ่มตอนใหม่ (Admin Only)
app.post('/admin/add-episode', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Admin only" });
    }

    const { book_id, episode_number, title, content } = req.body;
    if (!book_id || !title || !content) {
        return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    const sql = `INSERT INTO episodes (book_id, episode_number, title, content) VALUES (?, ?, ?, ?)`;
    db.run(sql, [book_id, episode_number || 1, title, content], function(err) {
        if (err) return res.status(500).json({ message: 'Database error', error: err.message });
        res.status(201).json({ message: 'เพิ่มตอนสำเร็จ', episodeId: this.lastID });
    });
});

// 🗑️ 3. ลบตอน (Admin Only)
app.delete('/admin/delete-episode/:id', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Admin only" });
    }

    const sql = `DELETE FROM episodes WHERE id = ?`;
    db.run(sql, [req.params.id], function(err) {
        if (err) return res.status(500).json({ message: 'Database error', error: err.message });
        res.json({ message: 'ลบตอนสำเร็จ' });
    });
});

// 👤 Get Profile
app.get('/profile', verifyToken, (req, res) => {
    const userId = req.user.id;
    const sql = "SELECT id, username, email, role, image, coins FROM users WHERE id = ?";

    db.get(sql, [userId], (err, user) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            image: user.image || null,
            coins: user.coins || 0
        });
    });
});

// ✏️ UPDATE USERNAME
app.put('/profile/username', verifyToken, (req, res) => {
    const userId = req.user.id;
    const { username } = req.body;
    const sql = "UPDATE users SET username = ? WHERE id = ?";

    db.run(sql, [username, userId], function(err) {
        if (err) return res.status(500).json({ message: "Error" });
        res.json({ message: "Username updated" });
    });
});

// 🔒 CHANGE PASSWORD
app.put('/profile/password', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    db.get("SELECT password FROM users WHERE id = ?", [userId], async (err, user) => {
        if (err || !user) return res.status(404).json({ message: "User not found" });
        
        const match = await bcrypt.compare(oldPassword, user.password);
        if (!match) return res.status(401).json({ message: "Wrong password" });

        const hashed = await bcrypt.hash(newPassword, 10);
        db.run("UPDATE users SET password = ? WHERE id = ?", [hashed, userId]);
        res.json({ message: "Password updated" });
    });
});

// 🖼️ UPDATE IMAGE
app.put('/profile/image', verifyToken, (req, res) => {
    const userId = req.user.id;
    const { image } = req.body;

    db.run("UPDATE users SET image = ? WHERE id = ?", [image, userId], (err) => {
        if (err) return res.status(500).json({ message: "Error" });
        res.json({ message: "Image updated" });
    });
});

// 📚 Get All Books (Home.jsx)
app.get('/books', (req, res) => {
    const sql = `SELECT * FROM books ORDER BY created_at DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(rows); 
    });
});
//ดึงข้อมูลว่า User คนนี้ ปลดล็อกตอนไหนในหนังสือเล่มนี้ไปแล้วบ้าง
app.get('/unlocked/:bookId', verifyToken, (req, res) => {
    const userId = req.user.id;
    const bookId = req.params.bookId;
    
    db.all(`SELECT episode_id FROM unlocked_episodes WHERE user_id = ? AND book_id = ?`, [userId, bookId], (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        // ส่งกลับไปเป็น Array ของ ID ตอนที่ปลดล็อกแล้ว เช่น [12, 13, 15]
        res.json(rows.map(row => row.episode_id)); 
    });
});

// ➕ เพิ่ม favorite
app.post('/favorites/add', verifyToken, (req, res) => {
    const userId = req.user.id;
    const bookId = req.body.book_id || req.body.bookId;

    const sql = `
        INSERT OR IGNORE INTO favorites (user_id, book_id)
        VALUES (?, ?)
    `;

    db.run(sql, [userId, bookId], function(err) {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json({ message: "เพิ่มรายการโปรดแล้ว" });
    });
});

// ❌ ลบ favorite
app.delete('/favorites/remove', verifyToken, (req, res) => {
    const userId = req.user.id;
    const bookId = req.body.book_id || req.body.bookId;

    const sql = `
        DELETE FROM favorites
        WHERE user_id = ? AND book_id = ?
    `;

    db.run(sql, [userId, bookId], function(err) {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json({ message: "ลบออกจากรายการโปรดแล้ว" });
    });
});

// 🔁 toggle favorite (แนะนำให้ใช้ตัวนี้)
app.post('/favorites/toggle', verifyToken, (req, res) => {
    const userId = req.user.id;
    const bookId = req.body.book_id || req.body.bookId;

    db.get(
        `SELECT * FROM favorites WHERE user_id = ? AND book_id = ?`,
        [userId, bookId],
        (err, row) => {
            if (err) return res.status(500).json({ message: "Database error" });

            if (row) {
                // ❌ remove
                db.run(
                    `DELETE FROM favorites WHERE user_id = ? AND book_id = ?`,
                    [userId, bookId],
                    () => res.json({ status: "removed" })
                );
            } else {
                // ➕ add
                db.run(
                    `INSERT INTO favorites (user_id, book_id) VALUES (?, ?)`,
                    [userId, bookId],
                    () => res.json({ status: "added" })
                );
            }
        }
    );
});

// 🔍 ดึงเฉพาะ ID (ใช้เช็ค fav)
app.get('/favorites', verifyToken, (req, res) => {
    const userId = req.user.id;

    db.all(
        `SELECT book_id FROM favorites WHERE user_id = ?`,
        [userId],
        (err, rows) => {
            if (err) return res.status(500).json({ message: "Database error" });
            res.json(rows);
        }
    );
});

// 🔥 ดึง FAVORITES + BOOK (ใช้หน้า Favorites)
app.get('/favorites/full', verifyToken, (req, res) => {
    const userId = req.user.id;

    const sql = `
        SELECT b.*
        FROM favorites f
        JOIN books b ON f.book_id = b.id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
    `;

    db.all(sql, [userId], (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json(rows);
    });
});


// 💳 ระบบชำระเงินในตะกร้าด้วยเหรียญ
app.post('/cart/checkout', verifyToken, (req, res) => {
    const userId = req.user.id;

    const cartSql = `
        SELECT ci.book_id, b.price, b.title 
        FROM cart_items ci 
        JOIN books b ON ci.book_id = b.id 
        WHERE ci.user_id = ?`;

    db.all(cartSql, [userId], (err, items) => {
        if (err) return res.status(500).json({ message: "Database error (fetch cart)" });
        if (items.length === 0) return res.status(400).json({ message: "ไม่มีสินค้าในตะกร้า" });

        const totalCost = items.reduce((sum, item) => sum + (item.price || 0), 0);

        db.get(`SELECT coins FROM users WHERE id = ?`, [userId], (err, user) => {
            if (err || !user) return res.status(500).json({ message: "Error fetching user" });
            
            if (user.coins < totalCost) {
                return res.status(400).json({ message: "เหรียญไม่เพียงพอ" });
            }

            // 1️⃣ หักเหรียญ
            db.run(`UPDATE users SET coins = coins - ? WHERE id = ?`, [totalCost, userId], function(err) {
                if (err) return res.status(500).json({ message: "เกิดข้อผิดพลาดในการหักเหรียญ" });

                // 2️⃣ บันทึกหนังสือที่ซื้อลง purchased_books (ชั้นหนังสือของผู้ใช้)
                const placeholders = items.map(() => "(?, ?)").join(",");
                const values = [];
                items.forEach(item => values.push(userId, item.book_id));

                // ใช้ INSERT OR IGNORE เผื่อป้องกันข้อผิดพลาดกรณีมีข้อมูลซ้ำ
                db.run(`INSERT OR IGNORE INTO purchased_books (user_id, book_id) VALUES ${placeholders}`, values, function(err) {
                    if (err) console.error("Error inserting to library:", err);

                    // 3️⃣ ลบสินค้าออกจากตะกร้าเมื่อเสร็จสิ้น
                    db.run(`DELETE FROM cart_items WHERE user_id = ?`, [userId], (err) => {
                        if (err) console.error("Clear cart error:", err);
                        
                        res.json({ 
                            message: "ชำระเงินสำเร็จ! หนังสือถูกเพิ่มเข้าชั้นหนังสือของคุณแล้ว", 
                            remainingCoins: user.coins - totalCost 
                        });
                    });
                });
            });
        });
    });
});

// 📖 API สำหรับเช็คว่าผู้ใช้เป็นเจ้าของหนังสือเล่มไหนบ้าง (ส่งกลับไปแค่ book_id)
app.get('/library/check', verifyToken, (req, res) => {
    const userId = req.user.id;

    db.all(`SELECT book_id FROM purchased_books WHERE user_id = ?`, [userId], (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        
        // ส่งกลับไปเป็น Array ของ book_id เช่น [1, 3, 5] เพื่อง่ายต่อการเช็คใน Frontend
        const purchasedBookIds = rows.map(row => row.book_id);
        res.json(purchasedBookIds);
    });
});
//Library ดึงหนังสือ จากข้อมูลทั้งหมด
app.get('/library', verifyToken, (req, res) => {
    const userId = req.user.id;
 
    const sql = `
        SELECT 
            b.id,
            b.title,
            b.author,
            b.category,
            b.description,
            b.image,
            b.price,
            b.likes,
            pb.purchased_at
        FROM purchased_books pb
        JOIN books b ON pb.book_id = b.id
        WHERE pb.user_id = ?
        ORDER BY pb.purchased_at DESC
    `;
 
    db.all(sql, [userId], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err.message });
        res.json(rows);
    });
});
 
// ================= START SERVER =================
app.listen(port, () => {
    console.log(`🚀 Server is running on http://localhost:${port}`);
});

