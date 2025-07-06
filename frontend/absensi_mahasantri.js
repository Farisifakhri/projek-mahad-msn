const apiUrl = 'https://projek-mahad-msn-production.up.railway.app';

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Cek jika bukan mudabbir (untuk proteksi sederhana)
    if (user.role !== 'mudabbir') {
        // alert('Akses ditolak. Halaman ini khusus untuk Mudabbir.');
        // window.location.href = 'homePage.html'; 
    }

    // Ambil elemen-elemen dari DOM
    const profileNameElement = document.getElementById('profile-name');
    const profilePicElement = document.getElementById('profile-pic');
    const mainMenuContainer = document.getElementById('main-menu');
    const mahasantriListBody = document.getElementById('mahasantri-list-body');
    const saveBtn = document.getElementById('save-attendance-btn');
    const dateInput = document.getElementById('attendance-date');
    const typeInput = document.getElementById('attendance-type');

    // Atur info header
    if (profileNameElement) profileNameElement.textContent = user.fullName || 'Mudabbir';
    if (profilePicElement) profilePicElement.src = user.profilePicUrl || 'assets/images/default-profile.png';
    
    // Set tanggal hari ini sebagai default
    if(dateInput) dateInput.valueAsDate = new Date();

    // Render Menu Dinamis untuk Mudabbir
    const menu_mudabbir = [
        { href: 'homePage.html', label: 'Beranda' },
        { href: 'profile.html', label: 'Profil' },
        { href: 'auth.html', label: 'Logout', id: 'logout-btn' }
    ];

    if (mainMenuContainer) {
        let menuHTML = '<ul class="main-menu-list">';
        menu_mudabbir.forEach(item => {
            const idAttr = item.id ? `id="${item.id}"` : '';
            menuHTML += `<li><a href="${item.href}" ${idAttr}>${item.label}</a></li>`;
        });
        menuHTML += '</ul>';
        mainMenuContainer.innerHTML = menuHTML;
    }
    
    // ===FUNGSI UTAMA===

    /**
     * Mengambil daftar mahasantri dari backend dan menampilkannya di tabel
     */
    async function fetchAndDisplayMahasantri() {
        try {
            const response = await fetch(`${apiUrl}/api/users/mahasantri`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const mahasantriList = await response.json();

            mahasantriListBody.innerHTML = ''; // Kosongkan pesan "Memuat data..."

            if (mahasantriList.length === 0) {
                mahasantriListBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Tidak ada data mahasantri ditemukan.</td></tr>';
                return;
            }

            mahasantriList.forEach((mhs, index) => {
                const row = document.createElement('tr');
                row.setAttribute('data-nim', mhs.nim); // Simpan NIM untuk referensi
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${mhs.fullName}</td>
                    <td>${mhs.nim}</td>
                    <td>
                        <div class="status-radios">
                            <label><input type="radio" name="status_${mhs.nim}" value="Hadir" checked> Hadir</label>
                            <label><input type="radio" name="status_${mhs.nim}" value="Sakit"> Sakit</label>
                            <label><input type="radio" name="status_${mhs.nim}" value="Izin"> Izin</label>
                            <label><input type="radio" name="status_${mhs.nim}" value="Alfa"> Alfa</label>
                        </div>
                    </td>
                `;
                mahasantriListBody.appendChild(row);
            });

        } catch (error) {
            console.error("Gagal mengambil data mahasantri:", error);
            mahasantriListBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: #F44336;">Gagal memuat data. Pastikan server backend berjalan.</td></tr>`;
        }
    }

    /**
     * Mengirim data absensi yang sudah diisi ke backend
     */
    async function saveAttendance() {
        const attendancePayload = {
            date: dateInput.value,
            type: typeInput.value,
            attendanceData: {}
        };

        if (!attendancePayload.date) {
            alert('Silakan pilih tanggal absensi terlebih dahulu.');
            return;
        }

        const rows = mahasantriListBody.querySelectorAll('tr');
        rows.forEach(row => {
            const nim = row.dataset.nim;
            if (nim) { // Pastikan baris ini adalah baris data
                const selectedStatusInput = row.querySelector(`input[name="status_${nim}"]:checked`);
                attendancePayload.attendanceData[nim] = selectedStatusInput.value;
            }
        });

        try {
            const response = await fetch('http://localhost:3000/api/attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(attendancePayload)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Gagal menyimpan absensi');
            }
            
            alert(result.message);

        } catch (error) {
            console.error("Error saat menyimpan absensi:", error);
            alert("Terjadi kesalahan: " + error.message);
        }
    }

    // ===EVENT LISTENERS===
    
    // Panggil fungsi untuk memuat daftar mahasantri saat halaman siap
    fetchAndDisplayMahasantri();

    // Tambahkan event listener ke tombol simpan
    if(saveBtn) {
        saveBtn.addEventListener('click', saveAttendance);
    }

    // Fungsionalitas Logout
    const logoutButton = document.getElementById('logout-btn');
    if(logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'frontend/auth.html'; // Arahkan ke halaman login
        });
    };