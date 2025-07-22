// src/entities/Resource.js
import { Entity } from '../core/Entity.js';

export class Resource extends Entity {
    constructor(config = {}) {
        super(config);
        
        this.type = 'resource';
        this.resourceType = config.resourceType || config.type || 'gold';
        this.amount = config.amount || 1000;
        this.maxAmount = config.maxAmount || this.amount;
        this.regenerationRate = config.regenerationRate || 0; // ресурсов в секунду
        
        // Визуальные параметры
        this.radius = 20;
        this.colors = {
            gold: '#FFD700',
            wood: '#8B4513',
            stone: '#708090',
            food: '#32CD32',
            mana: '#9370DB'
        };
        
        this.color = this.colors[this.resourceType] || '#CCCCCC';
    }
    
    gather(amount = 5) {
        const gathered = Math.min(amount, this.amount);
        this.amount -= gathered;
        
        if (this.amount <= 0) {
            this.isAlive = false;
            this.emit('resource_depleted');
        } else {
            this.emit('resource_gathered', { amount: gathered, type: this.resourceType });
        }
        
        return gathered;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Регенерация ресурса
        if (this.regenerationRate > 0 && this.amount < this.maxAmount) {
            this.amount = Math.min(this.maxAmount, this.amount + this.regenerationRate * deltaTime);
        }
    }
    
    render(ctx) {
        if (this.amount <= 0) return;
        
        // Рисуем ресурс
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Показываем количество
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            this.amount.toString(),
            this.x,
            this.y + 4
        );
        
        // Название ресурса (если выбран)
        if (this.isSelected) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '10px Arial';
            ctx.fillText(this.resourceType, this.x, this.y - this.radius - 5);
        }
    }
}

console.log('🏗️ Entity classes loaded successfully!');