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

async function activate(ctx) {
    context = ctx;

    const storage = new LocalStorage(ctx);
    await storage.initialize();

    // Initialize core systems
    systems.xp = new XPSystem(storage);
    systems.levels = new LevelSystem(storage);
    systems.streaks = new StreakSystem(storage);
    systems.achievements = new AchievementSystem(storage);

    // Audio system
    systems.sounds = new SoundEngine(context);

    // Storage reference
    systems.storage = storage;

    // UI systems
    systems.statusBar = new StatusBar(systems);
    systems.sidebar = new SidebarProvider(context.extensionUri, systems);

    // Tracking systems
    systems.tracker = new ActivityTracker(systems);
    systems.heartbeat = new HeartbeatMonitor(systems);
    systems.soundHandler = new SoundEventHandler(systems.sounds);

    // Register sound events
    const soundDisposables = await systems.soundHandler.register();
    ctx.subscriptions.push(...soundDisposables);

    // Register sidebar with proper disposal
    const sidebarDisposable = vscode.window.registerWebviewViewProvider(
        "codecore.sidebar",
        systems.sidebar,
    );
    ctx.subscriptions.push(sidebarDisposable);

    // Add sidebar disposal
    ctx.subscriptions.push({
        dispose: () => {
            systems.sidebar?.dispose();
        },
    });

    // Register commands
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

        // New commands for features
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

    // Start tracking
    systems.tracker.start();
    systems.heartbeat.start();

    // Check for daily login
    await checkDailyLogin();

    // Update UI
    systems.statusBar.update();

    // Show welcome message for returning users
    showWelcomeBack();

    console.log("CODE CORE activated");
}

function deactivate() {
    systems.heartbeat?.stop();
    systems.tracker?.stop();
    systems.sidebar?.dispose();
}

async function openDashboard() {
    console.log("Dashboard clicked");
    await vscode.commands.executeCommand("codecore.sidebar.focus");
}

async function toggleFocusMode() {
    vscode.window.showInformationMessage("Focus Mode: Coming in Phase 2");
}

async function resetProgress() {
    const answer = await vscode.window.showWarningMessage(
        "Reset ALL progress? This cannot be undone. (XP, Level, Streak, Achievements, Mystery Boxes)",
        "Yes, Reset Everything",
        "Cancel",
    );

    if (answer === "Yes, Reset Everything") {
        // Reset all systems
        await systems.xp.reset();
        await systems.streaks.reset();
        await systems.achievements.reset();

        // Clear mystery boxes
        systems.storage.set("mysteryBoxes", { bronze: 0, silver: 0, gold: 0 });
        systems.storage.set("tempBoost", null);
        systems.storage.set("streakBoost", null);

        systems.statusBar.update();
        systems.sidebar?.update();

        vscode.window.showInformationMessage(
            "🗑️ All progress reset. Fresh start!",
        );
    }
}

// NEW: Open Mystery Box command
async function openMysteryBox() {
    const boxes = systems.xp.getMysteryBoxes();
    const totalBoxes =
        (boxes.bronze || 0) + (boxes.silver || 0) + (boxes.gold || 0);

    if (totalBoxes === 0) {
        vscode.window
            .showInformationMessage(
                "📦 No Mystery Boxes! Keep coding to earn them at level ups and streak milestones.",
                "View Progress",
            )
            .then((selection) => {
                if (selection === "View Progress") {
                    openDashboard();
                }
            });
        return;
    }

    // Show quick pick for box selection
    const items = [];
    if (boxes.bronze > 0)
        items.push({
            label: `🥉 Bronze Box (${boxes.bronze})`,
            type: "bronze",
            count: boxes.bronze,
        });
    if (boxes.silver > 0)
        items.push({
            label: `🥈 Silver Box (${boxes.silver})`,
            type: "silver",
            count: boxes.silver,
        });
    if (boxes.gold > 0)
        items.push({
            label: `🥇 Gold Box (${boxes.gold})`,
            type: "gold",
            count: boxes.gold,
        });

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: "Select a Mystery Box to open...",
    });

    if (!selected) return;

    // Open the box
    const result = await systems.xp.openMysteryBox(selected.type);

    if (result.success) {
        systems.sounds.play("achievement");
        systems.sidebar?.update();
    }
}

