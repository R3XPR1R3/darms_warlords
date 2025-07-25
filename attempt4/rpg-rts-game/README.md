🎮 RPG-RTS Game
Браузерная стратегия в реальном времени с элементами RPG, где каждый юнит ценен и уникален.
🌟 Особенности игры
🎯 Уникальная концепция

Ценность каждого юнита - нет массового производства, каждый воин важен
Система обучения - граждане могут изучать новые профессии
Спасение юнитов - находите и освобождайте пленников в мире
Размножение - расы могут скрещиваться, создавая потомство
Уникальные слоты экипировки - у каждой расы свои особенности

🏗️ Масштабируемая архитектура

Data-driven дизайн - весь контент в JSON файлах
Система модов - легко добавлять новый контент
Компонентная система - модульная архитектура
Система событий - гибкое взаимодействие между системами

🚀 Быстрый старт
Установка
bash# Клонируйте репозиторий
git clone https://github.com/your-username/rpg-rts-game.git
cd rpg-rts-game

# Запустите локальный сервер (Python)
python -m http.server 8000

# Или с Node.js
npx serve .

# Откройте в браузере
# http://localhost:8000
Первый запуск

Откройте index.html в браузере
Дождитесь загрузки игры
Пройдите обучающую кампанию
Наслаждайтесь игрой!

🎮 Управление
Основные команды

ЛКМ - Выбор юнита
ПКМ - Движение/Атака/Сбор ресурсов
Ctrl+ЛКМ - Добавить к выделению
Ctrl+A - Выбрать всех юнитов
H - Выбрать героя
ESC - Снять выделение
Space - Пауза/Продолжить

Консольные команды (для отладки)
javascript// Создать юнита
spawnUnit('warrior', 400, 300);

// Добавить ресурсы
addResources('gold', 1000);

// Сохранить игру
saveGame('my_save');

// Загрузить игру
loadGame('my_save');

// Статистика игры
gameStats();
📊 Игровые системы
🧬 Расы

Люди - сбалансированные, +3 ближний бой, +1 слот инвентаря
Эльфы - меткие стрелки, +4 дальний бой, +60 зрение
Орки - сильные воины, +6 ближний бой, +30 здоровье
Нежить - не нужна еда, может воскрешаться

⚔️ Классы юнитов

Гражданин - базовый класс, только сбор ресурсов
Рабочий - строительство и ремесло
Воин - ближний бой и защита
Лучник - дальний бой
Маг - магические способности

🏰 Здания

Ратуша - центр поселения, производство рабочих
Казармы - обучение воинов и лучников
Мастерская - изготовление предметов
Магическая башня - обучение магов

💎 Ресурсы

Золото 💰 - найм юнитов, исследования
Дерево 🌲 - строительство зданий
Камень 🗿 - укрепления и башни
Еда 🍖 - содержание армии
Мана ✨ - магические заклинания

🔧 Создание контента
Добавление новой расы
Создайте файл data/races/your_race.json:
json{
  "id": "dragon",
  "name": "Дракон",
  "description": "Могучие крылатые существа",
  "bonuses": {
    "flight": true,
    "fire_immunity": true,
    "health": 100
  },
  "equipment_slots": {
    "wings": true,
    "tail": true
  }
}
Добавление нового класса
Создайте файл data/classes/your_class.json:
json{
  "id": "dragon_rider",
  "name": "Наездник на драконе",
  "learning_requirements": {
    "time": 1200,
    "resources": {"gold": 500},
    "prerequisite_race": "human"
  },
  "abilities": ["fly", "dragon_breath"],
  "stat_bonuses": {
    "health": 50,
    "flight_speed": 5.0
  }
}
Создание мода

Создайте папку в mods/enabled/your_mod/
Добавьте mod.json:

json{
  "id": "your_mod",
  "name": "Ваш мод",
  "version": "1.0.0",
  "author": "Ваше имя",
  "content": {
    "races": ["dragon.json"],
    "classes": ["dragon_rider.json"]
  }
}

Добавьте файлы контента в соответствующие папки

🗂️ Структура проекта
rpg-rts-game/
├── index.html              # Главная страница
├── src/                    # Исходный код
│   ├── core/              # Движок игры
│   ├── systems/           # Игровые системы
│   ├── entities/          # Классы сущностей
│   ├── ui/               # Пользовательский интерфейс
│   └── graphics/         # Графическая подсистема
├── data/                  # Игровые данные (JSON)
│   ├── races/            # Расы
│   ├── classes/          # Классы юнитов
│   ├── heroes/           # Герои
│   ├── items/            # Предметы
│   ├── buildings/        # Здания
│   ├── factions/         # Фракции
│   └── campaigns/        # Кампании
├── mods/                 # Модификации
│   ├── enabled/          # Активные моды
│   └── disabled/         # Отключенные моды
├── saves/                # Сохранения
├── config/               # Настройки
└── tools/                # Инструменты разработки
🛠️ Разработка
Архитектура

Engine - основной движок игры
Entity - базовый класс для всех игровых объектов
Component System - модульная система компонентов
Event System - система событий для связи компонентов

Основные системы

MovementSystem - движение и pathfinding
CombatSystem - боевая система
AISystem - искусственный интеллект
InputSystem - обработка ввода
RenderSystem - отрисовка
UISystem - пользовательский интерфейс

Добавление новой системы
javascript// src/systems/YourSystem.js
export class YourSystem {
    constructor() {
        this.entities = [];
    }
    
    update(deltaTime, entities) {
        // Логика обновления
    }
    
    render(ctx) {
        // Логика отрисовки
    }
}

// Добавление в Game.js
import { YourSystem } from './systems/YourSystem.js';

// В конструкторе Game
this.systems.yourSystem = new YourSystem();

// В initializeSystems()
this.engine.addSystem('yourSystem', this.systems.yourSystem);
🎯 Планы развития
Версия 1.1

 Система строительства
 Исследования и технологии
 Дипломатия между фракциями
 Случайные события

Версия 1.2

 Мультиплеер
 Редактор карт
 Система достижений
 Улучшенная графика

Версия 2.0

 3D графика
 Сезоны и погода
 Торговля между игроками
 Расширенная магическая система

🤝 Вклад в проект
Как помочь

Создавайте моды и делитесь ими
Сообщайте об ошибках в Issues
Предлагайте новые функции
Улучшайте документацию
Создавайте обучающие материалы

Создание мода

Форкните репозиторий
Создайте ветку для вашего мода
Добавьте мод в mods/community/
Создайте Pull Request

Отчет об ошибке
Включите в отчет:

Версию браузера
Шаги для воспроизведения
Ожидаемое и фактическое поведение
Скриншоты (если применимо)

📜 Лицензия
MIT License - смотрите файл LICENSE для деталей.
🙏 Благодарности

Вдохновлено классическими RTS: Warcraft, Age of Empires
Концепция ценности юнитов из Dwarf Fortress
Система модификаций из Skyrim/Fallout

📞 Контакты

GitHub: your-username
Discord: Game Dev Server
Email: your.email@example.com


🎮 Создавайте, играйте, наслаждайтесь!

📖 Дополнительная документация
Руководство по созданию модов
API документация
Туториал по разработке
Часто задаваемые вопросы