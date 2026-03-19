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
      <div style={{ padding: "32px 24px", textAlign: "center", display: "flex", flexDirection: "column", flex: 1, overflowY: "auto" }}>
        <h2 style={{ fontSize: 24, margin: "0 0 12px", fontWeight: 800, letterSpacing: "-0.01em" }}>ルームに参加する</h2>
        <p style={{ fontSize: 13, color: "var(--gray4)", marginBottom: 32, fontWeight: 500 }}>
          招待されたルームIDを入力してください
        </p>

        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: 24, 
          maxWidth: 360, 
          margin: "0 auto 32px", 
          width: "100%",
          background: "var(--white)",
          padding: "24px",
          borderRadius: "16px",
          border: "1.5px solid var(--gray1)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
          textAlign: "left"
        }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 800, color: "var(--gray3)", display: "block", marginBottom: 8, letterSpacing: "0.05em" }}>PLAYER NAME</label>
            <InputField value={name} onChange={(e) => setName(e.target.value)} maxLength={8} placeholder="名前を入力" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 800, color: "var(--gray3)", display: "block", marginBottom: 8, letterSpacing: "0.05em" }}>ROOM ID (6 DIGITS)</label>
            <InputField 
              value={roomId} 
              onChange={(e) => setRoomId(e.target.value.toUpperCase())} 
              maxLength={6} 
              placeholder="A1B2C3" 
              style={{ letterSpacing: 4, fontWeight: 700, textAlign: "center", fontSize: 18 }}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 360, margin: "0 auto", width: "100%", paddingBottom: 24 }}>
          <OutlinedButton
            onClick={handleJoin}
            disabled={!name.trim() || roomId.trim().length !== 6}
            selected={name.trim() && roomId.trim().length === 6}
            style={{ height: 54, fontSize: 16 }}
          >
            参加する
          </OutlinedButton>
          <OutlinedButton onClick={onBack} style={{ border: "none", color: "var(--gray3)" }}>キャンセル</OutlinedButton>
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
      <div style={{ padding: "32px 24px", textAlign: "center", display: "flex", flexDirection: "column", flex: 1, overflowY: "auto" }}>
        <h2 style={{ fontSize: 24, margin: "0 0 12px", fontWeight: 800, letterSpacing: "-0.01em" }}>ルームを作成する</h2>
        <p style={{ fontSize: 13, color: "var(--gray4)", marginBottom: 32, fontWeight: 500 }}>
          対戦人数とモードを設定してください
        </p>

        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: 28, 
          maxWidth: 360, 
          margin: "0 auto 32px", 
          width: "100%",
          background: "var(--white)",
          padding: "24px",
          borderRadius: "16px",
          border: "1.5px solid var(--gray1)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
          textAlign: "left"
        }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 800, color: "var(--gray3)", display: "block", marginBottom: 8, letterSpacing: "0.05em" }}>YOUR NAME</label>
            <InputField value={name} onChange={(e) => setName(e.target.value)} maxLength={8} placeholder="名前を入力" />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 800, color: "var(--gray3)", display: "block", marginBottom: 8, letterSpacing: "0.05em" }}>PLAYER COUNT</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[2, 3, 4].map(num => (
                <button
                  key={num}
                  onClick={() => handleCountChange(num)}
                  style={{ 
                    flex: 1, 
                    padding: "12px 0",
                    background: playerCount === num ? "var(--black)" : "rgba(0,0,0,0.03)",
                    color: playerCount === num ? "var(--white)" : "var(--black)",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {num}人
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 800, color: "var(--gray3)", display: "block", marginBottom: 8, letterSpacing: "0.05em" }}>GAME MODE</label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setMode("individual")}
                style={{ 
                  flex: 1, 
                  padding: "12px 0",
                  background: mode === "individual" ? "var(--black)" : "rgba(0,0,0,0.03)",
                  color: mode === "individual" ? "var(--white)" : "var(--black)",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                個人戦
              </button>
              <button
                onClick={() => setMode("pair")}
                disabled={playerCount !== 4}
                style={{ 
                  flex: 1, 
                  padding: "12px 0",
                  background: mode === "pair" ? "var(--black)" : "rgba(0,0,0,0.03)",
                  color: mode === "pair" ? "var(--white)" : "var(--black)",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: playerCount === 4 ? "pointer" : "not-allowed",
                  opacity: playerCount === 4 ? 1 : 0.4,
                  transition: "all 0.2s"
                }}
              >
                ペア戦 (2:2)
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--gray3)", fontWeight: 600 }}>
              {mode === "pair" ? "※ 相方と協力して相手チームを全滅させます" : "※ 全員が敵となり、最後の一人を目指します"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 360, margin: "0 auto", width: "100%", paddingBottom: 24 }}>
          <OutlinedButton 
            onClick={handleCreate} 
            selected={true} 
            disabled={!name.trim()}
            style={{ height: 54, fontSize: 16 }}
          >
            ルームを作成する
          </OutlinedButton>
          <OutlinedButton onClick={onBack} style={{ border: "none", color: "var(--gray3)" }}>キャンセル</OutlinedButton>
        </div>
      </div>
    </ScreenWrapper>
  );
}
