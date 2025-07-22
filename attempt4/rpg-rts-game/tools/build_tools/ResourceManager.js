// src/systems/ResourceManager.js - Менеджер ресурсов игры
export class ResourceManager {
    constructor() {
        // Текстуры для разных типов объектов
        this.textures = new Map();
        this.models = new Map();
        this.sprites = new Map();
        this.loadedAssets = new Set();
        
        // Кэш отрендеренных спрайтов
        this.spriteCache = new Map();
        
        // Базовые пути к ресурсам
        this.basePaths = {
            textures: '/assets/textures/',
            models: '/assets/models/',
            sprites: '/assets/sprites/',
            icons: '/assets/icons/'
        };
        
        this.initializeDefaultAssets();
    }
    
    initializeDefaultAssets() {
        // Юниты - используем эмодзи и простые спрайты
        this.registerUnit('warrior', {
            icon: '⚔️',
            color: '#ffcc00',
            size: 24,
            sprite: {
                idle: '🗡️',
                attack: '⚔️',
                move: '🏃'
            }
        });
        
        this.registerUnit('archer', {
            icon: '🏹',
            color: '#66cc66',
            size: 22,
            sprite: {
                idle: '🏹',
                attack: '🎯',
                move: '🏃'
            }
        });
        
        this.registerUnit('mage', {
            icon: '🧙',
            color: '#9966ff',
            size: 26,
            sprite: {
                idle: '🧙',
                attack: '✨',
                move: '🚶'
            }
        });
        
        this.registerUnit('worker', {
            icon: '👷',
            color: '#8b4513',
            size: 20,
            sprite: {
                idle: '🔨',
                work: '⛏️',
                move: '🚶'
            }
        });
        
        this.registerUnit('hero', {
            icon: '👑',
            color: '#ffd700',
            size: 30,
            sprite: {
                idle: '🦸',
                attack: '⚡',
                move: '🏃'
            }
        });
        
        // Здания
        this.registerBuilding('town_hall', {
            icon: '🏛️',
            color: '#cd853f',
            size: { width: 64, height: 64 },
            sprite: '🏛️'
        });
        
        this.registerBuilding('barracks', {
            icon: '🏰',
            color: '#a0522d',
            size: { width: 48, height: 48 },
            sprite: '🏰'
        });
        
        this.registerBuilding('workshop', {
            icon: '🏭',
            color: '#696969',
            size: { width: 48, height: 48 },
            sprite: '🔧'
        });
        
        this.registerBuilding('mage_tower', {
            icon: '🗼',
            color: '#9370db',
            size: { width: 48, height: 56 },
            sprite: '🗼'
        });
        
        this.registerBuilding('resource_mine', {
            icon: '⛏️',
            color: '#8b7355',
            size: { width: 40, height: 40 },
            sprite: '⛏️'
        });
        
        // Ресурсы
        this.registerResource('gold', {
            icon: '💰',
            color: '#ffd700',
            size: 16,
            animation: 'pulse'
        });
        
        this.registerResource('wood', {
            icon: '🪵',
            color: '#8b4513',
            size: 18,
            animation: 'none'
        });
        
        this.registerResource('stone', {
            icon: '🪨',
            color: '#696969',
            size: 16,
            animation: 'none'
        });
        
        this.registerResource('food', {
            icon: '🍎',
            color: '#228b22',
            size: 16,
            animation: 'bounce'
        });
        
        this.registerResource('mana', {
            icon: '💎',
            color: '#4169e1',
            size: 18,
            animation: 'glow'
        });
        
        // Декорации
        this.registerDecoration('tree', {
            variants: ['🌲', '🌳', '🌴', '🎋'],
            size: 32
        });
        
        this.registerDecoration('rock', {
            variants: ['🪨', '⛰️'],
            size: 24
        });
        
        this.registerDecoration('flower', {
            variants: ['🌸', '🌺', '🌻', '🌷'],
            size: 12
        });
    }
    
    // Регистрация различных типов ресурсов
    registerUnit(id, config) {
        this.models.set(`unit_${id}`, {
            type: 'unit',
            id: id,
            ...config
        });
    }
    
