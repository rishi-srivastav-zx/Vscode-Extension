const vscode = require("vscode");
const supabase = require("../supabaseClient/supabaseClient");
const crypto = require("crypto");
const os = require("os");

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function generateUserId() {
	const hostname = os.hostname();
	const username = os.userInfo().username;
	const hash = crypto
		.createHash("md5")
		.update(hostname + "_" + username)
		.digest("hex");
	return (
		hash.substring(0, 8) +
		"-" +
		hash.substring(8, 12) +
		"-" +
		hash.substring(12, 16) +
		"-" +
		hash.substring(16, 20) +
		"-" +
		hash.substring(20, 32)
	);
}

function getDisplayName() {
	const username = os.userInfo().username;
	const hostname = os.hostname();
	return `${username}@${hostname.substring(0, 8)}`;
}

// ─────────────────────────────────────────────────────────────
// ActivityTracker
// ─────────────────────────────────────────────────────────────

class ActivityTracker {
	constructor(systems) {
		this.systems = systems;
		this.disposables = [];
		this.diagnostics = new Map();
		this.lastComboNotification = 0;
		this.userId = generateUserId();
		this.displayName = getDisplayName();
		this.lastStreakUpdateDate = null;
	}

	// ─────────────────────────────────────────────────────────
	// Initialization
	// ─────────────────────────────────────────────────────────

	async onActivate() {
		if (!supabase.isConfigured()) return;

		try {
			// Create or get user profile
			const { data, error } = await supabase.createOrGetProfile(
				this.userId,
				this.displayName,
			);

			if (error) {
				console.log(
					"[ActivityTracker] Profile creation failed:",
					error,
				);
				return;
			}

			console.log("[ActivityTracker] User profile ready:", this.userId);

			// Reset inactive streaks (once on startup)
			await supabase.resetInactiveStreaks();

			// Sync progress from database
			await this.syncProgressFromDatabase();
		} catch (err) {
			console.error("[ActivityTracker] onActivate error:", err);
		}
	}

	// ─────────────────────────────────────────────────────────
	// Supabase sync
	// ─────────────────────────────────────────────────────────

	async syncProgressFromDatabase() {
		if (!supabase.isConfigured()) return;

		try {
			const { data, error } = await supabase.getProgress(this.userId);

			if (error) {
				console.error(
					"[ActivityTracker] Failed to sync progress:",
					error,
				);
				return;
			}

			if (data) {
				// Update local systems with database values
				this.systems.xp.storage.set("totalXp", data.total_xp);
				this.systems.xp.storage.set("level", data.level);

				if (this.systems.streaks) {
					this.systems.streaks.storage.set("streak", {
						current: data.current_streak,
						longest: data.longest_streak,
					});
				}

				console.log(
					`[ActivityTracker] Progress synced: Level ${data.level}, XP: ${data.total_xp}`,
				);
			}
		} catch (err) {
			console.error(
				"[ActivityTracker] syncProgressFromDatabase error:",
				err,
			);
		}
	}

	// ─────────────────────────────────────────────────────────
	// Start / Stop
	// ─────────────────────────────────────────────────────────

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

	stop() {
		this.disposables.forEach((d) => d.dispose());
		this.disposables = [];
	}

	// ─────────────────────────────────────────────────────────
	// Event handlers
	// ─────────────────────────────────────────────────────────

	async onSave(doc) {
		if (doc.isUntitled || doc.uri.scheme !== "file") return;

		if (supabase.isConfigured()) {
			const { data, error } = await supabase.addXP(
				this.userId,
				5,
				"file_saved",
				{
					file_name: doc.fileName,
					file_type: doc.languageId,
					lines: doc.lineCount,
					timestamp: new Date().toISOString(),
				},
			);

			if (!error && data) {
				if (data[0].level_up) {
					this.systems.sounds.play("levelUp");
					this.showLevelUpNotification({ level: data[0].new_level });
				} else {
					this.systems.sounds.play("save");
				}

				// Update local cache
				this.systems.xp.storage.set("totalXp", data[0].new_xp);
				this.systems.xp.storage.set("level", data[0].new_level);
			}
		} else {
			// Fallback to local if Supabase not configured
			const result = await this.systems.xp.addXP(5, "file_save", {
				file: doc.fileName,
				language: doc.languageId,
			});

			if (result && result.leveledUp) {
				this.systems.sounds.play("levelUp");
				this.showLevelUpNotification(result);
			}
		}

		this.updateLanguageStats(doc.languageId);
		this.systems.statusBar.update();

		await this.checkAchievements();
		await this.updateStreakIfNeeded();
	}

	async updateStreakIfNeeded() {
		if (!supabase.isConfigured()) return;

		const today = new Date().toDateString();
		if (this.lastStreakUpdateDate === today) return;

		try {
			const { data, error } = await supabase.updateStreak(this.userId);

			if (!error && data) {
				this.lastStreakUpdateDate = today;

				// Update local cache
				this.systems.streaks?.storage.set("streak", {
					current: data[0].current_streak,
					longest: data[0].longest_streak,
				});

				console.log(
					`[ActivityTracker] Streak updated: ${data[0].current_streak} days`,
				);
			}
		} catch (err) {
			console.error("[ActivityTracker] updateStreakIfNeeded error:", err);
		}
	}

