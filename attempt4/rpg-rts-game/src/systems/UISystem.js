// src/systems/UISystem.js
export class UISystem {
    constructor() {
        this.game = null;
        this.panels = {
            resources: null,
            selection: null,
            minimap: null,
            buildMenu: null
        };
        this.notifications = [];
    }
    
    setGame(game) {
        this.game = game;
        this.initializePanels();
    }
    
    initializePanels() {
        this.panels.resources = document.getElementById('resource-panel') || this.createResourcePanel();
        this.panels.selection = document.getElementById('unit-panel') || this.createSelectionPanel();
        this.panels.minimap = document.getElementById('minimap') || this.createMinimapPanel();
        this.panels.buildMenu = document.getElementById('build-menu') || this.createBuildMenu();
    }
    
    createResourcePanel() {
        const panel = document.createElement('div');
        panel.id = 'resource-panel';
        panel.className = 'ui-panel';
        panel.style.cssText = 'top: 10px; right: 10px; min-width: 300px;';
        panel.innerHTML = `
            <h3>Ресурсы</h3>
            <div class="resource-display">
                <div class="resource-item">
                    <div class="resource-icon gold"></div>
                    <span id="gold-display">0</span>
                </div>
                <div class="resource-item">
                    <div class="resource-icon wood"></div>
                    <span id="wood-display">0</span>
                </div>
                <div class="resource-item">
                    <div class="resource-icon stone"></div>
                    <span id="stone-display">0</span>
                </div>
                <div class="resource-item">
                    <div class="resource-icon food"></div>
                    <span id="food-display">0</span>
                </div>
            </div>
        `;
        document.getElementById('ui-overlay').appendChild(panel);
        return panel;
    }
    
    createSelectionPanel() {
        const panel = document.createElement('div');
        panel.id = 'unit-panel';
        panel.className = 'ui-panel';
        panel.style.cssText = 'bottom: 10px; left: 10px; min-width: 350px;';
        panel.innerHTML = `
            <h3>Выбранные юниты</h3>
            <div id="selected-units-list"></div>
            <div id="unit-commands">
                <button class="button" onclick="window.game?.systems.input.orderStop()">Стоп</button>
                <button class="button" onclick="window.game?.systems.input.orderPatrol()">Патруль</button>
            </div>
        `;
        document.getElementById('ui-overlay').appendChild(panel);
        return panel;
    }
    
    createMinimapPanel() {
        const panel = document.createElement('div');
        panel.id = 'minimap';
        panel.className = 'ui-panel';
        panel.style.cssText = 'top: 10px; left: 10px; width: 200px; height: 200px;';
        panel.innerHTML = `
            <h3>Миникарта</h3>
            <canvas id="minimap-canvas" width="180" height="180"></canvas>
        `;
        document.getElementById('ui-overlay').appendChild(panel);
        return panel;
    }
    
    createBuildMenu() {
        const panel = document.createElement('div');
        panel.id = 'build-menu';
        panel.className = 'ui-panel';
        panel.style.cssText = 'bottom: 10px; right: 10px; width: 250px;';
        panel.innerHTML = `
            <h3>Строительство</h3>
            <div class="build-category">
                <h4>Экономика</h4>
                <button class="build-button" data-building="town_hall">
                    Ратуша <div class="build-cost">Бесплатно</div>
                </button>
                <button class="build-button" data-building="workshop">
                    Мастерская <div class="build-cost">150 золота, 100 дерева</div>
                </button>
            </div>
            <div class="build-category">
                <h4>Военные</h4>
                <button class="build-button" data-building="barracks">
                    Казармы <div class="build-cost">200 золота, 150 дерева</div>
                </button>
                <button class="build-button" data-building="guard_tower">
                    Башня <div class="build-cost">100 золота, 75 дерева, 50 камня</div>
                </button>
            </div>
        `;
        
        // Добавляем обработчики событий
        panel.addEventListener('click', (e) => {
            if (e.target.classList.contains('build-button')) {
                const buildingType = e.target.dataset.building;
                this.startBuilding(buildingType);
            }
        });
        
        document.getElementById('ui-overlay').appendChild(panel);
        return panel;
    }
    