    registerBuilding(id, config) {
        this.models.set(`building_${id}`, {
            type: 'building', 
            id: id,
            ...config
        });
    }
    
    registerResource(id, config) {
        this.models.set(`resource_${id}`, {
            type: 'resource',
            id: id,
            ...config
        });
    }
    
    registerDecoration(id, config) {
        this.models.set(`decoration_${id}`, {
            type: 'decoration',
            id: id,
            ...config
        });
    }
    
    // Отрисовка моделей на канвасе
    drawModel(ctx, modelType, modelId, x, y, options = {}) {
        const modelKey = `${modelType}_${modelId}`;
        const model = this.models.get(modelKey);
        
        if (!model) {
            // Фоллбэк для неизвестных моделей
            this.drawUnknownModel(ctx, x, y, modelType);
            return;
        }
        
        ctx.save();
        
        // Применяем опции
        if (options.scale) {
            ctx.scale(options.scale, options.scale);
        }
        
        if (options.rotation) {
            ctx.translate(x, y);
            ctx.rotate(options.rotation);
            ctx.translate(-x, -y);
        }
        
        if (options.alpha) {
            ctx.globalAlpha = options.alpha;
        }
        
        // Рисуем в зависимости от типа
        switch (model.type) {
            case 'unit':
                this.drawUnit(ctx, model, x, y, options);
                break;
            case 'building':
                this.drawBuilding(ctx, model, x, y, options);
                break;
            case 'resource':
                this.drawResource(ctx, model, x, y, options);
                break;
            case 'decoration':
                this.drawDecoration(ctx, model, x, y, options);
                break;
        }
        
        ctx.restore();
    }
    
