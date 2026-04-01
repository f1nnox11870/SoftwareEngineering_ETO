const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// ตั้งค่า Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const http = require('http');
const { Server } = require('socket.io');
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret';

// ✅ PostgreSQL connection
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// helper แทน db.run / db.get / db.all ของ SQLite
const query = (sql, params) => db.query(sql, params);

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://eto-frontend.onrender.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000", "http://localhost:5173", "https://eto-frontend.onrender.com"],
        methods: ["GET", "POST"]
    }
});

// ✅ Cloudinary Storage
const postStorage = new CloudinaryStorage({
    cloudinary,
    params: { folder: 'eto-posts', allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }
});
const uploadPost = multer({ storage: postStorage });

const coverStorage = new CloudinaryStorage({
    cloudinary,
    params: { folder: 'eto-covers', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] }
});
const uploadCover = multer({
    storage: coverStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น'));
    }
});

const bannerStorage = new CloudinaryStorage({
    cloudinary,
    params: { folder: 'eto-banners', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] }
});
const uploadBanner = multer({ storage: bannerStorage });

const slipStorage = new CloudinaryStorage({
    cloudinary,
    params: { folder: 'eto-slips', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] }
});
const uploadSlip = multer({
    storage: slipStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        if (allowed.test(file.mimetype)) cb(null, true);
        else cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพเท่านั้น'));
    }
});

// ================= MIDDLEWARE =================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Unauthenticated" });
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Forbidden" });
        req.user = user;
        next();
    });
};

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: "กรุณาเข้าสู่ระบบ (Token required)" });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Session หมดอายุ หรือ Token ไม่ถูกต้อง" });
        req.user = user;
        next();
    });
};

