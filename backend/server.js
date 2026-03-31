const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
require('dotenv').config();

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret';

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('✅ Connected to the users database.');
    }
});
const postUploadDir = path.join(__dirname, 'uploads', 'posts');
if (!fs.existsSync(postUploadDir)) {
    fs.mkdirSync(postUploadDir, { recursive: true });
}

// ตั้งค่า Multer สำหรับ Post
const postStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/posts'); // เก็บไว้ในโฟลเดอร์ uploads/posts
    },
    filename: (req, file, cb) => {
        cb(null, 'post-' + Date.now() + path.extname(file.originalname));
    }
});
const uploadPost = multer({ storage: postStorage });
// Middleware สำหรับตรวจสอบ JWT Token
// --- ส่วนของ LOGIN (ตัวอย่าง) ---
// jwt.sign({ id: user.id }, 'ค่านี้ต้องตรงกัน', ...)

// --- ส่วนของ Middleware (แก้ไขให้ตรงกัน) ---
// ตัวอย่าง: ถ้าตอน Login คุณเขียนแบบนี้
// jwt.sign({ id: user.id }, 'MySecret123', { expiresIn: '1d' });

// ใน authenticateToken ก็ต้องเป็นแบบนี้
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: "Unauthenticated" });

    // 💡 ใช้ค่าจากไฟล์ .env ที่คุณตั้งไว้ (my_super_secret_key)
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => { 
        if (err) {
            console.log("JWT Error Details:", err.message); // ถ้ายังขึ้น invalid signature ให้เช็คบรรทัดด้านล่าง
            return res.status(403).json({ message: "Forbidden" });
        }
        req.user = user;
        next();
    });
};
//ตารางเก็บประวัติการอ่าน
db.run(`CREATE TABLE IF NOT EXISTS reading_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    max_episode_number INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, book_id)
)`);
// ================= DATABASE SETUP =================
db.run(`CREATE TABLE IF NOT EXISTS post_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    user_id INTEGER,
    type TEXT, -- 'like' หรือ 'dislike'
    UNIQUE(post_id, user_id) -- บังคับให้ 1 คน กดได้แค่ 1 ครั้งต่อ 1 โพสต์
)`);
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
// 🔓 unlocked_episodes table
db.run(`CREATE TABLE IF NOT EXISTS unlocked_episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    book_id INTEGER,
    episode_id INTEGER,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, episode_id)
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

// 📚 purchased_books table
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

// 🧾 purchase_history table
db.run(`CREATE TABLE IF NOT EXISTS purchase_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    type TEXT,
    price INTEGER,
    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
)`, (err) => {
    if (err) console.error("Error creating purchase_history table:", err);
    else console.log("✅ Table 'purchase_history' is ready.");
});

// 🛠️ banners table
db.run(`CREATE TABLE IF NOT EXISTS banners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image TEXT NOT NULL,
    title TEXT,
    link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// 💰 topup_requests table — เก็บคำขอเติมเหรียญพร้อมสลิป
db.run(`CREATE TABLE IF NOT EXISTS topup_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    package_id TEXT NOT NULL,
    coins INTEGER NOT NULL,
    bonus INTEGER DEFAULT 0,
    total_coins INTEGER NOT NULL,
    amount REAL NOT NULL,
    slip_image TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    approved_by INTEGER,
    note TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
)`, (err) => {
    if (err) console.error("Error creating topup_requests table:", err);
    else console.log("✅ Table 'topup_requests' is ready.");
});

// 🔔 admin_notifications — แจ้งเตือน admin เมื่อ user ส่งสลิป
db.run(`CREATE TABLE IF NOT EXISTS admin_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    ref_id INTEGER,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`, (err) => {
    if (!err) console.log("✅ Table 'admin_notifications' is ready.");
});

// 🔔 user_notifications — แจ้งเตือน user เมื่อ admin approve/reject
db.run(`CREATE TABLE IF NOT EXISTS user_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    ref_id INTEGER,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
)`, (err) => {
    if (!err) console.log("✅ Table 'user_notifications' is ready.");
});

// สร้าง admin
const createAdmin = async () => {
    const username = 'admin123';
    const password = '11111111';
    const email = 'admin@example.com';
    const hashedPassword = await bcrypt.hash(password, 10);
    const adminCoins = 999999; 

    db.run(
        `INSERT OR IGNORE INTO users (username, email, password, role, coins) VALUES (?, ?, ?, ?, ?)`,
        [username, email, hashedPassword, 'admin', adminCoins],
        function (err) {
            if (err) {
                console.error(err.message);
            } else {
                console.log('✅ Admin ready');
                db.run(`UPDATE users SET coins = ? WHERE username = ?`, [adminCoins, username], (updateErr) => {
                    if (updateErr) console.error("Error updating admin coins:", updateErr.message);
                    else console.log(`🪙 Admin coins updated to ${adminCoins}`);
                });
            }
        }
    );
};

// ── Upload Directories ──────────────────────────────────────────
const bannerUploadDir = path.join(__dirname, 'uploads/banners');
if (!fs.existsSync(bannerUploadDir)) {
    fs.mkdirSync(bannerUploadDir, { recursive: true });
    console.log('📁 Created directory: uploads/banners');
}

const slipUploadDir = path.join(__dirname, 'uploads/slips');
if (!fs.existsSync(slipUploadDir)) {
    fs.mkdirSync(slipUploadDir, { recursive: true });
    console.log('📁 Created directory: uploads/slips');
}

// Multer สำหรับแบนเนอร์
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, bannerUploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});
const uploadBanner = multer({ storage: storage });

// Multer สำหรับสลิปโอนเงิน
const slipStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, slipUploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, 'slip_' + Date.now() + path.extname(file.originalname));
    }
});
const uploadSlip = multer({
    storage: slipStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype);
        if (ext && mime) cb(null, true);
        else cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพเท่านั้น'));
    }
});

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

