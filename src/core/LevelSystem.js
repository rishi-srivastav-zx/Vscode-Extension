const vscode = require("vscode");

class LevelSystem {
    constructor(storage) {
        this.storage = storage;
    }

    // Extended titles up to level 30
    static TITLES = [
        "Initiate", // 1
        "Junior Dev", // 2
        "Coder", // 3
        "Developer", // 4
        "Engineer", // 5
        "Senior Dev", // 6
        "Architect", // 7
        "Lead Dev", // 8
        "Principal", // 9
        "Master", // 10
        "Grandmaster", // 11
        "Legend", // 12
        "Mythic", // 13
        "Transcendent", // 14
        "Omniscient", // 15
        "Void Walker", // 16
        "Code Weaver", // 17
        "System Lord", // 18
        "Digital God", // 19
        "The Architect", // 20
        "Quantum Coder", // 21
        "Neural Architect", // 22
        "Cybernetic Sage", // 23
        "Data Demigod", // 24
        "Algorithmic Deity", // 25
        "Singularity", // 26
        "Omnipresent Dev", // 27
        "Eternal Coder", // 28
        "Cosmic Programmer", // 29
        "The One", // 30
    ];

    // Level unlocks with rewards and permanent boosts
    static LEVEL_UNLOCKS = {
        2: {
            type: "title",
            reward: "Code Novice",
            boost: 1.05,
            description: "5% permanent XP boost",
        },
        3: {
            type: "mystery_box",
            reward: "bronze",
            count: 1,
            boost: 1.05,
            description: "Bronze Mystery Box",
        },
        4: {
            type: "ability",
            reward: "Quick Save",
            boost: 1.05,
            description: "Faster save XP cooldown",
        },
        5: {
            type: "theme",
            reward: "Neon Glow",
            boost: 1.1,
            description: "Neon theme + 10% XP boost",
        },
        6: {
            type: "mystery_box",
            reward: "bronze",
            count: 2,
            boost: 1.1,
            description: "2x Bronze Mystery Boxes",
        },
        7: {
            type: "mystery_box",
            reward: "silver",
            count: 1,
            boost: 1.1,
            description: "Silver Mystery Box",
        },
        8: {
            type: "ability",
            reward: "Error Sense",
            boost: 1.1,
            description: "Bonus XP for fixing errors",
        },
        9: {
            type: "title",
            reward: "Bug Hunter",
            boost: 1.1,
            description: "Bug Hunter title",
        },
        10: {
            type: "theme",
            reward: "Cyberpunk",
            boost: 1.15,
            description: "Cyberpunk theme + 15% XP boost",
        },
        11: {
            type: "mystery_box",
            reward: "silver",
            count: 2,
            boost: 1.15,
            description: "2x Silver Mystery Boxes",
        },
        12: {
            type: "ability",
            reward: "XP Potion",
            boost: 1.2,
            description: "30-min 2x XP boost potion",
        },
        13: {
            type: "title",
            reward: "Speed Coder",
            boost: 1.2,
            description: "Speed Coder title",
        },
        14: {
            type: "mystery_box",
            reward: "gold",
            count: 1,
            boost: 1.2,
            description: "Gold Mystery Box",
        },
        15: {
            type: "theme",
            reward: "Matrix",
            boost: 1.25,
            description: "Matrix theme + 25% XP boost",
        },
        16: {
            type: "ability",
            reward: "Time Warp",
            boost: 1.25,
            description: "Reduced fatigue penalties",
        },
        17: {
            type: "mystery_box",
            reward: "gold",
            count: 2,
            boost: 1.25,
            description: "2x Gold Mystery Boxes",
        },
        18: {
            type: "title",
            reward: "Code Sage",
            boost: 1.25,
            description: "Code Sage title",
        },
        19: {
            type: "ability",
            reward: "Combo Master",
            boost: 1.3,
            description: "Longer combo windows",
        },
        20: {
            type: "theme",
            reward: "Divine",
            boost: 1.35,
            description: "Divine theme + 35% XP boost",
        },
        21: {
            type: "legendary",
            reward: "Quantum Core",
            boost: 1.4,
            description: "Quantum Core aura",
        },
        22: {
            type: "mystery_box",
            reward: "gold",
            count: 3,
            boost: 1.4,
            description: "3x Gold Mystery Boxes",
        },
        23: {
            type: "title",
            reward: "Neural Link",
            boost: 1.45,
            description: "Neural Link title",
        },
        24: {
            type: "ability",
            reward: "Omniscience",
            boost: 1.5,
            description: "See all XP sources",
        },
        25: {
            type: "legendary",
            reward: "Singularity",
            boost: 1.75,
            description: "Singularity form + 75% boost",
        },
        26: {
            type: "mystery_box",
            reward: "gold",
            count: 5,
            boost: 1.75,
            description: "5x Gold Mystery Boxes",
        },
        27: {
            type: "title",
            reward: "Eternal",
            boost: 1.8,
            description: "Eternal title",
        },
        28: {
            type: "ability",
            reward: "Time Lord",
            boost: 1.85,
            description: "No fatigue penalties",
        },
        29: {
            type: "mystery_box",
            reward: "gold",
            count: 10,
            boost: 1.9,
            description: "10x Gold Mystery Boxes",
        },
        30: {
            type: "legendary",
            reward: "The One",
            boost: 2.0,
            description: "MAXIMUM POWER - 2x XP",
        },
    };

