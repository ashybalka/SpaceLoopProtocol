// =============== МОБИЛЬНЫЕ ТАБЫ ===============

function initMobileTabs() {
    const tabs = document.querySelectorAll('.mobile-tab');
    const panelLeft = document.querySelector('.panel');         // stats
    const mainArea = document.querySelector('.main-area');      // activities
    const rightPanels = document.querySelector('.right-panels'); // automation
    const mobileSettings = document.querySelector('.mobile-settings-panel'); // settings

    const sections = {
        stats: panelLeft,
        activities: mainArea,
        automation: rightPanels,
        settings: mobileSettings
    };

    function switchTab(tabName) {
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
        Object.entries(sections).forEach(([key, el]) => {
            if (el) el.classList.toggle('mobile-visible', key === tabName);
        });
        // Sync settings values when opening settings tab
        if (tabName === 'settings' && typeof syncSettingsValues === 'function') {
            syncSettingsValues();
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Default: show activities on mobile
    switchTab('activities');
}

// =============== МАСШТАБИРОВАНИЕ ===============

// Глобальная функция обновления зума
function updateZoom() {
    const BASE_WIDTH = 1500;
    const MIN_ZOOM = 0.65;
    const MAX_ZOOM = 1.4;
    const MOBILE_BREAKPOINT = 768;

    const w = window.innerWidth;
    let zoom = 1;

    if (w > MOBILE_BREAKPOINT) {
        zoom = Math.min(Math.max(w / BASE_WIDTH, MIN_ZOOM), MAX_ZOOM);
    }

    document.body.style.zoom = zoom;
}

function initScaling() {
    updateZoom();
    window.addEventListener('resize', updateZoom);
}

// =============== ОФФЛАЙН ПРИ НЕАКТИВНОЙ ВКЛАДКЕ ===============

let tabHiddenAt = null;

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        tabHiddenAt = Date.now();
        saveGame();
    } else if (tabHiddenAt) {
        const offlineSeconds = (Date.now() - tabHiddenAt) / 1000;
        tabHiddenAt = null;
        lastTimestamp = performance.now();
        if (offlineSeconds > 10) {
            const earned = Math.floor(offlineSeconds / 10);
            const added = Math.min(earned, game.maxNitrogen - game.nitrogen);
            if (added > 0) {
                game.nitrogen = Math.min(game.nitrogen + added, game.maxNitrogen);
                addLog(t('log.offlineNitrogen', { amount: added, time: formatOfflineTime(offlineSeconds) }), 'power');
            }
        }
    }
});

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
    initOxygenSaveTooltip();
    initStatBonusTooltip();
    startAutoSave();
    initTheme();
    initMobileTabs();
    initScaling();
    // Sync mobile settings values on init
    if (typeof syncSettingsValues === 'function') {
        syncSettingsValues();
    }
}

// Запуск игры
init().then(() => {
    requestAnimationFrame(gameLoop);
});
