class AchievementSystem {
	constructor(storage) {
		this.storage = storage;
		this.definitions = this.loadDefinitions();
	}

	loadDefinitions() {
		return [
			// Volume achievements
			{
				id: "xp_100",
				name: "First Steps",
				desc: "Earn 100 XP",
				condition: (s) => s.totalXp >= 100,
				icon: "◆",
			},
			{
				id: "xp_1k",
				name: "Century Mark",
				desc: "Earn 1,000 XP",
				condition: (s) => s.totalXp >= 1000,
				icon: "◆",
			},
			{
				id: "xp_10k",
				name: "Ten Thousand",
				desc: "Earn 10,000 XP",
				condition: (s) => s.totalXp >= 10000,
				icon: "◆",
				rare: true,
			},
			{
				id: "xp_100k",
				name: "Centurion",
				desc: "Earn 100,000 XP",
				condition: (s) => s.totalXp >= 100000,
				icon: "◆",
				epic: true,
			},

			// Streak achievements
			{
				id: "streak_3",
				name: "Building Habit",
				desc: "3 day streak",
				condition: (s, d) => d.streak.current >= 3,
				icon: "🔥",
			},
			{
				id: "streak_7",
				name: "Week Warrior",
				desc: "7 day streak",
				condition: (s, d) => d.streak.current >= 7,
				icon: "🔥",
				rare: true,
			},
			{
				id: "streak_30",
				name: "Monthly Master",
				desc: "30 day streak",
				condition: (s, d) => d.streak.current >= 30,
				icon: "🔥",
				epic: true,
			},
			{
				id: "streak_100",
				name: "Unstoppable",
				desc: "100 day streak",
				condition: (s, d) => d.streak.current >= 100,
				icon: "🔥",
				legendary: true,
			},

			// Action achievements
			{
				id: "files_100",
				name: "File Creator",
				desc: "Create 100 files",
				condition: (s) => this.countActions(s, "file_create") >= 100,
				icon: "📄",
			},
			{
				id: "saves_1k",
				name: "Save Master",
				desc: "Save 1,000 files",
				condition: (s) => this.countActions(s, "file_save") >= 1000,
				icon: "💾",
			},
			{
				id: "fixes_50",
				name: "Bug Hunter",
				desc: "Fix 50 errors",
				condition: (s) => this.countActions(s, "error_fix") >= 50,
				icon: "🐛",
			},
			{
				id: "commits_100",
				name: "Committer",
				desc: "Make 100 commits",
				condition: (s) => this.countActions(s, "commit") >= 100,
				icon: "⛓",
			},

			// Skill achievements
			{
				id: "level_5",
				name: "Rising Star",
				desc: "Reach level 5",
				condition: (s) => s.level >= 5,
				icon: "⭐",
			},
			{
				id: "level_10",
				name: "Expert Dev",
				desc: "Reach level 10",
				condition: (s) => s.level >= 10,
				icon: "⭐",
				rare: true,
			},
			{
				id: "level_20",
				name: "Grandmaster",
				desc: "Reach level 20",
				condition: (s) => s.level >= 20,
				icon: "⭐",
				epic: true,
			},

			// Special
			{
				id: "night_owl",
				name: "Night Owl",
				desc: "Code at 3 AM",
				condition: (s) => this.checkHour(s, 3),
				icon: "🌙",
				hidden: true,
			},
			{
				id: "early_bird",
				name: "Early Bird",
				desc: "Code at 6 AM",
				condition: (s) => this.checkHour(s, 6),
				icon: "🌅",
				hidden: true,
			},
			{
				id: "marathon",
				name: "Marathon",
				desc: "Code for 8 hours straight",
				condition: (s) => this.checkMaxSession(s, 480),
				icon: "⏱",
				rare: true,
			},
		];
	}

	countActions(stats, source) {
		if (!stats.stats?.actions) return 0;
		return stats.stats.actions.filter((a) => a.source === source).length;
	}

	checkHour(stats, hour) {
		if (!stats.stats?.actions) return false;
		return stats.stats.actions.some((a) => {
			const d = new Date(a.timestamp);
			return d.getHours() === hour;
		});
	}

	checkMaxSession(stats, minutes) {
		// Check if any single day has 8+ hours
		if (!stats.stats?.daily) return false;
		return Object.values(stats.stats.daily).some(
			(d) => (d.activeMinutes || 0) >= minutes,
		);
	}

	getUnlocked() {
		return this.storage.get("achievements") || [];
	}

	checkUnlocks() {
		const data = {
			xp: this.storage.get("xp"),
			totalXp: this.storage.get("totalXp"),
			level: this.storage.get("level"),
			streak: this.storage.get("streak"),
			stats: this.storage.get("stats"),
		};

		const unlocked = this.getUnlocked();
		const newUnlocks = [];

		for (const def of this.definitions) {
			if (unlocked.includes(def.id)) continue;

			if (def.condition(data, { streak: data.streak })) {
				unlocked.push(def.id);
				newUnlocks.push(def);
			}
		}

		if (newUnlocks.length > 0) {
			this.storage.set("achievements", unlocked);
		}

		return newUnlocks;
	}

	getAllAchievements() {
		const unlocked = this.getUnlocked();
		return this.definitions.map((def) => ({
			...def,
			unlocked: unlocked.includes(def.id),
			progress: this.getProgress(def),
		}));
	}

	getProgress(def) {
		// Return progress toward achievement (0-1)
		const data = this.storage.get("stats");

		if (def.id.startsWith("xp_")) {
			const target = parseInt(def.id.split("_")[1]);
			const current = this.storage.get("totalXp") || 0;
			return Math.min(current / target, 1);
		}

		if (def.id.startsWith("streak_")) {
			const target = parseInt(def.id.split("_")[1]);
			const current = (this.storage.get("streak") || {}).current || 0;
			return Math.min(current / target, 1);
		}

		if (def.id.startsWith("files_")) {
			const target = parseInt(def.id.split("_")[1]);
			const current = this.countActions({ stats: data }, "file_create");
			return Math.min(current / target, 1);
		}

		return 0;
	}

	async reset() {
		this.storage.set("achievements", []);
	}
}

module.exports = AchievementSystem;
