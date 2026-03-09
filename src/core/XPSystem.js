const vscode = require("vscode");

class XPSystem {
    constructor(storage) {
        this.storage = storage;
        this.cooldowns = new Map();
        this.sessionStartTime = Date.now();
        this.lastActionTime = Date.now();
        this.comboCount = 0;
        this.comboTimer = null;
        this.dailyCaps = new Map(); // Track daily caps per source
    }

    // XP required for each level
    static LEVEL_THRESHOLDS = [
        0, 300, 700, 1200, 2000, 3200, 5000, 7500, 11000, 15000, 21000, 28000,
        36000, 45000, 55000, 70000, 90000, 115000, 145000, 180000, 220000,
        265000, 315000, 370000, 430000, 500000, 580000, 670000, 770000, 880000,
        1000000,
    ];

    // Level unlocks - rewards that unlock at specific levels
    static LEVEL_UNLOCKS = {
        2: { type: "title", reward: "Code Novice", boost: 1.05 },
        3: { type: "mystery_box", reward: "bronze", boost: 1.05 },
        5: { type: "theme", reward: "Neon Glow", boost: 1.1 },
        7: { type: "mystery_box", reward: "silver", boost: 1.1 },
        10: { type: "title", reward: "Code Warrior", boost: 1.15 },
        12: { type: "ability", reward: "XP Boost Potion", boost: 1.2 },
        15: { type: "mystery_box", reward: "gold", boost: 1.2 },
        20: { type: "title", reward: "Code Master", boost: 1.25 },
        25: { type: "theme", reward: "Matrix Mode", boost: 1.3 },
        30: { type: "legendary", reward: "Creator Status", boost: 1.5 },
    };

    // Daily caps per source to prevent grinding
    static DAILY_CAPS = {
        file_save: 500,
        file_create: 300,
        error_fix: 800,
        paste: 200,
        commit: 1000,
        typing: 100, // Small cap for typing if tracked
    };

    getCurrentXP() {
        return this.storage.get("xp") || 0;
    }

    getTotalXP() {
        return this.storage.get("totalXp") || 0;
    }

    getXPForLevel(level) {
        if (level <= 1) return 0;
        if (level > XPSystem.LEVEL_THRESHOLDS.length) {
            const last =
                XPSystem.LEVEL_THRESHOLDS[XPSystem.LEVEL_THRESHOLDS.length - 1];
            return (
                last +
                Math.pow(level - XPSystem.LEVEL_THRESHOLDS.length, 2) * 100000
            );
        }
        return XPSystem.LEVEL_THRESHOLDS[level - 1];
    }

    getCurrentLevel() {
        const total = this.getTotalXP();
        let level = 1;
        for (let i = 2; i <= 1000; i++) {
            if (total >= this.getXPForLevel(i)) {
                level = i;
            } else {
                break;
            }
        }
        return level;
    }

    getProgress() {
        const currentLevel = this.getCurrentLevel();
        const currentXP = this.getTotalXP();
        const levelStart = this.getXPForLevel(currentLevel);
        const levelEnd = this.getXPForLevel(currentLevel + 1);
        const progress = currentXP - levelStart;
        const required = levelEnd - levelStart;
        return {
            level: currentLevel,
            xp: currentXP,
            levelStart,
            levelEnd,
            progress,
            required,
            percentage: Math.min((progress / required) * 100, 100),
            nextUnlock: this.getNextUnlock(currentLevel),
        };
    }

    getNextUnlock(currentLevel) {
        const unlocks = Object.keys(XPSystem.LEVEL_UNLOCKS)
            .map(Number)
            .filter((l) => l > currentLevel)
            .sort((a, b) => a - b);

        if (unlocks.length === 0) return null;
        const nextLevel = unlocks[0];
        return {
            level: nextLevel,
            ...XPSystem.LEVEL_UNLOCKS[nextLevel],
        };
    }

    getUnlockedRewards(level) {
        const rewards = [];
        for (const [lvl, reward] of Object.entries(XPSystem.LEVEL_UNLOCKS)) {
            if (parseInt(lvl) <= level) {
                rewards.push({ level: parseInt(lvl), ...reward });
            }
        }
        return rewards;
    }

