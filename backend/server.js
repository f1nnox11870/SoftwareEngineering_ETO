const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = 3001
const JWT_SECRET = process.env.JWT_SECRET

app.use(cors());
app.use(express.json({ limit: '50mb' })); // เพิ่มบรรทัดนี้
app.use(express.urlencoded({ limit: '50mb', extended: true }));
const db = new sqlite3.Database('./users.db', (err) => {

    if (err){
        console.error(err.message);
    }
    console.log('connect to the users database.', err);

});
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
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user'
)`, async (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Users table ready');

        // 🔥 เรียกตรงนี้แทน
        await createAdmin();
    }
});
// สร้าง admin
const createAdmin = async () => {
    const username = 'admin123';
    const password = '11111111';

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
        `INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`,
        [username, hashedPassword, 'admin'],
        function (err) {
            if (err) console.error(err.message);
            else console.log('✅ Admin ready');
        }
    );
};

createAdmin();

//middleware for verify JWT เพิ่มใฟม่
function verifyToken(req, res, next) {

    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(403).json({ message: "Token required" });
    }

    const token = authHeader.split(' ')[1];
    const secret = JWT_SECRET || "your_fallback_secret";

    jwt.verify(token, secret, (err, user) => {

        if (err) {
            return res.status(403).json({ message: "Invalid token" });
        }

        req.user = user;
        next();
    });
}

//API EndPoint

//Register ENDPOINT

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
    db.run(sql, [username, hashedPassword], function (err) {
        if (err) {
            if(err.errno === 19) {
                return res.status(409).json({ message: 'Username already exists' });
            }
            return res.status(500).json({ message: 'Database error' });
        }

        res.status(201).json({ message: 'User registered successfully',userId: this.lastID });
    })
});
// login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';

    db.get(sql, [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ message: 'Sever error' });
        }
        if (!user) {
            return res.status(404).json({ message: 'user not found' });
        }

        const isMatch = await bcrypt.compare(password,user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const secret = JWT_SECRET || 'your_fallback_secret';
        const token = jwt.sign({ id: user.id , username: user.username , role: user.role }, secret, { expiresIn: '1h' });
        res.json({ message: 'Login successful', token });
    })
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
//insery content
app.post('/admin/add-book', verifyToken, (req, res) => {
    // 1. รับค่า price มาจาก React
    const { title, author, category, description, image, price } = req.body; 

    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Admin only" });
    }

    // 2. เพิ่ม price เข้าไปในคำสั่ง SQL
    const sql = `INSERT INTO books (title, author, category, description, image, price, likes) 
                 VALUES (?, ?, ?, ?, ?, ?, 0)`;
    
    // 3. แนบตัวแปร price ไปด้วย (ถ้าไม่ได้กรอกมาให้เป็น 0)
    db.run(sql, [title, author, category, description, image, price || 0], function(err) {
        if (err) {
            console.error("Database error:", err.message); // จะช่วยปริ้นท์บอกใน Terminal ว่า DB พังเพราะอะไร
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.status(201).json({ 
            message: 'Book added successfully', 
            bookId: this.lastID 
        });
    });
});
// Profile Endpoint
app.get('/profile', verifyToken, (req, res) => {

    const userId = req.user.id;

    const sql = "SELECT id, username FROM users WHERE id = ?";

    db.get(sql, [userId], (err, user) => {
        if (err) {
            return res.status(500).json({ message: "Database error" });
        }

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            id: user.id,
            username: user.username
        });
    });
});
// API สำหรับดึงหนังสือทั้งหมด (ใช้ใน Home.jsx)
app.get('/books', (req, res) => {
    const sql = `SELECT * FROM books ORDER BY created_at DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(rows); // ส่งข้อมูลหนังสือทั้งหมดกลับไปให้ Front-end
    });
});