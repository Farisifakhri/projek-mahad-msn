// server.js - Versi Final Siap Deployment Cloud

const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
// DIHAPUS: const fs = require('fs'); // Tidak lagi diperlukan untuk menyimpan file lokal

// BARU: Import library untuk integrasi Cloudinary
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

const app = express();

// === MIDDLEWARE ===
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// DIHAPUS: app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Tidak lagi menyajikan file dari server lokal

// === KONFIGURASI DATABASE DARI ENVIRONMENT VARIABLES ===
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT, // WAJIB ADA untuk koneksi ke Railway
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        // WAJIB DIAKTIFKAN untuk koneksi ke Railway
        rejectUnauthorized: false 
    }
});

// === BARU: KONFIGURASI CLOUDINARY ===
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// === DIUBAH: KONFIGURASI UPLOAD FILE MENGGUNAKAN CLOUDINARY ===
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'projek-mahad-msn/profile_pictures', // Nama folder di Cloudinary
        allowed_formats: ['jpg', 'png', 'jpeg'],
        // Transformasi bisa ditambahkan di sini, contoh: resize gambar saat upload
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
    },
});

const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5 MB limit

// ===================================
// ===         API ENDPOINTS         ===
// ===================================

// --- API OTENTIKASI & USER ---
// ... (Kode untuk /api/register, /api/login, /api/user/:id, /api/user/:id tidak berubah, sudah bagus)
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
        res.status(500).json({ success: false, message: 'Gagal melakukan registrasi.', error: error.message });
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
        res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.', error: error.message });
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
        res.status(500).json({ success: false, message: 'Gagal mengambil data pengguna.', error: error.message });
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
        res.status(500).json({ success: false, message: 'Gagal memperbarui profil.', error: error.message });
    }
});


// === DIUBAH: Endpoint upload gambar sekarang menggunakan URL dari Cloudinary ===
app.post('/api/profile/picture', upload.single('profileImage'), async (req, res) => {
    const { userId } = req.body;
    // req.file.path sekarang berisi URL aman dari Cloudinary
    if (!req.file || !userId) {
        return res.status(400).json({ success: false, message: 'File gambar dan User ID diperlukan.' });
    }

    // URL gambar dari Cloudinary
    const profilePicUrl = req.file.path; 
    
    try {
        await db.execute('UPDATE users SET profilePicUrl = ? WHERE id = ?', [profilePicUrl, userId]);
        res.json({ success: true, message: 'Foto profil diperbarui.', profilePicUrl: profilePicUrl });
    } catch (error) {
        console.error('Update profile picture error:', error);
        res.status(500).json({ success: false, message: 'Gagal memperbarui database.', error: error.message });
    }
});


// --- API ABSENSI ---
// ... (Kode untuk API Absensi tidak berubah, sudah bagus)
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
        res.status(500).json({ success: false, message: 'Gagal menyimpan absensi.', error: error.message });
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
        res.status(500).json({ success: false, message: 'Gagal mengambil data rekap.', error: error.message });
    }
});

// === START SERVER ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API Server berjalan di port ${PORT}`);
});
