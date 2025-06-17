// homePage.js - KODE LENGKAP DENGAN DASHBOARD DINAMIS

document.addEventListener('DOMContentLoaded', function() {
    // --- Autentikasi dan Inisialisasi Awal ---
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = user.role || localStorage.getItem('role');

    if (!role) {
        window.location.href = '/frontend/auth.html'; // Path diperbaiki
        return;
    }

    const profileNameElement = document.getElementById('profile-name');
    const profilePicElement = document.getElementById('profile-pic');
    const portalTitleElement = document.querySelector('.logo-container .portal-title');
    const heroContentH1 = document.querySelector('.hero-section .hero-content h1');
    const heroContentP = document.querySelector('.hero-section .hero-content p');
    const mainMenuContainer = document.getElementById('main-menu');

    // --- Update Info Header Pengguna ---
    if (profileNameElement) profileNameElement.textContent = user.fullName || 'Pengguna';
    if (profilePicElement) profilePicElement.src = user.profilePicUrl || '/frontend/assets/images/default-profile.png';
    if (portalTitleElement) portalTitleElement.textContent = role === 'mudabbir' ? 'Dashboard Mudabbir' : 'Portal Mahasantri';

    // --- Definisi Menu ---
    const menu_mudabbir = [
        { href: '/frontend/homePage.html', label: 'Beranda' },
        { href: '/frontend/profile.html', label: 'Profil' },
        { href: '#', label: 'Logout', id: 'logout-btn' }
    ];

    const menu_mahasantri = [
        { href: '#beranda', label: 'Beranda', isScroll: true },
        { href: '/frontend/profile.html', label: 'Profil Lengkap' },
        { href: '#kontak', label: 'Hubungi Kami', isScroll: true },
        { href: '#', label: 'Logout', id: 'logout-btn' }
    ];
    const menuList = role === 'mudabbir' ? menu_mudabbir : menu_mahasantri;

    // --- Render Menu ---
    if (mainMenuContainer) {
        let menuHTML = '<ul class="main-menu-list">';
        menuList.forEach(item => {
            menuHTML += `<li><a href="${item.href}" id="${item.id || ''}" class="${item.isScroll ? 'scroll-to-section' : ''}">${item.label}</a></li>`;
        });
        menuHTML += '</ul>';
        mainMenuContainer.innerHTML = menuHTML;
    }

    // --- Fungsi Render Konten Dinamis ---
    const generateKonten = {
        mudabbir: () => `
            <section class="section">
                <h2 class="text-center">Panel Kontrol Utama</h2>
                <div class="button-grid">
                    <a href="/frontend/absensi_mahasantri.html" class="action-button"><i class="fas fa-users"></i>Absensi Mahasantri</a>
                    <a href="#" class="action-button"><i class="fas fa-exclamation-triangle"></i>Rekap Pelanggaran</a>
                </div>
            </section>
        `,
        mahasantri: async () => {
            let rekapAbsensiHTML = `<p>Memuat rekap absensi...</p>`;
            try {
                const today = new Date().toISOString().slice(0, 10);
                const response = await fetch(`http://localhost:3000/api/attendance/recap/${user.id}/${today}`);
                const recapData = await response.json();

                if (recapData.length > 0) {
                    rekapAbsensiHTML = '<ul>';
                    recapData.forEach(item => {
                        let activityName = item.attendance_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        rekapAbsensiHTML += `<li>${activityName}: <strong>${item.status}</strong></li>`;
                    });
                    rekapAbsensiHTML += '</ul>';
                } else {
                    rekapAbsensiHTML = '<p>Belum ada rekap absensi untuk hari ini.</p>';
                }
            } catch (error) {
                console.error("Gagal memuat rekap absensi:", error);
                rekapAbsensiHTML = '<p style="color: #F44336;">Gagal memuat rekap absensi.</p>';
            }
            
            const jadwal = `<ul><li><span class="time">04.30</span> Salat Subuh & Tahfidz</li><li><span class="time">07.00</span> Morning Class</li></ul>`;
            return `
                <section class="section" id="rekap-performa"><h2 class="text-center">Rekap Hari Ini</h2><div class="row"><div class="col-lg-6"><div class="insight-terbaik card"><h3><i class="fas fa-user-check"></i> Rekap Absensi</h3>${rekapAbsensiHTML}</div></div><div class="col-lg-6"><div class="schedule-item h-100"><h3>Jadwal Harian</h3>${jadwal}</div></div></div></section>
                <section class="section" id="kontak"><h2 class="text-center">Hubungi Pengurus</h2><p class="text-center">Gunakan kontak di footer halaman.</p></section>
            `;
        }
    };
    
    // --- Render Konten Utama ---
    const mainContainer = document.querySelector('.container');
    if (mainContainer) {
        if (role === 'mudabbir') {
            if (heroContentH1) heroContentH1.textContent = 'Dashboard Mudabbir';
            if (heroContentP) heroContentP.textContent = `Selamat datang, ${user.fullName || 'Mudabbir'}.`;
            mainContainer.innerHTML = generateKonten.mudabbir();
        } else {
            if (heroContentH1) heroContentH1.textContent = `Assalamu'alaikum, ${user.fullName || 'Mahasantri'}!`;
            if (heroContentP) heroContentP.textContent = `Manfaatkan fitur di bawah ini untuk mendukung kegiatan Anda.`;
            generateKonten.mahasantri().then(html => mainContainer.innerHTML = html);
        }
    }
    
    // --- Event Listeners ---
    document.body.addEventListener('click', function(e) {
        if (e.target.matches('#logout-btn')) {
            e.preventDefault();
            localStorage.clear();
            window.location.href = '/frontend/auth.html';
        }
        if (e.target.matches('.scroll-to-section')) {
            e.preventDefault();
            const targetId = e.target.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                window.scrollTo({ top: targetElement.offsetTop - 100, behavior: 'smooth' });
            } else if (targetId === 'beranda') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    });
});