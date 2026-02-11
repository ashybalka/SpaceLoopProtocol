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
        game.activities.forEach(a => a.isActive = false);
        game.currentQueueIndex = 0;
    }
    renderAutomationQueue();
    renderActivities();
}

function toggleAutoRepeat() {
    game.autoRepeat = !game.autoRepeat;
    const btn = document.getElementById('auto-repeat-btn');
    if (btn) {
        btn.classList.toggle('active', game.autoRepeat);
    }
    saveGame();
}

function getNextQueueActivity() {
    if (game.automationQueue.length === 0) return null;

    const startIndex = game.currentQueueIndex;
    let checked = 0;

    while (checked < game.automationQueue.length) {
        const item = game.automationQueue[game.currentQueueIndex];
        const activity = game.activities.find(a => a.id === item.activityId);

        if (activity &&
            activity.unlocked &&
            activity.chapter === game.currentChapter &&
            activity.timesDone < activity.maxTimes &&
            item.completedInQueue < item.repeatCount) {
            return { item, activity, index: game.currentQueueIndex };
        }

        game.currentQueueIndex = (game.currentQueueIndex + 1) % game.automationQueue.length;
        checked++;

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

    const repeatBtn = document.getElementById('auto-repeat-btn');
    if (repeatBtn) {
        repeatBtn.classList.toggle('active', game.autoRepeat);
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
