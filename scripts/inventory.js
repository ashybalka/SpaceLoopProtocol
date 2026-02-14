// =============== ИНВЕНТАРЬ ===============

const ITEMS = {
    // Глава 1
    'mirror-shard': {
        id: 'mirror-shard',
        icon: '🪞',
        bonuses: {
            perceptionExp: 0.3
        }
    },
    'memory-chip': {
        id: 'memory-chip',
        icon: '💾',
        bonuses: {
            intelligenceExp: 0.4
        }
    },
    'emergency-respirator': {
        id: 'emergency-respirator',
        icon: '😷',
        bonuses: {
            enduranceExp: 0.35,
            oxygenSavePercent: 5
        }
    },
    'id-bracelet': {
        id: 'id-bracelet',
        icon: '📿',
        bonuses: {
            perceptionExp: 0.2,
            intelligenceExp: 0.15
        }
    },
    // Глава 2
    'multitool': {
        id: 'multitool',
        icon: '🔧',
        bonuses: {
            agilityExp: 0.5,
            strengthExp: 0.25
        }
    },
    'crew-id-card': {
        id: 'crew-id-card',
        icon: '🪪',
        bonuses: {
            intelligenceExp: 0.25
        }
    },
    'used-stim-injector': {
        id: 'used-stim-injector',
        icon: '💉',
        bonuses: {
            enduranceExp: 0.3
        }
    },
    'ship-schematic': {
        id: 'ship-schematic',
        icon: '📋',
        bonuses: {
            perceptionExp: 0.15,
            intelligenceExp: 0.15
        }
    },
    'emergency-flashlight': {
        id: 'emergency-flashlight',
        icon: '🔦',
        bonuses: {
            agilityExp: 0.2
        }
    },
    // Глава 3
    'broken-chronometer': {
        id: 'broken-chronometer',
        icon: '🕐',
        bonuses: {
            intelligenceExp: 0.15,
            perceptionExp: 0.15
        }
    },
    'corridor-map-fragment': {
        id: 'corridor-map-fragment',
        icon: '🗺️',
        bonuses: {
            perceptionExp: 0.25,
            agilityExp: 0.1
        }
    },
    'gravity-stabilizer': {
        id: 'gravity-stabilizer',
        icon: '⚖️',
        bonuses: {
            strengthExp: 0.2,
            enduranceExp: 0.15
        }
    },
    'echo-recorder': {
        id: 'echo-recorder',
        icon: '🎙️',
        bonuses: {
            perceptionExp: 0.2,
            enduranceExp: 0.15
        }
    },
    'temporal-dust': {
        id: 'temporal-dust',
        icon: '✨',
        bonuses: {
            intelligenceExp: 0.25,
            perceptionExp: 0.1
        }
    },
    'magnetic-boots': {
        id: 'magnetic-boots',
        icon: '🥾',
        bonuses: {
            agilityExp: 0.2,
            strengthExp: 0.15
        }
    },
    'bloodstained-tag': {
        id: 'bloodstained-tag',
        icon: '🏷️',
        bonuses: {
            perceptionExp: 0.15,
            enduranceExp: 0.2
        }
    },
    'loop-shard': {
        id: 'loop-shard',
        icon: '💎',
        bonuses: {
            enduranceExp: 0.2,
            strengthExp: 0.2
        }
    }
};

function addItemToInventory(itemId) {
    if (game.inventory.find(i => i.id === itemId)) {
        return false;
    }

    const itemDef = ITEMS[itemId];
    if (!itemDef) return false;

    game.inventory.push({
        id: itemDef.id,
        icon: itemDef.icon,
        bonuses: { ...itemDef.bonuses }
    });

    // Лог о бонусе экономии кислорода
    if (itemDef.bonuses.oxygenSavePercent) {
        addLog(t('log.oxygenSave', { percent: itemDef.bonuses.oxygenSavePercent, total: getTotalOxygenSave() }), 'power');
    }

    renderInventory();
    showItemModal(itemId);
    return true;
}

