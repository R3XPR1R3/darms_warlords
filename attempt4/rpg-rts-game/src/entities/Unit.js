// src/entities/Unit.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
import { Entity } from '../core/Entity.js';

export class Unit extends Entity {
    constructor(config = {}) {
        super(config);
        
        this.type = 'unit';
        this.race = config.race || null;
        this.unitClass = config.unitClass || null;
        this.faction = config.faction || null;
        this.isHero = config.isHero || false;
        this.isPlayerControlled = config.isPlayerControlled || false;
        
        // Характеристики
        this.stats = {
            health: config.stats?.health || 100,
            max_health: config.stats?.health || 100,
            current_health: config.stats?.current_health || config.stats?.health || 100,
            mana: config.stats?.mana || 0,
            max_mana: config.stats?.mana || 0,
            current_mana: config.stats?.current_mana || config.stats?.mana || 0,
            stamina: config.stats?.stamina || 100,
            max_stamina: config.stats?.stamina || 100,
            current_stamina: config.stats?.current_stamina || config.stats?.stamina || 100,
            
            melee_attack: config.stats?.melee_attack || 10,
            ranged_attack: config.stats?.ranged_attack || 0,
            defense: config.stats?.defense || 5,
            speed: config.stats?.speed || 100,
            vision: config.stats?.vision || 150
        };
        
        // Инвентарь и экипировка
        this.inventory = [];
        this.equipment = this.initializeEquipment(config.equipment);
        
        // Способности
        this.abilities = config.abilities || [];
        this.activeAbilities = [];
        
        // Опыт и уровень
        this.level = config.level || 1;
        this.experience = config.experience || 0;
        this.experienceToNext = this.calculateExperienceToNext();
        
        // Состояние
        this.mood = config.mood || 100;
        this.fatigue = 0;
        
        // Обучение
        this.learningProgress = null;
        this.canLearn = this.unitClass?.can_learn !== false;
        
        // Размножение
        this.canBreed = config.canBreed !== false;
        this.breedingCooldown = 0;
        this.gender = config.gender || (Math.random() < 0.5 ? 'male' : 'female');
        this.age = config.age || 18;
        
        // Сохраняем config для использования в методах
        this.config = config;
        
        // Инициализируем компоненты
        this.initializeComponents();
    }
    
    initializeComponents() {
        // Health Component
        this.addComponent('health', {
            current: this.stats.current_health,
            max: this.stats.max_health,
            regeneration: 0.5 // HP per second
        });
        
        // Movement Component
        this.addComponent('movement', {
            speed: this.stats.speed,
            targetX: this.x,
            targetY: this.y,
            isMoving: false,
            waypoints: [],
            currentWaypoint: 0
        });
        
        // Combat Component
        this.addComponent('combat', {
            attackPower: this.stats.melee_attack,
            defense: this.stats.defense,
            attackRange: this.stats.ranged_attack > 0 ? 150 : 50,
            attackSpeed: 1.0,
            detectionRange: this.stats.vision,
            target: null,
            isAttacking: false,
            attackCooldown: 0,
            autoAttack: !this.isPlayerControlled
        });
        
        // AI Component (для неигровых юнитов)
        if (!this.isPlayerControlled) {
            this.addComponent('ai', {
                state: 'idle',
                target: null,
                decisionTimer: 0,
                decisionInterval: 1.0,
                patrolPoints: this.config.patrolPoints || [], // ИСПРАВЛЕНО: используем this.config
                currentPatrolPoint: 0,
                aggressiveness: 0.7,
                intelligence: 0.5
            });
        }
    }
    
    initializeEquipment(equipmentConfig = {}) {
        const equipment = {};
        const raceSlots = this.race?.equipment_slots || {
            head: true, torso: true, lefthand: true, righthand: true,
            legs: true, feet: true, back: false, tail: false, accessory: true
        };
        
        // Инициализируем слоты
        for (const [slot, hasSlot] of Object.entries(raceSlots)) {
            if (hasSlot) {
                equipment[slot] = equipmentConfig[slot] || null;
            }
        }
        
        return equipment;
    }
    
