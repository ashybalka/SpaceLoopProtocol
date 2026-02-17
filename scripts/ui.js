// =============== ИНТЕРФЕЙС ===============

let logFilters = { all: true, complete: true, history: true, stat: true, power: true };

// Format numbers for incremental game style (1000 = 1K, 1000000 = 1M)
function formatNumber(num) {
    num = Math.floor(num);
    if (num < 1000) return num.toString();
    if (num < 1000000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    if (num < 1000000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num < 1000000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    return (num / 1000000000000).toFixed(1).replace(/\.0$/, '') + 'T';
}

// Тултип для экономии кислорода (делегирование — бейдж создаётся динамически)
function initOxygenSaveTooltip() {
    const tooltip = document.getElementById('oxygen-save-tooltip');
    if (!tooltip) return;

    document.addEventListener('mouseover', (e) => {
        const badge = e.target.closest('#oxygen-save-badge');
        if (!badge) return;

        const lines = [];
        if (game.oxygenSavePercent > 0) {
            lines.push(`<div class="tooltip-line"><span>${t('ui.oxygenSaveActivity')}</span><span class="tooltip-value">-${game.oxygenSavePercent}%</span></div>`);
        }
        for (const item of game.inventory) {
            if (item.bonuses && item.bonuses.oxygenSavePercent) {
                const name = t('items.' + item.id + '.name');
                lines.push(`<div class="tooltip-line"><span>${name}</span><span class="tooltip-value">-${item.bonuses.oxygenSavePercent}%</span></div>`);
            }
        }
        if (lines.length > 0) {
            tooltip.innerHTML = lines.join('');
            // Show offscreen first to measure height
            tooltip.style.left = '-9999px';
            tooltip.style.top = '-9999px';
            tooltip.style.display = 'block';
            const tooltipH = tooltip.offsetHeight;
            const tooltipW = tooltip.offsetWidth;
            const rect = badge.getBoundingClientRect();
            // Position above the badge, centered horizontally
            let left = rect.left + rect.width / 2 - tooltipW / 2;
            let top = rect.top - tooltipH - 8;
            // If doesn't fit above, show below
            if (top < 4) top = rect.bottom + 8;
            // Keep within viewport horizontally
            left = Math.max(4, Math.min(left, window.innerWidth - tooltipW - 4));
            tooltip.style.left = left + 'px';
            tooltip.style.top = top + 'px';
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (e.target.closest('#oxygen-save-badge')) {
            tooltip.style.display = 'none';
        }
    });
}

// Тултип для бонусов предметов на статах
function initStatBonusTooltip() {
    const tooltip = document.getElementById('stat-bonus-tooltip');
    if (!tooltip) return;

    document.addEventListener('mouseover', (e) => {
        const badge = e.target.closest('.stat-multiplier');
        if (!badge) return;

        // Get stat key from ID (e.g., "strength-multiplier" -> "strength")
        const statKey = badge.id.replace('-multiplier', '');
        const stat = game.stats[statKey];
        const bonusKey = statKey + 'Exp';
        const lines = [];
        // Perm level bonus
        if (stat && stat.permLevel > 0) {
            const permMult = Math.pow(1.10, stat.permLevel);
            lines.push(`<div class="tooltip-line"><span>${t('ui.permanent')} ${t('ui.level')} ${stat.permLevel}</span><span class="tooltip-value">x${permMult.toFixed(2)}</span></div>`);
        }
        // Item bonuses
        for (const item of game.inventory) {
            if (item.bonuses && item.bonuses[bonusKey]) {
                const name = t('items.' + item.id + '.name');
                lines.push(`<div class="tooltip-line"><span>${name}</span><span class="tooltip-value">+${Math.round(item.bonuses[bonusKey] * 100)}%</span></div>`);
            }
        }
        if (lines.length > 0) {
            tooltip.innerHTML = lines.join('');
            tooltip.style.left = '-9999px';
            tooltip.style.top = '-9999px';
            tooltip.style.display = 'block';
            const tooltipH = tooltip.offsetHeight;
            const tooltipW = tooltip.offsetWidth;
            const rect = badge.getBoundingClientRect();
            let left = rect.right + 8;
            let top = rect.top + rect.height / 2 - tooltipH / 2;
            if (left + tooltipW > window.innerWidth - 4) left = rect.left - tooltipW - 8;
            top = Math.max(4, Math.min(top, window.innerHeight - tooltipH - 4));
            tooltip.style.left = left + 'px';
            tooltip.style.top = top + 'px';
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (e.target.closest('.stat-multiplier')) {
            tooltip.style.display = 'none';
        }
    });
}

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
}

// Обновление UI
function updateUI() {
    ['strength', 'intelligence', 'agility', 'endurance', 'perception'].forEach(statKey => {
        const stat = game.stats[statKey];

        // Update levels
        document.getElementById(`${statKey}-level`).textContent = stat.level;
        document.getElementById(`${statKey}-perm-level`).textContent = stat.permLevel;

        // Calculate exp multiplier
        const itemBonus = getExpBonus(statKey);
        const permMultiplier = Math.pow(1.10, stat.permLevel);
        const totalMultiplier = (1 + itemBonus) * permMultiplier;
        document.getElementById(`${statKey}-multiplier`).textContent = `x${totalMultiplier.toFixed(2)}`;

        // Update loop exp
        const loopExpNeeded = 10 * Math.pow(1.25, stat.level);
        const loopExpProgress = (stat.loopExp / loopExpNeeded) * 100;
        document.getElementById(`${statKey}-loop-exp`).textContent = `${formatNumber(stat.loopExp)}/${formatNumber(loopExpNeeded)}`;
        document.getElementById(`${statKey}-loop-bar`).style.width = `${loopExpProgress}%`;

        // Update permanent exp
        const permExpNeeded = 100 * Math.pow(1.5, stat.permLevel);
        const permExpProgress = (stat.permExp / permExpNeeded) * 100;
        document.getElementById(`${statKey}-perm-exp`).textContent = `${formatNumber(stat.permExp)}/${formatNumber(permExpNeeded)}`;
        document.getElementById(`${statKey}-perm-bar`).style.width = `${permExpProgress}%`;
    });

    // Ресурсы (темпоральная пыль)
    const resourcesSection = document.getElementById('resources-section');
    const dustCount = document.getElementById('temporal-dust-count');
    if (resourcesSection && dustCount) {
        resourcesSection.style.display = game.temporalDust > 0 ? 'block' : 'none';
        dustCount.textContent = game.temporalDust;
    }

    // Азот и нитро
    const nitrogenCount = document.getElementById('nitrogen-count');
    const nitrogenMax = document.getElementById('nitrogen-max');
    const nitrogenFill = document.getElementById('nitrogen-fill');
    const nitroBtn = document.getElementById('nitro-btn');
    if (nitrogenCount) nitrogenCount.textContent = Math.floor(game.nitrogen);
    if (nitrogenMax) nitrogenMax.textContent = game.maxNitrogen;
    if (nitrogenFill) {
        nitrogenFill.style.width = (game.nitrogen / game.maxNitrogen * 100) + '%';
    }
    if (nitroBtn) {
        nitroBtn.classList.toggle('nitro-active', game.isNitroActive);
        nitroBtn.disabled = game.nitrogen <= 0 && !game.isNitroActive;
    }

    const timeRemaining = game.loopTimeLeft;
    document.getElementById('loop-time').textContent = timeRemaining.toFixed(1);
    const maxOxygenEl = document.getElementById('loop-time-max');
    if (maxOxygenEl) {
        maxOxygenEl.textContent = game.loopTimeTotal.toFixed(1);
    }
    // Бейдж экономии кислорода (создаём динамически если нет)
    let oxygenSaveBadge = document.getElementById('oxygen-save-badge');
    if (!oxygenSaveBadge) {
        const label = document.getElementById('oxygen-label');
        if (label) {
            oxygenSaveBadge = document.createElement('span');
            oxygenSaveBadge.id = 'oxygen-save-badge';
            oxygenSaveBadge.className = 'oxygen-save-badge';
            label.appendChild(oxygenSaveBadge);
        }
    }
    if (oxygenSaveBadge) {
        const totalSave = getTotalOxygenSave();
        if (totalSave > 0) {
            oxygenSaveBadge.style.display = '';
            oxygenSaveBadge.textContent = ` (-${totalSave}%)`;
        } else {
            oxygenSaveBadge.style.display = 'none';
        }
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
        const scaledDuration = a.durationScale ? a.duration * Math.pow(a.durationScale, a.timesDone) : a.duration;
        const effectiveDuration = scaledDuration * Math.pow(0.97, weightedLevel);
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
            counterEl.innerHTML = `${a.timesDone}/${a.maxTimes >= 999 ? '∞' : a.maxTimes} ${t('ui.completed')}`;
        }
    });
}
