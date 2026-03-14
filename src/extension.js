const vscode = require("vscode");

const XPSystem = require("./core/XPSystem");
const LevelSystem = require("./core/LevelSystem");
const StreakSystem = require("./core/StreakSystem");
const AchievementSystem = require("./core/AchievementSystem");

const ActivityTracker = require("./tracking/ActivityTracker");
const HeartbeatMonitor = require("./tracking/HeartbeatMonitor");

const { SoundEngine, SoundEventHandler } = require("./audio/SoundEngine");

const StatusBar = require("./ui/StatusBar");
const SidebarProvider = require("./ui/SidebarProvider");

const LocalStorage = require("./storage/LocalStorage");

let context;
let systems = {};

/**
 * Extension Activation
 */
async function activate(ctx) {
	console.log("[CODE CORE] Activating extension...");

	context = ctx;

	// ✅ Register commands FIRST — before anything else
	// This guarantees commands always work even if other systems fail
	registerCommands(ctx);

	try {
		// ----------------------------
		// Storage Initialization
		// ----------------------------

		const storage = new LocalStorage(ctx);
		await storage.initialize();

		systems.storage = storage;

		// ----------------------------
		// Core Systems
		// ----------------------------

		systems.xp = new XPSystem(storage);
		systems.levels = new LevelSystem(storage);
		systems.streaks = new StreakSystem(storage);
		systems.achievements = new AchievementSystem(storage);

		// ----------------------------
		// Audio System
		// ----------------------------

		try {
			systems.sounds = new SoundEngine(context);
			systems.soundHandler = new SoundEventHandler(systems.sounds);
			const soundEvents = await systems.soundHandler.register();
			ctx.subscriptions.push(...soundEvents);
		} catch (soundErr) {
			console.error(
				"[CODE CORE] Audio system failed (non-fatal):",
				soundErr,
			);
			// Provide a no-op fallback so other systems don't crash calling sounds.play()
			systems.sounds = { play: () => {} };
		}

		// ----------------------------
		// UI Systems
		// ----------------------------

		systems.statusBar = new StatusBar(systems);
		systems.sidebar = new SidebarProvider(context.extensionUri, systems);

		const sidebar = vscode.window.registerWebviewViewProvider(
			"codecore.sidebar",
			systems.sidebar,
		);

		ctx.subscriptions.push(sidebar);

		// ----------------------------
		// Tracking Systems
		// ----------------------------

		systems.tracker = new ActivityTracker(systems);
		systems.heartbeat = new HeartbeatMonitor(systems);

		systems.tracker.start();
		systems.heartbeat.start();

		// ✅ This was missing — initializes Supabase profile + syncs progress
		await systems.tracker.onActivate();

		// ----------------------------
		// Daily Checks
		// ----------------------------

		await checkDailyLogin();

		// ----------------------------
		// UI Updates
		// ----------------------------

		systems.statusBar.update();
		systems.sidebar?.update();

		showWelcomeBack();

		console.log("[CODE CORE] Extension activated successfully");
	} catch (error) {
		console.error("[CODE CORE] Activation failed:", error);
		vscode.window.showErrorMessage(
			`CODE CORE failed to start: ${error.message}. Check developer console (Help > Toggle Developer Tools).`,
		);
	}
}

/**
 * Extension Deactivation
 */
function deactivate() {
	console.log("[CODE CORE] Shutting down...");

	try {
		systems.heartbeat?.stop();
		systems.tracker?.stop();
		systems.sidebar?.dispose();
	} catch (err) {
		console.error("Shutdown error:", err);
	}
}

/**
 * Register Extension Commands
 */
function registerCommands(ctx) {
	ctx.subscriptions.push(
		vscode.commands.registerCommand(
			"codecore.openDashboard",
			openDashboard,
		),

		vscode.commands.registerCommand(
			"codecore.toggleFocusMode",
			toggleFocusMode,
		),

		vscode.commands.registerCommand(
			"codecore.resetProgress",
			resetProgress,
		),

		vscode.commands.registerCommand(
			"codecore.openMysteryBox",
			openMysteryBox,
		),

		vscode.commands.registerCommand("codecore.useBoost", useBoost),

		vscode.commands.registerCommand("codecore.showStats", showStats),

		vscode.commands.registerCommand(
			"codecore.claimDaily",
			claimDailyReward,
		),
	);
}

/**
 * Open Dashboard
 */
async function openDashboard() {
	if (!systems.sidebar) {
		vscode.window.showWarningMessage(
			"CODE CORE is still initializing, please wait.",
		);
		return;
	}
	await vscode.commands.executeCommand("workbench.view.extension.codecore");
}

/**
 * Focus Mode Toggle
 */
function toggleFocusMode() {
	vscode.window.showInformationMessage("Focus Mode coming soon!");
}

