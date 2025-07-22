// src/systems/InventorySystem.js - Полная система инвентаря
export class InventorySystem {
    constructor() {
        this.openInventories = new Map();
        this.draggedItem = null;
        this.dragOffset = { x: 0, y: 0 };
    }
    
    // Создание инвентаря для сущности
    createInventory(entity, config = {}) {
        const inventory = {
            entity: entity,
            slots: config.slots || this.calculateSlots(entity),
            items: new Array(config.slots || this.calculateSlots(entity)).fill(null),
            weight: 0,
            maxWeight: config.maxWeight || this.calculateMaxWeight(entity),
            gold: 0,
            isOpen: false,
            ui: null
        };
        
        entity.inventory = inventory;
        return inventory;
    }
    
    calculateSlots(entity) {
        let baseSlots = 20; // Базовое количество слотов
        
        // Бонусы от расы
        if (entity.race?.bonuses?.inventory_slots) {
            baseSlots += entity.race.bonuses.inventory_slots;
        }
        
        // Бонусы от класса
        if (entity.unitClass?.inventory_bonus) {
            baseSlots += entity.unitClass.inventory_bonus;
        }
        
        // Бонусы от экипировки (рюкзаки, сумки)
        if (entity.equipment?.back?.inventory_bonus) {
            baseSlots += entity.equipment.back.inventory_bonus;
        }
        
        return baseSlots;
    }
    
    calculateMaxWeight(entity) {
        let baseWeight = 100; // Базовая грузоподъемность
        
        // Бонус от силы
        if (entity.stats?.strength) {
            baseWeight += entity.stats.strength * 5;
        }
        
        return baseWeight;
    }
    
    // Добавление предмета
    addItem(inventory, item, quantity = 1) {
        if (!item) return { success: false, reason: 'Invalid item' };
        
        // Проверяем, можно ли стакать предмет
        if (item.stackable) {
            const existingSlot = this.findExistingStack(inventory, item);
            if (existingSlot !== -1) {
                const currentStack = inventory.items[existingSlot];
                const maxStack = item.max_stack || 99;
                const canAdd = Math.min(quantity, maxStack - currentStack.quantity);
                
                if (canAdd > 0) {
                    currentStack.quantity += canAdd;
                    quantity -= canAdd;
                }
            }
        }
        
        // Добавляем оставшееся количество в новые слоты
        while (quantity > 0) {
            const emptySlot = this.findEmptySlot(inventory);
            if (emptySlot === -1) {
                return { success: false, reason: 'Inventory full' };
            }
            
            const stackSize = Math.min(quantity, item.max_stack || 1);
            inventory.items[emptySlot] = {
                item: { ...item },
                quantity: stackSize,
                condition: item.max_durability || 100
            };
            
            quantity -= stackSize;
        }
        
        this.updateInventoryWeight(inventory);
        this.updateInventoryUI(inventory);
        
        return { success: true };
    }
    
    // Удаление предмета
    removeItem(inventory, slotIndex, quantity = 1) {
        if (!inventory.items[slotIndex]) return { success: false };
        
        const slot = inventory.items[slotIndex];
        
        if (quantity >= slot.quantity) {
            // Удаляем полностью
            const removedItem = inventory.items[slotIndex];
            inventory.items[slotIndex] = null;
            this.updateInventoryWeight(inventory);
            this.updateInventoryUI(inventory);
            return { success: true, item: removedItem };
        } else {
            // Удаляем частично
            slot.quantity -= quantity;
            this.updateInventoryWeight(inventory);
            this.updateInventoryUI(inventory);
            return { success: true, item: { ...slot.item, quantity: quantity } };
        }
    }
    
    // Перемещение предмета между слотами
    moveItem(inventory, fromSlot, toSlot) {
        if (!inventory.items[fromSlot]) return false;
        
        const fromItem = inventory.items[fromSlot];
        const toItem = inventory.items[toSlot];
        
        if (!toItem) {
            // Простое перемещение в пустой слот
            inventory.items[toSlot] = fromItem;
            inventory.items[fromSlot] = null;
        } else if (toItem.item.id === fromItem.item.id && toItem.item.stackable) {
            // Объединение стаков
            const maxStack = toItem.item.max_stack || 99;
            const canMove = Math.min(fromItem.quantity, maxStack - toItem.quantity);
            
            toItem.quantity += canMove;
            fromItem.quantity -= canMove;
            
            if (fromItem.quantity <= 0) {
                inventory.items[fromSlot] = null;
            }
        } else {
            // Обмен местами
            inventory.items[toSlot] = fromItem;
            inventory.items[fromSlot] = toItem;
        }
        
        this.updateInventoryUI(inventory);
        return true;
    }
    
