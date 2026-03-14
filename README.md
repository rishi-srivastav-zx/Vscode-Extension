# CODE CORE

**Gamified coding experience for VS Code.** Level up your development with XP, achievements, streaks, and global leaderboards.

Transform your daily coding into an engaging RPG-style progression system. Compete with developers worldwide, unlock achievements, and watch your skill level grow.

---

## ✨ Features

### 🎮 Core Progression

- **XP System** - Earn experience points for every coding activity
- **Dynamic Leveling** - Progress through 100+ levels with cumulative XP requirements
- **Level Unlocks** - Unlock titles, themes, and mystery boxes at milestones
- **Real-time Progress Bar** - Visual feedback of your journey to the next level

### 🔥 Streaks & Rewards

- **Daily Streaks** - Maintain consecutive days of coding activity
- **Streak Rewards** - Earn boosts and mystery boxes at milestones (7, 14, 21, 30, etc.)
- **Daily Bonus XP** - Claim rewards based on your current streak
- **Streak Freeze** - Use freezes to protect your streak (limited use)

### 🏆 Achievements

- **50+ Unlockable Achievements** - From "First Steps" (100 XP) to "XP Millionaire" (1M XP)
- **Milestone Tracking** - Achievement progress displayed in real-time
- **Rarity Tiers** - Common, Rare, Epic, and Legendary achievements
- **Achievement Showcase** - Display your accomplishments in the sidebar

### 🌍 Leaderboard

- **Global Rankings** - See your rank among all players (powered by Supabase)
- **Real-time Updates** - Leaderboard syncs with every action
- **Top Players** - View top 100 developers by total XP
- **Personal Stats** - Check your rank, XP, level, and streaks

### 🎁 Rewards System

- **Mystery Boxes** - Unlock at levels and streaks
    - Bronze (Level 3) - 1.05x XP boost
    - Silver (Level 7) - 1.1x XP boost
    - Gold (Level 15) - 1.2x XP boost
- **XP Multipliers** - Stack boosts for up to 5x XP
- **Temporary Boosts** - Duration-based power-ups

### 🔊 Polish & UX

- **Sound Effects** - Audio feedback for all actions (toggleable)
- **Status Bar Widget** - Quick-glance stats in VS Code's status bar
- **Smooth Animations** - Modern UI with gradient effects
- **Dark Theme** - Eye-friendly dark interface

---

## 🚀 Quick Start

### Installation

1. **Install from VS Code Marketplace**
    - Open VS Code → Extensions (Ctrl+Shift+X)
    - Search "CODE CORE"
    - Click Install

2. **Start Earning XP**
    - Open any file and start coding
    - XP is earned automatically for:
        - 💾 **Save file**: +5 XP
        - ✨ **Create file**: +10 XP
        - 🐛 **Fix error**: +20 XP per error fixed
        - 📦 **Git commit**: +50 XP

3. **View Progress**
    - Click the CODE CORE icon in the activity bar
    - Watch your XP and level grow in real-time

---

## 🌐 Supabase Setup (For Leaderboard)

To enable global leaderboards and sync progress across devices:

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for project to be ready

### Step 2: Deploy Database Schema

1. Go to **SQL Editor** in Supabase dashboard
2. Copy-paste this entire schema:

