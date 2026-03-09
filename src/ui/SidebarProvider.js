// @ts-check
"use strict";

const vscode = require("vscode");

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

        // Message handler
        this._disposables.push(
            webviewView.webview.onDidReceiveMessage(async (msg) => {
                switch (msg.type) {
                    case "getData":
                        this.sendData();
                        break;
                    case "openSettings":
                        vscode.commands.executeCommand(
                            "workbench.action.openSettings",
                            "codecore",
                        );
                        break;
                    default:
                        break;
                }
            }),
        );

        // Send initial data once the view is ready
        this.sendData();

        // Cleanup on dispose
        webviewView.onDidDispose(() => {
            this.dispose();
            this.view = null;
        });
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

    // ─────────────────────────────────────────────────────────
    // Data
    // ─────────────────────────────────────────────────────────

    sendData() {
        if (!this.view) return;

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

            this._post({
                type: "data",
                data: {
                    level: progress.level,
                    title: levelData.title,
                    color: levelData.color,
                    xp: progress.xp,
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
                },
            });
        } catch (err) {
            // Gracefully swallow errors so a broken system doesn't crash the panel
            console.error("[CodeCore] SidebarProvider.sendData error:", err);
        }
    }

    // ─────────────────────────────────────────────────────────
    // Internals
    // ─────────────────────────────────────────────────────────

    /** @param {object} message */
    _post(message) {
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
    <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
    <link href="${styleUri}" rel="stylesheet">
    <title>CODE CORE</title>
</head>
<body>
    <div id="app">
        <div class="loading">
            <div class="loading-spinner"></div>
            <span>Initializing</span>
        </div>
    </div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function _getNonce() {
    const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let nonce = "";
    for (let i = 0; i < 32; i++) {
        nonce += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return nonce;
}

module.exports = SidebarProvider;
