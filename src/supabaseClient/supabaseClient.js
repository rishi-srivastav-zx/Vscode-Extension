const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../../.env');
let supabaseUrl = "";
let supabaseKey = "";

if (fs.existsSync(envPath)) {
    console.log("[Supabase] .env file found at:", envPath);
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
                if (key.trim() === 'SUPABASE_URL') supabaseUrl = valueParts.join('=').trim();
                if (key.trim() === 'SUPABASE_KEY') supabaseKey = valueParts.join('=').trim();
            }
        }
    });
    console.log("[Supabase] Loaded URL:", supabaseUrl, "Key length:", supabaseKey.length);
} else {
    console.log("[Supabase] .env file NOT found at:", envPath);
}

const { createClient } = require("@supabase/supabase-js");

const supabase = supabaseUrl && supabaseKey 
    ? createClient(supabaseUrl, supabaseKey) 
    : null;

const isConfigured = () => {
    console.log("[Supabase] isConfigured check:", { supabaseUrl, supabaseKey: supabaseKey ? "***" : null, supabase: !!supabase });
    return supabase !== null;
};

async function syncProgress(userId, progress) {
    if (!supabase) return null;
    
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
    if (!supabase) return [];
    
    const { data, error } = await supabase
        .from('leaderboard')
        .select(`
            *,
            profiles:user_id (username)
        `)
        .order('total_xp', { ascending: false })
        .limit(limit);
    
    if (error) console.error('Leaderboard error:', error);
    return data || [];
}

async function updateLeaderboard(userId, totalXP) {
    if (!supabase) return null;
    
    const { data: existing } = await supabase
        .from('leaderboard')
        .select('id')
        .eq('user_id', userId)
        .eq('period', 'all_time')
        .maybeSingle();
    
    if (existing) {
        const { data, error } = await supabase
            .from('leaderboard')
            .update({
                total_xp: totalXP,
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
