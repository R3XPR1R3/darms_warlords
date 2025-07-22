// src/systems/MovementSystem.js
export class MovementSystem {
    constructor() {
        this.pathfindingGrid = null;
        this.TILE_SIZE = 50;
    }
    
    update(deltaTime, entities) {
        for (const entity of entities) {
            if (entity.hasComponent && entity.hasComponent('movement')) {
                this.updateEntityMovement(entity, deltaTime);
            }
        }
    }
    
    updateEntityMovement(entity, deltaTime) {
        const movement = entity.getComponent('movement');
        if (!movement || !movement.isMoving) return;
        
        // Простое движение к цели
        const dx = movement.targetX - entity.x;
        const dy = movement.targetY - entity.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance <= movement.speed * deltaTime) {
            // Достигли цели
            entity.x = movement.targetX;
            entity.y = movement.targetY;
            movement.isMoving = false;
            entity.emit('movement_complete');
        } else {
            // Движемся к цели
            const moveX = (dx / distance) * movement.speed * deltaTime;
            const moveY = (dy / distance) * movement.speed * deltaTime;
            
            entity.x += moveX;
            entity.y += moveY;
            
            // Обновляем угол поворота
            entity.angle = Math.atan2(dy, dx);
        }
    }
    
    setMovementTarget(entity, x, y) {
        let movement = entity.getComponent('movement');
        if (!movement) {
            movement = new MovementComponent();
            entity.addComponent('movement', movement);
        }
        
        movement.targetX = x;
        movement.targetY = y;
        movement.isMoving = true;
    }
    
    stopMovement(entity) {
        const movement = entity.getComponent('movement');
        if (movement) {
            movement.isMoving = false;
        }
    }
}

// Movement Component
class MovementComponent {
    constructor() {
        this.targetX = 0;
        this.targetY = 0;
        this.speed = 100; // pixels per second
        this.isMoving = false;
        this.waypoints = [];
        this.currentWaypoint = 0;
    }
}
