// src/entities/Building.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
import { Entity } from '../core/Entity.js';
import { Unit } from './Unit.js'; // Импортируем напрямую

export class Building extends Entity {
    constructor(config = {}) {
        super(config);
        
        this.type = 'building';
        this.buildingType = config.buildingType || 'unknown';
        this.faction = config.faction || null;
        
        // Характеристики здания
        this.stats = {
            health: config.stats?.health || 500,
            max_health: config.stats?.health || 500,
            current_health: config.stats?.current_health || config.stats?.health || 500,
            armor: config.stats?.armor || 5,
            sight_range: config.stats?.sight_range || 200
        };
        
        // Строительство
        this.isConstructed = config.isConstructed !== false;
        this.constructionProgress = this.isConstructed ? 1.0 : 0.0;
        this.constructionTime = config.constructionTime || 30;
        
        // Производство
        this.productionQueue = [];
        this.currentProduction = null;
        this.productionProgress = 0;
        
        // Гарнизон
        this.garrisonCapacity = config.garrisonCapacity || 0;
        this.garrisonedUnits = [];
        
        // Точка сбора
        this.rallyPoint = { x: this.x + 100, y: this.y + 100 };
        
        this.initializeComponents();
    }
    
    initializeComponents() {
        // Health Component
        this.addComponent('health', {
            current: this.stats.current_health,
            max: this.stats.max_health,
            regeneration: 0
        });
        
        // Combat Component (если может атаковать)
        if (this.canAttack) {
            this.addComponent('combat', {
                attackPower: this.attackDamage || 20,
                defense: this.stats.armor,
                attackRange: this.attackRange || 200,
                attackSpeed: this.attackSpeed || 1.0,
                detectionRange: this.stats.sight_range,
                target: null,
                isAttacking: false,
                attackCooldown: 0,
                autoAttack: true
            });
        }
    }
    
    // ===== СТРОИТЕЛЬСТВО =====
    startConstruction() {
        this.isConstructed = false;
        this.constructionProgress = 0.0;
    }
    
    updateConstruction(deltaTime) {
        if (this.isConstructed) return;
        
        this.constructionProgress += deltaTime / this.constructionTime;
        
        if (this.constructionProgress >= 1.0) {
            this.completeConstruction();
        }
    }
    
    completeConstruction() {
        this.isConstructed = true;
        this.constructionProgress = 1.0;
        this.emit('construction_complete');
        console.log(`${this.name} построено!`);
    }
    
    // ===== ПРОИЗВОДСТВО =====
    addToProductionQueue(unitType, gameData) {
        const unitData = gameData.classes[unitType];
        if (!unitData) return false;
        
        // Проверяем требования и ресурсы
        if (!this.canProduce(unitType, gameData)) return false;
        
        this.productionQueue.push({
            type: unitType,
            data: unitData,
            timeLeft: unitData.production_time || 30
        });
        
        // Начинаем производство если очередь была пуста
        if (!this.currentProduction) {
            this.startNextProduction();
        }
        
        return true;
    }
    
    canProduce(unitType, gameData) {
        const unitData = gameData.classes[unitType];
        if (!unitData) return false;
        
        // Проверяем, может ли это здание производить данный тип
        // Это должно быть определено в данных здания
        return true;
    }
    
    startNextProduction() {
        if (this.productionQueue.length === 0) {
            this.currentProduction = null;
            return;
        }
        
        this.currentProduction = this.productionQueue.shift();
        this.productionProgress = 0;
    }
    
    updateProduction(deltaTime) {
        if (!this.currentProduction || !this.isConstructed) return;
        
        this.productionProgress += deltaTime;
        
        if (this.productionProgress >= this.currentProduction.timeLeft) {
            this.completeProduction();
        }
    }
    
    completeProduction() {
        if (!this.currentProduction) return;
        
        // Создаем новый юнит
        const newUnit = this.createUnit(this.currentProduction);
        
        this.emit('unit_produced', { unit: newUnit });
        
        // Начинаем следующее производство
        this.startNextProduction();
    }
    
    // ИСПРАВЛЕНО: убрали async/await, используем прямой импорт
    createUnit(productionItem) {
        return new Unit({
            name: productionItem.data.name || 'New Unit',
            x: this.rallyPoint.x,
            y: this.rallyPoint.y,
            unitClass: productionItem.data,
            faction: this.faction,
            isPlayerControlled: this.faction?.isPlayer || false,
            stats: {
                health: productionItem.data.stats?.health || 80,
                melee_attack: productionItem.data.stats?.melee_attack || 10,
                defense: productionItem.data.stats?.defense || 5,
                speed: productionItem.data.stats?.speed || 100,
                vision: productionItem.data.stats?.vision || 120
            }
        });
    }
    
    // ===== ГАРНИЗОН =====
    canGarrison(unit) {
        return this.garrisonedUnits.length < this.garrisonCapacity;
    }
    
    garrison(unit) {
        if (!this.canGarrison(unit)) return false;
        
        this.garrisonedUnits.push(unit);
        unit.isVisible = false;
        unit.isGarrisoned = true;
        
        this.emit('unit_garrisoned', { unit });
        return true;
    }
    
