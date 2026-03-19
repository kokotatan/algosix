import React, { useState } from "react";
import { GeometricBG, ScreenWrapper, OutlinedButton, InputField } from "./UXComponents";

export function OnlineJoinScreen({ onJoin, onBack, defaultRoomId }) {
  const [name, setName] = useState("Player");
  const [roomId, setRoomId] = useState(defaultRoomId || "");

  React.useEffect(() => {
    if (defaultRoomId) setRoomId(defaultRoomId);
  }, [defaultRoomId]);

  const handleJoin = () => {
    if (name.trim() && roomId.trim().length === 6) {
      onJoin({ name: name.trim(), roomId: roomId.trim().toUpperCase() });
    }
  };

  return (
    <ScreenWrapper>
      <div style={{ padding: 24, textAlign: "center", display: "flex", flexDirection: "column", flex: 1 }}>
        <h2 style={{ fontSize: 24, margin: "0 0 16px", fontWeight: 800 }}>オンライン対戦（参加）</h2>
        <p style={{ fontSize: 13, color: "#606060", marginBottom: 32 }}>
          ルームIDを入力してゲームに参加します
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 320, margin: "0 auto", width: "100%" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, textAlign: "left", marginBottom: 8 }}>プレイヤー名</div>
            <InputField value={name} onChange={(e) => setName(e.target.value)} maxLength={8} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, textAlign: "left", marginBottom: 8 }}>ルームID (6桁)</div>
            <InputField value={roomId} onChange={(e) => setRoomId(e.target.value.toUpperCase())} maxLength={6} placeholder="例: A1B2C3" />
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 12, maxWidth: 320, margin: "0 auto", width: "100%", paddingBottom: 24 }}>
          <OutlinedButton
            onClick={handleJoin}
            disabled={!name.trim() || roomId.trim().length !== 6}
            selected={name.trim() && roomId.trim().length === 6}
          >
            ルームに参加
          </OutlinedButton>
          <OutlinedButton onClick={onBack}>戻る</OutlinedButton>
        </div>
      </div>
    </ScreenWrapper>
  );
}

export function OnlineSetupScreen({ onCreate, onBack }) {
  const [name, setName] = useState("Host");
  const [playerCount, setPlayerCount] = useState(4);
  const [mode, setMode] = useState("individual");

  const handleCountChange = (count) => {
    setPlayerCount(count);
    if (!(count % 2 === 0 && count >= 4)) {
      setMode("individual");
    }
  };

  const handleCreate = () => {
    if (name.trim()) {
      onCreate({ name: name.trim(), playerCount, mode });
    }
  };

  return (
    <ScreenWrapper>
      <div style={{ padding: 24, textAlign: "center", display: "flex", flexDirection: "column", flex: 1 }}>
        <h2 style={{ fontSize: 24, margin: "0 0 16px", fontWeight: 800 }}>オンライン対戦（作成）</h2>
        <p style={{ fontSize: 13, color: "#606060", marginBottom: 24 }}>
          対戦ルールを決めてルームを作成します
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 320, margin: "0 auto", width: "100%", textAlign: "left" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>ホストプレイヤー名</div>
            <InputField value={name} onChange={(e) => setName(e.target.value)} maxLength={8} />
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>プレイ人数</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[2, 3, 4].map(num => (
                <OutlinedButton
                  key={num}
                  onClick={() => handleCountChange(num)}
                  selected={playerCount === num}
                  style={{ flex: 1, padding: "12px 0" }}
                >
                  {num}人
                </OutlinedButton>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>対戦モード</div>
            <div style={{ display: "flex", gap: 8 }}>
              <OutlinedButton
                onClick={() => setMode("individual")}
                selected={mode === "individual"}
                style={{ flex: 1, padding: "12px 0" }}
              >
                個人戦
              </OutlinedButton>
              <OutlinedButton
                onClick={() => setMode("pair")}
                selected={mode === "pair"}
                disabled={playerCount !== 4}
                style={{ flex: 1, padding: "12px 0" }}
              >
                ペア戦 (2vs2)
              </OutlinedButton>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 12, maxWidth: 320, margin: "0 auto", width: "100%", paddingBottom: 24 }}>
          <OutlinedButton onClick={handleCreate} selected={true} disabled={!name.trim()}>
            ルームを作成
          </OutlinedButton>
          <OutlinedButton onClick={onBack}>戻る</OutlinedButton>
        </div>
      </div>
    </ScreenWrapper>
  );
}
