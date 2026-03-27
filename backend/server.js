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

// 👤 users table
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user',
    image TEXT
    
)`, async (err) => {
    if (err) {
        console.error(err.message);
    } else {
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

// สร้าง admin
const createAdmin = async () => {
    const username = 'admin123';
    const password = '11111111';
    const email = 'admin@example.com';
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
        `INSERT OR IGNORE INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`,
        [username, email, hashedPassword, 'admin'],
        function (err) {
            if (err) console.error(err.message);
            else console.log('✅ Admin ready');
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
    const { bookId } = req.body;

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

// 👤 Get Profile
app.get('/profile', verifyToken, (req, res) => {
    const userId = req.user.id;
    const sql = "SELECT id, username, email, image FROM users WHERE id = ?";

    db.get(sql, [userId], (err, user) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            image: user.image || null
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

// ================= START SERVER =================
app.listen(port, () => {
    console.log(`🚀 Server is running on http://localhost:${port}`);
});