    // ===== ДВИЖЕНИЕ =====
    setMoveTarget(x, y) {
        const movement = this.getComponent('movement');
        if (movement) {
            movement.targetX = x;
            movement.targetY = y;
            movement.isMoving = true;
        }
        
        // Сбрасываем боевую цель при движении
        const combat = this.getComponent('combat');
        if (combat && this.isPlayerControlled) {
            combat.target = null;
            combat.isAttacking = false;
        }
    }
    
    setAttackTarget(target) {
        const combat = this.getComponent('combat');
        if (combat) {
            combat.target = target;
            combat.isAttacking = true;
        }
        
        // Останавливаем движение при атаке
        const movement = this.getComponent('movement');
        if (movement) {
            movement.isMoving = false;
        }
    }
    
    stop() {
        const movement = this.getComponent('movement');
        if (movement) {
            movement.isMoving = false;
        }
        
        const combat = this.getComponent('combat');
        if (combat) {
            combat.target = null;
            combat.isAttacking = false;
        }
    }
    
    // ===== ОБУЧЕНИЕ =====
    startLearning(targetClass, gameData) {
        if (!this.canLearn) {
            return { success: false, reason: "Нельзя переобучить" };
        }
        
        const targetClassData = gameData.classes[targetClass];
        if (!targetClassData) {
            return { success: false, reason: "Неизвестный класс" };
        }
        
        const requirements = targetClassData.learning_requirements || {};
        
        // Проверяем требования
        if (!this.checkLearningRequirements(requirements)) {
            return { success: false, reason: "Не выполнены требования" };
        }
        
        this.learningProgress = {
            targetClass: targetClass,
            timeLeft: requirements.time || 300,
            totalTime: requirements.time || 300
        };
        
        return { success: true, time: requirements.time };
    }
    
    checkLearningRequirements(requirements) {
        // Проверяем предварительные классы
        if (requirements.prerequisite_class) {
            if (this.unitClass.id !== requirements.prerequisite_class) {
                return false;
            }
        }
        
        // Проверяем расу
        if (requirements.prerequisite_race) {
            if (this.race.id !== requirements.prerequisite_race) {
                return false;
            }
        }
        
        // Проверяем минимальные характеристики
        for (const [stat, minValue] of Object.entries(requirements)) {
            if (stat.startsWith('min_') && this.stats[stat.replace('min_', '')] < minValue) {
                return false;
            }
        }
        
        return true;
    }
    
    updateLearning(deltaTime) {
        if (!this.learningProgress) return;
        
        this.learningProgress.timeLeft -= deltaTime;
        
        if (this.learningProgress.timeLeft <= 0) {
            this.completeLearning();
        }
    }
    
    completeLearning() {
        const newClassId = this.learningProgress.targetClass;
        
        // Здесь должна быть загрузка данных нового класса
        // Для упрощения просто меняем ID
        this.unitClass = { id: newClassId, name: newClassId };
        
        this.learningProgress = null;
        
        this.emit('learning_complete', { newClass: newClassId });
        console.log(`${this.name} освоил класс ${newClassId}!`);
    }
    
    // ===== РАЗМНОЖЕНИЕ =====
    canBreedWith(partner) {
        if (!this.canBreed || !partner.canBreed) return false;
        if (this.gender === partner.gender) return false;
        if (this.breedingCooldown > 0 || partner.breedingCooldown > 0) return false;
        if (!this.race.can_breed_with?.includes(partner.race.id)) return false;
        
        return true;
    }
    
    breed(partner) {
        if (!this.canBreedWith(partner)) return null;
        
        // Создаем потомство
        const offspring = this.createOffspring(partner);
        
        // Устанавливаем кулдаун
        this.breedingCooldown = 300; // 5 минут
        partner.breedingCooldown = 300;
        
        this.emit('breeding', { partner, offspring });
        
        return offspring;
    }
    