// ================= DATABASE SETUP =================
const initDb = async () => {
    await query(`CREATE TABLE IF NOT EXISTS reading_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        book_id INTEGER NOT NULL,
        max_episode_number INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, book_id)
    )`);
    await query(`CREATE TABLE IF NOT EXISTS post_likes (
        id SERIAL PRIMARY KEY,
        post_id INTEGER,
        user_id INTEGER,
        type TEXT,
        UNIQUE(post_id, user_id)
    )`);
    await query(`CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title TEXT,
        author TEXT,
        category TEXT,
        genre TEXT,
        description TEXT,
        image TEXT,
        price REAL DEFAULT 0,
        likes INTEGER DEFAULT 0,
        episode_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await query(`CREATE TABLE IF NOT EXISTS episodes (
        id SERIAL PRIMARY KEY,
        book_id INTEGER,
        episode_number INTEGER,
        title TEXT,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id)
    )`);
    await query(`CREATE TABLE IF NOT EXISTS unlocked_episodes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        book_id INTEGER,
        episode_id INTEGER,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, episode_id)
    )`);
    await query(`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user',
        image TEXT,
        coins INTEGER DEFAULT 0
    )`);
    await query(`CREATE TABLE IF NOT EXISTS cart_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        book_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await query(`CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        book_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, book_id)
    )`);
    await query(`CREATE TABLE IF NOT EXISTS purchased_books (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        book_id INTEGER,
        purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, book_id)
    )`);
    await query(`CREATE TABLE IF NOT EXISTS purchase_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        title TEXT,
        type TEXT,
        price INTEGER,
        purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await query(`CREATE TABLE IF NOT EXISTS banners (
        id SERIAL PRIMARY KEY,
        image TEXT NOT NULL,
        title TEXT,
        link TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await query(`CREATE TABLE IF NOT EXISTS topup_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        package_id TEXT NOT NULL,
        coins INTEGER NOT NULL,
        bonus INTEGER DEFAULT 0,
        total_coins INTEGER NOT NULL,
        amount REAL NOT NULL,
        slip_image TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approved_at TIMESTAMP,
        approved_by INTEGER,
        note TEXT
    )`);
    await query(`CREATE TABLE IF NOT EXISTS admin_notifications (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        ref_id INTEGER,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await query(`CREATE TABLE IF NOT EXISTS user_notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        ref_id INTEGER,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await query(`CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        caption TEXT,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await query(`CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER,
        user_id INTEGER,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);
    await query(`CREATE TABLE IF NOT EXISTS seen_chapter_notifs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        episode_id INTEGER NOT NULL,
        seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, episode_id)
    )`);
    await query(`CREATE TABLE IF NOT EXISTS history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        book_id INTEGER,
        title TEXT,
        type TEXT,
        amount INTEGER,
        purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log('✅ All tables ready');
    await createAdmin();
};

const createAdmin = async () => {
    const username = process.env.ADMIN_USERNAME || 'AETOM_NApat@916';
    const password = process.env.ADMIN_PASSWORD || 'QWERMBMFT916';
    const email = process.env.ADMIN_EMAIL || 'AETOM_NApat_916@example.com';
    const hashedPassword = await bcrypt.hash(password, 10);
    const adminCoins = 999999;
    try {
        await query(
            `INSERT INTO users (username, email, password, role, coins) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (username) DO UPDATE SET coins = $5`,
            [username, email, hashedPassword, 'admin', adminCoins]
        );
        console.log('✅ Admin ready');
    } catch (err) {
        console.error('Admin create error:', err.message);
    }
};

// ================= API ENDPOINTS =================

// 📝 Register
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
        return res.status(400).json({ message: 'Username, Email และ Password ขาดหายไป' });
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
            [username, email, hashedPassword]
        );
        res.status(201).json({ message: 'User registered successfully', userId: result.rows[0].id });
    } catch (err) {
        if (err.message.includes('unique') || err.message.includes('duplicate'))
            return res.status(409).json({ message: 'ชื่อผู้ใช้งาน หรือ อีเมล นี้ถูกสมัครไปแล้ว' });
        res.status(500).json({ message: 'Database error' });
    }
});

// 🔑 Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await query('SELECT * FROM users WHERE username = $1 OR email = $1', [username]);
        const user = result.rows[0];
        if (!user) return res.status(404).json({ message: 'ไม่พบชื่อผู้ใช้งานหรืออีเมลนี้' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Login successful', token, username: user.username });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// 🔓 ปลดล็อกตอน
app.post('/unlock', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { bookId, episodeId, coinCost } = req.body;
    try {
        const userRes = await query('SELECT coins FROM users WHERE id = $1', [userId]);
        const user = userRes.rows[0];
        if (!user || user.coins < coinCost)
            return res.status(400).json({ message: "เหรียญไม่พอ กรุณาเติมเหรียญก่อนครับ 🪙" });
        await query('UPDATE users SET coins = coins - $1 WHERE id = $2', [coinCost, userId]);
        await query('INSERT INTO unlocked_episodes (user_id, book_id, episode_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [userId, bookId, episodeId]);
        const bookRes = await query('SELECT b.title as book_title, e.title as ep_title FROM books b JOIN episodes e ON b.id = e.book_id WHERE b.id = $1 AND e.id = $2', [bookId, episodeId]);
        const historyTitle = bookRes.rows[0] ? `${bookRes.rows[0].book_title} - ${bookRes.rows[0].ep_title}` : `ปลดล็อกตอน ID: ${episodeId}`;
        await query('INSERT INTO purchase_history (user_id, title, type, price) VALUES ($1, $2, $3, $4)', [userId, historyTitle, 'episode', coinCost]);
        res.json({ message: "ปลดล็อกสำเร็จ!", remainingCoins: user.coins - coinCost });
    } catch (err) {
        res.status(500).json({ message: "Error", error: err.message });
    }
});

// 💰 [ADMIN] ดึงรายการเติมเงิน pending
app.get('/admin/topups', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
    try {
        const result = await query(`
            SELECT t.id, t.user_id, u.username, t.package_id, t.coins, t.amount, t.slip_image, t.status, t.created_at
            FROM topup_requests t JOIN users u ON t.user_id = u.id
            WHERE t.status = 'pending' ORDER BY t.created_at ASC
        `);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

app.get('/purchased', verifyToken, async (req, res) => {
    try {
        const result = await query('SELECT book_id FROM purchased_books WHERE user_id = $1', [req.user.id]);
        res.json(result.rows.map(r => r.book_id));
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

// 🎨 Banners
app.get('/banners', async (req, res) => {
    try {
        const result = await query('SELECT * FROM banners ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

app.post('/banners/add', verifyToken, uploadBanner.single('image'), async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Admin only" });
    if (!req.file) return res.status(400).json({ message: "กรุณาอัปโหลดรูปภาพ" });
    const { title, link } = req.body;
    const imagePath = req.file.path;
    try {
        const result = await query('INSERT INTO banners (image, title, link) VALUES ($1, $2, $3) RETURNING id', [imagePath, title, link]);
        res.json({ id: result.rows[0].id, image: imagePath, title, link, message: "เพิ่มแบนเนอร์สำเร็จ!" });
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

app.delete('/banners/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Admin only" });
    try {
        const result = await query('SELECT image FROM banners WHERE id = $1', [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ message: "Banner not found" });
        await query('DELETE FROM banners WHERE id = $1', [req.params.id]);
        const img = result.rows[0].image;
        if (img && img.includes('cloudinary.com')) {
            const publicId = img.split('/').slice(-1)[0].split('.')[0];
            cloudinary.uploader.destroy(`eto-banners/${publicId}`).catch(() => {});
        }
        res.json({ message: "ลบแบนเนอร์สำเร็จ!" });
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

// 🛒 Cart
app.get('/cart', verifyToken, async (req, res) => {
    try {
        const result = await query(`
            SELECT ci.id AS cart_item_id, b.id AS book_id, b.title, b.image, b.price, b.author
            FROM cart_items ci JOIN books b ON ci.book_id = b.id WHERE ci.user_id = $1
        `, [req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

app.post('/cart/add', verifyToken, async (req, res) => {
    const bookId = req.body.book_id || req.body.bookId;
    try {
        const check = await query('SELECT * FROM cart_items WHERE user_id = $1 AND book_id = $2', [req.user.id, bookId]);
        if (check.rows[0]) return res.status(400).json({ message: "หนังสือเล่มนี้อยู่ในตะกร้าแล้ว" });
        await query('INSERT INTO cart_items (user_id, book_id) VALUES ($1, $2)', [req.user.id, bookId]);
        res.status(201).json({ message: "เพิ่มลงตะกร้าเรียบร้อย" });
    } catch (err) { res.status(500).json({ message: "Error adding to cart" }); }
});

app.delete('/cart/:id', verifyToken, async (req, res) => {
    try {
        await query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ message: "ลบสินค้าเรียบร้อยแล้ว" });
    } catch (err) { res.status(500).json({ message: "Error deleting item" }); }
});

// 📚 Admin - Books
app.post('/admin/add-book', verifyToken, uploadCover.single('image'), async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden: Admin only" });
    const { title, author, category, genre, description, price } = req.body;
    let imagePath = req.file ? req.file.path : (req.body.image || null);
    try {
        const result = await query(
            'INSERT INTO books (title, author, category, genre, description, image, price, likes) VALUES ($1,$2,$3,$4,$5,$6,$7,0) RETURNING id',
            [title, author, category, genre || null, description, imagePath, price || 0]
        );
        res.status(201).json({ message: 'Book added successfully', bookId: result.rows[0].id });
    } catch (err) { res.status(500).json({ message: 'Database error', error: err.message }); }
});

app.put('/admin/update-book/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden: Admin only" });
    const { title, author, category, genre, description, image, price } = req.body;
    try {
        await query('UPDATE books SET title=$1, author=$2, category=$3, genre=$4, description=$5, image=$6, price=$7 WHERE id=$8',
            [title, author, category, genre || null, description, image, price || 0, req.params.id]);
        res.json({ message: 'อัปเดตหนังสือสำเร็จ' });
    } catch (err) { res.status(500).json({ message: 'Database error' }); }
});

app.delete('/admin/delete-book/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden: Admin only" });
    try {
        await query('DELETE FROM episodes WHERE book_id = $1', [req.params.id]);
        await query('DELETE FROM books WHERE id = $1', [req.params.id]);
        res.json({ message: 'ลบหนังสือสำเร็จ' });
    } catch (err) { res.status(500).json({ message: 'Database error' }); }
});

// 📖 Episodes
app.get('/books/:id/episodes', async (req, res) => {
    try {
        const result = await query('SELECT * FROM episodes WHERE book_id = $1 ORDER BY episode_number ASC', [req.params.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: 'Database error' }); }
});

app.post('/admin/add-episode', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden: Admin only" });
    const { book_id, episode_number, title, content } = req.body;
    if (!book_id || !title || !content) return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    try {
        const result = await query(
            'INSERT INTO episodes (book_id, episode_number, title, content) VALUES ($1,$2,$3,$4) RETURNING id',
            [book_id, episode_number || 1, title, content]
        );
        const newEpisodeId = result.rows[0].id;
        const bookRes = await query('SELECT title FROM books WHERE id = $1', [book_id]);
        const bookTitle = bookRes.rows[0] ? bookRes.rows[0].title : `หนังสือ #${book_id}`;
        const epLabel = `ตอนที่ ${episode_number || 1}${title ? ` — ${title}` : ''}`;
        io.emit('new_episode_alert', { book_id, episode_id: newEpisodeId, message: 'มีการอัปเดตตอนใหม่!' });
        const buyers = await query('SELECT DISTINCT user_id FROM purchased_books WHERE book_id = $1', [book_id]);
        for (const { user_id } of buyers.rows) {
            await query(
                `INSERT INTO user_notifications (user_id, type, title, message, ref_id) VALUES ($1,'new_episode',$2,$3,$4)`,
                [user_id, `มีตอนใหม่: ${bookTitle}`, `${epLabel} เพิ่งเผยแพร่แล้ว — แตะเพื่ออ่านเลย!`, newEpisodeId]
            );
        }
        res.status(201).json({ message: 'เพิ่มตอนสำเร็จ', episodeId: newEpisodeId });
    } catch (err) { res.status(500).json({ message: 'Database error', error: err.message }); }
});

app.put('/admin/update-episode/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden: Admin only" });
    const { episode_number, title, content } = req.body;
    if (!title || !content) return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    try {
        const epRes = await query('SELECT book_id, episode_number FROM episodes WHERE id = $1', [req.params.id]);
        if (!epRes.rows[0]) return res.status(404).json({ message: "ไม่พบตอนนี้" });
        const ep = epRes.rows[0];
        const finalEpNumber = episode_number || ep.episode_number;
        await query('UPDATE episodes SET episode_number=$1, title=$2, content=$3 WHERE id=$4', [finalEpNumber, title, content, req.params.id]);
        const bookRes = await query('SELECT title FROM books WHERE id = $1', [ep.book_id]);
        const bookTitle = bookRes.rows[0] ? bookRes.rows[0].title : `หนังสือ #${ep.book_id}`;
        const epLabel = `ตอนที่ ${finalEpNumber}${title ? ` — ${title}` : ''}`;
        io.emit('new_episode_alert', { book_id: ep.book_id, episode_id: req.params.id, message: 'มีการอัปเดตตอน!' });
        const buyers = await query('SELECT DISTINCT user_id FROM purchased_books WHERE book_id = $1', [ep.book_id]);
        for (const { user_id } of buyers.rows) {
            await query(
                `INSERT INTO user_notifications (user_id, type, title, message, ref_id) VALUES ($1,'episode_updated',$2,$3,$4)`,
                [user_id, `อัปเดตเนื้อหา: ${bookTitle}`, `${epLabel} ได้รับการอัปเดตเนื้อหาใหม่แล้ว`, req.params.id]
            );
        }
        res.json({ message: 'อัปเดตตอนสำเร็จ' });
    } catch (err) { res.status(500).json({ message: 'Database error' }); }
});

