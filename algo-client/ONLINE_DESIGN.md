# ALGOSIX オンライン対戦 設計書

> 実装ベース: `useFirebaseMultiplayer.js` / `OnlineLobbyScreen.js` / `OnlineRoomScreen.js` / `AlgoApp.js`
> 最終更新: 2026-03-19

---

## 1. アーキテクチャ概要

### バックエンド

Socket.io サーバーは存在しない。**Firebase Realtime Database (RTDB) のみ**をバックエンドとして使用する。

`useFirebaseMultiplayer.js` が socket.io-client の API (`emit` / `on` / `off`) を模倣するアダプター層として機能し、`AlgoApp.js` と `GameScreen.jsx` はこの API を通して通信する。

### ホスト / ピア の役割分担

| 役割 | 責務 |
|------|------|
| **ホスト** | ゲーム状態の唯一の所有者。`initGame` でゲームを初期化し、各プレイヤー向けにマスクした状態を RTDB に書き込む |
| **ピア** | アクション（アタック・パス等）を RTDB の `actions` キューに push。ホストが処理して結果をブロードキャスト |
| **全員** | 自分用の `states/{selfId}` を `onValue` で監視し、受け取った状態で画面を更新 |

### プレイヤー ID

| 種別 | ID 型 | 生成方法 |
|------|-------|----------|
| オンライン人間 | `string` (`"user_abc123"`) | `sessionStorage` にセッション間で保持 |
| オンライン CPU | `number` (配列インデックス) | `initGame` が文字列名 `"CPU 1"` から自動付与 |
| オフラインプレイヤー | `number` (配列インデックス) | `initGame` が文字列名から自動付与 |

---

## 2. 画面フロー

```
[menu]
  │
  ├─ 「オンラインで遊ぶ（作成）」
  │       ↓
  │   [online_setup]  ← OnlineSetupScreen
  │   名前 / 人数(2-4) / モード(個人戦|ペア戦) を設定
  │   onCreate() → emit("create_room")
  │       ↓ room_created イベント
  │   [online_room]  ← OnlineRoomScreen (ホスト)
  │
  ├─ 「ルームに参加する」 / URL の ?room= パラメータ
  │       ↓
  │   [online_join]  ← OnlineJoinScreen
  │   名前 / ルームID(6文字) を入力
  │   onJoin() → emit("join_room")
  │       ↓ room_joined + player_joined イベント
  │   [online_room]  ← OnlineRoomScreen (ピア)
  │
  └─ [online_room] 共通
          │  ホスト: 全員 READY 確認後 → emit("start_game")
          │  ピア:  READY ボタンを押して待機
          ↓ game_started / sync_state イベント
      [game]  ← GameScreen.jsx
          │  ゲーム終了
          ↓ handleGameEnd()
      [result]  ← ResultScreen.jsx
          │  「もう一度！」全員投票完了
          ↓ onBackToMenu("online_room")
      [online_room]  ← 再びロビーへ
```

### URL 自動参加

- ルームID が `onlineRoomId` に設定されると URL に `?room=XXXXXX` が付与される（`replaceState`）
- ページロード時に `?room=` があれば `online_join` 画面に自動遷移し `defaultRoomId` をセット
- `OnlineRoomScreen` の QR コードは `{origin}/join?code={roomId}` を生成

---

## 3. Firebase データ構造

```
rooms/
  {roomId}/
    meta/
      playerCount: number        # 最大人数 (2|3|4)
      mode: string               # "individual" | "pair"
      hostId: string             # ホストの selfId
      createdAt: number          # Unix ms
      started: boolean           # true になると game_started を全員にトリガー
    players/
      {selfId}/
        id: string               # Firebase key と同一 (selfId)
        name: string             # 表示名 (最大8文字)
        isHost: boolean
        connected: boolean       # onDisconnect で false に
        seatIndex: number        # 座席順 (0-origin)。ホスト=0、参加順に採番
        ready: boolean           # ピアが READY ボタンを押したか
        lastStamp/
          id: string             # スタンプID
          ts: number             # タイムスタンプ (ms)
    states/
      {selfId}/                  # 各プレイヤー向けにマスクされたゲーム状態
        ...GameState             # ホストが host_sync_state で書き込む
    actions/
      {pushKey}/                 # ピアが push するアクションキュー
        senderId: string
        action: string           # "attack" | "pairAttack" | "pass" | "stay" 等
        payload: object          # アクション固有データ
        timestamp: number
    rematchVotes/
      {selfId}: true             # リマッチ投票。全員揃ったらロビーに戻る
```

### onDisconnect 設定

| 対象 | 処理 |
|------|------|
| ホストが切断 | `rooms/{roomId}` ごと削除 |
| ピアが切断 | `rooms/{roomId}/players/{selfId}/connected` を `false` に更新 |

---

## 4. イベント一覧

### `emit` — クライアントが発行するイベント

