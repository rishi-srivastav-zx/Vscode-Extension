// @ts-nocheck
/* global acquireVsCodeApi */

(function () {
	const vscode = acquireVsCodeApi();

	console.log("[CodeCore] Webview Loaded");

	window.onerror = (msg, url, line) => {
		console.error("[CodeCore Error]", msg, "line:", line);
	};

	/* -----------------------------
INIT
----------------------------- */

	document.addEventListener("DOMContentLoaded", () => {
		requestInitialData();
	});

	function requestInitialData() {
		renderLoading("Loading CodeCore...");
		vscode.postMessage({ type: "getData" });
	}

	/* -----------------------------
MESSAGE LISTENER
----------------------------- */

	window.addEventListener("message", (event) => {
		const msg = event.data;
		if (!msg || !msg.type) return;

		console.log("[CodeCore] message:", msg.type);

		switch (msg.type) {
			case "data":
				renderMain(msg.data);
				break;

			case "leaderboard":
				renderLeaderboard(msg.data, msg.error);
				break;

			case "profileData":
				renderProfile(msg.username);
				break;

			case "profileSaved":
				requestInitialData();
				break;

			case "activity":
				if (msg.data?.triggerRefresh) {
					requestInitialData();
				}
				break;
		}
	});

	/* -----------------------------
UI RENDER HELPERS
----------------------------- */

	function renderLoading(text) {
		const app = document.getElementById("app");
		if (!app) return;

		app.innerHTML = `
<div class="loading">
<div class="loading-spinner"></div>
<span>${text}</span>
</div>`;
	}

	/* -----------------------------
MAIN DASHBOARD
----------------------------- */

	function renderMain(data) {
		const app = document.getElementById("app");
		if (!app) return;

		const pct = Math.min(100, Math.max(0, data?.percentage || 0));

		app.innerHTML = `

<div class="wrap">

<header class="header">

<div class="avatar" id="avatarBtn">
${(data.displayName || "U").charAt(0)}
</div>

<div class="level-info">
<div class="level">LEVEL ${data.level || 1}</div>
<div class="xp">${(data.totalXP || 0).toLocaleString()} XP</div>
</div>

</header>


<div class="xp-bar">

<div class="bar-track">
<div class="bar-fill" id="xpBar" style="width:${pct}%"></div>
</div>

<div class="xp-text">
${(data.progress || 0).toLocaleString()} /
${(data.required || 0).toLocaleString()}
</div>

</div>


<div class="cards">

<div class="card">
<span>🔥</span>
<strong>${data.streak || 0}</strong>
<small>Streak</small>
</div>

<div class="card">
<span>⚡</span>
<strong>+${data.todayXP || 0}</strong>
<small>Today XP</small>
</div>

<div class="card">
<span>⏱</span>
<strong>${formatTime(data.todayMinutes)}</strong>
<small>Time</small>
</div>

</div>


<button id="leaderboardBtn" class="btn">
🏆 Leaderboard
</button>


</div>
`;

		document
			.getElementById("leaderboardBtn")
			?.addEventListener("click", loadLeaderboard);

		document
			.getElementById("avatarBtn")
			?.addEventListener("click", openProfile);
	}

	/* -----------------------------
LEADERBOARD
----------------------------- */

	function loadLeaderboard() {
		renderLoading("Loading Leaderboard...");

		vscode.postMessage({
			type: "getLeaderboard",
		});
	}

	function renderLeaderboard(data, error) {
		const app = document.getElementById("app");
		if (!app) return;

		if (error) {
			app.innerHTML = `

<div class="wrap">

<header class="header">
<button id="backBtn">← Back</button>
<h2>Leaderboard</h2>
</header>

<p class="error">${escapeHtml(error)}</p>

</div>
`;

			document
				.getElementById("backBtn")
				?.addEventListener("click", requestInitialData);

			return;
		}

		if (!Array.isArray(data) || data.length === 0) {
			app.innerHTML = `

<div class="wrap">

<header class="header">
<button id="backBtn">← Back</button>
<h2>Leaderboard</h2>
</header>

<p>No players yet</p>

</div>
`;

			document
				.getElementById("backBtn")
				?.addEventListener("click", requestInitialData);

			return;
		}

		data.sort((a, b) => (b.total_xp || 0) - (a.total_xp || 0));

		const rows = data
			.map((p, i) => {
				const rank = i + 1;
				const medal =
					rank === 1
						? "🥇"
						: rank === 2
							? "🥈"
							: rank === 3
								? "🥉"
								: rank;

				return `

<div class="lb-row">

<div class="rank">${medal}</div>

<div class="name">
${escapeHtml(p.username || "Unknown")}
</div>

<div class="xp">
${(p.total_xp || 0).toLocaleString()} XP
</div>

</div>

`;
			})
			.join("");

		app.innerHTML = `

<div class="wrap">

<header class="header">

<button id="backBtn">← Back</button>

<h2>🏆 Leaderboard</h2>

</header>

<div class="lb-list">
${rows}
</div>

</div>
`;

		document
			.getElementById("backBtn")
			?.addEventListener("click", requestInitialData);
	}

	/* -----------------------------
PROFILE
----------------------------- */

	function openProfile() {
		renderLoading("Loading Profile...");

		vscode.postMessage({
			type: "getProfile",
		});
	}

	function renderProfile(username) {
		const app = document.getElementById("app");
		if (!app) return;

		app.innerHTML = `

<div class="wrap">

<header class="header">

<button id="backBtn">← Back</button>

<h2>Profile</h2>

</header>

<input
id="profileInput"
value="${username || ""}"
maxlength="20"
/>

<button id="saveBtn">
Save
</button>

</div>
`;

		document
			.getElementById("backBtn")
			?.addEventListener("click", requestInitialData);

		document
			.getElementById("saveBtn")
			?.addEventListener("click", saveProfile);
	}

	function saveProfile() {
		const input = document.getElementById("profileInput");

		const name = input?.value?.trim();

		if (!name) {
			alert("Enter name");
			return;
		}

		vscode.postMessage({
			type: "saveProfile",
			username: name,
		});
	}

	/* -----------------------------
UTILS
----------------------------- */

	function formatTime(min) {
		if (!min) return "0m";

		const h = Math.floor(min / 60);
		const m = min % 60;

		return h > 0 ? `${h}h ${m}m` : `${m}m`;
	}

	function escapeHtml(str) {
		const div = document.createElement("div");
		div.textContent = str;
		return div.innerHTML;
	}
})();
