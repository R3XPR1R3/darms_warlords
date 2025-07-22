// src/core/EventSystem.js - Система событий
export class EventSystem {
    constructor() {
        this.listeners = new Map();
    }
    
    on(event, listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(listener);
    }
    
    off(event, listener) {
        const listeners = this.listeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    emit(event, data = {}) {
        const listeners = this.listeners.get(event);
        if (listeners) {
            for (const listener of listeners) {
                listener(data);
            }
        }
    }
    
    once(event, listener) {
        const onceListener = (data) => {
            listener(data);
            this.off(event, onceListener);
        };
        this.on(event, onceListener);
    }
    
    clear(event) {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }
}

console.log('🔧 Core engine modules loaded');