app.delete('/admin/delete-episode/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden: Admin only" });
    try {
        await query('DELETE FROM episodes WHERE id = $1', [req.params.id]);
        res.json({ message: 'ลบตอนสำเร็จ' });
    } catch (err) { res.status(500).json({ message: 'Database error' }); }
});

// 👤 Profile
app.get('/profile', verifyToken, async (req, res) => {
    try {
        const result = await query('SELECT id, username, email, role, image, coins FROM users WHERE id = $1', [req.user.id]);
        const user = result.rows[0];
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({ id: user.id, username: user.username, email: user.email, image: user.image || null, coins: user.coins || 0 });
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

app.put('/profile/username', verifyToken, async (req, res) => {
    try {
        await query('UPDATE users SET username = $1 WHERE id = $2', [req.body.username, req.user.id]);
        res.json({ message: "Username updated" });
    } catch (err) { res.status(500).json({ message: "Error" }); }
});

app.put('/profile/password', verifyToken, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    try {
        const result = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
        const user = result.rows[0];
        if (!user) return res.status(404).json({ message: "User not found" });
        const match = await bcrypt.compare(oldPassword, user.password);
        if (!match) return res.status(401).json({ message: "Wrong password" });
        const hashed = await bcrypt.hash(newPassword, 10);
        await query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);
        res.json({ message: "Password updated" });
    } catch (err) { res.status(500).json({ message: "Error" }); }
});

app.put('/profile/image', verifyToken, async (req, res) => {
    try {
        await query('UPDATE users SET image = $1 WHERE id = $2', [req.body.image, req.user.id]);
        res.json({ message: "Image updated" });
    } catch (err) { res.status(500).json({ message: "Error" }); }
});

// 📚 Books
app.get('/books', async (req, res) => {
    const { category, subcategory, search, sortBy, genre } = req.query;
    const params = [];
    const conditions = [];

    const categoryMap = {
        'นิยาย': ['นิยาย', 'นิยายรักโรแมนติก', 'นิยายวาย', 'นิยายแฟนตาซี', 'นิยายสืบสวน',
                   'นิยายกำลังภายใน', 'ไลท์โนเวล', 'วรรณกรรมทั่วไป', 'นิยายยูริ', 'กวีนิพนธ์', 'แฟนเฟิค'],
        'การ์ตูน/มังงะ': ['การ์ตูน', 'มังงะ', 'การ์ตูนโรแมนติก', 'การ์ตูนแอคชั่น',
                           'การ์ตูนแฟนตาซี', 'การ์ตูนตลก', 'การ์ตูนสยองขวัญ', 'การ์ตูนกีฬา', 'การ์ตูนวาย', 'การ์ตูนยูริ']
    };

    let paramIdx = 1;
    if (category) {
        if (subcategory) {
            conditions.push(`b.category = $${paramIdx++}`); params.push(subcategory);
        } else if (categoryMap[category]) {
            const ph = categoryMap[category].map(() => `$${paramIdx++}`).join(',');
            conditions.push(`b.category IN (${ph})`); params.push(...categoryMap[category]);
        } else {
            conditions.push(`b.category = $${paramIdx++}`); params.push(category);
        }
    }
    if (search && search.trim()) {
        conditions.push(`(b.title ILIKE $${paramIdx} OR b.author ILIKE $${paramIdx++})`);
        params.push(`%${search.trim()}%`);
    }
    if (genre && genre.trim()) {
        conditions.push(`b.genre ILIKE $${paramIdx++}`); params.push(`%${genre.trim()}%`);
    }

    let sql = `SELECT b.*, COUNT(DISTINCT e.id) as episode_count FROM books b LEFT JOIN episodes e ON e.book_id = b.id`;
    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' GROUP BY b.id';

    const sortMap = {
        'price_asc': 'b.price ASC', 'price_desc': 'b.price DESC',
        'popular': 'b.likes DESC', 'author_asc': 'b.author ASC',
        'author_desc': 'b.author DESC', 'newest': 'b.created_at DESC', 'oldest': 'b.created_at ASC',
    };
    sql += ' ORDER BY ' + (sortMap[sortBy] || 'b.created_at DESC');

    try {
        const result = await query(sql, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: 'Database error', error: err.message }); }
});

