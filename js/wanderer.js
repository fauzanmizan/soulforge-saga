// js/wanderer.js (VERSI FINAL YANG SUDAH DIPERBAIKI)
import { UIManager } from './ui.js';
import { SKILL_TREE_DATA, CODEX_DATA } from './gamedata.js';
// Chart.js dimuat secara global di wanderer.html, sehingga Chart tersedia di sini.

export const Wanderer = {
    app: null,
    destinyClockInterval: null,
    attributeChart: null,
    activePageId: 'character',

    init(appInstance) {
        this.app = appInstance;
        // Pastikan currentUser ada dan perannya benar sebelum melanjutkan
        if (!this.app.currentUser || this.app.currentUser.role !== 'wanderer') {
            this.app.logout(); 
            return;
        }
        
        this._checkAndResetDailyRitual();
        
        document.getElementById('wanderer-app').style.display = 'flex';
        this._setupNavEvents();
        this.startDestinyClock();
        
        this.render();
    },

    render() {
        if (!this.app.currentUser) return; // Pastikan currentUser masih ada
        this._applyResonanceAtmosphere();
        this._renderNav();
        this._renderHeader();
        this._renderPageContent();
        feather.replace(); // Pastikan ikon Feather di-render setelah konten dimuat
    },

    _renderNav() {
        const navContainer = document.getElementById('wanderer-nav');
        if (!navContainer) return;
        const navItems = [ 
            { id: 'character', name: 'Character', icon: 'user' },
            { id: 'quest_log', name: 'The Chronicle', icon: 'book-open' },
            { id: 'codex', name: 'The Codex', icon: 'book' },
            { id: 'skill_tree', name: 'Skill Tree', icon: 'git-branch' }
        ];
        const html = navItems.map(item => `
            <a href="#${item.id}" class="wanderer-nav-link sidebar-link flex items-center p-4 rounded-lg ${this.activePageId === item.id ? 'active' : ''}" data-page="${item.id}">
                <i data-feather="${item.icon}" class="w-6 h-6"></i>
                <span class="hidden lg:block ml-5 text-lg font-semibold">${item.name}</span>
            </a>
        `).join('');
        UIManager.render(navContainer, html);
    },

    _renderHeader() {
        const profileIcon = document.getElementById('wanderer-profile-icon');
        const headerTitle = document.querySelector('#wanderer-header-title h2');
        if (profileIcon) profileIcon.textContent = this.app.currentUser.name.charAt(0);
        if (headerTitle) headerTitle.textContent = this.activePageId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    },

    _renderPageContent() {
        const pageContainer = document.getElementById('wanderer-page-container');
        const template = document.getElementById(`template-${this.activePageId}`);
        
        if (!template) {
            if (pageContainer) pageContainer.innerHTML = `<p class="text-red-400">Konten untuk halaman '${this.activePageId}' sedang ditempa...</p>`;
            return;
        }

        const content = template.content.cloneNode(true);
        
        if (this.activePageId === 'character') this._populateCharacterPage(content);
        else if (this.activePageId === 'quest_log') this._populateChroniclePage(content);
        else if (this.activePageId === 'codex') this._populateCodexPage(content);

        if (pageContainer) UIManager.render(pageContainer, content);
        
        if (this.activePageId === 'character') this._renderAttributeChart(content);
        feather.replace(); // Panggil feather.replace() lagi setelah konten baru dirender
    },

    _setupNavEvents() {
        const navContainer = document.getElementById('wanderer-nav');
        if (navContainer) {
            navContainer.addEventListener('click', (e) => {
                const link = e.target.closest('.wanderer-nav-link');
                if (link) {
                    e.preventDefault();
                    this.activePageId = link.dataset.page;
                    this.render();
                }
            });
        }
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) logoutButton.onclick = () => this.app.logout();
    },

    _populateCharacterPage(content) {
        const user = this.app.currentUser;
        if (!user) return;

        // Pastikan elemen ada sebelum mencoba mengaksesnya
        const wandererNameDisplay = content.getElementById('wanderer-name-display');
        const wandererTitle = content.getElementById('wanderer-title');
        const playerStatusContainer = content.getElementById('player-status-container');
        const wandererScalesContainer = content.getElementById('wanderer-scales-container');
        const altarContainer = content.getElementById('wanderer-altar-container');
        const mandateContainer = content.getElementById('wanderer-mandate-container');
        const attributesXpList = content.getElementById('attributes-xp-list');

        if (wandererNameDisplay) wandererNameDisplay.textContent = user.name;
        if (wandererTitle) wandererTitle.textContent = `Peringkat Jiwa ${user.soulRank}: ${user.title}`;
        if (playerStatusContainer) playerStatusContainer.innerHTML = `<span class="${user.status.color}">${user.status.text}</span>`;
        
        const { echo, intention } = user.alignment;
        const total = echo + intention;
        const intentionRatio = total > 0 ? (intention / total) : 0.5;
        const rotation = (intentionRatio - 0.5) * -20;
        if (wandererScalesContainer) {
            wandererScalesContainer.innerHTML = `<div class="flex items-center justify-between text-xs font-bold uppercase tracking-widest"><span class="text-slate-400">Echo</span><span class="text-indigo-400">Intention</span></div><div class="relative w-full h-10 flex items-center mt-2"><div class="scales-beam" style="transform: rotate(${rotation}deg);"><div id="pan-echo" class="scales-pan"><i data-feather="zap-off" class="h-4 w-4 text-slate-400"></i></div><div id="pan-intention" class="scales-pan"><i data-feather="sun" class="h-4 w-4 text-indigo-300"></i></div></div></div>`;
        }

        if (altarContainer) {
            altarContainer.innerHTML = user.dailyRitual.orbs.map(orb => {
                const currentHour = new Date().getHours();
                const isWithinWindow = currentHour >= orb.window[0] && currentHour < orb.window[1];
                const isDisabled = orb.ignited || !isWithinWindow;
                return `<div class="orb ${orb.ignited ? 'ignited' : ''} ${isDisabled ? 'disabled' : ''} ${isWithinWindow && !orb.ignited ? 'active-window' : ''}" data-orb-id="${orb.id}" title="${orb.name}"><i data-feather="${orb.icon}" class="h-6 w-6 ${orb.ignited ? 'text-yellow-700' : 'text-slate-500'}"></i></div>`;
            }).join('');
            altarContainer.querySelectorAll('.orb:not(.disabled)').forEach(orbEl => orbEl.onclick = () => this._handleRiteOfReckoning(orbEl.dataset.orbId));
        }

        const mandate = user.divineMandate;
        if (mandateContainer) {
            if (mandate && !mandate.completed) {
                mandateContainer.innerHTML = `<p class="text-lg font-semibold text-slate-300">${mandate.title}</p><p class="text-slate-400 mb-4">${mandate.description}</p><div class="flex items-center"><input type="checkbox" id="mandate-checkbox" class="h-6 w-6 rounded border-slate-500 text-indigo-500 bg-slate-700 focus:ring-0"><label for="mandate-checkbox" class="ml-3 text-lg">Tandai sebagai selesai (+${mandate.xpReward} XP)</label></div>`;
                const mandateCheckbox = mandateContainer.querySelector('#mandate-checkbox');
                if (mandateCheckbox) mandateCheckbox.onchange = (e) => { if(e.target.checked) this._handleCompleteMandate(); };
                if (!mandate.seen) { 
                    this.unlockCodexEntry('codex_mandates'); // Pastikan 'codex_mandates' ada di CODEX_DATA jika ini ingin di-unlock
                    user.divineMandate.seen = true;
                    // Simpan perubahan 'seen' di mandate
                    this.app.updateUserField(user.userId, 'divineMandate', user.divineMandate);
                }
            } else {
                mandateContainer.innerHTML = `<p class="text-slate-500 italic">The Primordial Weaver has not yet woven your thread for this cycle.</p>`;
            }
        }
        
        if (attributesXpList) {
            attributesXpList.innerHTML = user.attributes.map(attr => {
                const progress = (attr.xp / attr.xpToNext) * 100;
                return `<div><div class="flex justify-between items-center mb-1"><span class="font-bold text-slate-300">${attr.name}</span><span class="text-sm font-mono text-slate-400">Lvl ${attr.value}</span></div><div class="attribute-xp-bar"><div class="attribute-xp-bar-inner" style="width: ${progress}%"></div></div></div>`;
            }).join('');
        }
    },

    _renderAttributeChart(content) {
        const ctx = content.querySelector('#wanderer-attribute-chart');
        if (!ctx) return;
        const labels = this.app.currentUser.attributes.map(a => a.name);
        const data = this.app.currentUser.attributes.map(a => a.value);

        if (this.attributeChart) this.attributeChart.destroy();

        // Pastikan Chart sudah dimuat secara global
        if (typeof Chart !== 'undefined') {
            this.attributeChart = new Chart(ctx, {
                type: 'radar',
                data: { labels: labels, datasets: [{ label: 'Attributes', data: data, backgroundColor: 'rgba(129, 140, 248, 0.2)', borderColor: 'rgba(129, 140, 248, 1)', pointBackgroundColor: 'rgba(129, 140, 248, 1)', pointBorderColor: '#fff', pointHoverBackgroundColor: '#fff', pointHoverBorderColor: 'rgba(129, 140, 248, 1)' }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { r: { angleLines: { color: 'rgba(255, 255, 255, 0.2)' }, grid: { color: 'rgba(255, 255, 255, 0.2)' }, pointLabels: { color: '#fff', font: { family: "'Cormorant Garamond', serif", size: 14 } }, ticks: { color: 'rgba(255, 255, 255, 0.7)', backdropColor: 'transparent', stepSize: 2, beginAtZero: true } } }, plugins: { legend: { display: false } } }
            });
        } else {
            console.warn("Chart.js library not found. Attribute chart cannot be rendered.");
        }
    },

    _populateChroniclePage(content) {
        const container = content.querySelector('#chronicle-container');
        const template = document.getElementById('template-chronicle-entry');
        if (!container || !template) return;
        
        container.innerHTML = '';
        // Pastikan chronicle adalah array sebelum disortir
        const sortedChronicle = [...(this.app.currentUser.chronicle || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        sortedChronicle.forEach(entry => {
            const clone = template.content.cloneNode(true);
            const entryDiv = clone.querySelector('.chronicle-entry');
            if (entry.type === 'prophecy') entryDiv.classList.add('prophecy-entry');

            const sigilElement = clone.querySelector('.sigil');
            const timestampElement = clone.querySelector('.entry-timestamp');
            const titleElement = clone.querySelector('.entry-title');
            const reflectionElement = clone.querySelector('.entry-reflection');
            const actionsContainer = clone.querySelector('.entry-actions');

            if (sigilElement) sigilElement.setAttribute('data-feather', entry.sigil || 'circle');
            if (timestampElement) timestampElement.textContent = new Date(entry.timestamp).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
            if (titleElement) titleElement.textContent = entry.title;
            if (reflectionElement) reflectionElement.innerHTML = this._parseCodexContent(entry.reflection);

            if (entry.isMeditatable && actionsContainer) {
                const meditateBtn = document.createElement('button');
                meditateBtn.className = 'action-button';
                meditateBtn.innerHTML = `<i data-feather="zap" class="w-4 h-4 inline-block mr-1"></i> Meditate`;
                meditateBtn.onclick = () => this._handleMeditate(entry.id);
                actionsContainer.appendChild(meditateBtn);
            }
            container.appendChild(clone);
        });
        feather.replace(); // Render ikon Feather di entri kronik
    },

    _populateCodexPage(content) {
        const container = content.querySelector('#codex-chapters-container');
        const entryTemplate = document.getElementById('template-codex-entry');
        if (!container || !entryTemplate) return;

        container.innerHTML = '';
        for (const chapterTitle in CODEX_DATA) {
            const chapterDiv = document.createElement('div');
            chapterDiv.className = 'mb-8';
            chapterDiv.innerHTML = `<h3 class="text-2xl font-serif text-indigo-400 mb-4">${chapterTitle}</h3>`;
            
            CODEX_DATA[chapterTitle].forEach(entry => {
                const clone = entryTemplate.content.cloneNode(true);
                const entryElement = clone.querySelector('.codex-entry');
                if (!entryElement) return; // Safeguard

                entryElement.dataset.entryId = entry.id;
                const titleElement = clone.querySelector('.codex-title');
                const titleText = clone.querySelector('.title-text');
                const contentElement = clone.querySelector('.codex-content');
                const lockIcon = clone.querySelector('.icon-lock');
                const chevronIcon = clone.querySelector('.icon-chevron');

                if (titleText) titleText.textContent = entry.title;
                
                const isUnlocked = this.app.currentUser.unlockedCodexEntries.includes(entry.id);

                if (isUnlocked) {
                    entryElement.classList.add('unlocked');
                    if (lockIcon) lockIcon.style.display = 'none';
                    if (chevronIcon) chevronIcon.style.display = 'inline-block';

                    const currentStage = (this.app.currentUser.codexProgress || {})[entry.id] || 0;
                    const contentData = entry.content[currentStage] || entry.content[0];
                    if (contentElement) contentElement.innerHTML = this._parseCodexContent(contentData.text);

                    if (titleElement) {
                        titleElement.onclick = () => {
                            const contentDiv = titleElement.nextElementSibling;
                            if (contentDiv) {
                                const isOpen = contentDiv.style.maxHeight && contentDiv.style.maxHeight !== "0px";
                                if (isOpen) {
                                    contentDiv.style.maxHeight = "0px";
                                } else {
                                    contentDiv.style.maxHeight = contentDiv.scrollHeight + "px";
                                }
                                entryElement.classList.toggle('open');
                            }
                        };
                    }
                    // Auto-expand if it's the current active entry
                    if (entryElement.classList.contains('open') && contentElement) {
                         contentElement.style.maxHeight = contentElement.scrollHeight + "px";
                    }
                } else {
                    entryElement.classList.add('locked');
                    if (lockIcon) lockIcon.style.display = 'inline-block';
                    if (chevronIcon) chevronIcon.style.display = 'none';
                }
                chapterDiv.appendChild(clone);
            });
            container.appendChild(chapterDiv);
        }
        
        container.addEventListener('click', async (e) => {
            const link = e.target.closest('.codex-link');
            if (link) {
                e.preventDefault();
                const targetId = link.dataset.codexId;
                await this.unlockCodexEntry(targetId);
                // Setelah unlock, render ulang untuk memastikan UI terupdate
                this.render(); 
                // Cari lagi elemennya setelah di-render ulang
                const targetEntry = container.querySelector(`.codex-entry[data-entry-id="${targetId}"]`);
                if (targetEntry && targetEntry.classList.contains('unlocked')) {
                    // Jika belum terbuka, picu klik untuk membukanya
                    if(!targetEntry.classList.contains('open')) {
                        const titleEl = targetEntry.querySelector('.codex-title');
                        if (titleEl) titleEl.click();
                    }
                    targetEntry.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
        feather.replace(); // Render ikon Feather di halaman Codex
    },

    async _handleRiteOfReckoning(orbId) {
        const rite = { prompt: 'Gema Ketidaksabaran muncul. Bagaimana kau merespon?', choices: [ { text: 'Aku menyerah.', intention: 0, echo: 20 }, { text: 'Aku menahan diri.', intention: 15, echo: 5, organicXp: { attr: 'Discipline', amount: 2 } }, { text: 'Aku mengalihkannya.', intention: 25, echo: 0, organicXp: { attr: 'Stamina', amount: 1 } } ] };
        const chosen = await UIManager.showModal('The Rite of Reckoning', rite.prompt, rite.choices);
        if (chosen) {
            this.app.currentUser.alignment.echo += chosen.echo;
            this.app.currentUser.alignment.intention += chosen.intention;
            const orb = this.app.currentUser.dailyRitual.orbs.find(o => o.id === orbId);
            if(orb) orb.ignited = true;
            if(chosen.organicXp) this._gainAttributeXp(chosen.organicXp.attr, chosen.organicXp.amount);
            
            this._checkDailyRitualCompletion();
            await this._updateWorldResonance();
            await this.app.saveCurrentUser(false); // Simpan perubahan alignment, orb, xp

            this.render(); // Render ulang halaman setelah aksi
        }
    },

    async _handleCompleteMandate() {
        const user = this.app.currentUser;
        const mandate = user.divineMandate;
        if (!mandate || mandate.completed) return;
        
        mandate.completed = true;
        this._gainAttributeXp(mandate.attribute, mandate.xpReward);
        
        // PERBAIKAN: Panggil updateUserField dengan userId yang benar
        await this.app.updateUserField(user.userId, 'divineMandate', mandate);
        await this.app.updateUserField(user.userId, 'attributes', user.attributes);
        UIManager.showNotification("Titah telah diselesaikan! Takdirmu bergeser.", "check-circle");
        this.render(); // Render ulang setelah menyelesaikan mandat
    },
    
    async _handleMeditate(entryId) {
        const user = this.app.currentUser;
        user.activeBuffs = user.activeBuffs || [];
        const buff = { id: `buff_${entryId}`, name: 'Memory Clarity', expires: Date.now() + 3600000 };
        user.activeBuffs.push(buff);
        
        // PERBAIKAN: Panggil updateUserField dengan userId yang benar
        await this.app.updateUserField(user.userId, 'activeBuffs', user.activeBuffs);
        UIManager.showNotification("Anda merasakan pencerahan dari masa lalu...", "zap");
        this.render(); // Render ulang setelah meditasi
    },

    _gainAttributeXp(attributeName, amount) {
        const attr = this.app.currentUser.attributes.find(a => a.name === attributeName);
        if (!attr) return;
        
        let isLevelUp = false;
        attr.xp += amount;
        if (attr.xp >= attr.xpToNext) {
            isLevelUp = true;
            attr.value++;
            attr.xp -= attr.xpToNext;
            attr.xpToNext = Math.floor(attr.xpToNext * 1.5);
            UIManager.showNotification(`Attribute Increased: ${attributeName} is now Level ${attr.value}!`, 'chevrons-up');
        }
        if (isLevelUp) this.unlockCodexEntry('codex_attributes'); // Pastikan 'codex_attributes' ada
        // Perlu juga menyimpan perubahan atribut ke Firestore secara langsung
        this.app.saveCurrentUser(false); // Simpan perubahan atribut
    },

    _checkAndResetDailyRitual() {
        const user = this.app.currentUser;
        if(!user || !user.dailyRitual) return;
        const now = new Date();
        const lastRite = user.dailyRitual.lastRiteDate ? new Date(user.dailyRitual.lastRiteDate) : null;
        if (!lastRite || lastRite.toDateString() !== now.toDateString()) {
            user.dailyRitual.orbs.forEach(orb => orb.ignited = false);
            user.dailyRitual.completedToday = false;
            // Hanya reset streak jika ada hari yang terlewat
            if (lastRite) {
                const yesterday = new Date(now);
                yesterday.setDate(now.getDate() - 1);
                if (lastRite.toDateString() !== yesterday.toDateString()) {
                     user.dailyRitual.streak = 0;
                }
            }
            // Simpan perubahan ritual harian setelah reset
            this.app.saveCurrentUser(false);
        }
    },
    
    _checkDailyRitualCompletion() {
        const user = this.app.currentUser;
        if (user.dailyRitual.completedToday) return;
        const allOrbsIgnited = user.dailyRitual.orbs.every(orb => orb.ignited);
        if (allOrbsIgnited) {
            user.essenceOfWill = (user.essenceOfWill || 0) + 1;
            user.dailyRitual.streak = (user.dailyRitual.streak || 0) + 1;
            user.dailyRitual.completedToday = true;
            user.dailyRitual.lastRiteDate = new Date().toISOString();
            UIManager.showNotification(`Ritual Harian Sempurna! +1 Essence of Will. (Streak: ${user.dailyRitual.streak} hari)`, 'sun', 'bg-gradient-to-r from-amber-400 to-yellow-500');
            this.app.saveCurrentUser(false); // Simpan perubahan ritual
        }
    },
    
    async _updateWorldResonance() {
        const { echo, intention } = this.app.currentUser.alignment;
        const total = echo + intention;
        const intentionRatio = total > 0 ? intention / total : 0.5;
        let newResonance = 'Neutral';
        if (intentionRatio > 0.7) newResonance = 'Harmonious';
        else if (intentionRatio < 0.3) newResonance = 'Discordant';
        
        if (newResonance !== this.app.worldState.resonance) {
            await this.app.updateWorldState('resonance', newResonance);
            UIManager.showNotification(`Atmosfer dunia bergeser menjadi... ${newResonance}`, 'globe');
            this._applyResonanceAtmosphere(); // Terapkan perubahan atmosfer segera
        }
    },

    _applyResonanceAtmosphere() {
        const resonance = this.app.worldState.resonance || 'Neutral';
        const body = document.body;
        body.classList.remove('resonance-harmonious', 'resonance-discordant', 'resonance-neutral');
        body.classList.add(`resonance-${resonance.toLowerCase()}`);
    },

    async unlockCodexEntry(entryId) {
        const user = this.app.currentUser;
        if (!user.unlockedCodexEntries) user.unlockedCodexEntries = [];
        if (user.unlockedCodexEntries.includes(entryId)) return;

        user.unlockedCodexEntries.push(entryId);
        user.codexProgress = user.codexProgress || {};
        user.codexProgress[entryId] = 0;

        let entryData = null;
        for (const chapter in CODEX_DATA) {
            const found = CODEX_DATA[chapter].find(e => e.id === entryId);
            if (found) { entryData = found; break; }
        }

        if (entryData && entryData.firstReadReward) {
            const reward = entryData.firstReadReward;
            this._gainAttributeXp(reward.attribute, reward.amount);
            UIManager.showNotification(`Pengetahuan Terungkap: ${entryData.title} (+${reward.amount} ${reward.attribute} XP)!`, 'unlock', 'bg-gradient-to-r from-sky-400 to-cyan-400');
        } else if (entryData) {
            UIManager.showNotification(`Pengetahuan Terungkap: ${entryData.title}!`, 'unlock', 'bg-gradient-to-r from-sky-400 to-cyan-400');
        }

        // PERBAIKAN: Panggil updateUserField dengan userId yang benar
        await this.app.updateUserField(user.userId, 'unlockedCodexEntries', user.unlockedCodexEntries);
        await this.app.updateUserField(user.userId, 'codexProgress', user.codexProgress);
        this.render(); // Render ulang setelah unlock untuk menampilkan perubahan
    },
    
    _parseCodexContent(text) {
        if (!text) return '';
        const regex = /\[\[(.*?)\]\]/g;
        return text.replace(regex, (match, content) => {
            const parts = content.split('|');
            const id = parts[0].trim();
            const linkText = parts.length > 1 ? parts[1].trim() : id.replace('codex_', '').replace(/_/g, ' ');
            return `<a href="#" class="codex-link font-bold text-indigo-400 hover:underline" data-codex-id="${id}">${linkText}</a>`;
        });
    },

    startDestinyClock() {
        if (this.destinyClockInterval) clearInterval(this.destinyClockInterval);
        const clockElement = document.getElementById('destiny-clock');
        if (!clockElement || !this.app.worldState.apotheosisDate) return;
        const targetDate = new Date(this.app.worldState.apotheosisDate).getTime();
        this.destinyClockInterval = setInterval(() => {
            const now = new Date().getTime();
            const distance = targetDate - now;
            if (distance < 0) {
                clockElement.innerHTML = "<div>The Final Day has come.</div>";
                clearInterval(this.destinyClockInterval);
                return;
            }
            const years = Math.floor(distance / (1000 * 60 * 60 * 24 * 365));
            const days = Math.floor((distance % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            
            const formatNumber = (num, length) => String(num).padStart(length, '0');

            clockElement.innerHTML = `
               <div>${formatNumber(years, 2)}y : ${formatNumber(days, 3)}d</div>
               <div class="text-lg">${formatNumber(hours, 2)}h : ${formatNumber(minutes, 2)}m</div>`;
        }, 1000);
    },
};