| イベント名 | 発行者 | データ | 処理内容 |
|-----------|--------|--------|----------|
| `create_room` | ホスト | `{ name, playerCount, mode }` | RTDB にルーム作成。6文字ルームID を生成。`players/{selfId}` を seatIndex=0 で登録 |
| `join_room` | ピア | `{ name, roomId }` | `meta` 取得後、`players/{selfId}` を既存人数をもとに seatIndex を設定して登録 |
| `start_game` | ホスト | `{ roomId }` | `meta/started = true` を書き込み、全員に `game_started` をトリガー |
| `host_sync_state` | ホスト | `{ roomId, targetId, state }` | `states/{targetId}` にマスク済みゲーム状態を書き込む |
| `peer_action` | ピア | `{ roomId, action, payload }` | `actions/{pushKey}` にアクションを push |
| `send_stamp` | 全員 | `{ roomId, stampId }` | `players/{selfId}/lastStamp` を上書き |
| `toggle_ready` | ピア | `{ roomId, ready }` | `players/{selfId}/ready` を更新 |
| `swap_seats` | ホスト | `{ roomId, seatA_player_id, seatB_player_id }` | 2プレイヤーの `seatIndex` を入れ替える |
| `kick_player` | ホスト | `{ roomId, targetId }` | `players/{targetId}` を削除 |
| `rematch_vote` | 全員 | `{ roomId }` | `rematchVotes/{selfId} = true` を書き込む |
| `clear_rematch_votes` | ホスト | `{ roomId }` | `rematchVotes` ノードを削除 |
| `pair_change` | ホスト | `{ roomId }` | 全プレイヤーの `seatIndex` をランダムにシャッフル |

### `trigger` (on) — アダプターが内部発行するイベント

| イベント名 | 発行タイミング | データ |
|-----------|--------------|--------|
| `room_created` | `create_room` 成功後 | `{ roomId }` |
| `player_joined` | `players` ノード変化時 (onValue) | `{ players: Player[], roomId }` |
| `room_joined` | `join_room` で meta 取得後 | `{ roomId, config: { playerCount, mode, ... } }` |
| `error` | Firebase 操作失敗 / タイムアウト | `{ message: string }` |
| `room_closed` | ピア側で `players` ノードが消えた時 | `{ message: string }` |
| `game_started` | `meta/started === true` 検知時 | `{}` |
| `sync_state` | `states/{selfId}` 変化時 (ピアのみ) | `GameState` |
| `peer_action` | `actions` に子ノード追加時 (ホストのみ) | `{ senderId, action, payload, timestamp }` |
| `rematch_update` | `rematchVotes` ノード変化時 | `{ count: number }` |

---

## 5. 既知の問題点・設計と実装のズレ

### 5-1. ホストが `sync_state` を受け取らない

ホストは `states/{selfId}` のリスナーを登録しない（`join_room` フロー内にのみ存在）。
そのため、ホスト自身のゲーム状態は `setGameState` で直接管理される。
**ピアの状態は Firebase 経由、ホストの状態はローカル**という非対称性がある。

### 5-2. `game_started` イベントの二重処理

ホストは `meta/started` を書き込んだ後、自身でも `game_started` を受信して `setScreen("game")` が呼ばれる。
`handleOnlineHostStart` でも `handleStartGame` → `setScreen("game")` を実行するため、ゲーム画面への遷移が2回トリガーされる。現状は冪等なので問題ないが、将来的には重複を避けるべき。

### 5-3. `player_joined` のスタンプ監視なし

`OnlineRoomScreen` の `StampFloat` コンポーネントは `player.lastStamp` を表示するが、
`players` ノードへの `onValue` リスナーが全更新をポーリングするため、スタンプが Firebase に書き込まれると全員の `player_joined` が再発火する。
ロビー内は許容範囲だが、ゲーム中にスタンプを打つと余計な再レンダリングが起きる可能性がある。

### 5-4. リマッチ時の `peer_action` リスナー脱落リスク

`create_room` 時に `registerActionsListener` が呼ばれ、`start_game` でも再確認する実装になっている。
リマッチ（`online_room` → `game` の再遷移）では `start_game` を再度 emit するため、二重登録防止ガード (`actionsListenerRef`) が機能する前提。
ただし `disconnect()` を経由せずに再マッチが起きた場合、`actionsListenerRef` がリセットされず古いリスナーが残る可能性がある。

### 5-5. タイムアウト処理の不完全さ

`create_room` は 5 秒、`join_room` は 10 秒のタイムアウトを設定しているが、タイムアウト後に Firebase の非同期処理が完了した場合、`trigger` が二重に呼ばれる可能性がある。`clearTimeout` の成否に関わらず、タイムアウト後の `.then()` を無視するフラグが必要。

### 5-6. CPU プレイヤーの seatIndex 未設定

ホストが `handleOnlineHostStart` で CPU を追加する際、Firebase の `players` ノードには書き込まれない（ローカルの `initGame` でのみ管理）。
CPU の座席順は `finalNames` 配列の末尾挿入で決まるため、実質的に「人間の後ろに詰める」固定配置になる。

### 5-7. `onlinePlayers` の初期値

ホスト側では `handleCreateOnlineRoom` で `[{ id: "self", ... }]` を楽観的 UI として設定するが、その後 `player_joined` イベントで上書きされる。
この初期値 `id: "self"` が短時間だが存在するため、`myId` 比較時に不整合が起きる可能性がある（`OnlineRoomScreen` の kick/ready ボタン表示等）。