// 🔓 กดซื้อตอน
app.post('/unlock', verifyToken, (req, res) => {
    const userId = req.user.id;
    const { bookId, episodeId, coinCost } = req.body; 

    db.get(`SELECT coins FROM users WHERE id = ?`, [userId], (err, user) => {
        if (err || !user) return res.status(500).json({ message: "Error fetching user" });
        
        if (user.coins < coinCost) {
            return res.status(400).json({ message: "เหรียญไม่พอ กรุณาเติมเหรียญก่อนครับ 🪙" });
        }

        db.run(`UPDATE users SET coins = coins - ? WHERE id = ?`, [coinCost, userId], function(err) {
            if (err) return res.status(500).json({ message: "เกิดข้อผิดพลาดในการหักเหรียญ" });

            db.run(`INSERT OR IGNORE INTO unlocked_episodes (user_id, book_id, episode_id) VALUES (?, ?, ?)`, 
            [userId, bookId, episodeId], function(err) {
                if (err) return res.status(500).json({ message: "เกิดข้อผิดพลาดในการบันทึกตอน" });
                
                db.get(`SELECT b.title as book_title, e.title as ep_title FROM books b JOIN episodes e ON b.id = e.book_id WHERE b.id = ? AND e.id = ?`, 
                [bookId, episodeId], (err, row) => {
                    const historyTitle = row ? `${row.book_title} - ${row.ep_title}` : `ปลดล็อกตอน ID: ${episodeId}`;
                    
                    db.run(`INSERT INTO purchase_history (user_id, title, type, price) VALUES (?, ?, ?, ?)`, 
                    [userId, historyTitle, 'episode', coinCost], (err) => {
                        if (err) console.error("History log error:", err);
                        res.json({ message: "ปลดล็อกสำเร็จ!", remainingCoins: user.coins - coinCost });
                    });
                });
            });
        });
    });
});
// 💰 [ADMIN] ดึงรายการเติมเงินที่รอตรวจสอบ (สถานะ pending)
app.get('/admin/topups', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });

    const sql = `
        SELECT t.id, t.user_id, u.username, t.package_id, t.coins, t.amount, t.slip_image, t.status,
               t.created_at || 'Z' as created_at
        FROM topup_requests t
        JOIN users u ON t.user_id = u.id
        WHERE t.status = 'pending'
        ORDER BY t.created_at ASC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json(rows);
    });
});
app.get('/purchased', verifyToken, (req, res) => {
    const userId = req.user.id;
    db.all(`SELECT book_id FROM purchased_books WHERE user_id = ?`, [userId], (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        const purchasedIds = rows.map(row => row.book_id);
        res.json(purchasedIds);
    });
});

app.get('/banners', (req, res) => {
    db.all(`SELECT * FROM banners ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json(rows);
    });
});

app.post('/banners/add', verifyToken, uploadBanner.single('image'), (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Admin only" });
    
    const { title, link } = req.body;
    
    if (!req.file) {
        return res.status(400).json({ message: "กรุณาอัปโหลดรูปภาพ" });
    }

    const imagePath = `/uploads/banners/${req.file.filename}`;
    
    const sql = `INSERT INTO banners (image, title, link) VALUES (?, ?, ?)`;
    db.run(sql, [imagePath, title, link], function (err) {
        if (err) {
            fs.unlinkSync(req.file.path);
            return res.status(500).json({ message: "Database error" });
        }
        res.json({ id: this.lastID, image: imagePath, title, link, message: "เพิ่มแบนเนอร์สำเร็จ!" });
    });
});

app.get('/cart', verifyToken, (req, res) => {
    const userId = req.user.id;
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

app.post('/cart/add', verifyToken, (req, res) => {
    const userId = req.user.id;
    const bookId = req.body.book_id || req.body.bookId;

    const checkSql = "SELECT * FROM cart_items WHERE user_id = ? AND book_id = ?";
    db.get(checkSql, [userId, bookId], (err, row) => {
        if (err) return res.status(500).json({ message: "Database error" });
        
        if (row) {
            return res.status(400).json({ message: "หนังสือเล่มนี้อยู่ในตะกร้าแล้ว" });
        }

        const insertSql = "INSERT INTO cart_items (user_id, book_id) VALUES (?, ?)";
        db.run(insertSql, [userId, bookId], function(err) {
            if (err) return res.status(500).json({ message: "Error adding to cart" });
            res.status(201).json({ message: "เพิ่มลงตะกร้าเรียบร้อย" });
        });
    });
});

app.delete('/banners/:id', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Admin only" });
    const bannerId = req.params.id;

    db.get(`SELECT image FROM banners WHERE id = ?`, [bannerId], (err, row) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (!row) return res.status(404).json({ message: "Banner not found" });

        db.run(`DELETE FROM banners WHERE id = ?`, [bannerId], (deleteErr) => {
            if (deleteErr) return res.status(500).json({ message: "Database error" });
            
            try {
                const filePath = `uploads/banners/${row.image.split('/banners/')[1]}`;
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (unlinkErr) {
                console.error("Error deleting banner file:", unlinkErr);
            }
            
            res.json({ message: "ลบแบนเนอร์สำเร็จ!" });
        });
    });
});

app.delete('/cart/:id', verifyToken, (req, res) => {
    const userId = req.user.id;
    const cartItemId = req.params.id;

    const sql = "DELETE FROM cart_items WHERE id = ? AND user_id = ?";
    db.run(sql, [cartItemId, userId], function(err) {
        if (err) return res.status(500).json({ message: "Error deleting item" });
        res.json({ message: "ลบสินค้าเรียบร้อยแล้ว" });
    });
});

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

app.get('/books/:id/episodes', (req, res) => {
    const sql = `SELECT * FROM episodes WHERE book_id = ? ORDER BY episode_number ASC`;
    db.all(sql, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(rows);
    });
});

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

