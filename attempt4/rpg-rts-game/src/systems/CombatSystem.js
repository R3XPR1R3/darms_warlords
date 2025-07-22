// src/systems/CombatSystem.js
export class CombatSystem {
    constructor() {
        this.combatPairs = [];
    }
    
    update(deltaTime, entities) {
        // Обновляем все боевые взаимодействия
        this.updateCombat(deltaTime, entities);
        this.checkForNewCombat(entities);
        this.cleanupFinishedCombat();
    }
    
    updateCombat(deltaTime, entities) {
        for (const entity of entities) {
            const combat = entity.getComponent('combat');
            if (!combat) continue;
            
            // Обновляем кулдауны
            if (combat.attackCooldown > 0) {
                combat.attackCooldown -= deltaTime;
            }
            
            // Если есть цель для атаки
            if (combat.target && combat.target.isAlive) {
                this.processCombat(entity, combat, deltaTime);
            } else {
                combat.target = null;
                combat.isAttacking = false;
            }
        }
    }
    
    processCombat(attacker, combat, deltaTime) {
        const target = combat.target;
        const distance = this.getDistance(attacker, target);
        
        // Проверяем дальность атаки
        if (distance <= combat.attackRange) {
            // Можем атаковать
            if (combat.attackCooldown <= 0) {
                this.executeAttack(attacker, target, combat);
                combat.attackCooldown = 1.0 / combat.attackSpeed; // сек между атаками
            }
        } else {
            // Слишком далеко - двигаемся к цели
            const movement = attacker.getComponent('movement');
            if (movement) {
                movement.targetX = target.x;
                movement.targetY = target.y;
                movement.isMoving = true;
            }
        }
    }
    
    executeAttack(attacker, target, combat) {
        const damage = this.calculateDamage(attacker, target);
        
        // Наносим урон
        const targetHealth = target.getComponent('health');
        if (targetHealth) {
            targetHealth.current -= damage;
            
            // Эффекты при получении урона
            target.emit('damaged', { damage, attacker });
            
            // Проверяем смерть
            if (targetHealth.current <= 0) {
                targetHealth.current = 0;
                target.isAlive = false;
                target.emit('death', { killer: attacker });
                combat.target = null;
                combat.isAttacking = false;
            }
        }
        
        // Эффекты атаки
        attacker.emit('attack', { target, damage });
        
        console.log(`${attacker.name} атакует ${target.name} на ${damage} урона`);
    }
    
    calculateDamage(attacker, target) {
        const attackerCombat = attacker.getComponent('combat');
        const targetCombat = target.getComponent('combat');
        
        let damage = attackerCombat ? attackerCombat.attackPower : 10;
        const defense = targetCombat ? targetCombat.defense : 0;
        
        // Простая формула урона
        damage = Math.max(1, damage - defense);
        
        return damage;
    }
    
    checkForNewCombat(entities) {
        // Автоматическое обнаружение врагов в радиусе
        for (const entity of entities) {
            const combat = entity.getComponent('combat');
            if (!combat || combat.target || !combat.autoAttack) continue;
            
            // Ищем ближайшего врага
            const nearestEnemy = this.findNearestEnemy(entity, entities);
            if (nearestEnemy) {
                this.setAttackTarget(entity, nearestEnemy);
            }
        }
    }
    
    findNearestEnemy(entity, entities) {
        let nearest = null;
        let minDistance = Infinity;
        
        const combat = entity.getComponent('combat');
        const detectionRange = combat ? combat.detectionRange : 150;
        
        for (const other of entities) {
            if (other === entity || !other.isAlive) continue;
            if (entity.faction === other.faction) continue; // Союзник
            
            const distance = this.getDistance(entity, other);
            if (distance < detectionRange && distance < minDistance) {
                minDistance = distance;
                nearest = other;
            }
        }
        
        return nearest;
    }
    
    setAttackTarget(attacker, target) {
        let combat = attacker.getComponent('combat');
        if (!combat) {
            combat = new CombatComponent();
            attacker.addComponent('combat', combat);
        }
        
        combat.target = target;
        combat.isAttacking = true;
    }
    
    getDistance(entity1, entity2) {
        const dx = entity1.x - entity2.x;
        const dy = entity1.y - entity2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    cleanupFinishedCombat() {
        this.combatPairs = this.combatPairs.filter(pair => 
            pair.attacker.isAlive && pair.target.isAlive
        );
    }
}

// Combat Component
class CombatComponent {
    constructor(config = {}) {
        this.attackPower = config.attackPower || 10;
        this.defense = config.defense || 0;
        this.attackRange = config.attackRange || 50;
        this.attackSpeed = config.attackSpeed || 1.0; // attacks per second
        this.detectionRange = config.detectionRange || 150;
        
        this.target = null;
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.autoAttack = config.autoAttack !== false;
    }
}