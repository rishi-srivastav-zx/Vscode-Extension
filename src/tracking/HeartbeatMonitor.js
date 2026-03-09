const vscode = require("vscode");

class HeartbeatMonitor {
	constructor(systems) {
		this.systems = systems;
		this.interval = null;
		this.lastActivity = Date.now();
		this.isActive = false;
		this.HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes
		this.INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
	}

	start() {
		// Track user activity
		this.disposables = [
			vscode.workspace.onDidChangeTextDocument(() =>
				this.recordActivity(),
			),
			vscode.window.onDidChangeTextEditorSelection(() =>
				this.recordActivity(),
			),
			vscode.workspace.onDidSaveTextDocument(() => this.recordActivity()),
		];

		// Start heartbeat interval
		this.interval = setInterval(
			() => this.heartbeat(),
			this.HEARTBEAT_INTERVAL,
		);
	}

	recordActivity() {
		this.lastActivity = Date.now();
		if (!this.isActive) {
			this.isActive = true;
		}
	}

	async heartbeat() {
		const now = Date.now();
		const timeSinceActivity = now - this.lastActivity;

		// If user has been active in the last 10 minutes, count this 5-min block
		if (timeSinceActivity < this.INACTIVITY_TIMEOUT) {
			// Add 5 minutes to today's active time
			await this.systems.streaks.recordActivity(5);

			// Award XP for time block (every 30 mins = 15 XP)
			const stats = this.systems.storage.get("stats") || {};
			const today = new Date().toISOString().split("T")[0];
			const todayMinutes = stats.daily?.[today]?.activeMinutes || 0;

			// Award XP every 30 minutes
			if (todayMinutes % 30 < 5) {
				await this.systems.xp.addXP(15, "time_block", {
					minutes: todayMinutes,
				});
				this.systems.statusBar.update();
			}
		} else {
			this.isActive = false;
		}

		// Update sidebar with current activity
		this.systems.sidebar?.updateActivity({
			isActive: this.isActive,
			lastActivity: this.lastActivity,
		});
	}

	stop() {
		this.disposables?.forEach((d) => d.dispose());
		if (this.interval) {
			clearInterval(this.interval);
		}
	}
}

module.exports = HeartbeatMonitor;