    getActiveBoosts() {
        const level = this.getCurrentLevel();
        const boosts = [];

        // Permanent level boost
        for (const [lvl, data] of Object.entries(XPSystem.LEVEL_UNLOCKS)) {
            if (parseInt(lvl) <= level && data.boost) {
                boosts.push({
                    type: "level",
                    multiplier: data.boost,
                    source: `Level ${lvl}`,
                });
            }
        }

        // Temporary boost from mystery boxes
        const tempBoost = this.storage.get("tempBoost");
        if (tempBoost && tempBoost.expires > Date.now()) {
            boosts.push({
                type: "temporary",
                multiplier: tempBoost.multiplier,
                source: tempBoost.source,
                expires: tempBoost.expires,
            });
        } else if (tempBoost) {
            this.storage.set("tempBoost", null); // Clean up expired
        }

        // Streak boost
        const streakData = this.storage.get("streakBoost");
        if (
            streakData &&
            streakData.active &&
            streakData.expires > Date.now()
        ) {
            boosts.push({
                type: "streak",
                multiplier: streakData.multiplier,
                source: `${streakData.count} Combo!`,
            });
        }

        return boosts;
    }

    calculateTotalMultiplier() {
        const boosts = this.getActiveBoosts();
        let multiplier = 1;
        boosts.forEach((b) => (multiplier *= b.multiplier));
        return Math.min(multiplier, 5.0); // Cap at 5x to prevent insanity
    }

    // COMBO SYSTEM
    updateCombo(source) {
        const now = Date.now();
        const timeDiff = now - this.lastActionTime;

        // Combo breaks after 8 seconds of inactivity
        if (timeDiff > 8000) {
            this.comboCount = 0;
            this.storage.set("currentCombo", 0);
        }

        // Only certain actions build combo
        const comboActions = [
            "file_save",
            "error_fix",
            "commit",
            "file_create",
        ];
        if (comboActions.includes(source)) {
            this.comboCount++;
            this.lastActionTime = now;

            // Save combo to storage for persistence
            this.storage.set("currentCombo", this.comboCount);
            this.storage.set("lastComboTime", now);

            // Check for combo milestones
            if (this.comboCount % 5 === 0) {
                this.activateStreakBoost(this.comboCount);
            }

            return this.comboCount;
        }

        return 0;
    }

    activateStreakBoost(comboCount) {
        // Streak boost lasts 30 seconds and scales with combo
        const multiplier = 1 + Math.floor(comboCount / 5) * 0.1;
        const boostData = {
            active: true,
            count: comboCount,
            multiplier: Math.min(multiplier, 2.0), // Max 2x from streak
            expires: Date.now() + 30000,
        };
        this.storage.set("streakBoost", boostData);

        // Notify user
        vscode.window.showInformationMessage(
            `🔥 ${comboCount}x COMBO! +${Math.round((multiplier - 1) * 100)}% XP Boost for 30s!`,
        );
    }

    // MYSTERY BOX SYSTEM
    async openMysteryBox(type = "bronze") {
        const boxes = this.storage.get("mysteryBoxes") || {};
        if (!boxes[type] || boxes[type] <= 0) {
            return { success: false, message: "No boxes available" };
        }

        // Deduct box
        boxes[type]--;
        this.storage.set("mysteryBoxes", boxes);

        // Determine reward
        const rewards = this.generateMysteryRewards(type);
        const reward = this.selectRandomReward(rewards);

        // Apply reward
        await this.applyMysteryReward(reward);

        return { success: true, reward };
    }

    generateMysteryRewards(type) {
        const rewardPools = {
            bronze: [
                { type: "xp", amount: [50, 150], weight: 40 },
                { type: "xp", amount: [150, 300], weight: 30 },
                {
                    type: "boost",
                    multiplier: 1.2,
                    duration: 300000,
                    weight: 20,
                }, // 5 min
                { type: "box", boxType: "bronze", count: 1, weight: 10 },
            ],
            silver: [
                { type: "xp", amount: [200, 500], weight: 35 },
                { type: "xp", amount: [500, 1000], weight: 25 },
                {
                    type: "boost",
                    multiplier: 1.5,
                    duration: 600000,
                    weight: 25,
                }, // 10 min
                { type: "box", boxType: "silver", count: 1, weight: 10 },
                { type: "title", name: "Lucky Coder", weight: 5 },
            ],
            gold: [
                { type: "xp", amount: [1000, 2500], weight: 30 },
                { type: "xp", amount: [2500, 5000], weight: 20 },
                {
                    type: "boost",
                    multiplier: 2.0,
                    duration: 1800000,
                    weight: 30,
                }, // 30 min
                { type: "box", boxType: "gold", count: 1, weight: 10 },
                { type: "title", name: "Legend", weight: 10 },
            ],
        };
        return rewardPools[type] || rewardPools.bronze;
    }