/**
 * Reset All Progress
 */
async function resetProgress() {
	if (!systems.xp) {
		vscode.window.showWarningMessage("CODE CORE is still initializing.");
		return;
	}

	const answer = await vscode.window.showWarningMessage(
		"Reset ALL CODE CORE progress?",
		"Yes Reset Everything",
		"Cancel",
	);

	if (answer !== "Yes Reset Everything") return;

	await systems.xp.reset();
	await systems.streaks.reset();
	await systems.achievements.reset();

	systems.storage.set("mysteryBoxes", { bronze: 0, silver: 0, gold: 0 });

	systems.statusBar.update();
	systems.sidebar?.update();

	vscode.window.showInformationMessage("All progress reset.");
}

/**
 * Open Mystery Box
 */
async function openMysteryBox() {
	if (!systems.xp) {
		vscode.window.showWarningMessage("CODE CORE is still initializing.");
		return;
	}

	const boxes = systems.xp.getMysteryBoxes();
	const total = (boxes.bronze || 0) + (boxes.silver || 0) + (boxes.gold || 0);

	if (total === 0) {
		vscode.window.showInformationMessage(
			"No mystery boxes yet. Keep coding!",
		);
		return;
	}

	const items = [];

	if (boxes.bronze > 0)
		items.push({ label: `Bronze (${boxes.bronze})`, type: "bronze" });

	if (boxes.silver > 0)
		items.push({ label: `Silver (${boxes.silver})`, type: "silver" });

	if (boxes.gold > 0)
		items.push({ label: `Gold (${boxes.gold})`, type: "gold" });

	const selected = await vscode.window.showQuickPick(items);

	if (!selected) return;

	const result = await systems.xp.openMysteryBox(selected.type);

	if (result.success) {
		systems.sounds.play("achievement");
		systems.sidebar?.update();
	}
}

/**
 * Show Active Boost
 */
function useBoost() {
	if (!systems.xp) {
		vscode.window.showWarningMessage("CODE CORE is still initializing.");
		return;
	}

	const boosts = systems.xp.getActiveBoosts();

	if (!boosts.length) {
		vscode.window.showInformationMessage("No active boosts.");
		return;
	}

	const multiplier = boosts.reduce((a, b) => a * b.multiplier, 1);
	vscode.window.showInformationMessage(`Active XP Boost: ${multiplier}x`);
}

/**
 * Show Player Stats
 */
function showStats() {
	if (!systems.xp || !systems.streaks) {
		vscode.window.showWarningMessage("CODE CORE is still initializing.");
		return;
	}

	const progress = systems.xp.getProgress();
	const streak = systems.streaks.getStreakStatus();

	vscode.window.showInformationMessage(
		`Level ${progress.level} | XP ${progress.xp} | Streak ${streak.current}`,
	);
}

/**
 * Claim Daily Reward
 */
async function claimDailyReward() {
	if (!systems.xp || !systems.storage) {
		vscode.window.showWarningMessage("CODE CORE is still initializing.");
		return;
	}

	const today = new Date().toISOString().split("T")[0];
	const last = systems.storage.get("lastDailyClaim");

	if (last === today) {
		vscode.window.showWarningMessage("Daily reward already claimed.");
		return;
	}

	const streak = systems.streaks.getStreak();
	const reward = 50 + Math.min(streak.current * 5, 100);

	await systems.xp.addXP(reward, "daily_login");

	systems.storage.set("lastDailyClaim", today);

	systems.sounds.play("achievement");

	systems.statusBar.update();
	systems.sidebar?.update();

	vscode.window.showInformationMessage(`Daily reward: +${reward} XP`);
}

/**
 * Daily Login Check
 */
async function checkDailyLogin() {
	const result = await systems.streaks.recordActivity(0);

	if (result.expired) {
		vscode.window.showWarningMessage("Your coding streak expired.");
	}
}

/**
 * Welcome Back Message
 */
function showWelcomeBack() {
	const progress = systems.xp.getProgress();
	const streak = systems.streaks.getStreak();

	if (progress.level <= 1 && streak.current === 0) return;

	vscode.window.showInformationMessage(
		`Welcome back! Level ${progress.level} | Streak ${streak.current}`,
	);
}

/**
 * Check & Notify Achievements
 */
async function checkAchievements() {
	const newUnlocks = systems.achievements.checkUnlocks();

	for (const ach of newUnlocks) {
		systems.sidebar?.postMessage({
			type: "achievementUnlocked",
			achievement: ach,
		});

		vscode.window.showInformationMessage(
			`🎖 Achievement Unlocked: ${ach.name} — ${ach.desc}`,
		);

		systems.sounds?.play(ach.legendary ? "achievement" : "levelup");
	}

	return newUnlocks;
}

module.exports = {
	activate,
	deactivate,
};
