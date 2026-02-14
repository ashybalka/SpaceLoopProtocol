// =============== ЯДРО ИГРЫ ===============

const game = {
    stats: {
        strength: { loopExp: 0, permExp: 0, level: 0, permLevel: 0 },
        intelligence: { loopExp: 0, permExp: 0, level: 0, permLevel: 0 },
        agility: { loopExp: 0, permExp: 0, level: 0, permLevel: 0 },
        endurance: { loopExp: 0, permExp: 0, level: 0, permLevel: 0 },
        perception: { loopExp: 0, permExp: 0, level: 0, permLevel: 0 }
    },

    baseOxygen: 500,
    permanentLoopBonus: 0,
    loopTimeTotal: 500,
    loopTimeLeft: 500,
    loopElapsed: 0,
    realElapsed: 0,
    isLoopActive: false,

    currentChapter: 1,
    unlockedChapters: [1],

    activities: [],

    // Система лога с таймингами
    currentLoopLog: [],
    previousLoopLog: [],

    // Система автоматизации
    automationQueue: [],
    currentQueueIndex: 0,
    isAutoMode: false,
    autoRepeat: false,

    // Инвентарь
    inventory: [],

    // Ресурсы (постоянные, сохраняются между петлями)
    temporalDust: 0,
    oxygenSavePercent: 0, // % экономии кислорода (постоянный бонус)

    // Азот (оффлайн-ресурс)
    nitrogen: 0,
    maxNitrogen: 500,
    isNitroActive: false,
    lastOnlineTimestamp: Date.now()
};

const statIcons = {
    'strength': '💪',
    'intelligence': '🧠',
    'agility': '🎯',
    'endurance': '❤️',
    'perception': '👁️'
};

let lastTimestamp = performance.now();

// Расчёт максимального кислорода
function calculateMaxOxygen() {
    let permLevelsSum = 0;
    ['strength', 'intelligence', 'agility', 'endurance', 'perception'].forEach(statKey => {
        permLevelsSum += game.stats[statKey].permLevel;
    });
    return game.baseOxygen + game.permanentLoopBonus + (permLevelsSum * 1);
}

// Сброс состояния петли
function resetLoopState() {
    ['strength', 'intelligence', 'agility', 'endurance', 'perception'].forEach(statKey => {
        game.stats[statKey].loopExp = 0;
        game.stats[statKey].level = 0;
    });
    game.loopTimeTotal = calculateMaxOxygen();
    game.loopTimeLeft = game.loopTimeTotal;
    game.loopElapsed = 0;
    game.realElapsed = 0;
    game.currentChapter = 1;
    game.activities.forEach(a => {
        a.timesDone = 0;
        a.elapsed = 0;
        a.isActive = false;
        a.unlocked = a.defaultUnlocked;
    });
    game.currentQueueIndex = 0;
    game.automationQueue.forEach(item => item.completedInQueue = 0);
}

// Начать петлю
function startLoop() {
    if (game.currentLoopLog.length > 0) {
        game.previousLoopLog = [...game.currentLoopLog];
    }
    game.currentLoopLog = [];

    const logDiv = document.getElementById('log');
    if (logDiv) logDiv.innerHTML = '';

    resetLoopState();
    game.isLoopActive = true;
    lastTimestamp = performance.now();

    if (game.autoRepeat && game.automationQueue.length > 0) {
        game.isAutoMode = true;
        game.currentQueueIndex = 0;
    }

    // Начальное сообщение в зависимости от предметов
    const ownedItems = ['mirror-shard', 'memory-chip', 'emergency-respirator', 'id-bracelet', 'multitool', 'crew-id-card', 'used-stim-injector', 'ship-schematic', 'emergency-flashlight', 'broken-chronometer', 'corridor-map-fragment', 'gravity-stabilizer', 'echo-recorder', 'temporal-dust', 'magnetic-boots', 'bloodstained-tag', 'loop-shard']
        .filter(itemId => hasItem(itemId));

    if (ownedItems.length > 0) {
        const itemDescriptions = ownedItems
            .map(itemId => t('awakeningItemList.' + itemId))
            .filter(desc => desc);
        const itemsText = itemDescriptions.join(', ');
        addLog(t('log.awakeningWithItems', { items: itemsText }), 'stat');
    } else {
        addLog(t('log.awakening'), 'stat');
    }
    renderActivities();
    renderAutomationQueue();
    updateUI();
}

// Закончить петлю
function endLoop() {
    game.isLoopActive = false;

    ['strength', 'intelligence', 'agility', 'endurance', 'perception'].forEach(statKey => {
        const stat = game.stats[statKey];
        stat.loopExp = 0;
        stat.level = 0;
    });

    addLog(t('log.loopEnded'), 'power');
    addLog(t('log.progressSaved'), 'stat');

    saveGame();
    startLoop();
}

