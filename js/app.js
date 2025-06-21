// js/app.js - v7.4 Edisi Alur Logika Sempurna
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, query } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { UIManager } from './ui.js';
import { Wanderer } from './wanderer.js';
import { Forger } from './forger.js';
import { CODEX_DATA } from './gamedata.js';

const firebaseApp = initializeApp(firebaseConfig);
export const firestoreDB = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

export const App = {
    worldState: {},
    currentUser: null,
    forgerMantra: 'i am the forger',
    
    init() {
        UIManager.showLoading("Menyinkronkan dengan Tenunan Kosmik...");

        onAuthStateChanged(auth, async (user) => {
            await this.loadWorldState();
            const currentPage = document.body.dataset.page;

            if (user) {
                await this.loadCurrentUserData(user);
                
                if (!this.currentUser && currentPage !== 'login') {
                    UIManager.hideLoading();
                    this.logout();
                    return;
                }
                
                const targetRole = this.currentUser.role;
                const targetPage = targetRole === 'forger' ? 'forger.html' : 'wanderer.html';
                const targetPageId = targetRole;

                if (currentPage === 'login') {
                    window.location.href = targetPage;
                    return; // Hentikan eksekusi, biarkan halaman baru mengambil alih.
                }
                
                if (currentPage !== targetPageId) {
                    return this.logout();
                }

                this.routeToPage(currentPage);

            } else {
                this.currentUser = null;
                if (currentPage !== 'login') {
                    window.location.href = 'index.html';
                    return;
                }
                this.routeToPage('login');
            }
            
            UIManager.hideLoading();
        });
    },
    
    routeToPage(pageId) {
        if (pageId === 'login') this.initLoginPage();
        else if (pageId === 'wanderer' && this.currentUser?.role === 'wanderer') Wanderer.init(this);
        else if (pageId === 'forger' && this.currentUser?.role === 'forger') Forger.init(this);
    },
    
    async loadWorldState() {
        const docRef = doc(firestoreDB, "world_state", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            this.worldState = docSnap.data();
        } else {
            this.worldState = {
                submissionMantra: "dunia baru menanti",
                cosmicSeason: "none",
                apotheosisDate: "2028-01-01T00:00:00Z",
                resonance: 'Neutral'
            };
            await setDoc(docRef, this.worldState);
        }
    },

    async loadCurrentUserData(user) {
        if (user.email === 'forger@soulforge.saga') {
             this.currentUser = { userId: user.uid, name: 'The Destiny Forger', role: 'forger' };
             return;
        }
        
        const docRef = doc(firestoreDB, "users", user.uid);
        const docSnap = await getDoc(docRef);
        this.currentUser = docSnap.exists() ? docSnap.data() : null;
    },

    async saveCurrentUser(showLoading = true) {
        if (!this.currentUser || !this.currentUser.userId) return;
        if (showLoading) UIManager.showLoading("Menyimpan takdir ke awan...");
        
        const docRef = doc(firestoreDB, "users", this.currentUser.userId);
        await setDoc(docRef, this.currentUser, { merge: true });
        
        if (showLoading) UIManager.hideLoading();
    },
    
    async updateUserField(fieldPath, value) {
        if (!this.currentUser || !this.currentUser.userId) return;
        const docRef = doc(firestoreDB, "users", this.currentUser.userId);
        try {
            await updateDoc(docRef, { [fieldPath]: value });
        } catch (error) {
            console.error("Error updating field:", error);
            UIManager.showNotification("Gagal menyimpan progres ke Tenunan.", "alert-triangle", "bg-red-500");
        }
    },

    async updateWorldState(field, value) {
        this.worldState[field] = value;
        const docRef = doc(firestoreDB, "world_state", "global");
        await updateDoc(docRef, { [field]: value });
    },

    initLoginPage() {
        const gateContainer = document.getElementById('gate-container');
        const html = `<h1 class="font-serif text-5xl text-white tracking-widest" style="text-shadow: 0 0 15px rgba(129, 140, 248, 0.5);">Gerbang Takdir</h1><p class="text-slate-400 text-lg mb-8">Ucapkan Mantra Jiwamu</p><div class="w-full max-w-sm mx-auto space-y-6 text-left"><div><label for="login-email-input" class="text-sm font-bold text-slate-400">Alamat Email Jiwa</label><input type="email" id="login-email-input" class="mantra-input mt-1" placeholder="Email Anda..."></div><div><label for="login-mantra-input" class="text-sm font-bold text-slate-400">Mantra Pribadi (Password)</label><input type="password" id="login-mantra-input" class="mantra-input mt-1" placeholder="Kunci rahasia Anda..."></div></div><p id="error-message" class="error-message h-6 mt-4 text-red-400"></p><button id="gate-button" class="threshold-button">Masuk</button><p class="text-sm mt-4 text-slate-500">Jiwa baru? <strong class="text-slate-400 cursor-pointer hover:text-white" id="submission-link">Ucapkan Mantra Penyerahan</strong></p>`;
        UIManager.render(gateContainer, html);
        document.getElementById('gate-button').onclick = () => this.handleLogin();
        document.getElementById('login-mantra-input').onkeyup = (e) => { if (e.key === 'Enter') this.handleLogin(); };
        document.getElementById('submission-link').onclick = () => this.renderNewWandererFlow();
    },

    async handleLogin() {
        const emailInput = document.getElementById('login-email-input');
        const mantraInput = document.getElementById('login-mantra-input');
        const errorEl = document.getElementById('error-message');
        const email = emailInput.value.trim();
        const mantra = mantraInput.value.trim();
        UIManager.clearError(errorEl);

        if (!email || !mantra) return UIManager.showError(errorEl, "Email dan Mantra Pribadi wajib diisi.");
        
        UIManager.showLoading("Memvalidasi Kunci Jiwa...");
        try {
            await signInWithEmailAndPassword(auth, email, mantra);
        } catch (error) {
            UIManager.hideLoading();
            if (error.code === 'auth/invalid-credential') {
                UIManager.showError(errorEl, "Kombinasi Email dan Mantra Pribadi tidak dikenali.");
            } else if (error.code === 'auth/user-not-found' && email === 'forger@soulforge.saga' && mantra === this.forgerMantra) {
                // Kasus khusus jika akun Forger belum ada
                try {
                    await createUserWithEmailAndPassword(auth, email, mantra);
                } catch (creationError) {
                    UIManager.showError(errorEl, "Gagal menginisialisasi akun Forger.");
                }
            } else {
                UIManager.showError(errorEl, "Gagal membuka gerbang. Coba lagi.");
            }
        }
    },
    
    renderNewWandererFlow() {
        const gateContainer = document.getElementById('gate-container');
        const html = `<h2 class="font-serif text-3xl text-white">Penempaan Jiwa Baru</h2><p class="text-lg text-slate-300 mt-2">Daftarkan dirimu pada Tenunan Kosmik.</p><div class="w-full max-w-sm mx-auto mt-8 space-y-6 text-left"><div><label for="new-email-input" class="text-sm font-bold text-slate-400">Alamat Email Jiwa</label><input type="email" id="new-email-input" class="mantra-input mt-1" placeholder="Email untuk login..."></div><div><label for="new-mantra-input" class="text-sm font-bold text-slate-400">Mantra Pribadi (Password)</label><input type="password" id="new-mantra-input" class="mantra-input mt-1" placeholder="Minimal 6 karakter..."></div><div><label for="new-name-input" class="text-sm font-bold text-slate-400">Nama Abadi (Username)</label><input type="text" id="new-name-input" class="mantra-input mt-1" placeholder="Nama yang akan dikenal..."></div></div><p id="error-message" class="error-message h-6 mt-4 text-red-400"></p><button id="forge-soul-button" class="threshold-button">Tempa Jiwaku</button><p class="text-sm mt-4 text-slate-500 cursor-pointer hover:text-white" id="back-to-login">Kembali ke Gerbang</p>`;
        UIManager.render(gateContainer, html);
        document.getElementById('forge-soul-button').onclick = () => this.handleCreateWanderer();
        document.getElementById('back-to-login').onclick = () => this.initLoginPage();
    },

    async handleCreateWanderer() {
        const email = document.getElementById('new-email-input').value.trim();
        const newMantra = document.getElementById('new-mantra-input').value.trim();
        const newName = document.getElementById('new-name-input').value.trim();
        const errorEl = document.getElementById('error-message');
        UIManager.clearError(errorEl);

        if (!email || !newMantra || !newName) return UIManager.showError(errorEl, "Email, Mantra, dan Nama Abadi wajib diisi.");
        if (newMantra.length < 6) return UIManager.showError(errorEl, "Mantra Pribadi (Password) minimal 6 karakter.");
        
        UIManager.showLoading("Memeriksa Tenunan...");
        const allWanderers = await this.getAllWanderers();
        if (allWanderers.some(w => w.name.toLowerCase() === newName.toLowerCase())) {
            UIManager.hideLoading();
            return UIManager.showError(errorEl, `Nama "${newName}" telah terukir. Pilih nama lain.`);
        }

        UIManager.showLoading("Menciptakan Kunci Jiwa di Awan...");
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, newMantra);
            await this.createNewWandererInFirestore(userCredential.user, newName);
        } catch (error) {
            UIManager.hideLoading();
            if (error.code === 'auth/email-already-in-use') UIManager.showError(errorEl, "Alamat Email Jiwa ini telah terdaftar.");
            else UIManager.showError(errorEl, "Gagal menempa kunci jiwa. Coba lagi.");
        }
    },

    async getAllWanderers() {
        const usersCollectionRef = collection(firestoreDB, "users");
        const q = query(usersCollectionRef);
        const querySnapshot = await getDocs(q);
        const wanderers = [];
        querySnapshot.forEach(doc => {
            if(doc.data().role === 'wanderer') wanderers.push(doc.data());
        });
        return wanderers;
    },

    async createNewWandererInFirestore(user, name) {
        UIManager.showLoading("Menempa jiwa baru dalam Tenunan Kosmik...");
        
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

        const newWandererData = {
            userId: user.uid, email: user.email, name: name, role: 'wanderer', soulRank: 1, title: "The Awakened",
            xp: 0, alignment: { echo: 50, intention: 50 }, consistencyStreak: 0, essenceOfWill: 0,
            status: { id: 'neutral', text: 'Balanced', color: 'text-slate-400' },
            unlockedImprints: [],
            dailyRitual: {
                streak: 0, lastRiteDate: null, completedToday: false,
                orbs: [
                    { id: 'dawn', name: 'Fajar', ignited: false, window: [4, 7], icon: 'sunrise' }, { id: 'noon', name: 'Siang', ignited: false, window: [12, 14], icon: 'sun' }, { id: 'afternoon', name: 'Sore', ignited: false, window: [15, 17], icon: 'cloud' }, { id: 'dusk', name: 'Senja', ignited: false, window: [18, 19], icon: 'sunset' }, { id: 'night', name: 'Malam', ignited: false, window: [20, 22], icon: 'moon' }
                ]
            },
            attributes: [ 
                { name: 'Stamina', value: 2, xp: 0, xpToNext: 100 }, { name: 'Discipline', value: 2, xp: 0, xpToNext: 100 }, { name: 'Knowledge', value: 2, xp: 0, xpToNext: 100 }, { name: 'Social', value: 2, xp: 0, xpToNext: 100 }, { name: 'Focus', value: 2, xp: 0, xpToNext: 100 } 
            ],
            divineMandate: null,
            chronicle: [{ id: Date.now(), type: 'genesis', title: 'Kelahiran Kembali', reflection: `Jiwa ${name} terlahir di Gerbang Takdir, menjawab panggilan sunyi untuk menempa ulang sebuah takdir.`, timestamp: new Date().toISOString(), sigil: 'compass', isMeditatable: true }],
            inventory: [], activeBuffs: [], unlockedCodexEntries: defaultUnlockedCodex, codexProgress: initialCodexProgress
        };
        
        const userDocRef = doc(firestoreDB, "users", user.uid);
        await setDoc(userDocRef, newWandererData);
    },

    logout() {
        if (Wanderer && Wanderer.destinyClockInterval) clearInterval(Wanderer.destinyClockInterval);
        signOut(auth).catch(error => console.error("Logout error", error));
    },
};