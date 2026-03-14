// @ts-check
"use strict";

const vscode = require("vscode");
const supabase = require("../supabaseClient/supabaseClient");
const crypto = require("crypto");

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function getUserId() {
	const hostname = require("os").hostname();
	const username = require("os").userInfo().username;
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
	const os = require("os");
	const username = os.userInfo().username;
	const hostname = os.hostname();
	return `${username}@${hostname.substring(0, 8)}`;
}

function _getNonce() {
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let nonce = "";
	for (let i = 0; i < 32; i++) {
		nonce += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return nonce;
}

// ─────────────────────────────────────────────────────────────
// SidebarProvider
// ─────────────────────────────────────────────────────────────

class SidebarProvider {
	/** @param {vscode.Uri} extensionUri */
	constructor(extensionUri, systems) {
		this.extensionUri = extensionUri;
		this.systems = systems;
		/** @type {vscode.WebviewView | null} */
		this.view = null;
		/** @type {vscode.Disposable[]} */
		this._disposables = [];
	}

	// ─────────────────────────────────────────────────────────
	// VSCode API
	// ─────────────────────────────────────────────────────────

	/** @param {vscode.WebviewView} webviewView */
	resolveWebviewView(webviewView) {
		this.view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.joinPath(this.extensionUri, "media"),
			],
		};

		webviewView.webview.html = this._buildHtml(webviewView.webview);

		const messageDisposable = webviewView.webview.onDidReceiveMessage(
			async (msg) => {
				console.log("[CodeCore] Received message:", msg.type);

				switch (msg.type) {
					case "getData":
						this.sendData();
						break;

					case "getProfile":
						this.sendProfile();
						break;

					case "saveProfile":
						await this.saveProfile(msg.username);
						break;

					case "getLeaderboard":
						console.log("[CodeCore] Processing getLeaderboard");
						await this.sendLeaderboard();
						break;

					// ── ACHIEVEMENTS ──────────────────────────────
					case "getAchievements":
						console.log("[CodeCore] Processing getAchievements");
						this.sendAchievements();
						break;

					case "openSettings":
						vscode.commands.executeCommand(
							"workbench.action.openSettings",
							"codecore",
						);
						break;
				}
			},
		);

		this._disposables.push(messageDisposable);

		// Send initial data after webview is ready
		setTimeout(() => this.sendData(), 100);

		webviewView.onDidDispose(() => this.dispose());
	}

	dispose() {
		this._disposables.forEach((d) => d.dispose());
		this._disposables = [];
	}

	// ─────────────────────────────────────────────────────────
	// Public helpers
	// ─────────────────────────────────────────────────────────

	async reveal() {
		await this.view?.show?.(true);
	}

	/** Full data refresh */
	update() {
		this.sendData();
	}

	/** Push a lightweight activity update to the webview */
	updateActivity(activity) {
		this._post({ type: "activity", data: activity ?? {} });
	}

	/**
	 * Send a raw message to the webview.
	 * Used by ActivityTracker to push achievement unlock toasts.
	 * @param {object} msg
	 */
	postMessage(msg) {
		this._post(msg);
	}

	// ─────────────────────────────────────────────────────────
	// Achievements
	// ─────────────────────────────────────────────────────────

	/**
	 * Send the full achievement list to the webview (for the Badges screen).
	 */
	sendAchievements() {
		if (!this.view) {
			console.log("[CodeCore] sendAchievements: No view available");
			return;
		}

		try {
			const all = this.systems.achievements.getAllAchievements();
			console.log(
				`[CodeCore] sendAchievements: sending ${all.length} achievements`,
			);
			this._post({ type: "achievements", data: all });
		} catch (err) {
			console.error("[CodeCore] sendAchievements error:", err);
			this._post({ type: "achievements", data: [] });
		}
	}

	/**
	 * Check for newly unlocked achievements and push toast notifications
	 * to the webview + VS Code notification.
	 * Call this after any XP-gaining event.
	 */
	async checkAndNotifyAchievements() {
		try {
			const newUnlocks = this.systems.achievements.checkUnlocks();

			for (const ach of newUnlocks) {
				console.log(`[CodeCore] Achievement unlocked: ${ach.name}`);

				// Push toast to webview
				this._post({
					type: "achievementUnlocked",
					achievement: ach,
				});

				// VS Code notification
				vscode.window.showInformationMessage(
					`🎖 Achievement Unlocked: ${ach.name} — ${ach.desc}`,
				);

				// Sound
				this.systems.sounds?.play("achievement");
			}

			// Refresh sidebar data if anything unlocked
			if (newUnlocks.length > 0) {
				this.sendData();
			}

			return newUnlocks;
		} catch (err) {
			console.error("[CodeCore] checkAndNotifyAchievements error:", err);
			return [];
		}
	}

	// ─────────────────────────────────────────────────────────
	// Profile
	// ─────────────────────────────────────────────────────────

	async sendProfile() {
		if (!this.view) return;

		try {
			const savedUsername = this.systems.storage.get("username") || "";
			this._post({
				type: "profileData",
				username: savedUsername,
			});
		} catch (err) {
			console.error("[CodeCore] sendProfile error:", err);
		}
	}

	async saveProfile(username) {
		if (!this.view) return;

		try {
			const userId = getUserId();

			// Save locally
			this.systems.storage.set("username", username);

			// Sync to Supabase
			if (supabase.isConfigured()) {
				const progress = this.systems.xp.getProgress();
				const streak = this.systems.streaks.getStreak();

				await supabase.syncProgress(userId, {
					totalXP: progress.xp,
					level: progress.level,
					streak: streak.current,
					longestStreak: streak.longest,
					username: username,
				});

				await supabase.updateLeaderboard(
					userId,
					progress.xp,
					progress.level,
					username,
				);
			}

			this._post({
				type: "profileSaved",
				success: true,
				username: username,
			});
		} catch (err) {
			console.error("[CodeCore] saveProfile error:", err);
			this._post({
				type: "profileSaved",
				success: false,
				error: err.message,
			});
		}
	}

	// ─────────────────────────────────────────────────────────
	// Data
	// ─────────────────────────────────────────────────────────

	sendData() {
		if (!this.view) {
			console.log("[CodeCore] sendData: No view available");
			return;
		}

		try {
			const progress = this.systems.xp.getProgress();
			const levelData = this.systems.levels.getLevelData(progress.level);
			const streak = this.systems.streaks.getStreak();
			const achievements = this.systems.achievements.getAllAchievements();
			const stats = this.systems.storage.get("stats") || {};
			const today = new Date().toISOString().split("T")[0];
			const todayStats = stats.daily?.[today] || {
				xp: 0,
				actions: 0,
				activeMinutes: 0,
			};

			const userId = getUserId();
			const savedUsername =
				this.systems.storage.get("username") || getDisplayName();

			this._post({
				type: "data",
				data: {
					level: progress.level,
					title: levelData.title,
					color: levelData.color,
					xp: progress.xp,
					totalXP: progress.xp,
					progress: progress.progress,
					required: progress.required,
					percentage: progress.percentage,
					streak: streak.current,
					streakEmoji: this.systems.streaks.getStreakEmoji(
						streak.current,
					),
					longestStreak: streak.longest,
					todayXP: todayStats.xp,
					todayMinutes: todayStats.activeMinutes,
					achievements,
					languages: stats.languages || {},
					userId: userId,
					displayName: savedUsername,
				},
			});

			console.log("[CodeCore] sendData: Data sent successfully");
		} catch (err) {
			console.error("[CodeCore] SidebarProvider.sendData error:", err);
			this._post({
				type: "data",
				data: {
					level: 1,
					title: "Error",
					color: "#ff4444",
					xp: 0,
					progress: 0,
					required: 100,
					percentage: 0,
					streak: 0,
					streakEmoji: "⚠️",
					longestStreak: 0,
					todayXP: 0,
					todayMinutes: 0,
					achievements: [],
					languages: {},
					error: err.message,
				},
			});
		}
	}

	// ─────────────────────────────────────────────────────────
	// Leaderboard
	// ─────────────────────────────────────────────────────────

	async sendLeaderboard() {
		console.log(
			"[CodeCore] sendLeaderboard called, view exists:",
			!!this.view,
		);

		if (!this.view) {
			console.log("[CodeCore] sendLeaderboard: No view available");
			return;
		}

		try {
			const configured = supabase.isConfigured();
			console.log("[CodeCore] Supabase configured:", configured);

			if (!configured) {
				this._post({
					type: "leaderboard",
					data: [],
					error: "Supabase not configured. Please set SUPABASE_URL and SUPABASE_KEY in your .env file.",
				});
				return;
			}

			const progress = this.systems.xp.getProgress();
			const streak = this.systems.streaks.getStreak();
			const savedUsername =
				this.systems.storage.get("username") || getDisplayName();
			const userId = getUserId();

			// Sync current user first
			await supabase.syncProgress(userId, {
				totalXP: progress.xp,
				level: progress.level,
				streak: streak.current,
				longestStreak: streak.longest,
				username: savedUsername,
			});
			await supabase.updateLeaderboard(
				userId,
				progress.xp,
				progress.level,
				savedUsername,
			);

			const result = await supabase.getLeaderboard(10);
			console.log("[CodeCore] Got leaderboard result:", result);

			if (result.error) {
				this._post({
					type: "leaderboard",
					data: [],
					error: result.error,
				});
				return;
			}

			let leaderboard = result.data || [];

			// Ensure current user appears in the list
			const currentUser = leaderboard.find((e) => e.user_id === userId);
			if (!currentUser) {
				leaderboard.push({
					user_id: userId,
					username: savedUsername,
					total_xp: progress.xp,
					level: progress.level,
					isCurrentUser: true,
				});
				leaderboard = leaderboard.sort(
					(a, b) => (b.total_xp || 0) - (a.total_xp || 0),
				);
			}

			const processedLeaderboard = leaderboard.map((entry) => ({
				...entry,
				isCurrentUser: entry.user_id === userId,
			}));

			console.log(
				"[CodeCore] Sending leaderboard, entries:",
				processedLeaderboard.length,
			);

			this._post({
				type: "leaderboard",
				data: processedLeaderboard,
			});
		} catch (err) {
			console.error("[CodeCore] sendLeaderboard error:", err);
			this._post({
				type: "leaderboard",
				data: [],
				error: err.message || "Failed to load leaderboard",
			});
		}
	}

	// ─────────────────────────────────────────────────────────
	// Internals
	// ─────────────────────────────────────────────────────────

	/** @param {object} message */
	_post(message) {
		console.log("[CodeCore] _post sending message:", message.type);
		this.view?.webview.postMessage(message);
	}

	/** @param {vscode.Webview} webview */
	_buildHtml(webview) {
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, "media", "sidebar.js"),
		);
		const styleUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, "media", "sidebar.css"),
		);
		const nonce = _getNonce();

		return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy"
		  content="default-src 'none';
				   font-src https://fonts.gstatic.com;
				   style-src ${webview.cspSource} https://fonts.googleapis.com 'unsafe-inline';
				   script-src 'nonce-${nonce}';">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
	<link href="${styleUri}" rel="stylesheet">
	<title>CODE CORE</title>
</head>
<body>
	<div id="app"></div>
	<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
	}
}

module.exports = SidebarProvider;
