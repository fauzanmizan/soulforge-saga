// js/app.js - Versi Lengkap dengan Autentikasi Penuh dan Perbaikan
// Ini mengembalikan fungsionalitas login, pendaftaran, dan peran pengguna (Wanderer/Forger).

// 1. Impor Modul dan Pustaka yang Diperlukan
// Mengimpor konfigurasi Firebase dari file lokal
import { firebaseConfig } from './firebase-config.js';
// Mengimpor fungsi-fungsi inti Firebase dari CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
// Mengimpor fungsi-fungsi Firestore untuk interaksi database
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// Mengimpor fungsi-fungsi Firebase Authentication
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// Mengimpor modul UIManager untuk mengelola antarmuka pengguna (UI)
import { UIManager } from './ui.js';
// Mengimpor modul Wanderer untuk logika spesifik peran Pengembara
import { Wanderer } from './wanderer.js';
// Mengimpor modul Forger untuk logika spesifik peran Penempa
import { Forger } from './forger.js';
// Mengimpor data permainan seperti data Codex
import { CODEX_DATA } from './gamedata.js';

// 2. Inisialisasi Aplikasi Firebase dan Layanan Terkait
// Menginisialisasi aplikasi Firebase dengan konfigurasi yang disediakan
const firebaseApp = initializeApp(firebaseConfig);
// Mendapatkan instance Firestore Database
export const firestoreDB = getFirestore(firebaseApp);
// Mendapatkan instance Firebase Authentication
const auth = getAuth(firebaseApp);