    selectRandomReward(rewards) {
        const totalWeight = rewards.reduce((sum, r) => sum + r.weight, 0);
        let random = Math.random() * totalWeight;

        for (const reward of rewards) {
            random -= reward.weight;
            if (random <= 0) return reward;
        }
        return rewards[0];
    }

    async applyMysteryReward(reward) {
        switch (reward.type) {
            case "xp":
                const amount = Math.floor(
                    Math.random() * (reward.amount[1] - reward.amount[0]) +
                        reward.amount[0],
                );
                await this.addXP(amount, "mystery_box", { reward: "xp" });
                vscode.window.showInformationMessage(
                    `🎁 Mystery Box: +${amount} XP!`,
                );
                break;

            case "boost":
                this.storage.set("tempBoost", {
                    multiplier: reward.multiplier,
                    source: "Mystery Box",
                    expires: Date.now() + reward.duration,
                });
                const mins = Math.floor(reward.duration / 60000);
                vscode.window.showInformationMessage(
                    `🎁 Mystery Box: ${reward.multiplier}x XP Boost for ${mins}m!`,
                );
                break;

            case "box":
                const boxes = this.storage.get("mysteryBoxes") || {};
                boxes[reward.boxType] =
                    (boxes[reward.boxType] || 0) + reward.count;
                this.storage.set("mysteryBoxes", boxes);
                vscode.window.showInformationMessage(
                    `🎁 Mystery Box: +1 ${reward.boxType.toUpperCase()} Box!`,
                );
                break;

            case "title":
                vscode.window.showInformationMessage(
                    `🎁 Mystery Box: Unlocked title "${reward.name}"!`,
                );
                break;
        }
    }

    // ANTI-EXPLOIT: Check daily caps
    checkDailyCap(source) {
        const today = new Date().toISOString().split("T")[0];
        const key = `${today}:${source}`;
        const current = this.dailyCaps.get(key) || 0;
        const cap = XPSystem.DAILY_CAPS[source] || 1000;

        if (current >= cap) {
            return { allowed: false, remaining: 0 };
        }

        this.dailyCaps.set(key, current + 1);
        return { allowed: true, remaining: cap - current - 1 };
    }

    // ANTI-EXPLOIT: Session validation
    validateSession() {
        const sessionDuration = Date.now() - this.sessionStartTime;
        const actionsInSession = this.storage.get("sessionActions") || 0;

        // If more than 1000 actions in 1 hour, likely botting
        if (sessionDuration < 3600000 && actionsInSession > 1000) {
            return { valid: false, reason: "suspicious_activity" };
        }

        // Update session actions
        this.storage.set("sessionActions", actionsInSession + 1);
        return { valid: true };
    }

