// =============== СИСТЕМА АКТИВНОСТЕЙ ===============

// Загрузка активностей из JSON
async function loadActivities() {
    try {
        const chapterFiles = [];
        for (let i = 1; i <= 10; i++) {
            chapterFiles.push(fetch(`activities/chapter${i}.json?t=` + Date.now()));
        }
        const responses = await Promise.all(chapterFiles);
        const allData = await Promise.all(responses.map(r => r.json()));
        const activitiesData = allData.flat();
        game.activities = activitiesData.map(act => ({
            ...act,
            timesDone: 0,
            elapsed: 0,
            isActive: false,
            unlocked: act.unlocked !== undefined ? act.unlocked : true,
            defaultUnlocked: act.unlocked !== undefined ? act.unlocked : true,
            totalCompletions: 0
        }));
        console.log('Активности загружены:', game.activities.length);
    } catch (e) {
        console.error('Ошибка загрузки активностей:', e);
        game.activities = [];
    }
}

// Порог для автоматизации
function getAutomationThreshold(activity) {
    if (activity.automationThreshold !== undefined) {
        return activity.automationThreshold;
    }
    return activity.maxTimes * 5;
}

// Получить статы с весами из активности
function getStatsWithWeights(activity) {
    if (activity.stats) {
        if (Array.isArray(activity.stats)) {
            const weight = 1 / activity.stats.length;
            return activity.stats.map(s => ({ statKey: s, weight }));
        } else {
            const entries = Object.entries(activity.stats);
            return entries.map(([statKey, pct]) => ({ statKey, weight: pct / 100 }));
        }
    } else if (activity.stat) {
        return [{ statKey: activity.stat, weight: 1 }];
    }
    return [];
}