    drawUnit(ctx, model, x, y, options) {
        const faction = options.faction || 'neutral';
        const state = options.state || 'idle';
        
        // Цвет фракции
        const factionColors = {
            player: '#4169e1',
            enemy: '#dc143c',
            neutral: '#808080'
        };
        
        // Рисуем круг под юнитом (тень/выделение)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x, y + model.size/2, model.size/2, model.size/4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Рисуем цветной круг фракции
        ctx.fillStyle = factionColors[faction];
        ctx.beginPath();
        ctx.arc(x, y, model.size/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Рисуем спрайт/эмодзи
        ctx.font = `${model.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(model.sprite[state] || model.icon, x, y);
        
        // Полоска здоровья
        if (options.health !== undefined && options.health < 1) {
            this.drawHealthBar(ctx, x, y - model.size/2 - 10, model.size, options.health);
        }
        
        // Уровень
        if (options.level && options.level > 1) {
            ctx.fillStyle = '#ffd700';
            ctx.font = '12px Arial';
            ctx.fillText(`Lv.${options.level}`, x, y + model.size/2 + 10);
        }
    }
    
    drawBuilding(ctx, model, x, y, options) {
        const width = model.size.width;
        const height = model.size.height;
        
        // Тень здания
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(x - width/2 + 5, y - height/2 + 5, width, height);
        
        // Основа здания
        ctx.fillStyle = model.color;
        ctx.fillRect(x - width/2, y - height/2, width, height);
        
        // Обводка
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - width/2, y - height/2, width, height);
        
        // Спрайт
        ctx.font = `${Math.min(width, height) * 0.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(model.sprite || model.icon, x, y);
        
        // Статус строительства
        if (options.constructionProgress !== undefined && options.constructionProgress < 1) {
            this.drawProgressBar(ctx, x, y + height/2 + 10, width, options.constructionProgress);
        }
    }
    
    drawResource(ctx, model, x, y, options) {
        const amount = options.amount || 1000;
        
        // Анимация
        let offsetY = 0;
        if (model.animation === 'bounce') {
            offsetY = Math.sin(Date.now() / 300) * 3;
        } else if (model.animation === 'pulse') {
            const scale = 1 + Math.sin(Date.now() / 200) * 0.1;
            ctx.scale(scale, scale);
        }
        
        // Рисуем ресурс
        ctx.font = `${model.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Свечение для маны
        if (model.animation === 'glow') {
            ctx.shadowColor = model.color;
            ctx.shadowBlur = 10 + Math.sin(Date.now() / 200) * 5;
        }
        
        ctx.fillText(model.icon, x, y + offsetY);
        
        // Количество
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.fillText(amount, x, y + model.size);
    }
    
    drawDecoration(ctx, model, x, y, options) {
        const variant = options.variant || 0;
        const decoration = model.variants[variant % model.variants.length];
        
        ctx.font = `${model.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(decoration, x, y);
    }
    
    drawHealthBar(ctx, x, y, width, health) {
        const barWidth = width * 0.8;
        const barHeight = 4;
        
        // Фон
        ctx.fillStyle = '#333';
        ctx.fillRect(x - barWidth/2, y, barWidth, barHeight);
        
        // Здоровье
        const healthColor = health > 0.6 ? '#00ff00' : health > 0.3 ? '#ffff00' : '#ff0000';
        ctx.fillStyle = healthColor;
        ctx.fillRect(x - barWidth/2, y, barWidth * health, barHeight);
        
        // Обводка
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - barWidth/2, y, barWidth, barHeight);
    }
    
    drawProgressBar(ctx, x, y, width, progress) {
        const barWidth = width * 0.8;
        const barHeight = 6;
        
        // Фон
        ctx.fillStyle = '#444';
        ctx.fillRect(x - barWidth/2, y, barWidth, barHeight);
        
        // Прогресс
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(x - barWidth/2, y, barWidth * progress, barHeight);
        
        // Текст
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.floor(progress * 100)}%`, x, y + barHeight + 10);
    }
    
    drawUnknownModel(ctx, x, y, type) {
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(x - 10, y - 10, 20, 20);
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('?', x, y);
    }
    
    // Создание превью для UI
    createModelPreview(modelType, modelId, size = 64) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Очищаем фон
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, size, size);
        
        // Рисуем модель по центру
        this.drawModel(ctx, modelType, modelId, size/2, size/2, {
            scale: size / 64
        });
        
        return canvas.toDataURL();
    }
    
    // Получение списка доступных моделей
    getModelsByType(type) {
        const models = [];
        this.models.forEach((model, key) => {
            if (model.type === type) {
                models.push({
                    id: model.id,
                    name: model.id.replace(/_/g, ' '),
                    icon: model.icon,
                    preview: this.createModelPreview(type, model.id)
                });
            }
        });
        return models;
    }
    
    // Интеграция с редактором карт
    integrateWithMapEditor(mapEditor) {
        // Переопределяем методы рендеринга редактора
        const originalRenderUnits = mapEditor.renderUnits.bind(mapEditor);
        mapEditor.renderUnits = () => {
            mapEditor.units.forEach((unit) => {
                const screenPos = mapEditor.worldToScreen({
                    x: unit.x,
                    y: unit.y
                });
                
                this.drawModel(
                    mapEditor.ctx,
                    'unit',
                    unit.type,
                    screenPos.x,
                    screenPos.y,
                    {
                        faction: unit.faction,
                        health: unit.stats.health / unit.stats.max_health,
                        scale: mapEditor.camera.zoom,
                        level: unit.level || 1
                    }
                );
            });
        };
        
        const originalRenderBuildings = mapEditor.renderBuildings.bind(mapEditor);
        mapEditor.renderBuildings = () => {
            mapEditor.buildings.forEach((building) => {
                const screenPos = mapEditor.worldToScreen({
                    x: building.x,
                    y: building.y
                });
                
                this.drawModel(
                    mapEditor.ctx,
                    'building',
                    building.type,
                    screenPos.x,
                    screenPos.y,
                    {
                        constructionProgress: building.constructed ? 1 : 0.5,
                        scale: mapEditor.camera.zoom
                    }
                );
            });
        };
        
        const originalRenderResources = mapEditor.renderResources.bind(mapEditor);
        mapEditor.renderResources = () => {
            mapEditor.resources.forEach((resource) => {
                const screenPos = mapEditor.worldToScreen({
                    x: resource.x,
                    y: resource.y
                });
                
                this.drawModel(
                    mapEditor.ctx,
                    'resource',
                    resource.type,
                    screenPos.x,
                    screenPos.y,
                    {
                        amount: resource.amount,
                        scale: mapEditor.camera.zoom
                    }
                );
            });
        };
        
        console.log('🎨 Resource Manager integrated with Map Editor');
    }
    
    // Создание UI каталога ресурсов
    createResourceCatalog() {
        const catalog = document.createElement('div');
        catalog.id = 'resource-catalog';
        catalog.className = 'resource-catalog';
        catalog.innerHTML = `
            <div class="catalog-header">
                <h3>📦 Каталог ресурсов</h3>
                <button class="close-btn" onclick="this.parentElement.parentElement.remove()">✖</button>
            </div>
            
            <div class="catalog-tabs">
                <button class="tab-btn active" data-type="unit">Юниты</button>
                <button class="tab-btn" data-type="building">Здания</button>
                <button class="tab-btn" data-type="resource">Ресурсы</button>
                <button class="tab-btn" data-type="decoration">Декорации</button>
            </div>
            
            <div class="catalog-content">
                ${this.createCatalogSection('unit')}
            </div>
        `;
        
        // Стили
        catalog.style.cssText = `
            position: fixed;
            right: 20px;
            top: 100px;
            width: 300px;
            max-height: 600px;
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid #666;
            border-radius: 8px;
            color: white;
            padding: 15px;
            overflow-y: auto;
            z-index: 1001;
        `;
        
        // События переключения табов
        catalog.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                catalog.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const content = catalog.querySelector('.catalog-content');
                content.innerHTML = this.createCatalogSection(e.target.dataset.type);
            });
        });
        
        document.body.appendChild(catalog);
        return catalog;
    }
    
    createCatalogSection(type) {
        const models = this.getModelsByType(type);
        
        return `
            <div class="model-grid">
                ${models.map(model => `
                    <div class="model-item" data-type="${type}" data-id="${model.id}">
                        <div class="model-preview">
                            <img src="${model.preview}" alt="${model.name}">
                        </div>
                        <div class="model-name">${model.name}</div>
                        <div class="model-icon">${model.icon}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// Создаем глобальный экземпляр
window.resourceManager = new ResourceManager();

// Автоматическая интеграция с редактором карт если он существует
if (window.mapEditor) {
    window.resourceManager.integrateWithMapEditor(window.mapEditor);
}

console.log('🎨 Resource Manager loaded!');

// CSS стили для каталога
const style = document.createElement('style');
style.textContent = `
    .resource-catalog {
        font-family: Arial, sans-serif;
    }
    
    .catalog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid #666;
    }
    
    .catalog-header h3 {
        margin: 0;
        font-size: 18px;
    }
    
    .close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
    }
    
    .catalog-tabs {
        display: flex;
        gap: 5px;
        margin-bottom: 15px;
    }
    
    .tab-btn {
        flex: 1;
        padding: 8px;
        background: #333;
        border: 1px solid #666;
        color: white;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.3s;
    }
    
    .tab-btn:hover {
        background: #444;
    }
    
    .tab-btn.active {
        background: #4169e1;
        border-color: #4169e1;
    }
    
    .model-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
    }
    
    .model-item {
        background: #333;
        border: 1px solid #666;
        border-radius: 4px;
        padding: 10px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s;
    }
    
    .model-item:hover {
        background: #444;
        border-color: #4169e1;
        transform: scale(1.05);
    }
    
    .model-preview {
        width: 64px;
        height: 64px;
        margin: 0 auto 5px;
        background: #222;
        border-radius: 4px;
        overflow: hidden;
    }
    
    .model-preview img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
    
    .model-name {
        font-size: 12px;
        text-transform: capitalize;
        margin-bottom: 3px;
    }
    
    .model-icon {
        font-size: 20px;
    }
`;
document.head.appendChild(style);