// NEW: Use XP Boost command
async function useBoost() {
    const boosts = systems.xp.getActiveBoosts();
    const tempBoost = boosts.find(
        (b) => b.type === "temporary" || b.type === "streak",
    );

    if (!tempBoost) {
        vscode.window.showInformationMessage(
            "⚡ No active boosts. Open Mystery Boxes or maintain streaks to get boosts!",
        );
        return;
    }

    const expiresIn = tempBoost.expires
        ? Math.ceil((tempBoost.expires - Date.now()) / 60000)
        : "active";
    vscode.window.showInformationMessage(
        `⚡ Active Boost: ${tempBoost.source} - ${tempBoost.multiplier}x XP (Expires: ${expiresIn}m)`,
    );
}

// NEW: Show detailed stats
async function showStats() {
    const progress = systems.xp.getProgress();
    const streak = systems.streaks.getStreakStatus();
    const boxes = systems.xp.getMysteryBoxes();
    const boosts = systems.xp.getActiveBoosts();

    const totalMultiplier = boosts.reduce((acc, b) => acc * b.multiplier, 1);

    const statsText = `
📊 CODE CORE STATS

🏆 Level ${progress.level} - ${progress.title}
📈 XP: ${progress.xp.toLocaleString()} / ${progress.levelEnd.toLocaleString()} (${Math.floor(progress.percentage)}%)
🔥 Streak: ${streak.current} days (Longest: ${streak.longest})
📦 Boxes: 🥉${boxes.bronze} 🥈${boxes.silver} 🥇${boxes.gold}
⚡ Boost: ${totalMultiplier.toFixed(2)}x
    `;

    vscode.window
        .showInformationMessage(statsText, "Open Dashboard", "Close")
        .then((selection) => {
            if (selection === "Open Dashboard") openDashboard();
        });
}

// NEW: Daily reward claim
async function claimDailyReward() {
    const lastClaim = systems.storage.get("lastDailyClaim");
    const today = new Date().toISOString().split("T")[0];

    if (lastClaim === today) {
        vscode.window.showWarningMessage(
            "⏰ Daily reward already claimed! Come back tomorrow.",
        );
        return;
    }

    // Award daily XP based on streak
    const streak = systems.streaks.getStreak();
    const baseXP = 50;
    const streakBonus = Math.min(streak.current * 5, 100);
    const totalXP = baseXP + streakBonus;

    await systems.xp.addXP(totalXP, "daily_login", { streak: streak.current });

    systems.storage.set("lastDailyClaim", today);
    systems.sounds.play("achievement");

    vscode.window.showInformationMessage(
        `📅 Daily Reward: +${totalXP} XP! (${baseXP} base + ${streakBonus} streak bonus)`,
    );

    systems.statusBar.update();
    systems.sidebar?.update();
}

// Check daily login for streak
async function checkDailyLogin() {
    const result = await systems.streaks.recordActivity(0);

    if (result.updated && result.isNewDay) {
        // New day started
        if (result.rewards && result.rewards.length > 0) {
            systems.sounds.play("achievement");
        }
    }

    // Check for expired streak
    if (result.expired) {
        vscode.window.showWarningMessage(
            `💔 Your ${result.streak.current} day streak has expired! Code today to start a new streak.`,
            "Start Coding",
        );
    }
}

// Welcome back message
async function showWelcomeBack() {
    const progress = systems.xp.getProgress();
    const streak = systems.streaks.getStreak();
    const boxes = systems.xp.getMysteryBoxes();
    const totalBoxes =
        (boxes.bronze || 0) + (boxes.silver || 0) + (boxes.gold || 0);

    let message = `Welcome back! Level ${progress.level} ${progress.title}`;

    if (streak.current > 0) {
        message += ` | 🔥 ${streak.current} day streak`;
    }

    if (totalBoxes > 0) {
        message += ` | 📦 ${totalBoxes} Mystery Boxes waiting`;
    }

    // Only show if user has some progress
    if (progress.level > 1 || streak.current > 0) {
        vscode.window.showInformationMessage(
            message,
            "Open Dashboard",
            "Dismiss",
        );
    }
}

module.exports = { activate, deactivate };