    // Использование предмета
    useItem(inventory, slotIndex) {
        const slot = inventory.items[slotIndex];
        if (!slot || !slot.item.usable) return false;
        
        const item = slot.item;
        const entity = inventory.entity;
        
        // Применяем эффекты предмета
        if (item.effects) {
            this.applyItemEffects(entity, item.effects);
        }
        
        // Уменьшаем количество (если расходуемый)
        if (item.consumable !== false) {
            this.removeItem(inventory, slotIndex, 1);
        }
        
        entity.emit('item_used', { item, slot: slotIndex });
        return true;
    }
    
    applyItemEffects(entity, effects) {
        Object.entries(effects).forEach(([effect, value]) => {
            switch (effect) {
                case 'health_restore':
                    entity.heal(value);
                    break;
                case 'mana_restore':
                    if (entity.stats.current_mana !== undefined) {
                        entity.stats.current_mana = Math.min(
                            entity.stats.max_mana || entity.stats.mana,
                            (entity.stats.current_mana || 0) + value
                        );
                    }
                    break;
                case 'stamina_restore':
                    if (entity.stats.current_stamina !== undefined) {
                        entity.stats.current_stamina = Math.min(
                            entity.stats.max_stamina || entity.stats.stamina,
                            (entity.stats.current_stamina || 0) + value
                        );
                    }
                    break;
                case 'speed_boost':
                    // Временный эффект скорости
                    entity.addTemporaryEffect('speed_boost', value, effects.duration || 60);
                    break;
            }
        });
    }
    
    // Открытие инвентаря
    openInventory(inventory) {
        if (inventory.isOpen) return;
        
        inventory.isOpen = true;
        this.createInventoryUI(inventory);
        this.openInventories.set(inventory.entity.id, inventory);
    }
    
    // Закрытие инвентаря
    closeInventory(inventory) {
        inventory.isOpen = false;
        if (inventory.ui && inventory.ui.parentNode) {
            inventory.ui.parentNode.removeChild(inventory.ui);
        }
        inventory.ui = null;
        this.openInventories.delete(inventory.entity.id);
    }
    
    // Создание UI инвентаря
    createInventoryUI(inventory) {
        const inventoryUI = document.createElement('div');
        inventoryUI.className = 'inventory-window';
        inventoryUI.innerHTML = `
            <div class="inventory-header">
                <h3>📦 Инвентарь: ${inventory.entity.name}</h3>
                <button class="close-btn" onclick="inventorySystem.closeInventory(inventory)">✖</button>
            </div>
            
            <div class="inventory-stats">
                <div class="weight-info">
                    <span>Вес: <span class="current-weight">${inventory.weight}</span>/<span class="max-weight">${inventory.maxWeight}</span></span>
                    <div class="weight-bar">
                        <div class="weight-fill" style="width: ${(inventory.weight / inventory.maxWeight) * 100}%"></div>
                    </div>
                </div>
                <div class="gold-info">
                    <span>💰 Золото: <span class="gold-amount">${inventory.gold}</span></span>
                </div>
            </div>
            
            <div class="inventory-grid" id="inventory-grid-${inventory.entity.id}">
                ${this.createInventorySlots(inventory)}
            </div>
            
            <div class="inventory-actions">
                <button onclick="inventorySystem.sortInventory(inventory)">🔄 Сортировать</button>
                <button onclick="inventorySystem.dropAll(inventory)">📤 Выбросить все</button>
                <button onclick="inventorySystem.showStats(inventory)">📊 Статистика</button>
            </div>
        `;
        
        // Позиционируем окно
        inventoryUI.style.cssText = `
            position: fixed;
            top: 100px;
            left: 200px;
            width: 400px;
            z-index: 1000;
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid #666;
            border-radius: 8px;
            color: white;
            padding: 15px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
        `;
        
        document.body.appendChild(inventoryUI);
        inventory.ui = inventoryUI;
        
        this.setupInventoryEventListeners(inventory);
    }
    
    createInventorySlots(inventory) {
        const slotsPerRow = 8;
        const rows = Math.ceil(inventory.slots / slotsPerRow);
        let html = '';
        
        for (let row = 0; row < rows; row++) {
            html += '<div class="inventory-row">';
            for (let col = 0; col < slotsPerRow; col++) {
                const slotIndex = row * slotsPerRow + col;
                if (slotIndex >= inventory.slots) break;
                
                const slot = inventory.items[slotIndex];
                html += `
                    <div class="inventory-slot" 
                         data-slot="${slotIndex}"
                         data-entity="${inventory.entity.id}">
                        ${slot ? this.createItemHTML(slot) : ''}
                    </div>
                `;
            }
            html += '</div>';
        }
        
        return html;
    }
    
