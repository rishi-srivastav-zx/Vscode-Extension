// @ts-check
"use strict";

const vscode = require("vscode");

class StreakSystem {
    constructor(storage) {
        this.storage = storage;
        this.MIN_ACTIVE_MINUTES = 30;
    }

    // ─────────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────────

    static get STREAK_REWARDS() {
        return {
            3: {
                type: "boost",
                multiplier: 1.1,
                duration: 3_600_000,
                description: "1.1x XP for 1 hour",
            },
            7: {
                type: "mystery_box",
                boxType: "bronze",
                count: 1,
                description: "Bronze Mystery Box",
            },
            10: {
                type: "boost",
                multiplier: 1.2,
                duration: 7_200_000,
                description: "1.2x XP for 2 hours",
            },
            14: {
                type: "mystery_box",
                boxType: "silver",
                count: 1,
                description: "Silver Mystery Box",
            },
            21: {
                type: "boost",
                multiplier: 1.3,
                duration: 14_400_000,
                description: "1.3x XP for 4 hours",
            },
            30: {
                type: "mystery_box",
                boxType: "gold",
                count: 1,
                description: "Gold Mystery Box",
            },
            50: {
                type: "legendary",
                reward: "Streak Master",
                multiplier: 1.5,
                duration: 86_400_000,
                description: "1.5x XP for 24 hours",
            },
            100: {
                type: "legendary",
                reward: "Eternal Flame",
                multiplier: 2.0,
                duration: 172_800_000,
                description: "2x XP for 48 hours",
            },
        };
    }

    /** @returns {object} Default streak shape */
    static _defaultStreak() {
        return {
            current: 0,
            longest: 0,
            lastActive: null,
            freezesRemaining: 1,
            totalDaysActive: 0,
            streakStartDate: null,
            highestStreakReward: 0,
        };
    }

    // ─────────────────────────────────────────────────────────
    // Read
    // ─────────────────────────────────────────────────────────

    getStreak() {
        const streak =
            this.storage.get("streak") || StreakSystem._defaultStreak();

        if (streak.lastActive && streak.current > 0) {
            const hoursSince =
                (Date.now() - new Date(streak.lastActive).getTime()) /
                3_600_000;

            if (hoursSince > 48) {
                // Streak is expired — persist the reset immediately so we don't
                // keep returning stale data on every call.
                const expired = {
                    ...streak,
                    longest: Math.max(streak.longest, streak.current),
                    current: 0,
                    highestStreakReward: 0,
                    freezesRemaining: 1,
                };
                this.storage.set("streak", expired);
                return { ...expired, wasExpired: true, hoursSince };
            }
        }

        return streak;
    }

    checkDayActivity() {
        const stats = this.storage.get("stats") || {};
        const today = _todayStr();
        const todaySt = stats.daily?.[today];
        return (todaySt?.activeMinutes || 0) >= this.MIN_ACTIVE_MINUTES;
    }

    // ─────────────────────────────────────────────────────────
    // Write
    // ─────────────────────────────────────────────────────────

