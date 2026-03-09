// @ts-check
"use strict";

const vscode = require("vscode");

class StatusBar {
    constructor(systems) {
        this.systems = systems;

        this._item = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100,
        );
        this._item.command = "codecore.openDashboard";
        this._item.show();
    }

    // ─────────────────────────────────────────────────────────

    update() {
        try {
            const progress = this.systems.xp.getProgress();
            const streak = this.systems.streaks.getStreak();
            const emoji = this.systems.streaks.getStreakEmoji(streak.current);

            const BAR_LEN = 10;
            const filled = Math.round((progress.percentage / 100) * BAR_LEN);
            const bar = "█".repeat(filled) + "░".repeat(BAR_LEN - filled);

            this._item.text = [
                "$(zap)",
                `L${progress.level}`,
                "│",
                bar,
                `${progress.progress.toLocaleString()}/${progress.required.toLocaleString()}`,
                "│",
                `${emoji} ${streak.current}`,
            ].join(" ");

            this._item.tooltip = this._buildTooltip(progress, streak);

            // Highlight when level-up is imminent
            this._item.backgroundColor =
                progress.percentage >= 99
                    ? new vscode.ThemeColor("statusBarItem.prominentBackground")
                    : undefined;
        } catch (err) {
            // Silently swallow — status bar should never crash the extension
            console.error("[CodeCore] StatusBar.update error:", err);
        }
    }

    dispose() {
        this._item.dispose();
    }

    // ─────────────────────────────────────────────────────────

    /** @returns {string} */
    _buildTooltip(progress, streak) {
        return [
            `CODE CORE — Level ${progress.level}`,
            `XP : ${progress.xp.toLocaleString()} total`,
            `Progress : ${progress.progress.toLocaleString()} / ${progress.required.toLocaleString()} XP (${Math.round(progress.percentage)}%)`,
            `Streak : ${streak.current} day${streak.current !== 1 ? "s" : ""} (best: ${streak.longest})`,
            "",
            "Click to open dashboard",
        ].join("\n");
    }
}

module.exports = StatusBar;
