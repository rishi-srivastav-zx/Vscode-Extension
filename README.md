# CODE CORE

Gamified coding. Level up your development.

## Features

- **XP System** - Earn XP for coding activities (save, create, fix errors, commits)
- **Leveling** - Progress through levels with unique titles
- **Streaks** - Daily coding streaks with bonus rewards
- **Achievements** - Unlock achievements for milestones
- **Leaderboard** - Compete with other developers (requires Supabase)
- **Mystery Boxes** - Earn boxes at level ups and streak milestones
- **XP Boosts** - Temporary multipliers for faster XP gain
- **Daily Rewards** - Claim daily XP based on your streak
- **Sound Effects** - Audio feedback for actions (optional)
- **Status Bar** - Quick view of level and streak in VS Code status bar

## Getting Started

1. Install the extension
2. Start coding! XP is earned automatically:
   - Save a file: +5 XP
   - Create a file: +10 XP
   - Fix an error: +20 XP
   - Make a git commit: +50 XP
3. Open the sidebar from the activity bar to view your progress

## Supabase Setup (Optional)

To enable the leaderboard feature:

1. Create a Supabase project at https://supabase.com
2. Create tables: `user_progress`, `leaderboard`, `achievements`
3. Add your credentials to `.env`:
   ```
   SUPABASE_URL=your_url
   SUPABASE_KEY=your_anon_key
   ```

## Commands

- `CODE CORE: Open Dashboard` - Open the sidebar
- `CODE CORE: Open Mystery Box` - Open earned mystery boxes
- `CODE CORE: Use XP Boost` - View active boosts
- `CODE CORE: Show Stats` - View detailed stats
- `CODE CORE: Claim Daily Reward` - Claim daily XP
- `CODE CORE: Reset Progress` - Reset all progress (debug)

## License

MIT
