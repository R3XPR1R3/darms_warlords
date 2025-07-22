// src/systems/InputSystem.js - Система ввода
import { Utils } from '../core/Utils.js';

export class InputSystem {
    constructor() {
        this.game = null;
        this.mousePos = { x: 0, y: 0 };
        this.keys = new Set();
        this.selectionBox = null;
        this.isDragging = false;
        this.dragStart = null;
        
        this.onUnitSelect = null;
        this.onUnitCommand = null;
    }
    
    setGame(game) {
        this.game = game;
    }
    
    handleMouseMove(event) {
        const canvas = event.target;
        this.mousePos = Utils.getMousePos(canvas, event);
        
        // Handle selection box dragging
        if (this.isDragging && this.dragStart) {
            this.selectionBox = {
                x: Math.min(this.dragStart.x, this.mousePos.x),
                y: Math.min(this.dragStart.y, this.mousePos.y),
                width: Math.abs(this.mousePos.x - this.dragStart.x),
                height: Math.abs(this.mousePos.y - this.dragStart.y)
            };
        }
    }
    
    handleMouseClick(event) {
        if (event.button !== 0) return; // Only left click
        
        const clickedEntity = this.getEntityAtPosition(this.mousePos.x, this.mousePos.y);
        
        if (clickedEntity && clickedEntity.isPlayerControlled) {
            // Select unit
            this.selectUnits([clickedEntity], event.ctrlKey);
        } else {
            // Start selection box or clear selection
            if (!event.ctrlKey) {
                this.clearSelection();
            }
            
            this.startSelectionBox();
        }
    }
    
    handleRightClick(event) {
        if (!this.game || this.game.gameState.player.selectedEntities.length === 0) return;
        
        const target = this.getTargetAtPosition(this.mousePos.x, this.mousePos.y);
        const command = this.determineCommand(target);
        
        if (this.onUnitCommand) {
            this.onUnitCommand(command, target);
        }
    }
    
    handleKeyDown(event) {
        this.keys.add(event.code);
        
        switch (event.code) {
            case 'Escape':
                this.clearSelection();
                break;
                
            case 'KeyA':
                if (event.ctrlKey) {
                    this.selectAllPlayerUnits();
                    event.preventDefault();
                }
                break;
                
            case 'KeyH':
                this.selectHero();
                break;
                
            case 'Space':
                this.togglePause();
                event.preventDefault();
                break;
                
            case 'KeyS':
                if (event.ctrlKey) {
                    this.game?.save();
                    event.preventDefault();
                }
                break;
                
            case 'KeyL':
                if (event.ctrlKey) {
                    this.game?.load();
                    event.preventDefault();
                }
                break;
        }
    }
    
    handleKeyUp(event) {
        this.keys.delete(event.code);
    }
    
    getEntityAtPosition(x, y) {
        if (!this.game) return null;
        
        // Check entities from front to back (highest Y first)
        const sortedEntities = [...this.game.gameState.entities].sort((a, b) => b.y - a.y);
        
        for (const entity of sortedEntities) {
            if (this.isPointInEntity(x, y, entity)) {
                return entity;
            }
        }
        
        return null;
    }
    
    isPointInEntity(x, y, entity) {
        const halfWidth = entity.width / 2;
        const halfHeight = entity.height / 2;
        
        return x >= entity.x - halfWidth &&
               x <= entity.x + halfWidth &&
               y >= entity.y - halfHeight &&
               y <= entity.y + halfHeight;
    }
    
    getTargetAtPosition(x, y) {
        // Check for enemy units
        const entity = this.getEntityAtPosition(x, y);
        if (entity && !entity.isPlayerControlled) {
            return { type: 'entity', entity };
        }
        
        // Check for resources
        const resource = this.getResourceAtPosition(x, y);
        if (resource) {
            return { type: 'resource', resource };
        }
        
        // Default to movement target
        return { type: 'position', x, y };
    }
    
    getResourceAtPosition(x, y) {
        if (!this.game) return null;
        
        for (const resource of this.game.gameState.resources) {
            const distance = Utils.distance(x, y, resource.x, resource.y);
            if (distance <= 25) { // Resource radius
                return resource;
            }
        }
        
        return null;
    }
    
    determineCommand(target) {
        switch (target.type) {
            case 'entity':
                return { type: 'attack' };
            case 'resource':
                return { type: 'gather' };
            case 'position':
            default:
                return { type: 'move' };
        }
    }
    
