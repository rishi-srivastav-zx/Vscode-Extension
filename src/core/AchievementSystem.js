class AchievementSystem {
	constructor(storage) {
		this.storage = storage;
		this.definitions = this.loadDefinitions();
	}

	loadDefinitions() {
		return [
			// ── XP VOLUME ─────────────────────────────────────────────────
			{
				id: "xp_100",
				name: "First Steps",
				desc: "Earn 100 XP",
				icon: "◆",
				condition: (s) => s.totalXp >= 100,
			},
			{
				id: "xp_500",
				name: "Getting Going",
				desc: "Earn 500 XP",
				icon: "◆",
				condition: (s) => s.totalXp >= 500,
			},
			{
				id: "xp_1k",
				name: "Century Mark",
				desc: "Earn 1,000 XP",
				icon: "◆",
				condition: (s) => s.totalXp >= 1000,
			},
			{
				id: "xp_5k",
				name: "Grinder",
				desc: "Earn 5,000 XP",
				icon: "◆",
				condition: (s) => s.totalXp >= 5000,
			},
			{
				id: "xp_10k",
				name: "Ten Thousand",
				desc: "Earn 10,000 XP",
				icon: "◆",
				rare: true,
				condition: (s) => s.totalXp >= 10000,
			},
			{
				id: "xp_25k",
				name: "Quarter Million",
				desc: "Earn 25,000 XP",
				icon: "◆",
				rare: true,
				condition: (s) => s.totalXp >= 25000,
			},
			{
				id: "xp_50k",
				name: "Half Century",
				desc: "Earn 50,000 XP",
				icon: "◆",
				epic: true,
				condition: (s) => s.totalXp >= 50000,
			},
			{
				id: "xp_100k",
				name: "Centurion",
				desc: "Earn 100,000 XP",
				icon: "◆",
				epic: true,
				condition: (s) => s.totalXp >= 100000,
			},
			{
				id: "xp_500k",
				name: "Half Million",
				desc: "Earn 500,000 XP",
				icon: "◆",
				legendary: true,
				condition: (s) => s.totalXp >= 500000,
			},
			{
				id: "xp_1m",
				name: "XP Millionaire",
				desc: "Earn 1,000,000 XP",
				icon: "◆",
				legendary: true,
				condition: (s) => s.totalXp >= 1000000,
			},

			// ── STREAK ────────────────────────────────────────────────────
			{
				id: "streak_2",
				name: "Back to Back",
				desc: "2 day streak",
				icon: "🔥",
				condition: (s, d) => d.streak.current >= 2,
			},
			{
				id: "streak_3",
				name: "Building Habit",
				desc: "3 day streak",
				icon: "🔥",
				condition: (s, d) => d.streak.current >= 3,
			},
			{
				id: "streak_7",
				name: "Week Warrior",
				desc: "7 day streak",
				icon: "🔥",
				rare: true,
				condition: (s, d) => d.streak.current >= 7,
			},
			{
				id: "streak_14",
				name: "Fortnight Fire",
				desc: "14 day streak",
				icon: "🔥",
				rare: true,
				condition: (s, d) => d.streak.current >= 14,
			},
			{
				id: "streak_30",
				name: "Monthly Master",
				desc: "30 day streak",
				icon: "🔥",
				epic: true,
				condition: (s, d) => d.streak.current >= 30,
			},
			{
				id: "streak_60",
				name: "Two Months",
				desc: "60 day streak",
				icon: "🔥",
				epic: true,
				condition: (s, d) => d.streak.current >= 60,
			},
			{
				id: "streak_100",
				name: "Unstoppable",
				desc: "100 day streak",
				icon: "🔥",
				legendary: true,
				condition: (s, d) => d.streak.current >= 100,
			},
			{
				id: "streak_365",
				name: "Year of Code",
				desc: "365 day streak",
				icon: "🔥",
				legendary: true,
				condition: (s, d) => d.streak.current >= 365,
			},

			// ── LEVELS ────────────────────────────────────────────────────
			{
				id: "level_2",
				name: "Level Up",
				desc: "Reach level 2",
				icon: "⭐",
				condition: (s) => s.level >= 2,
			},
			{
				id: "level_5",
				name: "Rising Star",
				desc: "Reach level 5",
				icon: "⭐",
				condition: (s) => s.level >= 5,
			},
			{
				id: "level_10",
				name: "Expert Dev",
				desc: "Reach level 10",
				icon: "⭐",
				rare: true,
				condition: (s) => s.level >= 10,
			},
			{
				id: "level_15",
				name: "Senior Dev",
				desc: "Reach level 15",
				icon: "⭐",
				rare: true,
				condition: (s) => s.level >= 15,
			},
			{
				id: "level_20",
				name: "Grandmaster",
				desc: "Reach level 20",
				icon: "⭐",
				epic: true,
				condition: (s) => s.level >= 20,
			},
			{
				id: "level_30",
				name: "Elite Coder",
				desc: "Reach level 30",
				icon: "⭐",
				epic: true,
				condition: (s) => s.level >= 30,
			},
			{
				id: "level_50",
				name: "Legendary Dev",
				desc: "Reach level 50",
				icon: "⭐",
				legendary: true,
				condition: (s) => s.level >= 50,
			},
			{
				id: "level_99",
				name: "Max Prestige",
				desc: "Reach level 99",
				icon: "⭐",
				legendary: true,
				condition: (s) => s.level >= 99,
			},

			// ── FILE ACTIONS ──────────────────────────────────────────────
			{
				id: "files_1",
				name: "Hello World",
				desc: "Create your first file",
				icon: "📄",
				condition: (s) => this.countActions(s, "file_create") >= 1,
			},
			{
				id: "files_10",
				name: "File Maker",
				desc: "Create 10 files",
				icon: "📄",
				condition: (s) => this.countActions(s, "file_create") >= 10,
			},
			{
				id: "files_50",
				name: "Prolific",
				desc: "Create 50 files",
				icon: "📄",
				condition: (s) => this.countActions(s, "file_create") >= 50,
			},
			{
				id: "files_100",
				name: "File Creator",
				desc: "Create 100 files",
				icon: "📄",
				rare: true,
				condition: (s) => this.countActions(s, "file_create") >= 100,
			},
			{
				id: "files_500",
				name: "Mass Producer",
				desc: "Create 500 files",
				icon: "📄",
				epic: true,
				condition: (s) => this.countActions(s, "file_create") >= 500,
			},
			{
				id: "files_1k",
				name: "File Factory",
				desc: "Create 1,000 files",
				icon: "📄",
				legendary: true,
				condition: (s) => this.countActions(s, "file_create") >= 1000,
			},

			// ── SAVES ─────────────────────────────────────────────────────
			{
				id: "saves_10",
				name: "Safe Keeper",
				desc: "Save 10 files",
				icon: "💾",
				condition: (s) => this.countActions(s, "file_save") >= 10,
			},
			{
				id: "saves_100",
				name: "Saver",
				desc: "Save 100 files",
				icon: "💾",
				condition: (s) => this.countActions(s, "file_save") >= 100,
			},
			{
				id: "saves_500",
				name: "Ctrl+S Addict",
				desc: "Save 500 files",
				icon: "💾",
				rare: true,
				condition: (s) => this.countActions(s, "file_save") >= 500,
			},
			{
				id: "saves_1k",
				name: "Save Master",
				desc: "Save 1,000 files",
				icon: "💾",
				epic: true,
				condition: (s) => this.countActions(s, "file_save") >= 1000,
			},
			{
				id: "saves_10k",
				name: "Obsessive Saver",
				desc: "Save 10,000 files",
				icon: "💾",
				legendary: true,
				condition: (s) => this.countActions(s, "file_save") >= 10000,
			},

			// ── BUG FIXES ─────────────────────────────────────────────────
			{
				id: "fixes_1",
				name: "Debugger",
				desc: "Fix your first error",
				icon: "🐛",
				condition: (s) => this.countActions(s, "error_fix") >= 1,
			},
			{
				id: "fixes_10",
				name: "Bug Squasher",
				desc: "Fix 10 errors",
				icon: "🐛",
				condition: (s) => this.countActions(s, "error_fix") >= 10,
			},
			{
				id: "fixes_50",
				name: "Bug Hunter",
				desc: "Fix 50 errors",
				icon: "🐛",
				rare: true,
				condition: (s) => this.countActions(s, "error_fix") >= 50,
			},
			{
				id: "fixes_200",
				name: "Exterminator",
				desc: "Fix 200 errors",
				icon: "🐛",
				epic: true,
				condition: (s) => this.countActions(s, "error_fix") >= 200,
			},
			{
				id: "fixes_1k",
				name: "Bug Slayer",
				desc: "Fix 1,000 errors",
				icon: "🐛",
				legendary: true,
				condition: (s) => this.countActions(s, "error_fix") >= 1000,
			},

			// ── COMMITS ───────────────────────────────────────────────────
			{
				id: "commits_1",
				name: "First Commit",
				desc: "Make your first commit",
				icon: "⛓",
				condition: (s) => this.countActions(s, "commit") >= 1,
			},
			{
				id: "commits_10",
				name: "Committer",
				desc: "Make 10 commits",
				icon: "⛓",
				condition: (s) => this.countActions(s, "commit") >= 10,
			},
			{
				id: "commits_50",
				name: "Git Pusher",
				desc: "Make 50 commits",
				icon: "⛓",
				condition: (s) => this.countActions(s, "commit") >= 50,
			},
			{
				id: "commits_100",
				name: "Commit Machine",
				desc: "Make 100 commits",
				icon: "⛓",
				rare: true,
				condition: (s) => this.countActions(s, "commit") >= 100,
			},
			{
				id: "commits_500",
				name: "Version King",
				desc: "Make 500 commits",
				icon: "⛓",
				epic: true,
				condition: (s) => this.countActions(s, "commit") >= 500,
			},
			{
				id: "commits_1k",
				name: "Git Legend",
				desc: "Make 1,000 commits",
				icon: "⛓",
				legendary: true,
				condition: (s) => this.countActions(s, "commit") >= 1000,
			},

			// ── DELETIONS ─────────────────────────────────────────────────
			{
				id: "deletes_10",
				name: "Clean Coder",
				desc: "Delete 10 files",
				icon: "🗑",
				condition: (s) => this.countActions(s, "file_delete") >= 10,
			},
			{
				id: "deletes_100",
				name: "Minimalist",
				desc: "Delete 100 files",
				icon: "🗑",
				rare: true,
				condition: (s) => this.countActions(s, "file_delete") >= 100,
			},
			{
				id: "deletes_500",
				name: "The Purge",
				desc: "Delete 500 files",
				icon: "🗑",
				epic: true,
				condition: (s) => this.countActions(s, "file_delete") >= 500,
			},

			// ── SEARCHES ─────────────────────────────────────────────────
			{
				id: "search_50",
				name: "Seeker",
				desc: "Search 50 times",
				icon: "🔍",
				condition: (s) => this.countActions(s, "search") >= 50,
			},
			{
				id: "search_500",
				name: "Search Engine",
				desc: "Search 500 times",
				icon: "🔍",
				rare: true,
				condition: (s) => this.countActions(s, "search") >= 500,
			},
			{
				id: "search_5k",
				name: "Grep Master",
				desc: "Search 5,000 times",
				icon: "🔍",
				epic: true,
				condition: (s) => this.countActions(s, "search") >= 5000,
			},

			// ── TERMINALS ────────────────────────────────────────────────
			{
				id: "terminal_10",
				name: "CLI Curious",
				desc: "Run 10 terminal commands",
				icon: "💻",
				condition: (s) => this.countActions(s, "terminal") >= 10,
			},
			{
				id: "terminal_100",
				name: "Shell Jockey",
				desc: "Run 100 terminal commands",
				icon: "💻",
				rare: true,
				condition: (s) => this.countActions(s, "terminal") >= 100,
			},
			{
				id: "terminal_1k",
				name: "Terminal God",
				desc: "Run 1,000 commands",
				icon: "💻",
				epic: true,
				condition: (s) => this.countActions(s, "terminal") >= 1000,
			},

			// ── REFACTORING ──────────────────────────────────────────────
			{
				id: "refactor_10",
				name: "Tidier",
				desc: "Refactor 10 times",
				icon: "♻️",
				condition: (s) => this.countActions(s, "refactor") >= 10,
			},
			{
				id: "refactor_50",
				name: "Code Sculptor",
				desc: "Refactor 50 times",
				icon: "♻️",
				rare: true,
				condition: (s) => this.countActions(s, "refactor") >= 50,
			},
			{
				id: "refactor_200",
				name: "Architect",
				desc: "Refactor 200 times",
				icon: "♻️",
				epic: true,
				condition: (s) => this.countActions(s, "refactor") >= 200,
			},

			// ── SESSION TIME ─────────────────────────────────────────────
			{
				id: "session_30m",
				name: "Warm Up",
				desc: "Code for 30 minutes",
				icon: "⏱",
				condition: (s) => this.checkMaxSession(s, 30),
			},
			{
				id: "session_2h",
				name: "In the Zone",
				desc: "Code for 2 hours",
				icon: "⏱",
				condition: (s) => this.checkMaxSession(s, 120),
			},
			{
				id: "session_4h",
				name: "Deep Work",
				desc: "Code for 4 hours",
				icon: "⏱",
				rare: true,
				condition: (s) => this.checkMaxSession(s, 240),
			},
			{
				id: "session_8h",
				name: "Marathon",
				desc: "Code for 8 hours straight",
				icon: "⏱",
				epic: true,
				condition: (s) => this.checkMaxSession(s, 480),
			},
			{
				id: "session_12h",
				name: "No Sleep",
				desc: "Code for 12 hours",
				icon: "⏱",
				legendary: true,
				condition: (s) => this.checkMaxSession(s, 720),
			},

			// ── TOTAL TIME ───────────────────────────────────────────────
			{
				id: "time_1h",
				name: "Hour One",
				desc: "1 total hour coded",
				icon: "🕐",
				condition: (s) => this.getTotalMinutes(s) >= 60,
			},
			{
				id: "time_10h",
				name: "Ten Hours",
				desc: "10 total hours coded",
				icon: "🕐",
				condition: (s) => this.getTotalMinutes(s) >= 600,
			},
			{
				id: "time_50h",
				name: "Fifty Hours",
				desc: "50 total hours coded",
				icon: "🕐",
				rare: true,
				condition: (s) => this.getTotalMinutes(s) >= 3000,
			},
			{
				id: "time_100h",
				name: "Century Hours",
				desc: "100 total hours coded",
				icon: "🕐",
				epic: true,
				condition: (s) => this.getTotalMinutes(s) >= 6000,
			},
			{
				id: "time_500h",
				name: "Half Thousand",
				desc: "500 total hours coded",
				icon: "🕐",
				legendary: true,
				condition: (s) => this.getTotalMinutes(s) >= 30000,
			},
			{
				id: "time_1kh",
				name: "1,000 Hours",
				desc: "1,000 total hours coded",
				icon: "🕐",
				legendary: true,
				condition: (s) => this.getTotalMinutes(s) >= 60000,
			},

			// ── LANGUAGES ────────────────────────────────────────────────
			{
				id: "lang_3",
				name: "Polyglot",
				desc: "Code in 3 languages",
				icon: "🌐",
				condition: (s) => this.countLanguages(s) >= 3,
			},
			{
				id: "lang_5",
				name: "Multilingual",
				desc: "Code in 5 languages",
				icon: "🌐",
				rare: true,
				condition: (s) => this.countLanguages(s) >= 5,
			},
			{
				id: "lang_10",
				name: "Language Collector",
				desc: "Code in 10 languages",
				icon: "🌐",
				epic: true,
				condition: (s) => this.countLanguages(s) >= 10,
			},

			// ── SPECIAL / HIDDEN ─────────────────────────────────────────
			{
				id: "night_owl",
				name: "Night Owl",
				desc: "Code at 3 AM",
				icon: "🌙",
				hidden: true,
				condition: (s) => this.checkHour(s, 3),
			},
			{
				id: "early_bird",
				name: "Early Bird",
				desc: "Code at 6 AM",
				icon: "🌅",
				hidden: true,
				condition: (s) => this.checkHour(s, 6),
			},
			{
				id: "lunch_coder",
				name: "No Lunch Break",
				desc: "Code at noon",
				icon: "🍔",
				hidden: true,
				condition: (s) => this.checkHour(s, 12),
			},
			{
				id: "weekend",
				name: "Weekend Warrior",
				desc: "Code on a weekend",
				icon: "📅",
				hidden: true,
				condition: (s) => this.checkWeekend(s),
			},
			{
				id: "new_year",
				name: "New Year Coder",
				desc: "Code on Jan 1st",
				icon: "🎆",
				hidden: true,
				condition: (s) => this.checkDate(s, 1, 1),
			},
			{
				id: "xmas",
				name: "Coding Christmas",
				desc: "Code on Dec 25th",
				icon: "🎄",
				hidden: true,
				condition: (s) => this.checkDate(s, 12, 25),
			},
			{
				id: "friday_13",
				name: "Unlucky Dev",
				desc: "Code on Friday the 13th",
				icon: "🖤",
				hidden: true,
				condition: (s) => this.checkFriday13(s),
			},
			{
				id: "palindrome",
				name: "Palindrome",
				desc: "Earn exactly 1,001 XP",
				icon: "🔢",
				hidden: true,
				condition: (s) => s.totalXp === 1001,
			},
			{
				id: "no_errors",
				name: "Flawless",
				desc: "Code 1hr with no errors",
				icon: "✨",
				hidden: true,
				condition: (s) => this.checkFlawlessHour(s),
			},
			{
				id: "comeback",
				name: "Comeback Kid",
				desc: "Return after 7+ day break",
				icon: "🔄",
				hidden: true,
				condition: (s, d) => this.checkComeback(s, d),
			},

			// ── MILESTONE COMBOS ─────────────────────────────────────────
			{
				id: "triple_threat",
				name: "Triple Threat",
				desc: "7 streak + level 5 + 1k XP",
				icon: "🎯",
				rare: true,
				condition: (s, d) =>
					d.streak.current >= 7 && s.level >= 5 && s.totalXp >= 1000,
			},
			{
				id: "the_complete",
				name: "The Complete",
				desc: "30 streak + level 20 + 50k XP",
				icon: "👑",
				legendary: true,
				condition: (s, d) =>
					d.streak.current >= 30 &&
					s.level >= 20 &&
					s.totalXp >= 50000,
			},
		];
	}

	// ── HELPERS ───────────────────────────────────────────────────────────────

	countActions(stats, source) {
		if (!stats.stats?.actions) return 0;
		return stats.stats.actions.filter((a) => a.source === source).length;
	}

	checkHour(stats, hour) {
		if (!stats.stats?.actions) return false;
		return stats.stats.actions.some(
			(a) => new Date(a.timestamp).getHours() === hour,
		);
	}

	checkMaxSession(stats, minutes) {
		if (!stats.stats?.daily) return false;
		return Object.values(stats.stats.daily).some(
			(d) => (d.activeMinutes || 0) >= minutes,
		);
	}

	getTotalMinutes(stats) {
		if (!stats.stats?.daily) return 0;
		return Object.values(stats.stats.daily).reduce(
			(sum, d) => sum + (d.activeMinutes || 0),
			0,
		);
	}

	countLanguages(stats) {
		if (!stats.stats?.actions) return 0;
		const langs = new Set(
			stats.stats.actions
				.filter((a) => a.language)
				.map((a) => a.language),
		);
		return langs.size;
	}

	checkWeekend(stats) {
		if (!stats.stats?.actions) return false;
		return stats.stats.actions.some((a) => {
			const day = new Date(a.timestamp).getDay();
			return day === 0 || day === 6;
		});
	}

	checkDate(stats, month, day) {
		if (!stats.stats?.actions) return false;
		return stats.stats.actions.some((a) => {
			const d = new Date(a.timestamp);
			return d.getMonth() + 1 === month && d.getDate() === day;
		});
	}

	checkFriday13(stats) {
		if (!stats.stats?.actions) return false;
		return stats.stats.actions.some((a) => {
			const d = new Date(a.timestamp);
			return d.getDay() === 5 && d.getDate() === 13;
		});
	}

	checkFlawlessHour(stats) {
		if (!stats.stats?.daily) return false;
		return Object.values(stats.stats.daily).some(
			(d) => (d.activeMinutes || 0) >= 60 && (d.errors || 0) === 0,
		);
	}

	checkComeback(stats, data) {
		const streak = data?.streak;
		if (!streak) return false;
		return (streak.lastBreak || 0) >= 7 && streak.current >= 1;
	}

	// ── CORE METHODS ──────────────────────────────────────────────────────────

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
			try {
				if (def.condition(data, { streak: data.streak })) {
					unlocked.push(def.id);
					newUnlocks.push(def);
				}
			} catch (_) {
				// skip broken conditions silently
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
		const data = this.storage.get("stats");
		const totalXp = this.storage.get("totalXp") || 0;
		const streak = (this.storage.get("streak") || {}).current || 0;
		const level = this.storage.get("level") || 0;

		const targets = {
			xp_: { val: totalXp, mult: 1 },
			streak_: { val: streak, mult: 1 },
			level_: { val: level, mult: 1 },
			files_: {
				val: this.countActions({ stats: data }, "file_create"),
				mult: 1,
			},
			saves_: {
				val: this.countActions({ stats: data }, "file_save"),
				mult: 1,
			},
			fixes_: {
				val: this.countActions({ stats: data }, "error_fix"),
				mult: 1,
			},
			commits_: {
				val: this.countActions({ stats: data }, "commit"),
				mult: 1,
			},
			deletes_: {
				val: this.countActions({ stats: data }, "file_delete"),
				mult: 1,
			},
			search_: {
				val: this.countActions({ stats: data }, "search"),
				mult: 1,
			},
			terminal_: {
				val: this.countActions({ stats: data }, "terminal"),
				mult: 1,
			},
			refactor_: {
				val: this.countActions({ stats: data }, "refactor"),
				mult: 1,
			},
			time_: { val: this.getTotalMinutes({ stats: data }), mult: 60 },
			lang_: { val: this.countLanguages({ stats: data }), mult: 1 },
		};

		for (const [prefix, { val, mult }] of Object.entries(targets)) {
			if (def.id.startsWith(prefix)) {
				const rawTarget = def.id
					.replace(prefix, "")
					.replace("k", "000")
					.replace("m", "000000");
				const target = parseFloat(rawTarget) * mult;
				return Math.min(val / target, 1);
			}
		}

		return 0;
	}

	// Grouped summary for UI display
	getSummary() {
		const all = this.getAllAchievements();
		return {
			total: all.length,
			unlocked: all.filter((a) => a.unlocked).length,
			legendary: all.filter((a) => a.legendary && a.unlocked).length,
			epic: all.filter((a) => a.epic && a.unlocked).length,
			rare: all.filter((a) => a.rare && a.unlocked).length,
			hidden: all.filter((a) => a.hidden && a.unlocked).length,
		};
	}

	async reset() {
		this.storage.set("achievements", []);
	}
}

module.exports = AchievementSystem;