// ✅ [ADMIN] อนุมัติการเติมเงิน (อัปเดตสถานะ และบวกเหรียญให้ User)
app.put('/admin/topups/:id/approve', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
    const requestId = req.params.id;
    const adminId   = req.user.id;

    db.get(`SELECT * FROM topup_requests WHERE id = ? AND status = 'pending'`, [requestId], (err, request) => {
        if (err || !request) return res.status(404).json({ message: "ไม่พบคำขอ หรืออนุมัติไปแล้ว" });

        const totalCoins = request.total_coins || request.coins;

        // 1. อัปเดตสถานะ
        db.run(
            `UPDATE topup_requests SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by = ? WHERE id = ?`,
            [adminId, requestId],
            function(err) {
                if (err) return res.status(500).json({ message: "Database error (update)" });

                // 2. บวกเหรียญให้ user
                db.run(`UPDATE users SET coins = coins + ? WHERE id = ?`, [totalCoins, request.user_id], function(err) {
                    if (err) return res.status(500).json({ message: "Failed to add coins" });

                    // 3. บันทึก purchase_history
                    db.run(
                        `INSERT INTO purchase_history (user_id, title, type, price) VALUES (?, ?, 'topup', 0)`,
                        [request.user_id, `เติมเหรียญ ${Number(totalCoins).toLocaleString()} เหรียญ (฿${request.amount})`]
                    );

                    // 4. ส่ง user_notification แจ้ง user
                    db.run(
                        `INSERT INTO user_notifications (user_id, type, title, message, ref_id) VALUES (?, ?, ?, ?, ?)`,
                        [
                            request.user_id,
                            'topup_approved',
                            `เติมเหรียญสำเร็จ +${Number(totalCoins).toLocaleString()} เหรียญ`,
                            `ชำระ ฿${request.amount} — รับ ${Number(totalCoins).toLocaleString()} เหรียญแล้ว`,
                            requestId
                        ],
                        function(err2) {
                            if (err2) console.error("user_notifications insert error:", err2.message);
                            res.json({ message: "อนุมัติสำเร็จ ผู้ใช้ได้รับเหรียญแล้ว!" });
                        }
                    );
                });
            }
        );
    });
});

// ── [PUT] admin ปฏิเสธคำขอ (endpoint ที่ AdminTopup.jsx เรียก) ─────────────
app.put('/admin/topups/:id/reject', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
    const requestId = req.params.id;
    const adminId   = req.user.id;
    const { note }  = req.body;

    db.get(`SELECT * FROM topup_requests WHERE id = ? AND status = 'pending'`, [requestId], (err, request) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (!request) return res.status(404).json({ message: "ไม่พบคำขอ หรือถูกดำเนินการแล้ว" });

        const rejectNote = (note && note.trim()) ? note.trim() : 'ปฏิเสธโดยแอดมิน';

        // 1. อัปเดตสถานะ
        db.run(
            `UPDATE topup_requests SET status = 'rejected', approved_at = CURRENT_TIMESTAMP, approved_by = ?, note = ? WHERE id = ?`,
            [adminId, rejectNote, requestId],
            function(err) {
                if (err) return res.status(500).json({ message: "Database error (update)" });

                // 2. ส่ง user_notification แจ้ง user
                db.run(
                    `INSERT INTO user_notifications (user_id, type, title, message, ref_id) VALUES (?, ?, ?, ?, ?)`,
                    [request.user_id, 'topup_rejected', 'คำขอเติมเหรียญถูกปฏิเสธ', rejectNote, requestId],
                    function(err2) {
                        if (err2) console.error("user_notifications insert error:", err2.message);
                        // ส่ง response สำเร็จเสมอ แม้ notification จะ fail
                        res.json({ message: "ปฏิเสธคำขอแล้ว" });
                    }
                );
            }
        );
    });
});
app.put('/profile/username', verifyToken, (req, res) => {
    const userId = req.user.id;
    const { username } = req.body;
    const sql = "UPDATE users SET username = ? WHERE id = ?";

    db.run(sql, [username, userId], function(err) {
        if (err) return res.status(500).json({ message: "Error" });
        res.json({ message: "Username updated" });
    });
});

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

app.put('/profile/image', verifyToken, (req, res) => {
    const userId = req.user.id;
    const { image } = req.body;

    db.run("UPDATE users SET image = ? WHERE id = ?", [image, userId], (err) => {
        if (err) return res.status(500).json({ message: "Error" });
        res.json({ message: "Image updated" });
    });
});

app.get('/books', (req, res) => {
    const { category, subcategory } = req.query;
    let sql = `SELECT * FROM books`;
    const params = [];
    const conditions = [];

    if (category) {
        // map หมวดใหญ่ → ค่าใน DB
        const categoryMap = {
            'นิยาย': ['นิยาย', 'นิยายรักโรแมนติก', 'นิยายวาย', 'นิยายแฟนตาซี', 'นิยายสืบสวน',
                       'นิยายกำลังภายใน', 'ไลท์โนเวล', 'วรรณกรรมทั่วไป', 'นิยายยูริ', 'กวีนิพนธ์', 'แฟนเฟิค'],
            'การ์ตูน/มังงะ': ['การ์ตูน', 'มังงะ', 'การ์ตูนโรแมนติก', 'การ์ตูนแอคชั่น',
                               'การ์ตูนแฟนตาซี', 'การ์ตูนตลก', 'การ์ตูนสยองขวัญ', 'การ์ตูนกีฬา',
                               'การ์ตูนวาย', 'การ์ตูนยูริ']
        };
        if (subcategory) {
            conditions.push(`category = ?`);
            params.push(subcategory);
        } else if (categoryMap[category]) {
            const placeholders = categoryMap[category].map(() => '?').join(',');
            conditions.push(`category IN (${placeholders})`);
            params.push(...categoryMap[category]);
        } else {
            conditions.push(`category = ?`);
            params.push(category);
        }
    }

    if (conditions.length > 0) sql += ` WHERE ` + conditions.join(' AND ');
    sql += ` ORDER BY created_at DESC`;

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(rows);
    });
});

