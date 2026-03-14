// @ts-nocheck
/* global acquireVsCodeApi */

(function () {
	const vscode = acquireVsCodeApi();

	window.onerror = (msg, url, line) => {
		console.error("[CodeCore Error]", msg, "line:", line);
	};

	document.addEventListener("DOMContentLoaded", () => {
		injectStyles();
		requestInitialData();
	});

	function requestInitialData() {
		renderLoading();
		vscode.postMessage({ type: "getData" });
	}

	window.addEventListener("message", (event) => {
		const msg = event.data;
		if (!msg || !msg.type) return;
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
			case "achievements":
				renderAchievements(msg.data);
				break;
			case "activity":
				if (msg.data?.triggerRefresh) requestInitialData();
				break;
		}
	});

	// ─────────────────────────────────────────────────────────────────────────
	// STYLES
	// ─────────────────────────────────────────────────────────────────────────
	function injectStyles() {
		const style = document.createElement("style");
		style.textContent = `
			@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');

			*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

			:root {
				--bg:#080810; --c1:#13131f; --c2:#1c1c2e; --c3:#252538;
				--border:rgba(255,255,255,0.07); --border2:rgba(255,255,255,0.12);
				--p:#a78bfa; --p2:#818cf8; --g:#34d399; --o:#fb923c; --r:#f472b6; --y:#fbbf24;
				--txt:#f1f0ff; --txt2:#9896b8; --txt3:#5c5a7a;
				--rare:#60a5fa; --epic:#c084fc; --legendary:#fbbf24;
			}

			html,body{height:100%}
			body{background:var(--bg);color:var(--txt);font-family:'Outfit',sans-serif;-webkit-font-smoothing:antialiased}
			#app{min-height:100vh}
			::-webkit-scrollbar{width:3px}
			::-webkit-scrollbar-track{background:transparent}
			::-webkit-scrollbar-thumb{background:var(--c3);border-radius:99px}

			/* LOADING */
			.loading{height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px}
			.load-logo{font-size:11px;font-family:'DM Mono',monospace;letter-spacing:.3em;text-transform:uppercase;color:var(--txt3)}
			.load-logo b{color:var(--p);font-weight:500}
			.load-bar{width:80px;height:2px;background:var(--c2);border-radius:99px;overflow:hidden}
			.load-bar-fill{height:100%;width:40%;background:linear-gradient(90deg,var(--p2),var(--p));border-radius:99px;animation:loadSlide 1.2s ease-in-out infinite}
			@keyframes loadSlide{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}

			/* WRAP */
			.wrap{padding:0 0 40px;animation:pageIn .35s cubic-bezier(.4,0,.2,1) both}
			@keyframes pageIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

			/* TOP NAV */
			.topnav{display:flex;align-items:center;justify-content:space-between;padding:16px 16px 0;margin-bottom:20px}
			.logo{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.25em;text-transform:uppercase;color:var(--txt3)}
			.logo em{color:var(--p);font-style:normal}
			.av{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--p2) 0%,var(--p) 50%,var(--r) 100%);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s}
			.av:hover{transform:scale(1.05);filter:brightness(1.1)}

			/* HERO */
			.hero-banner{margin:0 12px 12px;border-radius:20px;background:var(--c1);border:1px solid var(--border);overflow:hidden;position:relative}
			.hero-gfx{position:absolute;inset:0;pointer-events:none;overflow:hidden}
			.hero-gfx::before{content:'';position:absolute;top:-60px;right:-60px;width:200px;height:200px;background:radial-gradient(circle,rgba(129,140,248,.2) 0%,transparent 65%)}
			.hero-gfx::after{content:'';position:absolute;bottom:-40px;left:20px;width:140px;height:140px;background:radial-gradient(circle,rgba(167,139,250,.1) 0%,transparent 65%)}
			.hero-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:24px 24px}
			.hero-inner{position:relative;z-index:1;padding:20px 20px 18px}
			.level-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 10px 4px 7px;border-radius:99px;background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.2);margin-bottom:14px}
			.chip-dot{width:6px;height:6px;border-radius:50%;background:var(--p);box-shadow:0 0 6px var(--p);animation:breathe 2.5s ease-in-out infinite}
			@keyframes breathe{0%,100%{opacity:1;box-shadow:0 0 6px var(--p)}50%{opacity:.6;box-shadow:0 0 2px var(--p)}}
			.chip-txt{font-size:10px;font-family:'DM Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--p)}
			.xp-num{font-size:52px;font-weight:900;letter-spacing:-.04em;line-height:1;color:var(--txt);margin-bottom:2px}
			.xp-num sup{font-size:16px;font-weight:600;color:var(--txt2);letter-spacing:0;vertical-align:super;margin-left:2px}
			.xp-sub{font-size:10px;font-family:'DM Mono',monospace;letter-spacing:.15em;text-transform:uppercase;color:var(--txt3);margin-bottom:20px}
			.prog-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
			.prog-label{font-size:10px;font-family:'DM Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--txt3)}
			.prog-vals{font-size:10px;font-family:'DM Mono',monospace;color:var(--txt2)}
			.prog-vals b{color:var(--p);font-weight:500}
			.prog-track{height:6px;background:var(--c2);border-radius:99px;overflow:visible;position:relative}
			.prog-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--p2),var(--p),var(--r));background-size:200% 100%;animation:shimmer 3s linear infinite;transition:width 1.2s cubic-bezier(.4,0,.2,1);position:relative}
			@keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
			.prog-fill::after{content:'';position:absolute;right:-1px;top:50%;transform:translateY(-50%);width:10px;height:10px;border-radius:50%;background:white;box-shadow:0 0 8px rgba(167,139,250,.8)}

			/* STATS */
			.stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 12px 12px}
			.stat{background:var(--c1);border:1px solid var(--border);border-radius:14px;padding:14px 12px 12px;display:flex;flex-direction:column;gap:6px;position:relative;overflow:hidden;transition:border-color .2s,transform .2s;cursor:default}
			.stat::before{content:'';position:absolute;inset:0;opacity:0;transition:opacity .3s}
			.stat:hover{border-color:var(--border2);transform:translateY(-2px)}
			.stat:hover::before{opacity:1}
			.stat-streak::before{background:radial-gradient(circle at 50% 0%,rgba(251,146,60,.08) 0%,transparent 70%)}
			.stat-today::before{background:radial-gradient(circle at 50% 0%,rgba(52,211,153,.08) 0%,transparent 70%)}
			.stat-time::before{background:radial-gradient(circle at 50% 0%,rgba(129,140,248,.08) 0%,transparent 70%)}
			.stat-icon{font-size:16px;line-height:1}
			.stat-val{font-size:22px;font-weight:800;letter-spacing:-.03em;line-height:1}
			.stat-streak .stat-val{color:var(--o)}
			.stat-today .stat-val{color:var(--g)}
			.stat-time .stat-val{color:var(--p)}
			.stat-lbl{font-size:9px;font-family:'DM Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--txt3)}

			/* BTNS */
			.btn-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 12px}
			.action-btn{padding:13px;background:var(--c1);border:1px solid var(--border);border-radius:14px;color:var(--txt2);font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px}
			.action-btn:hover{background:var(--c2);border-color:rgba(167,139,250,.3);color:var(--txt)}
			.action-btn:active{transform:scale(.98)}

			/* SUBNAV */
			.subnav{display:flex;align-items:center;justify-content:space-between;padding:16px}
			.back{display:flex;align-items:center;gap:8px;background:none;border:none;color:var(--txt3);font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;padding:0;transition:color .2s}
			.back:hover{color:var(--txt2)}
			.back-arrow{width:24px;height:24px;border-radius:7px;background:var(--c2);display:flex;align-items:center;justify-content:center;font-size:12px;transition:background .2s}
			.back:hover .back-arrow{background:var(--c3)}
			.sub-title{font-size:13px;font-weight:700;color:var(--txt)}
			.sub-spacer{width:60px}

			/* LEADERBOARD */
			.lb-list{padding:0 12px;display:flex;flex-direction:column;gap:6px}
			.lb-item{display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--c1);border:1px solid var(--border);border-radius:14px;transition:all .2s;animation:itemIn .3s ease both}
			.lb-item:nth-child(1){animation-delay:.04s;border-color:rgba(251,191,36,.25);background:linear-gradient(135deg,rgba(251,191,36,.05),var(--c1))}
			.lb-item:nth-child(2){animation-delay:.08s;border-color:rgba(192,192,210,.2)}
			.lb-item:nth-child(3){animation-delay:.12s;border-color:rgba(205,127,96,.2)}
			.lb-item:nth-child(n+4){animation-delay:.16s}
			@keyframes itemIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
			.lb-item:hover{background:var(--c2);border-color:var(--border2)}
			.lb-rank{width:28px;text-align:center;font-size:16px;flex-shrink:0}
			.lb-rank-num{font-family:'DM Mono',monospace;font-size:11px;color:var(--txt3)}
			.lb-av{width:30px;height:30px;border-radius:9px;background:var(--c3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;color:var(--txt2)}
			.lb-item:nth-child(1) .lb-av{background:linear-gradient(135deg,rgba(251,191,36,.3),rgba(251,191,36,.1));color:var(--y)}
			.lb-item:nth-child(2) .lb-av{background:rgba(192,192,210,.1);color:#c0c0d2}
			.lb-item:nth-child(3) .lb-av{background:rgba(205,127,96,.1);color:#cd7f60}
			.lb-info{flex:1;min-width:0}
			.lb-name{font-size:13px;font-weight:600;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:1px}
			.lb-xp-txt{font-size:10px;font-family:'DM Mono',monospace;color:var(--txt3)}
			.lb-bar-wrap{width:50px;flex-shrink:0}
			.lb-bar-track{height:3px;background:var(--c3);border-radius:99px;overflow:hidden}
			.lb-bar-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--p2),var(--p))}

			/* ── ACHIEVEMENTS ── */
			.ach-summary{display:flex;gap:6px;flex-wrap:wrap;padding:0 12px 12px}
			.ach-pill{padding:3px 10px;border-radius:99px;font-size:10px;font-family:'DM Mono',monospace;letter-spacing:.08em;border:1px solid}
			.ach-pill-all{background:rgba(167,139,250,.08);border-color:rgba(167,139,250,.2);color:var(--p)}
			.ach-pill-rare{background:rgba(96,165,250,.08);border-color:rgba(96,165,250,.2);color:var(--rare)}
			.ach-pill-epic{background:rgba(192,132,252,.08);border-color:rgba(192,132,252,.2);color:var(--epic)}
			.ach-pill-legendary{background:rgba(251,191,36,.08);border-color:rgba(251,191,36,.2);color:var(--legendary)}

			.ach-section-title{font-size:9px;font-family:'DM Mono',monospace;letter-spacing:.2em;text-transform:uppercase;color:var(--txt3);margin:14px 12px 8px}

			.ach-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:0 12px}

			/* CARD BASE */
			.ach-card{
				aspect-ratio:1;border-radius:14px;display:flex;flex-direction:column;
				align-items:center;justify-content:center;gap:4px;cursor:pointer;
				position:relative;overflow:hidden;transition:transform .2s;
				border:1px solid var(--border);background:var(--c1);
			}
			.ach-card:hover{transform:scale(1.06)}

			/* LOCKED */
			.ach-card.locked{opacity:.3;filter:grayscale(1)}
			.ach-card.locked:hover{opacity:.5}

			/* UNLOCKED — common */
			.ach-card.unlocked.common{
				border-color:rgba(167,139,250,.35);
				box-shadow:0 0 10px rgba(167,139,250,.18),inset 0 0 18px rgba(167,139,250,.05);
			}

			/* UNLOCKED — rare */
			.ach-card.unlocked.rare{
				border-color:rgba(96,165,250,.5);
				box-shadow:0 0 16px rgba(96,165,250,.35),inset 0 0 24px rgba(96,165,250,.07);
				animation:glowRare 2.5s ease-in-out infinite;
			}
			@keyframes glowRare{
				0%,100%{box-shadow:0 0 16px rgba(96,165,250,.35),inset 0 0 24px rgba(96,165,250,.07)}
				50%{box-shadow:0 0 26px rgba(96,165,250,.55),inset 0 0 34px rgba(96,165,250,.12)}
			}

			/* UNLOCKED — epic */
			.ach-card.unlocked.epic{
				border-color:rgba(192,132,252,.6);
				box-shadow:0 0 22px rgba(192,132,252,.45),inset 0 0 32px rgba(192,132,252,.09);
				animation:glowEpic 2s ease-in-out infinite;
			}
			@keyframes glowEpic{
				0%,100%{box-shadow:0 0 22px rgba(192,132,252,.45),inset 0 0 32px rgba(192,132,252,.09)}
				50%{box-shadow:0 0 36px rgba(192,132,252,.7),inset 0 0 46px rgba(192,132,252,.16)}
			}

			/* UNLOCKED — legendary */
			.ach-card.unlocked.legendary{
				border-color:rgba(251,191,36,.75);
				box-shadow:0 0 30px rgba(251,191,36,.55),inset 0 0 44px rgba(251,191,36,.12);
				animation:glowLegendary 1.8s ease-in-out infinite;
			}
			@keyframes glowLegendary{
				0%,100%{box-shadow:0 0 30px rgba(251,191,36,.55),inset 0 0 44px rgba(251,191,36,.12);border-color:rgba(251,191,36,.75)}
				50%{box-shadow:0 0 50px rgba(251,191,36,.85),inset 0 0 64px rgba(251,191,36,.22);border-color:rgba(251,191,36,1)}
			}

			/* inner glow overlays */
			.ach-card.unlocked.legendary::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 30%,rgba(251,191,36,.14) 0%,transparent 70%);pointer-events:none}
			.ach-card.unlocked.epic::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 30%,rgba(192,132,252,.1) 0%,transparent 70%);pointer-events:none}
			.ach-card.unlocked.rare::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 30%,rgba(96,165,250,.08) 0%,transparent 70%);pointer-events:none}

			/* icon */
			.ach-icon{font-size:22px;line-height:1;position:relative;z-index:1}
			.ach-name{font-size:8px;font-family:'DM Mono',monospace;letter-spacing:.04em;text-align:center;color:var(--txt2);padding:0 4px;line-height:1.3;position:relative;z-index:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
			.ach-card.locked .ach-name{color:var(--txt3)}

			/* rarity dot */
			.ach-dot{width:4px;height:4px;border-radius:50%;position:absolute;bottom:5px;right:5px}
			.ach-dot.common{background:var(--p)}
			.ach-dot.rare{background:var(--rare)}
			.ach-dot.epic{background:var(--epic)}
			.ach-dot.legendary{background:var(--legendary);box-shadow:0 0 5px var(--legendary)}

			/* progress bar (locked cards with progress) */
			.ach-prog{position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--c3)}
			.ach-prog-fill{height:100%;background:var(--p);transition:width .8s ease}

			/* TOOLTIP */
			.ach-tooltip{position:fixed;z-index:999;background:var(--c2);border:1px solid var(--border2);border-radius:12px;padding:10px 12px;max-width:180px;pointer-events:none;animation:tipIn .15s ease both;box-shadow:0 8px 32px rgba(0,0,0,.5)}
			@keyframes tipIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
			.tip-name{font-size:12px;font-weight:700;color:var(--txt);margin-bottom:3px}
			.tip-desc{font-size:10px;color:var(--txt2);font-family:'DM Mono',monospace;margin-bottom:6px;line-height:1.5}
			.tip-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:99px;font-size:9px;font-family:'DM Mono',monospace;letter-spacing:.08em;text-transform:uppercase}
			.tip-badge.common{background:rgba(167,139,250,.15);color:var(--p)}
			.tip-badge.rare{background:rgba(96,165,250,.15);color:var(--rare)}
			.tip-badge.epic{background:rgba(192,132,252,.15);color:var(--epic)}
			.tip-badge.legendary{background:rgba(251,191,36,.15);color:var(--legendary)}
			.tip-badge.hidden{background:rgba(255,255,255,.05);color:var(--txt3)}
			.tip-prog{font-size:9px;color:var(--txt3);font-family:'DM Mono',monospace;margin-top:5px}

			/* UNLOCK TOAST */
			.unlock-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateY(90px);background:var(--c2);border:1px solid var(--border2);border-radius:16px;padding:12px 18px;display:flex;align-items:center;gap:12px;min-width:210px;box-shadow:0 8px 32px rgba(0,0,0,.6);transition:transform .4s cubic-bezier(.34,1.56,.64,1);z-index:1000}
			.unlock-toast.show{transform:translateX(-50%) translateY(0)}
			.toast-icon{font-size:24px}
			.toast-label{font-size:9px;font-family:'DM Mono',monospace;letter-spacing:.15em;text-transform:uppercase;color:var(--y);margin-bottom:2px}
			.toast-name{font-size:13px;font-weight:700;color:var(--txt)}

			/* PROFILE */
			.profile-body{padding:0 12px}
			.p-avatar-wrap{display:flex;flex-direction:column;align-items:center;padding:24px 0 20px;gap:10px}
			.p-avatar{width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg,var(--p2),var(--p),var(--r));display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800}
			.p-hint{font-size:11px;color:var(--txt3);font-family:'DM Mono',monospace;letter-spacing:.05em}
			.field-label{font-size:10px;font-family:'DM Mono',monospace;letter-spacing:.15em;text-transform:uppercase;color:var(--txt3);margin-bottom:6px;display:block}
			.field-input{width:100%;padding:11px 14px;background:var(--c1);border:1px solid var(--border);border-radius:12px;color:var(--txt);font-family:'Outfit',sans-serif;font-size:14px;font-weight:500;outline:none;transition:all .2s;margin-bottom:10px}
			.field-input::placeholder{color:var(--txt3)}
			.field-input:focus{border-color:rgba(167,139,250,.5);background:var(--c2);box-shadow:0 0 0 3px rgba(167,139,250,.08)}
			.save-btn{width:100%;padding:12px;background:linear-gradient(135deg,var(--p2),var(--p));border:none;border-radius:12px;color:white;font-family:'Outfit',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s}
			.save-btn:hover{opacity:.9}
			.save-btn:active{transform:scale(.98)}

			/* MESSAGES */
			.msg-box{margin:8px 12px 0;padding:14px 16px;border-radius:14px;font-size:12px;font-family:'DM Mono',monospace;letter-spacing:.04em;line-height:1.6}
			.msg-error{background:rgba(244,114,182,.06);border:1px solid rgba(244,114,182,.15);color:var(--r)}
			.msg-empty{background:var(--c1);border:1px solid var(--border);color:var(--txt3);text-align:center;padding:40px 16px}
		`;
		document.head.appendChild(style);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// TOOLTIP
	// ─────────────────────────────────────────────────────────────────────────
	let tipEl = null;

	function showTooltip(card, ach) {
		removeTooltip();
		const rarity = getRarity(ach);
		const badge = ach.hidden && !ach.unlocked ? "hidden" : rarity;
		const descTxt = ach.hidden && !ach.unlocked ? "???" : ach.desc;
		const progTxt =
			!ach.unlocked && (ach.progress || 0) > 0
				? `<div class="tip-prog">Progress: ${Math.round(ach.progress * 100)}%</div>`
				: "";

		tipEl = document.createElement("div");
		tipEl.className = "ach-tooltip";
		tipEl.innerHTML = `
			<div class="tip-name">${ach.icon} ${ach.name}</div>
			<div class="tip-desc">${descTxt}</div>
			<span class="tip-badge ${badge}">${badge}</span>
			${progTxt}`;
		document.body.appendChild(tipEl);

		const rect = card.getBoundingClientRect();
		const tw = tipEl.offsetWidth,
			th = tipEl.offsetHeight;
		let left = rect.left + rect.width / 2 - tw / 2;
		let top = rect.top - th - 8;
		if (left < 4) left = 4;
		if (left + tw > window.innerWidth - 4)
			left = window.innerWidth - tw - 4;
		if (top < 4) top = rect.bottom + 8;
		tipEl.style.left = left + "px";
		tipEl.style.top = top + "px";
	}

	function removeTooltip() {
		if (tipEl) {
			tipEl.remove();
			tipEl = null;
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// TOAST
	// ─────────────────────────────────────────────────────────────────────────
	function showUnlockToast(ach) {
		const toast = document.createElement("div");
		toast.className = "unlock-toast";
		toast.innerHTML = `
			<div class="toast-icon">${ach.icon}</div>
			<div>
				<div class="toast-label">Achievement Unlocked</div>
				<div class="toast-name">${ach.name}</div>
			</div>`;
		document.body.appendChild(toast);
		requestAnimationFrame(() =>
			requestAnimationFrame(() => toast.classList.add("show")),
		);
		setTimeout(() => {
			toast.classList.remove("show");
			setTimeout(() => toast.remove(), 400);
		}, 3200);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// HELPERS
	// ─────────────────────────────────────────────────────────────────────────
	function getRarity(ach) {
		if (ach.legendary) return "legendary";
		if (ach.epic) return "epic";
		if (ach.rare) return "rare";
		return "common";
	}

	function subNav(title) {
		return `
			<div class="subnav">
				<button class="back" id="backBtn"><div class="back-arrow">←</div>Back</button>
				<span class="sub-title">${title}</span>
				<div class="sub-spacer"></div>
			</div>`;
	}

	function formatTime(min) {
		if (!min) return "0m";
		const h = Math.floor(min / 60),
			m = min % 60;
		return h > 0 ? `${h}h ${m}m` : `${m}m`;
	}

	function escapeHtml(str) {
		const d = document.createElement("div");
		d.textContent = str;
		return d.innerHTML;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// LOADING
	// ─────────────────────────────────────────────────────────────────────────
	function renderLoading() {
		const app = document.getElementById("app");
		if (!app) return;
		app.innerHTML = `
			<div class="loading">
				<div class="load-logo"><b>CODE</b>CORE</div>
				<div class="load-bar"><div class="load-bar-fill"></div></div>
			</div>`;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// MAIN
	// ─────────────────────────────────────────────────────────────────────────
	function renderMain(data) {
		const app = document.getElementById("app");
		if (!app) return;
		const pct = Math.min(100, Math.max(0, data?.percentage || 0));
		const initial = (data.displayName || "U").charAt(0).toUpperCase();
		const prog = (data.progress || 0).toLocaleString();
		const req = (data.required || 0).toLocaleString();

		app.innerHTML = `
			<div class="wrap">
				<div class="topnav">
					<div class="logo"><em>CODE</em>CORE</div>
					<div class="av" id="avatarBtn">${initial}</div>
				</div>

				<div class="hero-banner">
					<div class="hero-gfx"></div>
					<div class="hero-grid"></div>
					<div class="hero-inner">
						<div class="level-chip">
							<div class="chip-dot"></div>
							<span class="chip-txt">Level ${data.level || 1}</span>
						</div>
						<div class="xp-num">${(data.totalXP || 0).toLocaleString()}<sup>xp</sup></div>
						<div class="xp-sub">Total earned</div>
						<div class="prog-head">
							<span class="prog-label">Next level</span>
							<span class="prog-vals"><b>${prog}</b> / ${req}</span>
						</div>
						<div class="prog-track">
							<div class="prog-fill" id="xpBar" style="width:0%"></div>
						</div>
					</div>
				</div>

				<div class="stat-row">
					<div class="stat stat-streak">
						<div class="stat-icon">🔥</div>
						<div class="stat-val">${data.streak || 0}</div>
						<div class="stat-lbl">Streak</div>
					</div>
					<div class="stat stat-today">
						<div class="stat-icon">⚡</div>
						<div class="stat-val">+${data.todayXP || 0}</div>
						<div class="stat-lbl">Today</div>
					</div>
					<div class="stat stat-time">
						<div class="stat-icon">⏱</div>
						<div class="stat-val">${formatTime(data.todayMinutes)}</div>
						<div class="stat-lbl">Time</div>
					</div>
				</div>

				<div class="btn-row">
					<button class="action-btn" id="leaderboardBtn">🏆 &nbsp;Board</button>
					<button class="action-btn" id="achBtn">🎖 &nbsp;Badges</button>
				</div>
			</div>`;

		requestAnimationFrame(() => {
			setTimeout(() => {
				const bar = document.getElementById("xpBar");
				if (bar) bar.style.width = pct + "%";
			}, 120);
		});

		document
			.getElementById("leaderboardBtn")
			?.addEventListener("click", loadLeaderboard);
		document
			.getElementById("achBtn")
			?.addEventListener("click", loadAchievements);
		document
			.getElementById("avatarBtn")
			?.addEventListener("click", openProfile);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// ACHIEVEMENTS
	// ─────────────────────────────────────────────────────────────────────────
	function loadAchievements() {
		renderLoading();
		vscode.postMessage({ type: "getAchievements" });
	}

	function renderAchievements(list) {
		const app = document.getElementById("app");
		if (!app) return;

		if (!Array.isArray(list) || !list.length) {
			app.innerHTML = `<div class="wrap">${subNav("Badges")}<div class="msg-box msg-empty">No achievements found.</div></div>`;
			document
				.getElementById("backBtn")
				?.addEventListener("click", requestInitialData);
			return;
		}

		const unlocked = list.filter((a) => a.unlocked).length;
		const legendary = list.filter((a) => a.legendary && a.unlocked).length;
		const epic = list.filter((a) => a.epic && a.unlocked).length;
		const rare = list.filter((a) => a.rare && a.unlocked).length;

		const groups = {
			"🏆 Unlocked": list.filter((a) => a.unlocked),
			"⚡ In Progress": list.filter(
				(a) => !a.unlocked && !a.hidden && (a.progress || 0) > 0,
			),
			"🔒 Locked": list.filter(
				(a) => !a.unlocked && !a.hidden && !(a.progress || 0),
			),
			"👁 Hidden": list.filter((a) => !a.unlocked && a.hidden),
		};

		let sectionsHtml = "";
		for (const [label, items] of Object.entries(groups)) {
			if (!items.length) continue;
			const cards = items
				.map((ach) => {
					const rarity = getRarity(ach);
					const state = ach.unlocked ? "unlocked" : "locked";
					const pct = Math.round((ach.progress || 0) * 100);
					const iconDisplay =
						ach.hidden && !ach.unlocked ? "🔒" : ach.icon;
					const nameDisplay =
						ach.hidden && !ach.unlocked ? "???" : ach.name;
					const progBar =
						!ach.unlocked && pct > 0
							? `<div class="ach-prog"><div class="ach-prog-fill" style="width:${pct}%"></div></div>`
							: "";

					return `
					<div class="ach-card ${state} ${rarity}" data-id="${ach.id}">
						<div class="ach-icon">${iconDisplay}</div>
						<div class="ach-name">${nameDisplay}</div>
						<div class="ach-dot ${rarity}"></div>
						${progBar}
					</div>`;
				})
				.join("");

			sectionsHtml += `<div class="ach-section-title">${label}</div><div class="ach-grid">${cards}</div>`;
		}

		app.innerHTML = `
			<div class="wrap">
				${subNav("Badges")}
				<div class="ach-summary">
					<div class="ach-pill ach-pill-all">${unlocked} / ${list.length}</div>
					${rare ? `<div class="ach-pill ach-pill-rare">${rare} rare</div>` : ""}
					${epic ? `<div class="ach-pill ach-pill-epic">${epic} epic</div>` : ""}
					${legendary ? `<div class="ach-pill ach-pill-legendary">${legendary} legendary</div>` : ""}
				</div>
				${sectionsHtml}
			</div>`;

		document
			.getElementById("backBtn")
			?.addEventListener("click", requestInitialData);

		// attach tooltips
		document.querySelectorAll(".ach-card").forEach((card) => {
			const ach = list.find((a) => a.id === card.dataset.id);
			if (!ach) return;
			card.addEventListener("mouseenter", () => showTooltip(card, ach));
			card.addEventListener("mouseleave", removeTooltip);
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// LEADERBOARD
	// ─────────────────────────────────────────────────────────────────────────
	function loadLeaderboard() {
		renderLoading();
		vscode.postMessage({ type: "getLeaderboard" });
	}

	function renderLeaderboard(data, error) {
		const app = document.getElementById("app");
		if (!app) return;

		if (error) {
			app.innerHTML = `<div class="wrap">${subNav("Leaderboard")}<div class="msg-box msg-error">${escapeHtml(error)}</div></div>`;
			document
				.getElementById("backBtn")
				?.addEventListener("click", requestInitialData);
			return;
		}

		if (!Array.isArray(data) || !data.length) {
			app.innerHTML = `<div class="wrap">${subNav("Leaderboard")}<div class="msg-box msg-empty">No players on the board yet.</div></div>`;
			document
				.getElementById("backBtn")
				?.addEventListener("click", requestInitialData);
			return;
		}

		data.sort((a, b) => (b.total_xp || 0) - (a.total_xp || 0));
		const maxXP = data[0]?.total_xp || 1;

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
								: null;
				const rankEl = medal
					? `<div class="lb-rank">${medal}</div>`
					: `<div class="lb-rank"><span class="lb-rank-num">${rank}</span></div>`;
				const xp = p.total_xp || 0;
				const barPct = Math.round((xp / maxXP) * 100);
				const avLetter = (p.username || "?").charAt(0).toUpperCase();
				return `
				<div class="lb-item">
					${rankEl}
					<div class="lb-av">${avLetter}</div>
					<div class="lb-info">
						<div class="lb-name">${escapeHtml(p.username || "Unknown")}</div>
						<div class="lb-xp-txt">${xp.toLocaleString()} xp</div>
					</div>
					<div class="lb-bar-wrap">
						<div class="lb-bar-track">
							<div class="lb-bar-fill" style="width:${barPct}%"></div>
						</div>
					</div>
				</div>`;
			})
			.join("");

		app.innerHTML = `<div class="wrap">${subNav("Leaderboard")}<div class="lb-list">${rows}</div></div>`;
		document
			.getElementById("backBtn")
			?.addEventListener("click", requestInitialData);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PROFILE
	// ─────────────────────────────────────────────────────────────────────────
	function openProfile() {
		renderLoading();
		vscode.postMessage({ type: "getProfile" });
	}

	function renderProfile(username) {
		const app = document.getElementById("app");
		if (!app) return;
		const initial = (username || "U").charAt(0).toUpperCase();
		app.innerHTML = `
			<div class="wrap">
				${subNav("Profile")}
				<div class="profile-body">
					<div class="p-avatar-wrap">
						<div class="p-avatar">${initial}</div>
						<div class="p-hint">your identity on the board</div>
					</div>
					<label class="field-label" for="profileInput">Display name</label>
					<input class="field-input" id="profileInput" value="${escapeHtml(username || "")}" maxlength="20" placeholder="Enter your name..." autocomplete="off" />
					<button class="save-btn" id="saveBtn">Save Changes</button>
				</div>
			</div>`;

		document
			.getElementById("backBtn")
			?.addEventListener("click", requestInitialData);
		document
			.getElementById("saveBtn")
			?.addEventListener("click", saveProfile);
		document.getElementById("profileInput")?.focus();
	}

	function saveProfile() {
		const input = document.getElementById("profileInput");
		const name = input?.value?.trim();
		if (!name) {
			alert("Please enter a name");
			return;
		}
		vscode.postMessage({ type: "saveProfile", username: name });
	}

	// expose toast for extension host
	window.__showUnlockToast = showUnlockToast;
})();