app.get('/books/genres', async (req, res) => {
    const predefined = ['โรแมนติก','แฟนตาซี','แอคชั่น','ผจญภัย','สืบสวนสอบสวน','สยองขวัญ','ตลกขบขัน',
        'ดราม่า','วิทยาศาสตร์','ชีวิตประจำวัน','กีฬา','ประวัติศาสตร์','จิตวิทยา','เกม','ซูเปอร์ฮีโร่',
        'วาย (BL)','ยูริ (GL)','ไอดอล','โรงเรียน','ครอบครัว'];
    try {
        const result = await query(`SELECT DISTINCT genre FROM books WHERE genre IS NOT NULL AND genre != ''`);
        const fromDb = result.rows.map(r => r.genre).filter(Boolean);
        const all = [...new Set([...predefined, ...fromDb])];
        res.json(all);
    } catch (err) { res.status(500).json({ message: 'Database error' }); }
});

app.get('/books/categories', async (req, res) => {
    const novelParents = ['นิยาย','นิยายรักโรแมนติก','นิยายวาย','นิยายแฟนตาซี','นิยายสืบสวน','นิยายกำลังภายใน','ไลท์โนเวล','วรรณกรรมทั่วไป','นิยายยูริ','กวีนิพนธ์','แฟนเฟิค'];
    const mangaParents = ['การ์ตูน','มังงะ','การ์ตูนโรแมนติก','การ์ตูนแอคชั่น','การ์ตูนแฟนตาซี','การ์ตูนตลก','การ์ตูนสยองขวัญ','การ์ตูนกีฬา','การ์ตูนวาย','การ์ตูนยูริ'];
    const all = [...novelParents, ...mangaParents];
    const ph = all.map((_, i) => `$${i+1}`).join(',');
    try {
        const result = await query(`SELECT category, COUNT(*) as count FROM books WHERE category IN (${ph}) GROUP BY category ORDER BY category`, all);
        const novelSubs = result.rows.filter(r => novelParents.includes(r.category)).map(r => ({ name: r.category, count: r.count }));
        const mangaSubs = result.rows.filter(r => mangaParents.includes(r.category)).map(r => ({ name: r.category, count: r.count }));
        res.json({ novel: novelSubs, manga: mangaSubs });
    } catch (err) { res.status(500).json({ message: 'Database error' }); }
});

