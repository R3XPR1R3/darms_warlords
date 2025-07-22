// tools/build_tools/MapEditor.js - Полнофункциональный редактор карт
export class MapEditor {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Размеры карты
        this.mapWidth = 1000;
        this.mapHeight = 1000;
        this.tileSize = 32;

        // Камера
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1.0,
            minZoom: 0.1,
            maxZoom: 3.0
        };

        // Карта - 2D массив тайлов
        this.mapData = this.createEmptyMap();

        // Режимы редактирования
        this.currentTool = 'terrain';
        this.selectedTerrain = 'grass';
        this.selectedUnit = 'warrior';
        this.selectedBuilding = 'town_hall';
        this.brushSize = 1;

        // Библиотеки ресурсов
        this.terrainTypes = {
            grass: { color: '#4a8c4a', walkable: true, name: 'Трава' },
            dirt: { color: '#8b4513', walkable: true, name: 'Земля' },
            stone: { color: '#696969', walkable: true, name: 'Камень' },
            water: { color: '#4169e1', walkable: false, name: 'Вода' },
            mountain: { color: '#2f4f4f', walkable: false, name: 'Горы' },
            forest: { color: '#228b22', walkable: true, name: 'Лес' },
            sand: { color: '#f4a460', walkable: true, name: 'Песок' },
            snow: { color: '#fffafa', walkable: true, name: 'Снег' },
            lava: { color: '#dc143c', walkable: false, name: 'Лава' },
            void: { color: '#000000', walkable: false, name: 'Пустота' }
        };

        this.zones = new Map(); // Игровые зоны
        this.units = new Map(); // Размещенные юниты
        this.buildings = new Map(); // Размещенные здания
        this.resources = new Map(); // Ресурсы на карте

        this.isDrawing = false;
        this.lastMousePos = { x: 0, y: 0 };

        this.setupEventListeners();
        this.createEditorUI();
    }

    createEmptyMap() {
        const map = [];
        for (let y = 0; y < this.mapHeight; y++) {
            map[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                map[y][x] = {
                    terrain: 'grass',
                    height: 0,
                    zone: null,
                    resources: null,
                    decorations: []
                };
            }
        }
        return map;
    }

    setupEventListeners() {
        // Мышь
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Клавиатура
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    createEditorUI() {
            const editorUI = document.createElement('div');
            editorUI.id = 'map-editor-ui';
            editorUI.innerHTML = `
            <div class="editor-panel">
                <h3>🗺️ Редактор карт</h3>
                
                <!-- Инструменты -->
                <div class="tool-section">
                    <h4>Инструменты</h4>
                    <div class="tool-buttons">
                        <button class="tool-btn active" data-tool="terrain">🌱 Ландшафт</button>
                        <button class="tool-btn" data-tool="units">⚔️ Юниты</button>
                        <button class="tool-btn" data-tool="buildings">🏗️ Здания</button>
                        <button class="tool-btn" data-tool="resources">💎 Ресурсы</button>
                        <button class="tool-btn" data-tool="zones">🎯 Зоны</button>
                        <button class="tool-btn" data-tool="height">⛰️ Высота</button>
                    </div>
                </div>
                
                <!-- Параметры кисти -->
                <div class="brush-section">
                    <h4>Кисть</h4>
                    <label>Размер: <input type="range" id="brush-size" min="1" max="10" value="1"></label>
                    <span id="brush-size-display">1</span>
                </div>
                
                <!-- Ландшафт -->
                <div class="terrain-section" id="terrain-tools">
                    <h4>Ландшафт</h4>
                    <div class="terrain-grid">
                        ${Object.entries(this.terrainTypes).map(([id, terrain]) => 
                            `<div class="terrain-tile ${id === 'grass' ? 'selected' : ''}" 
                                 data-terrain="${id}" 
                                 style="background-color: ${terrain.color}"
                                 title="${terrain.name}">
                            </div>`
                        ).join('')}
                    </div>
                </div>
                
                <!-- Юниты -->
                <div class="units-section hidden" id="unit-tools">
                    <h4>Юниты</h4>
                    <select id="unit-type">
                        <option value="warrior">⚔️ Воин</option>
                        <option value="archer">🏹 Лучник</option>
                        <option value="mage">🧙‍♂️ Маг</option>
                        <option value="worker">🔨 Рабочий</option>
                        <option value="hero">👑 Герой</option>
                    </select>
                    <select id="unit-faction">
                        <option value="player">🔵 Игрок</option>
                        <option value="enemy">🔴 Враг</option>
                        <option value="neutral">⚪ Нейтрал</option>
                    </select>
                </div>
                
                <!-- Здания -->
                <div class="buildings-section hidden" id="building-tools">
                    <h4>Здания</h4>
                    <select id="building-type">
                        <option value="town_hall">🏛️ Ратуша</option>
                        <option value="barracks">🏰 Казармы</option>
                        <option value="workshop">🔧 Мастерская</option>
                        <option value="mage_tower">🗼 Башня мага</option>
                        <option value="resource_mine">⛏️ Шахта</option>
                    </select>
                </div>
                
                <!-- Ресурсы -->
                <div class="resources-section hidden" id="resource-tools">
                    <h4>Ресурсы</h4>
                    <select id="resource-type">
                        <option value="gold">🟡 Золото</option>
                        <option value="wood">🟤 Дерево</option>
                        <option value="stone">⚫ Камень</option>
                        <option value="food">🟢 Еда</option>
                        <option value="mana">🟣 Мана</option>
                    </select>
                    <label>Количество: <input type="number" id="resource-amount" value="1000" min="100" max="5000" step="100"></label>
                </div>
                
                <!-- Зоны -->
                <div class="zones-section hidden" id="zone-tools">
                    <h4>Игровые зоны</h4>
                    <select id="zone-type">
                        <option value="spawn_player">🔵 Спавн игрока</option>
                        <option value="spawn_enemy">🔴 Спавн врага</option>
                        <option value="objective">🎯 Цель</option>
                        <option value="no_build">🚫 Запрет строительства</option>
                        <option value="ambush">⚡ Засада</option>
                        <option value="treasure">💰 Сокровища</option>
                    </select>
                </div>
                
                <!-- Карта -->
                <div class="map-section">
                    <h4>Карта</h4>
                    <div class="map-info">
                        <p>Размер: ${this.mapWidth} x ${this.mapHeight}</p>
                        <p>Камера: <span id="camera-pos">0, 0</span></p>
                        <p>Зум: <span id="zoom-level">100%</span></p>
                    </div>
                    
                    <div class="map-controls">
                        <button onclick="mapEditor.generateTerrain()">🎲 Генерация</button>
                        <button onclick="mapEditor.clearMap()">🗑️ Очистить</button>
                        <button onclick="mapEditor.saveMap()">💾 Сохранить</button>
                        <button onclick="mapEditor.loadMap()">📁 Загрузить</button>
                    </div>
                    
                    <input type="file" id="map-file-input" accept=".json" style="display: none;">
                </div>
                
                <!-- Тестирование -->
                <div class="test-section">
                    <h4>Тестирование</h4>
                    <button onclick="mapEditor.testMap()">▶️ Тест карты</button>
                    <button onclick="mapEditor.exportToGame()">🎮 В игру</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(editorUI);
        this.setupUIEventListeners();
    }
    
    setupUIEventListeners() {
        // Переключение инструментов
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentTool = e.target.dataset.tool;
                this.showToolSection(this.currentTool);
            });
        });
        
        // Выбор ландшафта
        document.querySelectorAll('.terrain-tile').forEach(tile => {
            tile.addEventListener('click', (e) => {
                document.querySelectorAll('.terrain-tile').forEach(t => t.classList.remove('selected'));
                e.target.classList.add('selected');
                this.selectedTerrain = e.target.dataset.terrain;
            });
        });
        
        // Размер кисти
        const brushSizeSlider = document.getElementById('brush-size');
        const brushSizeDisplay = document.getElementById('brush-size-display');
        brushSizeSlider.addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
            brushSizeDisplay.textContent = this.brushSize;
        });
        
        // Загрузка файла карты
        const fileInput = document.getElementById('map-file-input');
        fileInput.addEventListener('change', (e) => {
            this.loadMapFromFile(e.target.files[0]);
        });
    }
    
    showToolSection(tool) {
        // Скрыть все секции
        document.querySelectorAll('.terrain-section, .units-section, .buildings-section, .resources-section, .zones-section').forEach(section => {
            section.classList.add('hidden');
        });
        
        // Показать нужную секцию
        const sectionId = tool + '-tools';
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.remove('hidden');
        }
    }
    
    handleMouseDown(e) {
        this.isDrawing = true;
        this.lastMousePos = this.getMousePos(e);
        
        if (e.button === 0) { // Левая кнопка
            this.handleToolAction(this.lastMousePos, e.ctrlKey);
        } else if (e.button === 2) { // Правая кнопка
            this.handleRightClick(this.lastMousePos);
        }
    }
    
    handleMouseMove(e) {
        const mousePos = this.getMousePos(e);
        this.updateCameraInfo(mousePos);
        
        if (this.isDrawing && e.buttons === 1) {
            this.handleToolAction(mousePos, e.ctrlKey);
        }
        
        // Перемещение камеры средней кнопкой
        if (e.buttons === 4) {
            const dx = mousePos.x - this.lastMousePos.x;
            const dy = mousePos.y - this.lastMousePos.y;
            this.camera.x -= dx / this.camera.zoom;
            this.camera.y -= dy / this.camera.zoom;
        }
        
        this.lastMousePos = mousePos;
    }
    
    handleMouseUp(e) {
        this.isDrawing = false;
    }
    
    handleWheel(e) {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        this.camera.zoom *= zoomFactor;
        this.camera.zoom = Math.max(this.camera.minZoom, Math.min(this.camera.maxZoom, this.camera.zoom));
    }
    
    handleKeyDown(e) {
        switch (e.code) {
            case 'KeyG':
                this.setTool('terrain');
                break;
            case 'KeyU':
                this.setTool('units');
                break;
            case 'KeyB':
                this.setTool('buildings');
                break;
            case 'KeyR':
                this.setTool('resources');
                break;
            case 'KeyZ':
                this.setTool('zones');
                break;
            case 'KeyH':
                this.setTool('height');
                break;
            case 'Space':
                e.preventDefault();
                this.resetCamera();
                break;
            case 'Delete':
                this.clearSelectedArea();
                break;
        }
    }
    
    handleToolAction(pos, isCtrlHeld) {
        const worldPos = this.screenToWorld(pos);
        const tileX = Math.floor(worldPos.x / this.tileSize);
        const tileY = Math.floor(worldPos.y / this.tileSize);
        
        if (!this.isValidTile(tileX, tileY)) return;
        
        switch (this.currentTool) {
            case 'terrain':
                this.paintTerrain(tileX, tileY, isCtrlHeld);
                break;
            case 'units':
                this.placeUnit(tileX, tileY);
                break;
            case 'buildings':
                this.placeBuilding(tileX, tileY);
                break;
            case 'resources':
                this.placeResource(tileX, tileY);
                break;
            case 'zones':
                this.paintZone(tileX, tileY, isCtrlHeld);
                break;
            case 'height':
                this.adjustHeight(tileX, tileY, isCtrlHeld);
                break;
        }
    }
    
    paintTerrain(centerX, centerY, isErasing) {
        const radius = this.brushSize;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                
                if (this.isValidTile(x, y) && dx*dx + dy*dy <= radius*radius) {
                    if (isErasing) {
                        this.mapData[y][x].terrain = 'grass'; // Стереть в траву
                    } else {
                        this.mapData[y][x].terrain = this.selectedTerrain;
                    }
                }
            }
        }
    }
    
    placeUnit(x, y) {
        const unitId = `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const unitType = document.getElementById('unit-type').value;
        const faction = document.getElementById('unit-faction').value;
        
        this.units.set(unitId, {
            id: unitId,
            type: unitType,
            faction: faction,
            x: x * this.tileSize + this.tileSize / 2,
            y: y * this.tileSize + this.tileSize / 2,
            stats: this.getDefaultUnitStats(unitType),
            bonuses: {}
        });
    }
    
    placeBuilding(x, y) {
        const buildingId = `building_${Date.now()}`;
        const buildingType = document.getElementById('building-type').value;
        
        this.buildings.set(buildingId, {
            id: buildingId,
            type: buildingType,
            x: x * this.tileSize + this.tileSize / 2,
            y: y * this.tileSize + this.tileSize / 2,
            constructed: true
        });
    }
    
    placeResource(x, y) {
        const resourceId = `resource_${Date.now()}`;
        const resourceType = document.getElementById('resource-type').value;
        const amount = parseInt(document.getElementById('resource-amount').value);
        
        this.resources.set(resourceId, {
            id: resourceId,
            type: resourceType,
            x: x * this.tileSize + this.tileSize / 2,
            y: y * this.tileSize + this.tileSize / 2,
            amount: amount,
            maxAmount: amount
        });
    }
    
    // Генерация ландшафта
    generateTerrain() {
        console.log('🎲 Generating terrain...');
        
        // Простая генерация с шумом Перлина (упрощенная версия)
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const noise = this.simpleNoise(x * 0.01, y * 0.01);
                
                let terrain = 'grass';
                if (noise < -0.3) terrain = 'water';
                else if (noise < -0.1) terrain = 'sand';
                else if (noise < 0.1) terrain = 'grass';
                else if (noise < 0.3) terrain = 'forest';
                else if (noise < 0.5) terrain = 'stone';
                else terrain = 'mountain';
                
                this.mapData[y][x].terrain = terrain;
                this.mapData[y][x].height = Math.floor((noise + 1) * 50);
            }
        }
    }
    
    simpleNoise(x, y) {
        // Упрощенный генератор шума
        const a = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return (a - Math.floor(a)) * 2 - 1;
    }
    
    // Сохранение и загрузка
    saveMap() {
        const mapData = {
            version: '1.0',
            info: {
                name: 'Custom Map',
                width: this.mapWidth,
                height: this.mapHeight,
                tileSize: this.tileSize,
                created: new Date().toISOString()
            },
            terrain: this.mapData,
            units: Array.from(this.units.values()),
            buildings: Array.from(this.buildings.values()),
            resources: Array.from(this.resources.values()),
            zones: Array.from(this.zones.values())
        };
        
        const blob = new Blob([JSON.stringify(mapData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `map_${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        console.log('💾 Map saved!');
    }
    
    loadMap() {
        document.getElementById('map-file-input').click();
    }
    
    async loadMapFromFile(file) {
        if (!file) return;
        
        try {
            const text = await file.text();
            const mapData = JSON.parse(text);
            
            this.mapWidth = mapData.info.width;
            this.mapHeight = mapData.info.height;
            this.mapData = mapData.terrain;
            
            this.units.clear();
            mapData.units?.forEach(unit => this.units.set(unit.id, unit));
            
            this.buildings.clear();
            mapData.buildings?.forEach(building => this.buildings.set(building.id, building));
            
            this.resources.clear();
            mapData.resources?.forEach(resource => this.resources.set(resource.id, resource));
            
            this.zones.clear();
            mapData.zones?.forEach(zone => this.zones.set(zone.id, zone));
            
            console.log('📁 Map loaded successfully!');
            
        } catch (error) {
            console.error('❌ Failed to load map:', error);
            alert('Ошибка загрузки карты!');
        }
    }
    
    // Рендеринг
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рендерим ландшафт
        this.renderTerrain();
        
        // Рендерим зоны
        this.renderZones();
        
        // Рендерим ресурсы
        this.renderResources();
        
        // Рендерим здания
        this.renderBuildings();
        
        // Рендерим юниты
        this.renderUnits();
        
        // Рендерим сетку
        this.renderGrid();
        
        // Рендерим курсор кисти
        this.renderBrushCursor();
    }
    
    renderTerrain() {
        const startX = Math.max(0, Math.floor(this.camera.x / this.tileSize));
        const startY = Math.max(0, Math.floor(this.camera.y / this.tileSize));
        const endX = Math.min(this.mapWidth, Math.ceil((this.camera.x + this.canvas.width / this.camera.zoom) / this.tileSize));
        const endY = Math.min(this.mapHeight, Math.ceil((this.camera.y + this.canvas.height / this.camera.zoom) / this.tileSize));
        
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tile = this.mapData[y][x];
                const terrain = this.terrainTypes[tile.terrain];
                
                const screenPos = this.worldToScreen({
                    x: x * this.tileSize,
                    y: y * this.tileSize
                });
                
                this.ctx.fillStyle = terrain.color;
                this.ctx.fillRect(
                    screenPos.x,
                    screenPos.y,
                    this.tileSize * this.camera.zoom,
                    this.tileSize * this.camera.zoom
                );
            }
        }
    }
    
    // Утилиты
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    screenToWorld(screenPos) {
        return {
            x: (screenPos.x / this.camera.zoom) + this.camera.x,
            y: (screenPos.y / this.camera.zoom) + this.camera.y
        };
    }
    
    worldToScreen(worldPos) {
        return {
            x: (worldPos.x - this.camera.x) * this.camera.zoom,
            y: (worldPos.y - this.camera.y) * this.camera.zoom
        };
    }
    
    isValidTile(x, y) {
        return x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight;
    }
    
    // Запуск
    start() {
        const gameLoop = () => {
            this.render();
            requestAnimationFrame(gameLoop);
        };
        gameLoop();
        console.log('🗺️ Map Editor started!');
    }
}

// Глобальный доступ
window.mapEditor = new MapEditor('game-canvas');

console.log('🗺️ Advanced Map Editor loaded!');