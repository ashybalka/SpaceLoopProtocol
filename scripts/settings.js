// =============== НАСТРОЙКИ ===============

function openSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.style.display = 'flex';
        syncSettingsValues();
    }
}

function syncSettingsValues() {
    const currentTheme = localStorage.getItem('gameTheme') || 'default';

    // Desktop modal
    const langSelect = document.getElementById('lang-select');
    if (langSelect) langSelect.value = currentLang;
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = currentTheme;

    // Mobile panel
    const mobileLangSelect = document.getElementById('mobile-lang-select');
    if (mobileLangSelect) mobileLangSelect.value = currentLang;
    const mobileThemeSelect = document.getElementById('mobile-theme-select');
    if (mobileThemeSelect) mobileThemeSelect.value = currentTheme;
}

function closeSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function resetLoop() {
    closeSettings();
    endLoop();
}

function onThemeChange() {
    const sel = document.getElementById('theme-select') || document.getElementById('mobile-theme-select');
    if (!sel) {
        console.error('Theme select not found');
        return;
    }
    const theme = sel.value;
    console.log('Theme changed to:', theme);
    applyTheme(theme);
}

function applyTheme(theme) {
    console.log('Applying theme:', theme);
    // Backwards compatibility: convert 'space' to 'default'
    if (theme === 'space') theme = 'default';
    localStorage.setItem('gameTheme', theme);

    // Remove all theme classes
    document.body.classList.remove('theme-dark');

    // Apply theme class only if not default
    if (theme !== 'default') {
        document.body.classList.add('theme-' + theme);
    }
    console.log('Body classes after theme apply:', document.body.classList);
    // Sync both selects
    if (typeof syncSettingsValues === 'function') {
        syncSettingsValues();
    }
}

function initTheme() {
    const theme = localStorage.getItem('gameTheme') || 'default';
    console.log('Init theme:', theme);
    applyTheme(theme);
}

function onLanguageChange() {
    const langSelect = document.getElementById('lang-select') || document.getElementById('mobile-lang-select');
    if (langSelect) {
        setLanguage(langSelect.value);
    }
}

function exportSave() {
    saveGame();
    const data = localStorage.getItem('cryoCapsuleGame');
    if (!data) return;
    const encoded = btoa(unescape(encodeURIComponent(data)));
    const blob = new Blob([encoded], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'spaceloop-save.txt';
    a.click();
    URL.revokeObjectURL(a.href);
}

function importSave() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const raw = ev.target.result.trim().replace(/[\r\n\s]/g, '');
                const binaryStr = atob(raw);
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) {
                    bytes[i] = binaryStr.charCodeAt(i);
                }
                const decoded = new TextDecoder('utf-8').decode(bytes);
                JSON.parse(decoded);
                if (!confirm(t('dialogs.importConfirm'))) return;
                _importingFlag = true;
                localStorage.setItem('cryoCapsuleGame', decoded);
                window.location.href = window.location.pathname + '?t=' + Date.now();
            } catch (err) {
                console.error('Import error:', err);
                alert(t('dialogs.importError'));
            }
        };
        reader.readAsText(file, 'utf-8');
    };
    input.click();
}
