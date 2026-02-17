// =============== СИСТЕМА ЛОКАЛИЗАЦИИ ===============
let translations = {};
let activityTranslations = {};
let currentLang = detectLanguage();

// Определяем язык системы
function detectLanguage() {
    const savedLang = localStorage.getItem('gameLanguage');
    if (savedLang && ['ru', 'en', 'de'].includes(savedLang)) {
        return savedLang;
    }
    const browserLang = navigator.language.slice(0, 2);
    if (['ru', 'en', 'de'].includes(browserLang)) {
        return browserLang;
    }
    return 'en';
}

// Глубокое слияние объектов
function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!target[key]) target[key] = {};
            deepMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
}

// Загрузка переводов
async function loadTranslations() {
    try {
        const [transResponse, actTransResponse, invTransResponse] = await Promise.all([
            fetch('translations.json'),
            fetch('activities-translations.json'),
            fetch('translations/inventory.json')
        ]);
        translations = await transResponse.json();
        activityTranslations = await actTransResponse.json();
        const inventoryTranslations = await invTransResponse.json();
        // Мержим переводы инвентаря в основные переводы
        deepMerge(translations, inventoryTranslations);
        currentLang = detectLanguage();
        console.log('Переводы загружены, язык:', currentLang);
    } catch (e) {
        console.error('Ошибка загрузки переводов:', e);
    }
}

// Получить перевод по ключу (поддерживает вложенные ключи: "ui.stats")
function t(key, params = {}) {
    const keys = key.split('.');
    let value = translations[currentLang];
    for (const k of keys) {
        if (value && value[k] !== undefined) {
            value = value[k];
        } else {
            // Fallback на русский
            value = translations['ru'];
            for (const k2 of keys) {
                if (value && value[k2] !== undefined) {
                    value = value[k2];
                } else {
                    return key;
                }
            }
            break;
        }
    }
    // Подстановка параметров {name}, {count} и т.д.
    if (typeof value === 'string') {
        return value.replace(/\{(\w+)\}/g, (_, p) => params[p] !== undefined ? params[p] : `{${p}}`);
    }
    return value || key;
}

// Получить перевод активности
function tActivity(activityId, field) {
    const lang = activityTranslations[currentLang];
    if (lang && lang[activityId] && lang[activityId][field]) {
        return lang[activityId][field];
    }
    // Fallback на русский
    const ruLang = activityTranslations['ru'];
    if (ruLang && ruLang[activityId] && ruLang[activityId][field]) {
        return ruLang[activityId][field];
    }
    return null;
}

// Сменить язык
function setLanguage(lang) {
    if (['ru', 'en', 'de'].includes(lang)) {
        currentLang = lang;
        localStorage.setItem('gameLanguage', lang);
        applyTranslations();
        renderActivities();
        renderAutomationQueue();
        updateUI();
        // Sync mobile settings panel
        if (typeof syncSettingsValues === 'function') {
            syncSettingsValues();
        }
    }
}

// Применить переводы к статичным элементам HTML
function applyTranslations() {
    // Заголовки панелей
    document.querySelector('.panel h2').textContent = '📊 ' + t('ui.stats');
    document.querySelector('.log-panel h2').textContent = '📝 ' + t('ui.eventLog');
    document.querySelector('.right-panels .panel h2').textContent = '🤖 ' + t('ui.automation');

    // Названия статов с иконками из переводов
    const statKeys = ['strength', 'intelligence', 'agility', 'endurance', 'perception'];
    statKeys.forEach(statKey => {
        const nameEl = document.querySelector(`#${statKey}-level`)?.closest('.stat-row')?.closest('.stat-block')?.querySelector('.stat-name');
        if (nameEl) {
            const icon = t(`statIcons.${statKey}`);
            nameEl.textContent = icon + ' ' + t(`stats.${statKey}`);
        }
    });

    // Кислород
    const oxygenText = document.getElementById('oxygen-label');
    if (oxygenText) {
        const timeSpan = document.getElementById('loop-time');
        const maxOxygen = game.loopTimeTotal.toFixed(1);
        oxygenText.innerHTML = `💨 ${t('ui.oxygen')}: <span id="loop-time">${timeSpan?.textContent || maxOxygen}</span>${t('time.seconds')} / <span id="loop-time-max">${maxOxygen}</span>${t('time.seconds')} <span id="oxygen-save-badge" class="oxygen-save-badge" style="display:none"></span>`;
    }

    // Автоматизация
    const autoBtn = document.getElementById('auto-mode-btn');
    if (autoBtn) {
        autoBtn.innerHTML = game.isAutoMode ? '⏸️ ' + t('ui.stop') : '▶️ ' + t('ui.start');
    }
    const automationLabel = document.querySelector('.automation-label');
    if (automationLabel) {
        automationLabel.textContent = t('ui.queue');
    }

    // Кнопка настроек
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.innerHTML = '⚙️ ' + t('ui.settings');
    }

    // Название главы
    const chapterTitle = document.getElementById('chapter-title');
    if (chapterTitle) {
        chapterTitle.textContent = getChapterName(game.currentChapter);
    }

    // Модальное окно настроек
    const modalTitle = document.querySelector('.modal-content h2');
    if (modalTitle) {
        modalTitle.innerHTML = '⚙️ ' + t('ui.settings');
    }
    const langLabel = document.querySelector('.settings-row label[data-i18n="ui.language"]');
    if (langLabel) {
        langLabel.textContent = t('ui.language');
    }
    const fontSizeLabel = document.querySelector('.settings-row label[data-i18n="ui.fontSize"]');
    if (fontSizeLabel) {
        fontSizeLabel.textContent = t('ui.fontSize');
    }
    const themeLabel = document.querySelector('.settings-row label[data-i18n="ui.theme"]');
    if (themeLabel) {
        themeLabel.textContent = t('ui.theme');
    }
    const resetLoopBtn = document.querySelector('.reset-loop-btn');
    if (resetLoopBtn) {
        resetLoopBtn.innerHTML = '🔁 ' + t('ui.resetLoop');
    }
    const resetBtn = document.querySelector('.reset-btn');
    if (resetBtn) {
        resetBtn.innerHTML = '🔄 ' + t('ui.resetGame');
    }
    const closeBtn = document.querySelector('#settings-modal .close-btn');
    if (closeBtn) {
        closeBtn.textContent = t('ui.close');
    }

    // Все элементы с data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = t(key);
        if (val && val !== key) {
            // Для option элементов используем textContent напрямую
            if (el.tagName === 'OPTION') {
                el.textContent = val;
            } else if (el.tagName === 'LABEL') {
                el.textContent = val;
            } else {
                el.textContent = val;
            }
        }
    });

    // Кнопки фильтра лога
    const filterAll = document.querySelector('.log-filter[data-filter="all"]');
    const filterComplete = document.querySelector('.log-filter[data-filter="complete"]');
    const filterHistory = document.querySelector('.log-filter[data-filter="history"]');
    const filterStat = document.querySelector('.log-filter[data-filter="stat"]');
    const filterPower = document.querySelector('.log-filter[data-filter="power"]');
    if (filterAll) filterAll.title = t('logFilters.all');
    if (filterComplete) filterComplete.title = t('logFilters.completions');
    if (filterHistory) filterHistory.title = t('logFilters.history');
    if (filterStat) filterStat.title = t('logFilters.system');
    if (filterPower) filterPower.title = t('logFilters.unlocks');

    // Все элементы с data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        const val = t(key);
        if (val && val !== key) {
            el.title = val;
        }
    });

    document.body.style.opacity = '1';
}
