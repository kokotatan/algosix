# ALGO Webアプリ — Claude Code 引き継ぎプロンプト

---

## プロジェクト概要

論理カードゲーム「アルゴ」のWebアプリ。スマホでの使用を前提とした
モバイルファーストのReact（Next.js）アプリ。

---

## ゲームルール

- **カード**: 黒0〜11・白0〜11の計24枚
- **手札の並び**: 昇順に左から。同じ数字は黒が左・白が右
- **ターンの流れ**:
  1. 山札からカードを1枚引く（自分だけ見える）
  2. 相手の伏せカードを指定し、数字を宣言（アタック）
  3. **正解** → カードをオープン。「再アタック」か「ステイ」を選択
     - 再アタック: そのまま別のカードにアタック継続
     - ステイ: 引いたカードを裏向きで手札に追加してターン終了
  4. **不正解** → 引いたカードを**表向きで**手札に追加してターン終了
- **勝利条件**: 相手プレイヤー全員の手札がすべてオープンになった瞬間勝利
- **初期手札枚数**: 2人→4枚、3人→3枚、4人→2枚（個人戦）

---

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router) + React 18
- **スタイリング**: CSS-in-JS（インラインのCSSテンプレートリテラル、Tailwind不使用）
- **バックエンド**: Node.js + Socket.io（Railway）← オンライン対戦用、Phase 2
- **デプロイ**: Vercel（フロント）+ Railway（バック）
- **言語**: JavaScript（TypeScript移行は後回し）

---

## 実装済み機能（引き継ぎ時点）

### Phase 1 完了（オフライン戦）
- [x] ゲームロジック全体（シャッフル・配布・ソート・判定・勝利）
- [x] メニュー画面（チュートリアル・オフライン戦・オンライン戦のカード型UI）
- [x] セットアップ画面（人数・名前入力）
- [x] パス渡し画面（スマホを回して使う）
- [x] ゲーム画面（プレイヤー円形配置・山札・アクションパネル・ログ）
- [x] 勝利画面
- [x] チュートリアル（4ステップ、約2分、インタラクティブ形式）
- [x] Socket.io サーバー（server.js）← オンライン用の土台

### Phase 2 以降（未実装）
- [ ] オンライン対戦（ルーム作成・参加）
- [ ] コンピュータ戦（CPU AI）
- [ ] ペア戦モード
- [ ] 6人拡張（カード増量）

---

## ディレクトリ構成（目標）

```
algo/
├── apps/
│   ├── client/                  # Next.js フロントエンド
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.js
│   │   │   │   ├── page.js
│   │   │   │   └── globals.css
│   │   │   ├── components/
│   │   │   │   ├── AlgoApp.js      # メインアプリ（画面ルーティング）
│   │   │   │   ├── GameUI.js       # Card / Seat / ActionPanel
│   │   │   │   └── Tutorial.jsx    # チュートリアル（4ステップ）
│   │   │   ├── hooks/
│   │   │   │   └── useSocket.js    # Socket.io シングルトンフック
│   │   │   └── lib/
│   │   │       └── gameLogic.js    # ゲームロジック（純粋関数）
│   │   ├── package.json
│   │   └── next.config.js
│   └── server/                  # Socket.io サーバー
│       ├── server.js
│       ├── package.json
│       └── railway.toml
└── README.md
```

---

## デザイン仕様

### カラーパレット（白黒ベース）
```
--bg:    #f5f5f5   背景
--white: #ffffff   カード白・パネル
--black: #111111   カード黒・ボタン・テキスト
--gray1: #e8e8e8
--gray2: #d0d0d0
--gray3: #a0a0a0   補助テキスト
--gray4: #606060
--red:   #e03030   不正解・エラー
--green: #28a028   正解
```

### フォント
- 本文・UI: `Noto Sans JP`
- 数字・コード: `Inter`

### カードデザイン
- 黒カード（表）: 黒背景・白数字
- 白カード（表）: 白背景・黒数字・グレーボーダー
- 黒カード（裏）: 暗い背景・斜線パターン・四角ピップ（白）
- 白カード（裏）: 白背景・斜線パターン・丸ピップ（黒）
- ※ 裏面でも黒か白かが視覚的に判別可能
- 自分の手札でオープン済みカードは `OPEN` バッジ＋ボーダー強調

### カードサイズ（人数別）
```
2人: xl (58×82px / 32px)  両プレイヤーとも
3人: lg (50×70px / 27px)  全プレイヤー
4人: md (44×62px / 24px)  全プレイヤー
```