    async addXP(amount, source, metadata = {}) {
        // ANTI-EXPLOIT: Validate session
        const sessionCheck = this.validateSession();
        if (!sessionCheck.valid) {
            console.log("XPSystem: Suspicious activity detected, XP blocked");
            return { added: 0, total: this.getTotalXP(), blocked: true };
        }

        // ANTI-EXPLOIT: Check daily cap
        const capCheck = this.checkDailyCap(source);
        if (!capCheck.allowed) {
            console.log(`XPSystem: Daily cap reached for ${source}`);
            return { added: 0, total: this.getTotalXP(), capped: true };
        }

        // ANTI-EXPLOIT: Cooldown check with diminishing returns
        const cooldownKey = `${source}:${metadata.file || metadata.project || "global"}`;
        const lastAction = this.cooldowns.get(cooldownKey);
        const now = Date.now();

        let finalAmount = amount;
        let fatigueApplied = false;

        if (lastAction) {
            const timeSince = now - lastAction;
            if (timeSince < 5000) {
                // 5 seconds - spam protection
                finalAmount = 0;
                fatigueApplied = true;
            } else if (timeSince < 30000) {
                // 30 seconds
                finalAmount = Math.floor(amount * 0.2);
                fatigueApplied = true;
            } else if (timeSince < 120000) {
                // 2 minutes
                finalAmount = Math.floor(amount * 0.5);
                fatigueApplied = true;
            } else if (timeSince < 300000) {
                // 5 minutes
                finalAmount = Math.floor(amount * 0.8);
            }
        }

        // Update cooldown
        this.cooldowns.set(cooldownKey, now);

        // If fatigue reduced XP to 0, don't proceed
        if (finalAmount <= 0) {
            return {
                added: 0,
                total: this.getTotalXP(),
                fatigue: fatigueApplied,
            };
        }

        // Update combo system
        const combo = this.updateCombo(source);
        const comboBonus = Math.floor(combo / 10) * 2; // +2 XP per 10 combo
        finalAmount += comboBonus;

        // Apply multipliers
        const multiplier = this.calculateTotalMultiplier();
        finalAmount = Math.floor(finalAmount * multiplier);

        // Get old level for level-up detection
        const oldLevel = this.getCurrentLevel();

        // Update storage
        const currentXP = this.getCurrentXP();
        const totalXP = this.getTotalXP();

        this.storage.update({
            xp: currentXP + finalAmount,
            totalXp: totalXP + finalAmount,
        });

        // Log action
        this.logAction(source, finalAmount, metadata, combo);

        // Check for level up
        const newLevel = this.getCurrentLevel();
        const leveledUp = newLevel > oldLevel;

        if (leveledUp) {
            this.storage.set("level", newLevel);
            // Award mystery box on level up
            await this.awardLevelUpReward(newLevel);
        }

        return {
            added: finalAmount,
            total: this.getTotalXP(),
            level: newLevel,
            leveledUp,
            oldLevel,
            combo,
            multiplier,
            fatigue: fatigueApplied,
            remainingCap: capCheck.remaining,
        };
    }

    async awardLevelUpReward(level) {
        const unlock = XPSystem.LEVEL_UNLOCKS[level];
        if (!unlock) return;

        // Award mystery box based on level tier
        const boxes = this.storage.get("mysteryBoxes") || {};
        if (level % 5 === 0) {
            const boxType =
                level >= 15 ? "gold" : level >= 7 ? "silver" : "bronze";
            boxes[boxType] = (boxes[boxType] || 0) + 1;
            this.storage.set("mysteryBoxes", boxes);

            vscode.window.showInformationMessage(
                `🎉 LEVEL ${level}! Unlocked: ${unlock.reward} + ${boxType.toUpperCase()} Mystery Box!`,
            );
        } else {
            vscode.window.showInformationMessage(
                `🎉 LEVEL ${level}! Unlocked: ${unlock.reward}`,
            );
        }
    }

    logAction(source, amount, metadata, combo = 0) {
        const stats = this.storage.get("stats") || {};
        const today = new Date().toISOString().split("T")[0];

        if (!stats.daily) stats.daily = {};
        if (!stats.daily[today]) {
            stats.daily[today] = {
                xp: 0,
                actions: 0,
                sources: {},
                maxCombo: 0,
            };
        }

        stats.daily[today].xp += amount;
        stats.daily[today].actions += 1;
        stats.daily[today].sources[source] =
            (stats.daily[today].sources[source] || 0) + 1;
        stats.daily[today].maxCombo = Math.max(
            stats.daily[today].maxCombo,
            combo,
        );

        // Keep action history (last 500 to prevent bloat)
        if (!stats.actions) stats.actions = [];
        stats.actions.push({
            timestamp: Date.now(),
            source,
            amount,
            combo,
            metadata: { ...metadata, file: undefined }, // Don't store full paths
        });
        if (stats.actions.length > 500) {
            stats.actions = stats.actions.slice(-500);
        }

        this.storage.set("stats", stats);
    }

    getCombo() {
        return this.comboCount || this.storage.get("currentCombo") || 0;
    }

    getMysteryBoxes() {
        return (
            this.storage.get("mysteryBoxes") || {
                bronze: 0,
                silver: 0,
                gold: 0,
            }
        );
    }

    async reset() {
        this.storage.set("xp", 0);
        this.storage.set("totalXp", 0);
        this.storage.set("level", 1);
        this.storage.set("currentCombo", 0);
        this.storage.set("streakBoost", null);
        this.storage.set("tempBoost", null);
        this.storage.set("mysteryBoxes", { bronze: 0, silver: 0, gold: 0 });
        this.storage.set("sessionActions", 0);
        this.cooldowns.clear();
        this.dailyCaps.clear();
    }
}

module.exports = XPSystem;