// ── [GET] ดึง subcategory จริงจาก DB (DISTINCT category values) ──────────────
app.get('/books/categories', (req, res) => {
    const novelParents = ['นิยาย', 'นิยายรักโรแมนติก', 'นิยายวาย', 'นิยายแฟนตาซี', 'นิยายสืบสวน',
                          'นิยายกำลังภายใน', 'ไลท์โนเวล', 'วรรณกรรมทั่วไป', 'นิยายยูริ', 'กวีนิพนธ์', 'แฟนเฟิค'];
    const mangaParents = ['การ์ตูน', 'มังงะ', 'การ์ตูนโรแมนติก', 'การ์ตูนแอคชั่น',
                          'การ์ตูนแฟนตาซี', 'การ์ตูนตลก', 'การ์ตูนสยองขวัญ', 'การ์ตูนกีฬา',
                          'การ์ตูนวาย', 'การ์ตูนยูริ'];

    const novelPh  = novelParents.map(() => '?').join(',');
    const mangaPh  = mangaParents.map(() => '?').join(',');

    const sql = `
        SELECT category, COUNT(*) as count FROM books
        WHERE category IN (${novelPh}) OR category IN (${mangaPh})
        GROUP BY category
        HAVING count > 0
        ORDER BY category
    `;

    db.all(sql, [...novelParents, ...mangaParents], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Database error' });

        const novelSubs = rows
            .filter(r => novelParents.includes(r.category))
            .map(r => ({ name: r.category, count: r.count }));
        const mangaSubs = rows
            .filter(r => mangaParents.includes(r.category))
            .map(r => ({ name: r.category, count: r.count }));

        res.json({ novel: novelSubs, manga: mangaSubs });
    });
});

app.get('/unlocked/:bookId', verifyToken, (req, res) => {
    const userId = req.user.id;
    const bookId = req.params.bookId;
    
    db.get(`SELECT id FROM purchased_books WHERE user_id = ? AND book_id = ?`, [userId, bookId], (err, purchased) => {
        if (err) return res.status(500).json({ message: "Database error" });

        if (purchased) {
            db.all(`SELECT id as episode_id FROM episodes WHERE book_id = ?`, [bookId], (err, rows) => {
                if (err) return res.status(500).json({ message: "Database error" });
                res.json(rows.map(row => row.episode_id)); 
            });
        } else {
            db.all(`SELECT episode_id FROM unlocked_episodes WHERE user_id = ? AND book_id = ?`, [userId, bookId], (err, rows) => {
                if (err) return res.status(500).json({ message: "Database error" });
                res.json(rows.map(row => row.episode_id)); 
            });
        }
    });
});

app.post('/favorites/add', verifyToken, (req, res) => {
    const userId = req.user.id;
    const bookId = req.body.book_id || req.body.bookId;

    const sql = `INSERT OR IGNORE INTO favorites (user_id, book_id) VALUES (?, ?)`;

    db.run(sql, [userId, bookId], function(err) {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json({ message: "เพิ่มรายการโปรดแล้ว" });
    });
});

app.delete('/favorites/remove', verifyToken, (req, res) => {
    const userId = req.user.id;
    const bookId = req.body.book_id || req.body.bookId;

    const sql = `DELETE FROM favorites WHERE user_id = ? AND book_id = ?`;

    db.run(sql, [userId, bookId], function(err) {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json({ message: "ลบออกจากรายการโปรดแล้ว" });
    });
});
app.post('/favorites/toggle', verifyToken, (req, res) => {
    const userId = req.user.id;
    const bookId = req.body.book_id || req.body.bookId;

    db.get(
        `SELECT * FROM favorites WHERE user_id = ? AND book_id = ?`,
        [userId, bookId],
        (err, row) => {
            if (err) return res.status(500).json({ message: "Database error" });

            if (row) {
                db.run(`DELETE FROM favorites WHERE id = ?`, [row.id], () => {
                db.run(`UPDATE books SET likes = MAX(0, likes - 1) WHERE id = ?`, [bookId]);
                res.json({ status: "removed" });
            });
            } else {
                db.run(`INSERT INTO favorites (user_id, book_id) VALUES (?, ?)`, [userId, bookId], () => {
                db.run(`UPDATE books SET likes = likes + 1 WHERE id = ?`, [bookId]);
                res.json({ status: "added" });
            });
            }
        }
    );
});

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

            db.run(`UPDATE users SET coins = coins - ? WHERE id = ?`, [totalCost, userId], function(err) {
                if (err) return res.status(500).json({ message: "เกิดข้อผิดพลาดในการหักเหรียญ" });

                const placeholders = items.map(() => "(?, ?)").join(",");
                const values = [];
                items.forEach(item => values.push(userId, item.book_id));

                db.run(`INSERT OR IGNORE INTO purchased_books (user_id, book_id) VALUES ${placeholders}`, values, function(err) {
                    if (err) console.error("Error inserting to library:", err);

                    const historyPlaceholders = items.map(() => "(?, ?, ?, ?)").join(",");
                    const historyValues = [];
                    items.forEach(item => historyValues.push(userId, item.title, 'book', item.price || 0));

                    db.run(`INSERT INTO purchase_history (user_id, title, type, price) VALUES ${historyPlaceholders}`, historyValues, function(err) {
                        if (err) console.error("Error inserting to purchase_history:", err);

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
});

app.get('/library/check', verifyToken, (req, res) => {
    const userId = req.user.id;

    db.all(`SELECT book_id FROM purchased_books WHERE user_id = ?`, [userId], (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        const purchasedBookIds = rows.map(row => row.book_id);
        res.json(purchasedBookIds);
    });
});

app.get('/library', verifyToken, (req, res) => {
    const userId = req.user.id;
    const sql = `
        SELECT 
            b.id, b.title, b.author, b.category, b.description, 
            b.image, b.price, b.likes, pb.purchased_at
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

app.get('/library/episodes', verifyToken, (req, res) => {
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
            MAX(ue.unlocked_at) as purchased_at
        FROM unlocked_episodes ue
        JOIN books b ON ue.book_id = b.id
        WHERE ue.user_id = ? 
        AND b.id NOT IN (SELECT book_id FROM purchased_books WHERE user_id = ?)
        GROUP BY b.id
        ORDER BY purchased_at DESC
    `;
 
    db.all(sql, [userId, userId], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err.message });
        res.json(rows);
    });
});

app.get('/history', verifyToken, (req, res) => {
    const userId = req.user.id;
    
    const sql = `
        SELECT id, title, type, price, purchased_at 
        FROM purchase_history 
        WHERE user_id = ? 
        ORDER BY purchased_at DESC
    `;
    
    db.all(sql, [userId], (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error", error: err.message });
        res.json(rows);
    });
});

// ============================================================
// 💰 TOPUP API — เติมเหรียญด้วย QR + สลิป
// ============================================================

// 📤 ส่งคำขอเติมเหรียญพร้อมสลิป
app.post('/topup/request', verifyToken, uploadSlip.single('slip'), (req, res) => {
    const userId = req.user.id;
    const { package_id, coins, bonus, total_coins, amount } = req.body;

    if (!package_id || !coins || !total_coins || !amount) {
        // ลบไฟล์ถ้า validation fail
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "ข้อมูลไม่ครบถ้วน" });
    }

    const slipPath = req.file ? `/uploads/slips/${req.file.filename}` : null;

    const sql = `
        INSERT INTO topup_requests 
        (user_id, package_id, coins, bonus, total_coins, amount, slip_image, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `;

    db.run(sql, [userId, package_id, parseInt(coins), parseInt(bonus) || 0, parseInt(total_coins), parseFloat(amount), slipPath], function(err) {
        if (err) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(500).json({ message: "Database error", error: err.message });
        }

        const newRequestId = this.lastID;

        // 🔔 บันทึกแจ้งเตือนให้ admin ทราบว่ามีคำขอเติมเหรียญใหม่
        db.get(`SELECT username FROM users WHERE id = ?`, [userId], (err2, userRow) => {
            const uname = userRow ? userRow.username : `User #${userId}`;
            db.run(
                `INSERT INTO admin_notifications (type, title, message, ref_id) VALUES (?, ?, ?, ?)`,
                [
                    'topup_pending',
                    `คำขอเติมเหรียญใหม่`,
                    `${uname} ส่งสลิปเติมเหรียญ ฿${parseFloat(amount).toLocaleString()} (${parseInt(total_coins).toLocaleString()} เหรียญ) รอการอนุมัติ`,
                    newRequestId
                ]
            );
        });

        res.status(201).json({
            message: "ส่งคำขอเติมเหรียญสำเร็จ! รอการตรวจสอบจากแอดมิน",
            requestId: newRequestId,
            status: 'pending'
        });
    });
});