app.get('/unlocked/:bookId', verifyToken, async (req, res) => {
    try {
        const purchased = await query('SELECT id FROM purchased_books WHERE user_id = $1 AND book_id = $2', [req.user.id, req.params.bookId]);
        if (purchased.rows[0]) {
            const eps = await query('SELECT id as episode_id FROM episodes WHERE book_id = $1', [req.params.bookId]);
            return res.json(eps.rows.map(r => r.episode_id));
        }
        const unlocked = await query('SELECT episode_id FROM unlocked_episodes WHERE user_id = $1 AND book_id = $2', [req.user.id, req.params.bookId]);
        res.json(unlocked.rows.map(r => r.episode_id));
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

// ❤️ Favorites
app.post('/favorites/add', verifyToken, async (req, res) => {
    const bookId = req.body.book_id || req.body.bookId;
    try {
        await query('INSERT INTO favorites (user_id, book_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, bookId]);
        res.json({ message: "เพิ่มรายการโปรดแล้ว" });
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

app.delete('/favorites/remove', verifyToken, async (req, res) => {
    const bookId = req.body.book_id || req.body.bookId;
    try {
        await query('DELETE FROM favorites WHERE user_id = $1 AND book_id = $2', [req.user.id, bookId]);
        res.json({ message: "ลบออกจากรายการโปรดแล้ว" });
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

app.post('/favorites/toggle', verifyToken, async (req, res) => {
    const bookId = req.body.book_id || req.body.bookId;
    try {
        const check = await query('SELECT * FROM favorites WHERE user_id = $1 AND book_id = $2', [req.user.id, bookId]);
        if (check.rows[0]) {
            await query('DELETE FROM favorites WHERE id = $1', [check.rows[0].id]);
            await query('UPDATE books SET likes = GREATEST(0, likes - 1) WHERE id = $1', [bookId]);
            res.json({ status: "removed" });
        } else {
            await query('INSERT INTO favorites (user_id, book_id) VALUES ($1, $2)', [req.user.id, bookId]);
            await query('UPDATE books SET likes = likes + 1 WHERE id = $1', [bookId]);
            res.json({ status: "added" });
        }
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

app.get('/favorites', verifyToken, async (req, res) => {
    try {
        const result = await query('SELECT book_id FROM favorites WHERE user_id = $1', [req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

app.get('/favorites/full', verifyToken, async (req, res) => {
    try {
        const result = await query(`SELECT b.* FROM favorites f JOIN books b ON f.book_id = b.id WHERE f.user_id = $1 ORDER BY f.created_at DESC`, [req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

// 🛒 Checkout
app.post('/cart/checkout', verifyToken, async (req, res) => {
    try {
        const cartRes = await query(`SELECT ci.book_id, b.price, b.title FROM cart_items ci JOIN books b ON ci.book_id = b.id WHERE ci.user_id = $1`, [req.user.id]);
        const items = cartRes.rows;
        if (items.length === 0) return res.status(400).json({ message: "ไม่มีสินค้าในตะกร้า" });
        const totalCost = items.reduce((sum, item) => sum + (item.price || 0), 0);
        const userRes = await query('SELECT coins FROM users WHERE id = $1', [req.user.id]);
        const user = userRes.rows[0];
        if (!user || user.coins < totalCost) return res.status(400).json({ message: "เหรียญไม่เพียงพอ" });
        await query('UPDATE users SET coins = coins - $1 WHERE id = $2', [totalCost, req.user.id]);
        for (const item of items) {
            await query('INSERT INTO purchased_books (user_id, book_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, item.book_id]);
            await query('INSERT INTO purchase_history (user_id, title, type, price) VALUES ($1, $2, $3, $4)', [req.user.id, item.title, 'book', item.price || 0]);
        }
        await query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);
        res.json({ message: "ชำระเงินสำเร็จ! หนังสือถูกเพิ่มเข้าชั้นหนังสือของคุณแล้ว", remainingCoins: user.coins - totalCost });
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

// 📚 Library
app.get('/library/check', verifyToken, async (req, res) => {
    try {
        const result = await query('SELECT book_id FROM purchased_books WHERE user_id = $1', [req.user.id]);
        res.json(result.rows.map(r => r.book_id));
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

app.get('/library', verifyToken, async (req, res) => {
    try {
        const result = await query(`SELECT b.id, b.title, b.author, b.category, b.description, b.image, b.price, b.likes, pb.purchased_at
            FROM purchased_books pb JOIN books b ON pb.book_id = b.id WHERE pb.user_id = $1 ORDER BY pb.purchased_at DESC`, [req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: 'Database error' }); }
});

app.get('/library/episodes', verifyToken, async (req, res) => {
    try {
        const result = await query(`SELECT b.id, b.title, b.author, b.category, b.description, b.image, b.price, b.likes, MAX(ue.unlocked_at) as purchased_at
            FROM unlocked_episodes ue JOIN books b ON ue.book_id = b.id
            WHERE ue.user_id = $1 AND b.id NOT IN (SELECT book_id FROM purchased_books WHERE user_id = $1)
            GROUP BY b.id ORDER BY purchased_at DESC`, [req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: 'Database error' }); }
});

app.get('/history', verifyToken, async (req, res) => {
    try {
        const result = await query('SELECT id, title, type, price, purchased_at FROM purchase_history WHERE user_id = $1 ORDER BY purchased_at DESC', [req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

// 💰 Topup
app.post('/topup/request', verifyToken, uploadSlip.single('slip'), async (req, res) => {
    const { package_id, coins, bonus, total_coins, amount } = req.body;
    if (!package_id || !coins || !total_coins || !amount)
        return res.status(400).json({ message: "ข้อมูลไม่ครบถ้วน" });
    const slipPath = req.file ? req.file.path : null;
    try {
        const result = await query(
            `INSERT INTO topup_requests (user_id, package_id, coins, bonus, total_coins, amount, slip_image, status) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending') RETURNING id`,
            [req.user.id, package_id, parseInt(coins), parseInt(bonus) || 0, parseInt(total_coins), parseFloat(amount), slipPath]
        );
        const newRequestId = result.rows[0].id;
        const userRes = await query('SELECT username FROM users WHERE id = $1', [req.user.id]);
        const uname = userRes.rows[0] ? userRes.rows[0].username : `User #${req.user.id}`;
        await query(`INSERT INTO admin_notifications (type, title, message, ref_id) VALUES ($1,$2,$3,$4)`,
            ['topup_pending', 'คำขอเติมเหรียญใหม่', `${uname} ส่งสลิปเติมเหรียญ ฿${parseFloat(amount).toLocaleString()} (${parseInt(total_coins).toLocaleString()} เหรียญ)`, newRequestId]);
        res.status(201).json({ message: "ส่งคำขอเติมเหรียญสำเร็จ!", requestId: newRequestId, status: 'pending' });
    } catch (err) { res.status(500).json({ message: "Database error", error: err.message }); }
});

app.get('/topup/my-requests', verifyToken, async (req, res) => {
    try {
        const result = await query(`SELECT id, package_id, coins, bonus, total_coins, amount, slip_image, status, created_at, approved_at, note FROM topup_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`, [req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

app.get('/admin/topup-requests', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Admin only" });
    const status = req.query.status || 'pending';
    try {
        const result = await query(`SELECT tr.*, u.username, u.email FROM topup_requests tr JOIN users u ON tr.user_id = u.id WHERE tr.status = $1 ORDER BY tr.created_at DESC`, [status]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

app.put('/admin/topups/:id/approve', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
    try {
        const reqRes = await query(`SELECT * FROM topup_requests WHERE id = $1 AND status = 'pending'`, [req.params.id]);
        const request = reqRes.rows[0];
        if (!request) return res.status(404).json({ message: "ไม่พบคำขอ หรืออนุมัติไปแล้ว" });
        const totalCoins = request.total_coins || request.coins;
        await query(`UPDATE topup_requests SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by = $1 WHERE id = $2`, [req.user.id, req.params.id]);
        await query('UPDATE users SET coins = coins + $1 WHERE id = $2', [totalCoins, request.user_id]);
        await query(`INSERT INTO purchase_history (user_id, title, type, price) VALUES ($1,$2,'topup',0)`, [request.user_id, `เติมเหรียญ ${Number(totalCoins).toLocaleString()} เหรียญ (฿${request.amount})`]);
        await query(`INSERT INTO user_notifications (user_id, type, title, message, ref_id) VALUES ($1,'topup_approved',$2,$3,$4)`,
            [request.user_id, `เติมเหรียญสำเร็จ +${Number(totalCoins).toLocaleString()} เหรียญ`, `ชำระ ฿${request.amount} — รับ ${Number(totalCoins).toLocaleString()} เหรียญแล้ว`, req.params.id]);
        res.json({ message: "อนุมัติสำเร็จ ผู้ใช้ได้รับเหรียญแล้ว!" });
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

app.put('/admin/topups/:id/reject', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
    const { note } = req.body;
    const rejectNote = (note && note.trim()) ? note.trim() : 'ปฏิเสธโดยแอดมิน';
    try {
        const reqRes = await query(`SELECT * FROM topup_requests WHERE id = $1 AND status = 'pending'`, [req.params.id]);
        if (!reqRes.rows[0]) return res.status(404).json({ message: "ไม่พบคำขอ หรือถูกดำเนินการแล้ว" });
        const request = reqRes.rows[0];
        await query(`UPDATE topup_requests SET status='rejected', approved_at=CURRENT_TIMESTAMP, approved_by=$1, note=$2 WHERE id=$3`, [req.user.id, rejectNote, req.params.id]);
        await query(`INSERT INTO user_notifications (user_id, type, title, message, ref_id) VALUES ($1,'topup_rejected','คำขอเติมเหรียญถูกปฏิเสธ',$2,$3)`, [request.user_id, rejectNote, req.params.id]);
        res.json({ message: "ปฏิเสธคำขอแล้ว" });
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

// ❤️ Toggle Like
app.post('/toggle-like', async (req, res) => {
    const { bookId, isLiked } = req.body;
    try {
        await query(`UPDATE books SET likes = likes ${isLiked ? '+ 1' : '- 1'} WHERE id = $1`, [bookId]);
        const result = await query('SELECT likes FROM books WHERE id = $1', [bookId]);
        res.json({ success: true, likes: result.rows[0] ? result.rows[0].likes : 0 });
    } catch (err) { res.status(500).json({ success: false }); }
});

// QR Code
const promptpay = require('promptpay-qr');
const qrcode = require('qrcode');
app.get('/generate-qr', (req, res) => {
    const amount = parseFloat(req.query.amount);
    if (!amount || amount <= 0) return res.status(400).json({ message: "Invalid amount" });
    const mobileNumber = '0839947146';
    const payload = promptpay(mobileNumber, { amount });
    qrcode.toDataURL(payload, { color: { dark: '#00316d', light: '#ffffff' } }, (err, url) => {
        if (err) return res.status(500).json({ message: "QR Generation Error" });
        res.json({ qrImage: url });
    });
});

app.get('/topup-history', authenticateToken, async (req, res) => {
    try {
        const result = await query(`SELECT t.*, u.username FROM topup_requests t JOIN users u ON t.user_id = u.id WHERE t.user_id = $1 ORDER BY t.created_at DESC`, [req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json(err); }
});

// 📢 Posts
app.get('/posts', async (req, res) => {
    try {
        const posts = await query('SELECT * FROM posts ORDER BY created_at DESC');
        const result = [];
        for (const post of posts.rows) {
            const comments = await query(`SELECT c.*, u.username, u.image as profile_image FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = $1 ORDER BY c.created_at ASC`, [post.id]);
            const likes = await query(`SELECT COUNT(*) as count FROM post_likes WHERE post_id = $1 AND type = 'like'`, [post.id]);
            const dislikes = await query(`SELECT COUNT(*) as count FROM post_likes WHERE post_id = $1 AND type = 'dislike'`, [post.id]);
            result.push({ ...post, comments: comments.rows, likes: parseInt(likes.rows[0].count), dislikes: parseInt(dislikes.rows[0].count), userVote: null });
        }
        res.json(result);
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

app.post('/admin/add-post', verifyToken, uploadPost.single('image'), async (req, res) => {
    const { caption } = req.body;
    const imageUrl = req.file ? req.file.path : null;
    if (!caption && !imageUrl) return res.status(400).json({ message: "กรุณาใส่ข้อความหรือรูปภาพอย่างน้อยหนึ่งอย่าง" });
    try {
        const result = await query('INSERT INTO posts (caption, image_url) VALUES ($1, $2) RETURNING id', [caption, imageUrl]);
        res.status(201).json({ message: "เพิ่มโพสต์สำเร็จ!", postId: result.rows[0].id });
    } catch (err) { res.status(500).json({ error: "Database error" }); }
});

app.delete('/admin/delete-post/:id', verifyToken, async (req, res) => {
    try {
        const result = await query('SELECT image_url FROM posts WHERE id = $1', [req.params.id]);
        const row = result.rows[0];
        if (row && row.image_url && row.image_url.includes('cloudinary.com')) {
            const publicId = row.image_url.split('/').slice(-1)[0].split('.')[0];
            cloudinary.uploader.destroy(`eto-posts/${publicId}`).catch(() => {});
        }
        await query('DELETE FROM posts WHERE id = $1', [req.params.id]);
        res.json({ message: "ลบโพสต์สำเร็จ!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/posts/:postId/comments', verifyToken, async (req, res) => {
    try {
        const result = await query('INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *', [req.params.postId, req.user.id, req.body.content]);
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: "Database error" }); }
});

app.post('/posts/:postId/vote', verifyToken, async (req, res) => {
    const { type } = req.body;
    try {
        const existing = await query('SELECT * FROM post_likes WHERE post_id = $1 AND user_id = $2', [req.params.postId, req.user.id]);
        if (existing.rows[0]) {
            if (existing.rows[0].type === type) {
                await query('DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2', [req.params.postId, req.user.id]);
            } else {
                await query('UPDATE post_likes SET type = $1 WHERE post_id = $2 AND user_id = $3', [type, req.params.postId, req.user.id]);
            }
        } else {
            await query('INSERT INTO post_likes (post_id, user_id, type) VALUES ($1, $2, $3)', [req.params.postId, req.user.id, type]);
        }
        const likes = await query(`SELECT COUNT(*) as count FROM post_likes WHERE post_id = $1 AND type = 'like'`, [req.params.postId]);
        const dislikes = await query(`SELECT COUNT(*) as count FROM post_likes WHERE post_id = $1 AND type = 'dislike'`, [req.params.postId]);
        res.json({ likes: parseInt(likes.rows[0].count), dislikes: parseInt(dislikes.rows[0].count) });
    } catch (err) { res.status(500).json({ error: "Database error" }); }
});

// 📖 Reading History
app.post('/history/update', verifyToken, async (req, res) => {
    const { book_id, episode_number } = req.body;
    try {
        const existing = await query('SELECT max_episode_number FROM reading_history WHERE user_id = $1 AND book_id = $2', [req.user.id, book_id]);
        if (existing.rows[0]) {
            if (Number(episode_number) > Number(existing.rows[0].max_episode_number)) {
                await query('UPDATE reading_history SET max_episode_number = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND book_id = $3', [episode_number, req.user.id, book_id]);
                res.json({ message: "อัปเดตตอนที่อ่านไกลสุดเรียบร้อย", max_episode_number: episode_number });
            } else {
                await query('UPDATE reading_history SET updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND book_id = $2', [req.user.id, book_id]);
                res.json({ message: "อัปเดตเวลาอ่านล่าสุด", max_episode_number: existing.rows[0].max_episode_number });
            }
        } else {
            await query('INSERT INTO reading_history (user_id, book_id, max_episode_number) VALUES ($1, $2, $3)', [req.user.id, book_id, episode_number]);
            res.json({ message: "สร้างประวัติการอ่านใหม่", max_episode_number: episode_number });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/history/:bookId', verifyToken, async (req, res) => {
    try {
        const result = await query('SELECT max_episode_number FROM reading_history WHERE user_id = $1 AND book_id = $2', [req.user.id, req.params.bookId]);
        res.json({ max_episode_number: result.rows[0] ? result.rows[0].max_episode_number : 0 });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 🔔 Notifications
app.get('/notifications/new-chapters', verifyToken, async (req, res) => {
    try {
        const result = await query(`
            SELECT e.id as episode_id, e.book_id, e.episode_number, e.title as episode_title, e.created_at, b.title as book_title
            FROM episodes e JOIN books b ON e.book_id = b.id
            WHERE e.book_id IN (
                SELECT book_id FROM favorites WHERE user_id = $1
                UNION SELECT book_id FROM history WHERE user_id = $1 AND type = 'book'
            ) ORDER BY e.created_at DESC LIMIT 20
        `, [req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: 'Database error' }); }
});

app.post('/notifications/new-chapters/seen', verifyToken, async (req, res) => {
    const { episodeIds } = req.body;
    if (!Array.isArray(episodeIds) || episodeIds.length === 0)
        return res.status(400).json({ message: 'episodeIds ต้องเป็น array และต้องไม่ว่างเปล่า' });
    try {
        for (const id of episodeIds) {
            await query('INSERT INTO seen_chapter_notifs (user_id, episode_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, id]);
        }
        res.json({ message: 'บันทึกสถานะแจ้งเตือนเรียบร้อย', marked: episodeIds.length });
    } catch (err) { res.status(500).json({ message: 'Database error' }); }
});

app.get('/user/notifications', verifyToken, async (req, res) => {
    try {
        const result = await query(`SELECT un.*, CASE WHEN un.type IN ('new_episode','episode_updated') THEN e.book_id ELSE NULL END as book_id
            FROM user_notifications un LEFT JOIN episodes e ON un.type IN ('new_episode','episode_updated') AND e.id = un.ref_id
            WHERE un.user_id = $1 ORDER BY un.created_at DESC LIMIT 50`, [req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

app.put('/user/notifications/read-all', verifyToken, async (req, res) => {
    try {
        await query('UPDATE user_notifications SET is_read = 1 WHERE user_id = $1', [req.user.id]);
        res.json({ message: "อ่านทั้งหมดแล้ว" });
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

app.put('/user/notifications/:id/read', verifyToken, async (req, res) => {
    try {
        await query('UPDATE user_notifications SET is_read = 1 WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ message: "อ่านแล้ว" });
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

app.get('/admin/notifications', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
    try {
        const result = await query('SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 50');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

app.put('/admin/notifications/read-all', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
    try {
        await query('UPDATE admin_notifications SET is_read = 1');
        res.json({ message: "อ่านทั้งหมดแล้ว" });
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

app.put('/admin/notifications/:id/read', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
    try {
        await query('UPDATE admin_notifications SET is_read = 1 WHERE id = $1', [req.params.id]);
        res.json({ message: "อ่านแล้ว" });
    } catch (err) { res.status(500).json({ message: "Database error" }); }
});

// ================= START SERVER =================
initDb().then(() => {
    server.listen(port, () => console.log(`🚀 Server is running on port ${port}`));
}).catch(err => {
    console.error('❌ Failed to init DB:', err);
    process.exit(1);
});