// server.js - Versi Final Siap Deployment Cloud (Sudah Diperbaiki dan Disempurnakan)

const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

const app = express();

// === MIDDLEWARE ===
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === KONFIGURASI DATABASE DARI ENVIRONMENT VARIABLES ===
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: { rejectUnauthorized: false }
});

// === KONFIGURASI CLOUDINARY ===
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'projek-mahad-msn/profile_pictures',
        allowed_formats: ['jpg', 'png', 'jpeg'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// === ENDPOINTS ===

// --- Register ---
app.post('/api/register', async (req, res) => {
    const { username, email, password, fullName, nim, phone, parentPhone, faculty, major, dob, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.execute(
            `INSERT INTO users (username, email, password, fullName, nim, phone, parentPhone, faculty, major, dob, role)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [username, email, hashedPassword, fullName, nim, phone, parentPhone, faculty, major, dob, role || 'mahasantri']
        );
        res.status(201).json({ success: true, message: 'Registrasi berhasil!' });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Gagal registrasi.', error: error.message });
    }
});

// --- Login ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username dan password wajib diisi." });
    }
    try {
        const [users] = await db.execute(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, username]
        );

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: "User tidak ditemukan." });
        }

        const user = users[0];

        if (!user.password || typeof user.password !== 'string') {
            console.error('User ditemukan tapi kolom password tidak valid:', user);
            return res.status(500).json({ success: false, message: "Password tidak valid." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Password salah." });
        }

        const { password: _, ...userWithoutPassword } = user;
        res.json({ success: true, message: "Login berhasil!", user: userWithoutPassword });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Kesalahan server saat login.", error: error.message });
    }
});

// --- Get User ---
app.get('/api/user/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
        if (users.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
        const { password, ...userWithoutPassword } = users[0];
        res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
        console.error('Fetch user error:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil user.', error: error.message });
    }
});

// --- Update User ---
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
        res.status(500).json({ success: false, message: 'Gagal update profil.', error: error.message });
    }
});

// --- Upload Profile Picture ---
app.post('/api/profile/picture', upload.single('profileImage'), async (req, res) => {
    const { userId } = req.body;
    if (!req.file || !userId) {
        return res.status(400).json({ success: false, message: 'File dan userId wajib diisi.' });
    }
    const profilePicUrl = req.file.path;
    try {
        await db.execute('UPDATE users SET profilePicUrl = ? WHERE id = ?', [profilePicUrl, userId]);
        res.json({ success: true, message: 'Foto profil diperbarui.', profilePicUrl });
    } catch (error) {
        console.error('Update profile pic error:', error);
        res.status(500).json({ success: false, message: 'Gagal update foto profil.', error: error.message });
    }
});

// --- Absensi ---
app.get('/api/users/mahasantri', async (req, res) => {
    try {
        const [mahasantri] = await db.execute("SELECT id, nim, fullName FROM users WHERE role = 'mahasantri'");
        res.json(mahasantri);
    } catch (error) {
        console.error('Fetch mahasantri error:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil data mahasantri.', error: error.message });
    }
});

app.post('/api/attendance', async (req, res) => {
    const { date, type, attendanceData } = req.body;
    try {
        const [users] = await db.execute('SELECT id, nim FROM users');
        const userMap = users.reduce((map, user) => {
            map[user.nim] = user.id;
            return map;
        }, {});

        const values = Object.entries(attendanceData)
            .map(([nim, status]) => userMap[nim] ? [userMap[nim], date, type, status] : null)
            .filter(Boolean);

        if (values.length === 0) {
            return res.status(400).json({ success: false, message: 'Tidak ada data valid untuk disimpan.' });
        }

        await db.query(
            'INSERT INTO attendance (user_id, attendance_date, attendance_type, status) VALUES ? ON DUPLICATE KEY UPDATE status = VALUES(status)',
            [values]
        );

        res.status(201).json({ success: true, message: 'Absensi berhasil disimpan!' });
    } catch (error) {
        console.error('Save attendance error:', error);
        res.status(500).json({ success: false, message: 'Gagal menyimpan absensi.', error: error.message });
    }
});

app.get('/api/attendance/recap/:userId/:date', async (req, res) => {
    const { userId, date } = req.params;
    try {
        const [recap] = await db.execute(
            'SELECT attendance_type, status FROM attendance WHERE user_id = ? AND attendance_date = ?',
            [userId, date]
        );
        res.json(recap);
    } catch (error) {
        console.error('Fetch recap error:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil rekap absensi.', error: error.message });
    }
});

// --- Start Server ---
const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on ${port}`);
});