// 📋 ดึงประวัติคำขอเติมเหรียญของตัวเอง
app.get('/topup/my-requests', verifyToken, (req, res) => {
    const userId = req.user.id;

    const sql = `
        SELECT id, package_id, coins, bonus, total_coins, amount, slip_image, status,
               created_at || 'Z' as created_at,
               approved_at || 'Z' as approved_at,
               note
        FROM topup_requests
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 20
    `;

    db.all(sql, [userId], (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json(rows);
    });
});

// 👑 [ADMIN] ดึงคำขอเติมเหรียญทั้งหมด (pending ก่อน)
app.get('/admin/topup-requests', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Admin only" });

    const status = req.query.status || 'pending';

    const sql = `
        SELECT tr.*, u.username, u.email
        FROM topup_requests tr
        JOIN users u ON tr.user_id = u.id
        WHERE tr.status = ?
        ORDER BY tr.created_at DESC
    `;

    db.all(sql, [status], (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json(rows);
    });
});

// ==========================================
// ❤️ API สำหรับกดหัวใจ (เพิ่ม/ลบ ยอด likes)
// ==========================================
app.post('/toggle-like', (req, res) => {
    const { bookId, isLiked } = req.body;
    const operator = isLiked ? '+ 1' : '- 1';
    db.run(`UPDATE books SET likes = likes ${operator} WHERE id = ?`, [bookId], function(err) {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        db.get(`SELECT likes FROM books WHERE id = ?`, [bookId], (err, row) => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true, likes: row ? row.likes : 0 });
        });
    });
});

const promptpay = require('promptpay-qr');
const qrcode = require('qrcode');

// API สำหรับสร้าง QR Code PromptPay
app.get('/generate-qr', (req, res) => {
    const amount = parseFloat(req.query.amount);
    if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
    }

    //เลขพร้อมเพย์
    const mobileNumber = '0839947146'; 
    const payload = promptpay(mobileNumber, { amount });

    const options = {
        color: {
            dark: '#00316d',
            light: '#ffffff'
        }
    };

    qrcode.toDataURL(payload, options, (err, url) => {
        if (err) return res.status(500).json({ message: "QR Generation Error" });
        res.json({ qrImage: url });
    });
});
app.get('/topup-history', authenticateToken, (req, res) => {
    // ลอง console.log ดูว่า req.user มีค่าอะไรออกมา
    console.log("User from Token:", req.user); 

    const userId = req.user.id; // หรือ req.user.userId ตามที่คุณ sign ไว้ตอน login
    db.all(
        `SELECT * FROM topup_requests WHERE user_id = ? ORDER BY created_at DESC`, 
        [userId], 
        (err, rows) => {
            if (err) return res.status(500).json(err);
            res.json(rows);
        }
    );
});
// ==========================================
// 📢 API สำหรับระบบโพสต์ "เร็วๆ นี้" (News Feed)
// ==========================================

