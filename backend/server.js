// server.js - Versi Final Siap Deployment

const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

const app = express();

// === MIDDLEWARE ===
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// === KONFIGURASI DATABASE DARI ENVIRONMENT VARIABLES ===
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Opsi SSL seringkali diperlukan untuk koneksi aman ke database cloud seperti Render
  ssl: {
      rejectUnauthorized: true
  }
});

// === KONFIGURASI UPLOAD FILE (MULTER) ===
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/profile_pictures/';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const userId = req.body.userId || 'unknown';
        const fileExtension = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `user-${userId}-${uniqueSuffix}${fileExtension}`);
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ===================================
// ===         API ENDPOINTS         ===
// ===================================

// --- API OTENTIKASI & USER ---
app.post('/api/register', async (req, res) => {
    const { username, email, password, fullName, nim, phone, parentPhone, faculty, major, dob, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.execute(
            'INSERT INTO users (username, email, password, fullName, nim, phone, parentPhone, faculty, major, dob, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, fullName, nim, phone, parentPhone, faculty, major, dob, role || 'mahasantri']
        );
        res.status(201).json({ success: true, message: 'Registrasi berhasil!' });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Gagal melakukan registrasi.' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await db.execute('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);
        if (users.length === 0) return res.status(401).json({ success: false, message: 'Username atau password salah.' });
        
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Username atau password salah.' });
        
        const { password: _, ...userWithoutPassword } = user;
        res.json({ success: true, message: 'Login berhasil!', user: userWithoutPassword });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
    }
});

app.get('/api/user/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
        if (users.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
        const { password, ...userWithoutPassword } = users[0];
        res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
        console.error('Fetch user error:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil data pengguna.' });
    }
});

app.put('/api/user/:id', async (req, res) => {
    const { id } = req.params;
    const { fullName, dob, phone, parentPhone, faculty, major } = req.body;
    try {
        await db.execute(
            'UPDATE users SET fullName = ?, dob = ?, phone = ?, parentPhone = ?, faculty = ?, major = ? WHERE id = ?',
            [fullName, dob, phone, parentPhone, faculty, major, id]
        );
        res.json({ success: true, message: 'Profil berhasil diperbarui!' });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, message: 'Gagal memperbarui profil.' });
    }
});

app.post('/api/profile/picture', upload.single('profileImage'), async (req, res) => {
    const { userId } = req.body;
    if (!req.file || !userId) return res.status(400).json({ success: false, message: 'Informasi tidak lengkap.' });
    
    const profilePicUrl = req.file.path;
    try {
        await db.execute('UPDATE users SET profilePicUrl = ? WHERE id = ?', [profilePicUrl, userId]);
        res.json({ success: true, message: 'Foto profil diperbarui.', profilePicUrl });
    } catch (error) {
        console.error('Update profile picture error:', error);
        res.status(500).json({ success: false, message: 'Gagal memperbarui database.' });
    }
});

// --- API ABSENSI ---
app.get('/api/users/mahasantri', async (req, res) => {
    try {
        const [mahasantri] = await db.execute("SELECT id, nim, fullName FROM users WHERE role = 'mahasantri'");
        res.json(mahasantri);
    } catch (error) {
        console.error('Fetch mahasantri error:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil data mahasantri.' });
    }
});

app.post('/api/attendance', async (req, res) => {
    const { date, type, attendanceData } = req.body;
    try {
        const [users] = await db.execute('SELECT id, nim FROM users');
        const userMap = users.reduce((map, user) => { map[user.nim] = user.id; return map; }, {});
        const values = Object.entries(attendanceData).map(([nim, status]) => {
            const userId = userMap[nim];
            return userId ? [userId, date, type, status] : null;
        }).filter(v => v !== null);

        if (values.length === 0) return res.status(400).json({ success: false, message: 'Tidak ada data valid untuk disimpan.' });

        const query = 'INSERT INTO attendance (user_id, attendance_date, attendance_type, status) VALUES ? ON DUPLICATE KEY UPDATE status = VALUES(status)';
        await db.query(query, [values]);
        res.status(201).json({ success: true, message: 'Absensi berhasil disimpan!' });
    } catch (error) {
        console.error('Save attendance error:', error);
        res.status(500).json({ success: false, message: 'Gagal menyimpan absensi.' });
    }
});

app.get('/api/attendance/recap/:userId/:date', async (req, res) => {
    const { userId, date } = req.params;
    try {
        const query = 'SELECT attendance_type, status FROM attendance WHERE user_id = ? AND attendance_date = ?';
        const [recap] = await db.execute(query, [userId, date]);
        res.json(recap);
    } catch (error) {
        console.error('Fetch recap error:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil data rekap.' });
    }
});


// === START SERVER ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Server berjalan di port ${PORT}`);
});