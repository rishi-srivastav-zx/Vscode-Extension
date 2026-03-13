const path = require('path');
const fs = require('fs');

let supabaseUrl = "";
let supabaseKey = "";

function loadFromPackageJson() {
    try {
        const extensionPath = path.join(__dirname, '../..');
        const packageJsonPath = path.join(extensionPath, 'package.json');
        
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const codeCore = packageJson.codeCore || {};
            supabaseUrl = codeCore.supabaseUrl || '';
            supabaseKey = codeCore.supabaseKey || '';
            
            if (supabaseUrl && supabaseKey) {
                console.log("[Supabase] Loaded from package.json. URL:", supabaseUrl.substring(0, 20) + "...");
                return true;
            }
        }
    } catch (e) {
        console.log("[Supabase] Error loading package.json:", e.message);
    }
    return false;
}

loadFromPackageJson();

const { createClient } = require("@supabase/supabase-js");

const supabase = (supabaseUrl && supabaseKey) 
    ? createClient(supabaseUrl, supabaseKey) 
    : null;

const isConfigured = () => {
    console.log("[Supabase] isConfigured check:", { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey, hasSupabase: !!supabase });
    return supabase !== null;
};

const os = require("os");

function getDisplayName() {
    const username = os.userInfo().username;
    const hostname = os.hostname();
    return `${username}@${hostname.substring(0, 8)}`;
}

async function syncProgress(userId, progress) {
    if (!supabase) return null;
    
    const username = progress.username || getDisplayName();
    
    const { data: existing } = await supabase
        .from('user_progress')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
    
    if (existing) {
        const { data, error } = await supabase
            .from('user_progress')
            .update({
                total_xp: progress.totalXP,
                level: progress.level,
                current_streak: progress.streak,
                longest_streak: progress.longestStreak,
                username: username,
                last_active: new Date().toISOString().split('T')[0],
                updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select();
        
        if (error) console.error('Sync error:', error);
        return { data, error };
    } else {
        const { data, error } = await supabase
            .from('user_progress')
            .insert({
                user_id: userId,
                total_xp: progress.totalXP,
                level: progress.level,
                current_streak: progress.streak,
                longest_streak: progress.longestStreak,
                username: username,
                last_active: new Date().toISOString().split('T')[0],
                updated_at: new Date().toISOString()
            })
            .select();
        
        if (error) console.error('Sync error:', error);
        return { data, error };
    }
}

async function getProgress(userId) {
    if (!supabase) return null;
    
    const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .single();
    
    if (error && error.code !== 'PGRST116') console.error('Get progress error:', error);
    return { data, error };
}

async function syncAchievements(userId, achievements) {
    if (!supabase) return null;
    
    const records = achievements.map(a => ({
        user_id: userId,
        achievement_key: a.key,
        unlocked_at: new Date().toISOString()
    }));
    
    const { data, error } = await supabase
        .from('achievements')
        .upsert(records, { onConflict: 'user_id,achievement_key' })
        .select();
    
    if (error) console.error('Sync achievements error:', error);
    return { data, error };
}

async function getLeaderboard(limit = 10) {
    if (!supabase) {
        return { error: "Supabase not configured", data: [] };
    }
    
    try {
        const { data, error } = await supabase
            .from('leaderboard')
            .select('*')
            .eq('period', 'all_time')
            .order('total_xp', { ascending: false })
            .limit(limit);
        
        if (error) {
            console.error('Leaderboard error:', error);
            return { error: error.message, data: [] };
        }
        return { error: null, data: data || [] };
    } catch (err) {
        console.error('Leaderboard exception:', err);
        return { error: err.message, data: [] };
    }
}

async function updateLeaderboard(userId, totalXP, level = 1, username = null) {
    if (!supabase) {
        console.log("[Supabase] updateLeaderboard: supabase is null");
        return null;
    }
    
    const displayName = username || getDisplayName();
    console.log("[Supabase] updateLeaderboard called:", { userId, totalXP, level, username: displayName });
    
    const { data: existing } = await supabase
        .from('leaderboard')
        .select('id')
        .eq('user_id', userId)
        .eq('period', 'all_time')
        .maybeSingle();
    
    console.log("[Supabase] Existing record:", existing);
    
    if (existing) {
        const { data, error } = await supabase
            .from('leaderboard')
            .update({
                total_xp: totalXP,
                level: level,
                username: displayName,
                updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select();
        
        if (error) console.error('Leaderboard update error:', error);
        return { data, error };
    } else {
        const { data, error } = await supabase
            .from('leaderboard')
            .insert({
                user_id: userId,
                total_xp: totalXP,
                level: level,
                username: displayName,
                period: 'all_time',
                updated_at: new Date().toISOString()
            })
            .select();
        
        if (error) console.error('Leaderboard insert error:', error);
        return { data, error };
    }
}

async function getUserId() {
    if (!supabase) return null;
    
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
}

module.exports = {
    supabase,
    isConfigured,
    syncProgress,
    getProgress,
    syncAchievements,
    getLeaderboard,
    updateLeaderboard,
    getUserId
};