    createOffspring(partner) {
        // Выбираем расу (50/50 шанс)
        const childRace = Math.random() < 0.5 ? this.race : partner.race;
        const childGender = Math.random() < 0.5 ? 'male' : 'female';
        
        // Наследуем характеристики
        const inheritedStats = this.inheritStats(partner);
        
        return new Unit({
            name: this.generateOffspringName(childGender),
            race: childRace,
            unitClass: { id: 'citizen', name: 'Citizen' }, // Все дети - граждане
            gender: childGender,
            age: 0,
            x: this.x + (Math.random() - 0.5) * 100,
            y: this.y + (Math.random() - 0.5) * 100,
            faction: this.faction,
            stats: inheritedStats,
            isPlayerControlled: this.isPlayerControlled
        });
    }
    
    inheritStats(partner) {
        const stats = {};
        
        // Усредняем характеристики родителей с небольшой мутацией
        for (const [stat, value] of Object.entries(this.stats)) {
            const partnerValue = partner.stats[stat] || value;
            const average = (value + partnerValue) / 2;
            const mutation = (Math.random() - 0.5) * 0.2; // ±10% мутация
            
            stats[stat] = Math.max(1, Math.floor(average * (1 + mutation)));
        }
        
        return stats;
    }
    
    generateOffspringName(gender) {
        const maleNames = ['Артур', 'Бертран', 'Вильгельм', 'Гарет', 'Дункан'];
        const femaleNames = ['Ариэль', 'Беатрис', 'Валенсия', 'Гвиневра', 'Дейзи'];
        
        const names = gender === 'male' ? maleNames : femaleNames;
        return names[Math.floor(Math.random() * names.length)];
    }
    
    // ===== ЭКИПИРОВКА =====
    canEquip(item, slot) {
        // Проверяем наличие слота
        if (!this.equipment.hasOwnProperty(slot)) return false;
        
        // Проверяем ограничения класса
        const classRestrictions = this.unitClass?.allowed_weapons || [];
        const armorRestrictions = this.unitClass?.allowed_armor || [];
        
        if (item.type === 'weapon' && !classRestrictions.includes(item.subtype || item.id)) {
            return false;
        }
        
        if (item.type === 'armor' && !armorRestrictions.includes(item.subtype || item.id)) {
            return false;
        }
        
        // Проверяем требования предмета
        if (item.requirements) {
            for (const [req, value] of Object.entries(item.requirements)) {
                if (this.stats[req] < value) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    equip(item, slot) {
        if (!this.canEquip(item, slot)) return false;
        
        // Снимаем текущий предмет
        if (this.equipment[slot]) {
            this.unequip(slot);
        }
        
        // Экипируем новый
        this.equipment[slot] = item;
        this.applyItemEffects(item, true);
        
        this.emit('item_equipped', { item, slot });
        return true;
    }
    
    unequip(slot) {
        const item = this.equipment[slot];
        if (!item) return false;
        
        this.equipment[slot] = null;
        this.applyItemEffects(item, false);
        
        this.emit('item_unequipped', { item, slot });
        return true;
    }
    
    applyItemEffects(item, isEquipping) {
        if (!item.stats) return;
        
        const multiplier = isEquipping ? 1 : -1;
        
        for (const [stat, bonus] of Object.entries(item.stats)) {
            if (this.stats.hasOwnProperty(stat)) {
                this.stats[stat] += bonus * multiplier;
            }
        }
        
        // Обновляем компоненты
        const combat = this.getComponent('combat');
        if (combat) {
            combat.attackPower = this.stats.melee_attack;
            combat.defense = this.stats.defense;
        }
        
        const movement = this.getComponent('movement');
        if (movement) {
            movement.speed = this.stats.speed;
        }
    }
    
    // ===== ПРОЧЕЕ =====
    gainExperience(amount) {
        this.experience += amount;
        
        while (this.experience >= this.experienceToNext) {
            this.levelUp();
        }
    }
    
    levelUp() {
        this.experience -= this.experienceToNext;
        this.level++;
        this.experienceToNext = this.calculateExperienceToNext();
        
        // Бонусы за уровень
        this.stats.max_health += 5;
        this.stats.current_health = this.stats.max_health;
        
        this.emit('level_up', { newLevel: this.level });
        console.log(`${this.name} достиг уровня ${this.level}!`);
    }
    
    calculateExperienceToNext() {
        return this.level * 100 + (this.level - 1) * 50;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Обновляем обучение
        this.updateLearning(deltaTime);
        
        // Обновляем кулдауны
        if (this.breedingCooldown > 0) {
            this.breedingCooldown -= deltaTime;
        }
        
        // Обновляем здоровье
        const health = this.getComponent('health');
        if (health && health.current < health.max) {
            health.current = Math.min(health.max, health.current + health.regeneration * deltaTime);
            this.stats.current_health = health.current;
        }
    }
    
    render(ctx) {
        if (!this.isVisible) return;
        
        // Вызываем базовую отрисовку компонентов
        super.render(ctx);
        
        // Рисуем тело юнита
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle || 0);
        
        // Цвет в зависимости от фракции
        ctx.fillStyle = this.faction?.color || '#0066cc';
        
        if (this.isHero) {
            this.drawHeroShape(ctx);
        } else {
            this.drawUnitShape(ctx);
        }
        
        // Обводка для выбранных юнитов
        if (this.isSelected) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        ctx.restore();
        
        // Полоса здоровья
        const health = this.getComponent('health');
        if (health && health.current < health.max) {
            this.drawHealthBar(ctx, health);
        }
        
        // Имя юнита (если выбран)
        if (this.isSelected) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.name, this.x, this.y - this.height/2 - 20);
        }
    }
    