// 1. [GET] ดึงข้อมูลโพสต์ทั้งหมด
// 1. [GET] ดึงข้อมูลโพสต์ทั้งหมด พร้อมคอมเมนต์
// 1. [GET] ดึงข้อมูลโพสต์ทั้งหมด พร้อมคอมเมนต์ (แบบ Safe Mode ไม่ Join ตารางอื่น)
// 1. [GET] ดึงข้อมูลโพสต์ทั้งหมด พร้อมคอมเมนต์และชื่อคนพิมพ์
// [GET] ดึงข้อมูลโพสต์ทั้งหมด พร้อมบอกสถานะว่า User นี้เคยกดโหวตหรือยัง (Optional Token)
// [GET] ดึงข้อมูลโพสต์ทั้งหมด พร้อมคอมเมนต์ และสถานะการโหวตของ User ปัจจุบัน
app.get('/posts', (req, res) => {
    // 1. ดึงโพสต์ทั้งหมด
    db.all("SELECT * FROM posts ORDER BY created_at DESC", [], (err, posts) => {
        if (err) return res.status(500).json({ error: err.message });

        // 2. ดึงคอมเมนต์ พร้อมชื่อคนคอมเมนต์
        // ดึง u.image แล้วเปลี่ยนชื่อเป็น profile_image ชั่วคราวตอนส่งไป Frontend
        const sqlComments = `
            SELECT c.*, u.username, u.image AS profile_image
            FROM post_comments c
            LEFT JOIN users u ON c.user_id = u.id
            ORDER BY c.created_at ASC
        `;
        db.all(sqlComments, [], (err2, comments) => {
            if (err2) return res.status(500).json({ error: err2.message });

            // จับคู่คอมเมนต์ใส่ในโพสต์
            let postsData = posts.map(post => {
                post.comments = comments.filter(c => c.post_id === post.id);
                return post;
            });

            // 3. เช็ค Token ว่ามีคนล็อกอินอยู่ไหม (เพื่อเช็คสีปุ่ม Like/Dislike)
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                // ถ้าไม่ล็อกอิน ก็ส่งข้อมูลกลับไปเลย (ปุ่มจะเป็นสีเทา)
                postsData = postsData.map(post => ({ ...post, user_vote: null }));
                return res.json(postsData);
            }

            // 4. ถ้ามี Token ดึงประวัติการโหวตของ User คนนี้
            try {
                // (ถ้าไฟล์คุณยังไม่ import jwt ให้เติม const jwt = require('jsonwebtoken'); ไว้ด้านบนไฟล์ด้วยนะครับ)
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
                const userId = decoded.id;

                db.all("SELECT post_id, type FROM post_likes WHERE user_id = ?", [userId], (err3, userVotes) => {
                    if (err3) return res.status(500).json({ error: err3.message });

                    // จับคู่สถานะการโหวตใส่ในโพสต์
                    postsData = postsData.map(post => {
                        const vote = userVotes.find(v => v.post_id === post.id);
                        return { ...post, user_vote: vote ? vote.type : null };
                    });

                    // ส่งข้อมูลแบบสมบูรณ์กลับไปให้ Frontend
                    res.json(postsData);
                });
            } catch (jwtErr) {
                // Token พัง ก็ทำเหมือนไม่ได้ล็อกอิน
                postsData = postsData.map(post => ({ ...post, user_vote: null }));
                res.json(postsData);
            }
        });
    });
});
// 2. [POST] แอดมินสร้างโพสต์ใหม่
app.post('/admin/add-post', verifyToken, uploadPost.single('image'), (req, res) => {
    const { caption } = req.body;
    const imageUrl = req.file ? `/uploads/posts/${req.file.filename}` : null;

    if (!caption && !imageUrl) {
        return res.status(400).json({ message: "กรุณาใส่ข้อความหรือรูปภาพอย่างน้อยหนึ่งอย่าง" });
    }

    const sql = "INSERT INTO posts (caption, image_url) VALUES (?, ?)";
    
    // SQLite ใช้ db.run สำหรับ INSERT/UPDATE/DELETE
    db.run(sql, [caption, imageUrl], function(err) {
        if (err) {
            console.error("Error creating post:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.status(201).json({ message: "สร้างโพสต์สำเร็จ!", id: this.lastID });
    });
});

// 3. [DELETE] แอดมินลบโพสต์
app.delete('/admin/delete-post/:id', verifyToken, (req, res) => {
    const postId = req.params.id;

    // หาชื่อไฟล์รูปก่อนเพื่อจะลบออกจากเครื่อง
    db.get("SELECT image_url FROM posts WHERE id = ?", [postId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (row && row.image_url) {
            const imagePath = path.join(__dirname, row.image_url);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath); 
            }
        }

        // ลบข้อมูลออกจาก Database
        db.run("DELETE FROM posts WHERE id = ?", [postId], function(deleteErr) {
            if (deleteErr) return res.status(500).json({ error: deleteErr.message });
            res.json({ message: "ลบโพสต์และรูปภาพสำเร็จ!" });
        });
    });
});
app.post('/posts/:id/like', (req, res) => {
    const postId = req.params.id;
    // สั่งให้เพิ่มค่า likes_count ขึ้น 1
    db.run("UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?", [postId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "เพิ่มไลค์สำเร็จ" });
    });
});

