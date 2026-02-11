// =============== НАСТРОЙКИ ===============

function openSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.style.display = 'flex';
        const langSelect = document.getElementById('lang-select');
        if (langSelect) langSelect.value = currentLang;
    }
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

function onLanguageChange() {
    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
        setLanguage(langSelect.value);
    }
}
