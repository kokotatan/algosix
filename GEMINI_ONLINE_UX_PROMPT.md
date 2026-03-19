# ALGOSIX — オンライン戦 待機室・スタンプチャット・思考中インジケーター
# 実装プロンプト

---

## 設計方針

- ルーム作成時に人数・モード（個人戦/ペア戦）を決定済み。待機室での変更は不可
- 設定を変えたい場合はホームに戻ってルームを作り直す
- ゲーム終了後は「もう一度（同設定）」「ペア変更」のみ提供

---

## 1. 待機室（ロビー）

### 画面レイアウト

```
┌─────────────────────────────────────┐
│  ← ホームに戻る                      │
│                                     │
│  ALGOSIX  個人戦 4人                 │  ← ルーム設定（変更不可・表示のみ）
│                                     │
│  ルームコード                        │
│  ┌───────────────────────────────┐  │
│  │        A B C - 1 2 3         │  │  ← 大きく表示
│  └───────────────────────────────┘  │
│                                     │
│  ── 友達を招待 ──                   │
│  [LINEで送る]      [URLをコピー]    │  ← 最優先
│  [コードをコピー]  [QRコード ▼]     │  ← QRは折りたたみ
│                                     │
│  参加者 (2 / 4)                     │
│  ┌─────────────────────────────┐   │
│  │ ↑↓ 1  Yuki   HOST  ●      │   │  ← ↑↓ はホストのみ表示
│  │ ↑↓ 2  Taro         ●      │   │
│  │     3  ── 待機中 ──        │   │
│  │     4  ── 待機中 ──        │   │
│  └─────────────────────────────┘   │
│                                     │
│  スタンプ: [やる！][どこだ？]…      │
│                                     │
│  （ホスト）[ゲームを開始する]       │  ← 2人以上で有効
│  （参加者）ホストの開始を待っています │
└─────────────────────────────────────┘
```

---

### 1-1. 招待・共有ボタン

#### ① LINEで送る（最優先）

```js
function shareToLine(roomCode) {
  const joinUrl = `${window.location.origin}/join?code=${roomCode}`;
  const text = encodeURIComponent(
    `ALGOSIXで対戦しよう！\nルームコード: ${roomCode}\n${joinUrl}`
  );
  window.open(`https://line.me/R/msg/text/?${text}`, "_blank", "noopener");
}
```

#### ② URLをコピー

```js
async function copyUrl(roomCode) {
  const url = `${window.location.origin}/join?code=${roomCode}`;
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // フォールバック
    const el = Object.assign(document.createElement("input"), { value: url });
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
  setCopied("url");
  setTimeout(() => setCopied(null), 2000);
}
```

#### ③ コードをコピー（6桁のみ）

```js
async function copyCode(roomCode) {
  await navigator.clipboard.writeText(roomCode).catch(() => {});
  setCopied("code");
  setTimeout(() => setCopied(null), 2000);
}
```

#### ④ QRコード（タップで展開・折りたたみ）

```jsx
const [showQr, setShowQr] = useState(false);
const [qrDataUrl, setQrDataUrl] = useState("");

useEffect(() => {
  if (!showQr || !roomCode) return;
  import("qrcode").then(QRCode => {
    QRCode.default.toDataURL(
      `${window.location.origin}/join?code=${roomCode}`,
      { width: 200, margin: 1, color: { dark: "#111111", light: "#ffffff" } }
    ).then(setQrDataUrl);
  });
}, [showQr, roomCode]);

// ボタン
<button className="share-btn share-qr" onClick={() => setShowQr(v => !v)}>
  QRコード {showQr ? "▲" : "▼"}
</button>

// 展開パネル
{showQr && qrDataUrl && (
  <div style={{ textAlign:"center", padding:"14px 0",
    animation:"slideDown .28s ease both" }}>
    <img src={qrDataUrl} alt="QR"
      style={{ width:180, height:180, borderRadius:8, display:"block", margin:"0 auto" }}/>
    <p style={{ fontSize:11, color:"var(--gray3)", marginTop:8 }}>
      カメラで読み取ってもらおう
    </p>
  </div>
)}
```

#### ボタンのスタイル

```css
.share-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.share-btn {
  display: flex; align-items: center; justify-content: center; gap: 7px;
  padding: 12px 10px; border-radius: 12px;
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 13px; font-weight: 700;
  cursor: pointer; border: none; transition: opacity .14s;
}
.share-btn:active { opacity: .75; }