    async recordActivity(minutes = 0) {
        const now = new Date();
        const todayKey = _todayStr(now);

        // ── 1. Update daily active minutes (cap at 16 h = 960 min) ──
        const stats = this.storage.get("stats") || {};
        if (!stats.daily) stats.daily = {};
        if (!stats.daily[todayKey]) {
            stats.daily[todayKey] = {
                xp: 0,
                actions: 0,
                activeMinutes: 0,
                sources: {},
            };
        }
        stats.daily[todayKey].activeMinutes = Math.min(
            (stats.daily[todayKey].activeMinutes || 0) + minutes,
            960,
        );
        this.storage.set("stats", stats);

        // ── 2. Load current streak ──
        const streak = this.getStreak();
        const lastDate = streak.lastActive ? new Date(streak.lastActive) : null;
        const lastKey = lastDate ? _todayStr(lastDate) : null;

        // Already recorded today — nothing else to do
        if (lastKey === todayKey) {
            return { updated: false, streak, isNewDay: false };
        }

        // Anti-exploit: require at least 20 h between streak increments
        if (lastDate) {
            const hoursSinceLast =
                (now.getTime() - lastDate.getTime()) / 3_600_000;
            if (hoursSinceLast < 20) {
                return {
                    updated: false,
                    streak,
                    tooSoon: true,
                    hoursSinceLast,
                };
            }
        }

        // ── 3. Determine new streak value ──
        const yesterdayKey = _todayStr(_daysAgo(now, 1));
        const newStreak = { ...streak };
        let broken = false;
        let usedFreeze = false;

        if (!lastDate) {
            // First-ever session
            newStreak.current = 1;
            newStreak.streakStartDate = now.toISOString();
        } else if (lastKey === yesterdayKey) {
            // Consecutive day
            newStreak.current += 1;
        } else {
            const daysMissed = Math.floor(
                (now.getTime() - lastDate.getTime()) / 86_400_000,
            );

            if (daysMissed === 2 && newStreak.freezesRemaining > 0) {
                // Burn a freeze shield
                newStreak.freezesRemaining -= 1;
                newStreak.current += 1;
                usedFreeze = true;
                vscode.window.showInformationMessage(
                    `🛡️ Streak Shield used! (${newStreak.freezesRemaining} remaining)`,
                );
            } else {
                // Streak broken
                broken = true;
                if (newStreak.current > newStreak.longest) {
                    newStreak.longest = newStreak.current;
                }
                const consolationXP = Math.min(newStreak.current * 10, 500);

                // NOTE: award consolation XP via the XP system if available;
                // here we expose it in the return value so the caller can apply it.
                newStreak.current = 1;
                newStreak.streakStartDate = now.toISOString();
                newStreak.highestStreakReward = 0;

                vscode.window.showWarningMessage(
                    `💔 Streak Broken! ${daysMissed} day${daysMissed !== 1 ? "s" : ""} missed. ` +
                        `${consolationXP} consolation XP awarded.`,
                    "Start Fresh",
                );

                // Return early after saving — no rewards to check on a broken streak
                newStreak.lastActive = now.toISOString();
                newStreak.totalDaysActive =
                    (newStreak.totalDaysActive || 0) + 1;
                this.storage.set("streak", newStreak);
                return {
                    updated: true,
                    streak: newStreak,
                    broken,
                    isNewDay: true,
                    rewards: [],
                    consolationXP,
                    isMilestone: false,
                };
            }
        }

        newStreak.lastActive = now.toISOString();
        newStreak.totalDaysActive = (newStreak.totalDaysActive || 0) + 1;
        if (newStreak.current > newStreak.longest) {
            newStreak.longest = newStreak.current;
        }

        // ── 4. Milestone rewards ──
        const rewards = this._checkStreakRewards(newStreak);

        // ── 5. Passive streak boost ──
        this._applyPassiveBoost(newStreak);

        // ── 6. Freeze regen every 7 days ──
        this._checkFreezeRegeneration(newStreak);

        // ── 7. Persist ──
        this.storage.set("streak", newStreak);

        return {
            updated: true,
            streak: newStreak,
            broken,
            usedFreeze,
            isNewDay: true,
            rewards,
            isMilestone: this._isMilestone(newStreak.current),
        };
    }

    // ─────────────────────────────────────────────────────────
    // Rewards
    // ─────────────────────────────────────────────────────────

    /**
     * Check & award any milestone rewards for the current streak value.
     * Mutates `streak.highestStreakReward` in place (caller must persist).
     * @param {object} streak - The (already mutated) streak object
     * @returns {object[]} Rewards that were granted
     */
    _checkStreakRewards(streak) {
        const granted = [];

        for (const [key, rewardTemplate] of Object.entries(
            StreakSystem.STREAK_REWARDS,
        )) {
            const milestone = Number(key);
            if (
                streak.current === milestone &&
                streak.highestStreakReward < milestone
            ) {
                // Build the full reward object including its milestone number
                const reward = { milestone, ...rewardTemplate };
                granted.push(reward);
                this._awardReward(reward);
                streak.highestStreakReward = milestone;
            }
        }

        return granted;
    }

    /**
     * Dispatch a reward to the relevant storage slot and show a notification.
     * @param {{ milestone: number, type: string, multiplier?: number, duration?: number, boxType?: string, count?: number, reward?: string }} reward
     */
    _awardReward(reward) {
        switch (reward.type) {
            case "boost": {
                this.storage.set("streakBoost", {
                    active: true,
                    multiplier: reward.multiplier,
                    source: `${reward.milestone} Day Streak!`,
                    expires: Date.now() + (reward.duration ?? 0),
                });
                const hours = Math.floor((reward.duration ?? 0) / 3_600_000);
                vscode.window.showInformationMessage(
                    `🔥 ${reward.milestone} Day Streak! ${reward.multiplier}x XP Boost for ${hours}h!`,
                );
                break;
            }

            case "mystery_box": {
                const boxes = this.storage.get("mysteryBoxes") || {};
                boxes[reward.boxType] =
                    (boxes[reward.boxType] || 0) + (reward.count ?? 1);
                this.storage.set("mysteryBoxes", boxes);
                vscode.window.showInformationMessage(
                    `🎁 ${reward.milestone} Day Streak! ${reward.boxType.toUpperCase()} Mystery Box awarded!`,
                );
                break;
            }

            case "legendary": {
                this.storage.set("streakBoost", {
                    active: true,
                    multiplier: reward.multiplier,
                    source: reward.reward,
                    expires: Date.now() + (reward.duration ?? 0),
                    legendary: true,
                });
                const legendHours = Math.floor(
                    (reward.duration ?? 0) / 3_600_000,
                );
                vscode.window.showInformationMessage(
                    `🏆 LEGENDARY: ${reward.reward}! ${reward.multiplier}x XP for ${legendHours}h!`,
                );
                break;
            }

            default:
                console.warn("[CodeCore] Unknown reward type:", reward.type);
        }
    }

