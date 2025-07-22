// src/systems/ModLoader.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
import { Utils } from '../core/Utils.js'; // ✅ Добавили импорт

export class ModLoader {
    constructor() {
        this.enabledMods = [];
        this.loadedMods = new Map();
        this.modPath = './mods/enabled/';
    }
    
    async loadEnabledMods() {
        console.log('🔧 Loading enabled mods...');
        
        try {
            // Get list of enabled mods
            const enabledModsList = await this.getEnabledModsList();
            
            for (const modId of enabledModsList) {
                try {
                    await this.loadMod(modId);
                } catch (error) {
                    console.warn(`⚠️ Failed to load mod ${modId}:`, error);
                    // Не останавливаем загрузку других модов
                }
            }
            
            console.log(`✅ Loaded ${this.loadedMods.size} mods`);
            
        } catch (error) {
            console.warn('⚠️ No mods directory found or accessible:', error);
            // Это нормально - моды опциональны
        }
    }
    
    async getEnabledModsList() {
        // Пытаемся загрузить из localStorage
        const saved = Utils.loadFromLocalStorage('enabled_mods');
        if (saved && Array.isArray(saved)) {
            return saved;
        }
        
        // Если нет сохраненного списка, возвращаем пустой массив
        // В реальной реализации тут был бы скан папки mods/enabled/
        return []; // Убрали хардкод, чтобы избежать ошибок 404
    }
    
    async loadMod(modId) {
        const modPath = `${this.modPath}${modId}/mod.json`;
        
        try {
            const modData = await Utils.loadJSON(modPath);
            
            // Validate mod
            if (!this.validateMod(modData)) {
                throw new Error(`Invalid mod structure: ${modId}`);
            }
            
            // Load mod content
            await this.loadModContent(modId, modData);
            
            this.loadedMods.set(modId, modData);
            
            // Добавляем в список только если еще нет
            if (!this.enabledMods.includes(modId)) {
                this.enabledMods.push(modId);
            }
            
            console.log(`✅ Mod '${modData.name}' v${modData.version} loaded`);
            
        } catch (error) {
            console.error(`❌ Failed to load mod ${modId}:`, error);
            throw error;
        }
    }
    
    async loadModContent(modId, modData) {
        const modBasePath = `${this.modPath}${modId}/`;
        
        // Load races
        if (modData.content?.races) {
            modData.loadedRaces = {};
            for (const raceFile of modData.content.races) {
                try {
                    const race = await Utils.loadJSON(`${modBasePath}races/${raceFile}`);
                    modData.loadedRaces[race.id] = race;
                } catch (error) {
                    console.warn(`⚠️ Failed to load mod race ${raceFile}:`, error);
                }
            }
        }
        
        // Load classes
        if (modData.content?.classes) {
            modData.loadedClasses = {};
            for (const classFile of modData.content.classes) {
                try {
                    const unitClass = await Utils.loadJSON(`${modBasePath}classes/${classFile}`);
                    modData.loadedClasses[unitClass.id] = unitClass;
                } catch (error) {
                    console.warn(`⚠️ Failed to load mod class ${classFile}:`, error);
                }
            }
        }
        
        // Load heroes
        if (modData.content?.heroes) {
            modData.loadedHeroes = {};
            for (const heroFile of modData.content.heroes) {
                try {
                    const hero = await Utils.loadJSON(`${modBasePath}heroes/${heroFile}`);
                    modData.loadedHeroes[hero.id] = hero;
                } catch (error) {
                    console.warn(`⚠️ Failed to load mod hero ${heroFile}:`, error);
                }
            }
        }
        
        // Load factions
        if (modData.content?.factions) {
            modData.loadedFactions = {};
            for (const factionFile of modData.content.factions) {
                try {
                    const faction = await Utils.loadJSON(`${modBasePath}factions/${factionFile}`);
                    modData.loadedFactions[faction.id] = faction;
                } catch (error) {
                    console.warn(`⚠️ Failed to load mod faction ${factionFile}:`, error);
                }
            }
        }
        
        // Load items
        if (modData.content?.items) {
            modData.loadedItems = {};
            for (const itemFile of modData.content.items) {
                try {
                    const item = await Utils.loadJSON(`${modBasePath}items/${itemFile}`);
                    modData.loadedItems[item.id] = item;
                } catch (error) {
                    console.warn(`⚠️ Failed to load mod item ${itemFile}:`, error);
                }
            }
        }
        
        // Load abilities
        if (modData.content?.abilities) {
            modData.loadedAbilities = {};
            for (const abilityFile of modData.content.abilities) {
                try {
                    const ability = await Utils.loadJSON(`${modBasePath}abilities/${abilityFile}`);
                    modData.loadedAbilities[ability.id] = ability;
                } catch (error) {
                    console.warn(`⚠️ Failed to load mod ability ${abilityFile}:`, error);
                }
            }
        }
    }
    
