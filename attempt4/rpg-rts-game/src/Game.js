// src/Game.js - Обновленные импорты
import { Engine } from './core/Engine.js';
import { DataLoader } from './systems/DataLoader.js';
import { ModLoader } from './systems/ModLoader.js';
import { MovementSystem } from './systems/MovementSystem.js';
import { CombatSystem } from './systems/CombatSystem.js';
import { AISystem } from './systems/AISystem.js';
import { InputSystem } from './systems/InputSystem.js';
import { UISystem } from './systems/UISystem.js';
import { RenderSystem } from './systems/RenderSystem.js';
import { Unit } from './entities/Unit.js';
import { Building } from './entities/Building.js';
import { Resource } from './entities/Resource.js';

export class Game {
    constructor(canvasId) {
        this.engine = new Engine(canvasId);
        this.gameData = null;
        this.gameState = {
            isLoaded: false,
            isPaused: false,
            currentTime: 0,
            
            // Game world
            obstacles: [],
            entities: [],
            buildings: [],
            resources: [],
            
            // Player data
            player: {
                faction: null,
                resources: {
                    gold: 1000,
                    wood: 500,
                    stone: 300,
                    food: 200,
                    mana: 100
                },
                selectedEntities: [],
                researched: [],
                buildings: []
            },
            
            // AI players
            aiPlayers: []
        };
        
        this.systems = {
            dataLoader: new DataLoader(),
            modLoader: new ModLoader(),
            movement: new MovementSystem(),
            combat: new CombatSystem(),
            ai: new AISystem(),
            input: new InputSystem(),
            ui: new UISystem(),
            render: new RenderSystem()
        };
    }
    
    async initialize() {
        console.log('🎮 Initializing game...');
        
        try {
            // Load base game data
            this.updateLoadingText('Loading game data...');
            this.gameData = await this.systems.dataLoader.loadAll();
            
            // Load and apply mods
            this.updateLoadingText('Loading mods...');
            await this.systems.modLoader.loadEnabledMods();
            this.gameData = this.systems.modLoader.applyMods(this.gameData);
            
            // Initialize engine systems
            this.updateLoadingText('Initializing systems...');
            this.initializeSystems();
            
            // Create initial game world
            this.updateLoadingText('Creating world...');
            this.createInitialWorld();
            
            this.gameState.isLoaded = true;
            console.log('✅ Game initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize game:', error);
            // Используем fallback данные если загрузка не удалась
            console.log('🔄 Using fallback data...');
            this.gameData = this.systems.dataLoader.getFallbackData();
            this.initializeSystems();
            this.createInitialWorld();
            this.gameState.isLoaded = true;
        }
    }
    
    initializeSystems() {
        // Add systems to engine
        this.engine.addSystem('input', this.systems.input);
        this.engine.addSystem('movement', this.systems.movement);
        this.engine.addSystem('combat', this.systems.combat);
        this.engine.addSystem('ai', this.systems.ai);
        this.engine.addSystem('ui', this.systems.ui);
        this.engine.addSystem('render', this.systems.render);
        
        // Configure systems
        this.systems.input.setGame(this);
        this.systems.ui.setGame(this);
        this.systems.render.setGameState(this.gameState);
        this.systems.ai.setGameData(this.gameData);
        
        // Set up system communication
        this.systems.input.onUnitSelect = (units) => {
            this.gameState.player.selectedEntities = units;
            this.systems.ui.updateSelectionPanel(units);
        };
        
        this.systems.input.onUnitCommand = (command, target) => {
            this.executeUnitCommand(command, target);
        };
    }
    
    createInitialWorld() {
        // Create obstacles
        this.gameState.obstacles = [
            { row: 7, col: 7 }, { row: 8, col: 7 }, { row: 9, col: 7 },
            { row: 10, col: 7 }, { row: 7, col: 8 }, { row: 8, col: 8 },
            { row: 3, col: 10 }, { row: 4, col: 10 }, { row: 5, col: 10 },
            { row: 12, col: 3 }, { row: 12, col: 4 }, { row: 12, col: 5 }
        ];
        
        // Create resources
        this.createResources();
        
        // Create player faction
        this.gameState.player.faction = this.gameData.factions?.middle_earth || {
            id: 'player',
            name: 'Player',
            color: '#0066cc'
        };
        
        // Create starting units
        this.createStartingUnits();
        
        // Create AI opponents
        this.createAIOpponents();
    }
    
