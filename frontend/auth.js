// auth.js - KODE LENGKAP DENGAN PERBAIKAN URL

document.addEventListener('DOMContentLoaded', () => {
    // --- Seleksi Elemen DOM Baru & Lama ---
    const introScreen = document.getElementById('introScreen');
    const enterButton = document.getElementById('enterButton');
    const pageContainer = document.getElementById('pageContainer');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingProgressBar = document.getElementById('loadingProgressBar');
    
    const brandingLoginContent = document.getElementById('brandingLoginContent');
    const brandingRegisterContent = document.getElementById('brandingRegisterContent');
    const switchToRegisterLink = document.getElementById('switchToRegisterLink');
    const switchToLoginLink = document.getElementById('switchToLoginLink');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginErrorAlert = document.getElementById('loginErrorAlert');
    const loginSubmitButton = document.getElementById('loginSubmitButton');
    const registerSubmitButton = document.getElementById('registerSubmitButton');
    const generalFormError = document.getElementById('generalFormError');
    const successMsg = document.getElementById('successMsg');
    const facultySelect = document.getElementById('faculty');
    const majorSelect = document.getElementById('major');
    const roleSelect = document.getElementById('role');
    const registerFormGroups = registerForm ? Array.from(registerForm.querySelectorAll('.form-group')) : [];

    // --- LOGIKA INTRO SCREEN ---
    if (enterButton) {
        enterButton.addEventListener('click', () => {
            introScreen.classList.add('hidden');
            pageContainer.classList.remove('hidden');
        });
    }

    // --- Fungsi untuk Mengganti Tampilan antara Login dan Register ---
    const showLoginView = () => {
        pageContainer.classList.remove('show-register');
        setTimeout(() => {
            brandingLoginContent.classList.remove('hidden');
            brandingRegisterContent.classList.add('hidden');
        }, 300);
        document.title = 'Login | Mabna Syekh Nawawi';
    };

    const showRegisterView = () => {
        pageContainer.classList.add('show-register');
        setTimeout(() => {
            brandingLoginContent.classList.add('hidden');
            brandingRegisterContent.classList.remove('hidden');
        }, 300);
        document.title = 'Buat Akun | Mabna Syekh Nawawi';
    };

    if (switchToRegisterLink) switchToRegisterLink.addEventListener('click', (e) => { e.preventDefault(); showRegisterView(); });
    if (switchToLoginLink) switchToLoginLink.addEventListener('click', (e) => { e.preventDefault(); showLoginView(); });

    // --- LOGIKA FORM LOGIN ---
    if (loginForm) {
        loginForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value.trim();
            if (!username || !password) {
                loginErrorAlert.textContent = 'Username dan Password wajib diisi.';
                loginErrorAlert.classList.remove('hidden');
                return;
            }
            
            loginErrorAlert.classList.add('hidden');
            loginSubmitButton.disabled = true;
            loginSubmitButton.classList.add('loading');

            try {
                const response = await fetch('http://localhost:3000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const result = await response.json();

                if (result.success && result.user) {
                    localStorage.setItem('user', JSON.stringify(result.user));
                    localStorage.setItem('role', result.user.role);
                    
                    loadingOverlay.classList.remove('hidden');
                    setTimeout(() => { if (loadingProgressBar) loadingProgressBar.style.width = '100%'; }, 100);
                    setTimeout(() => { window.location.href = '/frontend/homePage.html'; }, 1800);

                } else {
                    loginErrorAlert.textContent = result.message || 'Login gagal.';
                    loginErrorAlert.classList.remove('hidden');
                    loginSubmitButton.disabled = false;
                    loginSubmitButton.classList.remove('loading');
                }
            } catch (error) {
                console.error('Error saat login:', error);
                loginErrorAlert.textContent = 'Terjadi kesalahan koneksi atau server.';
                loginErrorAlert.classList.remove('hidden');
                loginSubmitButton.disabled = false;
                loginSubmitButton.classList.remove('loading');
            }
        });
    }
    
    // --- Sisa Logika dari File auth.js Asli Anda ---
    function setupInputEventListeners(sectionId) {
        document.querySelectorAll(`#${sectionId} .input-group input, #${sectionId} .form-group input, #${sectionId} .form-group select`).forEach(input => {
            const isDateInput = input.type === 'date';
            const updatePlaceholder = () => { if (!isDateInput) { input.value.trim() || (input.tagName === 'SELECT' && input.value) ? input.removeAttribute('placeholder') : input.setAttribute('placeholder', ' '); }};
            updatePlaceholder();
            input.addEventListener('blur', updatePlaceholder);
            input.addEventListener('focus', () => { if (!isDateInput) input.setAttribute('placeholder', ' '); });
            if (input.tagName === 'SELECT') input.addEventListener('change', updatePlaceholder);
        });
    }
    setupInputEventListeners('loginSection');
    setupInputEventListeners('registerSection');

    const toggleLoginPasswordButton = document.getElementById('toggleLoginPassword');
    if (toggleLoginPasswordButton) {
        toggleLoginPasswordButton.addEventListener('click', function () {
            const loginPasswordInput = document.getElementById('loginPassword');
            const type = loginPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            loginPasswordInput.setAttribute('type', type);
            this.textContent = type === 'password' ? '👁️' : '🙈';
        });
    }
    
    // --- Logika Form Registrasi ---
    const majors = { FITK: ["Pendidikan Agama Islam", "Pendidikan Bahasa Arab", "Manajemen Pendidikan Islam"], FST: ["Teknik Informatika", "Agribisnis", "Sistem Informasi"], /* ...Lengkapi fakultas lain... */ };

    if (facultySelect && majorSelect) {
        facultySelect.addEventListener('change', function() {
            const selectedFaculty = this.value;
            majorSelect.innerHTML = '<option value="" disabled selected hidden> </option>';
            if (majors[selectedFaculty]) {
                majors[selectedFaculty].forEach(major => {
                    const option = document.createElement('option');
                    option.value = major; option.textContent = major;
                    majorSelect.appendChild(option);
                });
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            // Lakukan validasi jika perlu
            const formData = new FormData(registerForm);
            const userData = Object.fromEntries(formData.entries());

            registerSubmitButton.disabled = true;
            registerSubmitButton.classList.add('loading');
            
            try 
            {const response = await fetch(`${apiUrl}/api/login`, { /* ... */ });
                const result = await response.json();

                if (result.success) {
                    successMsg.textContent = result.message || 'Akun berhasil dibuat! Silakan login.';
                    successMsg.classList.remove('hidden');
                    setTimeout(() => {
                        successMsg.classList.add('hidden');
                        showLoginView();
                    }, 2500);
                } else {
                    generalFormError.textContent = "Gagal: " + (result.message || "Periksa kembali data Anda.");
                    generalFormError.classList.remove('hidden');
                }
            } catch (error) {
                console.error("Error saat registrasi:", error);
                generalFormError.textContent = "Terjadi kesalahan koneksi atau server.";
                generalFormError.classList.remove('hidden');
            } finally {
                registerSubmitButton.disabled = false;
                registerSubmitButton.classList.remove('loading');
            }
        });
    }
});

const apiUrl = 'https://projek-mahad-msn-production.up.railway.app';