// 3. Objek Utama Aplikasi (App)
// Objek ini mengelola seluruh state dan logika inti aplikasi
export const App = {
    // 3.1. Variabel State Aplikasi
    worldState: {}, // Menyimpan status global dunia game
    currentUser: null, // Menyimpan data pengguna yang sedang login
    forgerEmail: 'forger@soulforge.saga', // Email khusus untuk akun Forger (Penempa)
    forgerMantra: 'i am the forger', // Mantra (password) untuk akun Forger
    // PENTING: Dalam aplikasi nyata, mantra ini TIDAK boleh di-hardcode seperti ini.
    // Seharusnya disimpan sebagai variabel lingkungan atau dikelola dengan lebih aman.

    // 3.2. Metode Inisialisasi Inti Aplikasi
    init() {
        // Menampilkan layar loading segera setelah aplikasi dimulai
        UIManager.showLoading("Menyinkronkan dengan Tenunan Kosmik...");

        // Mendengarkan perubahan status autentikasi Firebase
        // Ini adalah titik masuk utama setelah Firebase diinisialisasi
        onAuthStateChanged(auth, async (user) => {
            try {
                // Memuat status global dunia terlebih dahulu (biasanya data publik)
                await this.loadWorldState();

                // Mendapatkan ID halaman saat ini dari atribut data-page pada <body>
                const currentPage = document.body.dataset.page;

                if (user) {
                    // Jika ada pengguna yang terautentikasi di Firebase Auth
                    // Muat data pengguna mereka dari Firestore
                    await this.loadCurrentUserData(user);
                    
                    // PERBAIKAN: Periksa lagi this.currentUser setelah loadCurrentUserData
                    // Jika this.currentUser masih null, artinya data pengguna tidak ditemukan di Firestore
                    // (setelah penanganan Forger juga). Dalam kasus ini, kita harus logout.
                    if (!this.currentUser) {
                        console.warn("Pengguna terautentikasi tetapi data Firestore tidak ditemukan. Melakukan logout.");
                        this.logout(); 
                        return; // Hentikan eksekusi lebih lanjut
                    }

                    // Tentukan halaman tujuan berdasarkan peran pengguna
                    // Perbaikan: Gunakan optional chaining (?.) atau cek null secara eksplisit
                    // Meskipun sudah ada if (!this.currentUser) di atas, ini adalah safeguard tambahan
                    const targetRole = this.currentUser?.role; 
                    if (!targetRole) {
                         console.error("Peran pengguna tidak ditemukan setelah login. Melakukan logout.");
                         this.logout();
                         return;
                    }
                    const targetPageName = targetRole === 'forger' ? 'forger.html' : 'wanderer.html';
                    const targetPageId = targetRole; // Digunakan untuk membandingkan dengan atribut data-page

                    // Tangani pengalihan jika pengguna berada di halaman login atau halaman yang salah
                    if (currentPage === 'login') {
                        // Jika halaman saat ini adalah login, alihkan ke halaman spesifik peran yang sesuai
                        window.location.href = targetPageName;
                        return; // Hentikan eksekusi untuk membiarkan halaman baru dimuat
                    }
                    
                    if (currentPage !== targetPageId) {
                        // Pengguna login tetapi berada di halaman spesifik peran yang salah
                        // (misalnya, Pengembara di forger.html)
                        window.location.href = targetPageName;
                        return;
                    }

                    // Jika pengguna terautentikasi dan berada di halaman spesifik peran yang benar,
                    // inisialisasi modul yang relevan (Wanderer atau Forger)
                    this.routeToPage(currentPage);

                } else {
                    // Tidak ada pengguna yang terautentikasi di Firebase Auth
                    this.currentUser = null; // Pastikan currentUser adalah null
                    if (currentPage !== 'login') {
                        // Jika tidak berada di halaman login, alihkan ke halaman login (index.html)
                        window.location.href = 'index.html';
                        return;
                    }
                    // Jika sudah di halaman login dan tidak ada pengguna, inisialisasi UI halaman login
                    this.initLoginPage();
                }
            } catch (error) {
                // Menangkap kesalahan fatal selama proses inisialisasi
                console.error("Kesalahan fatal saat inisialisasi aplikasi:", error);
                UIManager.showNotification("Terjadi kesalahan kritis saat memuat aplikasi. Silakan coba segarkan halaman.", "alert-triangle", "bg-red-500");
                this.logout(); // Paksa logout pada kesalahan kritis
            } finally {
                // Selalu sembunyikan layar loading setelah proses inisialisasi selesai
                UIManager.hideLoading();
            }
        });
    },
    
    // 3.3. Logika Perutean Halaman
    routeToPage(pageId) {
        // Berdasarkan ID halaman saat ini, inisialisasi modul yang relevan
        if (pageId === 'login') {
            this.initLoginPage();
        } else if (pageId === 'wanderer' && this.currentUser?.role === 'wanderer') {
            // Pastikan modul Wanderer diinisialisasi hanya jika pengguna saat ini adalah Pengembara
            Wanderer.init(this);
        } else if (pageId === 'forger' && this.currentUser?.role === 'forger') {
            // Pastikan modul Forger diinisialisasi hanya jika pengguna saat ini adalah Penempa
            Forger.init(this);
        }
    },
    
    // 3.4. Metode Pemuatan Data dari Firestore

    // Memuat data status global dunia dari Firestore
    async loadWorldState() {
        const docRef = doc(firestoreDB, "world_state", "global");
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                // Jika dokumen ada, muat datanya
                this.worldState = docSnap.data();
            } else {
                // Jika dokumen world_state/global tidak ada, buat dengan nilai default
                this.worldState = {
                    submissionMantra: "dunia baru menanti", // Mantra untuk pendaftaran pengguna baru
                    cosmicSeason: "none",
                    apotheosisDate: "2028-01-01T00:00:00Z", // Contoh: Tanggal masa depan untuk apoteosis
                    resonance: 'Neutral' // Resonansi awal dunia
                };
                // Atur dokumen awal. Ini memerlukan izin 'write' untuk pengguna yang tidak terautentikasi
                // jika ini adalah pertama kali aplikasi berjalan dan belum ada pengguna yang login.
                await setDoc(docRef, this.worldState);
                console.log("Dokumen world_state/global berhasil dibuat dengan nilai default.");
            }
        } catch (error) {
            console.error("Gagal memuat atau membuat world_state:", error);
            // Melemparkan kembali error agar dapat ditangkap oleh blok try-catch di init()
            throw new Error("Gagal memuat atau membuat status dunia. Periksa aturan keamanan Firestore Anda.");
        }
    },

    // Memuat data pengguna saat ini dari Firestore setelah autentikasi
    async loadCurrentUserData(user) {
        // Jika tidak ada pengguna yang diberikan (misalnya saat logout), bersihkan pengguna saat ini
        if (!user) {
            this.currentUser = null;
            return;
        }

        const docRef = doc(firestoreDB, "users", user.uid);
        try {
            const docSnap = await getDoc(docRef);
            this.currentUser = docSnap.exists() ? docSnap.data() : null;

            // Jika ini email Forger dan belum ada data di Firestore, inisialisasi data Forger dasar di Firestore
            if (!this.currentUser && user.email === this.forgerEmail) {
                this.currentUser = { userId: user.uid, name: 'The Destiny Forger', role: 'forger', email: user.email };
                await setDoc(docRef, this.currentUser, { merge: true }); // Gunakan merge: true untuk menghindari penimpaan jika data parsial ada
                console.log("Data awal Forger berhasil dibuat di Firestore.");
            }
        } catch (error) {
            console.error("Gagal memuat data pengguna saat ini:", error);
            // Melemparkan kembali error agar dapat ditangkap oleh blok try-catch di init()
            throw new Error("Gagal memuat data pengguna saat ini. Periksa aturan keamanan Firestore Anda.");
        }
    },

    // 3.5. Metode Penyimpanan/Pembaruan Data Firestore

    // Menyimpan seluruh objek pengguna saat ini ke Firestore
    async saveCurrentUser(showLoading = true) {
        if (!this.currentUser || !this.currentUser.userId) {
            console.warn("Tidak ada pengguna aktif atau userId tidak terdefinisi. Proses penyimpanan dilewati.");
            return;
        }
        if (showLoading) UIManager.showLoading("Menyimpan takdir ke awan...");
        
        const docRef = doc(firestoreDB, "users", this.currentUser.userId);
        try {
            await setDoc(docRef, this.currentUser, { merge: true }); // Gunakan merge untuk hanya memperbarui field yang ada atau menambahkan yang baru
            console.log("Data pengguna saat ini berhasil disimpan.");
        } catch (error) {
            console.error("Gagal menyimpan data pengguna saat ini:", error);
            UIManager.showNotification("Gagal menyimpan data Anda ke Tenunan Kosmik.", "alert-triangle", "bg-red-500");
        } finally {
            if (showLoading) UIManager.hideLoading();
        }
    },
    
    // Memperbarui field spesifik untuk pengguna tertentu di Firestore
    // Ini sangat berguna bagi Forger untuk memperbarui data Pengembara.
    async updateUserField(userId, fieldPath, value) {
        if (!userId || !fieldPath) {
            console.error("UserId atau fieldPath tidak boleh kosong untuk updateUserField.");
            UIManager.showNotification("Parameter pembaruan tidak lengkap.", "alert-triangle", "bg-red-500");
            return;
        }
        const docRef = doc(firestoreDB, "users", userId);
        try {
            // updateDoc umumnya lebih disukai untuk memperbarui field yang ada tanpa menimpa seluruh dokumen.
            // Ini juga mendukung notasi titik untuk field bertingkat (misalnya, 'alignment.echo').
            await updateDoc(docRef, { [fieldPath]: value });
            console.log(`Field '${fieldPath}' untuk pengguna ${userId} berhasil diperbarui.`);
        } catch (error) {
            console.error(`Gagal memperbarui field '${fieldPath}' untuk pengguna ${userId}:`, error);
            UIManager.showNotification("Gagal menyimpan progres ke Tenunan.", "alert-triangle", "bg-red-500");
        }
    },

    // Memperbarui field spesifik dalam dokumen status dunia global
    async updateWorldState(field, value) {
        // Perbarui status dunia lokal terlebih dahulu
        this.worldState[field] = value;
        const docRef = doc(firestoreDB, "world_state", "global");
        try {
            await updateDoc(docRef, { [field]: value });
            console.log(`Field status dunia '${field}' berhasil diperbarui.`);
        } catch (error) {
            console.error(`Gagal memperbarui Tenunan Kosmik field '${field}':`, error);
            UIManager.showNotification("Gagal memperbarui Tenunan Kosmik.", "alert-triangle", "bg-red-500");
        }
    },

    // 3.6. Metode Alur Login dan Pendaftaran

    // Menginisialisasi UI untuk halaman login
    initLoginPage() {
        const gateContainer = document.getElementById('gate-container');
        if (!gateContainer) {
            console.error("Elemen #gate-container tidak ditemukan. Tidak dapat menginisialisasi halaman login.");
            return;
        }
        // Struktur HTML untuk formulir login
        const html = `
            <h1 class="font-serif text-5xl text-white tracking-widest" style="text-shadow: 0 0 15px rgba(129, 140, 248, 0.5);">Gerbang Takdir</h1>
            <p class="text-slate-400 text-lg mb-8">Ucapkan Mantra Jiwamu</p>
            <div class="w-full max-w-sm mx-auto space-y-6 text-left">
                <div>
                    <label for="login-email-input" class="text-sm font-bold text-slate-400">Alamat Email Jiwa</label>
                    <input type="email" id="login-email-input" class="mantra-input mt-1" placeholder="Email Anda...">
                </div>
                <div>
                    <label for="login-mantra-input" class="text-sm font-bold text-slate-400">Mantra Pribadi (Password)</label>
                    <input type="password" id="login-mantra-input" class="mantra-input mt-1" placeholder="Kunci rahasia Anda...">
                </div>
            </div>
            <p id="error-message" class="error-message h-6 mt-4 text-red-400"></p>
            <button id="gate-button" class="threshold-button">Masuk</button>
            <p class="text-sm mt-4 text-slate-500">Jiwa baru? <strong class="text-slate-400 cursor-pointer hover:text-white" id="submission-link">Ucapkan Mantra Penyerahan</strong></p>
        `;
        UIManager.render(gateContainer, html);

        // Menambahkan event listener ke elemen-elemen yang dirender
        const gateButton = document.getElementById('gate-button');
        const loginMantraInput = document.getElementById('login-mantra-input');
        const submissionLink = document.getElementById('submission-link');

        if (gateButton) gateButton.onclick = () => this.handleLogin();
        if (loginMantraInput) loginMantraInput.onkeyup = (e) => { if (e.key === 'Enter') this.handleLogin(); };
        if (submissionLink) submissionLink.onclick = () => this.renderNewWandererFlow();
    },

    // Menangani proses login (Autentikasi Firebase)
    async handleLogin() {
        const emailInput = document.getElementById('login-email-input');
        const mantraInput = document.getElementById('login-mantra-input');
        const errorEl = document.getElementById('error-message');

        // Memvalidasi keberadaan elemen UI yang penting
        if (!emailInput || !mantraInput || !errorEl) {
            console.error("Elemen input atau error untuk login tidak ditemukan.");
            UIManager.showNotification("Kesalahan UI login. Coba segarkan halaman.", "alert-triangle", "bg-red-500");
            return;
        }

        const email = emailInput.value.trim();
        const mantra = mantraInput.value.trim();
        UIManager.clearError(errorEl); // Membersihkan pesan error sebelumnya

        // Validasi input dasar
        if (!email || !mantra) {
            UIManager.showError(errorEl, "Email dan Mantra Pribadi wajib diisi.");
            return;
        }
        
        UIManager.showLoading("Memvalidasi Kunci Jiwa...");
        try {
            // Mencoba masuk dengan email dan password
            await signInWithEmailAndPassword(auth, email, mantra);
            // Listener onAuthStateChanged akan secara otomatis menangani pengalihan pada login yang berhasil
        } catch (error) {
            UIManager.hideLoading(); // Sembunyikan loading saat error
            console.error("Kesalahan login:", error); // Log error lengkap untuk debugging

            // Memberikan pesan error yang ramah pengguna berdasarkan kode error Firebase Auth
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
                // Penanganan khusus untuk akun Forger jika ini adalah percobaan login pertama mereka
                if (email === this.forgerEmail && mantra === this.forgerMantra) {
                    try {
                        UIManager.showLoading("Menginisialisasi akun Forger...");
                        await createUserWithEmailAndPassword(auth, email, mantra);
                        // Jika berhasil, onAuthStateChanged akan terpicu, yang kemudian memanggil loadCurrentUserData
                        // untuk membuat dokumen Firestore Forger.
                    } catch (creationError) {
                        console.error("Gagal membuat akun Forger:", creationError);
                        UIManager.showError(errorEl, "Gagal menginisialisasi akun Forger. Coba lagi atau periksa kredensial Forger.");
                    }
                } else {
                    UIManager.showError(errorEl, "Kombinasi Email dan Mantra Pribadi tidak dikenali.");
                }
            } else if (error.code === 'auth/wrong-password') {
                UIManager.showError(errorEl, "Mantra Pribadi salah. Silakan coba lagi.");
            } else if (error.code === 'auth/invalid-email') {
                UIManager.showError(errorEl, "Format email tidak valid.");
            } else {
                UIManager.showError(errorEl, "Gagal membuka gerbang. Terjadi kesalahan tak terduga. Coba lagi.");
            }
        }
    },
    
    // Merender UI untuk pendaftaran Pengembara baru
    renderNewWandererFlow() {
        const gateContainer = document.getElementById('gate-container');
        if (!gateContainer) {
            console.error("Elemen #gate-container tidak ditemukan. Tidak dapat menginisialisasi alur pendaftaran.");
            return;
        }
        // Struktur HTML untuk formulir pendaftaran
        const html = `
            <h2 class="font-serif text-3xl text-white">Penempaan Jiwa Baru</h2>
            <p class="text-lg text-slate-300 mt-2">Daftarkan dirimu pada Tenunan Kosmik.</p>
            <div class="w-full max-w-sm mx-auto mt-8 space-y-6 text-left">
                <div>
                    <label for="new-email-input" class="text-sm font-bold text-slate-400">Alamat Email Jiwa</label>
                    <input type="email" id="new-email-input" class="mantra-input mt-1" placeholder="Email untuk login...">
                </div>
                <div>
                    <label for="new-mantra-input" class="text-sm font-bold text-slate-400">Mantra Pribadi (Password)</label>
                    <input type="password" id="new-mantra-input" class="mantra-input mt-1" placeholder="Minimal 6 karakter...">
                </div>
                <div>
                    <label for="new-name-input" class="text-sm font-bold text-slate-400">Nama Abadi (Username)</label>
                    <input type="text" id="new-name-input" class="mantra-input mt-1" placeholder="Nama yang akan dikenal...">
                </div>
            </div>
            <p id="error-message" class="error-message h-6 mt-4 text-red-400"></p>
            <button id="forge-soul-button" class="threshold-button">Tempa Jiwaku</button>
            <p class="text-sm mt-4 text-slate-500 cursor-pointer hover:text-white" id="back-to-login">Kembali ke Gerbang</p>
        `;
        UIManager.render(gateContainer, html);

        // Menambahkan event listener ke elemen-elemen yang dirender
        const forgeSoulButton = document.getElementById('forge-soul-button');
        const backToLoginLink = document.getElementById('back-to-login');

        if (forgeSoulButton) forgeSoulButton.onclick = () => this.handleCreateWanderer();
        if (backToLoginLink) backToLoginLink.onclick = () => this.initLoginPage();
    },

    // Menangani pembuatan akun Pengembara baru
    async handleCreateWanderer() {
        const emailInput = document.getElementById('new-email-input');
        const newMantraInput = document.getElementById('new-mantra-input');
        const newNameInput = document.getElementById('new-name-input');
        const errorEl = document.getElementById('error-message');

        // Memvalidasi keberadaan elemen UI yang penting
        if (!emailInput || !newMantraInput || !newNameInput || !errorEl) {
            console.error("Elemen input atau error untuk pendaftaran tidak ditemukan.");
            UIManager.showNotification("Kesalahan UI pendaftaran. Coba segarkan halaman.", "alert-triangle", "bg-red-500");
            return;
        }

        const email = emailInput.value.trim();
        const newMantra = newMantraInput.value.trim();
        const newName = newNameInput.value.trim();
        UIManager.clearError(errorEl); // Membersihkan pesan error sebelumnya

        // Validasi input dasar
        if (!email || !newMantra || !newName) {
            UIManager.showError(errorEl, "Email, Mantra, dan Nama Abadi wajib diisi.");
            return;
        }
        if (newMantra.length < 6) {
            UIManager.showError(errorEl, "Mantra Pribadi (Password) minimal 6 karakter.");
            return;
        }
        if (newName.length < 3) {
            UIManager.showError(errorEl, "Nama Abadi minimal 3 karakter.");
            return;
        }
        // Validasi dasar untuk nama agar tidak ada karakter khusus atau spasi
        // yang dapat menyebabkan masalah sebagai ID dokumen
        if (!/^[a-zA-Z0-9]+$/.test(newName)) {
            UIManager.showError(errorEl, "Nama Abadi hanya boleh mengandung huruf dan angka.");
            return;
        }
        
        UIManager.showLoading("Memeriksa Nama Abadi...");

        // Strategi untuk memeriksa keberadaan nama pengguna tanpa membaca seluruh koleksi 'users':
        // Coba baca dokumen di koleksi terpisah 'usernames' dengan nama pengguna yang diinginkan sebagai ID.
        // Ini memerlukan akses 'read' ke 'usernames/{usernameId}' untuk pengguna yang tidak terautentikasi.
        try {
            const usernameDocRef = doc(firestoreDB, "usernames", newName);
            const usernameDocSnap = await getDoc(usernameDocRef);

            if (usernameDocSnap.exists()) {
                UIManager.hideLoading();
                UIManager.showError(errorEl, `Nama "${newName}" telah terukir. Pilih nama lain.`);
                return;
            }
        } catch (error) {
            // Error ini biasanya terjadi jika aturan keamanan Firestore untuk 'usernames' salah.
            console.error("Kesalahan saat memeriksa keberadaan nama pengguna:", error);
            UIManager.hideLoading();
            UIManager.showError(errorEl, "Gagal memeriksa nama abadi. Silakan coba lagi. Pastikan aturan Firestore untuk koleksi 'usernames' benar.");
            return;
        }

        UIManager.showLoading("Menciptakan Kunci Jiwa di Awan...");
        try {
            // 1. Buat pengguna di Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, newMantra);
            
            // 2. Buat data pengguna yang sesuai di Firestore dan perbarui koleksi 'usernames'
            await this.createNewWandererInFirestore(userCredential.user, newName);
            
            // Listener onAuthStateChanged akan menangani pengalihan setelah pembuatan berhasil dan setup data Firestore
        } catch (error) {
            UIManager.hideLoading(); // Sembunyikan loading saat error
            console.error("Kesalahan saat menempa kunci jiwa:", error); // Log error lengkap untuk debugging

            // Memberikan pesan error yang ramah pengguna berdasarkan kode error Firebase Auth
            if (error.code === 'auth/email-already-in-use') {
                UIManager.showError(errorEl, "Alamat Email Jiwa ini telah terdaftar.");
            } else if (error.code === 'auth/weak-password') {
                UIManager.showError(errorEl, "Mantra Pribadi terlalu lemah. Mohon gunakan minimal 6 karakter.");
            } else {
                UIManager.showError(errorEl, "Gagal menempa kunci jiwa. Terjadi kesalahan tak terduga. Coba lagi.");
            }
        }
    },

    // Membuat dokumen Pengembara baru di Firestore dan mencatat nama penggunanya
    async createNewWandererInFirestore(user, name) {
        UIManager.showLoading("Menempa jiwa baru dalam Tenunan Kosmik...");
        
        // Menyiapkan entri Codex default yang tidak terkunci dan progres awal
        const defaultUnlockedCodex = [];
        const initialCodexProgress = {};
        for (const chapter in CODEX_DATA) {
            CODEX_DATA[chapter].forEach(entry => {
                if (entry.unlockedByDefault) {
                    defaultUnlockedCodex.push(entry.id);
                    initialCodexProgress[entry.id] = 0;
                }
            });
        }

        // Mendefinisikan struktur data default untuk Pengembara baru
        const newWandererData = {
            userId: user.uid, // UID dari Firebase Auth
            email: user.email,
            name: name, // Nama pengguna yang dipilih
            role: 'wanderer', // Peran pengguna
            soulRank: 1, // Peringkat awal
            title: "The Awakened", // Gelar awal
            xp: 0,
            alignment: { echo: 50, intention: 50 }, // Keseimbangan awal
            consistencyStreak: 0,
            essenceOfWill: 0,
            status: { id: 'neutral', text: 'Balanced', color: 'text-slate-400' },
            unlockedImprints: [], // Placeholder untuk fitur masa depan
            dailyRitual: {
                streak: 0,
                lastRiteDate: null,
                completedToday: false,
                orbs: [ // Orb ritual harian dengan jendela waktu mereka
                    { id: 'dawn', name: 'Fajar', ignited: false, window: [4, 7], icon: 'sunrise' },
                    { id: 'noon', name: 'Siang', ignited: false, window: [12, 14], icon: 'sun' },
                    { id: 'afternoon', name: 'Sore', ignited: false, window: [15, 17], icon: 'cloud' },
                    { id: 'dusk', name: 'Senja', ignited: false, window: [18, 19], icon: 'sunset' },
                    { id: 'night', name: 'Malam', ignited: false, window: [20, 22], icon: 'moon' }
                ]
            },
            attributes: [ // Atribut inti
                { name: 'Stamina', value: 2, xp: 0, xpToNext: 100 },
                { name: 'Discipline', value: 2, xp: 0, xpToNext: 100 },
                { name: 'Knowledge', value: 2, xp: 0, xpToNext: 100 },
                { name: 'Social', value: 2, xp: 0, xpToNext: 100 },
                { name: 'Focus', value: 2, xp: 0, xpToNext: 100 }
            ],
            divineMandate: null, // Tidak ada titah aktif di awal
            chronicle: [{ // Entri kronik pertama (kelahiran)
                id: Date.now(),
                type: 'genesis',
                title: 'Kelahiran Kembali',
                reflection: `Jiwa ${name} terlahir di Gerbang Takdir, menjawab panggilan sunyi untuk menempa ulang sebuah takdir.`,
                timestamp: new Date().toISOString(),
                sigil: 'compass',
                isMeditatable: true
            }],
            inventory: [], // Inventaris kosong
            activeBuffs: [], // Tidak ada buff aktif
            unlockedCodexEntries: defaultUnlockedCodex, // Entri codex default yang tidak terkunci
            codexProgress: initialCodexProgress // Progres codex awal
        };
        
        // Mendefinisikan referensi untuk dua dokumen yang akan dibuat
        const userDocRef = doc(firestoreDB, "users", user.uid);
        const usernameDocRef = doc(firestoreDB, "usernames", name); // Dokumen untuk pengecekan keunikan nama pengguna

        try {
            // Lakukan kedua operasi penulisan. Jika salah satu gagal, seluruh operasi gagal.
            // Pertimbangkan untuk menggunakan batched write jika atomisitas sangat penting dan Anda perlu memastikan
            // keduanya atau tidak sama sekali berkomitmen. Untuk kesederhanaan dan kejelasan,
            // dua panggilan `setDoc` terpisah digunakan di sini, tetapi keduanya ditunggu (`await`).
            await setDoc(userDocRef, newWandererData);
            console.log(`Data pengguna untuk ${name} (${user.uid}) berhasil dibuat di koleksi 'users'.`);

            // Buat dokumen di koleksi 'usernames' untuk menandai nama pengguna sudah diambil.
            // ID dokumen adalah nama pengguna itu sendiri. Dokumen ini biasanya kecil,
            // hanya untuk pengecekan keunikan.
            await setDoc(usernameDocRef, { 
                username: name, 
                userId: user.uid, 
                createdAt: new Date().toISOString() 
            });
            console.log(`Nama pengguna '${name}' berhasil dicatat di koleksi 'usernames'.`);

        } catch (error) {
            console.error("Gagal membuat data pengguna atau catatan nama pengguna di Firestore:", error);
            UIManager.showNotification("Gagal menempa jiwa baru di Firestore. Terjadi kesalahan internal.", "alert-triangle", "bg-red-500");
            // Penting: Jika penulisan Firestore gagal di sini, Anda mungkin memiliki pengguna Auth yang "terlantar".
            // Dalam aplikasi produksi, Anda mungkin ingin menghapus pengguna Firebase Auth di sini juga:
            // await user.delete(); // Ini memerlukan penanganan error yang hati-hati untuk mencegah loop tak terbatas atau state parsial.
            throw error; // Melemparkan kembali error agar dapat ditangkap oleh handleCreateWanderer
        } finally {
            UIManager.hideLoading(); // Selalu sembunyikan layar loading
        }
    },

    // 3.7. Fungsionalitas Logout
    logout() {
        // Hapus interval/listener aktif spesifik untuk modul Wanderer atau Forger
        if (Wanderer && Wanderer.destinyClockInterval) {
            clearInterval(Wanderer.destinyClockInterval);
            Wanderer.destinyClockInterval = null; // Reset untuk mencegah pembersihan berulang
        }
        if (Forger && Forger.wanderersListenerUnsubscribe) {
            Forger.wanderersListenerUnsubscribe();
            Forger.wanderersListenerUnsubscribe = null; // Reset listener
        }
        
        // Logout dari Firebase Authentication
        signOut(auth).then(() => {
            console.log("Pengguna berhasil logout.");
            // Alihkan ke halaman login (index.html) setelah logout berhasil
            window.location.href = 'index.html'; 
        }).catch(error => {
            console.error("Kesalahan saat logout:", error);
            UIManager.showNotification("Gagal logout. Silakan coba lagi.", "alert-triangle", "bg-red-500");
        });
    },
};