```sql
-- ============================================
-- CODE CORE — Database Schema
-- ============================================

-- 1. LEVEL_THRESHOLDS (defines XP requirements per level)
CREATE TABLE level_thresholds (
    level INT4 PRIMARY KEY,
    min_xp INT4 NOT NULL,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO level_thresholds (level, min_xp, display_name) VALUES
(1, 0, 'Novice'), (2, 100, 'Apprentice'), (3, 300, 'Journeyman'),
(4, 600, 'Craftsman'), (5, 1000, 'Expert'), (6, 1500, 'Master'),
(7, 2100, 'Grandmaster'), (8, 2800, 'Legend'), (9, 3600, 'Mythic'),
(10, 5000, 'Godlike');

-- 2. PROFILES (user identity)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. USER_PROGRESS (XP, level, streaks)
CREATE TABLE user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    total_xp INT4 NOT NULL DEFAULT 0,
    level INT4 NOT NULL DEFAULT 1,
    current_streak INT4 NOT NULL DEFAULT 0,
    longest_streak INT4 NOT NULL DEFAULT 0,
    lines_written INT4 NOT NULL DEFAULT 0,
    files_saved INT4 NOT NULL DEFAULT 0,
    last_active TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT unique_user UNIQUE (user_id),
    CONSTRAINT max_xp CHECK (total_xp >= 0 AND total_xp <= 10000000),
    CONSTRAINT valid_level CHECK (level >= 1 AND level <= 100),
    CONSTRAINT valid_streak CHECK (current_streak >= 0)
);

-- 4. ACHIEVEMENTS
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_key TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_achievement UNIQUE (user_id, achievement_key)
);

-- 5. XP_EVENTS (audit log)
CREATE TABLE xp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    xp_amount INT4 NOT NULL,
    reason TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT valid_xp_amount CHECK (xp_amount > 0 AND xp_amount <= 10000)
);

-- 6. LEADERBOARD VIEW
CREATE VIEW leaderboard AS
SELECT
    ROW_NUMBER() OVER (ORDER BY up.total_xp DESC) AS rank,
    p.username, p.avatar_url, up.total_xp, up.level,
    up.current_streak, up.longest_streak,
    up.lines_written, up.files_saved, up.user_id
FROM user_progress up
JOIN profiles p ON p.id = up.user_id
ORDER BY up.total_xp DESC;

-- 7. INDEXES
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_total_xp ON user_progress(total_xp DESC);
CREATE INDEX idx_achievements_user_id ON achievements(user_id);
CREATE INDEX idx_xp_events_user_id ON xp_events(user_id);

-- 8. AUTO-UPDATE TIMESTAMPS
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_progress_updated BEFORE UPDATE ON user_progress
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 9. RPC FUNCTIONS

CREATE OR REPLACE FUNCTION add_xp_and_update_level(
    p_user_id UUID, p_xp_amount INT4, p_reason TEXT, p_metadata JSONB DEFAULT NULL
)
RETURNS TABLE (new_xp INT4, new_level INT4, level_up BOOLEAN) AS $$
DECLARE
    v_old_level INT4;
    v_new_level INT4;
    v_new_xp INT4;
BEGIN
    SELECT level INTO v_old_level FROM user_progress WHERE user_id = p_user_id;

    UPDATE user_progress
    SET total_xp = total_xp + p_xp_amount, last_active = now()
    WHERE user_id = p_user_id;

    SELECT total_xp INTO v_new_xp FROM user_progress WHERE user_id = p_user_id;
    SELECT COALESCE(MAX(level), 1) INTO v_new_level FROM level_thresholds
    WHERE min_xp <= v_new_xp ORDER BY level DESC LIMIT 1;

    IF v_new_level > v_old_level THEN
        UPDATE user_progress SET level = v_new_level WHERE user_id = p_user_id;
    END IF;

    INSERT INTO xp_events (user_id, xp_amount, reason, metadata)
    VALUES (p_user_id, p_xp_amount, p_reason, p_metadata);

    RETURN QUERY SELECT v_new_xp, v_new_level, (v_new_level > v_old_level);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS TABLE (current_streak INT4, longest_streak INT4) AS $$
DECLARE
    v_last_active DATE;
    v_today DATE;
    v_current_streak INT4;
    v_longest_streak INT4;
BEGIN
    v_today := CURRENT_DATE;
    SELECT last_active::DATE, current_streak, longest_streak
    INTO v_last_active, v_current_streak, v_longest_streak
    FROM user_progress WHERE user_id = p_user_id;

    IF v_last_active = v_today THEN
        RETURN QUERY SELECT v_current_streak, v_longest_streak;
        RETURN;
    END IF;

    IF v_last_active = v_today - INTERVAL '1 day' THEN
        v_current_streak := v_current_streak + 1;
    ELSE
        v_current_streak := 1;
    END IF;

    IF v_current_streak > v_longest_streak THEN
        v_longest_streak := v_current_streak;
    END IF;

    UPDATE user_progress
    SET current_streak = v_current_streak, longest_streak = v_longest_streak,
        last_active = now()
    WHERE user_id = p_user_id;

    RETURN QUERY SELECT v_current_streak, v_longest_streak;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reset_inactive_streaks()
RETURNS void AS $$
BEGIN
    UPDATE user_progress
    SET current_streak = 0
    WHERE last_active < (now() - INTERVAL '1 day') AND current_streak > 0;
END;
$$ LANGUAGE plpgsql;

-- 10. RLS POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read profiles" ON profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "update profile" ON profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "public read progress" ON user_progress FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "update progress" ON user_progress FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "public read achievements" ON achievements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert achievements" ON achievements FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "public read xp_events" ON xp_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert xp_events" ON xp_events FOR INSERT TO anon WITH CHECK (true);
```

3. Click **Run** to execute

### Step 3: Configure Extension

1. Get your API keys from Supabase dashboard:
    - **Project Settings** → **API** → Copy:
        - `Project URL` (supabaseUrl)
        - `Anon Key` (supabaseKey)

