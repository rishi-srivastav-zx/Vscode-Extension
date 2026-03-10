const vscode = require("vscode");
const supabase = require("../supabaseClient/supabaseClient");
const crypto = require("crypto");

function generateUserId() {
    const hostname = require('os').hostname();
    const username = require('os').userInfo().username;
    const hash = crypto.createHash('md5').update(hostname + '_' + username).digest('hex');
    return hash.substring(0, 8) + '-' + hash.substring(8, 12) + '-' + hash.substring(12, 16) + '-' + hash.substring(16, 20) + '-' + hash.substring(20, 32);
}

class ActivityTracker {
    constructor(systems) {
        this.systems = systems;
        this.disposables = [];
        this.diagnostics = new Map();
        this.lastComboNotification = 0;
        this.userId = generateUserId();
    }

    async syncProgress() {
        if (!supabase.isConfigured()) return;
        const progress = this.systems.xp.getProgress();
        const streak = this.systems.streaks.getStreakStatus();
        await supabase.syncProgress(this.userId, {
            totalXP: progress.totalXP,
            level: progress.level,
            streak: streak.current,
            longestStreak: streak.longest
        });
        await supabase.updateLeaderboard(this.userId, progress.totalXP);
    }

    start() {
        this.disposables.push(
            vscode.workspace.onDidSaveTextDocument((doc) => this.onSave(doc)),
        );

        this.disposables.push(
            vscode.workspace.onDidCreateFiles((e) => this.onCreate(e)),
        );

        this.disposables.push(
            vscode.workspace.onDidDeleteFiles(() => this.onDelete()),
        );

        this.disposables.push(
            vscode.languages.onDidChangeDiagnostics((e) =>
                this.onDiagnosticsChange(e),
            ),
        );

        this.disposables.push(
            vscode.window.onDidChangeActiveTextEditor((e) =>
                this.onEditorChange(e),
            ),
        );

        this.initGitTracking();

        this.updateDiagnostics();
    }

    async onSave(doc) {
        if (doc.isUntitled || doc.uri.scheme !== "file") return;

        const result = await this.systems.xp.addXP(5, "file_save", {
            file: doc.fileName,
            language: doc.languageId,
        });

        if (result) {
            // Handle Level Up
            if (result.leveledUp) {
                this.systems.sounds.play("levelUp");
                this.showLevelUpNotification(result);
            }

            // Handle Combo Milestones (every 5 combos)
            if (result.combo > 0 && result.combo % 5 === 0) {
                this.showComboNotification(result.combo);
            }

            // Play save sound if not level up (to avoid overlap)
            if (!result.leveledUp) {
                this.systems.sounds.play("save");
            }
        }

        this.updateLanguageStats(doc.languageId);
        this.systems.statusBar.update();
        this.checkAchievements();
        this.syncProgress();
    }

    async onCreate(e) {
        let leveledUp = false;
        let totalXP = 0;
        let highestCombo = 0;

        for (const file of e.files) {
            const result = await this.systems.xp.addXP(10, "file_create", {
                file: file.fsPath,
            });

            if (result) {
                if (result.leveledUp) leveledUp = true;
                totalXP += result.added;
                highestCombo = Math.max(highestCombo, result.combo);
            }
        }

        if (leveledUp) {
            this.systems.sounds.play("levelUp");
        }

        this.systems.sounds.play("create");
        this.systems.statusBar.update();
        this.checkAchievements();
        this.syncProgress();
    }

    onDelete() {
        this.systems.sounds.play("delete");
    }

    onEditorChange(editor) {
        if (editor) {
            this.updateLanguageStats(editor.document.languageId);
        }
    }

    updateLanguageStats(language) {
        if (!language || language === "plaintext") return;

        const stats = this.systems.storage.get("stats") || {};
        if (!stats.languages) stats.languages = {};
        stats.languages[language] = (stats.languages[language] || 0) + 1;
        this.systems.storage.set("stats", stats);
    }

    updateDiagnostics() {
        const uris = vscode.workspace.textDocuments
            .filter((d) => d.uri.scheme === "file")
            .map((d) => d.uri);

        for (const uri of uris) {
            const diags = vscode.languages.getDiagnostics(uri);
            const errorCount = diags.filter(
                (d) => d.severity === vscode.DiagnosticSeverity.Error,
            ).length;
            this.diagnostics.set(uri.toString(), errorCount);
        }
    }

