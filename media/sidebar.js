// @ts-nocheck
/* global acquireVsCodeApi, window, document */

(function () {
    const vscode = acquireVsCodeApi();

    vscode.postMessage({ type: "getData" });

    window.addEventListener("message", (event) => {
        const message = event.data;
        switch (message.type) {
            case "data":
                render(message.data);
                break;
            case "activity":
                updateActivity(message.data);
                break;
        }
    });

    /**
     * Determine rarity string for an achievement.
     */
    function getRarity(ach) {
        if (ach.legendary) return "legendary";
        if (ach.epic) return "epic";
        if (ach.rare) return "rare";
        if (ach.uncommon) return "uncommon";
        return "common";
    }

    /**
     * Format minutes into "Xh Ym" or just "Ym" if under an hour.
     */
    function formatTime(minutes) {
        const m = minutes || 0;
        const h = Math.floor(m / 60);
        const rem = m % 60;
        if (h > 0) return `${h}h ${rem}m`;
        return `${rem}m`;
    }

    /**
     * Clamp a percentage between 0 and 100.
     */
    function clampPct(val) {
        return Math.min(100, Math.max(0, val || 0));
    }

    /**
     * Build the achievement grid HTML.
     */
    function buildAchievements(achievements) {
        return achievements
            .map((ach) => {
                const rarity = getRarity(ach);
                const unlockedClass = ach.unlocked ? "unlocked" : "locked";
                const glowHtml = ach.unlocked
                    ? `<span class="ach-glow"></span>`
                    : "";
                return `
                <div class="ach-item ${unlockedClass} rarity-${rarity}"
                     aria-label="${ach.name}">
                    <span class="ach-icon">${ach.icon || "?"}</span>
                    ${glowHtml}
                    <div class="ach-tooltip">
                        <strong>${ach.name}</strong>
                        <span>${ach.desc || ""}</span>
                        <em class="rarity-${rarity}">${rarity}</em>
                    </div>
                </div>`;
            })
            .join("");
    }

    /**
     * Main render function — writes CSS vars + full markup into #app.
     */
    function render(data) {
        const app = document.getElementById("app");
        if (!app) return;

        const pct = clampPct(data.percentage);
        const unlockedCount = (data.achievements || []).filter(
            (a) => a.unlocked,
        ).length;
        const totalCount = (data.achievements || []).length;
        const achievementsHtml = buildAchievements(data.achievements || []);

        /* Inject accent colour as CSS variable override */
        const accent = data.color || "#00e5ff";
        const accentDim = accent + "18";
        const accentMid = accent + "66";

        document.documentElement.style.setProperty("--accent", accent);
        document.documentElement.style.setProperty("--accent-dim", accentDim);
        document.documentElement.style.setProperty("--accent-mid", accentMid);

        app.innerHTML = `
        <div class="wrap">
            <!-- HEADER -->
            <div class="header">
                <div class="avatar">
                    <div class="avatar-ping"></div>
                    <div class="avatar-ping2"></div>
                    <div class="avatar-inner">◆</div>
                </div>
                <div class="level-info">
                    <div class="level-badge">
                        <span class="level-badge-dot"></span>
                        LEVEL
                    </div>
                    <div class="level-num">${data.level ?? 1}</div>
                    <div class="level-title">${data.title ?? "Novice"}</div>
                </div>
            </div>

            <!-- XP BAR -->
            <div class="xp-section">
                <div class="xp-row">
                    <span class="xp-label">XP Progress</span>
                    <span class="xp-nums">${(data.progress || 0).toLocaleString()} / ${(data.required || 0).toLocaleString()}</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill" id="xp-bar" style="width: 0%"></div>
                </div>
            </div>

            <!-- STAT CARDS -->
            <div class="cards-row">
                <div class="card">
                    <span class="card-icon">${data.streakEmoji || "🔥"}</span>
                    <span class="card-val">${data.streak ?? 0}</span>
                    <span class="card-label">Streak</span>
                </div>
                <div class="card">
                    <span class="card-icon">⚡</span>
                    <span class="card-val">+${data.todayXP ?? 0}</span>
                    <span class="card-label">Today XP</span>
                </div>
                <div class="card">
                    <span class="card-icon">⏱</span>
                    <span class="card-val">${formatTime(data.todayMinutes)}</span>
                    <span class="card-label">Active</span>
                </div>
            </div>

            <!-- DIVIDER -->
            <div class="divider"></div>

            <!-- ACHIEVEMENTS -->
            <div class="ach-header">
                <span class="ach-title">Achievements</span>
                <span class="ach-count">${unlockedCount} / ${totalCount}</span>
            </div>
            <div class="ach-grid">
                ${achievementsHtml}
            </div>
        </div>`;

        /* Animate XP bar after paint so CSS transition fires */
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const bar = document.getElementById("xp-bar");
                if (bar) bar.style.width = `${pct}%`;
            });
        });
    }

    /**
     * Handle live activity updates (e.g. XP tick).
     * Extend this to do lightweight DOM patches instead of a full re-render.
     */
    function updateActivity(activity) {
        // Lightweight update: refresh data from extension
        if (activity && activity.triggerRefresh) {
            vscode.postMessage({ type: "getData" });
        }
    }
})();
