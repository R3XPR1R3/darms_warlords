// src/core/Entity.js - Базовый класс сущностей
export class Entity {
    constructor(config = {}) {
        this.id = config.id || this.generateId();
        this.name = config.name || 'Unnamed Entity';
        
        // Position
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.z = config.z || 0; // For layering
        
        // Physics
        this.width = config.width || 32;
        this.height = config.height || 32;
        this.speed = config.speed || 100; // pixels per second
        
        // State
        this.isAlive = true;
        this.isSelected = false;
        this.isVisible = true;
        
        // Components
        this.components = new Map();
        
        // Events
        this.eventHandlers = new Map();
        
        this.engine = null;
    }
    
    generateId() {
        return 'entity_' + Math.random().toString(36).substr(2, 9);
    }
    
    addComponent(name, component) {
        this.components.set(name, component);
        component.entity = this;
    }
    
    getComponent(name) {
        return this.components.get(name);
    }
    
    hasComponent(name) {
        return this.components.has(name);
    }
    
    removeComponent(name) {
        const component = this.components.get(name);
        if (component && component.destroy) {
            component.destroy();
        }
        this.components.delete(name);
    }
    
    addEventListener(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }
    
    removeEventListener(event, handler) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    emit(event, data = {}) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            for (const handler of handlers) {
                handler(data);
            }
        }
    }
    
    update(deltaTime) {
        // Update all components
        for (const [name, component] of this.components) {
            if (component.update) {
                component.update(deltaTime);
            }
        }
    }
    
    render(ctx) {
        if (!this.isVisible) return;
        
        // Render all components
        for (const [name, component] of this.components) {
            if (component.render) {
                component.render(ctx);
            }
        }
        
        // Debug: Draw bounding box if selected
        if (this.isSelected) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        }
    }
    
    destroy() {
        this.isAlive = false;
        
        // Destroy all components
        for (const [name, component] of this.components) {
            if (component.destroy) {
                component.destroy();
            }
        }
        
        this.components.clear();
        this.eventHandlers.clear();
        
        this.emit('destroyed');
    }
}