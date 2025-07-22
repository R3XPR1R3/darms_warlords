

// src/systems/AISystem.js
export class AISystem {
    constructor() {
        this.gameData = null;
        this.aiPlayers = [];
    }
    
    setGameData(gameData) {
        this.gameData = gameData;
    }
    
    update(deltaTime, entities) {
        for (const entity of entities) {
            if (!entity.isPlayerControlled && entity.isAlive) {
                this.updateEntityAI(entity, deltaTime, entities);
            }
        }
    }
    
    updateEntityAI(entity, deltaTime, entities) {
        const ai = entity.getComponent('ai');
        if (!ai) {
            // Создаем базовый AI компонент
            const aiComponent = new AIComponent();
            entity.addComponent('ai', aiComponent);
            return;
        }
        
        // Обновляем таймер принятия решений
        ai.decisionTimer -= deltaTime;
        if (ai.decisionTimer > 0) return;
        
        ai.decisionTimer = ai.decisionInterval;
        
        // Выполняем AI логику в зависимости от состояния
        switch (ai.state) {
            case 'idle':
                this.handleIdleState(entity, ai, entities);
                break;
            case 'moving':
                this.handleMovingState(entity, ai, entities);
                break;
            case 'attacking':
                this.handleAttackingState(entity, ai, entities);
                break;
            case 'gathering':
                this.handleGatheringState(entity, ai, entities);
                break;
            case 'patrolling':
                this.handlePatrollingState(entity, ai, entities);
                break;
        }
    }
    
    handleIdleState(entity, ai, entities) {
        // Ищем ближайшего врага
        const enemy = this.findNearestEnemy(entity, entities);
        if (enemy) {
            this.setAITarget(entity, ai, enemy, 'attacking');
            return;
        }
        
        // Если есть задача патрулирования
        if (ai.patrolPoints && ai.patrolPoints.length > 0) {
            ai.state = 'patrolling';
            return;
        }
        
        // Случайное блуждание
        if (Math.random() < 0.1) { // 10% шанс начать двигаться
            this.setRandomMovement(entity, ai);
        }
    }
    
    handleMovingState(entity, ai, entities) {
        const movement = entity.getComponent('movement');
        
        // Проверяем, не появился ли враг
        const enemy = this.findNearestEnemy(entity, entities);
        if (enemy) {
            this.setAITarget(entity, ai, enemy, 'attacking');
            return;
        }
        
        // Проверяем, достигли ли цели
        if (!movement || !movement.isMoving) {
            ai.state = 'idle';
        }
    }
    
    handleAttackingState(entity, ai, entities) {
        const combat = entity.getComponent('combat');
        
        // Проверяем, жива ли цель
        if (!ai.target || !ai.target.isAlive) {
            ai.target = null;
            ai.state = 'idle';
            return;
        }
        
        // Проверяем расстояние до цели
        const distance = this.getDistance(entity, ai.target);
        const attackRange = combat ? combat.attackRange : 50;
        
        if (distance > attackRange * 3) {
            // Цель слишком далеко, прекращаем преследование
            ai.target = null;
            ai.state = 'idle';
        } else {
            // Устанавливаем цель для боевой системы
            if (combat) {
                combat.target = ai.target;
                combat.isAttacking = true;
            }
        }
    }
    
    handleGatheringState(entity, ai, entities) {
        // Логика сбора ресурсов
        if (!ai.target) {
            ai.state = 'idle';
            return;
        }
        
        const distance = this.getDistance(entity, ai.target);
        if (distance <= 50) {
            // Собираем ресурс
            if (ai.target.amount > 0) {
                ai.target.amount -= 5;
                entity.emit('resource_gathered', { 
                    resource: ai.target, 
                    amount: 5 
                });
            } else {
                ai.target = null;
                ai.state = 'idle';
            }
        }
    }
    
    handlePatrollingState(entity, ai, entities) {
        const movement = entity.getComponent('movement');
        
        // Проверяем врагов
        const enemy = this.findNearestEnemy(entity, entities);
        if (enemy) {
            this.setAITarget(entity, ai, enemy, 'attacking');
            return;
        }
        
        // Патрулирование между точками
        if (!movement || !movement.isMoving) {
            ai.currentPatrolPoint = (ai.currentPatrolPoint + 1) % ai.patrolPoints.length;
            const nextPoint = ai.patrolPoints[ai.currentPatrolPoint];
            
            if (nextPoint) {
                const movementSystem = entity.engine?.systems?.get('movement');
                if (movementSystem) {
                    movementSystem.setMovementTarget(entity, nextPoint.x, nextPoint.y);
                }
            }
        }
    }
    
    findNearestEnemy(entity, entities) {
        let nearest = null;
        let minDistance = Infinity;
        const detectionRange = 200;
        
        for (const other of entities) {
            if (other === entity || !other.isAlive) continue;
            if (entity.faction === other.faction) continue;
            
            const distance = this.getDistance(entity, other);
            if (distance < detectionRange && distance < minDistance) {
                minDistance = distance;
                nearest = other;
            }
        }
        
        return nearest;
    }
    
    setAITarget(entity, ai, target, state) {
        ai.target = target;
        ai.state = state;
    }
    
    setRandomMovement(entity, ai) {
        const range = 100;
        const targetX = entity.x + (Math.random() - 0.5) * range * 2;
        const targetY = entity.y + (Math.random() - 0.5) * range * 2;
        
        const movementSystem = entity.engine?.systems?.get('movement');
        if (movementSystem) {
            movementSystem.setMovementTarget(entity, targetX, targetY);
            ai.state = 'moving';
        }
    }
    
    getDistance(entity1, entity2) {
        const dx = entity1.x - entity2.x;
        const dy = entity1.y - entity2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

// AI Component
class AIComponent {
    constructor(config = {}) {
        this.state = 'idle';
        this.target = null;
        this.decisionTimer = 0;
        this.decisionInterval = 1.0; // секунды между решениями
        
        this.patrolPoints = config.patrolPoints || [];
        this.currentPatrolPoint = 0;
        
        this.aggressiveness = config.aggressiveness || 0.5;
        this.intelligence = config.intelligence || 0.5;
    }
}