    createItemHTML(slot) {
        const item = slot.item;
        const rarityColors = {
            common: '#ffffff',
            uncommon: '#1eff00',
            rare: '#0070dd',
            epic: '#a335ee',
            legendary: '#ff8000'
        };
        
        const borderColor = rarityColors[item.rarity] || '#ffffff';
        
        return `
            <div class="item" style="border-color: ${borderColor}">
                <div class="item-icon" style="background-image: url('${item.icon || '/assets/icons/default_item.png'}')"></div>
                ${slot.quantity > 1 ? `<span class="item-quantity">${slot.quantity}</span>` : ''}
                ${item.durability < item.max_durability ? `<div class="durability-bar" style="width: ${(item.durability / item.max_durability) * 100}%"></div>` : ''}
                <div class="item-tooltip hidden">
                    <div class="item-name" style="color: ${borderColor}">${item.name}</div>
                    <div class="item-description">${item.description}</div>
                    ${item.stats ? this.createStatsHTML(item.stats) : ''}
                    <div class="item-value">Ценность: ${item.value} золота</div>
                    ${item.weight ? `<div class="item-weight">Вес: ${item.weight}</div>` : ''}
                </div>
            </div>
        `;
    }
    
    createStatsHTML(stats) {
        let html = '<div class="item-stats">';
        Object.entries(stats).forEach(([stat, value]) => {
            if (value !== 0) {
                const color = value > 0 ? '#00ff00' : '#ff0000';
                const sign = value > 0 ? '+' : '';
                html += `<div style="color: ${color}">${sign}${value} ${this.getStatName(stat)}</div>`;
            }
        });
        html += '</div>';
        return html;
    }
    
    getStatName(stat) {
        const statNames = {
            melee_attack: 'Ближний бой',
            ranged_attack: 'Дальний бой',
            magic_attack: 'Магия',
            defense: 'Защита',
            health: 'Здоровье',
            mana: 'Мана',
            speed: 'Скорость',
            vision: 'Обзор'
        };
        return statNames[stat] || stat;
    }
    
    setupInventoryEventListeners(inventory) {
        const slots = inventory.ui.querySelectorAll('.inventory-slot');
        
        slots.forEach(slot => {
            // Drag and Drop
            slot.addEventListener('dragstart', (e) => this.handleDragStart(e, inventory));
            slot.addEventListener('dragover', (e) => this.handleDragOver(e));
            slot.addEventListener('drop', (e) => this.handleDrop(e, inventory));
            slot.addEventListener('dragend', (e) => this.handleDragEnd(e));
            
            // Клики
            slot.addEventListener('click', (e) => this.handleSlotClick(e, inventory));
            slot.addEventListener('contextmenu', (e) => this.handleSlotRightClick(e, inventory));
            
            // Tooltips
            slot.addEventListener('mouseenter', (e) => this.showTooltip(e));
            slot.addEventListener('mouseleave', (e) => this.hideTooltip(e));
        });
        
        // Перетаскивание окна
        const header = inventory.ui.querySelector('.inventory-header');
        header.addEventListener('mousedown', (e) => this.startDragWindow(e, inventory.ui));
    }
    
    handleSlotClick(e, inventory) {
        const slotIndex = parseInt(e.currentTarget.dataset.slot);
        const slot = inventory.items[slotIndex];
        
        if (!slot) return;
        
        if (e.ctrlKey) {
            // Ctrl+Click для быстрого использования
            this.useItem(inventory, slotIndex);
        } else if (e.shiftKey) {
            // Shift+Click для разделения стака
            this.splitStack(inventory, slotIndex);
        }
    }
    
    handleSlotRightClick(e, inventory) {
        e.preventDefault();
        const slotIndex = parseInt(e.currentTarget.dataset.slot);
        this.showContextMenu(e, inventory, slotIndex);
    }
    