.share-btn.share-line  { background: #06C755; color: #fff; }
.share-btn.share-url   { background: var(--black); color: var(--white); }
.share-btn.share-code  { background: var(--bg); color: var(--black); border: var(--border); }
.share-btn.share-qr    { background: var(--bg); color: var(--gray4);  border: var(--border); font-size:12px; }

/* コピー完了フィードバック */
.share-btn.copied { background: var(--green) !important; color: #fff !important; }
```

```jsx
// LINEアイコン
function LineIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.02 2 11c0 3.26 1.82 6.12 4.58 7.85-.2.74-.73 2.68-.84 3.1-.13.52.19.51.4.37.17-.11 2.7-1.78 3.8-2.5.65.09 1.32.14 2.01.14 5.52 0 10-4.02 10-9C22 6.02 17.52 2 12 2z"/>
    </svg>
  );
}
```

---

### 1-2. 参加者スロット

#### 参加アニメーション

```css
@keyframes slotJoin {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.slot-item.joining { animation: slotJoin .36s cubic-bezier(.22,1,.36,1) both; }
```

```js
useEffect(() => {
  on("lobby:update", (data) => {
    const prev = prevLobby.current?.players ?? [];
    const newSeats = data.players
      .filter(p => !prev.find(pp => pp.seatIndex === p.seatIndex))
      .map(p => p.seatIndex);

    setJoiningSeats(new Set(newSeats));
    setTimeout(() => setJoiningSeats(new Set()), 500);

    prevLobby.current = data;
    setLobby(data);
  });
}, [on]);
```

#### 接続状態ドット

```jsx
function ConnDot({ connected }) {
  return (
    <span style={{
      width: 8, height: 8, borderRadius: "50%",
      background: connected ? "#28a028" : "#e03030",
      boxShadow: connected ? "0 0 0 2px rgba(40,160,40,.2)" : "none",
      flexShrink: 0, display: "inline-block", transition: "background .3s",
    }}/>
  );
}
```

---

### 1-3. ホスト専用機能

人数・ルールはルーム作成時に決定。待機室での変更は不可。
ホストができることは「座席入れ替え」と「キック」のみ。

#### 座席順の入れ替え（矢印ボタン）

スマホでのドラッグは複雑なため、上下矢印ボタンで入れ替える。

```jsx
{/* スロットの各行 */}
<div className="slot-item filled">
  <div className="slot-num">{slot.seatIndex + 1}</div>
  <div className="slot-name">{slot.name}</div>
  {slot.isHost && <span className="slot-badge host">HOST</span>}
  <ConnDot connected={slot.connected} />

  {/* ホストのみ表示・自分自身以外に矢印 */}
  {isHost && slot.seatIndex > 0 && (
    <button className="swap-btn"
      onClick={() => emit("room:swap_seats", {
        code: roomCode,
        seatA: slot.seatIndex - 1,
        seatB: slot.seatIndex,
      })}>
      ↑
    </button>
  )}
  {isHost && slot.seatIndex !== mySeatIndex && (
    <button className="kick-btn"
      onClick={() => handleKick(slot)}>
      ✕
    </button>
  )}
</div>
```

```css
.swap-btn, .kick-btn {
  background: none; border: none; cursor: pointer;
  font-size: 14px; color: var(--gray3); padding: 4px 6px;
  border-radius: 6px; transition: all .14s;
}
.swap-btn:hover { color: var(--black); background: var(--gray1); }
.kick-btn:hover { color: var(--red);   background: #faf0f0; }
```

```js
// server.js に追加
socket.on("room:swap_seats", ({ code, seatA, seatB }, cb) => {
  const room = rooms.get(code);
  if (!room || room.hostSocketId !== socket.id) return cb?.({ error: "権限なし" });
  const slotA = room.players.find(p => p.seatIndex === seatA);
  const slotB = room.players.find(p => p.seatIndex === seatB);
  if (!slotA || !slotB) return cb?.({ error: "invalid" });
  [slotA.seatIndex, slotB.seatIndex] = [slotB.seatIndex, slotA.seatIndex];
  broadcastLobby(room);
  cb?.({ ok: true });
});
```

#### キック

```js
function handleKick(slot) {
  if (!window.confirm(`${slot.name} をキックしますか？`)) return;
  emit("room:kick", { code: roomCode, seatIndex: slot.seatIndex });
}
```

```js
// server.js に追加
socket.on("room:kick", ({ code, seatIndex }, cb) => {
  const room = rooms.get(code);
  if (!room || room.hostSocketId !== socket.id) return cb?.({ error: "権限なし" });
  const slot = room.players.find(p => p.seatIndex === seatIndex);
  if (!slot) return cb?.({ error: "invalid" });
  io.to(slot.socketId).emit("room:kicked");
  // 除外して座席を詰める
  room.players = room.players
    .filter(p => p.seatIndex !== seatIndex)
    .sort((a, b) => a.seatIndex - b.seatIndex)
    .map((p, i) => ({ ...p, seatIndex: i }));
  broadcastLobby(room);
  cb?.({ ok: true });
});

// クライアント側: キックされた時
on("room:kicked", () => {
  alert("ホストにより退出させられました");
  router.push("/");
});
```

---

### 1-4. 待機中スタンプ

待機室でもゲーム中と同じスタンプを使える。

```jsx
<div className="lobby-stamp-bar">
  {STAMPS.map(s => (
    <button key={s.id} disabled={stampCooldown}
      onClick={() => sendLobbyStamp(s.id)}
      className={`stamp-btn${stampCooldown ? " cooling" : ""}`}>
      {s.label}
    </button>
  ))}
</div>
```

```js
// server.js: ロビースタンプ（全員に転送）
socket.on("lobby:stamp", ({ code, stampId }) => {
  const room = rooms.get(code);
  if (!room) return;
  const slot = room.players.find(s => s.socketId === socket.id);
  if (!slot) return;
  io.to(code).emit("lobby:stamp_receive", {
    fromSeatIndex: slot.seatIndex,
    fromName: slot.name,
    stampId,
  });
});
```

---

## 2. ゲーム終了後（リザルト画面）

### 表示内容

```
┌─────────────────────────────────────┐
│                                     │
│         Yuki の勝利！               │
│                                     │
│  全員の手札（オープン表示）          │
│   Yuki  [黒3][白5][黒8][白11]       │
│   Taro  [白2][黒6][白9]（全開き）   │
│                                     │
│  総ターン数  12                     │
│  Yuki 正解率  67%                   │
│  Taro 正解率  44%                   │
│                                     │
│  ─────────────────────────         │
│                                     │
│  [もう一度！]   [ペア変更]          │  ← ペア戦のみペア変更を表示
│                                     │
│  [ホームに戻る]                     │  ← 人数・ルール変えるならこちら
└─────────────────────────────────────┘
```

### 「もう一度！」— 全員一致で同設定リスタート

```jsx
// もう一度ボタン
<button className="start-btn" onClick={handleRematch}>
  {rematchVotes}/{totalPlayers} もう一度！
</button>
```

```js
// クライアント
function handleRematch() {
  emit("game:rematch", { code: roomCode });
}

on("game:rematch_vote", ({ votes, total }) => {
  setRematchVotes(votes);
  setTotalPlayers(total);
});

on("game:rematch_start", () => {
  // ゲーム状態をリセットして待機室に戻る（または即ゲーム開始）
  setScreen("game");
});
```

```js
// server.js
// Room に rematchVotes: new Set() を追加

socket.on("game:rematch", ({ code }, cb) => {
  const room = rooms.get(code);
  if (!room) return;

  if (!room.rematchVotes) room.rematchVotes = new Set();
  room.rematchVotes.add(socket.id);

  const connected = room.players.filter(p => p.connected);
  io.to(code).emit("game:rematch_vote", {
    votes: room.rematchVotes.size,
    total: connected.length,
  });

  if (room.rematchVotes.size >= connected.length) {
    // 同じ設定・同じメンバーで新ゲーム開始
    room.game  = buildGameState(room.players);  // 既存関数
    room.phase = "game";
    room.rematchVotes.clear();
    io.to(code).emit("game:rematch_start");
    broadcastGame(room);  // 既存関数
  }
  cb?.({ ok: true });
});
```

**30秒タイムアウト（誰かが押さない場合）:**

```js
// game:rematch の最初の1票が入ったタイミングでタイマーをセット
if (room.rematchVotes.size === 1) {
  room.rematchTimeout = setTimeout(() => {
    if (room.rematchVotes && room.rematchVotes.size < connected.length) {
      room.rematchVotes.clear();
      io.to(code).emit("game:rematch_timeout");
    }
  }, 30000);
}
```

```js
// クライアント: タイムアウト時は待機室に戻る
on("game:rematch_timeout", () => {
  setScreen("lobby");
  setRematchVotes(0);
});
```

### 「ペア変更」— ペア戦のみ表示

座席をシャッフルしてペアを組み直す。ルームのプレイヤー数・モードはそのまま。

```jsx
{game.mode === "pair" && (
  <button className="btn btn-secondary" onClick={handlePairChange}>
    ペア変更
  </button>
)}
```

```js
// ペア変更 = 座席をランダムにシャッフルして待機室へ
function handlePairChange() {
  emit("game:pair_change", { code: roomCode });
}

on("game:pair_changed", () => {
  // 待機室に戻る
  setScreen("lobby");
});
```

```js
// server.js
socket.on("game:pair_change", ({ code }, cb) => {
  const room = rooms.get(code);
  if (!room) return;

  // 座席をランダムにシャッフル
  const seats = room.players.map(p => p.seatIndex);
  for (let i = seats.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [seats[i], seats[j]] = [seats[j], seats[i]];
  }
  room.players.forEach((p, i) => { p.seatIndex = seats[i]; });

  room.game  = null;
  room.phase = "lobby";
  broadcastLobby(room);
  io.to(code).emit("game:pair_changed");
  cb?.({ ok: true });
});
```

---

## 3. ゲーム中スタンプチャット

### スタンプ定義

```js
// src/lib/stamps.js
export const STAMPS = [
  { id: "yaru",    label: "やる！"      },
  { id: "dokoda",  label: "どこだ？"    },
  { id: "wakatta", label: "わかった"    },
  { id: "uso",     label: "うそでしょ"  },
  { id: "yoshi",   label: "よし！"      },
  { id: "zannen",  label: "残念..."     },
  { id: "think",   label: "(´・ω・`)"  },
  { id: "joy",     label: "w w w"       },
  { id: "shock",   label: "∑(ﾟДﾟ)"    },
  { id: "nice",    label: "ナイス"      },
  { id: "hmm",     label: "むむむ"      },
  { id: "gg",      label: "GG"          },
];
```

### 配置（アクションパネル下・ログ上）

```jsx
<div className="bottom">
  <div className="action-area">
    {/* 既存のアクションパネル */}
  </div>

  <div className="stamp-bar">
    {STAMPS.map(s => (
      <button key={s.id} disabled={stampCooldown}
        onClick={() => sendStamp(s.id)}
        className={`stamp-btn${stampCooldown ? " cooling" : ""}`}>
        {s.label}
      </button>
    ))}
  </div>

  <div className="log-bar">
    {/* 既存のログ */}
  </div>
</div>
```

```css
.stamp-bar {
  display: flex; gap: 6px;
  overflow-x: auto; padding: 6px 12px 8px;
  border-top: var(--border);
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.stamp-bar::-webkit-scrollbar { display: none; }

.stamp-btn {
  flex-shrink: 0; padding: 5px 13px;
  border-radius: 20px; border: var(--border);
  background: var(--bg); color: var(--black);
  font-size: 12px; font-weight: 600;
  font-family: 'Noto Sans JP', sans-serif;
  cursor: pointer; white-space: nowrap;
  transition: opacity .14s, transform .1s;
}
.stamp-btn:active  { transform: scale(.92); }
.stamp-btn.cooling { opacity: .35; cursor: not-allowed; }
```

### 送信（クールダウン3秒）

```js
const [stampCooldown, setStampCooldown] = useState(false);

function sendStamp(stampId) {
  if (stampCooldown) return;
  emit("stamp:send", { code: roomCode, stampId });
  setStampCooldown(true);
  setTimeout(() => setStampCooldown(false), 3000);
}
```

### 受信・フロート表示

```js
const [floatingStamps, setFloatingStamps] = useState({});

useEffect(() => {
  on("stamp:receive", ({ fromSeatIndex, stampId }) => {
    const label = STAMPS.find(s => s.id === stampId)?.label ?? "";
    setFloatingStamps(prev => ({
      ...prev,
      [fromSeatIndex]: { label, key: Date.now() },
    }));
    setTimeout(() => {
      setFloatingStamps(prev => {
        const next = { ...prev };
        delete next[fromSeatIndex];
        return next;
      });
    }, 2500);
  });
  return () => off("stamp:receive");
}, [on, off]);
```

### フロートスタンプ（Seatコンポーネント）

```jsx
// Seat の親 div に position: relative を追加すること
function Seat({ player, floatingStamp, ...rest }) {
  return (
    <div className="seat" style={{ position:"relative", ...rest.style }}>
      {floatingStamp && (
        <div key={floatingStamp.key} className="stamp-float">
          {floatingStamp.label}
        </div>
      )}
      {/* ... 既存のカード表示 ... */}
    </div>
  );
}
```

```css
.stamp-float {
  position: absolute; top: -46px; left: 50%;
  transform: translateX(-50%);
  background: var(--black); color: #fff;
  padding: 6px 16px; border-radius: 22px;
  font-size: 13px; font-weight: 700;
  font-family: 'Noto Sans JP', sans-serif;
  white-space: nowrap; pointer-events: none; z-index: 20;
  animation: stampFloat 2.5s cubic-bezier(.22,1,.36,1) both;
}

@keyframes stampFloat {
  0%   { opacity:0; transform:translateX(-50%) translateY(10px) scale(.82); }
  14%  { opacity:1; transform:translateX(-50%) translateY(0)    scale(1.06); }
  22%  { transform:translateX(-50%) translateY(0) scale(1); }
  72%  { opacity:1; }
  100% { opacity:0; transform:translateX(-50%) translateY(-10px); }
}
```

### サーバー側（server.js に追加）

```js
// ゲーム中スタンプ（転送のみ・ゲーム状態に影響しない）
socket.on("stamp:send", ({ code, stampId }) => {
  const room = rooms.get(code);
  if (!room) return;
  const slot = room.players.find(s => s.socketId === socket.id);
  if (!slot) return;
  socket.to(code).emit("stamp:receive", { fromSeatIndex: slot.seatIndex, stampId });
});
```

---

## 4. 思考中インジケーター

### ヘッダーバー

```jsx
function GameHeader({ game, isMyTurn, deckCount }) {
  const currentPlayer = game.players[game.cur];

  return (
    <div className="g-bar">
      <div className="g-turn">
        <div className="g-dot" style={{
          background: isMyTurn ? "var(--black)" : "var(--gray3)"
        }}/>
        {isMyTurn
          ? "あなたのターン"
          : <ThinkingIndicator name={currentPlayer.name} phase={game.phase}/>
        }
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <ConnStatus game={game}/>
        <div className="g-deck-badge">山札 {game.deck.length}</div>
      </div>
    </div>
  );
}
```

### ThinkingIndicator

```jsx
function ThinkingIndicator({ name, phase }) {
  const msg = {
    draw:     `${name} がカードを引いています`,
    attack:   `${name} が考えています`,
    continue: `${name} が考えています`,
  }[phase] ?? `${name} のターン`;

  return (
    <span style={{ display:"flex", alignItems:"center", gap:6 }}>
      <ThinkingDots/>
      <span style={{ fontSize:12, fontWeight:600, color:"var(--gray4)" }}>{msg}</span>
    </span>
  );
}

function ThinkingDots() {
  return (
    <span style={{ display:"flex", gap:3, alignItems:"center" }}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          display:"inline-block", width:4, height:4, borderRadius:"50%",
          background:"var(--gray3)",
          animation:`dotPulse 1.1s ease-in-out ${i*.18}s infinite`,
        }}/>
      ))}
    </span>
  );
}
```

```css
@keyframes dotPulse {
  0%,80%,100% { opacity:.25; transform:scale(.75); }
  40%         { opacity:1;   transform:scale(1); }
}
```

### 接続状態ドット

```jsx
function ConnStatus({ game }) {
  const allOk = game.players.every(p => p.connected !== false);
  const anyDc = game.players.some(p => p.connected === false);
  const color  = anyDc ? "#e03030" : allOk ? "#28a028" : "#e8b84b";
  const label  = anyDc ? "切断者あり" : allOk ? "全員接続中" : "接続不安定";
  return (
    <span title={label} style={{
      width:8, height:8, borderRadius:"50%", background:color,
      display:"inline-block", flexShrink:0,
      boxShadow:`0 0 0 2px ${color}33`, transition:"background .4s",
    }}/>
  );
}
```

### 切断オーバーレイ

```jsx
{disconnected && (
  <div style={{
    position:"fixed", inset:0, zIndex:50,
    background:"rgba(255,255,255,0.92)",
    display:"flex", flexDirection:"column",
    alignItems:"center", justifyContent:"center",
    gap:20, padding:32, textAlign:"center",
  }}>
    <div style={{ fontSize:18, fontWeight:900 }}>接続が切れました</div>
    <div style={{ fontSize:13, color:"var(--gray4)" }}>
      再接続しています... {countdown > 0 && `(${countdown}秒)`}
    </div>
    <button className="start-btn" style={{ maxWidth:240 }} onClick={handleReconnect}>
      再接続する
    </button>
    <button className="btn btn-ghost" onClick={() => router.push("/")}>
      ホームに戻る
    </button>
  </div>
)}
```

---

## 5. /join ページ

```js
// src/app/join/page.js
"use client";
import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function JoinRedirect() {
  const code   = useSearchParams().get("code");
  const router = useRouter();

  useEffect(() => {
    if (!code) { router.replace("/"); return; }
    sessionStorage.setItem("pendingRoomCode", code.replace(/-/g,"").toUpperCase());
    router.replace("/");
  }, [code, router]);

  return (
    <div style={{
      height:"100svh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      background:"#111", color:"#fff",
      fontFamily:"'Noto Sans JP',sans-serif", fontSize:14, gap:14,
    }}>
      <div style={{
        width:28, height:28, borderRadius:"50%",
        border:"2px solid rgba(255,255,255,.25)",
        borderTop:"2px solid #fff",
        animation:"spin .7s linear infinite",
      }}/>
      <span>ルームに参加しています...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function JoinPage() {
  return <Suspense><JoinRedirect /></Suspense>;
}
```

```js
// AlgoApp.js: pendingRoomCode の検知
useEffect(() => {
  const code = sessionStorage.getItem("pendingRoomCode");
  if (code) {
    sessionStorage.removeItem("pendingRoomCode");
    setPendingCode(code);
    setScreen("online_join");
  }
}, []);
```

---

## 6. 新規 Socket.io イベント一覧

```
クライアント → サーバー
  room:swap_seats      { code, seatA, seatB }
  room:kick            { code, seatIndex }
  lobby:stamp          { code, stampId }
  stamp:send           { code, stampId }
  game:rematch         { code }
  game:pair_change     { code }

サーバー → クライアント
  room:kicked
  lobby:stamp_receive  { fromSeatIndex, fromName, stampId }
  stamp:receive        { fromSeatIndex, stampId }
  game:rematch_vote    { votes, total }
  game:rematch_start
  game:rematch_timeout
  game:pair_changed
```

---

## 実装順序

1. LINE共有・URLコピー・コードコピー（URLスキームだけで最速）
2. スタンプチャット（サーバー転送 → フロート表示）
3. 参加アニメーション（lobby:update 差分検出）
4. 思考中インジケーター
5. ホスト機能（座席入れ替え → キック）
6. リザルト画面（もう一度 → ペア変更）
7. QRコード（遅延 import）
8. /join ページ
9. 切断オーバーレイ

---

## 注意事項

- スタンプはゲーム状態に一切影響しない。サーバーは転送のみ
- 待機室スタンプ（`lobby:stamp`）とゲーム中スタンプ（`stamp:send`）は別イベント
- フロートスタンプは Seat の親に `position:relative` が必要
- 人数・ルール変更は実装しない（ホームに戻ってルームを作り直す）
- `navigator.clipboard` は HTTPS 環境のみ動作。localhost では fallback を使う
