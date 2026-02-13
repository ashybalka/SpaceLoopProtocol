// =============== ИНТЕРФЕЙС ===============

let logFilters = { all: true, complete: true, history: true, stat: true, power: true };

// Названия глав
function getChapterName(chapterNum) {
    return t(`chapters.${chapterNum}`) || `Chapter ${chapterNum}`;
}

// Инициализация фильтров лога
function initLogFilters() {
    document.querySelectorAll('.log-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            if (filter === 'all') {
                const allActive = Object.values(logFilters).every(v => v);
                Object.keys(logFilters).forEach(k => logFilters[k] = !allActive);
            } else {
                logFilters[filter] = !logFilters[filter];
            }
            logFilters.all = logFilters.complete && logFilters.history && logFilters.stat && logFilters.power;
            updateFilterButtons();
            applyLogFilters();
        });
    });
}

function updateFilterButtons() {
    document.querySelectorAll('.log-filter').forEach(btn => {
        const filter = btn.dataset.filter;
        btn.classList.toggle('active', logFilters[filter]);
    });
}

function applyLogFilters() {
    document.querySelectorAll('.log-row').forEach(row => {
        let visible = false;
        if (row.classList.contains('complete') && logFilters.complete) visible = true;
        else if (row.classList.contains('history') && logFilters.history) visible = true;
        else if (row.classList.contains('stat') && logFilters.stat) visible = true;
        else if (row.classList.contains('power') && logFilters.power) visible = true;
        else if (!row.classList.contains('complete') && !row.classList.contains('history') && !row.classList.contains('stat') && !row.classList.contains('power')) {
            visible = logFilters.complete || logFilters.history || logFilters.stat || logFilters.power;
        }
        row.style.display = visible ? '' : 'none';
    });
}

// Форматирует секунды в М:СС
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Добавить запись в лог
function addLog(message, type = 'default') {
    const logDiv = document.getElementById('log');
    const elapsedTime = game.loopElapsed;

    game.currentLoopLog.push({ time: elapsedTime, message, type });

    let timeDiff = null;
    const prevEvent = game.previousLoopLog.find(e => e.message === message);
    if (prevEvent) {
        timeDiff = elapsedTime - prevEvent.time;
    }

    const row = document.createElement('div');
    row.className = 'log-row ' + type;

    const timeStr = formatTime(elapsedTime);

    let diffStr = '—';
    let diffClass = '';
    if (timeDiff !== null) {
        if (timeDiff < -0.5) {
            diffStr = timeDiff.toFixed(0) + t('time.seconds');
            diffClass = 'diff-faster';
        } else if (timeDiff > 0.5) {
            diffStr = '+' + timeDiff.toFixed(0) + t('time.seconds');
            diffClass = 'diff-slower';
        } else {
            diffStr = '=';
            diffClass = 'diff-same';
        }
    }

    const realTimeStr = formatTime(game.realElapsed);

    row.innerHTML = `
        <span class="log-real-time">${realTimeStr}</span>
        <span class="log-time">${timeStr}</span>
        <span class="log-diff ${diffClass}">${diffStr}</span>
        <span class="log-text">${message}</span>
    `;

    let visible = false;
    if (type === 'complete' && logFilters.complete) visible = true;
    else if (type === 'history' && logFilters.history) visible = true;
    else if (type === 'stat' && logFilters.stat) visible = true;
    else if (type === 'power' && logFilters.power) visible = true;
    else if (type === 'default') visible = true;
    row.style.display = visible ? '' : 'none';

    logDiv.insertBefore(row, logDiv.firstChild);

    while (logDiv.children.length > 15) {
        logDiv.removeChild(logDiv.lastChild);
    }
}

