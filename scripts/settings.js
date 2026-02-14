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