    drawUnitShape(ctx) {
        const size = this.width / 2;
        
        // Треугольная форма
        ctx.beginPath();
        ctx.moveTo(size, 0);
        ctx.lineTo(-size/2, -size/2);
        ctx.lineTo(-size/3, 0);
        ctx.lineTo(-size/2, size/2);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    drawHeroShape(ctx) {
        const size = this.width / 2;
        
        // Звездообразная форма для героев
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
            const x = Math.cos(angle) * size;
            const y = Math.sin(angle) * size;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            
            // Внутренняя точка
            const innerAngle = angle + Math.PI / 5;
            const innerX = Math.cos(innerAngle) * size * 0.5;
            const innerY = Math.sin(innerAngle) * size * 0.5;
            ctx.lineTo(innerX, innerY);
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    drawHealthBar(ctx, health) {
        const barWidth = this.width;
        const barHeight = 4;
        const x = this.x - barWidth / 2;
        const y = this.y - this.height / 2 - 10;
        
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
    
    // ===== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ =====
    setGatherTarget(resource) {
        // Устанавливаем задачу сбора ресурсов
        const ai = this.getComponent('ai');
        if (ai) {
            ai.target = resource;
            ai.state = 'gathering';
        }
        this.setMoveTarget(resource.x, resource.y);
    }
    
    setBuildTask(buildingType, x, y) {
        // Устанавливаем задачу строительства
        const ai = this.getComponent('ai');
        if (ai) {
            ai.state = 'building';
            ai.target = { type: buildingType, x, y };
        }
        this.setMoveTarget(x, y);
    }
    
    takeDamage(damage, attacker) {
        const health = this.getComponent('health');
        if (!health) return 0;
        
        const actualDamage = Math.max(1, damage - this.stats.defense);
        health.current -= actualDamage;
        
        if (health.current <= 0) {
            health.current = 0;
            this.die(attacker);
        }
        
        this.emit('damaged', { damage: actualDamage, attacker });
        return actualDamage;
    }
    
    die(killer) {
        this.isAlive = false;
        this.emit('death', { killer });
        console.log(`${this.name} погиб!`);
    }
    
    heal(amount) {
        const health = this.getComponent('health');
        if (health) {
            health.current = Math.min(health.max, health.current + amount);
            this.stats.current_health = health.current;
        }
    }
}

console.log('⚔️ Fixed Unit class loaded!');