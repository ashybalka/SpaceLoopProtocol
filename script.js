// Механика игры с временными активностями и старт/стоп по клику [web:23]

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
    return 'en'; // По умолчанию английский
}

// Загрузка переводов
async function loadTranslations() {
    try {
        const [transResponse, actTransResponse] = await Promise.all([
            fetch('translations.json'),
            fetch('activities-translations.json')
        ]);
        translations = await transResponse.json();
        activityTranslations = await actTransResponse.json();
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
                    return key; // Ключ не найден
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
    document.querySelectorAll('.panel h2')[1].textContent = '⚙️ ' + t('ui.automation');
    document.querySelectorAll('.panel h2')[2].textContent = '📝 ' + t('ui.eventLog');

    // Названия статов с иконками из переводов
    const statKeys = ['strength', 'intelligence', 'agility', 'endurance', 'perception'];
    document.querySelectorAll('.stat-name').forEach(el => {
        const statKey = el.closest('.stat-block')?.querySelector('[id$="-level"]')?.id.replace('-level', '');
        if (statKey && statKeys.includes(statKey)) {
            const icon = t(`statIcons.${statKey}`);
            el.textContent = icon + ' ' + t(`stats.${statKey}`);
        }
    });

    // Подписи опыта - используем data-атрибуты для определения типа
    const statBlocks = document.querySelectorAll('.stat-block');
    statBlocks.forEach(block => {
        const sublabels = block.querySelectorAll('.stat-sublabel');
        if (sublabels.length >= 2) {
            // Первый sublabel - loop exp
            const loopSpan = sublabels[0].querySelector('span');
            if (loopSpan) {
                sublabels[0].innerHTML = t('ui.loopExp') + ': <span id="' + loopSpan.id + '">' + loopSpan.textContent + '</span>';
            }
            // Второй sublabel - permanent exp
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
        oxygenText.innerHTML = `💨 ${t('ui.oxygen')}: <span id="loop-time">${timeSpan?.textContent || '500'}</span>${t('time.seconds')} / 500${t('time.seconds')}`;
    }

    // Автоматизация - кнопка и лейбл
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
    const resetBtn = document.querySelector('.reset-btn');
    if (resetBtn) {
        resetBtn.innerHTML = '🔄 ' + t('ui.resetGame');
    }
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.textContent = t('ui.close');
    }
}

// Количество выполнений для разблокировки автоматизации = 10 * maxTimes активности
function getAutomationThreshold(activity) {
    return activity.maxTimes * 10;
}

const game = {
    stats: {
        strength: { loopExp: 0, permExp: 0, level: 0, permLevel: 0 },
        intelligence: { loopExp: 0, permExp: 0, level: 0, permLevel: 0 },
        agility: { loopExp: 0, permExp: 0, level: 0, permLevel: 0 },
        endurance: { loopExp: 0, permExp: 0, level: 0, permLevel: 0 },
        perception: { loopExp: 0, permExp: 0, level: 0, permLevel: 0 }
    },

    loopTimeTotal: 500,
    loopTimeLeft: 500,
    isLoopActive: false,

    currentChapter: 1,
    unlockedChapters: [1],

    activities: [],

    activityLog: [],

    // Система автоматизации
    automationQueue: [], // [{activityId, repeatCount}]
    currentQueueIndex: 0,
    isAutoMode: false
};

// Названия глав теперь берутся из переводов
function getChapterName(chapterNum) {
    return t(`chapters.${chapterNum}`) || `Chapter ${chapterNum}`;
}

let lastTimestamp = performance.now();
let autoSaveInterval = null;

async function init() {
    await loadTranslations();
    await loadActivities();
    loadGame();
    applyTranslations();
    renderActivities();
    renderAutomationQueue();
    updateUI();

    // Автосохранение каждые 15 секунд
    startAutoSave();
}

function startAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    autoSaveInterval = setInterval(() => {
        if (game.isLoopActive) {
            saveGame();
            console.log('Автосохранение...');
        }
    }, 15000); // 15 секунд
}

async function loadActivities() {
    try {
        const response = await fetch('activities.json');
        const activitiesData = await response.json();
        game.activities = activitiesData.map(act => ({
            ...act,
            timesDone: 0,
            elapsed: 0,
            isActive: false,
            unlocked: act.unlocked !== undefined ? act.unlocked : true,
            defaultUnlocked: act.unlocked !== undefined ? act.unlocked : true,
            totalCompletions: 0 // Общее количество выполнений (для автоматизации)
        }));
        console.log('Активности загружены:', game.activities.length);
        console.log('Разблокированные активности:', game.activities.filter(a => a.unlocked).map(a => a.name));
        console.log('Заблокированные активности:', game.activities.filter(a => !a.unlocked).map(a => a.name));
    } catch (e) {
        console.error('Ошибка загрузки активностей:', e);
        // Если не удалось загрузить JSON, создаем базовые активности вручную
        game.activities = [];
    }
}

const statIcons = {
    'strength': '💪',
    'intelligence': '🧠',
    'agility': '🎯',
    'endurance': '❤️',
    'perception': '👁️'
};

// Получить статы с весами из активности
// Поддержка форматов: stat: "str", stats: ["str", "int"], stats: {"str": 85, "int": 15}
function getStatsWithWeights(activity) {
    if (activity.stats) {
        if (Array.isArray(activity.stats)) {
            // Массив - равные веса
            const weight = 1 / activity.stats.length;
            return activity.stats.map(s => ({ statKey: s, weight }));
        } else {
            // Объект с процентами
            const entries = Object.entries(activity.stats);
            const totalPercent = entries.reduce((sum, [, pct]) => sum + pct, 0);
            return entries.map(([statKey, pct]) => ({ statKey, weight: pct / totalPercent }));
        }
    } else if (activity.stat) {
        // Одиночный стат
        return [{ statKey: activity.stat, weight: 1 }];
    }
    return [];
}

function renderActivities() {
    const container = document.getElementById('activities-container');
    container.innerHTML = '';

    // Показываем название текущей главы
    const chapterTitle = document.getElementById('chapter-title');
    if (chapterTitle) {
        chapterTitle.textContent = getChapterName(game.currentChapter);
    }

    game.activities.forEach(activity => {
        // Показываем только активности текущей главы, разблокированные и не полностью выполненные
        if (activity.chapter !== game.currentChapter) return;
        if (!activity.unlocked) return;
        if (activity.timesDone >= activity.maxTimes) return;

        const canPlay = activity.timesDone < activity.maxTimes && game.isLoopActive;
        const btn = document.createElement('button');
        btn.className = 'activity-btn' + (activity.isActive ? ' activity-active' : '');
        btn.disabled = !canPlay && !activity.isActive;

        // Поддержка нескольких статов с весами
        const statsWithWeights = getStatsWithWeights(activity);
        const statIconsStr = statsWithWeights.map(({ statKey, weight }) => {
            const icon = statIcons[statKey] || '?';
            return statsWithWeights.length > 1 ? `${icon}${Math.round(weight * 100)}%` : icon;
        }).join(' ');
        const weightedLevel = statsWithWeights.reduce((sum, { statKey, weight }) =>
            sum + (game.stats[statKey]?.level || 0) * weight, 0);
        const effectiveDuration = activity.duration * (0.2 + 0.8 / (1 + weightedLevel * 0.1));
        const progress = Math.min(activity.elapsed / effectiveDuration, 1) * 100;
        const remainingTime = Math.max(0, effectiveDuration - activity.elapsed).toFixed(1);

        // Кнопка автоматизации
        const autoThreshold = getAutomationThreshold(activity);
        const canAutomateAct = activity.totalCompletions >= autoThreshold;
        const inQueue = game.automationQueue.some(q => q.activityId === activity.id);
        let autoBtn = '';
        if (inQueue) {
            autoBtn = `<span class="auto-indicator in-queue" title="${t('automation.inQueue')}">✓</span>`;
        } else if (canAutomateAct) {
            autoBtn = `<span class="auto-indicator can-add" data-id="${activity.id}" title="${t('automation.addToQueue')}">➕</span>`;
        } else {
            const remaining = autoThreshold - activity.totalCompletions;
            autoBtn = `<span class="auto-indicator locked" title="${t('automation.remainingCompletions', {count: remaining})}">🔒${remaining}</span>`;
        }

        // Получаем переведённые название и описание активности
        const activityName = tActivity(activity.id, 'name') || activity.name;
        const activityDesc = tActivity(activity.id, 'description') || activity.description;
        const timeSuffix = t('time.seconds');

        btn.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                <span style="font-weight: bold; color: #00ff88; font-size: 16px;">${activityName}</span>
                ${autoBtn}
            </div>
            <div style="color: #00ddff; font-size: 13px; margin-bottom: 2px;">
                ${statIconsStr}
            </div>
            <div style="color: #aaffcc; font-size: 12px; margin-bottom: 3px;">
                ⏱️ ${remainingTime}${timeSuffix} / ${effectiveDuration.toFixed(1)}${timeSuffix}
            </div>
            <div style="color: #00ff88; font-size: 12px; margin-bottom: 3px; line-height: 1.3; opacity: 0.8;">
                ${activityDesc}
            </div>
            <div style="color: #ffaa00; font-size: 11px; margin-bottom: 3px;">
                ${activity.timesDone}/${activity.maxTimes} ${t('ui.completed')}
            </div>
            <div class="activity-progress">
                <div class="activity-progress-bar" data-id="${activity.id}" style="width: ${progress}%"></div>
            </div>
        `;

        btn.addEventListener('click', (e) => {
            // Проверяем, нажали ли на кнопку добавления в очередь
            if (e.target.classList.contains('can-add')) {
                e.stopPropagation();
                addToQueue(e.target.dataset.id, 1);
                renderActivities();
                return;
            }
            toggleActivity(activity.id);
        });
        container.appendChild(btn);
    });

    // Обновляем панель автоматизации (доступность зависит от главы)
    renderAutomationQueue();
}

function toggleActivity(id) {
    if (!game.isLoopActive) return;
    const a = game.activities.find(x => x.id === id);
    if (!a) return;
    if (a.timesDone >= a.maxTimes) return;

    // При ручном управлении отключаем автоматический режим
    if (game.isAutoMode) {
        game.isAutoMode = false;
        renderAutomationQueue();
    }

    if (a.isActive) {
        // повторное нажатие: остановить (прогресс сохраняется)
        a.isActive = false;
    } else {
        // Останавливаем все другие активности (прогресс сохраняется)
        game.activities.forEach(activity => {
            if (activity.id !== id && activity.isActive) {
                activity.isActive = false;
            }
        });
        // Запускаем выбранную активность
        a.isActive = true;
    }
    renderActivities();
}

function checkUnlockTriggers() {
    game.activities.forEach(activity => {
        if (activity.unlocked) return;
        if (!activity.unlockTrigger) return;

        const trigger = activity.unlockTrigger;

        if (trigger.type === 'activityComplete') {
            // Поддержка одного activityId (строка) или нескольких (массив), логика "and"/"or"
            const ids = Array.isArray(trigger.activityId) ? trigger.activityId : [trigger.activityId];
            const check = id => {
                const target = game.activities.find(a => a.id === id);
                return target && target.timesDone >= trigger.times;
            };
            const met = trigger.logic === 'or' ? ids.some(check) : ids.every(check);
            if (met) {
                activity.unlocked = true;
                const unlockMsg = tActivity(activity.id, 'unlockMessage') || activity.unlockMessage;
                if (unlockMsg) {
                    addLog(unlockMsg, 'default');
                }
                const activityName = tActivity(activity.id, 'name') || activity.name;
                addLog(t('log.newActivityUnlocked', { name: activityName }), 'stat');
            }
        }
    });
}

function completeActivity(a) {
    a.timesDone += 1;
    a.totalCompletions += 1; // Для отслеживания разблокировки автоматизации
    const activityName = tActivity(a.id, 'name') || a.name;

    // Проверяем разблокировку автоматизации
    const autoThreshold = getAutomationThreshold(a);
    if (a.totalCompletions === autoThreshold) {
        addLog(t('automation.unlocked', { name: activityName }), 'power');
    }

    addLog(t('log.activityCompleted', { name: activityName, done: a.timesDone, max: a.maxTimes }), 'complete');

    // Обрабатываем награды при каждом завершении
    if (a.reward) {
        if (a.reward.oxygen) {
            game.loopTimeLeft = Math.min(game.loopTimeLeft + a.reward.oxygen, game.loopTimeTotal);
            addLog(t('log.oxygenBonus', { amount: a.reward.oxygen }), 'power');
        }
        if (a.reward.switchChapter) {
            const targetChapter = a.reward.switchChapter;
            if (!game.unlockedChapters.includes(targetChapter)) {
                game.unlockedChapters.push(targetChapter);
                addLog(t('log.chapterOpened', { chapter: getChapterName(targetChapter) }), 'power');
            }
            // Останавливаем все активности при смене главы
            game.activities.forEach(act => {
                act.isActive = false;
            });
            game.currentChapter = targetChapter;
            addLog(t('log.chapterMoved', { chapter: getChapterName(targetChapter) }), 'stat');
        }
    }

    if (a.timesDone >= a.maxTimes) {
        a.isActive = false;
        a.elapsed = 0;
        addLog(t('log.activityFullyCompleted', { name: activityName }), 'stat');
    }

    // Обработка очереди автоматизации
    if (game.isAutoMode) {
        const queueItem = game.automationQueue.find(q => q.activityId === a.id);
        if (queueItem) {
            queueItem.completedInQueue += 1;
            // Если выполнили нужное количество или активность больше нельзя выполнять
            if (queueItem.completedInQueue >= queueItem.repeatCount || a.timesDone >= a.maxTimes) {
                // Переходим к следующему элементу очереди
                game.currentQueueIndex = (game.currentQueueIndex + 1) % game.automationQueue.length;
                // Сбрасываем счётчик, если не достигли максимума активности
                if (a.timesDone < a.maxTimes) {
                    queueItem.completedInQueue = 0;
                }
            }
            a.isActive = false; // Останавливаем для выбора следующей из очереди
            renderAutomationQueue();
        }
    }

    // Проверяем разблокировку новых активностей
    checkUnlockTriggers();
}

function addLog(message, type = 'default') {
    const logDiv = document.getElementById('log');
    const entry = document.createElement('div');
    entry.className = 'log-entry ' + type;
    entry.textContent = message;
    logDiv.insertBefore(entry, logDiv.firstChild);

    while (logDiv.children.length > 15) {
        logDiv.removeChild(logDiv.lastChild);
    }
}

// =============== СИСТЕМА АВТОМАТИЗАЦИИ ===============

function canAutomate(activityId) {
    const activity = game.activities.find(a => a.id === activityId);
    return activity && activity.totalCompletions >= getAutomationThreshold(activity);
}

function addToQueue(activityId, repeatCount = 1) {
    if (!canAutomate(activityId)) return;
    game.automationQueue.push({ activityId, repeatCount, completedInQueue: 0 });
    renderAutomationQueue();
    saveGame();
}

function removeFromQueue(index) {
    game.automationQueue.splice(index, 1);
    if (game.currentQueueIndex >= game.automationQueue.length) {
        game.currentQueueIndex = 0;
    }
    renderAutomationQueue();
    saveGame();
}

function moveQueueItem(fromIndex, direction) {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= game.automationQueue.length) return;
    const temp = game.automationQueue[fromIndex];
    game.automationQueue[fromIndex] = game.automationQueue[toIndex];
    game.automationQueue[toIndex] = temp;
    renderAutomationQueue();
    saveGame();
}

function updateQueueRepeatCount(index, delta) {
    const item = game.automationQueue[index];
    if (!item) return;
    item.repeatCount = Math.max(1, Math.min(99, item.repeatCount + delta));
    renderAutomationQueue();
    saveGame();
}

function toggleAutoMode() {
    game.isAutoMode = !game.isAutoMode;
    if (game.isAutoMode && game.automationQueue.length > 0) {
        // Останавливаем все ручные активности
        game.activities.forEach(a => a.isActive = false);
        game.currentQueueIndex = 0;
        // Сбрасываем счётчики выполнений в очереди
        game.automationQueue.forEach(item => item.completedInQueue = 0);
    }
    renderAutomationQueue();
    renderActivities();
}

function getNextQueueActivity() {
    if (game.automationQueue.length === 0) return null;

    const startIndex = game.currentQueueIndex;
    let checked = 0;

    while (checked < game.automationQueue.length) {
        const item = game.automationQueue[game.currentQueueIndex];
        const activity = game.activities.find(a => a.id === item.activityId);

        // Проверяем, можно ли выполнить эту активность
        if (activity &&
            activity.unlocked &&
            activity.chapter === game.currentChapter &&
            activity.timesDone < activity.maxTimes &&
            item.completedInQueue < item.repeatCount) {
            return { item, activity, index: game.currentQueueIndex };
        }

        // Переходим к следующей в очереди
        game.currentQueueIndex = (game.currentQueueIndex + 1) % game.automationQueue.length;
        checked++;

        // Если вернулись к началу, все элементы пропущены
        if (game.currentQueueIndex === startIndex && checked > 0) {
            break;
        }
    }

    return null;
}

function renderAutomationQueue() {
    const container = document.getElementById('automation-queue');
    if (!container) return;

    const autoBtn = document.getElementById('auto-mode-btn');
    if (autoBtn) {
        autoBtn.innerHTML = game.isAutoMode ? '⏸️ ' + t('ui.stop') : '▶️ ' + t('ui.start');
        autoBtn.className = game.isAutoMode ? 'auto-btn active' : 'auto-btn';
    }

    container.innerHTML = '';

    if (game.automationQueue.length === 0) {
        container.innerHTML = `<div style="color: #666; font-size: 11px; text-align: center;">${t('ui.queueEmpty')}</div>`;
        return;
    }

    game.automationQueue.forEach((item, index) => {
        const activity = game.activities.find(a => a.id === item.activityId);
        if (!activity) return;

        const canExecute = activity.unlocked &&
                          activity.chapter === game.currentChapter &&
                          activity.timesDone < activity.maxTimes;

        const isCurrent = game.isAutoMode && index === game.currentQueueIndex;
        const activityName = tActivity(activity.id, 'name') || activity.name;

        const el = document.createElement('div');
        el.className = 'queue-item' + (isCurrent ? ' queue-active' : '') + (!canExecute ? ' queue-skipped' : '');

        el.innerHTML = `
            <div class="queue-item-header">
                <span class="queue-item-name">${activityName}</span>
                <span class="queue-item-progress">${item.completedInQueue}/${item.repeatCount}</span>
            </div>
            <div class="queue-item-controls">
                <button onclick="moveQueueItem(${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
                <button onclick="updateQueueRepeatCount(${index}, -1)">−</button>
                <button onclick="updateQueueRepeatCount(${index}, 1)">+</button>
                <button onclick="moveQueueItem(${index}, 1)" ${index === game.automationQueue.length - 1 ? 'disabled' : ''}>↓</button>
                <button onclick="removeFromQueue(${index})" class="remove-btn">✕</button>
            </div>
        `;

        container.appendChild(el);
    });
}

function resetLoopState() {
    game.loopTimeLeft = game.loopTimeTotal;
    game.currentChapter = 1;
    game.activities.forEach(a => {
        a.timesDone = 0;
        a.elapsed = 0;
        a.isActive = false;
        a.unlocked = a.defaultUnlocked; // Сбрасываем разблокировку к исходному состоянию
    });
    // Сбрасываем опыт и уровни петли
    ['strength', 'intelligence', 'agility', 'endurance', 'perception'].forEach(statKey => {
        game.stats[statKey].loopExp = 0;
        game.stats[statKey].level = 0;
    });
    // Сбрасываем счётчики выполнений в очереди автоматизации
    game.currentQueueIndex = 0;
    game.automationQueue.forEach(item => item.completedInQueue = 0);
}

function startLoop() {
    resetLoopState();
    game.isLoopActive = true;
    lastTimestamp = performance.now();
    addLog(t('log.awakening'), 'stat');
    renderActivities();
    renderAutomationQueue();
    updateUI();
}

function endLoop() {
    game.isLoopActive = false;

    // Сбрасываем опыт и уровень петли
    ['strength', 'intelligence', 'agility', 'endurance', 'perception'].forEach(statKey => {
        const stat = game.stats[statKey];
        stat.loopExp = 0;
        stat.level = 0;
    });

    addLog(t('log.loopEnded'), 'power');
    addLog(t('log.progressSaved'), 'stat');

    saveGame();

    // Автоматически начинаем новую петлю
    startLoop();
}

function gameLoop(now) {
    let dt = (now - lastTimestamp) / 1000;
    lastTimestamp = now;

    // Ограничиваем dt чтобы избежать скачков при переключении вкладок
    // Максимум 0.1 секунды (100мс) за один кадр
    if (dt > 0.1) {
        dt = 0.1;
    }

    if (game.isLoopActive) {
        // Автоматический режим: запускаем следующую активность из очереди
        if (game.isAutoMode && game.automationQueue.length > 0) {
            const hasActive = game.activities.some(a => a.isActive);
            if (!hasActive) {
                const next = getNextQueueActivity();
                if (next) {
                    next.activity.isActive = true;
                    renderActivities();
                    renderAutomationQueue();
                }
            }
        }

        // если есть хотя бы одна активная активность — время петли идёт
        const hasActive = game.activities.some(a => a.isActive);
        if (hasActive && game.loopTimeLeft > 0) {
            game.loopTimeLeft = Math.max(0, game.loopTimeLeft - dt);

            game.activities.forEach(a => {
                if (!a.isActive) return;
                if (a.timesDone >= a.maxTimes) {
                    a.isActive = false;
                    a.elapsed = 0;
                    return;
                }

                // Получаем список статов с весами
                // Поддержка форматов: stat: "str", stats: ["str", "int"], stats: {"str": 85, "int": 15}
                const statsWithWeights = getStatsWithWeights(a);

                // Начисляем опыт каждому стату с учётом веса
                let weightedLevel = 0;
                let totalWeight = 0;
                statsWithWeights.forEach(({ statKey, weight }) => {
                    const stat = game.stats[statKey];
                    if (!stat) return;

                    // basePower * вес - это опыт в секунду для этого стата
                    const expGain = a.basePower * weight * Math.pow(1.05, stat.permLevel) * dt;

                    stat.loopExp += expGain;
                    stat.permExp += expGain;

                    // Проверяем повышение уровня петли (начиная с 10, увеличивается в 1.25 раза)
                    let loopExpNeeded = 10 * Math.pow(1.25, stat.level);
                    while (stat.loopExp >= loopExpNeeded) {
                        stat.loopExp -= loopExpNeeded;
                        stat.level += 1;
                        loopExpNeeded = 10 * Math.pow(1.25, stat.level);
                    }

                    // Проверяем повышение постоянного уровня (начиная с 100, увеличивается в 1.25 раза)
                    let permExpNeeded = 100 * Math.pow(1.25, stat.permLevel);
                    while (stat.permExp >= permExpNeeded) {
                        stat.permExp -= permExpNeeded;
                        stat.permLevel += 1;
                        permExpNeeded = 100 * Math.pow(1.25, stat.permLevel);
                    }

                    // Взвешенный уровень для расчёта длительности
                    weightedLevel += stat.level * weight;
                    totalWeight += weight;
                });

                // Эффективная длительность активности с учетом взвешенного уровня петли
                const avgLevel = totalWeight > 0 ? weightedLevel / totalWeight : 0;
                const effectiveDuration = a.duration * (0.2 + 0.8 / (1 + avgLevel * 0.1));
                a.elapsed += dt;

                if (a.elapsed >= effectiveDuration) {
                    a.elapsed = 0; // Сбрасываем вместо вычитания, чтобы избежать проблем с изменением effectiveDuration
                    completeActivity(a);
                    // После завершения активности обновляем список (могут разблокироваться новые)
                    renderActivities();
                }
            });

            if (game.loopTimeLeft <= 0) {
                endLoop();
            }
        }
    }

    updateUI();
    requestAnimationFrame(gameLoop);
}

function updateUI() {
    ['strength', 'intelligence', 'agility', 'endurance', 'perception'].forEach(statKey => {
        const stat = game.stats[statKey];

        // Уровни (петля / постоянный)
        document.getElementById(`${statKey}-level`).textContent = `${t('ui.level')} ${stat.level} (${stat.permLevel})`;

        // Опыт петли (начиная с 10, увеличивается в 1.25 раза)
        const loopExpNeeded = 10 * Math.pow(1.25, stat.level);
        const loopExpProgress = (stat.loopExp / loopExpNeeded) * 100;
        document.getElementById(`${statKey}-loop-exp`).textContent = `${Math.floor(stat.loopExp)}/${Math.floor(loopExpNeeded)}`;
        document.getElementById(`${statKey}-loop-bar`).style.width = `${loopExpProgress}%`;

        // Постоянный опыт (начиная с 100, увеличивается в 1.25 раза)
        const permExpNeeded = 100 * Math.pow(1.25, stat.permLevel);
        const permExpProgress = (stat.permExp / permExpNeeded) * 100;
        document.getElementById(`${statKey}-perm-exp`).textContent = `${Math.floor(stat.permExp)}/${Math.floor(permExpNeeded)}`;
        document.getElementById(`${statKey}-perm-bar`).style.width = `${permExpProgress}%`;
    });

    const timeRemaining = game.loopTimeLeft;
    document.getElementById('loop-time').textContent = timeRemaining.toFixed(1);
    document.getElementById('time-fill').style.width =
        (game.loopTimeLeft / game.loopTimeTotal) * 100 + '%';

    // обновляем кнопки (время на кнопке и прогресс)
    const buttons = document.querySelectorAll('.activity-btn');
    const visibleActivities = game.activities.filter(a => a.chapter === game.currentChapter && a.unlocked && a.timesDone < a.maxTimes);

    buttons.forEach((btn, idx) => {
        const a = visibleActivities[idx];
        if (!a) return;

        // Поддержка нескольких статов с весами
        const statsWithWeights = getStatsWithWeights(a);
        const weightedLevel = statsWithWeights.reduce((sum, { statKey, weight }) =>
            sum + (game.stats[statKey]?.level || 0) * weight, 0);
        const effectiveDuration = a.duration * (0.2 + 0.8 / (1 + weightedLevel * 0.1));
        const remainingTime = Math.max(0, effectiveDuration - a.elapsed).toFixed(1);

        btn.classList.toggle('activity-active', a.isActive);
        btn.disabled = (!game.isLoopActive || (a.timesDone >= a.maxTimes && !a.isActive));

        const progressBar = btn.querySelector('.activity-progress-bar');
        if (progressBar) {
            const progress = Math.min(a.elapsed / effectiveDuration, 1) * 100;
            progressBar.style.width = progress + '%';
        }

        // Обновляем время (children[2])
        const timeEl = btn.children[2];
        if (timeEl) {
            const timeSuffix = t('time.seconds');
            timeEl.innerHTML = `⏱️ ${remainingTime}${timeSuffix} / ${effectiveDuration.toFixed(1)}${timeSuffix}`;
        }

        // Обновляем количество выполнений (children[4])
        const counterEl = btn.children[4];
        if (counterEl) {
            counterEl.innerHTML = `${a.timesDone}/${a.maxTimes} ${t('ui.completed')}`;
        }
    });
}

function saveGame() {
    localStorage.setItem('cryoCapsuleGame', JSON.stringify({
        stats: game.stats,
        isLoopActive: game.isLoopActive,
        loopTimeLeft: game.loopTimeLeft,
        currentChapter: game.currentChapter,
        unlockedChapters: game.unlockedChapters,
        activities: game.activities.map(a => ({
            id: a.id,
            timesDone: a.timesDone,
            elapsed: a.elapsed,
            isActive: a.isActive,
            unlocked: a.unlocked,
            totalCompletions: a.totalCompletions
        })),
        // Автоматизация
        automationQueue: game.automationQueue,
        isAutoMode: game.isAutoMode
    }));

    // Показываем индикатор сохранения
    const indicator = document.getElementById('save-indicator');
    if (indicator) {
        indicator.classList.remove('saving');
        // Перезапуск анимации через reflow
        void indicator.offsetWidth;
        indicator.classList.add('saving');
    }
}

function loadGame() {
    const saved = localStorage.getItem('cryoCapsuleGame');
    if (saved) {
        const data = JSON.parse(saved);
        if (data.stats) {
            ['strength', 'intelligence', 'agility', 'endurance', 'perception'].forEach(statKey => {
                if (data.stats[statKey]) {
                    // Новый формат
                    if (typeof data.stats[statKey] === 'object') {
                        game.stats[statKey] = {
                            loopExp: data.stats[statKey].loopExp || 0,
                            permExp: data.stats[statKey].permExp || 0,
                            level: data.stats[statKey].level || 0,
                            permLevel: data.stats[statKey].permLevel || 0
                        };
                    }
                }
            });
        }
        // Восстанавливаем состояние петли
        if (data.isLoopActive !== undefined) {
            game.isLoopActive = data.isLoopActive;
        }
        if (data.loopTimeLeft !== undefined) {
            game.loopTimeLeft = data.loopTimeLeft;
        }
        if (data.currentChapter !== undefined) {
            game.currentChapter = data.currentChapter;
        }
        if (data.unlockedChapters !== undefined) {
            game.unlockedChapters = data.unlockedChapters;
        }
        if (data.activities && Array.isArray(data.activities)) {
            data.activities.forEach(savedAct => {
                const act = game.activities.find(a => a.id === savedAct.id);
                if (act) {
                    act.timesDone = savedAct.timesDone;
                    act.elapsed = savedAct.elapsed;
                    act.isActive = savedAct.isActive;
                    // Если в сохранении есть unlocked, используем его, иначе берем из activities.json
                    if (savedAct.unlocked !== undefined) {
                        act.unlocked = savedAct.unlocked;
                    }
                    // Загружаем общее количество выполнений для автоматизации
                    if (savedAct.totalCompletions !== undefined) {
                        act.totalCompletions = savedAct.totalCompletions;
                    }
                }
            });
            // После загрузки проверяем триггеры разблокировки на случай если сохранение старое
            checkUnlockTriggers();
        }
        // Загружаем данные автоматизации
        if (data.automationQueue) {
            game.automationQueue = data.automationQueue;
        }
        if (data.isAutoMode !== undefined) {
            game.isAutoMode = data.isAutoMode;
        }
        addLog(t('log.saveLoaded'), 'stat');
        renderAutomationQueue();
    } else {
        // Первый запуск - начинаем петлю
        startLoop();
    }
}

function resetGame() {
    if (confirm(t('dialogs.resetConfirm'))) {
        localStorage.removeItem('cryoCapsuleGame');
        location.reload();
    }
}

// =============== НАСТРОЙКИ ===============

function openSettings() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.style.display = 'flex';
        // Обновляем выбранный язык
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

function onLanguageChange() {
    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
        setLanguage(langSelect.value);
    }
}

init().then(() => {
    requestAnimationFrame(gameLoop);
});