    createResources() {
        const resourcePositions = [
            { type: 'gold', x: 100, y: 100, amount: 1000 },
            { type: 'gold', x: 1100, y: 700, amount: 800 },
            { type: 'wood', x: 100, y: 700, amount: 600 },
            { type: 'wood', x: 1100, y: 100, amount: 500 },
            { type: 'stone', x: 600, y: 100, amount: 400 },
            { type: 'stone', x: 600, y: 700, amount: 300 }
        ];
        
        for (const res of resourcePositions) {
            const resource = new Resource({
                x: res.x,
                y: res.y,
                resourceType: res.type,
                amount: res.amount,
                maxAmount: res.amount
            });
            
            this.gameState.resources.push(resource);
            this.engine.addEntity(resource);
        }
    }
    
    createStartingUnits() {
        // Create hero (если есть данные героя)
        const heroData = this.gameData.heroes?.adrian;
        if (heroData) {
            const hero = new Unit({
                id: 'player_hero',
                name: heroData.name || 'Hero',
                x: 275,
                y: 275,
                race: this.gameData.races?.human || { id: 'human', name: 'Human' },
                unitClass: heroData,
                faction: this.gameState.player.faction,
                isHero: true,
                isPlayerControlled: true,
                stats: {
                    health: 150,
                    melee_attack: 25,
                    defense: 15,
                    speed: 120,
                    vision: 200
                }
            });
            
            this.gameState.entities.push(hero);
            this.engine.addEntity(hero);
            this.gameState.player.selectedEntities.push(hero);
        }
        
        // Create starting workers
        for (let i = 0; i < 3; i++) {
            const worker = new Unit({
                id: `player_worker_${i}`,
                name: `Worker ${i + 1}`,
                x: 250 + i * 30,
                y: 200,
                race: this.gameData.races?.human || { id: 'human', name: 'Human' },
                unitClass: this.gameData.classes?.worker || { id: 'worker', name: 'Worker' },
                faction: this.gameState.player.faction,
                isPlayerControlled: true,
                stats: {
                    health: 60,
                    melee_attack: 8,
                    defense: 2,
                    speed: 90,
                    vision: 120
                }
            });
            
            this.gameState.entities.push(worker);
            this.engine.addEntity(worker);
        }
        
        // Create starting warriors
        for (let i = 0; i < 2; i++) {
            const warrior = new Unit({
                id: `player_warrior_${i}`,
                name: `Warrior ${i + 1}`,
                x: 300 + i * 30,
                y: 200,
                race: this.gameData.races?.human || { id: 'human', name: 'Human' },
                unitClass: this.gameData.classes?.warrior || { id: 'warrior', name: 'Warrior' },
                faction: this.gameState.player.faction,
                isPlayerControlled: true,
                stats: {
                    health: 100,
                    melee_attack: 18,
                    defense: 8,
                    speed: 100,
                    vision: 150
                }
            });
            
            this.gameState.entities.push(warrior);
            this.engine.addEntity(warrior);
        }
    }
    