2. Add to extension config:
    - Open package.json in your project
    - Find `"codeCore"` section
    - Update with your keys:

    ```json
    "codeCore": {
      "supabaseUrl": "https://your-project.supabase.co",
      "supabaseKey": "your-anon-key-here"
    }
    ```

3. Reload VS Code (Ctrl+Shift+P → "Reload Window")

✅ **Leaderboard is now live!**

---

## 📊 XP Breakdown

| Activity    | XP      |                      Frequency |
| ----------- | ------- | -----------------------------: |
| Save File   | +5      |                       Per save |
| Create File | +10     |                       Per file |
| Fix Error   | +20     |                Per error fixed |
| Git Commit  | +50     |                     Per commit |
| Daily Bonus | +50-500 | Once per day (based on streak) |

---

## 🎯 Commands

| Command                         | Description                        |
| ------------------------------- | ---------------------------------- |
| `CODE CORE: Open Dashboard`     | View main progress and stats       |
| `CODE CORE: Open Mystery Box`   | Open earned mystery boxes          |
| `CODE CORE: Use XP Boost`       | View and activate temporary boosts |
| `CODE CORE: Show Stats`         | View detailed coding statistics    |
| `CODE CORE: Claim Daily Reward` | Claim daily XP bonus               |
| `CODE CORE: Toggle Focus Mode`  | Minimize distractions              |
| `CODE CORE: Reset Progress`     | Reset all progress (debug)         |

---

## ⚙️ Settings

Available in VS Code Settings (Cmd+,):

```json
{
	"codecore.soundEnabled": true, // Enable/disable sound effects
	"codecore.soundVolume": 0.5, // Volume level (0-1)
	"codecore.showStatusBar": true, // Show XP/level in status bar
	"codecore.supabaseUrl": "", // Supabase project URL
	"codecore.supabaseKey": "" // Supabase anon key
}
```

---

## 🏗️ Architecture

### Local Storage

- XP and level calculations (cached for performance)
- User achievements
- Streak information
- Coding statistics

### Supabase (Cloud)

- **profiles**: User identity and display names
- **user_progress**: XP, levels, streaks (single source of truth)
- **achievements**: Unlocked achievements per user
- **xp_events**: Audit log of all XP gains
- **leaderboard**: Real-time computed ranking view
- **RPC Functions**: Server-side XP calculations and streak updates

### Sync Strategy

- ✅ Local calculations for instant feedback
- ✅ Cloud sync for leaderboard accuracy
- ✅ Automatic profile creation on first use
- ✅ Real-time leaderboard updates

---

## 🐛 Troubleshooting

### Leaderboard shows "[object Object]"

**Problem**: RLS policy blocking profile updates
**Solution**:

```sql
DROP POLICY "update own profile" ON profiles;
CREATE POLICY "update profile" ON profiles
FOR UPDATE TO anon, authenticated USING (true)
WITH CHECK (true);
```

### XP not syncing to leaderboard

**Problem**: Supabase keys not configured
**Solution**:

1. Check `supabaseUrl` and `supabaseKey` in package.json are correct
2. Verify keys are from a project with the schema deployed
3. Reload VS Code (Ctrl+Shift+P → "Reload Window")

### Streak not resetting

**Problem**: `last_active` timestamp not updating
**Solution**: Restart VS Code and save a file

### "Supabase not configured"

**Problem**: Missing or invalid API keys
**Solution**:

1. Get keys from Supabase dashboard
2. Update package.json codeCore section
3. Run `npm install` in extension directory
4. Reload VS Code

---

## 📈 Statistics Tracked

- **Total XP**: Cumulative experience earned
- **Current Level**: Your rank in the developer hierarchy
- **Current Streak**: Days coding consecutively
- **Longest Streak**: Your best consecutive streak
- **Lines Written**: Total lines written while extension active
- **Files Saved**: Total files saved
- **Achievements**: Unlocked milestones
- **Rank**: Your position on global leaderboard

---

## 🎮 Progression Examples

**Level 1 → Level 2**: 100 XP (Quick warmup)
**Level 5 → Level 6**: 500 XP (Consistent coder)
**Level 10 → Level 11**: 1,000 XP + (Expert level required)
**Level 30+**: 100K+ XP (Legendary developer)

---

## 📝 License

MIT © 2026 Rishi Srivastav

---

## 🤝 Support

- **Issues**: [GitHub Issues](https://github.com/rishi-srivastav-zx/Vscode-Extension/issues)
- **Feature Requests**: Welcome! Open an issue with details
- **Feedback**: Help us improve at [GitHub Discussions](https://github.com/rishi-srivastav-zx/Vscode-Extension/discussions)

---

## 🎉 Have Fun Coding!

Ready to level up? Install CODE CORE and start your journey to developer mastery.