	async onCreate(e) {
		let leveledUp = false;

		for (const file of e.files) {
			if (supabase.isConfigured()) {
				const { data, error } = await supabase.addXP(
					this.userId,
					10,
					"file_created",
					{
						file_path: file.fsPath,
						timestamp: new Date().toISOString(),
					},
				);

				if (!error && data) {
					if (data[0].level_up) leveledUp = true;
					this.systems.xp.storage.set("totalXp", data[0].new_xp);
					this.systems.xp.storage.set("level", data[0].new_level);
				}
			} else {
				const result = await this.systems.xp.addXP(10, "file_create", {
					file: file.fsPath,
				});

				if (result && result.leveledUp) leveledUp = true;
			}
		}

		if (leveledUp) {
			this.systems.sounds.play("levelUp");
		} else {
			this.systems.sounds.play("create");
		}

		this.systems.statusBar.update();

		await this.checkAchievements();
		await this.updateStreakIfNeeded();
	}

	onDelete() {
		this.systems.sounds.play("delete");
	}

	onEditorChange(editor) {
		if (editor) {
			this.updateLanguageStats(editor.document.languageId);
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
				const xpAmount = 20 * fixed;

				if (supabase.isConfigured()) {
					const { data, error } = await supabase.addXP(
						this.userId,
						xpAmount,
						"error_fixed",
						{
							file_path: uri.fsPath,
							errors_fixed: fixed,
							timestamp: new Date().toISOString(),
						},
					);

					if (!error && data) {
						if (data[0].level_up) {
							this.systems.sounds.play("levelUp");
							this.showLevelUpNotification({
								level: data[0].new_level,
							});
						} else {
							this.systems.sounds.play("errorFix");
						}
						this.systems.xp.storage.set("totalXp", data[0].new_xp);
						this.systems.xp.storage.set("level", data[0].new_level);
					}
				} else {
					const result = await this.systems.xp.addXP(
						xpAmount,
						"error_fix",
						{
							file: uri.fsPath,
							fixed: fixed,
						},
					);

					if (result && result.leveledUp) {
						this.systems.sounds.play("levelUp");
						this.showLevelUpNotification(result);
					}
				}

				this.systems.statusBar.update();
			}

			this.diagnostics.set(uri.toString(), newCount);
		}

		await this.checkAchievements();
	}

	async onCommit() {
		if (supabase.isConfigured()) {
			const { data, error } = await supabase.addXP(
				this.userId,
				50,
				"commit",
				{
					timestamp: new Date().toISOString(),
				},
			);

			if (!error && data) {
				if (data[0].level_up) {
					this.systems.sounds.play("levelUp");
					this.showLevelUpNotification({ level: data[0].new_level });
				} else {
					this.systems.sounds.play("commit");
				}
				this.systems.xp.storage.set("totalXp", data[0].new_xp);
				this.systems.xp.storage.set("level", data[0].new_level);
			}
		} else {
			const result = await this.systems.xp.addXP(50, "commit", {
				timestamp: Date.now(),
			});

			if (result && result.leveledUp) {
				this.systems.sounds.play("levelUp");
				this.showLevelUpNotification(result);
			}
		}

		this.systems.statusBar.update();

		await this.checkAchievements();
		await this.updateStreakIfNeeded();
	}

	// ─────────────────────────────────────────────────────────
	// Achievement checking
	// ─────────────────────────────────────────────────────────

	async checkAchievements() {
		try {
			if (this.systems.sidebar) {
				await this.systems.sidebar.checkAndNotifyAchievements();
			} else {
				const newUnlocks = this.systems.achievements.checkUnlocks();
				for (const ach of newUnlocks) {
					this.systems.sounds?.play("achievement");
					vscode.window.showInformationMessage(
						`🏆 Achievement Unlocked: ${ach.name} — ${ach.desc}`,
					);
				}
				if (newUnlocks.length > 0) {
					this.systems.sidebar?.update();
				}
			}
		} catch (err) {
			console.error("[ActivityTracker] checkAchievements error:", err);
		}
	}

	// ─────────────────────────────────────────────────────────
	// Git tracking
	// ─────────────────────────────────────────────────────────

	async initGitTracking() {
		const gitExtension = vscode.extensions.getExtension("vscode.git");
		if (!gitExtension) return;

		try {
			const git = await gitExtension.activate();
			const api = git.getAPI(1);

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
			setInterval(checkCommits, 5000);
			checkCommits();
		} catch (err) {
			console.log(
				"[ActivityTracker] Git tracking not available:",
				err.message,
			);
		}
	}

	// ─────────────────────────────────────────────────────────
	// Language stats
	// ─────────────────────────────────────────────────────────

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

	// ─────────────────────────────────────────────────────────
	// Notifications
	// ─────────────────────────────────────────────────────────

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
}

module.exports = ActivityTracker;
