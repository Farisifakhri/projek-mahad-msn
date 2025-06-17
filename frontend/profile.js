// profile.js - VERSI FINAL dengan alur upload yang aman

document.addEventListener('DOMContentLoaded', async () => {
    // --- Autentikasi & Ambil data user dari localStorage ---
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) {
        window.location.href = '/frontend/auth.html';
        return;
    }

    // --- Seleksi Elemen DOM ---
    const profileForm = document.getElementById('profileForm');
    const editBtn = document.getElementById('editProfileBtn');
    const saveBtn = document.getElementById('saveProfileBtn');
    const uploadPicInput = document.getElementById('upload-pic');
    const allInputs = profileForm.querySelectorAll('input');

    let isEditMode = false;

    // --- Fungsi untuk mengisi data ke semua elemen di halaman ---
    function populateProfileData(userData) {
        const serverUrl = 'http://localhost:3000';
        const defaultProfilePic = '/frontend/assets/images/default-profile.png';
        
        const profilePicUrl = userData.profilePicUrl ? `${serverUrl}/${userData.profilePicUrl.replace(/\\/g, "/")}` : defaultProfilePic;

        document.getElementById('header-profile-name').textContent = userData.fullName || 'Pengguna';
        document.getElementById('header-profile-pic').src = profilePicUrl;
        document.getElementById('header-portal-title').textContent = userData.role === 'mudabbir' ? 'Dashboard Mudabbir' : 'Portal Mahasantri';
        document.getElementById('profile-main-pic').src = profilePicUrl;
        document.getElementById('profile-main-name').textContent = userData.fullName || 'Nama tidak tersedia';
        document.getElementById('profile-main-role').textContent = userData.role || 'Peran tidak tersedia';
        document.getElementById('fullName').value = userData.fullName || '';
        document.getElementById('dob').value = userData.dob ? userData.dob.split('T')[0] : '';
        document.getElementById('phone').value = userData.phone || '';
        document.getElementById('parentPhone').value = userData.parentPhone || '';
        document.getElementById('nim').value = userData.nim || '';
        document.getElementById('faculty').value = userData.faculty || '';
        document.getElementById('major').value = userData.major || '';
        document.getElementById('username').value = userData.username || '';
        document.getElementById('email').value = userData.email || '';
    }

    // --- Fungsi untuk mengubah mode form (readonly/edit) ---
    function toggleEditMode(edit) {
        isEditMode = edit;
        allInputs.forEach(input => {
            if (input.id !== 'username' && input.id !== 'email' && input.id !== 'nim') {
                input.readOnly = !edit;
            }
        });
        editBtn.classList.toggle('hidden', edit);
        saveBtn.classList.toggle('hidden', !edit);
    }
    
    // --- Logika Utama: Ambil data terbaru dari Server saat halaman dimuat ---
    try {
        const response = await fetch(`http://localhost:3000/api/user/${user.id}`);
        const result = await response.json();
        if (result.success) {
            populateProfileData(result.user);
            localStorage.setItem('user', JSON.stringify(result.user));
        } else { throw new Error(result.message); }
    } catch (error) {
        console.error('Gagal memuat profil:', error);
        alert('Gagal memuat data profil terbaru. Menampilkan data dari sesi terakhir.');
        populateProfileData(user);
    }
    
    // --- Event Listener untuk Tombol Edit & Simpan ---
    editBtn.addEventListener('click', () => toggleEditMode(true));

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isEditMode) return;
        const updatedData = {
            fullName: document.getElementById('fullName').value,
            dob: document.getElementById('dob').value,
            phone: document.getElementById('phone').value,
            parentPhone: document.getElementById('parentPhone').value,
            faculty: document.getElementById('faculty').value,
            major: document.getElementById('major').value,
        };
        try {
            const response = await fetch(`http://localhost:3000/api/user/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            const result = await response.json();
            if (result.success) {
                alert(result.message);
                toggleEditMode(false);
                document.getElementById('header-profile-name').textContent = updatedData.fullName;
                document.getElementById('profile-main-name').textContent = updatedData.fullName;
            } else { throw new Error(result.message); }
        } catch (error) {
            console.error('Gagal update profil:', error);
            alert('Gagal menyimpan perubahan: ' + error.message);
        }
    });
    
    // --- Fungsionalitas Upload Foto Profil (YANG SUDAH DIPERBAIKI) ---
    uploadPicInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Peringatan jika file terlalu besar
        if (file.size > 5 * 1024 * 1024) { // Batas 5MB
            alert('Ukuran file terlalu besar! Maksimal 5 MB.');
            return;
        }

        const formData = new FormData();
        formData.append('profileImage', file);
        formData.append('userId', user.id);

        try {
            alert('Mengunggah foto, mohon tunggu...');
            const response = await fetch('http://localhost:3000/api/profile/picture', {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();

            if (result.success) {
                alert('Foto profil berhasil diunggah!');
                const newPicUrl = `http://localhost:3000/${result.profilePicUrl.replace(/\\/g, "/")}`;
                
                // Perbarui gambar di halaman
                document.getElementById('profile-main-pic').src = newPicUrl;
                document.getElementById('header-profile-pic').src = newPicUrl;
                
                // Perbarui juga di localStorage
                const updatedUser = JSON.parse(localStorage.getItem('user'));
                updatedUser.profilePicUrl = result.profilePicUrl;
                localStorage.setItem('user', JSON.stringify(updatedUser));
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error unggah foto:', error);
            alert('Gagal mengunggah foto: ' + error.message);
        }
    });
});