// 2. [POST] กด Dislike
// 2. [POST] โหวตโพสต์ (Like / Dislike) - จำกัด 1 คนต่อ 1 โพสต์
// [POST] โหวตโพสต์ (Like / Dislike) - จำกัด 1 คนต่อ 1 โพสต์ พร้อมระบบกดซ้ำยกเลิก (Toggle)
app.post('/posts/:id/vote', verifyToken, (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id; // ดึง ID คนล็อกอินจาก Token
    const { type } = req.body; // รับค่ามาว่าเป็น 'like' หรือ 'dislike'

    if (!type || !['like', 'dislike'].includes(type)) {
        return res.status(400).json({ message: "ข้อมูลประเภทโหวตไม่ถูกต้อง" });
    }

    // 1. เช็คก่อนว่าคนนี้เคยโหวตโพสต์นี้ไปหรือยัง และโหวตเป็นอะไรไว้
    db.get("SELECT type FROM post_likes WHERE post_id = ? AND user_id = ?", [postId, userId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (row) {
            // --- สถานการณ์: User เคยโหวตโพสต์นี้แล้ว ---
            
            if (row.type === type) {
                // Scenario A: กดซ้ำปุ่มเดิม -> ยกเลิกการโหวต (Undo)
                
                // ลบประวัติออกจากตาราง post_likes
                db.run("DELETE FROM post_likes WHERE post_id = ? AND user_id = ?", [postId, userId], function(err2) {
                    if (err2) return res.status(500).json({ error: err2.message });

                    // อัปเดตตัวเลขลดลงในตาราง posts
                    const columnToUpdate = type === 'like' ? 'likes_count' : 'dislikes_count';
                    db.run(`UPDATE posts SET ${columnToUpdate} = ${columnToUpdate} - 1 WHERE id = ?`, [postId], function(err3) {
                        if (err3) return res.status(500).json({ error: err3.message });
                        res.json({ message: `ยกเลิกการกด ${type} สำเร็จ!`, action: 'removed', newVote: null });
                    });
                });

            } else {
                // Scenario B: กดสลับปุ่ม (เช่น เคย Dislike ไว้ แล้วมากด Like)
                
                // อัปเดตประเภทโหวตในตาราง post_likes
                db.run("UPDATE post_likes SET type = ? WHERE post_id = ? AND user_id = ?", [type, postId, userId], function(err2) {
                    if (err2) return res.status(500).json({ error: err2.message });

                    // สลับตัวเลขในตาราง posts (บวกอันใหม่ ลดอันเก่า)
                    let sqlUpdatePosts = '';
                    if (type === 'like') {
                        sqlUpdatePosts = "UPDATE posts SET likes_count = likes_count + 1, dislikes_count = dislikes_count - 1 WHERE id = ?";
                    } else {
                        sqlUpdatePosts = "UPDATE posts SET dislikes_count = dislikes_count + 1, likes_count = likes_count - 1 WHERE id = ?";
                    }

                    db.run(sqlUpdatePosts, [postId], function(err3) {
                        if (err3) return res.status(500).json({ error: err3.message });
                        res.json({ message: `เปลี่ยนเป็นกด ${type} สำเร็จ!`, action: 'switched', newVote: type });
                    });
                });
            }

        } else {
            // --- สถานการณ์: User ยังไม่เคยโหวตโพสต์นี้เลย ---
            
            // บันทึกลงตาราง post_likes
            db.run("INSERT INTO post_likes (post_id, user_id, type) VALUES (?, ?, ?)", [postId, userId, type], function(err2) {
                if (err2) return res.status(500).json({ error: err2.message });

                // อัปเดตตัวเลขเพิ่มขึ้นในตาราง posts
                const columnToUpdate = type === 'like' ? 'likes_count' : 'dislikes_count';
                db.run(`UPDATE posts SET ${columnToUpdate} = ${columnToUpdate} + 1 WHERE id = ?`, [postId], function(err3) {
                    if (err3) return res.status(500).json({ error: err3.message });
                    res.json({ message: `กด ${type} สำเร็จ!`, action: 'added', newVote: type });
                });
            });
        }
    });
});

