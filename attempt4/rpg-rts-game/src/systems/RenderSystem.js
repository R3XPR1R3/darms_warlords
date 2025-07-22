// src/systems/RenderSystem.js - Система отрисовки
export class RenderSystem {
    constructor() {
        this.gameState = null;
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.TILE_SIZE = 50;
        this.GRID_ROWS = 16;
        this.GRID_COLS = 24;
    }
    
    setGameState(gameState) {
        this.gameState = gameState;
    }
    
    render(ctx) {
        if (!this.gameState) return;
        
        // Save context for camera transforms
        ctx.save();
        
        // Apply camera transform
        ctx.translate(-this.camera.x, -this.camera.y);
        ctx.scale(this.camera.zoom, this.camera.zoom);
        
        // Render world
        this.renderGrid(ctx);
        this.renderObstacles(ctx);
        this.renderResources(ctx);
        this.renderBuildings(ctx);
        this.renderUnits(ctx);
        this.renderEffects(ctx);
        
        // Restore context
        ctx.restore();
        
        // Render UI (not affected by camera)
        this.renderUI(ctx);
    }
    
    renderGrid(ctx) {
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 0.5;
        
        // Vertical lines
        for (let x = 0; x <= this.GRID_COLS; x++) {
            ctx.beginPath();
            ctx.moveTo(x * this.TILE_SIZE, 0);
            ctx.lineTo(x * this.TILE_SIZE, this.GRID_ROWS * this.TILE_SIZE);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= this.GRID_ROWS; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * this.TILE_SIZE);
            ctx.lineTo(this.GRID_COLS * this.TILE_SIZE, y * this.TILE_SIZE);
            ctx.stroke();
        }
        
        // Checkerboard pattern
        for (let row = 0; row < this.GRID_ROWS; row++) {
            for (let col = 0; col < this.GRID_COLS; col++) {
                if ((row + col) % 2 === 0) {
                    ctx.fillStyle = '#1a1a1a';
                    ctx.fillRect(
                        col * this.TILE_SIZE,
                        row * this.TILE_SIZE,
                        this.TILE_SIZE,
                        this.TILE_SIZE
                    );
                }
            }
        }
    }
    
    renderObstacles(ctx) {
        ctx.fillStyle = '#8B4513';
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        
        for (const obstacle of this.gameState.obstacles) {
            const x = obstacle.col * this.TILE_SIZE;
            const y = obstacle.row * this.TILE_SIZE;
            
            ctx.fillRect(x, y, this.TILE_SIZE, this.TILE_SIZE);
            ctx.strokeRect(x, y, this.TILE_SIZE, this.TILE_SIZE);
        }
    }
    
    renderResources(ctx) {
        for (const resource of this.gameState.resources) {
            if (resource.amount <= 0) continue;
            
            // Resource color based on type
            let color = '#FFD700'; // Gold
            switch (resource.type) {
                case 'wood': color = '#8B4513'; break;
                case 'stone': color = '#708090'; break;
                case 'mana': color = '#9370DB'; break;
            }
            
            // Draw resource node
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(resource.x, resource.y, 20, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw amount text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(
                resource.amount.toString(),
                resource.x,
                resource.y + 4
            );
        }
    }
    
    renderBuildings(ctx) {
        for (const building of this.gameState.buildings) {
            this.renderBuilding(ctx, building);
        }
    }
    
    renderBuilding(ctx, building) {
        // Simple building rendering
        ctx.fillStyle = building.faction?.color || '#666666';
        ctx.fillRect(
            building.x - building.width / 2,
            building.y - building.height / 2,
            building.width,
            building.height
        );
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            building.x - building.width / 2,
            building.y - building.height / 2,
            building.width,
            building.height
        );
        
        // Building name
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(building.name, building.x, building.y - building.height / 2 - 5);
    }
    
    renderUnits(ctx) {
        // Sort units by Y position for proper depth
        const sortedUnits = [...this.gameState.entities]
            .filter(entity => entity.type === 'unit')
            .sort((a, b) => a.y - b.y);
        
        for (const unit of sortedUnits) {
            this.renderUnit(ctx, unit);
        }
    }
    
    renderUnit(ctx, unit) {
        ctx.save();
        
        // Move to unit position
        ctx.translate(unit.x, unit.y);
        
        // Rotate based on unit facing direction
        if (unit.angle !== undefined) {
            ctx.rotate(unit.angle);
        }
        
        // Draw unit body
        ctx.fillStyle = unit.faction?.color || '#0066CC';
        if (unit.isHero) {
            // Heroes are larger and have special appearance
            ctx.fillStyle = '#FFD700';
            this.drawHeroShape(ctx, unit);
        } else {
            this.drawUnitShape(ctx, unit);
        }
        
        ctx.restore();
        
        // Draw selection indicator
        if (unit.isSelected) {
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(unit.x, unit.y, unit.width / 2 + 5, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Draw health bar
        if (unit.stats && unit.stats.current_health < unit.stats.health) {
            this.drawHealthBar(ctx, unit);
        }
        
        // Draw unit name (if selected)
        if (unit.isSelected) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(unit.name, unit.x, unit.y - unit.height / 2 - 15);
        }
    }
    
    drawUnitShape(ctx, unit) {
        const size = unit.width / 2;
        
        // Triangle shape pointing forward
        ctx.beginPath();
        ctx.moveTo(size, 0);
        ctx.lineTo(-size / 2, -size / 2);
        ctx.lineTo(-size / 3, 0);
        ctx.lineTo(-size / 2, size / 2);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    drawHeroShape(ctx, unit) {
        const size = unit.width / 2;
        
        // Star shape for heroes
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
            
            // Inner point
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
    
    drawHealthBar(ctx, unit) {
        const barWidth = unit.width;
        const barHeight = 4;
        const x = unit.x - barWidth / 2;
        const y = unit.y - unit.height / 2 - 10;
        
        const healthPercent = unit.stats.current_health / unit.stats.health;
        
        // Background
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Health
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);
    }
    
    renderEffects(ctx) {
        // Render any visual effects (particles, explosions, etc.)
        // TODO: Implement particle system
    }
    
    renderUI(ctx) {
        // UI elements that don't move with camera
        // These are rendered by UISystem, this is just a placeholder
    }
    
    // Camera controls
    setCameraPosition(x, y) {
        this.camera.x = x;
        this.camera.y = y;
    }
    
    setCameraZoom(zoom) {
        this.camera.zoom = Math.max(0.5, Math.min(2.0, zoom));
    }
    
    screenToWorld(screenX, screenY) {
        return {
            x: (screenX + this.camera.x) / this.camera.zoom,
            y: (screenY + this.camera.y) / this.camera.zoom
        };
    }
    
    worldToScreen(worldX, worldY) {
        return {
            x: worldX * this.camera.zoom - this.camera.x,
            y: worldY * this.camera.zoom - this.camera.y
        };
    }
}

console.log('🎨 Render and Input systems loaded');