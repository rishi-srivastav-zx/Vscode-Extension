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

		// Update or create profile with username
		await supabase
			.from("profiles")
			.upsert(
				{
					id: userId,
					username: username,
					updated_at: new Date().toISOString(),
				},
				{ onConflict: "id" },
			)
			.select();

		// Get or create user_progress record
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
			last_active: new Date().toISOString(),
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
			.select(
				"rank,username,avatar_url,total_xp,level,current_streak,longest_streak,lines_written,files_saved,user_id",
			)
			.limit(limit);

		return { data: data || [], error };
	} catch (err) {
		console.error("[Supabase] getLeaderboard error:", err);
		return { data: [], error: err.message };
	}
}

/**
 * Update user profile (for leaderboard display)
 */
async function updateLeaderboard(userId, totalXP, level = 1, username = null) {
	if (!supabase) return { data: null, error: "Supabase not configured" };

	try {
		const displayName = username || getDisplayName();

		// Update or create profile with username
		const { data: profileData, error: profileError } = await supabase
			.from("profiles")
			.upsert(
				{
					id: userId,
					username: displayName,
					updated_at: new Date().toISOString(),
				},
				{ onConflict: "id" },
			)
			.select();

		if (profileError) {
			console.error("[Supabase] Profile update error:", profileError);
			return { data: null, error: profileError };
		}

		// The leaderboard view will automatically reflect changes from user_progress
		// which was already updated via addXP or syncProgress
		return { data: profileData, error: null };
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

/**
 * Add XP and automatically calculate level-up via database function
 */
async function addXP(userId, xpAmount, reason, metadata = null) {
	if (!supabase) return { data: null, error: "Supabase not configured" };

	try {
		const { data, error } = await supabase.rpc("add_xp_and_update_level", {
			p_user_id: userId,
			p_xp_amount: xpAmount,
			p_reason: reason,
			p_metadata: metadata,
		});

		if (error) {
			console.error("[Supabase] addXP error:", error);
			return { data: null, error };
		}

		return { data, error: null };
	} catch (err) {
		console.error("[Supabase] addXP exception:", err);
		return { data: null, error: err.message };
	}
}

/**
 * Update user's daily streak via database function
 */
async function updateStreak(userId) {
	if (!supabase) return { data: null, error: "Supabase not configured" };

	try {
		const { data, error } = await supabase.rpc("update_streak", {
			p_user_id: userId,
		});

		if (error) {
			console.error("[Supabase] updateStreak error:", error);
			return { data: null, error };
		}

		return { data, error: null };
	} catch (err) {
		console.error("[Supabase] updateStreak exception:", err);
		return { data: null, error: err.message };
	}
}

/**
 * Reset streaks for all inactive users (call on startup)
 */
async function resetInactiveStreaks() {
	if (!supabase) return { error: "Supabase not configured" };

	try {
		const { error } = await supabase.rpc("reset_inactive_streaks");

		if (error) {
			console.error("[Supabase] resetInactiveStreaks error:", error);
			return { error };
		}

		return { error: null };
	} catch (err) {
		console.error("[Supabase] resetInactiveStreaks exception:", err);
		return { error: err.message };
	}
}

/**
 * Create or get user profile
 */
async function createOrGetProfile(userId, username) {
	if (!supabase) return { data: null, error: "Supabase not configured" };

	try {
		// Check if profile exists
		const { data: existing, error: fetchError } = await supabase
			.from("profiles")
			.select("id")
			.eq("id", userId)
			.maybeSingle();

		if (fetchError) {
			console.error("[Supabase] Profile fetch error:", fetchError);
			return { data: null, error: fetchError };
		}

		if (existing) {
			return { data: existing, error: null };
		}

		// Create new profile
		const { data: newProfile, error: createError } = await supabase
			.from("profiles")
			.insert([
				{
					id: userId,
					username: username,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
			])
			.select()
			.single();

		if (createError) {
			console.error("[Supabase] Profile creation error:", createError);
			return { data: null, error: createError };
		}

		// Create associated progress record
		const { error: progressError } = await supabase
			.from("user_progress")
			.insert([
				{
					user_id: userId,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
			]);

		if (progressError) {
			console.error("[Supabase] Progress creation error:", progressError);
		}

		return { data: newProfile, error: null };
	} catch (err) {
		console.error("[Supabase] createOrGetProfile exception:", err);
		return { data: null, error: err.message };
	}
}

/**
 * Log achievement unlock
 */
async function logAchievement(userId, achievementKey) {
	if (!supabase) return { data: null, error: "Supabase not configured" };

	try {
		const { data, error } = await supabase
			.from("achievements")
			.upsert([
				{
					user_id: userId,
					achievement_key: achievementKey,
					unlocked_at: new Date().toISOString(),
				},
			])
			.select();

		return { data, error };
	} catch (err) {
		console.error("[Supabase] logAchievement error:", err);
		return { data: null, error: err.message };
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
	addXP,
	updateStreak,
	resetInactiveStreaks,
	createOrGetProfile,
	logAchievement,
	getDisplayName,
};
