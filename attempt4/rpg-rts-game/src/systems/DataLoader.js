// src/systems/DataLoader.js - Загрузчик игровых данных
import { Utils } from '../core/Utils.js';

export class DataLoader {
    constructor() {
        this.loadedData = {};
        this.baseDataPath = './data/';
    }
    
    async loadAll() {
        console.log('📊 Loading all game data...');
        
        try {
            const data = {
                races: await this.loadRaces(),
                classes: await this.loadClasses(), 
                heroes: await this.loadHeroes(),
                items: await this.loadItems(),
                buildings: await this.loadBuildings(),
                abilities: await this.loadAbilities(),
                factions: await this.loadFactions(),
                maps: await this.loadMaps(),
                campaigns: await this.loadCampaigns()
            };
            
            this.loadedData = data;
            console.log('✅ All game data loaded successfully');
            return data;
            
        } catch (error) {
            console.error('❌ Failed to load game data:', error);
            throw error;
        }
    }
    
    async loadRaces() {
        const races = {};
        const raceFiles = ['human.json', 'elf.json', 'orc.json', 'undead.json'];
        
        for (const file of raceFiles) {
            try {
                const race = await Utils.loadJSON(`${this.baseDataPath}races/${file}`);
                races[race.id] = race;
            } catch (error) {
                console.warn(`⚠️ Failed to load race file ${file}:`, error);
            }
        }
        
        return races;
    }
    
    async loadClasses() {
        const classes = {};
        const classFiles = [
            'citizen.json', 'worker.json', 'warrior.json', 
            'archer.json', 'mage.json', 'engineer.json'
        ];
        
        for (const file of classFiles) {
            try {
                const unitClass = await Utils.loadJSON(`${this.baseDataPath}classes/${file}`);
                classes[unitClass.id] = unitClass;
            } catch (error) {
                console.warn(`⚠️ Failed to load class file ${file}:`, error);
            }
        }
        
        return classes;
    }
    
    async loadHeroes() {
        const heroes = {};
        const heroFiles = ['adrian.json', 'merlin.json'];
        
        for (const file of heroFiles) {
            try {
                const hero = await Utils.loadJSON(`${this.baseDataPath}heroes/${file}`);
                heroes[hero.id] = hero;
            } catch (error) {
                console.warn(`⚠️ Failed to load hero file ${file}:`, error);
            }
        }
        
        return heroes;
    }
    
    async loadItems() {
        const items = {
            weapons: {},
            armor: {},
            consumables: {}
        };
        
        // Load weapons
        const weaponFiles = ['sword.json', 'bow.json', 'staff.json'];
        for (const file of weaponFiles) {
            try {
                const weapon = await Utils.loadJSON(`${this.baseDataPath}items/weapons/${file}`);
                items.weapons[weapon.id] = weapon;
            } catch (error) {
                console.warn(`⚠️ Failed to load weapon ${file}:`, error);
            }
        }
        
        // Load armor
        const armorFiles = ['leather_armor.json', 'chainmail.json'];
        for (const file of armorFiles) {
            try {
                const armor = await Utils.loadJSON(`${this.baseDataPath}items/armor/${file}`);
                items.armor[armor.id] = armor;
            } catch (error) {
                console.warn(`⚠️ Failed to load armor ${file}:`, error);
            }
        }
        
        // Load consumables
        const consumableFiles = ['apple.json', 'mana_potion.json'];
        for (const file of consumableFiles) {
            try {
                const consumable = await Utils.loadJSON(`${this.baseDataPath}items/consumables/${file}`);
                items.consumables[consumable.id] = consumable;
            } catch (error) {
                console.warn(`⚠️ Failed to load consumable ${file}:`, error);
            }
        }
        
        return items;
    }
    
    async loadBuildings() {
        const buildings = {};
        const buildingFiles = [
            'town_hall.json', 'barracks.json', 'workshop.json', 'mage_tower.json'
        ];
        
        for (const file of buildingFiles) {
            try {
                const building = await Utils.loadJSON(`${this.baseDataPath}buildings/${file}`);
                buildings[building.id] = building;
            } catch (error) {
                console.warn(`⚠️ Failed to load building ${file}:`, error);
            }
        }
        
        return buildings;
    }
    
    async loadAbilities() {
        const abilities = {};
        const abilityFiles = ['slash.json', 'fireball.json', 'heal.json'];
        
        for (const file of abilityFiles) {
            try {
                const ability = await Utils.loadJSON(`${this.baseDataPath}abilities/${file}`);
                abilities[ability.id] = ability;
            } catch (error) {
                console.warn(`⚠️ Failed to load ability ${file}:`, error);
            }
        }
        
        return abilities;
    }
    
    async loadFactions() {
        const factions = {};
        const factionFiles = [
            'middle_earth.json', 'orcish_horde.json', 'undead_legion.json'
        ];
        
        for (const file of factionFiles) {
            try {
                const faction = await Utils.loadJSON(`${this.baseDataPath}factions/${file}`);
                factions[faction.id] = faction;
            } catch (error) {
                console.warn(`⚠️ Failed to load faction ${file}:`, error);
            }
        }
        
        return factions;
    }
    
    async loadMaps() {
        const maps = {
            tutorial: {},
            skirmish: {},
            campaign: {}
        };
        
        // Load tutorial maps
        try {
            const tutorialMaps = ['map_1.json', 'map_2.json'];
            for (const file of tutorialMaps) {
                const map = await Utils.loadJSON(`${this.baseDataPath}maps/tutorial/${file}`);
                maps.tutorial[map.id] = map;
            }
        } catch (error) {
            console.warn('⚠️ Failed to load tutorial maps:', error);
        }
        
        // Load skirmish maps
        try {
            const skirmishMaps = ['small_valley.json', 'forest_clearing.json'];
            for (const file of skirmishMaps) {
                const map = await Utils.loadJSON(`${this.baseDataPath}maps/skirmish/${file}`);
                maps.skirmish[map.id] = map;
            }
        } catch (error) {
            console.warn('⚠️ Failed to load skirmish maps:', error);
        }
        
        return maps;
    }
    
    async loadCampaigns() {
        const campaigns = {};
        const campaignFiles = ['tutorial_campaign.json', 'main_campaign.json'];
        
        for (const file of campaignFiles) {
            try {
                const campaign = await Utils.loadJSON(`${this.baseDataPath}campaigns/${file}`);
                campaigns[campaign.id] = campaign;
            } catch (error) {
                console.warn(`⚠️ Failed to load campaign ${file}:`, error);
            }
        }
        
        return campaigns;
    }
    
    // Fallback data if files can't be loaded
    getFallbackData() {
        return {
            races: {
                human: {
                    id: 'human',
                    name: 'Human',
                    bonuses: { melee_attack: 2, inventory_slots: 1 },
                    base_stats: { health: 80, speed: 2.0, vision: 120 }
                }
            },
            classes: {
                citizen: {
                    id: 'citizen',
                    name: 'Citizen',
                    abilities: ['gather'],
                    stat_bonuses: {}
                },
                warrior: {
                    id: 'warrior',
                    name: 'Warrior', 
                    abilities: ['gather', 'fight_melee'],
                    stat_bonuses: { melee_attack: 5, health: 20 }
                }
            },
            factions: {
                middle_earth: {
                    id: 'middle_earth',
                    name: 'Middle Earth',
                    color: '#0066cc'
                }
            }
        };
    }
}