// Главный игровой цикл
function gameLoop(now) {
    let dt = (now - lastTimestamp) / 1000;
    lastTimestamp = now;

    if (dt > 0.1) {
        dt = 0.1;
    }

    const realDt = dt;

    // Ускорение времени от постоянных уровней (+1% за каждый)
    let permLevelsSum = 0;
    ['strength', 'intelligence', 'agility', 'endurance', 'perception'].forEach(statKey => {
        permLevelsSum += game.stats[statKey].permLevel;
    });
    dt *= 1 + permLevelsSum * 0.01;

    if (game.isLoopActive) {
        // Автоматический режим
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

        const hasActive = game.activities.some(a => a.isActive);

        // Нитро-режим: x10 скорость, расходует азот (только при активных активностях)
        if (game.isNitroActive && game.nitrogen > 0 && hasActive) {
            const nitrogenCost = realDt; // 1 азот за 1 реальную секунду
            game.nitrogen = Math.max(0, game.nitrogen - nitrogenCost);
            dt *= 10;
            if (game.nitrogen <= 0) {
                game.isNitroActive = false;
            }
        } else if (game.isNitroActive && game.nitrogen <= 0) {
            game.isNitroActive = false;
        }

        let oxygenDepleted = false;
        if (hasActive && game.loopTimeLeft > 0) {
            const oxygenDt = dt * (1 - getTotalOxygenSave() / 100);
            game.loopTimeLeft = Math.max(0, game.loopTimeLeft - oxygenDt);
            game.loopElapsed += dt;
            game.realElapsed += realDt;
            oxygenDepleted = game.loopTimeLeft <= 0;

            game.activities.forEach(a => {
                if (!a.isActive) return;
                if (a.timesDone >= a.maxTimes) {
                    a.isActive = false;
                    a.elapsed = 0;
                    return;
                }

                const statsWithWeights = getStatsWithWeights(a);

                // Рассчитываем множитель скорости для компенсации опыта
                let preCalcWeightedLevel = 0;
                statsWithWeights.forEach(({ statKey, weight }) => {
                    preCalcWeightedLevel += (game.stats[statKey]?.level || 0) * weight;
                });
                const durationMultiplier = Math.pow(0.97, preCalcWeightedLevel);
                const speedBonus = 1 / durationMultiplier; // Чем быстрее, тем больше опыта/сек

                let weightedLevel = 0;
                statsWithWeights.forEach(({ statKey, weight }) => {
                    const stat = game.stats[statKey];
                    if (!stat) return;

                    const itemBonus = 1 + getExpBonus(statKey);
                    const expGain = a.basePower * weight * Math.pow(1.10, stat.permLevel) * itemBonus * speedBonus * dt;

                    stat.loopExp += expGain;
                    stat.permExp += expGain;

                    let loopExpNeeded = 10 * Math.pow(1.25, stat.level);
                    while (stat.loopExp >= loopExpNeeded) {
                        stat.loopExp -= loopExpNeeded;
                        stat.level += 1;
                        game.permanentLoopBonus += 0.1;
                        game.loopTimeTotal = calculateMaxOxygen();
                        game.loopTimeLeft = Math.min(game.loopTimeLeft + 0.1, game.loopTimeTotal);
                        loopExpNeeded = 10 * Math.pow(1.25, stat.level);
                    }

                    let permExpNeeded = 100 * Math.pow(1.5, stat.permLevel);
                    while (stat.permExp >= permExpNeeded) {
                        stat.permExp -= permExpNeeded;
                        stat.permLevel += 1;
                        game.loopTimeTotal = calculateMaxOxygen();
                        game.loopTimeLeft = Math.min(game.loopTimeLeft + 1, game.loopTimeTotal);
                        permExpNeeded = 100 * Math.pow(1.5, stat.permLevel);
                    }

                    weightedLevel += stat.level * weight;
                });

                const scaledDuration = a.durationScale ? a.duration * Math.pow(a.durationScale, a.timesDone) : a.duration;
                const effectiveDuration = scaledDuration * Math.pow(0.97, weightedLevel);
                a.elapsed += dt;

                if (a.elapsed >= effectiveDuration) {
                    a.elapsed = 0;
                    completeActivity(a);
                    renderActivities();
                }
            });
        }

        if (oxygenDepleted) {
            endLoop();
        }
    }

    updateUI();
    requestAnimationFrame(gameLoop);
}

function toggleNitro() {
    if (game.isNitroActive) {
        game.isNitroActive = false;
    } else if (game.nitrogen > 0) {
        game.isNitroActive = true;
    }
}
