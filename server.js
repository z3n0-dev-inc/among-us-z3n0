<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Space Traitors — Among Us Remake</title>
<script src="https://download.playfab.com/PlayFabClientApi.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
:root{
  --bg:#030712;--surface:rgba(255,255,255,0.04);--border:rgba(255,255,255,0.1);
  --accent:#a78bfa;--accent2:#f472b6;--green:#4ade80;--red:#f87171;--gold:#fbbf24;
}
body{background:var(--bg);overflow:hidden;font-family:'Nunito',sans-serif;user-select:none;color:#fff;}
.screen{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 0%,#1a0a2e 0%,var(--bg) 70%);z-index:100;}
.screen.hidden{display:none;}
.glass{background:rgba(12,8,28,0.88);border:1px solid rgba(167,139,250,0.2);backdrop-filter:blur(24px);border-radius:22px;padding:32px;width:460px;max-width:96vw;max-height:92vh;overflow-y:auto;box-shadow:0 32px 80px rgba(0,0,0,0.8),inset 0 1px 0 rgba(255,255,255,0.07);}
.game-title{font-size:38px;font-weight:900;text-align:center;background:linear-gradient(135deg,#c4b5fd 0%,#f472b6 50%,#fb923c 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:4px;letter-spacing:-1px;}
.game-subtitle{text-align:center;color:rgba(255,255,255,0.3);font-size:12px;margin-bottom:24px;letter-spacing:1px;text-transform:uppercase;}
.inp{width:100%;background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.1);color:#fff;padding:12px 16px;border-radius:10px;font-size:14px;font-family:'Nunito',sans-serif;margin-bottom:10px;outline:none;transition:border-color .2s,box-shadow .2s;}
.inp:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(167,139,250,0.15);}
.inp::placeholder{color:rgba(255,255,255,0.25);}
.btn{width:100%;padding:13px;border-radius:10px;border:none;font-size:15px;font-weight:800;cursor:pointer;transition:all .2s;margin-bottom:8px;font-family:'Nunito',sans-serif;}
.btn-primary{background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;box-shadow:0 4px 20px rgba(124,58,237,.35);}
.btn-primary:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 28px rgba(124,58,237,.5);}
.btn-secondary{background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.85);border:1.5px solid rgba(255,255,255,0.12);}
.btn-secondary:hover:not(:disabled){background:rgba(255,255,255,0.12);}
.btn:disabled{opacity:.35;cursor:not-allowed!important;transform:none!important;}
.err{color:var(--red);font-size:13px;text-align:center;margin-bottom:10px;min-height:18px;}
.link{color:var(--accent);cursor:pointer;text-align:center;font-size:13px;margin-top:4px;}
.link:hover{text-decoration:underline;}
.divider{border:none;border-top:1px solid rgba(255,255,255,0.08);margin:16px 0;}
.color-grid{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;}
.color-swatch{width:36px;height:36px;border-radius:50%;cursor:pointer;border:3px solid transparent;transition:all .15s;position:relative;}
.color-swatch.selected{border-color:#fff;transform:scale(1.2);}
.color-swatch.selected::after{content:'✓';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#fff;}
#lobby-screen .glass{width:580px;}
.room-code-display{font-size:34px;font-weight:900;letter-spacing:12px;text-align:center;color:var(--accent);background:rgba(124,58,237,0.1);border:1.5px solid rgba(124,58,237,0.3);border-radius:12px;padding:14px;margin-bottom:16px;cursor:pointer;transition:background .2s;}
.room-code-display:hover{background:rgba(124,58,237,0.18);}
.player-list{display:flex;flex-direction:column;gap:7px;margin-bottom:14px;max-height:260px;overflow-y:auto;}
.player-item{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.04);border-radius:10px;padding:10px 14px;border:1px solid rgba(255,255,255,0.06);}
.player-dot{width:22px;height:22px;border-radius:50%;flex-shrink:0;border:2px solid rgba(255,255,255,0.25);}
.player-name{flex:1;font-size:14px;font-weight:600;}
.host-badge{font-size:11px;background:rgba(251,191,36,0.18);color:#fbbf24;padding:2px 8px;border-radius:8px;font-weight:700;}
.owner-badge{font-size:11px;background:rgba(239,68,68,0.18);color:var(--red);padding:2px 8px;border-radius:8px;font-weight:700;}
.tab-btns{display:flex;gap:5px;margin-bottom:18px;}
.tab-btn{flex:1;padding:9px 6px;border-radius:8px;border:1.5px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.45);cursor:pointer;font-size:12px;font-weight:700;transition:all .15s;font-family:'Nunito',sans-serif;}
.tab-btn.active{background:rgba(124,58,237,0.25);border-color:rgba(167,139,250,0.5);color:#fff;}
.tab-content{display:none;}
.tab-content.active{display:block;}
.shop-filter-row{display:flex;gap:5px;margin-bottom:12px;flex-wrap:wrap;}
.shop-filter-btn{padding:5px 11px;border-radius:7px;border:1.5px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.45);cursor:pointer;font-size:11px;font-weight:700;transition:all .15s;}
.shop-filter-btn.active{background:rgba(124,58,237,0.25);border-color:var(--accent);color:#fff;}
.shop-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin-bottom:14px;max-height:340px;overflow-y:auto;}
.shop-item{background:rgba(255,255,255,0.03);border:1.5px solid rgba(255,255,255,0.08);border-radius:11px;padding:12px 8px;text-align:center;cursor:pointer;transition:all .18s;position:relative;}
.shop-item:hover{border-color:var(--accent);background:rgba(124,58,237,0.1);transform:translateY(-1px);}
.shop-item.owned{border-color:rgba(34,197,94,0.5);background:rgba(34,197,94,0.07);}
.shop-item.equipped-item{border-color:var(--gold);background:rgba(251,191,36,0.08);}
.shop-item-icon{font-size:26px;margin-bottom:5px;line-height:1;}
.shop-item-name{font-size:10px;font-weight:700;margin-bottom:3px;line-height:1.2;}
.shop-item-price{font-size:10px;color:var(--gold);font-weight:700;}
.rarity-common{color:#9ca3af}.rarity-uncommon{color:#4ade80}.rarity-rare{color:#60a5fa}
.rarity-epic{color:#c084fc}.rarity-legendary{color:#fbbf24}.rarity-mythic{color:#f472b6}.rarity-owner{color:#ef4444}
#hud{position:fixed;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:linear-gradient(to bottom,rgba(0,0,0,.8),transparent);pointer-events:none;z-index:25;}
#hud.hidden{display:none;}
.hud-left{display:flex;align-items:center;gap:14px;}
.role-badge{padding:6px 16px;border-radius:20px;font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:1px;}
.role-crewmate{background:rgba(34,197,94,0.18);color:#4ade80;border:1.5px solid rgba(34,197,94,0.35);}
.role-impostor{background:rgba(239,68,68,0.18);color:var(--red);border:1.5px solid rgba(239,68,68,0.35);}
.task-bar-wrap{width:160px;background:rgba(255,255,255,0.1);border-radius:10px;height:9px;overflow:hidden;}
.task-bar{height:100%;background:linear-gradient(90deg,#4ade80,#22c55e);border-radius:10px;transition:width .5s ease;}
#hud-right{display:flex;gap:7px;pointer-events:all;}
#action-btns{position:fixed;bottom:22px;right:20px;display:flex;flex-direction:column;gap:9px;z-index:25;}
#action-btns.hidden{display:none;}
.action-btn{padding:12px 22px;border-radius:12px;border:none;font-size:14px;font-weight:800;cursor:pointer;transition:all .18s;text-transform:uppercase;letter-spacing:.5px;display:flex;align-items:center;gap:8px;box-shadow:0 4px 20px rgba(0,0,0,.5);font-family:'Nunito',sans-serif;}
.action-btn:disabled{opacity:.28;cursor:not-allowed!important;transform:none!important;}
#btn-kill{background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;display:none;}
#btn-kill:not(:disabled):hover{transform:scale(1.05);box-shadow:0 6px 24px rgba(239,68,68,.55);}
#btn-report{background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;display:none;}
#btn-task{background:linear-gradient(135deg,#1d4ed8,#3b82f6);color:#fff;display:none;}
#btn-emergency{background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;}
#btn-vent{background:linear-gradient(135deg,#065f46,#059669);color:#fff;display:none;}
.cooldown-txt{font-size:10px;opacity:.7;font-weight:600;}
#meeting-screen{position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:55;display:none;flex-direction:column;align-items:center;justify-content:flex-start;padding:18px 16px 14px;gap:10px;overflow-y:auto;background-image:radial-gradient(ellipse at 50% 0%,rgba(124,58,237,.15) 0%,transparent 60%);}
.meeting-title{font-size:26px;font-weight:900;color:var(--red);text-transform:uppercase;letter-spacing:4px;text-align:center;}
.meeting-reason{color:rgba(255,255,255,.55);font-size:14px;text-align:center;max-width:480px;}
.meeting-grid{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:660px;}
.vote-card{width:110px;background:rgba(255,255,255,0.04);border:2px solid rgba(255,255,255,0.1);border-radius:14px;padding:12px 8px;text-align:center;cursor:pointer;transition:all .18s;}
.vote-card:hover:not(.dead):not(.my-vote){border-color:var(--accent);background:rgba(124,58,237,0.14);transform:translateY(-2px);}
.vote-card.dead{opacity:.28;cursor:not-allowed;pointer-events:none;}
.vote-card.my-vote{border-color:var(--accent);background:rgba(124,58,237,0.22);box-shadow:0 0 16px rgba(167,139,250,0.3);}
.vote-avatar{width:48px;height:48px;border-radius:50%;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-size:18px;position:relative;}
.vote-name{font-size:11px;font-weight:700;word-break:break-word;}
.vote-count{font-size:15px;font-weight:900;color:var(--red);margin-top:4px;min-height:20px;}
.timer-bar{width:min(360px,92vw);height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;}
.timer-fill{height:100%;background:linear-gradient(90deg,#4ade80,#f59e0b,#ef4444);border-radius:4px;transition:width 1s linear;}
.skip-btn{padding:10px 26px;background:rgba(255,255,255,0.07);border:1.5px solid rgba(255,255,255,0.18);color:#fff;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700;transition:all .15s;font-family:'Nunito',sans-serif;}
.skip-btn:hover:not(:disabled){background:rgba(255,255,255,0.13);}
.skip-btn:disabled{opacity:.35;cursor:not-allowed;}
.chat-area{width:min(520px,96vw);background:rgba(0,0,0,0.5);border:1.5px solid rgba(255,255,255,0.09);border-radius:12px;padding:10px 12px;height:150px;overflow-y:auto;font-size:13px;}
.chat-msg{margin-bottom:5px;line-height:1.5;}
.chat-msg.ghost-msg{opacity:.45;}
.chat-input-row{display:flex;gap:8px;width:min(520px,96vw);}
.chat-input-row input{flex:1;margin:0!important;}
#task-modal{position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:65;display:none;align-items:center;justify-content:center;backdrop-filter:blur(4px);}
.task-box{background:#080e1d;border:1.5px solid rgba(167,139,250,0.3);border-radius:20px;padding:30px;width:420px;max-width:96vw;text-align:center;box-shadow:0 0 60px rgba(124,58,237,0.2);}
.task-title{font-size:22px;font-weight:900;margin-bottom:5px;color:var(--accent);}
.task-subtitle{color:rgba(255,255,255,0.4);font-size:13px;margin-bottom:20px;}
.wire-grid{display:flex;justify-content:space-between;align-items:center;gap:16px;margin:14px 0;}
.wire-col{display:flex;flex-direction:column;gap:14px;}
.wire-node{width:44px;height:44px;border-radius:50%;border:3px solid;cursor:pointer;transition:all .18s;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;background:rgba(0,0,0,.4);}
.wire-node:hover{transform:scale(1.12);}
.wire-node.wconn{opacity:.4;pointer-events:none;}
.wire-node.selected-wire{transform:scale(1.2);box-shadow:0 0 14px currentColor;}
svg.wires{flex:1;min-width:80px;}
.mash-btn{width:130px;height:130px;border-radius:50%;background:radial-gradient(circle,#dc2626,#ef4444);border:4px solid #f87171;cursor:pointer;font-size:16px;font-weight:900;color:#fff;transition:all .1s;margin:12px auto;display:block;box-shadow:0 0 40px rgba(239,68,68,.5);font-family:'Nunito',sans-serif;}
.mash-btn:active{transform:scale(.88)!important;}
.mash-bar{height:14px;background:rgba(255,255,255,0.09);border-radius:7px;overflow:hidden;margin:10px 0;}
.mash-fill{height:100%;background:linear-gradient(90deg,#4ade80,#22c55e);border-radius:7px;transition:width .1s;}
.pattern-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;max-width:230px;margin:0 auto 14px;}
.pattern-cell{height:65px;border-radius:10px;cursor:pointer;transition:all .14s;border:2px solid rgba(255,255,255,0.09);background:rgba(255,255,255,0.04);}
.pattern-cell.lit{background:rgba(251,191,36,0.7);border-color:#fbbf24;box-shadow:0 0 20px rgba(251,191,36,0.5);}
.pattern-cell.correct{background:rgba(34,197,94,0.6);border-color:#4ade80;}
.pattern-cell.wrong{background:rgba(239,68,68,0.6);border-color:var(--red);}
.win-title{font-size:44px;font-weight:900;text-align:center;margin-bottom:6px;}
.win-crew{color:#4ade80;text-shadow:0 0 30px rgba(74,222,128,.4);}
.win-impostor{color:var(--red);text-shadow:0 0 30px rgba(248,113,113,.4);}
.results-list{display:flex;flex-direction:column;gap:8px;margin:14px 0;max-height:290px;overflow-y:auto;}
.result-item{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.04);border-radius:10px;padding:10px 14px;border:1px solid rgba(255,255,255,0.07);}
#owner-panel{position:fixed;top:58px;right:16px;background:rgba(5,3,14,0.97);border:1.5px solid rgba(239,68,68,0.3);border-radius:14px;padding:16px;width:340px;max-height:88vh;overflow-y:auto;z-index:35;display:none;backdrop-filter:blur(16px);box-shadow:0 24px 60px rgba(0,0,0,.7);}

/* WARDROBE OVERLAY */
#wardrobe-overlay{position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:90;display:none;align-items:center;justify-content:center;backdrop-filter:blur(8px);}
.wardrobe-box{background:#09061a;border:1.5px solid rgba(167,139,250,0.3);border-radius:22px;padding:28px;width:700px;max-width:97vw;max-height:93vh;overflow-y:auto;box-shadow:0 0 80px rgba(124,58,237,.2);}
.wardrobe-title{font-size:20px;font-weight:900;color:var(--accent);margin-bottom:20px;display:flex;align-items:center;gap:10px;}
.wardrobe-layout{display:grid;grid-template-columns:180px 1fr;gap:24px;}
@media(max-width:580px){.wardrobe-layout{grid-template-columns:1fr;}}
.wardrobe-preview-panel{display:flex;flex-direction:column;align-items:center;gap:12px;}
.wardrobe-slots-panel{display:flex;flex-direction:column;gap:14px;}
.wardrobe-slot-section{background:rgba(255,255,255,0.03);border:1.5px solid rgba(255,255,255,0.07);border-radius:12px;padding:14px;}
.ws-label{font-size:11px;font-weight:800;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;}
.ws-items{display:flex;flex-wrap:wrap;gap:8px;}
.ws-item{width:48px;height:48px;border-radius:10px;background:rgba(255,255,255,0.05);border:2px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;transition:all .15s;position:relative;}
.ws-item:hover{border-color:var(--accent);background:rgba(124,58,237,0.15);transform:scale(1.1);}
.ws-item.active{border-color:var(--gold);background:rgba(251,191,36,0.1);box-shadow:0 0 10px rgba(251,191,36,0.25);}
.ws-dot{position:absolute;bottom:-3px;right:-3px;width:12px;height:12px;border-radius:50%;border:2px solid #09061a;}

#task-hud{position:fixed;top:56px;left:12px;z-index:25;background:rgba(0,0,0,.78);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 14px;min-width:175px;pointer-events:none;}
#task-hud.hidden{display:none;}
.tli{font-size:12px;padding:3px 0;display:flex;align-items:center;gap:7px;font-weight:600;}
.tli.done{opacity:.38;text-decoration:line-through;}
.tli-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
#ghost-label{position:fixed;bottom:110px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.72);border:1px solid rgba(255,255,255,.2);border-radius:20px;padding:8px 22px;font-size:13px;font-weight:700;color:rgba(255,255,255,.5);z-index:26;display:none;pointer-events:none;}

#notifs{position:fixed;top:66px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;gap:7px;z-index:80;pointer-events:none;width:min(400px,94vw);}
.notif{background:rgba(8,6,20,0.95);border:1.5px solid rgba(255,255,255,0.12);border-radius:10px;padding:10px 18px;font-size:14px;font-weight:600;text-align:center;animation:slideIn .28s ease;box-shadow:0 8px 24px rgba(0,0,0,.5);}
@keyframes slideIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
#kill-flash{position:fixed;inset:0;background:rgba(239,68,68,0);pointer-events:none;z-index:90;transition:background .15s;}
#kill-flash.flash{background:rgba(239,68,68,.4);}
#phase-banner{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:62px;font-weight:900;text-transform:uppercase;letter-spacing:4px;pointer-events:none;z-index:88;text-shadow:0 0 40px currentColor;display:none;}
#stars-bg{position:fixed;inset:0;pointer-events:none;z-index:0;}
#loading-screen{background:#000;z-index:200;}
.loading-bar-wrap{width:200px;height:4px;background:rgba(255,255,255,0.08);border-radius:2px;margin:16px auto 0;}
.loading-bar{height:100%;background:var(--accent);border-radius:2px;animation:loadAnim 1.6s ease-in-out infinite;}
@keyframes loadAnim{0%{width:0%;margin-left:0}50%{width:100%}100%{width:0%;margin-left:100%}}

.obtn{padding:7px 5px;border-radius:7px;border:none;cursor:pointer;font-size:12px;font-weight:700;transition:all .15s;color:#fff;font-family:'Nunito',sans-serif;}
.obtn:hover{transform:translateY(-1px);filter:brightness(1.15);}
.obtn-red{background:linear-gradient(135deg,#dc2626,#ef4444);}
.obtn-orange{background:linear-gradient(135deg,#d97706,#f59e0b);}
.obtn-yellow{background:linear-gradient(135deg,#b45309,#d97706);}
.obtn-green{background:linear-gradient(135deg,#15803d,#22c55e);}
.obtn-blue{background:linear-gradient(135deg,#1d4ed8,#3b82f6);}
.obtn-purple{background:linear-gradient(135deg,#7c3aed,#a855f7);}
.player-tag{display:inline-block;font-size:10px;font-weight:800;padding:2px 7px;border-radius:7px;margin-left:4px;vertical-align:middle;}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:2px}
</style>
</head>
<body>
<canvas id="stars-bg"></canvas>
<div id="notifs"></div>
<div id="kill-flash"></div>
<div id="phase-banner"></div>
<div id="ghost-label">👻 You are a ghost — observe only</div>

<!-- LOADING -->
<div class="screen" id="loading-screen">
  <div style="text-align:center">
    <div class="game-title">Space Traitors</div>
    <div style="color:rgba(255,255,255,.35);font-size:13px;margin-top:8px;letter-spacing:2px;text-transform:uppercase">Connecting...</div>
    <div class="loading-bar-wrap"><div class="loading-bar"></div></div>
  </div>
</div>

<!-- AUTH -->
<div class="screen hidden" id="auth-screen">
  <div class="glass">
    <div class="game-title">Space Traitors</div>
    <div class="game-subtitle">Among Us Remake · Find the Traitor</div>
    <div id="login-form">
      <input class="inp" id="login-username" placeholder="Username" autocomplete="username">
      <input class="inp" id="login-password" type="password" placeholder="Password" autocomplete="current-password">
      <div class="err" id="login-err"></div>
      <button class="btn btn-primary" onclick="doLogin()">🚀 Play Now</button>
      <p class="link" onclick="showRegister()">No account? Register →</p>
    </div>
    <div id="register-form" style="display:none">
      <input class="inp" id="reg-username" placeholder="Choose a username">
      <input class="inp" id="reg-password" type="password" placeholder="Choose a password">
      <div class="err" id="reg-err"></div>
      <div style="font-size:12px;color:rgba(255,255,255,.35);margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Pick your color</div>
      <div class="color-grid" id="reg-color-grid"></div>
      <button class="btn btn-primary" onclick="doRegister()">✨ Create Account</button>
      <p class="link" onclick="showLogin()">← Back to Login</p>
    </div>
  </div>
</div>

<!-- MENU -->
<div class="screen hidden" id="menu-screen">
  <div class="glass">
    <div class="game-title">Space Traitors</div>
    <div id="menu-welcome" style="text-align:center;color:rgba(255,255,255,.45);font-size:14px;font-weight:700;margin-bottom:3px"></div>
    <div id="menu-player-tags" style="text-align:center;margin-bottom:5px;min-height:18px"></div>
    <div id="menu-credits" style="text-align:center;color:var(--gold);font-size:16px;font-weight:900;margin-bottom:18px">💰 0 Credits</div>
    <div class="tab-btns">
      <button class="tab-btn active" onclick="switchMenuTab('play',this)">🎮 Play</button>
      <button class="tab-btn" onclick="switchMenuTab('shop',this)">🛍 Shop</button>
      <button class="tab-btn" onclick="switchMenuTab('wardrobe',this)">👗 Wardrobe</button>
      <button class="tab-btn" onclick="switchMenuTab('profile',this)">👤 Profile</button>
    </div>
    <div class="tab-content active" id="menu-tab-play">
      <input class="inp" id="room-code-input" placeholder="Room code (blank = new room)" maxlength="8" style="text-transform:uppercase;letter-spacing:4px;text-align:center;font-weight:900" oninput="this.value=this.value.toUpperCase()">
      <button class="btn btn-primary" id="join-create-btn" onclick="joinOrCreate()">🚀 Join / Create Room</button>
    </div>
    <div class="tab-content" id="menu-tab-shop">
      <div id="shop-credits" style="text-align:center;color:var(--gold);margin-bottom:10px;font-weight:900;font-size:15px"></div>
      <div class="shop-filter-row" id="shop-filters"></div>
      <div class="shop-grid" id="shop-items-grid"><div style="color:rgba(255,255,255,.35);font-size:13px;grid-column:1/-1;text-align:center;padding:24px">Loading...</div></div>
    </div>
    <div class="tab-content" id="menu-tab-wardrobe">
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px;margin-bottom:16px">
        <canvas id="menuWardrobeCanvas" width="120" height="160" style="border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08)"></canvas>
        <div style="font-size:12px;color:rgba(255,255,255,.35)">Your crewmate preview</div>
      </div>
      <div id="menu-equipped-summary" style="font-size:13px;color:rgba(255,255,255,.6);margin-bottom:12px;line-height:1.8">Loading...</div>
      <button class="btn btn-secondary" onclick="openWardrobe()">🎨 Open Full Wardrobe</button>
    </div>
    <div class="tab-content" id="menu-tab-profile">
      <div id="profile-stats" style="font-size:13px;color:rgba(255,255,255,.7);margin-bottom:12px;line-height:1.9">Loading...</div>
      <hr class="divider">
      <div style="font-size:12px;color:rgba(255,255,255,.4);margin-bottom:8px;font-weight:700">Player Color:</div>
      <div class="color-grid" id="profile-color-grid"></div>
      <button class="btn btn-secondary" style="margin-top:8px" onclick="logout()">🚪 Logout</button>
    </div>
  </div>
</div>

<!-- LOBBY -->
<div class="screen hidden" id="lobby-screen">
  <div class="glass" style="width:580px">
    <div style="text-align:center;font-size:11px;color:rgba(255,255,255,.3);margin-bottom:8px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Room Code — click to copy</div>
    <div class="room-code-display" id="lobby-code" onclick="copyCode()">------</div>
    <div style="display:flex;justify-content:space-between;font-size:13px;color:rgba(255,255,255,.45);margin-bottom:12px;font-weight:600">
      <span id="lobby-player-count">0/10 players</span>
      <span id="lobby-phase-text">Waiting for host...</span>
    </div>
    <div class="player-list" id="lobby-player-list"></div>
    <button class="btn btn-primary" id="start-btn" onclick="startGame()" style="display:none">▶ Start Game</button>
    <button class="btn btn-secondary" id="lobby-wait-btn" disabled style="display:none">⏳ Waiting for host...</button>
    <hr class="divider">
    <button class="btn btn-secondary" onclick="leaveLobby()">← Leave Room</button>
  </div>
</div>

<!-- HUD -->
<div id="hud" class="hidden">
  <div class="hud-left">
    <div class="role-badge role-crewmate" id="role-badge">CREWMATE</div>
    <div>
      <div style="font-size:10px;color:rgba(255,255,255,.4);margin-bottom:4px;font-weight:700;letter-spacing:1px">TASKS</div>
      <div class="task-bar-wrap"><div class="task-bar" id="task-bar" style="width:0%"></div></div>
    </div>
    <div id="alive-count" style="font-size:12px;color:rgba(255,255,255,.45);font-weight:700"></div>
  </div>
  <div id="hud-right">
    <button class="btn btn-secondary" style="font-size:12px;padding:6px 12px;pointer-events:all;font-weight:900" onclick="toggleOwnerPanel()">👑</button>
    <button class="btn btn-secondary" style="font-size:12px;padding:6px 12px;pointer-events:all;font-weight:900" onclick="openWardrobe()">👗</button>
  </div>
</div>

<!-- TASK LIST HUD -->
<div id="task-hud" class="hidden">
  <div style="font-size:10px;font-weight:900;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">📋 Tasks</div>
  <div id="task-hud-items"></div>
</div>

<!-- ACTION BUTTONS -->
<div id="action-btns" class="hidden">
  <button class="action-btn" id="btn-kill" onclick="tryKill()">☠ Kill</button>
  <button class="action-btn" id="btn-vent" onclick="tryVent()">🕳 Vent</button>
  <button class="action-btn" id="btn-report" onclick="reportBody()">📢 Report Body</button>
  <button class="action-btn" id="btn-task" onclick="openNearbyTask()">🔧 Do Task</button>
  <button class="action-btn" id="btn-emergency" onclick="callEmergency()">🚨 Meeting</button>
</div>

<!-- MEETING -->
<div id="meeting-screen">
  <div class="meeting-title" id="meeting-title-text">EMERGENCY MEETING</div>
  <div class="meeting-reason" id="meeting-reason-text"></div>
  <div class="timer-bar"><div class="timer-fill" id="timer-fill" style="width:100%"></div></div>
  <div id="meeting-phase-label" style="color:rgba(255,255,255,.45);font-size:13px;font-weight:700">💬 Discussion Phase</div>
  <div class="meeting-grid" id="vote-grid"></div>
  <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:center">
    <button class="skip-btn" id="skip-vote-btn" onclick="castVote('skip')" disabled>⏭ Skip Vote</button>
  </div>
  <div class="chat-area" id="chat-area"></div>
  <div class="chat-input-row">
    <input class="inp" id="chat-input" placeholder="Say something..." style="margin:0" onkeydown="if(event.key==='Enter')sendChat()" maxlength="200">
    <button class="btn btn-secondary" style="width:auto;padding:10px 16px;margin:0;flex-shrink:0;font-weight:800" onclick="sendChat()">Send</button>
  </div>
</div>

<!-- TASK MODAL -->
<div id="task-modal">
  <div class="task-box">
    <div class="task-title" id="task-modal-title">Fix Wires</div>
    <div class="task-subtitle" id="task-modal-subtitle">Location</div>
    <div id="task-modal-content"></div>
    <button class="btn btn-secondary" style="width:auto;padding:9px 22px;margin-top:12px;font-weight:800" onclick="closeTask()">✕ Cancel</button>
  </div>
</div>

<!-- END SCREEN -->
<div class="screen hidden" id="end-screen">
  <div class="glass">
    <div class="win-title" id="win-title"></div>
    <div id="win-subtitle" style="text-align:center;font-size:15px;color:rgba(255,255,255,.5);margin-bottom:16px;font-weight:600"></div>
    <div class="results-list" id="results-list"></div>
    <button class="btn btn-primary" onclick="backToMenu()">🏠 Back to Menu</button>
  </div>
</div>

<!-- OWNER PANEL -->
<div id="owner-panel"></div>

<!-- WARDROBE OVERLAY -->
<div id="wardrobe-overlay">
  <div class="wardrobe-box">
    <div class="wardrobe-title">
      <span>👗 Wardrobe</span>
      <button onclick="closeWardrobe()" style="margin-left:auto;background:rgba(255,255,255,.08);border:none;color:#fff;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:16px;font-weight:900">✕</button>
    </div>
    <div class="wardrobe-layout">
      <div class="wardrobe-preview-panel">
        <div style="font-size:11px;color:rgba(255,255,255,.4);font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Preview</div>
        <canvas id="wardrobeCanvas" width="160" height="210" style="border-radius:14px;background:rgba(255,255,255,.03);border:1.5px solid rgba(255,255,255,.1)"></canvas>
        <div style="font-size:11px;color:rgba(255,255,255,.35);text-align:center;margin-top:8px">Click items to equip</div>
        <div style="margin-top:12px;width:100%">
          <div style="font-size:11px;color:rgba(255,255,255,.4);margin-bottom:6px;font-weight:800">🏷️ Your Tags:</div>
          <div id="wardrobe-tags" style="display:flex;flex-wrap:wrap;gap:5px;justify-content:center"></div>
        </div>
        <div style="margin-top:10px;font-size:11px;color:rgba(255,255,255,.3)">💰 <span id="wardrobe-credits-display">0</span> credits</div>
      </div>
      <div class="wardrobe-slots-panel" id="wardrobe-slots"></div>
    </div>
  </div>
</div>

<script>
// ════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════
const PLAYFAB_TITLE_ID='1E7E83';
if(typeof PlayFab!=='undefined')PlayFab.settings.titleId=PLAYFAB_TITLE_ID;
const GAME_SERVER_HTTP=window.location.origin;
const GAME_SERVER_WS=GAME_SERVER_HTTP.replace('https://','wss://').replace('http://','ws://');
const OWNER_PASSWORD='Zeno2026';
const DISC_TIME=20000,VOTE_TIME=60000,MASH_GOAL=22;
const COLORS=['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#e91e63','#00bcd4','#cddc39'];

// ════════════════════════════════════════════════════════
// COSMETICS CATALOGUE
// ════════════════════════════════════════════════════════
const CM={
  hat_cap:{icon:'🧢',name:'Cap',rarity:'common',type:'hat',price:50},
  hat_bandana:{icon:'🤠',name:'Cowboy Hat',rarity:'common',type:'hat',price:60},
  hat_santa:{icon:'🎅',name:'Santa Hat',rarity:'uncommon',type:'hat',price:100},
  hat_flower:{icon:'🌸',name:'Flower',rarity:'uncommon',type:'hat',price:100},
  hat_glasses:{icon:'🕶️',name:'Cool Glasses',rarity:'uncommon',type:'hat',price:120},
  hat_party:{icon:'🎉',name:'Party Hat',rarity:'uncommon',type:'hat',price:130},
  hat_tophat:{icon:'🎩',name:'Top Hat',rarity:'rare',type:'hat',price:200},
  hat_ninja:{icon:'🥷',name:'Ninja Mask',rarity:'rare',type:'hat',price:200},
  hat_pirate:{icon:'🏴‍☠️',name:'Pirate Hat',rarity:'rare',type:'hat',price:220},
  hat_chef:{icon:'👨‍🍳',name:'Chef Hat',rarity:'rare',type:'hat',price:220},
  hat_wizard_h:{icon:'🧙',name:'Wizard Hat',rarity:'epic',type:'hat',price:320},
  hat_halo:{icon:'😇',name:'Halo',rarity:'epic',type:'hat',price:350},
  hat_horns:{icon:'😈',name:'Devil Horns',rarity:'epic',type:'hat',price:350},
  hat_crown:{icon:'👑',name:'Crown',rarity:'legendary',type:'hat',price:600},
  hat_fire:{icon:'🔥',name:'Fire Crown',rarity:'legendary',type:'hat',price:700},
  hat_galaxy:{icon:'🌌',name:'Galaxy Crown',rarity:'mythic',type:'hat',price:1200},
  hat_diamond:{icon:'💎',name:'Diamond Crown',rarity:'mythic',type:'hat',price:1500},
  skin_ghost:{icon:'👻',name:'Ghost',rarity:'uncommon',type:'skin',price:150},
  skin_zombie:{icon:'🧟',name:'Zombie',rarity:'rare',type:'skin',price:280},
  skin_robot:{icon:'🤖',name:'Robot',rarity:'rare',type:'skin',price:300},
  skin_alien:{icon:'👽',name:'Alien',rarity:'epic',type:'skin',price:400},
  skin_wizard:{icon:'🧙‍♂️',name:'Wizard',rarity:'legendary',type:'skin',price:600},
  skin_demon:{icon:'👹',name:'Demon',rarity:'epic',type:'skin',price:420},
  skin_angel:{icon:'👼',name:'Angel',rarity:'epic',type:'skin',price:420},
  skin_cyber:{icon:'🦾',name:'Cyborg',rarity:'legendary',type:'skin',price:700},
  skin_vampire:{icon:'🧛',name:'Vampire',rarity:'legendary',type:'skin',price:650},
  skin_golden:{icon:'✨',name:'Golden',rarity:'mythic',type:'skin',price:2000},
  trail_fire:{icon:'🔥',name:'Fire Trail',rarity:'rare',type:'trail',price:250,trailColor:'#ef4444'},
  trail_ice:{icon:'❄️',name:'Ice Trail',rarity:'rare',type:'trail',price:250,trailColor:'#7dd3fc'},
  trail_rainbow:{icon:'🌈',name:'Rainbow Trail',rarity:'epic',type:'trail',price:450,trailColor:'#f472b6'},
  trail_gold:{icon:'💛',name:'Gold Trail',rarity:'epic',type:'trail',price:400,trailColor:'#fbbf24'},
  trail_purple:{icon:'💜',name:'Purple Trail',rarity:'rare',type:'trail',price:280,trailColor:'#a78bfa'},
  trail_green:{icon:'💚',name:'Lime Trail',rarity:'uncommon',type:'trail',price:150,trailColor:'#4ade80'},
  trail_galaxy:{icon:'🌌',name:'Galaxy Trail',rarity:'legendary',type:'trail',price:800,trailColor:'#818cf8'},
  trail_blood:{icon:'🩸',name:'Blood Trail',rarity:'legendary',type:'trail',price:900,trailColor:'#dc2626'},
  aura_blue:{icon:'💙',name:'Blue Aura',rarity:'rare',type:'aura',price:300,auraColor:'#3b82f6'},
  aura_red:{icon:'❤️',name:'Red Aura',rarity:'rare',type:'aura',price:300,auraColor:'#ef4444'},
  aura_purple:{icon:'💜',name:'Purple Aura',rarity:'epic',type:'aura',price:500,auraColor:'#a78bfa'},
  aura_gold:{icon:'💛',name:'Gold Aura',rarity:'legendary',type:'aura',price:800,auraColor:'#fbbf24'},
  aura_green:{icon:'💚',name:'Nature Aura',rarity:'rare',type:'aura',price:320,auraColor:'#22c55e'},
  aura_pink:{icon:'🩷',name:'Pink Aura',rarity:'epic',type:'aura',price:480,auraColor:'#ec4899'},
  aura_white:{icon:'🤍',name:'Holy Aura',rarity:'legendary',type:'aura',price:700,auraColor:'#f1f5f9'},
  nc_gold:{icon:'🟡',name:'Gold Name',rarity:'epic',type:'namecolor',price:400,nameColor:'#fbbf24'},
  nc_red:{icon:'🔴',name:'Red Name',rarity:'rare',type:'namecolor',price:250,nameColor:'#ef4444'},
  nc_cyan:{icon:'🔵',name:'Cyan Name',rarity:'rare',type:'namecolor',price:250,nameColor:'#22d3ee'},
  nc_pink:{icon:'🩷',name:'Pink Name',rarity:'epic',type:'namecolor',price:380,nameColor:'#ec4899'},
  nc_green:{icon:'🟢',name:'Green Name',rarity:'uncommon',type:'namecolor',price:180,nameColor:'#4ade80'},
  tag_owner:{icon:'👑',name:'[OWNER]',rarity:'owner',type:'tag',ownerOnly:true,tagStyle:'background:#dc2626;color:#fff'},
  tag_z3n0:{icon:'⚡',name:'[Z3N0]',rarity:'owner',type:'tag',ownerOnly:true,tagStyle:'background:linear-gradient(90deg,#7c3aed,#ec4899);color:#fff'},
  tag_mod:{icon:'🛡',name:'[MOD]',rarity:'owner',type:'tag',ownerOnly:true,tagStyle:'background:#1d4ed8;color:#fff'},
  tag_admin:{icon:'🔑',name:'[ADMIN]',rarity:'owner',type:'tag',ownerOnly:true,tagStyle:'background:#b45309;color:#fff'},
  tag_dev:{icon:'💻',name:'[DEV]',rarity:'owner',type:'tag',ownerOnly:true,tagStyle:'background:#065f46;color:#4ade80'},
  tag_vip:{icon:'💎',name:'[VIP]',rarity:'owner',type:'tag',ownerOnly:true,tagStyle:'background:linear-gradient(90deg,#0ea5e9,#8b5cf6);color:#fff'},
  tag_pro:{icon:'🏆',name:'[PRO]',rarity:'owner',type:'tag',ownerOnly:true,tagStyle:'background:#92400e;color:#fbbf24'},
  tag_legend:{icon:'🌟',name:'[LEGEND]',rarity:'owner',type:'tag',ownerOnly:true,tagStyle:'background:linear-gradient(90deg,#fbbf24,#f97316);color:#000'},
  tag_tester:{icon:'🧪',name:'[TESTER]',rarity:'owner',type:'tag',ownerOnly:true,tagStyle:'background:#134e4a;color:#2dd4bf'},
  tag_og:{icon:'🅾️',name:'[OG]',rarity:'owner',type:'tag',ownerOnly:true,tagStyle:'background:#1e1e2e;color:#cba6f7'},
  tag_donor:{icon:'💸',name:'[DONOR]',rarity:'owner',type:'tag',ownerOnly:true,tagStyle:'background:#064e3b;color:#6ee7b7'},
};

// ════════════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════════════
let ws=null,myPlayerId=null,myRole=null,myTasks=[],gameState=null;
let currentRoomCode=null,selectedColor='#e74c3c';
let activeTaskId=null,mashCount=0,patternSequence=[],patternInput=[],patternPhase='watch';
let wireConnections={},wireTarget=null,wireColorCols=[],wireColorShuf=[];
let killCooldownUntil=0,currentShopFilter='all';
let pfPlayFabId=null,pfSessionTicket=null,pfUsername=null;
let pfCredits=0,pfOwnedItemIds=[];
let equippedHat=null,equippedSkin=null,equippedTrail=null,equippedAura=null,equippedNameColor=null;
let myTags=[],pfStats={};
const playerMods={};
let mySpeedMult=1;
const trailParticles=[];
const auraSprites={},godmodeGlow={},freezeSprites={},titleSprites={};

// ════════════════════════════════════════════════════════
// STARS
// ════════════════════════════════════════════════════════
(function(){
  const cv=document.getElementById('stars-bg'),ctx=cv.getContext('2d');let stars=[];
  function resize(){cv.width=innerWidth;cv.height=innerHeight;stars=Array.from({length:200},()=>({x:Math.random()*cv.width,y:Math.random()*cv.height,r:Math.random()*1.5+.2,a:Math.random(),s:Math.random()*.003+.001}));}
  function draw(){ctx.clearRect(0,0,cv.width,cv.height);for(const s of stars){s.a+=s.s;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,'+((.18+Math.sin(s.a)*.18).toFixed(2))+')';ctx.fill();}requestAnimationFrame(draw);}
  window.addEventListener('resize',resize);resize();draw();
})();

// ════════════════════════════════════════════════════════
// CREWMATE CANVAS RENDERER
// ════════════════════════════════════════════════════════
function shade(hex,amt){
  const n=parseInt((hex||'#888888').replace('#',''),16);
  const r=Math.min(255,Math.max(0,(n>>16)+amt));
  const g=Math.min(255,Math.max(0,((n>>8)&0xFF)+amt));
  const b=Math.min(255,Math.max(0,(n&0xFF)+amt));
  return`rgb(${r},${g},${b})`;
}
function drawCrewmate(ctx,x,y,color,opts){
  opts=opts||{};const s=opts.scale||1;
  ctx.save();ctx.globalAlpha=(opts.alpha!==undefined?opts.alpha:1);ctx.translate(x,y);
  if(opts.aura){const g=ctx.createRadialGradient(0,2*s,6*s,0,2*s,34*s);g.addColorStop(0,opts.aura+'55');g.addColorStop(1,opts.aura+'00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,4*s,34*s,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle=shade(color,-35);ctx.beginPath();ctx.roundRect(-18*s,-2*s,8*s,15*s,3*s);ctx.fill();
  ctx.fillStyle=shade(color,-25);ctx.beginPath();ctx.ellipse(2*s,4*s,12*s,15*s,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(0,3*s,13*s,16*s,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,-12*s,13*s,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#7dd3fc';ctx.beginPath();ctx.ellipse(3*s,-13*s,9*s,7.5*s,-0.15,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#38bdf8';ctx.lineWidth=1.5*s;ctx.beginPath();ctx.ellipse(3*s,-13*s,9*s,7.5*s,-0.15,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,0.62)';ctx.beginPath();ctx.ellipse(0,-17*s,3*s,2*s,-0.2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-8*s,16*s,7*s,11*s,3*s);ctx.fill();ctx.beginPath();ctx.roundRect(2*s,16*s,7*s,11*s,3*s);ctx.fill();
  ctx.fillStyle='#1e293b';ctx.beginPath();ctx.ellipse(-5*s,28*s,6*s,4*s,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(5*s,28*s,6*s,4*s,0,0,Math.PI*2);ctx.fill();
  if(opts.skin){ctx.font=`${14*s}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(opts.skin,0,2*s);}
  if(opts.hat){ctx.font=`${17*s}px serif`;ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText(opts.hat,1*s,-24*s);}
  ctx.restore();
}
function redrawWardrobeCanvas(canvasId){
  const cv=document.getElementById(canvasId);if(!cv)return;
  const ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);
  ctx.fillStyle='rgba(10,6,24,0.85)';ctx.beginPath();ctx.roundRect(0,0,cv.width,cv.height,12);ctx.fill();
  const hatEmoji=equippedHat&&CM[equippedHat]?CM[equippedHat].icon:null;
  const skinEmoji=equippedSkin&&CM[equippedSkin]?CM[equippedSkin].icon:null;
  const auraColor=equippedAura&&CM[equippedAura]?CM[equippedAura].auraColor:null;
  const scale=canvasId==='wardrobeCanvas'?2.4:2.0;
  const yOff=canvasId==='wardrobeCanvas'?cv.height/2+18:cv.height/2+14;
  drawCrewmate(ctx,cv.width/2,yOff,selectedColor,{hat:hatEmoji,skin:skinEmoji,aura:auraColor,scale});
}
function refreshPreviews(){redrawWardrobeCanvas('wardrobeCanvas');redrawWardrobeCanvas('menuWardrobeCanvas');}

// ════════════════════════════════════════════════════════
// PHASER GAME
// ════════════════════════════════════════════════════════
let phaserGame=null,gameScene=null;
const playerSprites={};
let bodySprites=[];
const MAP_W=1000,MAP_H=700;
const CAMERA_ZOOM=2.2;

function initPhaser(){
  if(phaserGame)return;
  phaserGame=new Phaser.Game({type:Phaser.CANVAS,width:innerWidth,height:innerHeight,transparent:true,parent:document.body,
    scene:{preload(){},create(){createScene(this);},update(){updateScene(this);}}});
  setTimeout(()=>{if(phaserGame&&phaserGame.canvas)phaserGame.canvas.style.cssText='position:fixed;top:0;left:0;z-index:5;pointer-events:auto';},150);
}

function drawMap(scene){
  const g=scene.add.graphics();
  g.fillStyle(0x020408,1);g.fillRect(0,0,MAP_W,MAP_H);
  for(let i=0;i<100;i++){g.fillStyle(0xffffff,Math.random()*.5+.1);g.fillCircle(Math.random()*MAP_W,Math.random()*MAP_H,Math.random()*.8+.2);}
  g.fillStyle(0x1a2840,1);g.fillRect(160,275,680,150);g.fillRect(415,95,170,510);
  g.lineStyle(1,0x2a3f60,.35);
  for(let x=160;x<840;x+=40)g.lineBetween(x,275,x,425);
  for(let y=275;y<425;y+=40)g.lineBetween(160,y,840,y);
  const rooms=[
    {x:305,y:55,w:390,h:210,f:0x0d1e38,s:0x2563eb,n:'CAFETERIA',lx:500,ly:152,icon:'☕'},
    {x:35,y:215,w:210,h:185,f:0x180828,s:0x7c3aed,n:'REACTOR',lx:140,ly:302,icon:'⚛️'},
    {x:695,y:55,w:230,h:175,f:0x0a1f3d,s:0x1d4ed8,n:'NAVIGATION',lx:810,ly:135,icon:'🛸'},
    {x:365,y:290,w:270,h:165,f:0x0a2318,s:0x16a34a,n:'MEDBAY',lx:500,ly:368,icon:'🏥'},
    {x:675,y:430,w:285,h:220,f:0x1c1205,s:0xd97706,n:'STORAGE',lx:817,ly:535,icon:'📦'},
    {x:35,y:430,w:240,h:215,f:0x1a0e00,s:0xf59e0b,n:'ELECTRICAL',lx:155,ly:530,icon:'⚡'},
    {x:295,y:508,w:225,h:152,f:0x200505,s:0xdc2626,n:'ENGINE',lx:408,ly:578,icon:'🔧'},
  ];
  for(const r of rooms){
    g.fillStyle(r.f,1);g.fillRect(r.x,r.y,r.w,r.h);
    g.lineStyle(2,r.s,.75);g.strokeRect(r.x,r.y,r.w,r.h);
    g.lineStyle(1,r.s,.12);
    for(let cx=r.x+30;cx<r.x+r.w;cx+=40)g.lineBetween(cx,r.y+2,cx,r.y+r.h-2);
    for(let cy=r.y+30;cy<r.y+r.h;cy+=40)g.lineBetween(r.x+2,cy,r.x+r.w-2,cy);
    scene.add.text(r.lx,r.ly-12,r.icon,{fontSize:'15px'}).setOrigin(.5).setDepth(2).setAlpha(.8);
    scene.add.text(r.lx,r.ly+8,r.n,{fontSize:'9px',color:'#'+r.s.toString(16).padStart(6,'0'),fontFamily:'Nunito,monospace',fontStyle:'bold'}).setOrigin(.5).setDepth(2).setAlpha(.7);
  }
  g.lineStyle(3,0x334155,.9);g.strokeRect(3,3,MAP_W-6,MAP_H-6);
  const ebg=scene.add.graphics().setDepth(3);
  ebg.fillStyle(0xdc2626,1);ebg.fillCircle(500,175,18);
  ebg.lineStyle(3,0xfca5a5,1);ebg.strokeCircle(500,175,18);
  scene.add.text(500,175,'!',{fontSize:'20px',fontStyle:'bold',color:'#fff',fontFamily:'Nunito'}).setOrigin(.5).setDepth(4);
  scene.tweens.add({targets:ebg,alpha:{from:.7,to:1},yoyo:true,repeat:-1,duration:800});
  const ebHit=scene.add.circle(500,175,26).setInteractive().setDepth(5).setAlpha(.001);
  ebHit.on('pointerdown',()=>callEmergency());
  ebHit.on('pointerover',()=>{document.body.style.cursor='pointer';});
  ebHit.on('pointerout',()=>{document.body.style.cursor='default';});
  const tdefs=[{x:148,y:520,c:0xfbbf24},{x:810,y:150,c:0x60a5fa},{x:140,y:310,c:0xa78bfa},{x:500,y:390,c:0x4ade80},{x:760,y:540,c:0xf472b6},{x:410,y:575,c:0xfb923c},{x:500,y:175,c:0xfbbf24}];
  tdefs.forEach((t,i)=>{
    const dot=scene.add.circle(t.x,t.y,9,t.c,.45).setDepth(3);
    const ring=scene.add.circle(t.x,t.y,9).setStrokeStyle(2,t.c).setDepth(3);
    scene.tweens.add({targets:[dot,ring],alpha:{from:.2,to:.9},yoyo:true,repeat:-1,duration:750+i*100});
  });
  scene.ventPositions=[{x:195,y:380},{x:705,y:280},{x:415,y:522}];
  scene.ventPositions.forEach(v=>{
    const vg=scene.add.graphics().setDepth(3);
    vg.fillStyle(0x1e293b,1);vg.lineStyle(2,0x475569,1);
    vg.fillRoundedRect(v.x-15,v.y-8,30,16,4);
    vg.strokeRoundedRect(v.x-15,v.y-8,30,16,4);
    for(let i=0;i<3;i++){vg.lineStyle(1,0x64748b,.9);vg.lineBetween(v.x-9+i*10,v.y-6,v.x-9+i*10,v.y+6);}
  });
}

function createScene(scene){
  gameScene=scene;
  scene.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
  scene.cameras.main.setZoom(CAMERA_ZOOM);
  drawMap(scene);
  scene.cameras.main.setBounds(0,0,MAP_W,MAP_H);
  scene.cursors=scene.input.keyboard.createCursorKeys();
  scene.wasd=scene.input.keyboard.addKeys({up:Phaser.Input.Keyboard.KeyCodes.W,down:Phaser.Input.Keyboard.KeyCodes.S,left:Phaser.Input.Keyboard.KeyCodes.A,right:Phaser.Input.Keyboard.KeyCodes.D});
}

const SPEED=2.8;
let sendThrottle=0;
const WALKABLE=[{x:305,y:55,w:390,h:210},{x:35,y:215,w:210,h:185},{x:695,y:55,w:230,h:175},{x:365,y:290,w:270,h:165},{x:675,y:430,w:285,h:220},{x:35,y:430,w:240,h:215},{x:295,y:508,w:225,h:152},{x:160,y:275,w:680,h:150},{x:415,y:95,w:170,h:510}];
function walkable(x,y){return WALKABLE.some(z=>x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h);}

function updateScene(scene){
  if(!gameScene||!myPlayerId||!gameState||gameState.phase!=='game')return;
  const me=gameState.players[myPlayerId];if(!me||!me.alive)return;
  const myMod=playerMods[myPlayerId];if(myMod&&myMod.frozen)return;
  let dx=0,dy=0;const k=scene.wasd;const spd=SPEED*(mySpeedMult||1);
  if(k.left.isDown||window.moveLeft)dx-=spd;if(k.right.isDown||window.moveRight)dx+=spd;
  if(k.up.isDown||window.moveUp)dy-=spd;if(k.down.isDown||window.moveDown)dy+=spd;
  if(!dx&&!dy){updateKillBtn();return;}
  if(dx&&dy){const d=Math.SQRT2;dx/=d;dy/=d;}
  let nx=Math.max(40,Math.min(960,me.x+dx));let ny=Math.max(40,Math.min(660,me.y+dy));
  if(!walkable(nx,ny)){if(walkable(nx,me.y))ny=me.y;else if(walkable(me.x,ny))nx=me.x;else{nx=me.x;ny=me.y;}}
  me.x=nx;me.y=ny;
  updatePlayerSprite(myPlayerId,nx,ny);
  scene.cameras.main.centerOn(nx,ny);
  sendThrottle++;if(sendThrottle>=2){sendThrottle=0;wsSend({type:'move',x:nx,y:ny});}
  checkNearby(nx,ny);updateKillBtn();
}

// ════════════════════════════════════════════════════════
// SPRITE SYSTEM
// ════════════════════════════════════════════════════════
function buildBody(scene,x,y,color,alive){
  const col=Phaser.Display.Color.HexStringToColor(color||'#e74c3c').color;
  const dark=Phaser.Display.Color.GetColor(Math.max(0,parseInt((color||'#e74c3c').slice(1,3),16)-40),Math.max(0,parseInt((color||'#e74c3c').slice(3,5),16)-40),Math.max(0,parseInt((color||'#e74c3c').slice(5,7),16)-40));
  const a=alive?1:.3;const g=scene.add.graphics().setDepth(6).setAlpha(a);
  g.fillStyle(dark,1);g.fillRoundedRect(x-18,y-2,8,15,2);
  g.fillStyle(col,1);g.fillEllipse(x,y+3,27,33);
  g.fillStyle(col,1);g.fillCircle(x,y-12,13);
  g.fillStyle(0x7dd3fc,1);g.fillEllipse(x+3,y-13,17,14);
  g.lineStyle(1.5,0x38bdf8,.9);g.strokeEllipse(x+3,y-13,17,14);
  g.fillStyle(0xffffff,.6);g.fillEllipse(x,y-17,5,3);
  g.fillStyle(col,1);g.fillRect(x-8,y+17,7,11);g.fillRect(x+2,y+17,7,11);
  g.fillStyle(0x1e293b,1);g.fillEllipse(x-5,y+29,12,7);g.fillEllipse(x+5,y+29,12,7);
  return g;
}

function createPlayerSprite(id,p){
  if(!gameScene)return;destroyPlayerSprite(id);
  const col=p.color||'#e74c3c';const x=p.x||500,y=p.y||300;const isMe=id===myPlayerId;const mod=playerMods[id]||{};
  const body=buildBody(gameScene,x,y,col,p.alive);
  const hatEmoji=p.hat||null;
  const hatSpr=hatEmoji?gameScene.add.text(x,y-34,hatEmoji,{fontSize:'18px'}).setOrigin(.5).setDepth(13):null;
  const skinEmoji=p.skin&&CM[p.skin]?CM[p.skin].icon:(p.skin&&p.skin.length<=4?p.skin:null);
  const skinSpr=skinEmoji?gameScene.add.text(x,y+2,skinEmoji,{fontSize:'14px'}).setOrigin(.5).setDepth(9).setAlpha(p.alive?1:.3):null;
  const ncCol=(mod.nameColor||p.nameColor)||'#ffffff';
  const nameTxt=gameScene.add.text(x,y-44,p.username||'?',{fontSize:'11px',color:ncCol,fontFamily:'Nunito,sans-serif',stroke:'#000',strokeThickness:3,fontStyle:'bold'}).setOrigin(.5).setDepth(12).setAlpha(p.alive?1:.4);
  const skull=!p.alive?gameScene.add.text(x,y,'💀',{fontSize:'22px'}).setOrigin(.5).setDepth(14):null;
  let selfRing=null;
  if(isMe){selfRing=gameScene.add.circle(x,y+2,22).setStrokeStyle(2,0xffffff,.4).setDepth(4);gameScene.tweens.add({targets:selfRing,alpha:{from:.15,to:.55},yoyo:true,repeat:-1,duration:1000});}
  let ownerTag=null;
  if(p.isOwner){ownerTag=gameScene.add.text(x,y-60,'👑',{fontSize:'14px'}).setOrigin(.5).setDepth(13);gameScene.tweens.add({targets:ownerTag,y:y-64,yoyo:true,repeat:-1,duration:700});}
  if(mod.aura||p.auraColor){
    const ac=parseInt((mod.aura||p.auraColor).replace('#',''),16);
    const aur=gameScene.add.circle(x,y,28,ac,.2).setDepth(5);
    gameScene.tweens.add({targets:aur,alpha:{from:.1,to:.35},yoyo:true,repeat:-1,duration:900});
    auraSprites[id]=aur;
  }
  if(mod.godmode){const gl=gameScene.add.circle(x,y,22).setStrokeStyle(3,0xffd700,.9).setDepth(5);godmodeGlow[id]=gl;gameScene.tweens.add({targets:gl,alpha:{from:.4,to:1},yoyo:true,repeat:-1,duration:400});}
  if(mod.title){titleSprites[id]=gameScene.add.text(x,y-52,mod.title,{fontSize:'9px',color:'#fbbf24',fontFamily:'Nunito,monospace',stroke:'#000',strokeThickness:2,fontStyle:'bold'}).setOrigin(.5).setDepth(11);}
  if(mod.frozen){const fz=gameScene.add.text(x,y-58,'❄️',{fontSize:'16px'}).setOrigin(.5).setDepth(15);freezeSprites[id]=fz;gameScene.tweens.add({targets:fz,y:y-62,yoyo:true,repeat:-1,duration:600});}
  playerSprites[id]={body,hatSpr,skinSpr,nameTxt,skull,selfRing,ownerTag,x,y,col,alive:p.alive};
}

function updatePlayerSprite(id,x,y){
  const s=playerSprites[id];if(!s)return;
  s.x=x;s.y=y;
  if(s.nameTxt)s.nameTxt.setPosition(x,y-44);if(s.hatSpr)s.hatSpr.setPosition(x,y-34);
  if(s.skinSpr)s.skinSpr.setPosition(x,y+2);if(s.skull)s.skull.setPosition(x,y);
  if(s.selfRing)s.selfRing.setPosition(x,y+2);if(s.ownerTag)s.ownerTag.setPosition(x,y-60);
  if(auraSprites[id])auraSprites[id].setPosition(x,y);if(godmodeGlow[id])godmodeGlow[id].setPosition(x,y);
  if(freezeSprites[id])freezeSprites[id].setPosition(x,y-58);if(titleSprites[id])titleSprites[id].setPosition(x,y-52);
  if(s.body){s.body.destroy();}
  const p=gameState&&gameState.players[id];s.body=buildBody(gameScene,x,y,s.col,p?p.alive:true);
  const mod=playerMods[id]||{};const tc=mod.trailColor||(id===myPlayerId&&myRole==='impostor'?'#ef4444':null);
  if(tc)spawnTrail(x,y+10,tc);
}

function markDead(id){
  const s=playerSprites[id];if(!s)return;
  if(s.body)s.body.setAlpha(.3);if(s.nameTxt)s.nameTxt.setAlpha(.35);if(s.skinSpr)s.skinSpr.setAlpha(.3);
  if(!s.skull&&gameScene)s.skull=gameScene.add.text(s.x,s.y,'💀',{fontSize:'22px'}).setOrigin(.5).setDepth(14);
  s.alive=false;
}

function destroyPlayerSprite(id){
  const s=playerSprites[id];if(!s)return;
  ['body','hatSpr','skinSpr','nameTxt','skull','selfRing','ownerTag'].forEach(k=>{if(s[k]&&s[k].destroy)s[k].destroy();});
  delete playerSprites[id];
  if(auraSprites[id]){auraSprites[id].destroy();delete auraSprites[id];}
  if(godmodeGlow[id]){godmodeGlow[id].destroy();delete godmodeGlow[id];}
  if(freezeSprites[id]){freezeSprites[id].destroy();delete freezeSprites[id];}
  if(titleSprites[id]){titleSprites[id].destroy();delete titleSprites[id];}
}

function spawnAllPlayers(){if(!gameState)return;for(const[id,p]of Object.entries(gameState.players))createPlayerSprite(id,p);}

function spawnBody(b){
  if(!gameScene)return;const col=Phaser.Display.Color.HexStringToColor(b.color||'#f00').color;
  bodySprites.push({skull:gameScene.add.text(b.x,b.y,'💀',{fontSize:'24px'}).setOrigin(.5).setDepth(4),glow:gameScene.add.circle(b.x,b.y,18,col,.25).setDepth(3)});
}
function clearBodies(){bodySprites.forEach(b=>{b.skull.destroy();b.glow.destroy();});bodySprites=[];}

function spawnTrail(x,y,color){
  for(let i=0;i<3;i++)trailParticles.push({x:x+(Math.random()-.5)*10,y:y+(Math.random()-.5)*10,color,alpha:.75,r:Math.random()*4+2,vx:(Math.random()-.5),vy:(Math.random()-.5)});
  if(trailParticles.length>250)trailParticles.splice(0,50);
}

function spawnExplosion(cx,cy,radius){
  if(!gameScene)return;
  for(let i=0;i<35;i++){
    const a=Math.random()*Math.PI*2;
    const px=gameScene.add.circle(cx,cy,Math.random()*6+2,0xff6600,1).setDepth(51);
    gameScene.tweens.add({targets:px,x:cx+Math.cos(a)*radius*(.3+Math.random()*.7),y:cy+Math.sin(a)*radius*(.3+Math.random()*.7),alpha:0,duration:600+Math.random()*400,onComplete:()=>px.destroy()});
  }
  const ring=gameScene.add.circle(cx,cy,5).setStrokeStyle(4,0xff4400).setDepth(50);
  gameScene.tweens.add({targets:ring,scaleX:radius/5*2,scaleY:radius/5*2,alpha:0,duration:700,onComplete:()=>ring.destroy()});
  gameScene.cameras.main.shake(350,.018);
}

// Trail particle canvas
(function(){
  const cv=document.createElement('canvas');cv.style.cssText='position:fixed;top:0;left:0;z-index:6;pointer-events:none';
  cv.width=innerWidth;cv.height=innerHeight;document.body.appendChild(cv);
  const ctx=cv.getContext('2d');window.addEventListener('resize',()=>{cv.width=innerWidth;cv.height=innerHeight;});
  (function loop(){
    ctx.clearRect(0,0,cv.width,cv.height);
    if(gameScene&&gameState&&gameState.phase==='game'){
      const cam=gameScene.cameras.main;const zoom=cam.zoom||CAMERA_ZOOM,ox=cam.scrollX,oy=cam.scrollY;
      for(let i=trailParticles.length-1;i>=0;i--){
        const p=trailParticles[i];p.alpha-=.04;p.x+=p.vx;p.y+=p.vy;
        if(p.alpha<=0){trailParticles.splice(i,1);continue;}
        const sx=(p.x-ox)*zoom,sy=(p.y-oy)*zoom;
        ctx.beginPath();ctx.arc(sx,sy,p.r*p.alpha*zoom*.45,0,Math.PI*2);
        ctx.fillStyle=p.color+Math.floor(p.alpha*255).toString(16).padStart(2,'0');ctx.fill();
      }
    }
    requestAnimationFrame(loop);
  })();
})();

// ════════════════════════════════════════════════════════
// WEBSOCKET
// ════════════════════════════════════════════════════════
let wsReady=false,wsQueue=[];
function connectWS(){
  return new Promise((res,rej)=>{
    ws=new WebSocket(GAME_SERVER_WS);
    ws.onopen=()=>{wsReady=true;wsQueue.forEach(m=>ws.send(JSON.stringify(m)));wsQueue=[];res();};
    ws.onerror=()=>rej(new Error('WS failed'));
    ws.onmessage=e=>{try{handleMsg(JSON.parse(e.data));}catch(err){console.warn('WS parse',err);}};
    ws.onclose=()=>{wsReady=false;notify('⚠️ Disconnected — reconnecting...','#f87171');setTimeout(reconnectWS,2500);};
  });
}
function reconnectWS(){
  if(ws&&ws.readyState!==WebSocket.CLOSED)return;
  ws=new WebSocket(GAME_SERVER_WS);
  ws.onopen=()=>{wsReady=true;wsQueue.forEach(m=>ws.send(JSON.stringify(m)));wsQueue=[];};
  ws.onerror=()=>setTimeout(reconnectWS,3500);
  ws.onmessage=e=>{try{handleMsg(JSON.parse(e.data));}catch(err){}};
  ws.onclose=()=>{wsReady=false;setTimeout(reconnectWS,2500);};
}
function wsSend(msg){if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(msg));else wsQueue.push(msg);}

// ════════════════════════════════════════════════════════
// MESSAGE HANDLER
// ════════════════════════════════════════════════════════
function handleMsg(msg){
  switch(msg.type){
    case 'joined':myPlayerId=msg.playerId;currentRoomCode=msg.roomCode;gameState=msg.state;myRole=msg.myRole;myTasks=msg.myTasks||[];showScreen('lobby-screen');updateLobbyUI();break;
    case 'player_joined':if(gameState)gameState.players[msg.player.id]=msg.player;updateLobbyUI();notify('👋 '+esc(msg.player.username)+' joined','#4ade80');break;
    case 'player_left':if(gameState)delete gameState.players[msg.playerId];updateLobbyUI();if(gameState&&gameState.phase==='game')destroyPlayerSprite(msg.playerId);notify((msg.username||'Player')+' left','#f87171');break;
    case 'room_update':gameState=msg.state;updateLobbyUI();break;
    case 'game_started':gameState=msg.state;myRole=msg.myRole;myTasks=msg.myTasks||[];killCooldownUntil=0;showGameScreen();break;
    case 'player_moved':if(gameState&&gameState.players[msg.playerId]&&msg.playerId!==myPlayerId){gameState.players[msg.playerId].x=msg.x;gameState.players[msg.playerId].y=msg.y;updatePlayerSprite(msg.playerId,msg.x,msg.y);}break;
    case 'player_killed':
      if(gameState){if(gameState.players[msg.victimId])gameState.players[msg.victimId].alive=false;gameState.bodies=gameState.bodies||[];gameState.bodies.push(msg.body);spawnBody(msg.body);markDead(msg.victimId);}
      if(msg.victimId===myPlayerId){showBanner('YOU DIED','#f87171');notify('💀 You were killed!','#f87171');flashRed();document.getElementById('ghost-label').style.display='block';}
      updateAliveCount();break;
    case 'task_completed':
      if(gameState)gameState.taskProgress=msg.progress;updateTaskBar();
      if(msg.playerId===myPlayerId){notify('✅ Task done! +30 credits','#4ade80');pfAddCredits(30,false);myTasks.forEach(t=>{if(t.id===msg.taskId)t.completed=true;});updateTaskHUD();}
      else notify('⚙️ '+(msg.username||'Someone')+' did a task','rgba(255,255,255,0.4)');break;
    case 'meeting_started':gameState=msg.state;showMeeting(msg.reason,msg.discussionTime||DISC_TIME);break;
    case 'voting_started':switchToVoting(VOTE_TIME);break;
    case 'vote_cast':notify('🗳 '+(msg.voterName||'?')+' voted','rgba(255,255,255,0.4)');if(gameState){if(!gameState.votes)gameState.votes={};if(msg.targetId)gameState.votes[msg.voterId]=msg.targetId;}updateVoteGrid();break;
    case 'vote_result':showVoteResult(msg);break;
    case 'chat':addChatMsg(msg);break;
    case 'game_resumed':gameState=msg.state;hideMeeting();clearBodies();killCooldownUntil=Date.now()+10000;notify('▶️ Game resumed!','#4ade80');document.getElementById('ghost-label').style.display='none';break;
    case 'game_over':showEndScreen(msg);break;
    case 'back_to_lobby':
      gameState=msg.state;showScreen('lobby-screen');
      document.getElementById('hud').classList.add('hidden');document.getElementById('action-btns').classList.add('hidden');
      document.getElementById('task-hud').classList.add('hidden');document.getElementById('ghost-label').style.display='none';
      updateLobbyUI();clearBodies();for(const id of Object.keys(playerSprites))destroyPlayerSprite(id);notify('🎮 Back to lobby!','#a78bfa');break;
    case 'kicked':notify('🚫 Kicked: '+(msg.reason||''),'#f87171');setTimeout(()=>{if(ws)ws.close();showScreen('menu-screen');},2000);break;
    case 'error':notify('❌ '+msg.message,'#f87171');break;
    case 'system_message':notify('📢 '+msg.text,'#fbbf24');break;
    case 'player_mod_update':
      playerMods[msg.playerId]=msg.mod;if(msg.playerId===myPlayerId)mySpeedMult=msg.mod.speedMult||1;
      if(gameState&&gameState.players[msg.playerId]&&gameState.phase==='game')createPlayerSprite(msg.playerId,gameState.players[msg.playerId]);break;
    case 'player_tags_update':if(gameState&&gameState.players[msg.playerId])gameState.players[msg.playerId].tags=msg.tags;if(msg.playerId===myPlayerId){myTags=msg.tags;saveLocalSession();}break;
    case 'player_teleported':
      if(gameState&&gameState.players[msg.playerId]){gameState.players[msg.playerId].x=msg.x;gameState.players[msg.playerId].y=msg.y;updatePlayerSprite(msg.playerId,msg.x,msg.y);}
      if(msg.playerId===myPlayerId){if(gameScene)gameScene.cameras.main.centerOn(msg.x,msg.y);notify('⚡ Teleported!','#a78bfa');flashRed();}break;
    case 'player_respawned':
      if(gameState&&gameState.players[msg.playerId]){gameState.players[msg.playerId].alive=true;createPlayerSprite(msg.playerId,gameState.players[msg.playerId]);notify('✨ '+esc(msg.username)+' respawned!','#4ade80');}
      if(msg.playerId===myPlayerId)document.getElementById('ghost-label').style.display='none';break;
    case 'role_changed':
      if(msg.byOwner){myRole=msg.newRole;const rb=document.getElementById('role-badge');
        if(myRole==='impostor'){rb.textContent='😈 IMPOSTOR';rb.className='role-badge role-impostor';document.getElementById('btn-kill').style.display='flex';document.getElementById('btn-vent').style.display='flex';document.getElementById('btn-task').style.display='none';document.getElementById('task-hud').classList.add('hidden');}
        else{rb.textContent='✅ CREWMATE';rb.className='role-badge role-crewmate';document.getElementById('btn-kill').style.display='none';document.getElementById('btn-vent').style.display='none';document.getElementById('task-hud').classList.remove('hidden');}
        showBanner(myRole==='impostor'?'IMPOSTOR':'CREWMATE',myRole==='impostor'?'#f87171':'#4ade80');notify('🎭 Your role was changed!','#fbbf24');}break;
    case 'speed_changed':mySpeedMult=msg.mult||1;if(msg.mult>1.5)notify('⚡ Speed boost!','#fbbf24');else if(msg.mult<.8)notify('🐌 Slowed!','#f87171');else notify('✅ Normal speed','#4ade80');break;
    case 'owner_announcement':
      notify((msg.icon||'📢')+' '+msg.text,msg.color||'#fbbf24');showBanner(msg.text.slice(0,22),msg.color||'#fbbf24');
      if(gameState&&(gameState.phase==='meeting'||gameState.phase==='vote'))addChatMsg({username:'📢 OWNER',color:msg.color||'#fbbf24',text:msg.text,alive:true});break;
    case 'owner_explosion_fx':spawnExplosion(msg.cx,msg.cy,msg.radius);notify('💥 EXPLOSION!','#ef4444');break;
    case 'owner_roles_reveal':showRolesReveal(msg.roles);break;
    case 'tasks_reset':myTasks=msg.tasks||[];updateTaskHUD();notify('📋 Tasks reset!','#fbbf24');break;
    case 'owner_ack':notify('✅ '+msg.cmd,'#4ade80');break;
    case 'pong':break;
  }
}

// ════════════════════════════════════════════════════════
// PLAYFAB AUTH
// ════════════════════════════════════════════════════════
function showRegister(){document.getElementById('login-form').style.display='none';document.getElementById('register-form').style.display='block';buildColorGrid('reg-color-grid',false);}
function showLogin(){document.getElementById('register-form').style.display='none';document.getElementById('login-form').style.display='block';}
function pfCall(fn,params){
  return new Promise((res,rej)=>{
    if(typeof PlayFab==='undefined'||typeof PlayFabClientSDK==='undefined'){rej(new Error('PlayFab not loaded'));return;}
    PlayFabClientSDK[fn](params,(result,error)=>{if(error)rej(error);else res(result);});
  });
}
async function doLogin(){
  const u=document.getElementById('login-username').value.trim();const p=document.getElementById('login-password').value;
  const errEl=document.getElementById('login-err');errEl.textContent='';
  if(!u||!p){errEl.textContent='Fill in all fields.';return;}
  const btn=document.querySelector('#login-form .btn-primary');if(btn)btn.disabled=true;
  try{const result=await pfCall('LoginWithCustomID',{CustomId:u+'_'+btoa(unescape(encodeURIComponent(p))).slice(0,16),CreateAccount:false,InfoRequestParameters:{GetPlayerStatistics:true,GetUserData:true,GetUserInventory:true}});await onPfLogin(result,u);}
  catch(e){errEl.textContent=(e&&e.errorMessage)||'Login failed.';}finally{if(btn)btn.disabled=false;}
}
async function doRegister(){
  const u=document.getElementById('reg-username').value.trim();const p=document.getElementById('reg-password').value;
  const errEl=document.getElementById('reg-err');errEl.textContent='';
  if(!u||!p){errEl.textContent='Fill in all fields.';return;}
  if(u.length<3){errEl.textContent='Username must be 3+ chars.';return;}
  if(p.length<4){errEl.textContent='Password must be 4+ chars.';return;}
  const btn=document.querySelector('#register-form .btn-primary');if(btn)btn.disabled=true;
  try{
    const result=await pfCall('LoginWithCustomID',{CustomId:u+'_'+btoa(unescape(encodeURIComponent(p))).slice(0,16),CreateAccount:true,InfoRequestParameters:{GetPlayerStatistics:true,GetUserData:true,GetUserInventory:true}});
    if(!result.data.NewlyCreated){errEl.textContent='Username taken.';if(btn)btn.disabled=false;return;}
    try{await pfCall('UpdateUserTitleDisplayName',{DisplayName:u});}catch(e){}
    await pfCall('UpdateUserData',{Data:{username:u,color:selectedColor,hat:'',skin:'',trail:'',aura:'',namecolor:'',tags:'[]',owned_items:'[]'}});
    try{await pfCall('AddUserVirtualCurrency',{VirtualCurrency:'GD',Amount:200});}catch(e){}
    await onPfLogin(result,u);
  }catch(e){errEl.textContent=(e&&e.errorMessage)||'Registration failed.';}finally{if(btn)btn.disabled=false;}
}
async function onPfLogin(result,hint){
  pfPlayFabId=result.data.PlayFabId;pfSessionTicket=result.data.SessionTicket;
  if(typeof PlayFab!=='undefined')PlayFab._internalSettings.sessionTicket=pfSessionTicket;
  const ud=(result.data.InfoResultPayload&&result.data.InfoResultPayload.UserData)||{};
  pfUsername=(ud.username&&ud.username.Value)||hint||result.data.PlayFabId.slice(0,8);
  selectedColor=(ud.color&&ud.color.Value)||'#e74c3c';
  equippedHat=(ud.hat&&ud.hat.Value)||null;equippedSkin=(ud.skin&&ud.skin.Value)||null;
  equippedTrail=(ud.trail&&ud.trail.Value)||null;equippedAura=(ud.aura&&ud.aura.Value)||null;
  equippedNameColor=(ud.namecolor&&ud.namecolor.Value)||null;
  try{myTags=JSON.parse((ud.tags&&ud.tags.Value)||'[]');}catch(e){myTags=[];}
  try{const bal=await pfCall('GetUserInventory',{});pfCredits=(bal.data.VirtualCurrencyBalance&&bal.data.VirtualCurrencyBalance.GD)||0;pfOwnedItemIds=(bal.data.Inventory||[]).map(i=>i.ItemId);}catch(e){pfCredits=0;}
  try{const so=JSON.parse((ud.owned_items&&ud.owned_items.Value)||'[]');for(const id of so)if(!pfOwnedItemIds.includes(id))pfOwnedItemIds.push(id);}catch(e){}
  try{const stats=(result.data.InfoResultPayload&&result.data.InfoResultPayload.PlayerStatistics)||[];pfStats={};for(const s of stats)pfStats[s.StatisticName]=s.Value;}catch(e){}
  saveLocalSession();showMenuScreen();
}
function saveLocalSession(){try{localStorage.setItem('spt_pf',JSON.stringify({pfPlayFabId,pfSessionTicket,pfUsername,selectedColor,equippedHat,equippedSkin,equippedTrail,equippedAura,equippedNameColor,myTags,pfCredits}));}catch(e){}}
async function tryAutoLogin(){
  let saved=null;try{saved=localStorage.getItem('spt_pf');}catch(e){}
  if(!saved){showScreen('auth-screen');return;}
  try{
    const d=JSON.parse(saved);
    pfPlayFabId=d.pfPlayFabId;pfSessionTicket=d.pfSessionTicket;pfUsername=d.pfUsername;selectedColor=d.selectedColor||'#e74c3c';
    equippedHat=d.equippedHat||null;equippedSkin=d.equippedSkin||null;equippedTrail=d.equippedTrail||null;equippedAura=d.equippedAura||null;equippedNameColor=d.equippedNameColor||null;
    myTags=d.myTags||[];pfCredits=d.pfCredits||0;
    if(typeof PlayFab!=='undefined')PlayFab._internalSettings.sessionTicket=pfSessionTicket;
    try{const bal=await pfCall('GetUserInventory',{});pfCredits=(bal.data.VirtualCurrencyBalance&&bal.data.VirtualCurrencyBalance.GD)||0;pfOwnedItemIds=(bal.data.Inventory||[]).map(i=>i.ItemId);
      const ud2=await pfCall('GetUserData',{Keys:['owned_items','tags','hat','skin','trail','aura','namecolor']});const dd=ud2.data.Data||{};
      try{const so=JSON.parse((dd.owned_items&&dd.owned_items.Value)||'[]');for(const id of so)if(!pfOwnedItemIds.includes(id))pfOwnedItemIds.push(id);}catch(e){}
      try{myTags=JSON.parse((dd.tags&&dd.tags.Value)||'[]');}catch(e){}
      if(dd.hat)equippedHat=dd.hat.Value||null;if(dd.skin)equippedSkin=dd.skin.Value||null;
      if(dd.trail)equippedTrail=dd.trail.Value||null;if(dd.aura)equippedAura=dd.aura.Value||null;
      if(dd.namecolor)equippedNameColor=dd.namecolor.Value||null;}catch(e){}
    showMenuScreen();
  }catch(e){showScreen('auth-screen');}
}
function logout(){try{localStorage.removeItem('spt_pf');}catch(e){}pfPlayFabId=pfSessionTicket=pfUsername=null;pfCredits=0;pfOwnedItemIds=[];myTags=[];showScreen('auth-screen');}

// ════════════════════════════════════════════════════════
// CREDITS
// ════════════════════════════════════════════════════════
async function pfAddCredits(amount,showNotif){
  if(showNotif===undefined)showNotif=true;if(!pfSessionTicket)return;
  try{const r=await pfCall('AddUserVirtualCurrency',{VirtualCurrency:'GD',Amount:amount});pfCredits=r.data.Balance;saveLocalSession();if(showNotif)notify('💰 +'+amount+' credits!','#fbbf24');updateCreditsDisplay();}catch(e){}
}
async function pfSpendCredits(amount){
  if(!pfSessionTicket)return false;
  if(pfCredits<amount){notify('❌ Need '+amount+' credits (you have '+pfCredits+')','#f87171');return false;}
  try{const r=await pfCall('SubtractUserVirtualCurrency',{VirtualCurrency:'GD',Amount:amount});pfCredits=r.data.Balance;saveLocalSession();updateCreditsDisplay();return true;}catch(e){notify('❌ Transaction failed','#f87171');return false;}
}
function updateCreditsDisplay(){
  const mc=document.getElementById('menu-credits');if(mc)mc.textContent='💰 '+pfCredits+' Credits';
  const sc=document.getElementById('shop-credits');if(sc)sc.textContent='💰 '+pfCredits+' Credits';
  const wc=document.getElementById('wardrobe-credits-display');if(wc)wc.textContent=pfCredits;
}
async function pfSaveData(key,value){if(!pfSessionTicket)return;try{await pfCall('UpdateUserData',{Data:{[key]:typeof value==='string'?value:JSON.stringify(value)}});}catch(e){}}
async function pfUpdateStat(name,value){if(!pfSessionTicket)return;try{await pfCall('UpdatePlayerStatistics',{Statistics:[{StatisticName:name,Value:value}]});}catch(e){}}

// ════════════════════════════════════════════════════════
// SHOP
// ════════════════════════════════════════════════════════
function buildShopFilters(){
  const types=['all','hat','skin','trail','aura','namecolor'];
  const labels={all:'All',hat:'🧢 Hats',skin:'👔 Skins',trail:'✨ Trails',aura:'🌟 Auras',namecolor:'🎨 Names'};
  const row=document.getElementById('shop-filters');if(!row)return;
  row.innerHTML=types.map(t=>`<button class="shop-filter-btn ${t===currentShopFilter?'active':''}" onclick="setShopFilter('${t}')">${labels[t]}</button>`).join('');
}
function setShopFilter(f){currentShopFilter=f;buildShopFilters();loadShop();}
function loadShop(){
  updateCreditsDisplay();buildShopFilters();
  const grid=document.getElementById('shop-items-grid');if(!grid)return;
  const ri={common:'⚪',uncommon:'🟢',rare:'🔵',epic:'🟣',legendary:'🟡',mythic:'🌸'};
  const items=Object.entries(CM).filter(([,c])=>!c.ownerOnly&&(currentShopFilter==='all'||c.type===currentShopFilter));
  if(!items.length){grid.innerHTML='<div style="color:rgba(255,255,255,.35);text-align:center;padding:24px;grid-column:1/-1">Nothing here.</div>';return;}
  grid.innerHTML=items.map(([id,c])=>{
    const owned=pfOwnedItemIds.includes(id);
    const sl=c.type==='hat'?equippedHat:c.type==='skin'?equippedSkin:c.type==='trail'?equippedTrail:c.type==='aura'?equippedAura:c.type==='namecolor'?equippedNameColor:null;
    const isEq=sl===id;const fn=owned?`equipCosmetic('${id}','${c.type}')`:`buyCosmetic('${id}',${c.price})`;
    return `<div class="shop-item ${owned?'owned':''} ${isEq?'equipped-item':''}" onclick="${fn}"><div class="shop-item-icon">${c.icon}</div><div class="shop-item-name rarity-${c.rarity}">${ri[c.rarity]||''} ${esc(c.name)}</div><div class="shop-item-price">${owned?(isEq?'✅ On':'🎮 Equip'):'💰 '+c.price}</div></div>`;
  }).join('');
}
async function buyCosmetic(id,price){
  if(!CM[id]||CM[id].ownerOnly){notify('🔒 Owner-only!','#f87171');return;}
  const ok=await pfSpendCredits(price);if(!ok)return;
  try{
    let owned=[];try{const ud=await pfCall('GetUserData',{Keys:['owned_items']});owned=JSON.parse((ud.data.Data&&ud.data.Data.owned_items&&ud.data.Data.owned_items.Value)||'[]');}catch(e){}
    if(!owned.includes(id))owned.push(id);await pfSaveData('owned_items',JSON.stringify(owned));
    if(!pfOwnedItemIds.includes(id))pfOwnedItemIds.push(id);saveLocalSession();notify('✨ Got '+esc(CM[id].name)+'!','#a78bfa');loadShop();renderWardrobeSlots();
  }catch(e){notify('❌ Save failed','#f87171');}
}
async function equipCosmetic(id,type){
  const slots={hat:'hat',skin:'skin',trail:'trail',aura:'aura',namecolor:'namecolor'};const sk=slots[type];if(!sk)return;
  const cur=sk==='hat'?equippedHat:sk==='skin'?equippedSkin:sk==='trail'?equippedTrail:sk==='aura'?equippedAura:equippedNameColor;
  const nv=cur===id?null:id;
  if(sk==='hat')equippedHat=nv;else if(sk==='skin')equippedSkin=nv;else if(sk==='trail')equippedTrail=nv;else if(sk==='aura')equippedAura=nv;else equippedNameColor=nv;
  await pfSaveData(sk,nv||'');saveLocalSession();notify(nv?'✅ Equipped '+(CM[id]&&CM[id].name)+'!':'Unequipped','#4ade80');
  loadShop();refreshPreviews();renderWardrobeSlots();updateEquippedDisplay();
}
function updateEquippedDisplay(){
  const el=document.getElementById('equipped-display');if(!el)return;
  const parts=[];
  if(equippedHat)parts.push('Hat: '+(CM[equippedHat]&&CM[equippedHat].icon||equippedHat));
  if(equippedSkin)parts.push('Skin: '+(CM[equippedSkin]&&CM[equippedSkin].icon||equippedSkin));
  if(equippedTrail)parts.push('Trail: '+(CM[equippedTrail]&&CM[equippedTrail].icon||equippedTrail));
  if(equippedAura)parts.push('Aura: '+(CM[equippedAura]&&CM[equippedAura].icon||equippedAura));
  if(equippedNameColor)parts.push('Name: '+(CM[equippedNameColor]&&CM[equippedNameColor].icon||equippedNameColor));
  if(myTags.length)parts.push('Tags: '+myTags.map(t=>CM[t]&&CM[t].name||t).join(', '));
  el.textContent=parts.length?parts.join(' · '):'None';
  const ms=document.getElementById('menu-equipped-summary');if(ms)ms.innerHTML=parts.length?parts.map(p=>`<div>• ${p}</div>`).join(''):'Nothing equipped yet.';
}

// ════════════════════════════════════════════════════════
// WARDROBE
// ════════════════════════════════════════════════════════
function openWardrobe(){document.getElementById('wardrobe-overlay').style.display='flex';refreshPreviews();renderWardrobeSlots();updateWardrobeTags();updateCreditsDisplay();}
function closeWardrobe(){document.getElementById('wardrobe-overlay').style.display='none';}
function updateWardrobeTags(){
  const el=document.getElementById('wardrobe-tags');if(!el)return;
  if(!myTags||!myTags.length){el.innerHTML='<span style="color:rgba(255,255,255,.28);font-size:11px">No tags yet</span>';return;}
  el.innerHTML=myTags.map(t=>{const m=CM[t];if(!m)return'';return`<span class="player-tag" style="${m.tagStyle||'background:#333;color:#fff'}">${m.icon} ${esc(m.name)}</span>`;}).join('');
}
function renderWardrobeSlots(){
  const container=document.getElementById('wardrobe-slots');if(!container)return;
  const rdot={common:'#6b7280',uncommon:'#4ade80',rare:'#60a5fa',epic:'#c084fc',legendary:'#fbbf24',mythic:'#f472b6'};
  const slotDefs=[{type:'hat',label:'🧢 Hats',cur:equippedHat},{type:'skin',label:'👔 Skins',cur:equippedSkin},{type:'trail',label:'✨ Trails',cur:equippedTrail},{type:'aura',label:'🌟 Auras',cur:equippedAura},{type:'namecolor',label:'🎨 Name Colors',cur:equippedNameColor}];
  container.innerHTML=slotDefs.map(sl=>{
    const owned=Object.entries(CM).filter(([id,c])=>c.type===sl.type&&!c.ownerOnly&&pfOwnedItemIds.includes(id));
    const unequipBtn=sl.cur?`<div class="ws-item" onclick="equipCosmetic('${sl.cur}','${sl.type}')" title="Unequip" style="opacity:.4;font-size:14px;color:rgba(255,255,255,.6)">✕</div>`:'';
    const itemsHTML=owned.map(([id,c])=>`<div class="ws-item ${sl.cur===id?'active':''}" onclick="equipCosmetic('${id}','${sl.type}')" title="${esc(c.name)}">${c.icon}<div class="ws-dot" style="background:${rdot[c.rarity]||'#888'}"></div></div>`).join('');
    return `<div class="wardrobe-slot-section"><div class="ws-label">${sl.label}</div><div class="ws-items">${unequipBtn}${owned.length?itemsHTML:'<span style="color:rgba(255,255,255,.25);font-size:12px">None owned — visit Shop</span>'}</div></div>`;
  }).join('');
}

// ════════════════════════════════════════════════════════
// TAG RENDERING & COLOR GRID
// ════════════════════════════════════════════════════════
function renderTagsHTML(tags){
  if(!tags||!tags.length)return'';
  return tags.map(t=>{const m=CM[t];if(!m)return'';return`<span class="player-tag" style="${m.tagStyle||'background:#333;color:#fff'}">${m.icon} ${esc(m.name)}</span>`;}).join('');
}
function buildColorGrid(id,save){
  const el=document.getElementById(id);if(!el)return;
  el.innerHTML=COLORS.map(c=>`<div class="color-swatch ${c===selectedColor?'selected':''}" style="background:${c}" data-color="${c}" onclick="selectColor('${c}','${id}',${save})"></div>`).join('');
}
async function selectColor(c,gid,save){
  selectedColor=c;document.querySelectorAll('#'+gid+' .color-swatch').forEach(s=>s.classList.toggle('selected',s.getAttribute('data-color')===c));
  if(save&&pfSessionTicket){await pfSaveData('color',c);saveLocalSession();}refreshPreviews();
}

// ════════════════════════════════════════════════════════
// MENU SCREEN
// ════════════════════════════════════════════════════════
async function showMenuScreen(){
  showScreen('menu-screen');
  document.getElementById('menu-welcome').textContent='Welcome, '+(pfUsername||'Guest')+' 👋';
  document.getElementById('menu-player-tags').innerHTML=renderTagsHTML(myTags);
  updateCreditsDisplay();buildColorGrid('profile-color-grid',true);loadShop();updateEquippedDisplay();
  setTimeout(()=>refreshPreviews(),100);
  const games=pfStats.games_played||0,wins=pfStats.games_won||0;
  document.getElementById('profile-stats').innerHTML=`<b>${esc(pfUsername||'Guest')}</b>${renderTagsHTML(myTags)}<br>💰 ${pfCredits} Credits<br>🎮 Games: ${games} &nbsp;🏆 Wins: ${wins}<br><small style="opacity:.3">ID: ${pfPlayFabId||'—'}</small>`;
}
function switchMenuTab(tab,btn){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  btn.classList.add('active');document.getElementById('menu-tab-'+tab).classList.add('active');
  if(tab==='shop')loadShop();if(tab==='wardrobe')setTimeout(()=>refreshPreviews(),80);
}

// ════════════════════════════════════════════════════════
// JOIN / CREATE
// ════════════════════════════════════════════════════════
async function joinOrCreate(){
  const btn=document.getElementById('join-create-btn');btn.disabled=true;btn.textContent='⏳ Connecting...';
  try{
    if(!ws||ws.readyState===WebSocket.CLOSED||ws.readyState===WebSocket.CLOSING)await connectWS();
    let waited=0;while(ws.readyState!==WebSocket.OPEN&&waited<5000){await sleep(100);waited+=100;}
    if(ws.readyState!==WebSocket.OPEN){notify('⚠️ Server offline!','#f87171');btn.disabled=false;btn.textContent='🚀 Join / Create Room';return;}
    let code=document.getElementById('room-code-input').value.trim().toUpperCase();if(!code)code=Math.random().toString(36).substring(2,8).toUpperCase();
    const isOwner=!!(pfUsername&&(pfUsername.toLowerCase()==='zeno'||pfUsername.toLowerCase()==='owner'))||pfCredits>9999;
    const hatEmoji=equippedHat&&CM[equippedHat]?CM[equippedHat].icon:null;
    const trailColor=equippedTrail&&CM[equippedTrail]?CM[equippedTrail].trailColor:null;
    const auraColor=equippedAura&&CM[equippedAura]?CM[equippedAura].auraColor:null;
    const nameColor=equippedNameColor&&CM[equippedNameColor]?CM[equippedNameColor].nameColor:null;
    wsSend({type:'join_room',roomCode:code,username:pfUsername,color:selectedColor,hat:hatEmoji,skin:equippedSkin,trailColor,auraColor,nameColor,tags:myTags,isOwner,pfId:pfPlayFabId});
  }catch(e){notify('⚠️ Game server offline.','#f87171');}
  btn.disabled=false;btn.textContent='🚀 Join / Create Room';
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

// ════════════════════════════════════════════════════════
// LOBBY
// ════════════════════════════════════════════════════════
function updateLobbyUI(){
  if(!gameState)return;
  document.getElementById('lobby-code').textContent=gameState.code||currentRoomCode;
  const players=Object.values(gameState.players);
  document.getElementById('lobby-player-count').textContent=players.length+'/10 players';
  document.getElementById('lobby-player-list').innerHTML=players.map(p=>`<div class="player-item"><div class="player-dot" style="background:${p.color}"></div><div class="player-name">${esc(p.username)}${p.hat?' '+p.hat:''}${renderTagsHTML(p.tags||[])}</div>${p.id===gameState.hostId?'<span class="host-badge">👑 HOST</span>':''}${p.isOwner?'<span class="owner-badge">🛡 OWNER</span>':''}</div>`).join('');
  const iH=gameState.hostId===myPlayerId;const iO=gameState.players[myPlayerId]&&gameState.players[myPlayerId].isOwner;
  document.getElementById('start-btn').style.display=(iH||iO)?'block':'none';document.getElementById('lobby-wait-btn').style.display=(iH||iO)?'none':'block';
}
function copyCode(){const code=document.getElementById('lobby-code').textContent;if(navigator.clipboard)navigator.clipboard.writeText(code).then(()=>notify('📋 Copied!','#4ade80')).catch(()=>notify('📋 '+code,'#4ade80'));else notify('📋 '+code,'#4ade80');}
function startGame(){wsSend({type:'start_game'});}
function leaveLobby(){wsReady=false;if(ws)ws.close();showScreen('menu-screen');}

// ════════════════════════════════════════════════════════
// GAME SCREEN
// ════════════════════════════════════════════════════════
function showGameScreen(){
  hideAllScreens();
  document.getElementById('hud').classList.remove('hidden');document.getElementById('action-btns').classList.remove('hidden');
  document.getElementById('meeting-screen').style.display='none';document.getElementById('ghost-label').style.display='none';
  if(!phaserGame)initPhaser();else{for(const id of Object.keys(playerSprites))destroyPlayerSprite(id);clearBodies();}
  const rb=document.getElementById('role-badge');
  if(myRole==='impostor'){
    rb.textContent='😈 IMPOSTOR';rb.className='role-badge role-impostor';
    document.getElementById('btn-kill').style.display='flex';document.getElementById('btn-vent').style.display='flex';document.getElementById('btn-task').style.display='none';document.getElementById('task-hud').classList.add('hidden');
    showBanner('IMPOSTOR','#f87171');notify('🔴 You are the IMPOSTOR! Eliminate crewmates!','#f87171');
  }else{
    rb.textContent='✅ CREWMATE';rb.className='role-badge role-crewmate';
    document.getElementById('btn-kill').style.display='none';document.getElementById('btn-vent').style.display='none';document.getElementById('task-hud').classList.remove('hidden');
    showBanner('CREWMATE','#4ade80');notify('🟢 You are a CREWMATE! Complete your tasks!','#4ade80');
  }
  updateTaskBar();updateTaskHUD();spawnAllPlayers();
  if(gameScene&&gameState&&gameState.players[myPlayerId]){const p=gameState.players[myPlayerId];gameScene.cameras.main.centerOn(p.x,p.y);}
  addMobileControls();updateAliveCount();
}
function updateTaskHUD(){
  if(myRole!=='crewmate')return;const el=document.getElementById('task-hud-items');if(!el)return;
  const colors={Electrical:'#fbbf24',Navigation:'#60a5fa',Reactor:'#a78bfa',MedBay:'#4ade80',Storage:'#f472b6',Engine:'#fb923c',Cafeteria:'#fbbf24'};
  el.innerHTML=(myTasks||[]).map(t=>`<div class="tli ${t.completed?'done':''}"><div class="tli-dot" style="background:${t.completed?'#4ade80':(colors[t.location&&t.location.name]||'#fff')}"></div><span>${t.completed?'✅':'○'} ${t.location?t.location.name:'Task'}</span></div>`).join('');
}
function updateTaskBar(){if(!gameState||!gameState.taskProgress)return;const tp=gameState.taskProgress;document.getElementById('task-bar').style.width=(tp.total>0?tp.done/tp.total*100:0)+'%';}

// ════════════════════════════════════════════════════════
// INTERACTION & ACTIONS
// ════════════════════════════════════════════════════════
function dist(x1,y1,x2,y2){return Math.sqrt((x1-x2)**2+(y1-y2)**2);}
function checkNearby(px,py){
  if(!gameState)return;
  const nb=gameState.bodies&&gameState.bodies.find(b=>dist(px,py,b.x,b.y)<78);
  document.getElementById('btn-report').style.display=nb?'flex':'none';
  if(myRole==='crewmate'){const tl=[{x:148,y:520},{x:810,y:150},{x:140,y:310},{x:500,y:390},{x:760,y:540},{x:410,y:575},{x:500,y:175}];const nearTask=tl.some(t=>dist(px,py,t.x,t.y)<65);const hasInc=myTasks&&myTasks.some(t=>!t.completed);document.getElementById('btn-task').style.display=(nearTask&&hasInc)?'flex':'none';}
  updateAliveCount();
}
function updateKillBtn(){
  if(myRole!=='impostor')return;const btn=document.getElementById('btn-kill');if(!btn)return;
  const now=Date.now();
  if(now<killCooldownUntil){const r=Math.ceil((killCooldownUntil-now)/1000);btn.innerHTML=`☠ Kill <span class="cooldown-txt">(${r}s)</span>`;btn.disabled=true;}
  else{btn.textContent='☠ Kill';const me=gameState&&gameState.players[myPlayerId];if(me&&gameState){const t=Object.values(gameState.players).find(p=>p.id!==myPlayerId&&p.alive&&p.role!=='impostor'&&dist(me.x,me.y,p.x,p.y)<108);btn.disabled=!t;}}
}
function updateAliveCount(){if(!gameState)return;const a=Object.values(gameState.players).filter(p=>p.alive).length,tot=Object.keys(gameState.players).length;const el=document.getElementById('alive-count');if(el)el.textContent='👥 '+a+'/'+tot;}
function tryKill(){
  if(myRole!=='impostor')return;if(Date.now()<killCooldownUntil){notify('⏳ Cooldown!','#f87171');return;}
  const me=gameState&&gameState.players[myPlayerId];if(!me)return;
  const t=Object.values(gameState.players).find(p=>p.id!==myPlayerId&&p.alive&&p.role!=='impostor'&&dist(me.x,me.y,p.x,p.y)<108);
  if(!t){notify('No one close enough!','#f87171');return;}
  wsSend({type:'kill',targetId:t.id});killCooldownUntil=Date.now()+25000;flashRed();
}
function tryVent(){
  if(myRole!=='impostor'||!gameScene)return;const me=gameState&&gameState.players[myPlayerId];if(!me)return;
  const v=gameScene.ventPositions;let near=null,nd=999;for(const vp of v){const d=dist(me.x,me.y,vp.x,vp.y);if(d<nd){nd=d;near=vp;}}
  if(!near||nd>105){notify('Not near a vent!','#f87171');return;}
  const others=v.filter(vp=>vp!==near);const dest=others[Math.floor(Math.random()*others.length)];
  me.x=dest.x;me.y=dest.y;updatePlayerSprite(myPlayerId,dest.x,dest.y);gameScene.cameras.main.centerOn(dest.x,dest.y);
  wsSend({type:'move',x:dest.x,y:dest.y});notify('🕳 Whoosh! Vented!','#059669');
}
function reportBody(){wsSend({type:'report_body'});}
function callEmergency(){if(!gameState||gameState.phase!=='game')return;wsSend({type:'emergency_meeting'});}
function openNearbyTask(){
  if(myRole!=='crewmate')return;const me=gameState&&gameState.players[myPlayerId];if(!me)return;
  const tl=[{x:148,y:520,n:'Electrical'},{x:810,y:150,n:'Navigation'},{x:140,y:310,n:'Reactor'},{x:500,y:390,n:'MedBay'},{x:760,y:540,n:'Storage'},{x:410,y:575,n:'Engine'},{x:500,y:175,n:'Cafeteria'}];
  const loc=tl.find(t=>dist(me.x,me.y,t.x,t.y)<68);if(!loc){notify('Not near a task!','#f87171');return;}
  const task=myTasks.find(t=>!t.completed&&t.location&&t.location.name===loc.n);if(!task){notify('✅ All done here!','#4ade80');return;}
  openTaskModal(task);
}

// ════════════════════════════════════════════════════════
// TASKS
// ════════════════════════════════════════════════════════
function openTaskModal(task){
  activeTaskId=task.id;document.getElementById('task-modal').style.display='flex';
  const titles={wires:'🔌 Fix the Wires',button:'🔴 Calibrate Reactor',pattern:'🔐 Security Code'};
  document.getElementById('task-modal-title').textContent=titles[task.type]||'🔧 Fix Task';
  document.getElementById('task-modal-subtitle').textContent='📍 '+((task.location&&task.location.name)||'Unknown');
  const con=document.getElementById('task-modal-content');
  if(task.type==='wires')buildWireTask(con);else if(task.type==='button')buildMashTask(con);else buildPatternTask(con);
}
function closeTask(){document.getElementById('task-modal').style.display='none';activeTaskId=null;mashCount=0;wireConnections={};wireTarget=null;}
function completeTask(){
  if(!activeTaskId)return;wsSend({type:'complete_task',taskId:activeTaskId});
  const t=myTasks.find(t=>t.id===activeTaskId);if(t)t.completed=true;updateTaskHUD();closeTask();
}

// WIRE TASK
function buildWireTask(con){
  wireConnections={};wireTarget=null;
  wireColorCols=[{c:'#ef4444',n:'red'},{c:'#3b82f6',n:'blue'},{c:'#22c55e',n:'green'},{c:'#f59e0b',n:'yellow'}];
  wireColorShuf=[...wireColorCols].sort(()=>Math.random()-.5);
  con.innerHTML=`<div class="wire-grid">
    <div class="wire-col">${wireColorCols.map((c,i)=>`<div class="wire-node" id="wl${i}" style="border-color:${c.c};color:${c.c}" onclick="selWire(${i})">${i+1}</div>`).join('')}</div>
    <svg class="wires" id="wsvg" viewBox="0 0 100 196" style="height:196px"></svg>
    <div class="wire-col">${wireColorShuf.map((c,i)=>`<div class="wire-node" id="wr${i}" style="border-color:${c.c};color:${c.c}" onclick="conWire(${i},'${c.n}')">${'ABCD'[i]}</div>`).join('')}</div>
  </div><div id="wstat" style="color:rgba(255,255,255,.5);font-size:13px;margin-top:8px;font-weight:600">Click a left wire to start</div>`;
}
function selWire(i){
  wireTarget=i;document.querySelectorAll('[id^=wl]').forEach(e=>{e.style.transform='';e.classList.remove('selected-wire');});
  const n=document.getElementById('wl'+i);if(n){n.style.transform='scale(1.2)';n.classList.add('selected-wire');}
  const st=document.getElementById('wstat');if(st)st.textContent='Now click the matching color →';
}
function conWire(ri,cn){
  if(wireTarget===null){const st=document.getElementById('wstat');if(st)st.textContent='Select a left wire first!';return;}
  const exp=wireColorCols[wireTarget]?wireColorCols[wireTarget].n:null;
  wireConnections[wireTarget]=ri;
  const svg=document.getElementById('wsvg');if(!svg)return;
  const line=document.createElementNS('http://www.w3.org/2000/svg','line');
  const yl=24+wireTarget*58,yr=24+ri*58;
  line.setAttribute('x1','0');line.setAttribute('y1',String(yl));line.setAttribute('x2','100');line.setAttribute('y2',String(yr));
  line.setAttribute('stroke',(cn===exp&&wireColorCols[wireTarget])?wireColorCols[wireTarget].c:'#ef4444');
  line.setAttribute('stroke-width','3.5');line.setAttribute('stroke-linecap','round');
  svg.appendChild(line);
  const wln=document.getElementById('wl'+wireTarget);const wrn=document.getElementById('wr'+ri);
  if(wln)wln.classList.add('wconn');if(wrn)wrn.classList.add('wconn');
  wireTarget=null;document.querySelectorAll('[id^=wl]').forEach(e=>{e.style.transform='';e.classList.remove('selected-wire');});
  if(Object.keys(wireConnections).length>=4)setTimeout(()=>completeTask(),500);
}

// MASH TASK
function buildMashTask(con){
  mashCount=0;
  con.innerHTML=`<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><span>Progress</span><span id="mc">0/${MASH_GOAL}</span></div><div class="mash-bar"><div class="mash-fill" id="mf" style="width:0"></div></div><button class="mash-btn" onclick="mash()" id="mb">PRESS!</button><div style="color:rgba(255,255,255,.45);font-size:13px">Mash ${MASH_GOAL} times!</div>`;
}
function mash(){
  mashCount++;const mc=document.getElementById('mc');const mf=document.getElementById('mf');const mb=document.getElementById('mb');
  if(mc)mc.textContent=mashCount+'/'+MASH_GOAL;if(mf)mf.style.width=(mashCount/MASH_GOAL*100)+'%';
  if(mashCount>=MASH_GOAL){if(mb)mb.disabled=true;setTimeout(()=>completeTask(),300);}
}

// PATTERN TASK
function buildPatternTask(con){
  patternSequence=Array.from({length:5},()=>Math.floor(Math.random()*9));patternInput=[];patternPhase='watch';
  con.innerHTML=`<div id="pstat" style="color:#a78bfa;font-size:14px;margin-bottom:11px">👀 Watch the pattern...</div><div class="pattern-grid" id="pgrid">${Array.from({length:9},(_,i)=>`<div class="pattern-cell" id="pc${i}" onclick="patClick(${i})"></div>`).join('')}</div>`;
  let i=0;
  function show(){
    if(i>=patternSequence.length){patternPhase='input';const pstat=document.getElementById('pstat');if(pstat){pstat.textContent='🎯 Repeat the pattern!';pstat.style.color='#4ade80';}return;}
    const cell=document.getElementById('pc'+patternSequence[i]);
    if(cell){cell.classList.add('lit');setTimeout(()=>{cell.classList.remove('lit');i++;setTimeout(show,380);},580);}else{i++;setTimeout(show,380);}
  }
  setTimeout(show,600);
}
function patClick(idx){
  if(patternPhase!=='input')return;const expected=patternSequence[patternInput.length];patternInput.push(idx);
  const cell=document.getElementById('pc'+idx);if(!cell)return;
  if(idx===expected){
    cell.classList.add('correct');setTimeout(()=>cell.classList.remove('correct'),350);
    if(patternInput.length===patternSequence.length)setTimeout(()=>completeTask(),400);
  }else{
    cell.classList.add('wrong');
    setTimeout(()=>{cell.classList.remove('wrong');patternInput=[];const pstat=document.getElementById('pstat');if(pstat)pstat.textContent='❌ Wrong! Watch again...';setTimeout(()=>{const c=document.getElementById('task-modal-content');if(c)buildPatternTask(c);},700);},450);
  }
}

// ════════════════════════════════════════════════════════
// MEETING SYSTEM
// ════════════════════════════════════════════════════════
let timerInterval=null;
function showMeeting(reason,discTime){
  document.getElementById('meeting-screen').style.display='flex';document.getElementById('hud').classList.add('hidden');document.getElementById('action-btns').classList.add('hidden');document.getElementById('task-modal').style.display='none';
  document.getElementById('meeting-reason-text').textContent=reason;document.getElementById('meeting-title-text').textContent='🚨 EMERGENCY MEETING';
  document.getElementById('skip-vote-btn').disabled=true;document.getElementById('meeting-phase-label').textContent='💬 Discussion Phase';
  document.getElementById('chat-area').innerHTML='';
  const sysd=document.createElement('div');sysd.className='chat-msg';sysd.style.color='rgba(255,255,255,0.4)';sysd.textContent='💬 Discussion open!';document.getElementById('chat-area').appendChild(sysd);
  buildVoteGrid();startTimer(discTime/1000,discTime/1000);setTimeout(()=>{const ci=document.getElementById('chat-input');if(ci)ci.focus();},200);
}
function switchToVoting(vTime){document.getElementById('meeting-title-text').textContent='🗳 VOTE NOW!';document.getElementById('meeting-phase-label').textContent='🗳 Voting Phase';document.getElementById('skip-vote-btn').disabled=false;buildVoteGrid();startTimer(vTime/1000,vTime/1000);}
function startTimer(secs,total){clearInterval(timerInterval);let t=secs;document.getElementById('timer-fill').style.width='100%';timerInterval=setInterval(()=>{t--;document.getElementById('timer-fill').style.width=Math.max(0,t/total*100)+'%';if(t<=0)clearInterval(timerInterval);},1000);}
function buildVoteGrid(){
  if(!gameState)return;const grid=document.getElementById('vote-grid');const myVote=gameState.votes&&gameState.votes[myPlayerId];
  grid.innerHTML=Object.values(gameState.players).map(p=>`<div class="vote-card ${!p.alive?'dead':''} ${p.id===myPlayerId?'self-card':''} ${myVote===p.id?'my-vote':''}" id="vc-${p.id}" onclick="castVote('${p.id}')"><div class="vote-avatar" style="background:${p.color}">${!p.alive?'💀':'🧑'}${p.hat?p.hat:''}</div><div class="vote-name">${esc(p.username)}</div><div class="vote-count" id="vot-${p.id}"></div></div>`).join('');
  updateVoteGrid();
}
function updateVoteGrid(){if(!gameState||!gameState.votes)return;const tally={};for(const[,t]of Object.entries(gameState.votes))if(t!=='skip')tally[t]=(tally[t]||0)+1;for(const[pid,cnt]of Object.entries(tally)){const el=document.getElementById('vot-'+pid);if(el)el.textContent='🔴 '+cnt;}}
function castVote(targetId){
  if(gameState&&gameState.phase!=='vote'){notify('Voting hasn\'t started yet!','#f87171');return;}
  const me=gameState&&gameState.players[myPlayerId];if(!me||!me.alive){notify('Ghosts cannot vote','#f87171');return;}
  if(gameState.votes&&gameState.votes[myPlayerId]){notify('Already voted!','#f87171');return;}
  wsSend({type:'cast_vote',targetId});if(!gameState.votes)gameState.votes={};gameState.votes[myPlayerId]=targetId;
  document.querySelectorAll('.vote-card').forEach(c=>c.classList.remove('my-vote'));
  if(targetId!=='skip'){const vc=document.getElementById('vc-'+targetId);if(vc)vc.classList.add('my-vote');}
  document.getElementById('skip-vote-btn').disabled=true;notify('✅ Vote cast!','#4ade80');
}
function showVoteResult(msg){
  clearInterval(timerInterval);document.getElementById('timer-fill').style.width='0%';const grid=document.getElementById('vote-grid');
  if(msg.ejected){const wasImp=msg.ejected.role==='impostor';grid.innerHTML=`<div style="text-align:center;padding:20px;min-width:280px"><div style="font-size:52px;margin-bottom:10px">🚀</div><div style="font-size:22px;font-weight:700;color:${msg.ejected.color}">${esc(msg.ejected.username)}</div><div style="color:rgba(255,255,255,.55);margin-top:8px;font-size:15px">${wasImp?'😈 WAS AN IMPOSTOR!':'✅ Was innocent...'}</div></div>`;}
  else grid.innerHTML='<div style="text-align:center;padding:20px"><div style="font-size:52px">⏭</div><div style="color:rgba(255,255,255,.55);margin-top:8px">No one was ejected</div></div>';
  document.getElementById('skip-vote-btn').style.display='none';document.getElementById('meeting-phase-label').textContent='📊 Results';
}
function hideMeeting(){document.getElementById('meeting-screen').style.display='none';document.getElementById('hud').classList.remove('hidden');document.getElementById('action-btns').classList.remove('hidden');document.getElementById('skip-vote-btn').style.display='';clearInterval(timerInterval);}
function addChatMsg(msg){
  const a=document.getElementById('chat-area');if(!a)return;
  const d=document.createElement('div');d.className='chat-msg'+(msg.alive?'':' ghost-msg');
  d.innerHTML='<span style="color:'+(msg.color||'#fff')+';font-weight:700">'+esc(msg.username)+'</span>'+renderTagsHTML(msg.tags||[])+(msg.alive?'':' 👻')+': '+esc(msg.text);
  a.appendChild(d);a.scrollTop=a.scrollHeight;
}
function sendChat(){const inp=document.getElementById('chat-input');if(!inp)return;const t=inp.value.trim();if(!t)return;wsSend({type:'chat_message',text:t});inp.value='';}

// ════════════════════════════════════════════════════════
// END SCREEN
// ════════════════════════════════════════════════════════
async function showEndScreen(msg){
  hideMeeting();showScreen('end-screen');document.getElementById('hud').classList.add('hidden');document.getElementById('action-btns').classList.add('hidden');clearInterval(timerInterval);
  const wt=document.getElementById('win-title');const ws2=document.getElementById('win-subtitle');
  if(msg.winner==='crewmate'){wt.textContent='✅ CREWMATES WIN!';wt.className='win-title win-crew';ws2.textContent='Mission complete!';}
  else{wt.textContent='😈 IMPOSTORS WIN!';wt.className='win-title win-impostor';ws2.textContent='The impostors took over!';}
  document.getElementById('results-list').innerHTML=(msg.results||[]).map(p=>`<div class="result-item"><div style="width:20px;height:20px;border-radius:50%;background:${p.color};flex-shrink:0"></div><div style="flex:1"><strong>${esc(p.username)}</strong> — ${p.role==='impostor'?'😈 Impostor':'✅ Crewmate'}</div><div style="font-size:12px;color:rgba(255,255,255,.45)">${p.role==='impostor'?(p.kills||0)+' kills':(p.tasksCompleted||0)+' tasks'}${!p.alive?' · 💀':''}</div></div>`).join('');
  const iWon=(msg.winner==='crewmate'&&myRole==='crewmate')||(msg.winner==='impostor'&&myRole==='impostor');
  const reward=iWon?80+Math.floor(Math.random()*60):20;
  await pfAddCredits(reward,true);
  const gp=(pfStats.games_played||0)+1;const gw=(pfStats.games_won||0)+(iWon?1:0);pfStats.games_played=gp;pfStats.games_won=gw;
  await pfUpdateStat('games_played',gp);if(iWon)await pfUpdateStat('games_won',gw);
}
function backToMenu(){showScreen('menu-screen');showMenuScreen();}

// ════════════════════════════════════════════════════════
// OWNER PANEL
// ════════════════════════════════════════════════════════
const OWNER_TAGS=Object.keys(CM).filter(id=>CM[id].type==='tag'&&CM[id].ownerOnly);

function toggleOwnerPanel(){
  const p=document.getElementById('owner-panel');const visible=p.style.display==='block';
  p.style.display=visible?'none':'block';if(!visible)renderMegaOwnerPanel();
}

function renderMegaOwnerPanel(){
  const panel=document.getElementById('owner-panel');if(!gameState)return;
  const players=Object.values(gameState.players);
  const playerOptions=players.map(p=>`<option value="${p.id}">${esc(p.username)}${p.alive?'':' 💀'}</option>`).join('');
  const tabBtns=['Players','Commands','Tags','Server'].map((t,i)=>`<button onclick="ownerTab(${i})" id="otab${i}" style="flex:1;padding:5px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:${i===0?'rgba(167,139,250,0.3)':'rgba(255,255,255,0.06)'};color:#fff;cursor:pointer;font-size:11px">${t}</button>`).join('');
  const roomDefs=['cafeteria','reactor','navigation','medbay','storage','electrical','engine'];
  const roomBtns=roomDefs.map(r=>`<button class="obtn obtn-blue" onclick="ownerCmd('teleport_room','${r}')" style="font-size:10px">${r}</button>`).join('');
  const tagListHTML=OWNER_TAGS.map(tagId=>{const meta=CM[tagId];if(!meta)return'';return`<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:rgba(255,255,255,0.04);border-radius:8px;border:1px solid rgba(255,255,255,0.08)"><span style="font-size:16px">${meta.icon}</span><span style="flex:1;font-size:12px">${esc(meta.name)}</span><button class="obtn obtn-green" style="padding:3px 8px;font-size:10px" onclick="ownerGrantTag('${tagId}',true)">+ Grant</button><button class="obtn obtn-red" style="padding:3px 8px;font-size:10px" onclick="ownerGrantTag('${tagId}',false)">− Revoke</button></div>`;}).join('');

  panel.innerHTML=`<h3 style="color:#f87171;margin-bottom:10px;font-size:15px">👑 Owner Panel</h3>
  <div style="display:flex;gap:4px;margin-bottom:12px;flex-wrap:wrap">${tabBtns}</div>
  <div id="otabcontent0">
    <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:5px">Target player:</div>
    <select id="op-target" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#fff;padding:7px;border-radius:7px;margin-bottom:8px;font-size:12px">${playerOptions}</select>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">
      <button class="obtn obtn-orange" onclick="ownerCmd('kick')">🥾 Kick</button>
      <button class="obtn obtn-red" onclick="ownerCmd('kill')">☠️ Kill</button>
      <button class="obtn obtn-blue" onclick="ownerCmd('freeze')">❄️ Freeze</button>
      <button class="obtn obtn-blue" onclick="ownerCmd('unfreeze')">🔥 Unfreeze</button>
      <button class="obtn obtn-green" onclick="ownerCmd('respawn')">✨ Respawn</button>
      <button class="obtn obtn-green" onclick="ownerCmd('godmode_on')">🛡 Godmode</button>
      <button class="obtn obtn-purple" onclick="ownerCmd('set_impostor')">😈 → Impostor</button>
      <button class="obtn obtn-purple" onclick="ownerCmd('set_crewmate')">✅ → Crewmate</button>
      <button class="obtn obtn-yellow" onclick="ownerCmd('speed_fast')">⚡ Speed x2</button>
      <button class="obtn obtn-yellow" onclick="ownerCmd('speed_slow')">🐌 Slow x0.5</button>
      <button class="obtn obtn-yellow" onclick="ownerCmd('speed_normal')">🏃 Normal</button>
      <button class="obtn obtn-orange" onclick="ownerCmd('reset_tasks')">📋 Reset Tasks</button>
    </div>
    <div style="margin-top:8px;font-size:11px;color:rgba(255,255,255,0.4)">Teleport to room:</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:4px">${roomBtns}</div>
    <div style="margin-top:8px;font-size:11px;color:rgba(255,255,255,0.4)">Give credits:</div>
    <div style="display:flex;gap:5px;margin-top:4px">
      <input class="inp" id="op-give-amount" type="number" value="500" min="1" style="margin:0;font-size:12px;padding:6px;width:80px">
      <button class="obtn obtn-green" style="flex:1" onclick="ownerGiveCredits()">💰 Give Credits</button>
    </div>
    <div style="margin-top:8px;font-size:10px;color:rgba(255,255,255,0.4)">Aura color:</div>
    <div style="display:flex;gap:5px;margin-top:4px">
      <input id="op-aura-color" type="color" value="#ff00ff" style="width:50px;height:30px;border:none;border-radius:6px;cursor:pointer">
      <button class="obtn obtn-purple" style="flex:1" onclick="ownerCmd('set_aura')">Set Aura</button>
      <input id="op-trail-color" type="color" value="#00ff88" style="width:50px;height:30px;border:none;border-radius:6px;cursor:pointer">
      <button class="obtn obtn-green" style="flex:1" onclick="ownerCmd('set_trail')">Set Trail</button>
    </div>
    <input id="op-title" class="inp" placeholder="Title (above name)" style="margin-top:6px;font-size:12px;padding:7px">
    <button class="obtn obtn-yellow" onclick="ownerCmd('set_title')" style="width:100%;margin-top:4px">📛 Set Title</button>
  </div>
  <div id="otabcontent1" style="display:none">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:10px">
      <button class="obtn obtn-green" onclick="ownerCmd('end_crew')">✅ Crew Win</button>
      <button class="obtn obtn-red" onclick="ownerCmd('end_imp')">😈 Imp Win</button>
      <button class="obtn obtn-purple" onclick="ownerCmd('force_meeting')">🚨 Meeting</button>
      <button class="obtn obtn-purple" onclick="ownerCmd('shuffle_roles')">🎲 Shuffle</button>
      <button class="obtn obtn-orange" onclick="ownerCmd('all_tasks')">✅ All Tasks</button>
      <button class="obtn obtn-orange" onclick="ownerCmd('reveal_roles')">🕵 Reveal</button>
      <button class="obtn obtn-red" onclick="ownerCmd('explosion')">💥 Explode</button>
      <button class="obtn obtn-orange" onclick="ownerCmd('reset_cooldown')">⏱ CD Reset</button>
    </div>
    <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:5px">Broadcast:</div>
    <input id="op-broadcast" class="inp" placeholder="Announcement..." style="margin-bottom:5px;font-size:12px;padding:7px">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
      <button class="obtn obtn-yellow" onclick="ownerCmd('broadcast_gold')">📢 Gold</button>
      <button class="obtn obtn-red" onclick="ownerCmd('broadcast_red')">🔴 Red Alert</button>
    </div>
    <div style="margin-top:8px;font-size:11px;color:rgba(255,255,255,0.4)">Swap roles (pick 2):</div>
    <select id="op-swapA" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#fff;padding:6px;border-radius:7px;margin-top:4px;font-size:12px">${playerOptions}</select>
    <select id="op-swapB" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#fff;padding:6px;border-radius:7px;margin-top:4px;font-size:12px">${playerOptions}</select>
    <button class="obtn obtn-purple" onclick="ownerCmd('swap_roles')" style="width:100%;margin-top:6px">🔀 Swap Roles</button>
  </div>
  <div id="otabcontent2" style="display:none">
    <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:6px">Target (saved to PlayFab):</div>
    <select id="op-tag-target" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#fff;padding:7px;border-radius:7px;margin-bottom:8px;font-size:12px">${playerOptions}</select>
    <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:6px">📋 Grant/Revoke tag:</div>
    <div style="display:flex;flex-direction:column;gap:5px;max-height:300px;overflow-y:auto">${tagListHTML}</div>
  </div>
  <div id="otabcontent3" style="display:none">
    <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-bottom:10px">Room: <b style="color:#a78bfa">${esc(gameState.code||'')}</b><br>Phase: <b style="color:#fbbf24">${esc(gameState.phase||'')}</b><br>Players: ${Object.keys(gameState.players).length}</div>
    <div>${players.map(p=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:12px"><div style="width:12px;height:12px;border-radius:50%;background:${p.color}"></div><span style="flex:1">${esc(p.username)}</span><button class="obtn obtn-orange" style="padding:2px 7px;font-size:10px" onclick="ownerKick('${p.id}','${esc(p.username)}')">Kick</button></div>`).join('')}</div>
  </div>
  <button onclick="toggleOwnerPanel()" class="obtn obtn-red" style="width:100%;margin-top:12px">✕ Close</button>`;
  ownerTab(0);
}

function ownerTab(idx){
  for(let i=0;i<4;i++){const c=document.getElementById('otabcontent'+i);const b=document.getElementById('otab'+i);if(c)c.style.display=i===idx?'block':'none';if(b)b.style.background=i===idx?'rgba(167,139,250,0.35)':'rgba(255,255,255,0.06)';}
}

function ownerCmd(cmd,extra){
  const target=(document.getElementById('op-target')&&document.getElementById('op-target').value)||'';
  switch(cmd){
    case 'kick':ownerKick(target,(gameState&&gameState.players[target]&&gameState.players[target].username)||'?');break;
    case 'kill':wsSend({type:'owner_kill_player',targetId:target,password:OWNER_PASSWORD});break;
    case 'freeze':wsSend({type:'owner_freeze',targetId:target,frozen:true,password:OWNER_PASSWORD});break;
    case 'unfreeze':wsSend({type:'owner_freeze',targetId:target,frozen:false,password:OWNER_PASSWORD});break;
    case 'respawn':wsSend({type:'owner_respawn',targetId:target,password:OWNER_PASSWORD});break;
    case 'godmode_on':wsSend({type:'owner_godmode',targetId:target,enabled:true,password:OWNER_PASSWORD});break;
    case 'set_impostor':wsSend({type:'owner_set_role',targetId:target,role:'impostor',password:OWNER_PASSWORD});break;
    case 'set_crewmate':wsSend({type:'owner_set_role',targetId:target,role:'crewmate',password:OWNER_PASSWORD});break;
    case 'speed_fast':wsSend({type:'owner_speed_boost',targetId:target,mult:2,password:OWNER_PASSWORD});break;
    case 'speed_slow':wsSend({type:'owner_speed_boost',targetId:target,mult:0.5,password:OWNER_PASSWORD});break;
    case 'speed_normal':wsSend({type:'owner_speed_boost',targetId:target,mult:1,password:OWNER_PASSWORD});break;
    case 'reset_tasks':wsSend({type:'owner_set_tasks',targetId:target,count:5,password:OWNER_PASSWORD});break;
    case 'teleport_room':wsSend({type:'owner_teleport',targetId:target,room:extra,password:OWNER_PASSWORD});break;
    case 'end_crew':wsSend({type:'owner_end_game',winner:'crewmate',password:OWNER_PASSWORD});break;
    case 'end_imp':wsSend({type:'owner_end_game',winner:'impostor',password:OWNER_PASSWORD});break;
    case 'force_meeting':wsSend({type:'owner_force_meeting',reason:'⚡ Owner called a meeting!',password:OWNER_PASSWORD});break;
    case 'shuffle_roles':wsSend({type:'owner_shuffle_roles',password:OWNER_PASSWORD});break;
    case 'all_tasks':wsSend({type:'owner_all_tasks_done',password:OWNER_PASSWORD});break;
    case 'reveal_roles':wsSend({type:'owner_reveal_roles',password:OWNER_PASSWORD});break;
    case 'explosion':wsSend({type:'owner_explosion',targetId:target,radius:180,password:OWNER_PASSWORD});break;
    case 'reset_cooldown':wsSend({type:'owner_set_killcooldown',seconds:0,password:OWNER_PASSWORD});break;
    case 'broadcast_gold':{const t=document.getElementById('op-broadcast')&&document.getElementById('op-broadcast').value;if(t)wsSend({type:'owner_broadcast',text:t,color:'#fbbf24',icon:'📢',password:OWNER_PASSWORD});break;}
    case 'broadcast_red':{const t=document.getElementById('op-broadcast')&&document.getElementById('op-broadcast').value;if(t)wsSend({type:'owner_broadcast',text:t,color:'#f87171',icon:'🔴',password:OWNER_PASSWORD});break;}
    case 'swap_roles':{const a=document.getElementById('op-swapA')&&document.getElementById('op-swapA').value;const b=document.getElementById('op-swapB')&&document.getElementById('op-swapB').value;if(a&&b&&a!==b)wsSend({type:'owner_swap_roles',targetA:a,targetB:b,password:OWNER_PASSWORD});else notify('Pick 2 different players','#f87171');break;}
    case 'set_aura':{const c=document.getElementById('op-aura-color')&&document.getElementById('op-aura-color').value||'#ff00ff';wsSend({type:'owner_set_aura',targetId:target,color:c,password:OWNER_PASSWORD});break;}
    case 'set_trail':{const c=document.getElementById('op-trail-color')&&document.getElementById('op-trail-color').value||'#00ff88';wsSend({type:'owner_set_cosmetic',targetId:target,cosType:'trailColor',value:c,password:OWNER_PASSWORD});break;}
    case 'set_title':{const title=document.getElementById('op-title')&&document.getElementById('op-title').value;wsSend({type:'owner_set_title',targetId:target,title:title,password:OWNER_PASSWORD});break;}
  }
}

async function ownerGrantTag(tagId,grant){
  const tgtId=document.getElementById('op-tag-target')&&document.getElementById('op-tag-target').value;if(!tgtId){notify('Select a target player first','#f87171');return;}
  wsSend({type:'owner_grant_tag',targetId:tgtId,tagId,grant,password:OWNER_PASSWORD});
  if(tgtId===myPlayerId){if(grant){if(!myTags.includes(tagId))myTags.push(tagId);}else{myTags=myTags.filter(t=>t!==tagId);}await pfSaveData('tags',JSON.stringify(myTags));saveLocalSession();const mpt=document.getElementById('menu-player-tags');if(mpt)mpt.innerHTML=renderTagsHTML(myTags);}
  notify(grant?'✅ Granted '+(CM[tagId]&&CM[tagId].name||tagId):'❌ Revoked '+(CM[tagId]&&CM[tagId].name||tagId),'#fbbf24');
}

async function ownerGiveCredits(){
  const tgtId=document.getElementById('op-target')&&document.getElementById('op-target').value;
  const amount=parseInt((document.getElementById('op-give-amount')&&document.getElementById('op-give-amount').value)||0);
  if(!tgtId||amount<=0){notify('Select target and enter amount','#f87171');return;}
  wsSend({type:'owner_give_credits',targetId:tgtId,amount,password:OWNER_PASSWORD});notify('💰 Sent '+amount+' credits','#4ade80');
}

function ownerKick(id,name){if(!confirm('Kick '+name+'?'))return;wsSend({type:'owner_kick',targetId:id,password:OWNER_PASSWORD,reason:'Kicked by owner'});}

function showRolesReveal(roles){
  const html=`<div style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:200;display:flex;align-items:center;justify-content:center" id="roles-reveal-modal"><div style="background:#0c1220;border:1px solid #a78bfa;border-radius:16px;padding:24px;max-width:400px;width:90vw"><div style="font-size:18px;font-weight:900;color:#a78bfa;margin-bottom:14px">🕵️ All Roles</div>${(roles||[]).map(p=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06)"><span style="color:${p.role==='impostor'?'#f87171':'#4ade80'};font-size:18px">${p.role==='impostor'?'😈':'✅'}</span><span style="flex:1;font-size:13px">${esc(p.username)}</span><span style="font-size:11px;color:${p.role==='impostor'?'#f87171':'#4ade80'}">${p.role.toUpperCase()}</span></div>`).join('')}<button onclick="document.getElementById('roles-reveal-modal').remove()" style="margin-top:14px;width:100%;padding:9px;border-radius:8px;background:rgba(255,255,255,0.08);border:none;color:#fff;cursor:pointer">Close</button></div></div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}

// ════════════════════════════════════════════════════════
// EFFECTS
// ════════════════════════════════════════════════════════
function flashRed(){const f=document.getElementById('kill-flash');f.classList.add('flash');setTimeout(()=>f.classList.remove('flash'),300);}
function showBanner(text,color){
  const b=document.getElementById('phase-banner');b.textContent=text;b.style.color=color;b.style.display='block';b.style.opacity='1';b.style.transform='translate(-50%,-50%) scale(1)';
  setTimeout(()=>{b.style.transition='opacity .5s,transform .5s';b.style.opacity='0';b.style.transform='translate(-50%,-50%) scale(1.3)';setTimeout(()=>{b.style.display='none';b.style.transition='';},500);},1800);
}

// ════════════════════════════════════════════════════════
// MOBILE CONTROLS
// ════════════════════════════════════════════════════════
function addMobileControls(){
  if(document.getElementById('mobile-dpad'))return;
  const dp=document.createElement('div');dp.id='mobile-dpad';dp.style.cssText='position:fixed;bottom:110px;left:16px;z-index:25;display:grid;grid-template-columns:repeat(3,52px);grid-template-rows:repeat(3,52px);gap:3px;touch-action:none';
  [{r:0,c:1,l:'▲',d:'Up'},{r:1,c:0,l:'◀',d:'Left'},{r:1,c:2,l:'▶',d:'Right'},{r:2,c:1,l:'▼',d:'Down'}].forEach(b=>{
    const btn=document.createElement('button');btn.textContent=b.l;btn.style.cssText=`grid-row:${b.r+1};grid-column:${b.c+1};background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:9px;font-size:18px;cursor:pointer;touch-action:none`;
    btn.addEventListener('pointerdown',e=>{e.preventDefault();window['move'+b.d]=true;});btn.addEventListener('pointerup',()=>{window['move'+b.d]=false;});btn.addEventListener('pointerleave',()=>{window['move'+b.d]=false;});
    dp.appendChild(btn);
  });document.body.appendChild(dp);
}

// ════════════════════════════════════════════════════════
// SCREENS & UTILS
// ════════════════════════════════════════════════════════
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('hidden',s.id!==id));if(id!=='lobby-screen'&&id!=='game')document.getElementById('meeting-screen').style.display='none';}
function hideAllScreens(){document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));}
function notify(text,color){
  color=color||'#fff';const el=document.createElement('div');el.className='notif';el.style.color=color;el.textContent=text;
  document.getElementById('notifs').appendChild(el);setTimeout(()=>{if(el.parentNode)el.parentNode.removeChild(el);},4000);
}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// ════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════
async function init(){
  if(typeof PlayFab!=='undefined')PlayFab.settings.titleId=PLAYFAB_TITLE_ID;
  buildColorGrid('reg-color-grid',false);
  const loadingFallback=setTimeout(()=>{const ls=document.getElementById('loading-screen');if(ls&&!ls.classList.contains('hidden')){ls.classList.add('hidden');document.getElementById('auth-screen').classList.remove('hidden');}},5000);
  try{connectWS().catch(()=>{});await tryAutoLogin();}
  catch(e){showScreen('auth-screen');}
  finally{clearTimeout(loadingFallback);}
}

setInterval(()=>{if(ws&&ws.readyState===WebSocket.OPEN)wsSend({type:'ping'});},25000);
window.addEventListener('resize',()=>{if(phaserGame)phaserGame.scale.resize(innerWidth,innerHeight);});
window.addEventListener('error',e=>{console.error('Global error:',e.message);const ls=document.getElementById('loading-screen');if(ls&&!ls.classList.contains('hidden')){ls.classList.add('hidden');const as=document.getElementById('auth-screen');if(as)as.classList.remove('hidden');}});

init();
</script>
</body>
</html>