    createAIOpponents() {
        // Create AI faction
        const aiFaction = this.gameData.factions?.enemy || {
            id: 'enemy',
            name: 'Enemy',
            color: '#ff0000'
        };
        
        const aiPlayer = {
            id: 'ai_player_1',
            faction: aiFaction,
            difficulty: 'medium',
            resources: {
                gold: 800,
                wood: 400,
                stone: 200,
                food: 150,
                mana: 50
            },
            entities: [],
            buildings: []
        };
        
        // Create AI units
        for (let i = 0; i < 4; i++) {
            const enemy = new Unit({
                id: `ai_unit_${i}`,
                name: `Enemy ${i + 1}`,
                x: 900 + (i % 2) * 30,
                y: 600 + Math.floor(i / 2) * 30,
                race: this.gameData.races?.orc || this.gameData.races?.human || { id: 'human', name: 'Human' },
                unitClass: this.gameData.classes?.warrior || { id: 'warrior', name: 'Warrior' },
                faction: aiFaction,
                isPlayerControlled: false,
                aiPlayer: aiPlayer,
                stats: {
                    health: 90,
                    melee_attack: 15,
                    defense: 6,
                    speed: 95,
                    vision: 140
                },
                // Добавляем патрульные точки
                patrolPoints: [
                    { x: 900 + (i % 2) * 30, y: 600 + Math.floor(i / 2) * 30 },
                    { x: 950 + (i % 2) * 30, y: 600 + Math.floor(i / 2) * 30 },
                    { x: 950 + (i % 2) * 30, y: 550 + Math.floor(i / 2) * 30 },
                    { x: 900 + (i % 2) * 30, y: 550 + Math.floor(i / 2) * 30 }
                ]
            });
            
            this.gameState.entities.push(enemy);
            this.engine.addEntity(enemy);
            aiPlayer.entities.push(enemy);
        }
        
        this.gameState.aiPlayers.push(aiPlayer);
    }
    
    executeUnitCommand(command, target) {
        const selectedUnits = this.gameState.player.selectedEntities;
        
        for (const unit of selectedUnits) {
            switch (command.type) {
                case 'move':
                    unit.setMoveTarget(target.x, target.y);
                    console.log(`${unit.name} moving to (${target.x}, ${target.y})`);
                    break;
                    
                case 'attack':
                    if (target.entity) {
                        unit.setAttackTarget(target.entity);
                        console.log(`${unit.name} attacking ${target.entity.name}`);
                    }
                    break;
                    
                case 'gather':
                    if (target.resource) {
                        // Устанавливаем задачу сбора ресурсов
                        const ai = unit.getComponent('ai');
                        if (ai) {
                            ai.target = target.resource;
                            ai.state = 'gathering';
                        }
                        unit.setMoveTarget(target.resource.x, target.resource.y);
                        console.log(`${unit.name} gathering ${target.resource.resourceType}`);
                    }
                    break;
                    
                case 'stop':
                    unit.stop();
                    console.log(`${unit.name} stopped`);
                    break;
            }
        }
    }
    
    start() {
        if (!this.gameState.isLoaded) {
            throw new Error('Game not initialized');
        }
        
        this.engine.start();
        console.log('🚀 Game started');
        
        // Показываем уведомление о запуске
        setTimeout(() => {
            if (this.systems.ui) {
                this.systems.ui.showNotification('🎮 Game started! Right-click to command units.', 'success', 5);
            }
        }, 1000);
    }
    
    pause() {
        this.gameState.isPaused = true;
        this.engine.stop();
        console.log('⏸️ Game paused');
    }
    
    resume() {
        this.gameState.isPaused = false;
        this.engine.start();
        console.log('▶️ Game resumed');
    }
    
    save(slotName = 'quicksave') {
        const saveData = {
            version: '1.0.0',
            timestamp: Date.now(),
            gameState: {
                currentTime: this.gameState.currentTime,
                player: this.gameState.player,
                entities: this.gameState.entities.map(e => ({
                    id: e.id,
                    name: e.name,
                    type: e.type,
                    x: e.x,
                    y: e.y,
                    stats: e.stats,
                    faction: e.faction,
                    isPlayerControlled: e.isPlayerControlled
                })),
                resources: this.gameState.resources.map(r => ({
                    x: r.x,
                    y: r.y,
                    resourceType: r.resourceType,
                    amount: r.amount
                }))
            }
        };
        
        try {
            const jsonData = JSON.stringify(saveData, null, 2);
            localStorage.setItem(`rpg_rts_save_${slotName}`, jsonData);
            
            if (this.systems.ui) {
                this.systems.ui.showNotification(`💾 Game saved: ${slotName}`, 'success');
            }
            
            console.log(`💾 Game saved to slot: ${slotName}`);
            return true;
            
        } catch (error) {
            console.error('❌ Failed to save game:', error);
            if (this.systems.ui) {
                this.systems.ui.showNotification('❌ Save failed!', 'error');
            }
            return false;
        }
    }
    
