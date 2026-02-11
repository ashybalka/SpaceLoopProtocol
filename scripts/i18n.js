// =============== СИСТЕМА ЛОКАЛИЗАЦИИ ===============
let translations = {};
let activityTranslations = {};
let currentLang = 'ru';

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
    }
}

// Применить переводы к статичным элементам HTML
function applyTranslations() {
    // Заголовки панелей
    document.querySelector('.panel h2').textContent = '📊 ' + t('ui.stats');
    document.querySelector('.log-panel h2').textContent = '📝 ' + t('ui.eventLog');
    document.querySelector('.right-panels .panel h2').textContent = '⚙️ ' + t('ui.automation');

    // Названия статов с иконками из переводов
    const statKeys = ['strength', 'intelligence', 'agility', 'endurance', 'perception'];
    document.querySelectorAll('.stat-name').forEach(el => {
        const statKey = el.closest('.stat-block')?.querySelector('[id$="-level"]')?.id.replace('-level', '');
        if (statKey && statKeys.includes(statKey)) {
            const icon = t(`statIcons.${statKey}`);
            el.textContent = icon + ' ' + t(`stats.${statKey}`);
        }
    });

    // Подписи опыта
    const statBlocks = document.querySelectorAll('.stat-block');
    statBlocks.forEach(block => {
        const sublabels = block.querySelectorAll('.stat-sublabel');
        if (sublabels.length >= 2) {
            const loopSpan = sublabels[0].querySelector('span');
            if (loopSpan) {
                sublabels[0].innerHTML = t('ui.loopExp') + ': <span id="' + loopSpan.id + '">' + loopSpan.textContent + '</span>';
            }
            const permSpan = sublabels[1].querySelector('span');
            if (permSpan) {
                sublabels[1].innerHTML = t('ui.permanent') + ': <span id="' + permSpan.id + '">' + permSpan.textContent + '</span>';
            }
        }
    });

    // Кислород
    const oxygenText = document.getElementById('oxygen-label');
    if (oxygenText) {
        const timeSpan = document.getElementById('loop-time');
        const maxOxygen = game.loopTimeTotal.toFixed(1);
        oxygenText.innerHTML = `💨 ${t('ui.oxygen')}: <span id="loop-time">${timeSpan?.textContent || maxOxygen}</span>${t('time.seconds')} / <span id="loop-time-max">${maxOxygen}</span>${t('time.seconds')}`;
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
    const langLabel = document.querySelector('.settings-row label');
    if (langLabel) {
        langLabel.textContent = t('ui.language');
    }
    const resetLoopBtn = document.querySelector('.reset-loop-btn');
    if (resetLoopBtn) {
        resetLoopBtn.innerHTML = '🔁 ' + t('ui.resetLoop');
    }
    const resetBtn = document.querySelector('.reset-btn');
    if (resetBtn) {
        resetBtn.innerHTML = '🔄 ' + t('ui.resetGame');
    }
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.textContent = t('ui.close');
    }

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
}
