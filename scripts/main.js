// =============== ИНИЦИАЛИЗАЦИЯ ===============

async function init() {
    await loadTranslations();
    await loadActivities();
    loadGame();
    applyTranslations();
    renderActivities();
    renderAutomationQueue();
    updateUI();
    initLogFilters();
    startAutoSave();
}

// Запуск игры
init().then(() => {
    requestAnimationFrame(gameLoop);
});