    validateMod(modData) {
        const required = ['id', 'name', 'version', 'author'];
        const isValid = required.every(field => modData[field]);
        
        if (!isValid) {
            console.error('Mod validation failed. Required fields:', required);
            console.error('Mod data:', modData);
        }
        
        return isValid;
    }
    
    applyMods(baseData) {
        if (this.loadedMods.size === 0) {
            console.log('🔧 No mods to apply');
            return baseData;
        }
        
        console.log('🔧 Applying mods to game data...');
        
        // Deep clone базовых данных
        const modifiedData = JSON.parse(JSON.stringify(baseData));
        
        // Убеждаемся, что все категории существуют
        modifiedData.races = modifiedData.races || {};
        modifiedData.classes = modifiedData.classes || {};
        modifiedData.heroes = modifiedData.heroes || {};
        modifiedData.factions = modifiedData.factions || {};
        modifiedData.items = modifiedData.items || {};
        modifiedData.abilities = modifiedData.abilities || {};
        
        for (const [modId, modData] of this.loadedMods) {
            let appliedCount = 0;
            
            // Apply races
            if (modData.loadedRaces) {
                Object.assign(modifiedData.races, modData.loadedRaces);
                appliedCount += Object.keys(modData.loadedRaces).length;
            }
            
            // Apply classes
            if (modData.loadedClasses) {
                Object.assign(modifiedData.classes, modData.loadedClasses);
                appliedCount += Object.keys(modData.loadedClasses).length;
            }
            
            // Apply heroes
            if (modData.loadedHeroes) {
                Object.assign(modifiedData.heroes, modData.loadedHeroes);
                appliedCount += Object.keys(modData.loadedHeroes).length;
            }
            
            // Apply factions
            if (modData.loadedFactions) {
                Object.assign(modifiedData.factions, modData.loadedFactions);
                appliedCount += Object.keys(modData.loadedFactions).length;
            }
            
            // Apply items
            if (modData.loadedItems) {
                modifiedData.items = modifiedData.items || {};
                Object.assign(modifiedData.items, modData.loadedItems);
                appliedCount += Object.keys(modData.loadedItems).length;
            }
            
            // Apply abilities
            if (modData.loadedAbilities) {
                Object.assign(modifiedData.abilities, modData.loadedAbilities);
                appliedCount += Object.keys(modData.loadedAbilities).length;
            }
            
            console.log(`🔧 Applied mod: ${modData.name} (${appliedCount} items)`);
        }
        
        return modifiedData;
    }
    
    isModEnabled(modId) {
        return this.enabledMods.includes(modId);
    }
    
    getLoadedMods() {
        return Array.from(this.loadedMods.values());
    }
    
    enableMod(modId) {
        if (!this.isModEnabled(modId)) {
            this.enabledMods.push(modId);
            this.saveEnabledModsList();
            console.log(`🔧 Mod ${modId} enabled`);
        }
    }
    
    disableMod(modId) {
        const index = this.enabledMods.indexOf(modId);
        if (index > -1) {
            this.enabledMods.splice(index, 1);
            this.loadedMods.delete(modId);
            this.saveEnabledModsList();
            console.log(`🔧 Mod ${modId} disabled`);
        }
    }
    
    saveEnabledModsList() {
        Utils.saveToLocalStorage('enabled_mods', this.enabledMods);
    }
    
    loadEnabledModsList() {
        const saved = Utils.loadFromLocalStorage('enabled_mods');
        if (saved && Array.isArray(saved)) {
            this.enabledMods = saved;
        }
    }
    
    // ===== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ =====
    
    // Получить информацию о всех модах
    getModsInfo() {
        return {
            total: this.loadedMods.size,
            enabled: this.enabledMods.length,
            mods: Array.from(this.loadedMods.values()).map(mod => ({
                id: mod.id,
                name: mod.name,
                version: mod.version,
                author: mod.author,
                description: mod.description
            }))
        };
    }
    
    // Проверить совместимость мода
    checkCompatibility(modData) {
        if (!modData.compatibility) return true;
        
        // Проверяем версию игры
        if (modData.compatibility.game_version) {
            // Здесь должна быть проверка версии игры
            // Пока что возвращаем true
        }
        
        // Проверяем конфликты с другими модами
        if (modData.compatibility.conflicts) {
            for (const conflictMod of modData.compatibility.conflicts) {
                if (this.isModEnabled(conflictMod)) {
                    console.warn(`⚠️ Mod ${modData.id} conflicts with ${conflictMod}`);
                    return false;
                }
            }
        }
        
        return true;
    }
    
    // Очистить все моды (для перезагрузки)
    clearMods() {
        this.loadedMods.clear();
        this.enabledMods = [];
        console.log('🧹 All mods cleared');
    }
}

console.log('🔧 Fixed ModLoader loaded!');