### レイアウト（プレイヤー配置）
```
2人: 上下 (上:相手 / 下:自分)
3人: 三角形 (左上・右上:相手 / 下:自分)
4人: ダイヤ (上:相手1 / 左右:相手2,3縦並び / 下:自分)
```

### UX原則
- スクロールなし（`height: 100svh` で1画面完結）
- スマホタップ操作優先
- 画面遷移アニメーション: 最低550ms（`fadeUp`）
- ターン交代時: 必ずパス渡し画面を挟む

---

## ゲームロジック（重要な仕様）

### カード操作
```js
// 手札ソート: 数字昇順、同数字は黒が左
function sortHand(hand) {
  return [...hand].sort((a, b) =>
    a.number !== b.number ? a.number - b.number : a.color === "black" ? -1 : 1
  );
}

// 正解時: revealed: true を永続（ターン変わっても裏に戻らない）
// 不正解時: 引いたカードを revealed: true で手札に追加
// ステイ時: 引いたカードを revealed: false で手札に追加
```

### フェーズ遷移
```
draw → attack → continue → (再アタック) → attack
                         → (ステイ)     → draw（次のプレイヤーへ）
     → (不正解)          → draw（次のプレイヤーへ）
     → (全員オープン)    → gameover
```

### オンライン時のセキュリティ
- ゲーム状態はサーバーのみが管理
- 各クライアントには「自分の手札の数字のみ」送信
- 相手の非公開カードは `{ color, number: null, revealed: false }` で送信

---

## チュートリアル構成（4ステップ）

| ステップ | 内容 | 形式 |
|---|---|---|
| 1. カード | 黒白カードの紹介・並び順 | スライド説明（2枚） |
| 2. ターンの流れ | 引く→選ぶ→宣言 | 実操作 |
| 3. 正解・不正解 | 両ケースを1回ずつ体験 | 実操作×2 |
| 4. 実践ミニゲーム | ヒント付きでCPUと1ゲーム | フル操作 |

- 右上にスキップボタン
- ミニゲームはヒント常時表示（CPU手札: 黒3・白6・黒9固定）
- 完了後「ゲームを始める」でメニューへ

---

## 最初にやってほしいこと

1. **Next.js プロジェクトを新規作成**
   ```bash
   npx create-next-app@latest algo-client --js --app --no-tailwind --no-src-dir
   # src/ディレクトリは手動で作成
   ```

2. **ファイルを以下の場所に配置**（添付ファイルを参照）
   - `AlgoApp.js` → `src/components/AlgoApp.js`
   - `GameUI.js` → `src/components/GameUI.js`
   - `Tutorial.jsx` → `src/components/Tutorial.jsx`
   - `gameLogic.js` → `src/lib/gameLogic.js`
   - `useSocket.js` → `src/hooks/useSocket.js`
   - `layout.js` → `src/app/layout.js`
   - `page.js` → `src/app/page.js`

3. **動作確認**
   ```bash
   npm install
   npm run dev
   ```
   以下を確認：
   - メニュー画面が表示される
   - オフライン戦が2〜4人で動作する
   - チュートリアルが4ステップ完走できる
   - スクロールが発生しない（1画面完結）

4. **既知の課題・改善点を洗い出す**
   - カードサイズが全体的にまだ小さい可能性
   - 4人時の左右プレイヤー（縦並び）の視認性
   - パス渡し画面の遷移タイミング

---

## 添付ファイル一覧

- `algo_game.jsx` — 旧バージョンのシングルファイル（参考用、分割済み版が上記）
- `AlgoApp.js` — メインアプリコンポーネント
- `GameUI.js` — Card / Seat / ActionPanel / DeckStack
- `Tutorial.jsx` — チュートリアル（4ステップ）
- `gameLogic.js` — ゲームロジック純粋関数
- `useSocket.js` — Socket.io フック
- `layout.js` — Next.js App Router レイアウト
- `client_package.json` — クライアントの依存関係
- `algo_server.js` — Socket.io サーバー（Phase 2用）
- `server_package.json` — サーバーの依存関係
- `railway.toml` — Railway デプロイ設定
- `DEPLOY.md` — Vercel + Railway デプロイ手順

---

## 今後の実装優先順位

```
Phase 1（現在）  オフライン戦 ✅
Phase 2          オンライン対戦（Socket.io、ルーム作成・参加）
Phase 3          コンピュータ戦（CPU AI）
Phase 4          ペア戦モード・6人拡張
```

Phase 2の実装方針は `DEPLOY.md` および `algo_server.js` に記載済み。
サーバーのゲームロジックはクライアントと独立して管理（サーバー側が正）。
