// src/core/Utils.js - Утилиты
export const Utils = {
    // Math utilities
    distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },
    
    angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    },
    
    lerp(a, b, t) {
        return a + (b - a) * t;
    },
    
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },
    
    // Random utilities
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    },
    
    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    },
    
    // Array utilities
    removeFromArray(array, item) {
        const index = array.indexOf(item);
        if (index > -1) {
            array.splice(index, 1);
        }
        return array;
    },
    
    // Color utilities
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },
    
    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },
    
    // DOM utilities
    getMousePos(canvas, e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    },
    
    // File utilities
    async loadJSON(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Failed to load JSON from ${url}:`, error);
            throw error;
        }
    },
    
    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            return false;
        }
    },
    
    loadFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            return null;
        }
    },
    
    // Grid utilities (for RTS)
    worldToGrid(x, y, tileSize) {
        return {
            col: Math.floor(x / tileSize),
            row: Math.floor(y / tileSize)
        };
    },
    
    gridToWorld(col, row, tileSize) {
        return {
            x: (col + 0.5) * tileSize,
            y: (row + 0.5) * tileSize
        };
    },
    
    isValidGridPosition(col, row, gridWidth, gridHeight) {
        return col >= 0 && col < gridWidth && row >= 0 && row < gridHeight;
    }
};
