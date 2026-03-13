"use strict";

const path = require("path");
const fs = require("fs");
const os = require("os");
const { createClient } = require("@supabase/supabase-js");

let supabaseUrl = "";
let supabaseKey = "";
let supabase = null;

/**
 * Load Supabase config from package.json
 */
function loadConfig() {
	try {
		const extensionRoot = path.join(__dirname, "../..");
		const packageJsonPath = path.join(extensionRoot, "package.json");

		if (!fs.existsSync(packageJsonPath)) {
			console.log("[Supabase] package.json not found");
			return;
		}

		const packageJson = JSON.parse(
			fs.readFileSync(packageJsonPath, "utf8"),
		);

		const codeCore = packageJson.codeCore || {};

		supabaseUrl = codeCore.supabaseUrl || "";
		supabaseKey = codeCore.supabaseKey || "";

		if (supabaseUrl && supabaseKey) {
			supabase = createClient(supabaseUrl, supabaseKey);
			console.log("[Supabase] Config loaded successfully");
		} else {
			console.log("[Supabase] Missing configuration");
		}
	} catch (err) {
		console.error("[Supabase] Config load error:", err.message);
	}
}

loadConfig();

/**
 * Check if Supabase is configured
 */
function isConfigured() {
	return !!supabase;
}

/**
 * Generate display name
 */
function getDisplayName() {
	const username = os.userInfo().username;
	const hostname = os.hostname();
	return `${username}@${hostname.substring(0, 8)}`;
}

/**
 * Sync user progress
 */
async function syncProgress(userId, progress) {
	if (!supabase) return { data: null, error: "Supabase not configured" };

	try {
		const username = progress.username || getDisplayName();

		const { data: existing } = await supabase
			.from("user_progress")
			.select("id")
			.eq("user_id", userId)
			.maybeSingle();

		const payload = {
			total_xp: progress.totalXP,
			level: progress.level,
			current_streak: progress.streak,
			longest_streak: progress.longestStreak,
			username: username,
			last_active: new Date().toISOString().split("T")[0],
			updated_at: new Date().toISOString(),
		};

		if (existing) {
			const { data, error } = await supabase
				.from("user_progress")
				.update(payload)
				.eq("id", existing.id)
				.select();

			return { data, error };
		} else {
			const { data, error } = await supabase
				.from("user_progress")
				.insert({
					user_id: userId,
					...payload,
				})
				.select();

			return { data, error };
		}
	} catch (err) {
		console.error("[Supabase] syncProgress error:", err);
		return { data: null, error: err.message };
	}
}

/**
 * Get user progress
 */
async function getProgress(userId) {
	if (!supabase) return { data: null, error: "Supabase not configured" };

	try {
		const { data, error } = await supabase
			.from("user_progress")
			.select("*")
			.eq("user_id", userId)
			.maybeSingle();

		return { data, error };
	} catch (err) {
		console.error("[Supabase] getProgress error:", err);
		return { data: null, error: err.message };
	}
}

/**
 * Sync achievements
 */
async function syncAchievements(userId, achievements) {
	if (!supabase) return { data: null, error: "Supabase not configured" };

	try {
		const records = achievements.map((a) => ({
			user_id: userId,
			achievement_key: a.key,
			unlocked_at: new Date().toISOString(),
		}));

		const { data, error } = await supabase
			.from("achievements")
			.upsert(records, { onConflict: "user_id,achievement_key" })
			.select();

		return { data, error };
	} catch (err) {
		console.error("[Supabase] syncAchievements error:", err);
		return { data: null, error: err.message };
	}
}

/**
 * Fetch leaderboard
 */
async function getLeaderboard(limit = 10) {
	if (!supabase) {
		return { data: [], error: "Supabase not configured" };
	}

	try {
		const { data, error } = await supabase
			.from("leaderboard")
			.select("*")
			.eq("period", "all_time")
			.order("total_xp", { ascending: false })
			.limit(limit);

		return { data: data || [], error };
	} catch (err) {
		console.error("[Supabase] getLeaderboard error:", err);
		return { data: [], error: err.message };
	}
}

/**
 * Update leaderboard entry
 */
async function updateLeaderboard(userId, totalXP, level = 1, username = null) {
	if (!supabase) return { data: null, error: "Supabase not configured" };

	try {
		const displayName = username || getDisplayName();

		const { data: existing } = await supabase
			.from("leaderboard")
			.select("id")
			.eq("user_id", userId)
			.eq("period", "all_time")
			.maybeSingle();

		const payload = {
			total_xp: totalXP,
			level: level,
			username: displayName,
			updated_at: new Date().toISOString(),
		};

		if (existing) {
			const { data, error } = await supabase
				.from("leaderboard")
				.update(payload)
				.eq("id", existing.id)
				.select();

			return { data, error };
		} else {
			const { data, error } = await supabase
				.from("leaderboard")
				.insert({
					user_id: userId,
					period: "all_time",
					...payload,
				})
				.select();

			return { data, error };
		}
	} catch (err) {
		console.error("[Supabase] updateLeaderboard error:", err);
		return { data: null, error: err.message };
	}
}

/**
 * Get Supabase Auth User (optional)
 */
async function getUserId() {
	if (!supabase) return null;

	try {
		const { data } = await supabase.auth.getUser();
		return data?.user?.id || null;
	} catch (err) {
		console.error("[Supabase] getUserId error:", err);
		return null;
	}
}

module.exports = {
	supabase,
	isConfigured,
	syncProgress,
	getProgress,
	syncAchievements,
	getLeaderboard,
	updateLeaderboard,
	getUserId,
};