// 3. (แถม) สร้าง Table สำหรับเก็บคอมเมนต์ (รันครั้งแรกมันจะสร้างให้เอง)
db.run(`CREATE TABLE IF NOT EXISTS post_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    user_id INTEGER,
    comment_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// 4. [POST] ส่งคอมเมนต์
app.post('/posts/:id/comment', verifyToken, (req, res) => {
    const postId = req.params.id;
    const { text } = req.body;
    const userId = req.user?.id || 1; // สมมติว่าดึง id คนล็อกอินมาจาก token

    if (!text) return res.status(400).json({ message: "กรุณาพิมพ์ข้อความ" });

    db.run("INSERT INTO post_comments (post_id, user_id, comment_text) VALUES (?, ?, ?)", [postId, userId, text], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "คอมเมนต์สำเร็จ", commentId: this.lastID });
    });
});
// 1. [POST] อัปเดตประวัติการอ่าน (เรียกตอน User กดเข้าไปอ่านแต่ละตอน)
// ==========================================
// 📚 API สำหรับระบบจดจำประวัติการอ่าน
// ==========================================

// 1. [POST] อัปเดตประวัติการอ่าน (เรียกตอน User กดเข้าไปอ่านแต่ละตอน)
app.post('/history/update', verifyToken, (req, res) => {
    const userId = req.user.id;
    const { book_id, episode_number } = req.body;

    // เช็คว่าเคยมีประวัติการอ่านเรื่องนี้ไหม
    db.get("SELECT max_episode_number FROM reading_history WHERE user_id = ? AND book_id = ?", [userId, book_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (row) {
            // กรณีเคยอ่านแล้ว -> เช็คว่า "ตอนที่กำลังอ่าน" เลขเยอะกว่า "ตอนที่อ่านไกลสุด (max)" ไหม?
            if (Number(episode_number) > Number(row.max_episode_number)) {
                // ถ้าเยอะกว่า ให้อัปเดต max_episode_number เป็นเลขใหม่
                db.run("UPDATE reading_history SET max_episode_number = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND book_id = ?",
                    [episode_number, userId, book_id], function(err2) {
                        if (err2) return res.status(500).json({ error: err2.message });
                        return res.json({ message: "อัปเดตตอนที่อ่านไกลสุดเรียบร้อย", max_episode_number: episode_number });
                    });
            } else {
                // ถ้าน้อยกว่า (กลับไปอ่านตอนเก่า) -> ไม่อัปเดตเลข max แต่แค่อัปเดตเวลา updated_at เฉยๆ
                db.run("UPDATE reading_history SET updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND book_id = ?",
                    [userId, book_id], function(err2) {
                        if (err2) return res.status(500).json({ error: err2.message });
                        return res.json({ message: "อัปเดตเวลาอ่านล่าสุด (ตอนไกลสุดยังเท่าเดิม)", max_episode_number: row.max_episode_number });
                    });
            }
        } else {
            // กรณีเพิ่งเคยอ่านเรื่องนี้ครั้งแรก -> สร้าง Record ใหม่
            db.run("INSERT INTO reading_history (user_id, book_id, max_episode_number) VALUES (?, ?, ?)",
                [userId, book_id, episode_number], function(err2) {
                    if (err2) return res.status(500).json({ error: err2.message });
                    return res.json({ message: "สร้างประวัติการอ่านใหม่", max_episode_number: episode_number });
                });
        }
    });
});

// 2. [GET] ดึงเลขตอนที่อ่านไกลที่สุดของหนังสือแต่ละเล่ม
app.get('/history/:bookId', verifyToken, (req, res) => {
    const userId = req.user.id;
    const bookId = req.params.bookId;

    db.get("SELECT max_episode_number FROM reading_history WHERE user_id = ? AND book_id = ?", [userId, bookId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // ถ้ามีประวัติก็ส่งเลขนั้นไป ถ้าไม่มีส่ง 0
        res.json({ max_episode_number: row ? row.max_episode_number : 0 });
    });
});
// ── ตารางเก็บประวัติว่า user "เห็น" notification ตอนใหม่ไปแล้วหรือยัง ──────
db.run(`CREATE TABLE IF NOT EXISTS seen_chapter_notifs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    episode_id INTEGER NOT NULL,
    seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, episode_id)
)`);

// ── [GET] ดึงตอนใหม่ของหนังสือที่ user ซื้อหรือกดใจไว้ (ยังไม่เคยเห็น) ──
// GET /notifications/new-chapters
app.get('/notifications/new-chapters', verifyToken, (req, res) => {
    const userId = req.user.id;
    
    // อัปเดตคำสั่ง SQL 
    const sql = `
        SELECT e.id as episode_id, e.book_id, e.title as chapter_title, e.ep_number as chapter_number,
               b.title as book_title, e.created_at as published_at
        FROM episodes e
        JOIN books b ON e.book_id = b.id
        WHERE (
            -- หนังสือที่ผู้ใช้อ่าน/ซื้อ
            e.book_id IN (SELECT DISTINCT book_id FROM purchased_episodes WHERE user_id = ?)
            OR
            -- หนังสือที่ผู้ใช้กดหัวใจ
            e.book_id IN (SELECT book_id FROM favorites WHERE user_id = ?)
        )
        AND e.created_at >= datetime('now', '-7 days')
        -- 👇 เพิ่มเงื่อนไขนี้: เอาเฉพาะตอนที่ User ยังไม่เคยกดอ่าน (ไม่มีใน seen_chapter_notifs) 👇
        AND e.id NOT IN (SELECT episode_id FROM seen_chapter_notifs WHERE user_id = ?)
        ORDER BY e.created_at DESC
        LIMIT 20
    `;

    // สังเกตว่าผมเพิ่ม userId เข้าไปอีก 1 ตัวใน Array เพื่อใช้กับเงื่อนไข NOT IN ด้านบน
    db.all(sql, [userId, userId, userId], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err.message });
        res.json(rows);
    });
});

// ── [POST] มาร์กว่า user "อ่าน / เห็น" notification ตอนนั้นแล้ว ──────────
// POST /notifications/new-chapters/seen  body: { episodeIds: [1,2,3] }
app.post('/notifications/new-chapters/seen', verifyToken, (req, res) => {
    const userId = req.user.id;
    const { episodeIds } = req.body;

    if (!Array.isArray(episodeIds) || episodeIds.length === 0) {
        return res.status(400).json({ message: 'episodeIds ต้องเป็น array และต้องไม่ว่างเปล่า' });
    }

    const placeholders = episodeIds.map(() => '(?, ?)').join(', ');
    const values = [];
    episodeIds.forEach(id => values.push(userId, id));

    db.run(
        `INSERT OR IGNORE INTO seen_chapter_notifs (user_id, episode_id) VALUES ${placeholders}`,
        values,
        function(err) {
            if (err) return res.status(500).json({ message: 'Database error', error: err.message });
            res.json({ message: 'บันทึกสถานะแจ้งเตือนเรียบร้อย', marked: episodeIds.length });
        }
    );
});

// ── [GET] user ดึงการแจ้งเตือนของตัวเอง (topup approved/rejected จาก admin) ──
app.get('/user/notifications', verifyToken, (req, res) => {
    const userId = req.user.id;
    db.all(
        `SELECT *, created_at || 'Z' as created_at FROM user_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
        [userId],
        (err, rows) => {
            if (err) return res.status(500).json({ message: "Database error" });
            res.json(rows);
        }
    );
});

// ── [PUT] user mark อ่านแล้วทั้งหมด ──────────────────────────────────────────
app.put('/user/notifications/read-all', verifyToken, (req, res) => {
    const userId = req.user.id;
    db.run(`UPDATE user_notifications SET is_read = 1 WHERE user_id = ?`, [userId], (err) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json({ message: "อ่านทั้งหมดแล้ว" });
    });
});

// ── [PUT] user mark อ่านแล้ว 1 รายการ ────────────────────────────────────────
app.put('/user/notifications/:id/read', verifyToken, (req, res) => {
    const userId = req.user.id;
    db.run(
        `UPDATE user_notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
        [req.params.id, userId],
        (err) => {
            if (err) return res.status(500).json({ message: "Database error" });
            res.json({ message: "อ่านแล้ว" });
        }
    );
});

// ── [GET] admin ดึงการแจ้งเตือนที่รอ ──────────────────────────────────────────
app.get('/admin/notifications', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });

    db.all(
        `SELECT *, created_at || 'Z' as created_at FROM admin_notifications ORDER BY created_at DESC LIMIT 50`,
        [],
        (err, rows) => {
            if (err) return res.status(500).json({ message: "Database error" });
            res.json(rows);
        }
    );
});

// ── [PUT] admin mark การแจ้งเตือนว่าอ่านแล้ว ──────────────────────────────────
app.put('/admin/notifications/read-all', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });

    db.run(`UPDATE admin_notifications SET is_read = 1`, [], (err) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json({ message: "อ่านทั้งหมดแล้ว" });
    });
});

app.put('/admin/notifications/:id/read', verifyToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });

    db.run(`UPDATE admin_notifications SET is_read = 1 WHERE id = ?`, [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json({ message: "อ่านแล้ว" });
    });
});

// ================= START SERVER =================
app.listen(port, () => {
    console.log(`🚀 Server is running on http://localhost:${port}`);
});