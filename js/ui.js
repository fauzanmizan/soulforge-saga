// js/ui.js
export const UIManager = {
    showLoading(message = "Menempa Realitas...") {
        const loadingScreen = document.getElementById('loading-screen');
        const loadingText = document.getElementById('loading-text');
        if (loadingText) loadingText.textContent = message;
        if (loadingScreen) loadingScreen.classList.add('visible');
    },

    hideLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.classList.remove('visible');
    },

    render(container, content) {
        if (!container) return;
        while (container.firstChild) { container.removeChild(container.firstChild); }
        if (typeof content === 'string') { container.innerHTML = content; } 
        else { container.appendChild(content); }
        feather.replace(); // Selalu panggil setelah render
    },

    showError(element, message) {
        if (element) {
            element.textContent = message;
            element.style.opacity = 1;
        }
    },

    clearError(element) {
        if (element) {
            element.textContent = '';
            element.style.opacity = 0;
        }
    },

    showNotification(text, icon = 'award', colorClass = 'bg-gradient-to-r from-yellow-400 to-amber-400') {
        const banner = document.getElementById('notification-banner');
        const bannerText = document.getElementById('notification-text');
        const bannerIcon = document.getElementById('notification-icon');
        if(!banner || !bannerText || !bannerIcon) return;

        // Reset classes to avoid accumulation
        banner.className = 'notification-banner';
        banner.classList.add(colorClass);

        bannerIcon.setAttribute('data-feather', icon);
        feather.replace({ width: '1.25rem', height: '1.25rem' }); // Replace icon for notification
        bannerText.textContent = text;
        banner.classList.add('show');
        
        setTimeout(() => { banner.classList.remove('show'); }, 4000);
    },

    showModal(title, text, choices = []) {
        return new Promise(resolve => {
            const choiceButtons = choices.map((c, i) => `<button class="modal-choice-btn px-6 py-3 font-semibold rounded-lg ${c.isPrimary ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-slate-700 hover:bg-slate-600'}" data-index="${i}">${c.text}</button>`).join('') || `<button class="modal-choice-btn px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg" data-index="0">Acknowledge</button>`;
            const overlayContainer = document.getElementById('overlay-container');
            if (!overlayContainer) {
                console.error("Overlay container not found.");
                resolve(null);
                return;
            }
            const modalHTML = `<div id="dynamic-modal" class="modal-overlay fixed inset-0 bg-black bg-opacity-80 z-40 flex items-center justify-center p-8 opacity-0"><div class="modal-content bg-card-bg w-full max-w-2xl p-10 rounded-2xl shadow-2xl border border-border-color transform scale-95 opacity-0"><h2 class="text-3xl font-serif text-center text-white tracking-wider">${title}</h2><p class="text-center text-slate-400 mt-4 text-lg leading-relaxed">${text}</p><div id="choices-list" class="mt-8 flex justify-end space-x-4">${choiceButtons}</div></div></div>`;
            overlayContainer.innerHTML = modalHTML;

            const modal = document.getElementById('dynamic-modal');
            const modalContent = modal ? modal.querySelector('.modal-content') : null;

            feather.replace(); // PERBAIKAN: Panggil feather.replace() di sini

            const closeModal = (choice) => {
                if (!modal) return;
                modal.style.opacity = 0;
                if(modalContent) modalContent.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    if(overlayContainer) overlayContainer.innerHTML = '';
                    resolve(choice);
                }, 300);
            };

            if (modal) {
                modal.querySelectorAll('.modal-choice-btn').forEach(btn => {
                    btn.onclick = () => {
                        const choice = choices[btn.dataset.index];
                        closeModal(choice);
                    };
                });

                if (choices.length === 0) { 
                    // Jika tidak ada pilihan, klik di luar modal akan menutupnya
                    modal.onclick = (e) => {
                        if (e.target === modal) { // Hanya tutup jika klik langsung pada overlay, bukan konten modal
                            closeModal(null); 
                        }
                    }; 
                }
            }
            
            setTimeout(() => { 
                if (modal) modal.style.opacity = 1; 
                if (modalContent) {
                    modalContent.style.opacity = 1; 
                    modalContent.style.transform = 'scale(1)'; 
                }
            }, 10);
        });
    }
};