// Обновление UI
function updateUI() {
    ['strength', 'intelligence', 'agility', 'endurance', 'perception'].forEach(statKey => {
        const stat = game.stats[statKey];

        document.getElementById(`${statKey}-level`).textContent = `${t('ui.level')} ${stat.level} (${stat.permLevel})`;

        const loopExpNeeded = 10 * Math.pow(1.25, stat.level);
        const loopExpProgress = (stat.loopExp / loopExpNeeded) * 100;
        document.getElementById(`${statKey}-loop-exp`).textContent = `${Math.floor(stat.loopExp)}/${Math.floor(loopExpNeeded)}`;
        document.getElementById(`${statKey}-loop-bar`).style.width = `${loopExpProgress}%`;

        const permExpNeeded = 100 * Math.pow(1.5, stat.permLevel);
        const permExpProgress = (stat.permExp / permExpNeeded) * 100;
        document.getElementById(`${statKey}-perm-exp`).textContent = `${Math.floor(stat.permExp)}/${Math.floor(permExpNeeded)}`;
        document.getElementById(`${statKey}-perm-bar`).style.width = `${permExpProgress}%`;
    });

    const timeRemaining = game.loopTimeLeft;
    document.getElementById('loop-time').textContent = timeRemaining.toFixed(1);
    const maxOxygenEl = document.getElementById('loop-time-max');
    if (maxOxygenEl) {
        maxOxygenEl.textContent = game.loopTimeTotal.toFixed(1);
    }
    const oxygenPercent = game.loopTimeLeft / game.loopTimeTotal;
    const timeFill = document.getElementById('time-fill');
    timeFill.style.width = oxygenPercent * 100 + '%';

    // Color: bright blue (100%) → yellow (50%) → red (0%)
    const r = Math.round(oxygenPercent < 0.5 ? 255 : 255 - (oxygenPercent - 0.5) * 2 * 200);
    const g = Math.round(oxygenPercent < 0.5 ? oxygenPercent * 2 * 200 : 200 - (oxygenPercent - 0.5) * 2 * 200);
    const b = Math.round(oxygenPercent > 0.5 ? (oxygenPercent - 0.5) * 2 * 255 : 0);
    timeFill.style.background = `rgb(${r}, ${g}, ${b})`;

    // Border color matches
    const timeBar = document.querySelector('.time-bar');
    timeBar.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
    timeBar.style.background = `rgba(${r}, ${g}, ${b}, 0.15)`;

    const buttons = document.querySelectorAll('.activity-btn');
    const visibleActivities = game.activities.filter(a => {
        if (a.chapter !== game.currentChapter) return false;
        if (!a.unlocked) return false;
        if (a.timesDone >= a.maxTimes) return false;
        const isExcluded = game.activities.some(other =>
            other.excludes &&
            other.excludes.includes(a.id) &&
            other.timesDone > 0
        );
        if (isExcluded) return false;
        return true;
    });

    buttons.forEach((btn, idx) => {
        const a = visibleActivities[idx];
        if (!a) return;

        const statsWithWeights = getStatsWithWeights(a);
        const weightedLevel = statsWithWeights.reduce((sum, { statKey, weight }) =>
            sum + (game.stats[statKey]?.level || 0) * weight, 0);
        const effectiveDuration = a.duration * Math.pow(0.97, weightedLevel);
        const remainingTime = Math.max(0, effectiveDuration - a.elapsed).toFixed(1);

        btn.classList.toggle('activity-active', a.isActive);
        btn.disabled = (!game.isLoopActive || (a.timesDone >= a.maxTimes && !a.isActive));

        const progressBar = btn.querySelector('.activity-progress-bar');
        if (progressBar) {
            const progress = Math.min(a.elapsed / effectiveDuration, 1) * 100;
            progressBar.style.width = progress + '%';
        }

        const timeEl = btn.children[2];
        if (timeEl) {
            const timeSuffix = t('time.seconds');
            timeEl.innerHTML = `⏱️ ${remainingTime}${timeSuffix} / ${effectiveDuration.toFixed(1)}${timeSuffix}`;
        }

        const counterEl = btn.children[4];
        if (counterEl) {
            counterEl.innerHTML = `${a.timesDone}/${a.maxTimes} ${t('ui.completed')}`;
        }
    });
}