// Отрисовка активностей
function renderActivities() {
    const container = document.getElementById('activities-container');
    container.innerHTML = '';

    const chapterTitle = document.getElementById('chapter-title');
    if (chapterTitle) {
        chapterTitle.textContent = getChapterName(game.currentChapter);
    }

    // Заглушка для глав за пределами демо
    if (game.currentChapter > 3) {
        const demoDiv = document.createElement('div');
        demoDiv.className = 'demo-stub';
        demoDiv.innerHTML = `
            <h2>${t('chapters.demoTitle')}</h2>
            <p>${t('chapters.demoText').replace(/\n/g, '<br>')}</p>
        `;
        container.appendChild(demoDiv);
        return;
    }

    game.activities.forEach(activity => {
        if (activity.chapter !== game.currentChapter) return;
        if (!activity.unlocked) return;
        if (activity.timesDone >= activity.maxTimes) return;

        const isExcluded = game.activities.some(other =>
            other.excludes &&
            other.excludes.includes(activity.id) &&
            other.timesDone > 0
        );
        if (isExcluded) return;

        const canPlay = activity.timesDone < activity.maxTimes && game.isLoopActive;
        const btn = document.createElement('button');
        btn.className = 'activity-btn' + (activity.isActive ? ' activity-active' : '');
        btn.disabled = !canPlay && !activity.isActive;

        const statsWithWeights = getStatsWithWeights(activity);
        const statIconsStr = statsWithWeights.map(({ statKey, weight }) => {
            const icon = statIcons[statKey] || '?';
            return `${icon}${Math.round(weight * 100)}%`;
        }).join(' ');
        const weightedLevel = statsWithWeights.reduce((sum, { statKey, weight }) =>
            sum + (game.stats[statKey]?.level || 0) * weight, 0);
        const scaledDuration = activity.durationScale ? activity.duration * Math.pow(activity.durationScale, activity.timesDone) : activity.duration;
        const effectiveDuration = scaledDuration * Math.pow(0.97, weightedLevel);
        const progress = Math.min(activity.elapsed / effectiveDuration, 1) * 100;
        const remainingTime = Math.max(0, effectiveDuration - activity.elapsed).toFixed(1);

        const autoThreshold = getAutomationThreshold(activity);
        const canAutomateAct = activity.totalCompletions >= autoThreshold;
        let autoBtn = '';
        if (canAutomateAct) {
            autoBtn = `<span class="auto-indicator can-add" data-id="${activity.id}" title="${t('automation.addToQueue')}">➕</span>`;
        } else {
            const remaining = autoThreshold - activity.totalCompletions;
            autoBtn = `<span class="auto-indicator locked" title="${t('automation.remainingCompletions', {count: remaining})}">🔒${remaining}</span>`;
        }

        const activityName = tActivity(activity.id, 'name') || activity.name;
        const activityDesc = tActivity(activity.id, 'description') || activity.description;
        const timeSuffix = t('time.seconds');

        btn.innerHTML = `
            <div class="act-header">
                <span class="act-name">${activityName}</span>
                ${autoBtn}
            </div>
            <div class="act-stats">${statIconsStr}</div>
            <div class="act-timer">⏱️ ${remainingTime}${timeSuffix} / ${effectiveDuration.toFixed(1)}${timeSuffix}</div>
            <div class="act-desc">${activityDesc}</div>
            <div class="act-completed">${activity.timesDone}/${activity.maxTimes >= 999 ? '∞' : activity.maxTimes} ${t('ui.completed')}</div>
            <div class="activity-progress">
                <div class="activity-progress-bar" data-id="${activity.id}" style="width: ${progress}%"></div>
            </div>
        `;

        btn.addEventListener('click', (e) => {
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

    renderAutomationQueue();
}

// Переключение активности
function toggleActivity(id) {
    if (!game.isLoopActive) return;
    const a = game.activities.find(x => x.id === id);
    if (!a) return;
    if (a.timesDone >= a.maxTimes) return;

    if (game.isAutoMode) {
        game.isAutoMode = false;
        renderAutomationQueue();
    }

    if (a.isActive) {
        a.isActive = false;
    } else {
        game.activities.forEach(activity => {
            if (activity.id !== id && activity.isActive) {
                activity.isActive = false;
            }
        });
        a.isActive = true;
    }
    renderActivities();
}

// Проверка триггеров разблокировки
function checkUnlockTriggers() {
    game.activities.forEach(activity => {
        if (activity.unlocked) return;
        if (!activity.unlockTrigger) return;

        const trigger = activity.unlockTrigger;

        if (trigger.type === 'activityComplete' || trigger.type === 'activityTotalComplete') {
            const requirements = trigger.activityId;
            const useTotal = trigger.type === 'activityTotalComplete';
            const check = (id, times) => {
                const target = game.activities.find(a => a.id === id);
                return target && (useTotal ? target.totalCompletions : target.timesDone) >= times;
            };

            const entries = Object.entries(requirements);
            const met = trigger.logic === 'or'
                ? entries.some(([id, times]) => check(id, times))
                : entries.every(([id, times]) => check(id, times));

            if (met) {
                activity.unlocked = true;
                const unlockMsg = tActivity(activity.id, 'unlockMessage') || activity.unlockMessage;
                if (unlockMsg) {
                    addLog(unlockMsg, 'history');
                }
                const activityName = tActivity(activity.id, 'name') || activity.name;
                addLog(t('log.newActivityUnlocked', { name: activityName }), 'power');
            }
        }
    });
}

// Завершение активности
function completeActivity(a) {
    a.timesDone += 1;
    a.totalCompletions += 1;
    const activityName = tActivity(a.id, 'name') || a.name;

    const autoThreshold = getAutomationThreshold(a);
    if (a.totalCompletions === autoThreshold) {
        addLog(t('automation.unlocked', { name: activityName }), 'power');
    }

    addLog(t('log.activityCompleted', { name: activityName, done: a.timesDone, max: a.maxTimes >= 999 ? '∞' : a.maxTimes }), 'complete');

    let completeMsg = tActivity(a.id, 'completeMessage');

    // Проверяем, нужно ли показать альтернативное сообщение (предмет уже получен)
    const itemRewardMap = {
        'explore-capsule': { maxTime: 5, item: 'mirror-shard' },
        'achieve-inner-peace': { maxTime: 1, item: 'memory-chip' },
        'examine-door': { maxTime: 3, item: 'emergency-respirator' },
        'recall-memory': { maxTime: 4, item: 'id-bracelet' },
        'clear-debris': { maxTime: 3, item: 'multitool' },
        'decode-crew-message': { maxTime: 1, item: 'crew-id-card' },
        'use-stim-pack': { maxTime: 1, item: 'used-stim-injector' },
        'decrypt-loop-protocol': { maxTime: 1, item: 'ship-schematic' },
        'open-intact-capsules': { maxTime: 5, item: 'emergency-flashlight' },
        'identify-temporal-loophole': { maxTime: 5, item: 'broken-chronometer' },
        'find-scratched-message': { maxTime: 1, item: 'corridor-map-fragment' },
        'collect-temporal-residue': { maxTime: 3, item: 'gravity-stabilizer' },
        'search-for-echo': { maxTime: 8, item: 'echo-recorder' },
        'watch-ink-fade': { maxTime: 5, item: 'temporal-dust' },
        'test-gravity-fluctuations': { maxTime: 10, item: 'magnetic-boots' },
        'trace-old-bloodstains': { maxTime: 5, item: 'bloodstained-tag' },
        'anchor-in-present': { maxTime: 5, item: 'loop-shard' }
    };

    const itemCheck = itemRewardMap[a.id];
    if (itemCheck && a.timesDone === itemCheck.maxTime && hasItem(itemCheck.item)) {
        completeMsg = tActivity(a.id, 'completeMessageNoItem') || completeMsg;
    }

    if (completeMsg) {
        if (Array.isArray(completeMsg)) {
            const msgIndex = Math.min(a.timesDone - 1, completeMsg.length - 1);
            addLog(completeMsg[msgIndex], 'history');
        } else {
            addLog(completeMsg, 'history');
        }
    }

    // Награды при каждом завершении
    if (a.reward) {
        if (a.reward.oxygen) {
            addLog(t('log.oxygenBonus', { amount: a.reward.oxygen }), 'power');
            game.loopTimeLeft = Math.min(game.loopTimeLeft + a.reward.oxygen, game.loopTimeTotal);
        }
        if (a.reward.item) {
            if (addItemToInventory(a.reward.item)) {
                addLog(t('log.itemFound', { item: t('items.' + a.reward.item + '.name') }), 'power');
            }
        }
        if (a.reward.temporalDust) {
            game.temporalDust += a.reward.temporalDust;
            addLog(t('log.temporalDust', { amount: a.reward.temporalDust, total: game.temporalDust }), 'power');
        }
        if (a.reward.switchChapter) {
            const targetChapter = a.reward.switchChapter;
            if (!game.unlockedChapters.includes(targetChapter)) {
                game.unlockedChapters.push(targetChapter);
                addLog(t('log.chapterOpened', { chapter: getChapterName(targetChapter) }), 'power');
            }
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

        if (a.rewardOnComplete) {
            if (a.rewardOnComplete.item) {
                if (addItemToInventory(a.rewardOnComplete.item)) {
                    addLog(t('log.itemFound', { item: t('items.' + a.rewardOnComplete.item + '.name') }), 'power');
                }
            }
            if (a.rewardOnComplete.oxygen) {
                addLog(t('log.oxygenBonus', { amount: a.rewardOnComplete.oxygen }), 'power');
                game.loopTimeLeft = Math.min(game.loopTimeLeft + a.rewardOnComplete.oxygen, game.loopTimeTotal);
            }
            if (a.rewardOnComplete.oxygenSavePercent) {
                game.oxygenSavePercent += a.rewardOnComplete.oxygenSavePercent;
                addLog(t('log.oxygenSave', { percent: a.rewardOnComplete.oxygenSavePercent, total: getTotalOxygenSave() }), 'power');
            }
        }
    }

    // Обработка очереди автоматизации
    if (game.isAutoMode) {
        const queueItem = game.automationQueue.find(q => q.activityId === a.id);
        if (queueItem) {
            queueItem.completedInQueue += 1;
            if (queueItem.completedInQueue >= queueItem.repeatCount || a.timesDone >= a.maxTimes) {
                game.currentQueueIndex = (game.currentQueueIndex + 1) % game.automationQueue.length;
            }
            a.isActive = false;
            renderAutomationQueue();
        }
    }

    checkUnlockTriggers();
}