function hasItem(itemId) {
    return game.inventory.some(i => i.id === itemId);
}

function getItemOxygenSave() {
    let bonus = 0;
    for (const item of game.inventory) {
        if (item.bonuses && item.bonuses.oxygenSavePercent) {
            bonus += item.bonuses.oxygenSavePercent;
        }
    }
    return bonus;
}

function getTotalOxygenSave() {
    return game.oxygenSavePercent + getItemOxygenSave();
}

function getExpBonus(statKey) {
    let bonus = 0;
    for (const item of game.inventory) {
        const bonusKey = statKey + 'Exp';
        if (item.bonuses && item.bonuses[bonusKey]) {
            bonus += item.bonuses[bonusKey];
        }
    }
    return bonus;
}

function renderInventory() {
    const section = document.getElementById('inventory-section');
    const container = document.getElementById('inventory-items');
    const tooltip = document.getElementById('inventory-tooltip');

    if (!section || !container) return;

    if (game.inventory.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    container.innerHTML = '';

    for (const item of game.inventory) {
        const itemEl = document.createElement('div');
        itemEl.className = 'inventory-item';
        itemEl.textContent = item.icon;

        itemEl.addEventListener('mouseenter', () => {
            if (!tooltip) return;
            tooltip.innerHTML = `
                <div class="item-name">${t('items.' + item.id + '.name')}</div>
                <div class="item-bonus">${getItemBonusText(item)}</div>
            `;
            const rect = itemEl.getBoundingClientRect();
            tooltip.style.left = (rect.right + 10) + 'px';
            tooltip.style.top = (rect.top + rect.height / 2) + 'px';
            tooltip.style.transform = 'translateY(-50%)';
            tooltip.style.display = 'block';
        });

        itemEl.addEventListener('mouseleave', () => {
            if (tooltip) tooltip.style.display = 'none';
        });

        container.appendChild(itemEl);
    }
}

function getItemBonusText(item) {
    const lines = [];
    if (item.bonuses.agilityExp) {
        lines.push(`+${Math.round(item.bonuses.agilityExp * 100)}% ${t('stats.agility')} XP`);
    }
    if (item.bonuses.strengthExp) {
        lines.push(`+${Math.round(item.bonuses.strengthExp * 100)}% ${t('stats.strength')} XP`);
    }
    if (item.bonuses.intelligenceExp) {
        lines.push(`+${Math.round(item.bonuses.intelligenceExp * 100)}% ${t('stats.intelligence')} XP`);
    }
    if (item.bonuses.enduranceExp) {
        lines.push(`+${Math.round(item.bonuses.enduranceExp * 100)}% ${t('stats.endurance')} XP`);
    }
    if (item.bonuses.perceptionExp) {
        lines.push(`+${Math.round(item.bonuses.perceptionExp * 100)}% ${t('stats.perception')} XP`);
    }
    if (item.bonuses.oxygenSavePercent) {
        lines.push(`-${item.bonuses.oxygenSavePercent}% ${t('ui.oxygen')}`);
    }
    return lines.join('<br>');
}

function showItemModal(itemId) {
    const itemDef = ITEMS[itemId];
    if (!itemDef) return;

    const modal = document.getElementById('item-modal');
    const iconEl = document.getElementById('item-modal-icon');
    const nameEl = document.getElementById('item-modal-name');
    const bonusesEl = document.getElementById('item-modal-bonuses');

    if (!modal) return;

    iconEl.textContent = itemDef.icon;
    nameEl.textContent = t('items.' + itemId + '.name');

    const item = { bonuses: itemDef.bonuses };
    bonusesEl.innerHTML = getItemBonusText(item).split('<br>').map(line =>
        `<div class="bonus-line">✦ ${line}</div>`
    ).join('');

    modal.style.display = 'flex';
}

function closeItemModal() {
    const modal = document.getElementById('item-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}
