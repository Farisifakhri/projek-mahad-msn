// server.js - Versi Refactor (API-Only)

const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcrypt');
const cors = require('cors'); // <-- PENTING untuk komunikasi frontend-backend
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = 3000;

// === MIDDLEWARE ===
app.use(cors()); // Izinkan semua request dari domain/protokol lain
app.use(express.json()); // Untuk membaca body request dalam format JSON
app.use(express.urlencoded({ extended: true })); // Untuk membaca body dari form-data
// Sajikan folder 'uploads' secara statis agar gambar bisa diakses dari frontend
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// === KONFIGURASI DATABASE ===
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'msn',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
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
const upload = multer({ storage: storage });


// ===================================
// ===         API ENDPOINTS         ===
// ===================================

// --- API OTENTIKASI & USER ---

// Endpoint Register
app.post('/api/register', async (req, res) => {
    const { username, email, password, fullName, nim, phone, parentPhone, faculty, major, dob, role } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        await db.execute(
            'INSERT INTO users (username, email, password, fullName, nim, phone, parentPhone, faculty, major, dob, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, fullName, nim, phone, parentPhone, faculty, major, dob, role || 'mahasantri']
        );
        res.status(201).json({ success: true, message: 'Registrasi berhasil!' });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Gagal melakukan registrasi, mungkin username atau email sudah ada.' });
    }
});

// Endpoint Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await db.execute('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Username atau password salah.' });
        }
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Username atau password salah.' });
        }
        const { password: _, ...userWithoutPassword } = user; // Hapus password dari response
        res.json({ success: true, message: 'Login berhasil!', user: userWithoutPassword });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
    }
});

// Endpoint Upload Foto Profil
app.post('/api/profile/picture', upload.single('profileImage'), async (req, res) => {
    const { userId } = req.body;
    if (!req.file || !userId) {
        return res.status(400).json({ success: false, message: 'Informasi tidak lengkap.' });
    }
    const profilePicUrl = req.file.path.replace(/\\/g, "/"); // Ganti backslash dengan slash
    try {
        await db.execute('UPDATE users SET profilePicUrl = ? WHERE id = ?', [profilePicUrl, userId]);
        res.json({ success: true, message: 'Foto profil diperbarui.', profilePicUrl });
    } catch (error) {
        console.error('Update profile picture error:', error);
        res.status(500).json({ success: false, message: 'Gagal memperbarui database.' });
    }
});


// --- API ABSENSI ---

// Endpoint untuk mendapatkan semua mahasantri
// Endpoint untuk mengupdate data pengguna
app.put('/api/user/:id', async (req, res) => {
    const { id } = req.params;
    // Ambil hanya data yang boleh diubah dari body request
    const { fullName, dob, phone, parentPhone, faculty, major } = req.body;

    // Validasi sederhana
    if (!fullName || !phone) {
        return res.status(400).json({ success: false, message: 'Nama dan No. Telepon wajib diisi.' });
    }

    try {
        const query = `
            UPDATE users 
            SET fullName = ?, dob = ?, phone = ?, parentPhone = ?, faculty = ?, major = ? 
            WHERE id = ?
        `;
        await db.execute(query, [fullName, dob, phone, parentPhone, faculty, major, id]);

        res.json({ success: true, message: 'Profil berhasil diperbarui!' });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, message: 'Gagal memperbarui profil di database.' });
    }
});

// Endpoint untuk menyimpan data absensi
app.post('/api/attendance', async (req, res) => {
    const { date, type, attendanceData } = req.body; // attendanceData = { nim1: 'Hadir', nim2: 'Sakit', ... }

    if (!date || !type || !attendanceData) {
        return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });
    }

    try {
        const [users] = await db.execute('SELECT id, nim FROM users');
        const userMap = users.reduce((map, user) => {
            map[user.nim] = user.id;
            return map;
        }, {});

        const values = Object.entries(attendanceData).map(([nim, status]) => {
            const userId = userMap[nim];
            if (!userId) return null; // Abaikan jika nim tidak ditemukan
            return [userId, date, type, status];
        }).filter(v => v !== null); // Filter data yang tidak valid

        if (values.length === 0) {
            return res.status(400).json({ success: false, message: 'Tidak ada data valid untuk disimpan.' });
        }

        // Query untuk INSERT atau UPDATE jika data sudah ada (berdasarkan UNIQUE key)
        const query = 'INSERT INTO attendance (user_id, attendance_date, attendance_type, status) VALUES ? ON DUPLICATE KEY UPDATE status = VALUES(status)';
        
        await db.query(query, [values]);
        res.status(201).json({ success: true, message: 'Absensi berhasil disimpan!' });

    } catch (error) {
        console.error('Save attendance error:', error);
        res.status(500).json({ success: false, message: 'Gagal menyimpan absensi ke database.' });
    }
});

// Endpoint untuk mengambil rekap absensi harian seorang user
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
app.listen(PORT, () => {
  console.log(`API Server berjalan di http://localhost:${PORT}`);
});