    load(slotName = 'quicksave') {
        try {
            const saveData = localStorage.getItem(`rpg_rts_save_${slotName}`);
            
            if (!saveData) {
                console.warn(`⚠️ No save found in slot: ${slotName}`);
                if (this.systems.ui) {
                    this.systems.ui.showNotification(`⚠️ No save found: ${slotName}`, 'warning');
                }
                return false;
            }
            
            const parsedData = JSON.parse(saveData);
            
            if (this.systems.ui) {
                this.systems.ui.showNotification(`📁 Game loaded: ${slotName}`, 'success');
            }
            
            console.log(`📁 Game loaded from slot: ${slotName}`);
            return true;
            
        } catch (error) {
            console.error('❌ Failed to load game:', error);
            if (this.systems.ui) {
                this.systems.ui.showNotification('❌ Load failed!', 'error');
            }
            return false;
        }
    }
    
    updateLoadingText(text) {
        const loadingText = document.getElementById('loading-text');
        if (loadingText) {
            loadingText.textContent = text;
        }
        console.log(`📋 Loading: ${text}`);
    }
    
    // ===== DEBUG METHODS =====
    spawnUnit(unitType, x, y, faction = null) {
        const unitClass = this.gameData.classes?.[unitType] || { id: unitType, name: unitType };
        
        const unit = new Unit({
            name: `Spawned ${unitClass.name || unitType}`,
            x: x || 400,
            y: y || 400,
            race: this.gameData.races?.human || { id: 'human', name: 'Human' },
            unitClass: unitClass,
            faction: faction || this.gameState.player.faction,
            isPlayerControlled: faction === null || faction === this.gameState.player.faction,
            stats: {
                health: 80,
                melee_attack: 15,
                defense: 5,
                speed: 100,
                vision: 150
            }
        });
        
        this.gameState.entities.push(unit);
        this.engine.addEntity(unit);
        
        console.log(`✨ Spawned ${unitClass.name} at (${unit.x}, ${unit.y})`);
        
        if (this.systems.ui) {
            this.systems.ui.showNotification(`✨ Spawned ${unitClass.name}`, 'info');
        }
        
        return unit;
    }
    
    addResources(type, amount) {
        if (this.gameState.player.resources[type] !== undefined) {
            this.gameState.player.resources[type] += amount;
            console.log(`💰 Added ${amount} ${type}. Total: ${this.gameState.player.resources[type]}`);
            
            if (this.systems.ui) {
                this.systems.ui.showNotification(`💰 +${amount} ${type}`, 'success');
            }
        }
    }
    
    getGameStats() {
        const playerUnits = this.gameState.entities.filter(e => e.isPlayerControlled && e.isAlive);
        const enemyUnits = this.gameState.entities.filter(e => !e.isPlayerControlled && e.isAlive);
        
        return {
            totalEntities: this.gameState.entities.length,
            aliveEntities: this.gameState.entities.filter(e => e.isAlive).length,
            playerUnits: playerUnits.length,
            enemyUnits: enemyUnits.length,
            selectedUnits: this.gameState.player.selectedEntities.length,
            resources: { ...this.gameState.player.resources },
            gameTime: this.gameState.currentTime.toFixed(1)
        };
    }
}

// Global functions for console debugging
window.spawnUnit = (type, x, y) => window.game?.spawnUnit(type, x, y);
window.addResources = (type, amount) => window.game?.addResources(type, amount);
window.gameStats = () => {
    const stats = window.game?.getGameStats();
    console.table(stats);
    return stats;
};
window.saveGame = (slot) => window.game?.save(slot);
window.loadGame = (slot) => window.game?.load(slot);
window.pauseGame = () => window.game?.pause();
window.resumeGame = () => window.game?.resume();

console.log('🎮 Updated game class loaded with all systems!');