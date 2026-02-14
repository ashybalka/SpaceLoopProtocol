// =============== СОХРАНЕНИЕ И ЗАГРУЗКА ===============

let autoSaveInterval = null;

function startAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    autoSaveInterval = setInterval(() => {
        if (game.isLoopActive) {
            saveGame();
            console.log('Автосохранение...');
        }
    }, 15000);
}

let _importingFlag = false;

function saveGame() {
    if (_importingFlag) return;
    localStorage.setItem('cryoCapsuleGame', JSON.stringify({
        stats: game.stats,
        isLoopActive: game.isLoopActive,
        permanentLoopBonus: game.permanentLoopBonus,
        loopTimeTotal: game.loopTimeTotal,
        loopTimeLeft: game.loopTimeLeft,
        loopElapsed: game.loopElapsed,
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
        automationQueue: game.automationQueue,
        isAutoMode: game.isAutoMode,
        autoRepeat: game.autoRepeat,
        previousLoopLog: game.previousLoopLog,
        inventory: game.inventory,
        temporalDust: game.temporalDust,
        oxygenSavePercent: game.oxygenSavePercent,
        nitrogen: game.nitrogen,
        lastOnlineTimestamp: Date.now()
    }));

    const indicator = document.getElementById('save-indicator');
    if (indicator) {
        indicator.classList.remove('saving');
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
        if (data.isLoopActive !== undefined) {
            game.isLoopActive = data.isLoopActive;
        }
        if (data.permanentLoopBonus !== undefined) {
            game.permanentLoopBonus = data.permanentLoopBonus;
        }
        game.loopTimeTotal = calculateMaxOxygen();
        if (data.loopTimeLeft !== undefined) {
            game.loopTimeLeft = Math.min(data.loopTimeLeft, game.loopTimeTotal);
        }
        if (data.loopElapsed !== undefined) {
            game.loopElapsed = data.loopElapsed;
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
                    if (savedAct.unlocked !== undefined) {
                        act.unlocked = savedAct.unlocked;
                    }
                    if (savedAct.totalCompletions !== undefined) {
                        act.totalCompletions = savedAct.totalCompletions;
                    }
                }
            });
            checkUnlockTriggers();
        }
        if (data.automationQueue) {
            game.automationQueue = data.automationQueue;
        }
        if (data.isAutoMode !== undefined) {
            game.isAutoMode = data.isAutoMode;
        }
        if (data.autoRepeat !== undefined) {
            game.autoRepeat = data.autoRepeat;
        }
        if (data.previousLoopLog) {
            game.previousLoopLog = data.previousLoopLog;
        }
        if (data.inventory && Array.isArray(data.inventory)) {
            game.inventory = data.inventory.map(savedItem => {
                const def = ITEMS[savedItem.id];
                if (def) {
                    savedItem.bonuses = { ...def.bonuses };
                }
                return savedItem;
            });
            renderInventory();
        }
        if (data.temporalDust !== undefined) {
            game.temporalDust = data.temporalDust;
        }
        if (data.oxygenSavePercent !== undefined) {
            game.oxygenSavePercent = data.oxygenSavePercent;
        }
        if (data.nitrogen !== undefined) {
            game.nitrogen = data.nitrogen;
        }
        // Оффлайн-начисление азота
        if (data.lastOnlineTimestamp) {
            const offlineSeconds = (Date.now() - data.lastOnlineTimestamp) / 1000;
            if (offlineSeconds > 10) {
                const earned = Math.floor(offlineSeconds / 10);
                const added = Math.min(earned, game.maxNitrogen - game.nitrogen);
                if (added > 0) {
                    game.nitrogen = Math.min(game.nitrogen + added, game.maxNitrogen);
                    addLog(t('log.offlineNitrogen', { amount: added, time: formatOfflineTime(offlineSeconds) }), 'power');
                }
            }
        }
        game.lastOnlineTimestamp = Date.now();
        addLog(t('log.saveLoaded'), 'stat');
        renderAutomationQueue();

        if (game.isLoopActive && game.loopTimeLeft <= 0) {
            endLoop();
        }
    } else {
        startLoop();
    }
}

function formatOfflineTime(seconds) {
    if (seconds < 60) return Math.floor(seconds) + 's';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h + 'h ' + m + 'm';
}

function resetGame() {
    if (confirm(t('dialogs.resetConfirm'))) {
        localStorage.removeItem('cryoCapsuleGame');
        location.reload();
    }
}