    _applyPassiveBoost(streak) {
        // Linear ramp: +0.5% per day, capped at 1.2x (reached at 40 days)
        const passive = Math.min(1 + streak.current * 0.005, 1.2);
        const current = this.storage.get("streakBoost");

        // Only write passive boost when no better active boost exists
        if (!current?.active || current.multiplier < passive) {
            this.storage.set("passiveStreakBoost", {
                multiplier: passive,
                streak: streak.current,
            });
        }
    }

    _checkFreezeRegeneration(streak) {
        if (
            streak.current >= 7 &&
            streak.current % 7 === 0 &&
            streak.freezesRemaining < 3
        ) {
            streak.freezesRemaining = Math.min(streak.freezesRemaining + 1, 3);
            vscode.window.showInformationMessage(
                `🛡️ Streak Shield regenerated! (${streak.freezesRemaining}/3 remaining)`,
            );
        }
    }

    // ─────────────────────────────────────────────────────────
    // Getters / helpers
    // ─────────────────────────────────────────────────────────

    getStreakBoost() {
        const boost = this.storage.get("streakBoost");
        if (boost?.expires > Date.now()) return boost;

        const passive = this.storage.get("passiveStreakBoost");
        if (passive) return { ...passive, type: "passive" };

        return null;
    }

    getStreakEmoji(streak) {
        if (streak >= 100) return "🔥💎👑";
        if (streak >= 50) return "🔥💎";
        if (streak >= 30) return "🔥🟣";
        if (streak >= 14) return "🔥🔴";
        if (streak >= 7) return "🔥🟠";
        if (streak >= 3) return "🔥🔵";
        if (streak > 0) return "🔥";
        return "💤";
    }

    getStreakStatus() {
        const streak = this.getStreak();
        return {
            ...streak,
            emoji: this.getStreakEmoji(streak.current),
            boost: this.getStreakBoost(),
            nextReward: this._getNextReward(streak.current),
            daysUntilFreezeReset: this._getDaysUntilFreezeReset(streak),
        };
    }

    _isMilestone(streak) {
        return (
            streak % 7 === 0 ||
            streak % 10 === 0 ||
            !!StreakSystem.STREAK_REWARDS[streak]
        );
    }

    _getNextReward(currentStreak) {
        const milestones = Object.keys(StreakSystem.STREAK_REWARDS)
            .map(Number)
            .sort((a, b) => a - b);

        for (const milestone of milestones) {
            if (milestone > currentStreak) {
                return {
                    daysAway: milestone - currentStreak,
                    ...StreakSystem.STREAK_REWARDS[milestone],
                };
            }
        }
        return null;
    }

    _getDaysUntilFreezeReset(streak) {
        if (!streak.lastActive) return null;
        const nextReset = new Date(streak.lastActive);
        nextReset.setDate(nextReset.getDate() + 7);
        return Math.max(
            0,
            Math.ceil((nextReset.getTime() - Date.now()) / 86_400_000),
        );
    }

    // ─────────────────────────────────────────────────────────
    // Reset
    // ─────────────────────────────────────────────────────────

    async reset() {
        this.storage.set("streak", StreakSystem._defaultStreak());
        this.storage.set("streakBoost", undefined);
        this.storage.set("passiveStreakBoost", undefined);
    }
}

// ─────────────────────────────────────────────────────────────
// Pure helpers (no side-effects, easy to unit-test)
// ─────────────────────────────────────────────────────────────

/** @param {Date} [date] */
function _todayStr(date = new Date()) {
    return date.toISOString().split("T")[0];
}

/** @param {Date} base  @param {number} days */
function _daysAgo(base, days) {
    const d = new Date(base);
    d.setDate(d.getDate() - days);
    return d;
}

module.exports = StreakSystem;