    ungarrison(unit) {
        const index = this.garrisonedUnits.indexOf(unit);
        if (index === -1) return false;
        
        this.garrisonedUnits.splice(index, 1);
        unit.isVisible = true;
        unit.isGarrisoned = false;
        
        // Размещаем рядом со зданием
        unit.x = this.x + (Math.random() - 0.5) * 100;
        unit.y = this.y + (Math.random() - 0.5) * 100;
        
        this.emit('unit_ungarrisoned', { unit });
        return true;
    }
    
    // ===== ТОЧКА СБОРА =====
    setRallyPoint(x, y) {
        this.rallyPoint.x = x;
        this.rallyPoint.y = y;
        this.emit('rally_point_changed', { x, y });
    }
    
    // ===== ОБНОВЛЕНИЕ =====
    update(deltaTime) {
        super.update(deltaTime);
        
        this.updateConstruction(deltaTime);
        this.updateProduction(deltaTime);
        
        // Обновляем здоровье
        const health = this.getComponent('health');
        if (health) {
            this.stats.current_health = health.current;
        }
    }
    
    // ===== ОТРИСОВКА =====
    render(ctx) {
        if (!this.isVisible) return;
        
        // Вызываем базовую отрисовку компонентов
        super.render(ctx);
        
        // Рисуем здание
        ctx.fillStyle = this.faction?.color || '#666666';
        
        if (!this.isConstructed) {
            // Здание в процессе строительства
            ctx.fillStyle = '#888888';
            const constructedHeight = this.height * this.constructionProgress;
            ctx.fillRect(
                this.x - this.width / 2,
                this.y + this.height / 2 - constructedHeight,
                this.width,
                constructedHeight
            );
            
            // Показываем прогресс строительства
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(
                `${Math.floor(this.constructionProgress * 100)}%`,
                this.x,
                this.y
            );
        } else {
            // Готовое здание
            ctx.fillRect(
                this.x - this.width / 2,
                this.y - this.height / 2,
                this.width,
                this.height
            );
        }
        
        // Рамка
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            this.x - this.width / 2,
            this.y - this.height / 2,
            this.width,
            this.height
        );
        
        // Название здания (если выбрано)
        if (this.isSelected) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.name, this.x, this.y - this.height / 2 - 10);
        }
        
        // Полоса здоровья для поврежденных зданий
        const health = this.getComponent('health');
        if (health && health.current < health.max) {
            this.drawHealthBar(ctx, health);
        }
        
        // Точка сбора (если выбрано)
        if (this.isSelected && this.rallyPoint && this.isConstructed) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.rallyPoint.x, this.rallyPoint.y);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(this.rallyPoint.x, this.rallyPoint.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        // Индикатор производства
        if (this.currentProduction && this.isConstructed) {
            this.drawProductionIndicator(ctx);
        }
    }
    
    drawHealthBar(ctx, health) {
        const barWidth = this.width;
        const barHeight = 6;
        const x = this.x - barWidth / 2;
        const y = this.y - this.height / 2 - 15;
        
        const healthPercent = health.current / health.max;
        
        // Фон
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Здоровье
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
        
        // Рамка
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);
    }
    
    drawProductionIndicator(ctx) {
        const progress = this.productionProgress / this.currentProduction.timeLeft;
        const barWidth = this.width * 0.8;
        const barHeight = 4;
        const x = this.x - barWidth / 2;
        const y = this.y + this.height / 2 + 5;
        
        // Фон прогресса
        ctx.fillStyle = '#333333';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Прогресс
        ctx.fillStyle = '#00aaff';
        ctx.fillRect(x, y, barWidth * progress, barHeight);
        
        // Рамка
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);
        
        // Название производимого юнита
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            `Производство: ${this.currentProduction.data.name || this.currentProduction.type}`,
            this.x,
            y + barHeight + 12
        );
    }
    
    // ===== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ =====
    getProductionQueue() {
        return [...this.productionQueue];
    }
    
    cancelProduction() {
        if (this.currentProduction) {
            console.log(`Производство ${this.currentProduction.type} отменено`);
            this.currentProduction = null;
            this.productionProgress = 0;
            this.startNextProduction();
        }
    }
    
    getConstructionInfo() {
        return {
            isConstructed: this.isConstructed,
            progress: this.constructionProgress,
            timeLeft: this.isConstructed ? 0 : (this.constructionTime * (1 - this.constructionProgress))
        };
    }
    
    takeDamage(damage, attacker) {
        const health = this.getComponent('health');
        if (!health) return 0;
        
        const actualDamage = Math.max(1, damage - this.stats.armor);
        health.current -= actualDamage;
        
        if (health.current <= 0) {
            health.current = 0;
            this.destroy();
        }
        
        this.emit('damaged', { damage: actualDamage, attacker });
        return actualDamage;
    }
    
    destroy() {
        this.isAlive = false;
        this.emit('destroyed');
        console.log(`${this.name} разрушено!`);
    }
}

console.log('🏗️ Fixed Building class loaded!');