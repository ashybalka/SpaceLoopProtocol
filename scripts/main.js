// =============== МОБИЛЬНЫЕ ТАБЫ ===============

function initMobileTabs() {
    const tabs = document.querySelectorAll('.mobile-tab');
    const panelLeft = document.querySelector('.panel');         // stats
    const mainArea = document.querySelector('.main-area');      // activities
    const rightPanels = document.querySelector('.right-panels'); // automation
    const settingsBtn = document.getElementById('settings-btn');

    const sections = {
        stats: panelLeft,
        activities: mainArea,
        automation: rightPanels
    };

    function switchTab(tabName) {
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
        Object.entries(sections).forEach(([key, el]) => {
            if (el) el.classList.toggle('mobile-visible', key === tabName);
        });
        // Settings button visible with stats
        if (settingsBtn) settingsBtn.classList.toggle('mobile-visible', tabName === 'stats');
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Default: show activities on mobile
    switchTab('activities');
}

// =============== МАСШТАБИРОВАНИЕ ===============

function initScaling() {
    const BASE_WIDTH = 1500; // дизайн рассчитан на эту ширину
    const MIN_ZOOM = 0.65;
    const MAX_ZOOM = 1.4;
    const MOBILE_BREAKPOINT = 768;

    function updateZoom() {
        const w = window.innerWidth;
        if (w <= MOBILE_BREAKPOINT) {
            document.body.style.zoom = '';
            return;
        }
        const zoom = Math.min(Math.max(w / BASE_WIDTH, MIN_ZOOM), MAX_ZOOM);
        document.body.style.zoom = zoom;
    }

    updateZoom();
    window.addEventListener('resize', updateZoom);
}

// =============== ИНИЦИАЛИЗАЦИЯ ===============

async function init() {
    await loadTranslations();
    await loadActivities();
    loadGame();
    applyTranslations();
    renderActivities();
    renderAutomationQueue();
    updateUI();
    initLogFilters();
    startAutoSave();
    initMobileTabs();
    initScaling();
}

// Запуск игры
init().then(() => {
    requestAnimationFrame(gameLoop);
});