    async onDiagnosticsChange(e) {
        for (const uri of e.uris) {
            const oldCount = this.diagnostics.get(uri.toString()) || 0;
            const newDiags = vscode.languages.getDiagnostics(uri);
            const newCount = newDiags.filter(
                (d) => d.severity === vscode.DiagnosticSeverity.Error,
            ).length;

            if (newCount < oldCount && oldCount > 0) {
                const fixed = oldCount - newCount;
                const result = await this.systems.xp.addXP(
                    20 * fixed,
                    "error_fix",
                    {
                        file: uri.fsPath,
                        fixed: fixed,
                    },
                );

                if (result) {
                    if (result.leveledUp) {
                        this.systems.sounds.play("levelUp");
                        this.showLevelUpNotification(result);
                    }

                    if (result.combo > 0 && result.combo % 5 === 0) {
                        this.showComboNotification(result.combo);
                    }

                    // Play error fix sound if not level up
                    if (!result.leveledUp) {
                        this.systems.sounds.play("errorFix");
                    }
                }

                this.systems.statusBar.update();
            }

            this.diagnostics.set(uri.toString(), newCount);
        }

        this.checkAchievements();
    }

    async initGitTracking() {
        const gitExtension = vscode.extensions.getExtension("vscode.git");
        if (!gitExtension) return;

        try {
            const git = await gitExtension.activate();
            const api = git.getAPI(1);

            // Track commits via repository state changes
            let lastCommitCount = 0;

            const checkCommits = () => {
                const repos = api.repositories;
                if (repos.length > 0) {
                    const repo = repos[0];
                    const currentCommitCount = repo.state.HEAD?.commit || 0;

                    if (
                        currentCommitCount > lastCommitCount &&
                        lastCommitCount > 0
                    ) {
                        this.onCommit();
                    }
                    lastCommitCount = currentCommitCount;
                }
            };

            api.onDidChangeState?.(checkCommits);

            // Also check periodically as fallback
            setInterval(checkCommits, 5000);

            checkCommits();
        } catch (err) {
            console.log("Git tracking not available:", err.message);
        }
    }

    async onCommit() {
        const result = await this.systems.xp.addXP(50, "commit", {
            timestamp: Date.now(),
        });

        if (result) {
            if (result.leveledUp) {
                this.systems.sounds.play("levelUp");
                this.showLevelUpNotification(result);
            } else {
                this.systems.sounds.play("commit");
            }

            if (result.combo > 0 && result.combo % 5 === 0) {
                this.showComboNotification(result.combo);
            }
        }

        this.systems.statusBar.update();
        this.checkAchievements();
        this.syncProgress();
    }

    showLevelUpNotification(result) {
        const progress = this.systems.xp.getProgress();
        const nextUnlock = progress.nextUnlock;

        let message = `🎉 LEVEL ${result.level}!`;
        if (nextUnlock) {
            message += ` Next unlock at Level ${nextUnlock.level}: ${nextUnlock.reward}`;
        }

        vscode.window
            .showInformationMessage(message, "View Rewards")
            .then((selection) => {
                if (selection === "View Rewards") {
                    this.systems.sidebar?.reveal();
                }
            });
    }

    showComboNotification(combo) {
        // Debounce combo notifications (max 1 per 3 seconds)
        const now = Date.now();
        if (now - this.lastComboNotification < 3000) return;
        this.lastComboNotification = now;

        const emojis = ["🔥", "⚡", "💥", "🚀", "👑"];
        const emoji =
            emojis[Math.min(Math.floor(combo / 10), emojis.length - 1)];

        vscode.window.showInformationMessage(
            `${emoji} ${combo}x COMBO! Keep going!`,
        );
    }

    showFatigueWarning() {
        vscode.window.showWarningMessage(
            "⏳ Slow down! XP gain reduced. Take a break or work on different files.",
            "Got it",
        );
    }

    async checkAchievements() {
        const newAchievements = this.systems.achievements.checkUnlocks();

        for (const ach of newAchievements) {
            this.systems.sounds.play("achievement");

            vscode.window.showInformationMessage(
                `🏆 Achievement Unlocked: ${ach.name} - ${ach.desc}`,
            );
        }

        if (newAchievements.length > 0) {
            this.systems.sidebar?.update();
        }
    }

    stop() {
        this.disposables.forEach((d) => d.dispose());
    }
}

module.exports = ActivityTracker;
