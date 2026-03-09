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
app.use(express.json());

const db = new sqlite3.Database('./users.db', (err) => {

    if (err){
        console.error(err.message);
    }
    console.log('connect to the users database.', err);

});

db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
)`)
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
        const token = jwt.sign({ id: user.id , username: user.username}, secret, { expiresIn: '1h' });
        res.json({ message: 'Login successful', token });
    })
});
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
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