    // Color progression with gradients for higher levels
    static COLORS = [
        "#808080", // 1 - Gray
        "#4A90E2", // 2 - Blue
        "#50C878", // 3 - Green
        "#FFD700", // 4 - Gold
        "#FF6B35", // 5 - Orange
        "#E94B3C", // 6 - Red
        "#9B59B6", // 7 - Purple
        "#00CED1", // 8 - Cyan
        "#FF1493", // 9 - Deep Pink
        "#00FF7F", // 10 - Spring Green
        "#1ABC9C", // 11 - Turquoise
        "#F39C12", // 12 - Orange
        "#8E44AD", // 13 - Dark Purple
        "#E74C3C", // 14 - Alizarin
        "#3498DB", // 15 - Peter River
        "#2ECC71", // 16 - Emerald
        "#F1C40F", // 17 - Sunflower
        "#E67E22", // 18 - Carrot
        "#ECF0F1", // 19 - Silver
        "#FFFFFF", // 20 - White
        "#00FF00", // 21 - Matrix Green
        "#FF00FF", // 22 - Magenta
        "#00FFFF", // 23 - Cyan
        "#FFFF00", // 24 - Yellow
        "#FF0000", // 25 - Pure Red
        "#9400D3", // 26 - Dark Violet
        "#FF69B4", // 27 - Hot Pink
        "#32CD32", // 28 - Lime Green
        "#FFD700", // 29 - Gold
        "#FFFFFF", // 30 - Radiant White
    ];

    getLevelData(level) {
        const title = LevelSystem.TITLES[level - 1] || `Level ${level} Cosmic`;
        const nextTitle = LevelSystem.TITLES[level] || `Level ${level + 1}`;

        return {
            level,
            title: title,
            nextTitle: nextTitle,
            color: this.getLevelColor(level),
            gradient: this.getLevelGradient(level),
            unlock: this.getLevelUnlock(level),
            nextUnlock: this.getNextUnlock(level),
            boost: this.calculateBoost(level),
            isMaxLevel: level >= 30,
        };
    }

    getLevelColor(level) {
        if (level <= LevelSystem.COLORS.length) {
            return LevelSystem.COLORS[level - 1];
        }
        // For levels beyond 30, cycle through with brightness increase
        const baseColor =
            LevelSystem.COLORS[(level - 1) % LevelSystem.COLORS.length];
        return this.lightenColor(baseColor, Math.floor((level - 30) / 5) * 10);
    }

    getLevelGradient(level) {
        const color1 = this.getLevelColor(level);
        const color2 = this.getLevelColor(level + 1);
        return `linear-gradient(135deg, ${color1}, ${color2})`;
    }

    getLevelUnlock(level) {
        return LevelSystem.LEVEL_UNLOCKS[level] || null;
    }

    getNextUnlock(currentLevel) {
        const levels = Object.keys(LevelSystem.LEVEL_UNLOCKS)
            .map(Number)
            .filter((l) => l > currentLevel)
            .sort((a, b) => a - b);

        if (levels.length === 0) return null;

        const nextLevel = levels[0];
        return {
            level: nextLevel,
            ...LevelSystem.LEVEL_UNLOCKS[nextLevel],
        };
    }

    calculateBoost(level) {
        let totalBoost = 1.0;
        for (let i = 2; i <= level; i++) {
            const unlock = LevelSystem.LEVEL_UNLOCKS[i];
            if (unlock && unlock.boost) {
                totalBoost = unlock.boost; // Use highest unlocked boost
            }
        }
        return totalBoost;
    }

    getAllUnlocks(level) {
        const unlocks = [];
        for (let i = 2; i <= level; i++) {
            if (LevelSystem.LEVEL_UNLOCKS[i]) {
                unlocks.push({
                    level: i,
                    ...LevelSystem.LEVEL_UNLOCKS[i],
                });
            }
        }
        return unlocks;
    }

    checkLevelUp(oldLevel, newLevel) {
        if (newLevel > oldLevel) {
            const unlocks = [];
            for (let i = oldLevel + 1; i <= newLevel; i++) {
                if (LevelSystem.LEVEL_UNLOCKS[i]) {
                    unlocks.push({
                        level: i,
                        ...LevelSystem.LEVEL_UNLOCKS[i],
                    });
                }
            }

            return {
                leveledUp: true,
                oldLevel,
                newLevel,
                levelsGained: newLevel - oldLevel,
                data: this.getLevelData(newLevel),
                unlocks: unlocks,
                isMilestone: this.isMilestone(newLevel),
            };
        }
        return { leveledUp: false };
    }

    isMilestone(level) {
        return level % 5 === 0 || level === 1;
    }

    lightenColor(hex, percent) {
        const num = parseInt(hex.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = ((num >> 8) & 0x00ff) + amt;
        const B = (num & 0x0000ff) + amt;
        return (
            "#" +
            (
                0x1000000 +
                (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
                (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
                (B < 255 ? (B < 1 ? 0 : B) : 255)
            )
                .toString(16)
                .slice(1)
        );
    }

    // Get rarity color for unlock types
    getUnlockRarity(type) {
        const rarities = {
            title: "#9E9E9E", // Gray
            mystery_box: "#CD7F32", // Bronze
            ability: "#4A90E2", // Blue
            theme: "#9B59B6", // Purple
            legendary: "#FFD700", // Gold
        };
        return rarities[type] || "#FFFFFF";
    }

    // Format boost for display
    formatBoost(boost) {
        return `+${Math.round((boost - 1) * 100)}%`;
    }
}

module.exports = LevelSystem;