    update(deltaTime) {
        this.updateResourceDisplay();
        this.updateSelectionDisplay();
        this.updateMinimap();
        this.updateNotifications(deltaTime);
    }
    
    updateResourceDisplay() {
        if (!this.game) return;
        
        const resources = this.game.gameState.player.resources;
        
        const goldDisplay = document.getElementById('gold-display');
        const woodDisplay = document.getElementById('wood-display');
        const stoneDisplay = document.getElementById('stone-display');
        const foodDisplay = document.getElementById('food-display');
        
        if (goldDisplay) goldDisplay.textContent = resources.gold || 0;
        if (woodDisplay) woodDisplay.textContent = resources.wood || 0;
        if (stoneDisplay) stoneDisplay.textContent = resources.stone || 0;
        if (foodDisplay) foodDisplay.textContent = resources.food || 0;
    }
    
    updateSelectionDisplay() {
        if (!this.game) return;
        
        const selectedUnits = this.game.gameState.player.selectedEntities;
        const listElement = document.getElementById('selected-units-list');
        
        if (!listElement) return;
        
        if (selectedUnits.length === 0) {
            listElement.innerHTML = '<p>Нет выбранных юнитов</p>';
            return;
        }
        
        let html = '';
        for (const unit of selectedUnits.slice(0, 6)) { // Показываем максимум 6 юнитов
            const health = unit.getComponent('health');
            const healthPercent = health ? (health.current / health.max * 100) : 100;
            
            html += `
                <div class="unit-portrait">
                    <div class="unit-name">${unit.name}</div>
                    <div class="unit-health-bar">
                        <div class="unit-health-fill" style="width: ${healthPercent}%"></div>
                    </div>
                </div>
            `;
        }
        
        if (selectedUnits.length > 6) {
            html += `<p>+${selectedUnits.length - 6} еще</p>`;
        }
        
        listElement.innerHTML = html;
    }
    
    updateMinimap() {
        const canvas = document.getElementById('minimap-canvas');
        if (!canvas || !this.game) return;
        
        const ctx = canvas.getContext('2d');
        const scale = canvas.width / (this.game.engine.GRID_COLS * this.game.engine.TILE_SIZE);
        
        // Очищаем миникарту
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Рисуем юниты
        for (const entity of this.game.gameState.entities) {
            if (!entity.isAlive) continue;
            
            const x = entity.x * scale;
            const y = entity.y * scale;
            
            if (entity.isPlayerControlled) {
                ctx.fillStyle = '#00f'; // Синий для игрока
            } else {
                ctx.fillStyle = '#f00'; // Красный для врагов
            }
            
            ctx.fillRect(x - 1, y - 1, 2, 2);
        }
        
        // Рисуем ресурсы
        ctx.fillStyle = '#ff0';
        for (const resource of this.game.gameState.resources) {
            if (resource.amount <= 0) continue;
            const x = resource.x * scale;
            const y = resource.y * scale;
            ctx.fillRect(x - 1, y - 1, 2, 2);
        }
    }
    
    updateNotifications(deltaTime) {
        this.notifications = this.notifications.filter(notification => {
            notification.duration -= deltaTime;
            
            if (notification.duration <= 0) {
                if (notification.element && notification.element.parentNode) {
                    notification.element.parentNode.removeChild(notification.element);
                }
                return false;
            }
            
            return true;
        });
    }
    
    showNotification(message, type = 'info', duration = 3) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: ${20 + this.notifications.length * 60}px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px 20px;
            border-radius: 6px;
            z-index: 1500;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        this.notifications.push({
            element: notification,
            duration: duration,
            type: type
        });
        
        // Анимация появления
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 100);
    }
    
    startBuilding(buildingType) {
        this.showNotification(`Начинается строительство: ${buildingType}`, 'info');
        // Здесь будет логика строительства
    }
    
    updateSelectionPanel(selectedUnits) {
        // Обновляется через updateSelectionDisplay
    }
}

console.log('🔧 Missing systems loaded successfully!');