    showContextMenu(e, inventory, slotIndex) {
        const slot = inventory.items[slotIndex];
        if (!slot) return;
        
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.innerHTML = `
            <div class="context-option" data-action="use">Использовать</div>
            <div class="context-option" data-action="drop">Выбросить</div>
            <div class="context-option" data-action="split">Разделить</div>
            <div class="context-option" data-action="info">Информация</div>
        `;
        
        contextMenu.style.cssText = `
            position: fixed;
            left: ${e.clientX}px;
            top: ${e.clientY}px;
            background: #333;
            border: 1px solid #666;
            border-radius: 4px;
            z-index: 2000;
            min-width: 120px;
        `;
        
        contextMenu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            this.executeContextAction(action, inventory, slotIndex);
            document.body.removeChild(contextMenu);
        });
        
        document.body.appendChild(contextMenu);
        
        // Удаляем меню при клике вне его
        setTimeout(() => {
            document.addEventListener('click', function removeMenu() {
                if (contextMenu.parentNode) {
                    contextMenu.parentNode.removeChild(contextMenu);
                }
                document.removeEventListener('click', removeMenu);
            });
        }, 10);
    }
    
    executeContextAction(action, inventory, slotIndex) {
        switch (action) {
            case 'use':
                this.useItem(inventory, slotIndex);
                break;
            case 'drop':
                this.dropItem(inventory, slotIndex);
                break;
            case 'split':
                this.splitStack(inventory, slotIndex);
                break;
            case 'info':
                this.showItemInfo(inventory, slotIndex);
                break;
        }
    }
    
    // Поиск предметов
    findItem(inventory, itemId) {
        for (let i = 0; i < inventory.items.length; i++) {
            if (inventory.items[i]?.item.id === itemId) {
                return i;
            }
        }
        return -1;
    }
    
    findExistingStack(inventory, item) {
        for (let i = 0; i < inventory.items.length; i++) {
            const slot = inventory.items[i];
            if (slot && slot.item.id === item.id && slot.quantity < (item.max_stack || 99)) {
                return i;
            }
        }
        return -1;
    }
    
    findEmptySlot(inventory) {
        for (let i = 0; i < inventory.items.length; i++) {
            if (!inventory.items[i]) {
                return i;
            }
        }
        return -1;
    }
    
    // Обновление веса
    updateInventoryWeight(inventory) {
        let totalWeight = 0;
        
        inventory.items.forEach(slot => {
            if (slot) {
                const itemWeight = slot.item.weight || 0;
                totalWeight += itemWeight * slot.quantity;
            }
        });
        
        inventory.weight = totalWeight;
        
        // Обновляем UI веса
        if (inventory.ui) {
            const currentWeightEl = inventory.ui.querySelector('.current-weight');
            const weightFillEl = inventory.ui.querySelector('.weight-fill');
            
            if (currentWeightEl) currentWeightEl.textContent = inventory.weight;
            if (weightFillEl) {
                const percentage = (inventory.weight / inventory.maxWeight) * 100;
                weightFillEl.style.width = `${Math.min(percentage, 100)}%`;
                
                // Меняем цвет при перегрузке
                if (percentage > 100) {
                    weightFillEl.style.backgroundColor = '#ff0000';
                } else if (percentage > 80) {
                    weightFillEl.style.backgroundColor = '#ffaa00';
                } else {
                    weightFillEl.style.backgroundColor = '#00ff00';
                }
            }
        }
    }
    
    // Обновление UI
    updateInventoryUI(inventory) {
        if (!inventory.ui) return;
        
        const gridElement = inventory.ui.querySelector(`#inventory-grid-${inventory.entity.id}`);
        if (gridElement) {
            gridElement.innerHTML = this.createInventorySlots(inventory);
            this.setupInventoryEventListeners(inventory);
        }
    }
    
    // Сортировка инвентаря
    sortInventory(inventory) {
        const items = inventory.items.filter(slot => slot !== null);
        
        // Сортируем по типу, затем по редкости, затем по названию
        items.sort((a, b) => {
            if (a.item.type !== b.item.type) {
                return a.item.type.localeCompare(b.item.type);
            }
            
            const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
            const rarityA = rarityOrder[a.item.rarity] || 0;
            const rarityB = rarityOrder[b.item.rarity] || 0;
            
            if (rarityA !== rarityB) {
                return rarityB - rarityA; // Высокая редкость сначала
            }
            
            return a.item.name.localeCompare(b.item.name);
        });
        
        // Очищаем инвентарь и заполняем заново
        inventory.items.fill(null);
        items.forEach((item, index) => {
            inventory.items[index] = item;
        });
        
        this.updateInventoryUI(inventory);
    }
    
    // Геттеры для статистики
    getInventoryValue(inventory) {
        let totalValue = inventory.gold;
        
        inventory.items.forEach(slot => {
            if (slot) {
                totalValue += (slot.item.value || 0) * slot.quantity;
            }
        });
        
        return totalValue;
    }
    
    getItemCount(inventory, itemId) {
        let count = 0;
        inventory.items.forEach(slot => {
            if (slot && slot.item.id === itemId) {
                count += slot.quantity;
            }
        });
        return count;
    }
}

// Глобальный экземпляр
window.inventorySystem = new InventorySystem();

console.log('📦 Advanced Inventory System loaded!');