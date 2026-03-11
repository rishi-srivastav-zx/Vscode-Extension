// @ts-nocheck
/* global acquireVsCodeApi, window, document */

window.onerror = function(msg, url, line) {
    console.error("[CodeCore Webview] Error:", msg, "at", line);
    return false;
};

(function () {
    // Remove alert for production - it blocks execution!
    // alert("Sidebar JS loaded!");
    console.log("[CodeCore Webview] Sidebar JS loaded!");

    const vscode = acquireVsCodeApi();

    // Initialize
    console.log("[CodeCore Webview] Requesting initial data...");
    vscode.postMessage({ type: "getData" });

    window.addEventListener("message", (event) => {
        const message = event.data;
        console.log(
            "[CodeCore Webview] Received message:",
            message.type,
            message,
        );

        switch (message.type) {
            case "data":
                console.log("[CodeCore Webview] Rendering main data");
                render(message.data);
                break;
            case "profileData":
                showProfileModalWithData(message.username);
                break;
            case "profileSaved":
                if (message.success) {
                    vscode.postMessage({ type: "getData" });
                }
                break;
            case "activity":
                console.log("[CodeCore Webview] Updating activity");
                updateActivity(message.data);
                break;
            case "leaderboard":
                console.log(
                    "[CodeCore Webview] Received leaderboard data:",
                    message.data,
                );
                // message.data is the array directly
                showLeaderboard(message.data, message.error);
                break;
            default:
                console.log(
                    "[CodeCore Webview] Unknown message type:",
                    message.type,
                );
        }
    });

    /**
     * Navigate back to main view
     */
    function goBack() {
        console.log("[CodeCore Webview] Going back to main view");
        const app = document.getElementById("app");
        if (app) {
            app.innerHTML =
                '<div class="loading"><div class="loading-spinner"></div><span>Loading...</span></div>';
            vscode.postMessage({ type: "getData" });
        }
    }

    /**
     * Make goBack available globally for inline onclick handlers
     */
    window.goBack = goBack;

  function loadLeaderboard() {
		console.log("[CodeCore Webview] Leaderboard button clicked!");
		const app = document.getElementById("app");
		if (app) {
			// Force clear and show loading
			app.innerHTML = "";
			app.innerHTML = `
            <div class="wrap">
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <span>Loading Leaderboard...</span>
                </div>
            </div>`;

			// Small delay to ensure render before posting message
			requestAnimationFrame(() => {
				vscode.postMessage({ type: "getLeaderboard" });
			});
		}
  }
  window.loadLeaderboard = loadLeaderboard;

    function showLeaderboard(data, error) {
        console.log(
            "[CodeCore Webview] showLeaderboard called, data:",
            data,
            "error:",
            error,
        );
        const app = document.getElementById("app");
        if (!app) {
            console.error("[CodeCore Webview] No app element found!");
            return;
        }

        // Handle error state
        if (error) {
            console.log("[CodeCore Webview] Showing error state:", error);
            app.innerHTML = `
            <div class="wrap">
                <div class="header" style="justify-content: space-between; align-items: center;">
                    <span style="font-size: 1.2rem;">🏆 Leaderboard</span>
                    <button class="btn-back" id="backBtn">← Back</button>
                </div>
                <div class="lb-error" style="padding: 20px; text-align: center; color: #ff6b6b;">
                    <p style="margin-bottom: 10px;">⚠️ ${escapeHtml(error)}</p>
                    <p style="font-size: 12px; opacity: 0.7;">Check your .env configuration</p>
                </div>
            </div>`;
            document.getElementById("backBtn")?.addEventListener("click", goBack);
            return;
        }

        // Ensure data is an array
        if (!Array.isArray(data)) {
            console.error(
                "[CodeCore Webview] Leaderboard data is not an array:",
                data,
            );
            data = [];
        }

        if (data.length === 0) {
            console.log("[CodeCore Webview] No leaderboard data");
            app.innerHTML = `
            <div class="wrap">
                <div class="header" style="justify-content: space-between; align-items: center;">
                    <span style="font-size: 1.2rem;">🏆 Leaderboard</span>
                    <button class="btn-back" id="backBtn">← Back</button>
                </div>
                <div class="lb-empty" style="padding: 40px 20px; text-align: center; color: #8b95a8;">
                    <p style="margin-bottom: 10px; font-size: 16px;">📭 No leaderboard data yet</p>
                    <p style="font-size: 12px; opacity: 0.7;">Start coding to appear on the leaderboard!</p>
                </div>
            </div>`;
            document.getElementById("backBtn")?.addEventListener("click", goBack);
            return;
        }

        console.log(
            "[CodeCore Webview] Rendering leaderboard with",
            data.length,
            "entries",
        );

        // Sort by XP descending
        const sortedData = [...data].sort(
            (a, b) => (b.total_xp || 0) - (a.total_xp || 0),
        );

        const rows = sortedData
            .map((entry, idx) => {
                const rank = idx + 1;
                let medalClass = "";
                let medalIcon = "";

                if (rank === 1) {
                    medalClass = "rank-1";
                    medalIcon = "🥇";
                } else if (rank === 2) {
                    medalClass = "rank-2";
                    medalIcon = "🥈";
                } else if (rank === 3) {
                    medalClass = "rank-3";
                    medalIcon = "🥉";
                } else {
                    medalClass = "rank-other";
                    medalIcon = `<span class="rank-num">${rank}</span>`;
                }

                const xp = entry.total_xp?.toLocaleString() || "0";
                const username = entry.username || entry.user_id?.substring(0, 12) || "Unknown";
                const isCurrentUser = entry.isCurrentUser;

                return `
            <div class="lb-row ${medalClass} ${isCurrentUser ? "current-user" : ""}">
                <div class="lb-rank">
                    <div class="medal">${medalIcon}</div>
                </div>
                <div class="lb-avatar">
                    <div class="avatar-circle">${username.charAt(0).toUpperCase()}</div>
                </div>
                <div class="lb-info">
                    <span class="lb-name">${escapeHtml(username)}</span>
                    <span class="lb-level">Level ${entry.level || 1}</span>
                </div>
                <div class="lb-xp">
                    <span class="xp-value">${xp}</span>
                    <span class="xp-label">XP</span>
                </div>
            </div>`;
            })
            .join("");

        app.innerHTML = `
        <div class="wrap leaderboard-view">
            <div class="lb-header">
                <button class="btn-back" id="backBtn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    Back
                </button>
                <h2 class="lb-title">🏆 Leaderboard</h2>
                <div class="lb-subtitle">Top Contributors</div>
            </div>
            
            <div class="lb-podium">
                ${
                    sortedData[1]
                        ? `
                <div class="podium-item second">
                    <div class="podium-avatar">${(sortedData[1].profiles?.username || sortedData[1].user_id || "?").charAt(0)}</div>
                    <div class="podium-name">${escapeHtml(sortedData[1].profiles?.username || sortedData[1].user_id)}</div>
                    <div class="podium-xp">${(sortedData[1].total_xp || 0).toLocaleString()} XP</div>
                    <div class="podium-bar">2</div>
                </div>`
                        : '<div class="podium-item second" style="visibility: hidden;"></div>'
                }
                
                ${
                    sortedData[0]
                        ? `
                <div class="podium-item first">
                    <div class="crown">👑</div>
                    <div class="podium-avatar">${(sortedData[0].profiles?.username || sortedData[0].user_id || "?").charAt(0)}</div>
                    <div class="podium-name">${escapeHtml(sortedData[0].profiles?.username || sortedData[0].user_id)}</div>
                    <div class="podium-xp">${(sortedData[0].total_xp || 0).toLocaleString()} XP</div>
                    <div class="podium-bar">1</div>
                </div>`
                        : '<div class="podium-item first" style="visibility: hidden;"></div>'
                }
                
                ${
                    sortedData[2]
                        ? `
                <div class="podium-item third">
                    <div class="podium-avatar">${(sortedData[2].profiles?.username || sortedData[2].user_id || "?").charAt(0)}</div>
                    <div class="podium-name">${escapeHtml(sortedData[2].profiles?.username || sortedData[2].user_id)}</div>
                    <div class="podium-xp">${(sortedData[2].total_xp || 0).toLocaleString()} XP</div>
                    <div class="podium-bar">3</div>
                </div>`
                        : '<div class="podium-item third" style="visibility: hidden;"></div>'
                }
            </div>

            <div class="lb-list">
                ${rows}
            </div>
            
            <div class="lb-footer">
                <span class="live-indicator">
                    <span class="pulse"></span>
                    Live Rankings
                </span>
            </div>
        </div>`;

        console.log("[CodeCore Webview] Leaderboard rendered successfully");
        
        document.getElementById("backBtn")?.addEventListener("click", goBack);
    }

    function escapeHtml(text) {
        if (!text) return "";
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    function getRarity(ach) {
        if (ach.legendary) return "legendary";
        if (ach.epic) return "epic";
        if (ach.rare) return "rare";
        if (ach.uncommon) return "uncommon";
        return "common";
    }

    function formatTime(minutes) {
        const m = minutes || 0;
        const h = Math.floor(m / 60);
        const rem = m % 60;
        if (h > 0) return `${h}h ${rem}m`;
        return `${rem}m`;
    }

    function clampPct(val) {
        return Math.min(100, Math.max(0, val || 0));
    }

    function buildAchievements(achievements) {
        return achievements
            .map((ach) => {
                const rarity = getRarity(ach);
                const unlockedClass = ach.unlocked ? "unlocked" : "locked";
                const glowHtml = ach.unlocked
                    ? `<span class="ach-glow"></span>`
                    : "";
                const progressHtml =
                    ach.progress && !ach.unlocked
                        ? `<div class="ach-progress"><div class="ach-progress-bar" style="width: ${(ach.progress.current / ach.progress.total) * 100}%"></div></div>`
                        : "";

                return `
                <div class="ach-item ${unlockedClass} rarity-${rarity}" aria-label="${ach.name}">
                    <span class="ach-icon">${ach.icon || "?"}</span>
                    ${glowHtml}
                    ${progressHtml}
                    <div class="ach-tooltip">
                        <div class="tooltip-header">
                            <strong>${ach.name}</strong>
                            <span class="rarity-badge ${rarity}">${rarity}</span>
                        </div>
                        <span class="tooltip-desc">${ach.desc || ""}</span>
                        ${ach.reward ? `<span class="tooltip-reward">🎁 ${ach.reward}</span>` : ""}
                    </div>
                </div>`;
            })
            .join("");
    }

    function render(data) {
        console.log("[CodeCore Webview] Rendering main view with data:", data);
        const app = document.getElementById("app");
        if (!app) {
            console.error("[CodeCore Webview] No app element found!");
            return;
        }

        const pct = clampPct(data.percentage);
        const unlockedCount = (data.achievements || []).filter(
            (a) => a.unlocked,
        ).length;
        const totalCount = (data.achievements || []).length;
        const achievementsHtml = buildAchievements(data.achievements || []);

        const accent = data.color || "#00e5ff";
        const accentDim = accent + "18";
        const accentMid = accent + "66";
        const accentDark = accent + "0d";

        document.documentElement.style.setProperty("--accent", accent);
        document.documentElement.style.setProperty("--accent-dim", accentDim);
        document.documentElement.style.setProperty("--accent-mid", accentMid);
        document.documentElement.style.setProperty("--accent-dark", accentDark);

        app.innerHTML = `
        <div class="wrap main-view">
            <!-- HEADER -->
            <div class="header">
                <div class="avatar" id="avatarBtn">
                    <div class="avatar-ping"></div>
                    <div class="avatar-ping2"></div>
                    <div class="avatar-inner">
                        <span class="avatar-text">${(data.displayName || "U").charAt(0).toUpperCase()}</span>
                        <div class="avatar-ring"></div>
                    </div>
                </div>
                <div class="level-info">
                    <div class="level-badge">
                        <span class="level-badge-dot"></span>
                        LEVEL ${data.level ?? 1}
                    </div>
                    <div class="level-title">${data.title ?? "Novice"}</div>
                    <div class="level-xp">${(data.totalXP || 0).toLocaleString()} Total XP</div>
                </div>
            </div>

            <!-- XP BAR -->
            <div class="xp-section">
                <div class="xp-row">
                    <span class="xp-label">Next Level</span>
                    <span class="xp-nums">${(data.progress || 0).toLocaleString()} / ${(data.required || 0).toLocaleString()}</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill" id="xp-bar" style="width: 0%">
                        <div class="bar-shine"></div>
                    </div>
                </div>
                <div class="xp-percent">${Math.round(pct)}%</div>
            </div>

            <!-- STAT CARDS -->
            <div class="cards-row">
                <div class="card streak-card">
                    <div class="card-bg"></div>
                    <span class="card-icon">${data.streakEmoji || "🔥"}</span>
                    <span class="card-val">${data.streak ?? 0}</span>
                    <span class="card-label">Day Streak</span>
                    ${data.streak > 5 ? '<div class="streak-flame"></div>' : ""}
                </div>
                <div class="card">
                    <div class="card-bg"></div>
                    <span class="card-icon">⚡</span>
                    <span class="card-val">+${data.todayXP ?? 0}</span>
                    <span class="card-label">Today XP</span>
                </div>
                <div class="card">
                    <div class="card-bg"></div>
                    <span class="card-icon">⏱</span>
                    <span class="card-val">${formatTime(data.todayMinutes)}</span>
                    <span class="card-label">Active Time</span>
                </div>
            </div>

            <!-- LEADERBOARD BUTTON -->
            <button class="btn-lb" id="leaderboardBtn">
                <span class="btn-icon">🏆</span>
                <span class="btn-text">View Leaderboard</span>
                <svg class="btn-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6"/>
                </svg> 
            </button>

            <!-- ACHIEVEMENTS -->
            <div class="ach-section">
                <div class="ach-header">
                    <div class="ach-title-group">
                        <span class="ach-icon-title">🎯</span>
                        <span class="ach-title">Achievements</span>
                    </div>
                    <div class="ach-count">
                        <span class="ach-unlocked">${unlockedCount}</span>
                        <span class="ach-separator">/</span>
                        <span class="ach-total">${totalCount}</span>
                    </div>
                </div>
                <div class="ach-grid">
                    ${achievementsHtml}
                </div>
            </div>
        </div>`;

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const bar = document.getElementById("xp-bar");
                if (bar) bar.style.width = `${pct}%`;
            });
        });

        document.getElementById("leaderboardBtn")?.addEventListener("click", loadLeaderboard);
        document.getElementById("avatarBtn")?.addEventListener("click", showProfileModal);

        console.log("[CodeCore Webview] Main view rendered successfully");
    }

    function showProfileModal() {
        const app = document.getElementById("app");
        if (!app) return;

        app.innerHTML = `
        <div class="wrap">
            <div class="header" style="justify-content: space-between; align-items: center;">
                <span style="font-size: 1.2rem;">👤 Profile</span>
                <button class="btn-back" id="backBtn">← Back</button>
            </div>
            <div class="profile-section">
                <div class="profile-avatar">
                    <div class="avatar-large">
                        <span class="avatar-text-large">U</span>
                    </div>
                </div>
                <div class="profile-form">
                    <label class="profile-label">Display Name</label>
                    <input type="text" id="profileName" class="profile-input" placeholder="Enter your name" maxlength="20">
                    <p class="profile-hint">This name will be shown on the leaderboard</p>
                    <button class="btn-save" id="saveProfileBtn">Save Profile</button>
                </div>
            </div>
        </div>`;

        document.getElementById("backBtn")?.addEventListener("click", goBack);
        document.getElementById("saveProfileBtn")?.addEventListener("click", saveProfile);
        
        vscode.postMessage({ type: "getProfile" });
    }

    function showProfileModalWithData(currentUsername) {
        const app = document.getElementById("app");
        if (!app) return;

        app.innerHTML = `
        <div class="wrap">
            <div class="header" style="justify-content: space-between; align-items: center;">
                <span style="font-size: 1.2rem;">👤 Profile</span>
                <button class="btn-back" id="backBtn">← Back</button>
            </div>
            <div class="profile-section">
                <div class="profile-avatar">
                    <div class="avatar-large">
                        <span class="avatar-text-large">${(currentUsername || "U").charAt(0).toUpperCase()}</span>
                    </div>
                </div>
                <div class="profile-form">
                    <label class="profile-label">Display Name</label>
                    <input type="text" id="profileName" class="profile-input" placeholder="Enter your name" maxlength="20" value="${currentUsername || ''}">
                    <p class="profile-hint">This name will be shown on the leaderboard</p>
                    <button class="btn-save" id="saveProfileBtn">Save Profile</button>
                </div>
            </div>
        </div>`;

        document.getElementById("backBtn")?.addEventListener("click", goBack);
        document.getElementById("saveProfileBtn")?.addEventListener("click", saveProfile);
    }

    function saveProfile() {
        const nameInput = document.getElementById("profileName");
        const name = nameInput?.value?.trim();
        
        if (!name) {
            alert("Please enter a name");
            return;
        }

        vscode.postMessage({ type: "saveProfile", username: name });
    }

    function updateActivity(activity) {
        console.log("[CodeCore Webview] Activity update:", activity);
        if (activity && activity.triggerRefresh) {
            vscode.postMessage({ type: "getData" });
        }
    }
})();
