// src/core/Component.js - Базовый класс компонентов
export class Component {
    constructor() {
        this.entity = null;
        this.enabled = true;
    }
    
    update(deltaTime) {
        // Override in subclasses
    }
    
    render(ctx) {
        // Override in subclasses
    }
    
    destroy() {
        // Override in subclasses
    }
}
