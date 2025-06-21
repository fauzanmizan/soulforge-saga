// js/forger.js
import { UIManager } from './ui.js';
import { collection, getDocs, query, doc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firestoreDB } from './app.js';

export const Forger = {
    app: null,
    allWanderers: [],
    activePageId: 'observatory',
    selectedWandererId: null, // Ubah dari name menjadi ID untuk identifikasi unik
    selectedWandererName: null, // Tetap untuk display
    wanderersListenerUnsubscribe: null,

    init(appInstance) {
        this.app = appInstance;
        if (!this.app.currentUser || this.app.currentUser.role !== 'forger') {
            this.app.logout();
            return;
        }

        document.getElementById('forger-app').style.display = 'flex';
        this._setupNavEvents();
        this._listenToAllWanderers();
        // Initial render to ensure UI is displayed quickly
        this.render(); 
    },

    render() {
        if (!this.app.currentUser) return;
        this._renderNav();
        this._renderHeader();
        this._renderPageContent();
        feather.replace(); // Pastikan ikon Feather di-render setelah konten dimuat
    },
    
    _listenToAllWanderers() {
        if (this.wanderersListenerUnsubscribe) this.wanderersListenerUnsubscribe();
        
        const usersCollectionRef = collection(firestoreDB, "users");
        const q = query(usersCollectionRef);

        UIManager.showLoading("Mengamati seluruh jiwa...");
        this.wanderersListenerUnsubscribe = onSnapshot(q, (querySnapshot) => {
            this.allWanderers = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.role === 'wanderer') {
                    this.allWanderers.push({ ...data, userId: doc.id }); // Pastikan userId disimpan
                }
            });
            this.render();
            UIManager.hideLoading();
        }, (error) => {
            console.error("Gagal mendengarkan data wanderer: ", error);
            UIManager.hideLoading();
            UIManager.showNotification("Gagal memuat data pengembara.", "alert-triangle", "bg-red-500");
        });
    },

    _renderNav() {
        const navContainer = document.getElementById('forger-nav');
        if (!navContainer) return;
        const navItems = [{ id: 'observatory', name: 'Observatorium', icon: 'eye' }];
        const html = navItems.map(item => `<a href="#${item.id}" class="forger-nav-link sidebar-link flex items-center p-4 rounded-lg ${this.activePageId === item.id ? 'active' : ''}" data-page="${item.id}"><i data-feather="${item.icon}" class="w-6 h-6"></i><span class="hidden lg:block ml-5 text-lg font-semibold">${item.name}</span></a>`).join('');
        UIManager.render(navContainer, html);
    },

    _renderHeader() {
        const headerTitle = document.querySelector('#forger-header-title h2');
        if (!headerTitle) return;
        let title = 'Observatorium Kosmik';
        if (this.activePageId === 'wanderer_detail' && this.selectedWandererName) {
            title = `Kitab Jiwa: ${this.selectedWandererName}`;
        }
        headerTitle.textContent = title;
    },
    
    _renderPageContent() {
        const pageContainer = document.getElementById('forger-page-container');
        const template = document.getElementById(`template-${this.activePageId}`);
        if (!pageContainer) return;

        if (!template) {
            pageContainer.innerHTML = `<p class="text-red-400">Konten untuk halaman '${this.activePageId}' sedang ditempa...</p>`;
            return;
        }
        
        const content = template.content.cloneNode(true);
        
        if (this.activePageId === 'observatory') {
            this._populateObservatory(content);
        } else if (this.activePageId === 'wanderer_detail') {
            const wanderer = this.allWanderers.find(w => w.userId === this.selectedWandererId); // Cari berdasarkan ID
            if (wanderer) this._populateWandererDetail(content, wanderer);
            else {
                pageContainer.innerHTML = `<p class="text-red-400">Pengembara tidak ditemukan atau telah dihapus.</p>`;
                this.activePageId = 'observatory'; // Kembali ke observatorium jika tidak ditemukan
                // this.render(); // Re-render untuk menampilkan observatory
            }
        }
        
        UIManager.render(pageContainer, content);
        feather.replace(); // Panggil feather.replace() lagi setelah konten baru dirender
    },

    _setupNavEvents() {
        const navContainer = document.getElementById('forger-nav');
        if (navContainer) {
            navContainer.addEventListener('click', (e) => {
                const link = e.target.closest('.forger-nav-link');
                if (link) {
                    e.preventDefault();
                    this.activePageId = link.dataset.page;
                    this.selectedWandererId = null; // Reset selected wanderer
                    this.selectedWandererName = null;
                    this.render();
                }
            });
        }
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) logoutButton.onclick = () => this.app.logout();
    },

    _populateObservatory(content) {
        const tbody = content.querySelector('#wanderer-list-body');
        if(!tbody) return;
        
        const wanderers = this.allWanderers;
        if (wanderers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-slate-500">Belum ada jiwa yang menyerahkan diri.</td></tr>`;
            return;
        }
        tbody.innerHTML = wanderers
            .sort((a, b) => b.soulRank - a.soulRank)
            .map(w => `<tr class="border-b border-border-color hover:bg-slate-800 transition-colors cursor-pointer" data-wanderer-id="${w.userId}" data-wanderer-name="${w.name}"><td class="p-4 font-bold text-lg text-slate-100">${w.name}</td><td class="p-4 font-mono text-slate-300">${w.soulRank}</td><td class="p-4 text-indigo-400 font-semibold">${w.title}</td></tr>`).join('');
        
        tbody.querySelectorAll('tr').forEach(row => {
            row.onclick = () => {
                const wandererId = row.dataset.wandererId;
                const wandererName = row.dataset.wandererName;
                if(wandererId && wandererName) {
                    this.activePageId = 'wanderer_detail';
                    this.selectedWandererId = wandererId;
                    this.selectedWandererName = wandererName;
                    this.render();
                }
            };
        });
    },

    _populateWandererDetail(content, wanderer) {
        // Pastikan elemen ada sebelum diakses
        const detailName = content.getElementById('detail-name');
        const detailTitle = content.getElementById('detail-title');
        const detailIntentionBar = content.getElementById('detail-intention-bar');
        const detailIntentionText = content.getElementById('detail-intention-text');
        const detailStats = content.getElementById('detail-stats');
        const currentMandateDisplay = content.getElementById('current-mandate-display');
        const mandateAttrSelect = content.getElementById('mandate-attr');
        const backButton = content.getElementById('back-to-observatory');
        const forgeMandateButton = content.getElementById('forge-mandate-button');

        if (detailName) detailName.textContent = wanderer.name;
        if (detailTitle) detailTitle.textContent = `Peringkat Jiwa ${wanderer.soulRank}: ${wanderer.title}`;
        
        const alignment = wanderer.alignment || { echo: 0, intention: 0 };
        const total = alignment.echo + alignment.intention;
        const intentionRatio = total > 0 ? (alignment.intention / total * 100).toFixed(1) : 50;
        if (detailIntentionBar) detailIntentionBar.style.width = `${intentionRatio}%`;
        if (detailIntentionText) detailIntentionText.textContent = `${intentionRatio}% Intention`;
        
        if (detailStats) {
            detailStats.innerHTML = `<div class="flex justify-between"><span class="text-slate-400">Total XP:</span><span class="font-mono text-white">${wanderer.xp || 0}</span></div><div class="flex justify-between"><span class="text-slate-400">Streak:</span><span class="font-mono text-white">${(wanderer.dailyRitual || {}).streak || 0} Hari</span></div><div class="flex justify-between"><span class="text-slate-400">Esensi Niat:</span><span class="font-mono text-white">${wanderer.essenceOfWill || 0}</span></div>`;
        }

        const currentMandate = wanderer.divineMandate;
        if (currentMandateDisplay) {
            currentMandateDisplay.textContent = currentMandate && !currentMandate.completed ? `${currentMandate.title}: ${currentMandate.description}` : 'Tidak ada titah aktif.';
        }
        
        const attributes = ["Stamina", "Discipline", "Knowledge", "Social", "Focus"];
        if (mandateAttrSelect) mandateAttrSelect.innerHTML = attributes.map(attr => `<option value="${attr}">${attr}</option>`).join('');
        
        if (backButton) backButton.onclick = () => { this.activePageId = 'observatory'; this.render(); };
        if (forgeMandateButton) forgeMandateButton.onclick = () => this._handleForgeMandate(wanderer.userId);
    },

    async _handleForgeMandate(wandererId) {
        const titleInput = document.getElementById('mandate-title');
        const descriptionInput = document.getElementById('mandate-desc');
        const attributeSelect = document.getElementById('mandate-attr');
        const xpInput = document.getElementById('mandate-xp');

        if (!titleInput || !descriptionInput || !attributeSelect || !xpInput) {
            UIManager.showNotification('Elemen formulir titah tidak ditemukan.', 'alert-triangle', 'bg-red-500');
            return;
        }

        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();
        const attribute = attributeSelect.value;
        const xpReward = parseInt(xpInput.value);

        if (!title || !description) return UIManager.showModal('Gagal Menempa', 'Judul dan Deskripsi Titah tidak boleh kosong.');
        if (isNaN(xpReward) || xpReward <= 0) return UIManager.showModal('Gagal Menempa', 'Hadiah XP harus berupa angka positif.');
        
        const newMandate = { id: `mandate_${Date.now()}`, title, description, attribute, xpReward, completed: false, assignedAt: new Date().toISOString(), seen: false };
        
        UIManager.showLoading("Menganugerahkan titah baru...");
        try {
            // PERBAIKAN: Panggil updateUserField dengan userId yang benar
            await this.app.updateUserField(wandererId, 'divineMandate', newMandate);
            UIManager.showNotification('Titah baru telah dianugerahkan!', 'award');
            // Opsional: Setelah anugerah, mungkin ingin kembali ke daftar atau me-refresh detail wanderer
            // this.render(); // Ini akan di-trigger oleh listener onSnapshot secara otomatis
        } catch (error) {
            console.error("Gagal menganugerahkan titah:", error);
            UIManager.showNotification('Gagal menganugerahkan titah. Coba lagi.', 'alert-triangle', 'bg-red-500');
        } finally {
            UIManager.hideLoading();
        }
    },
};