    selectUnits(units, addToSelection = false) {
        if (!this.game) return;
        
        let selectedUnits;
        
        if (addToSelection) {
            selectedUnits = [...this.game.gameState.player.selectedEntities];
            for (const unit of units) {
                if (!selectedUnits.includes(unit)) {
                    selectedUnits.push(unit);
                }
            }
        } else {
            selectedUnits = [...units];
        }
        
        // Update selection state
        this.clearSelectionState();
        for (const unit of selectedUnits) {
            unit.isSelected = true;
        }
        
        this.game.gameState.player.selectedEntities = selectedUnits;
        
        if (this.onUnitSelect) {
            this.onUnitSelect(selectedUnits);
        }
    }
    
    clearSelection() {
        if (!this.game) return;
        
        this.clearSelectionState();
        this.game.gameState.player.selectedEntities = [];
        
        if (this.onUnitSelect) {
            this.onUnitSelect([]);
        }
    }
    
    clearSelectionState() {
        if (!this.game) return;
        
        for (const entity of this.game.gameState.entities) {
            entity.isSelected = false;
        }
    }
    
    selectAllPlayerUnits() {
        if (!this.game) return;
        
        const playerUnits = this.game.gameState.entities.filter(
            entity => entity.isPlayerControlled && entity.type === 'unit'
        );
        
        this.selectUnits(playerUnits);
    }
    
    selectHero() {
        if (!this.game) return;
        
        const hero = this.game.gameState.entities.find(
            entity => entity.isPlayerControlled && entity.isHero
        );
        
        if (hero) {
            this.selectUnits([hero]);
        }
    }
    
    togglePause() {
        if (!this.game) return;
        
        if (this.game.gameState.isPaused) {
            this.game.resume();
        } else {
            this.game.pause();
        }
    }
    
    startSelectionBox() {
        this.isDragging = true;
        this.dragStart = { ...this.mousePos };
        this.selectionBox = null;
        
        // Add mouse up listener for ending selection
        const canvas = this.game?.engine.canvas;
        if (canvas) {
            const handleMouseUp = () => {
                this.endSelectionBox();
                canvas.removeEventListener('mouseup', handleMouseUp);
            };
            canvas.addEventListener('mouseup', handleMouseUp);
        }
    }
    
    endSelectionBox() {
        if (!this.isDragging || !this.selectionBox) {
            this.isDragging = false;
            this.dragStart = null;
            this.selectionBox = null;
            return;
        }
        
        // Find units in selection box
        const unitsInBox = this.getUnitsInSelectionBox();
        
        if (unitsInBox.length > 0) {
            this.selectUnits(unitsInBox);
        }
        
        this.isDragging = false;
        this.dragStart = null;
        this.selectionBox = null;
    }
    
    getUnitsInSelectionBox() {
        if (!this.game || !this.selectionBox) return [];
        
        const unitsInBox = [];
        
        for (const entity of this.game.gameState.entities) {
            if (!entity.isPlayerControlled || entity.type !== 'unit') continue;
            
            if (this.isEntityInSelectionBox(entity)) {
                unitsInBox.push(entity);
            }
        }
        
        return unitsInBox;
    }
    
    isEntityInSelectionBox(entity) {
        if (!this.selectionBox) return false;
        
        return entity.x >= this.selectionBox.x &&
               entity.x <= this.selectionBox.x + this.selectionBox.width &&
               entity.y >= this.selectionBox.y &&
               entity.y <= this.selectionBox.y + this.selectionBox.height;
    }
    
    update(deltaTime) {
        // Handle continuous key presses
        if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
            // Pan camera left
        }
        if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
            // Pan camera right
        }
        if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) {
            // Pan camera up
        }
        if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) {
            // Pan camera down
        }
    }
    
    render(ctx) {
        // Render selection box
        if (this.selectionBox) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(
                this.selectionBox.x,
                this.selectionBox.y,
                this.selectionBox.width,
                this.selectionBox.height
            );
            ctx.setLineDash([]);
        }
        
        // Render mouse cursor info (debug)
        if (this.game?.debugMode) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px monospace';
            ctx.fillText(
                `Mouse: (${Math.floor(this.mousePos.x)}, ${Math.floor(this.mousePos.y)})`,
                this.mousePos.x + 10,
                this.mousePos.y - 10
            );
        }
    }
}