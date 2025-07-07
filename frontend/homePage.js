// auth.js - VERSI FIXED UNTUK DEPLOY

const apiUrl = 'https://projek-mahad-msn-production.up.railway.app';

document.addEventListener('DOMContentLoaded', () => {
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

    const majors = {
        FITK: ["Pendidikan Agama Islam", "Pendidikan Bahasa Arab", "Manajemen Pendidikan Islam"],
        FST: ["Teknik Informatika", "Agribisnis", "Sistem Informasi"]
        // Tambahkan jika ada fakultas lain
    };

    if (enterButton) {
        enterButton.addEventListener('click', () => {
            introScreen.classList.add('hidden');
            pageContainer.classList.remove('hidden');
        });
    }

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
        document.title = 'Daftar | Mabna Syekh Nawawi';
    };

    if (switchToRegisterLink) switchToRegisterLink.addEventListener('click', e => { e.preventDefault(); showRegisterView(); });
    if (switchToLoginLink) switchToLoginLink.addEventListener('click', e => { e.preventDefault(); showLoginView(); });

    if (facultySelect && majorSelect) {
        facultySelect.addEventListener('change', function () {
            const selected = this.value;
            majorSelect.innerHTML = '<option disabled selected hidden>Pilih Jurusan</option>';
            if (majors[selected]) {
                majors[selected].forEach(mj => {
                    const opt = document.createElement('option');
                    opt.value = mj; opt.textContent = mj;
                    majorSelect.appendChild(opt);
                });
            }
        });
    }

    // LOGIN
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
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
                const res = await fetch(`${apiUrl}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const result = await res.json();

                if (result.success && result.user) {
                    localStorage.setItem('user', JSON.stringify(result.user));
                    localStorage.setItem('role', result.user.role);
                    loadingOverlay.classList.remove('hidden');
                    setTimeout(() => loadingProgressBar.style.width = '100%', 100);
                    setTimeout(() => window.location.href = 'homePage.html', 1800);
                } else {
                    loginErrorAlert.textContent = result.message || 'Login gagal.';
                    loginErrorAlert.classList.remove('hidden');
                }
            } catch (err) {
                console.error(err);
                loginErrorAlert.textContent = 'Terjadi kesalahan koneksi.';
                loginErrorAlert.classList.remove('hidden');
            } finally {
                loginSubmitButton.disabled = false;
                loginSubmitButton.classList.remove('loading');
            }
        });
    }

    // REGISTER
    if (registerForm) {
        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const formData = new FormData(registerForm);
            const userData = Object.fromEntries(formData.entries());

            registerSubmitButton.disabled = true;
            registerSubmitButton.classList.add('loading');

            try {
                const res = await fetch(`${apiUrl}/api/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });

                const result = await res.json();

                if (result.success) {
                    successMsg.textContent = result.message || 'Registrasi berhasil.';
                    successMsg.classList.remove('hidden');
                    setTimeout(() => {
                        successMsg.classList.add('hidden');
                        showLoginView();
                    }, 2000);
                } else {
                    generalFormError.textContent = result.message || 'Registrasi gagal.';
                    generalFormError.classList.remove('hidden');
                }
            } catch (err) {
                console.error(err);
                generalFormError.textContent = 'Terjadi kesalahan koneksi.';
                generalFormError.classList.remove('hidden');
            } finally {
                registerSubmitButton.disabled = false;
                registerSubmitButton.classList.remove('loading');
            }
        });
    }

    // Placeholder efek untuk input & select
    function setupPlaceholders(id) {
        document.querySelectorAll(`#${id} input, #${id} select`).forEach(input => {
            const update = () => {
                if (input.type !== 'date') {
                    input.value.trim() || input.tagName === 'SELECT' && input.value
                        ? input.removeAttribute('placeholder')
                        : input.setAttribute('placeholder', ' ');
                }
            };
            update();
            input.addEventListener('blur', update);
            input.addEventListener('focus', () => input.setAttribute('placeholder', ' '));
            if (input.tagName === 'SELECT') input.addEventListener('change', update);
        });
    }

    setupPlaceholders('loginSection');
    setupPlaceholders('registerSection');

    const toggleLoginPassword = document.getElementById('toggleLoginPassword');
    if (toggleLoginPassword) {
        toggleLoginPassword.addEventListener('click', () => {
            const pw = document.getElementById('loginPassword');
            const type = pw.getAttribute('type') === 'password' ? 'text' : 'password';
            pw.setAttribute('type', type);
            toggleLoginPassword.textContent = type === 'password' ? '👁️' : '🙈';
        });
    }
});
