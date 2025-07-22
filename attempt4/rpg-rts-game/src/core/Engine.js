// src/core/Engine.js - Основной движок
export class Engine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.isRunning = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        
        this.systems = new Map();
        this.entities = [];
        
        this.TILE_SIZE = 50;
        this.GRID_ROWS = 16;
        this.GRID_COLS = 24; // Больше для широкоэкранного режима
        
        this.setupEventListeners();
    }
    
    addSystem(name, system) {
        this.systems.set(name, system);
        console.log(`✅ System '${name}' added`);
    }
    
    removeSystem(name) {
        this.systems.delete(name);
        console.log(`❌ System '${name}' removed`);
    }
    
    addEntity(entity) {
        this.entities.push(entity);
        entity.engine = this;
    }
    
    removeEntity(entity) {
        const index = this.entities.indexOf(entity);
        if (index > -1) {
            this.entities.splice(index, 1);
        }
    }
    
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => {
            this.systems.get('input')?.handleMouseMove(e);
        });
        
        this.canvas.addEventListener('click', (e) => {
            this.systems.get('input')?.handleMouseClick(e);
        });
        
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.systems.get('input')?.handleRightClick(e);
        });
        
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.systems.get('input')?.handleKeyDown(e);
        });
        
        document.addEventListener('keyup', (e) => {
            this.systems.get('input')?.handleKeyUp(e);
        });
    }
    
    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
        console.log('🚀 Engine started');
    }
    
    stop() {
        this.isRunning = false;
        console.log('⏹️ Engine stopped');
    }
    
    gameLoop(currentTime = 0) {
        if (!this.isRunning) return;
        
        this.deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = currentTime;
        
        // Limit delta time to prevent spiral of death
        this.deltaTime = Math.min(this.deltaTime, 1/30); // Max 30 FPS
        
        this.update(this.deltaTime);
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        // Update all systems
        for (const [name, system] of this.systems) {
            if (system.update) {
                system.update(deltaTime, this.entities);
            }
        }
        
        // Update all entities
        for (const entity of this.entities) {
            if (entity.update) {
                entity.update(deltaTime);
            }
        }
        
        // Remove dead entities
        this.entities = this.entities.filter(entity => entity.isAlive !== false);
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render all systems
        for (const [name, system] of this.systems) {
            if (system.render) {
                system.render(this.ctx);
            }
        }
        
        // Render all entities
        const sortedEntities = [...this.entities].sort((a, b) => a.y - b.y);
        for (const entity of sortedEntities) {
            if (entity.render) {
                entity.render(this.ctx);
            }
        }
    }
}