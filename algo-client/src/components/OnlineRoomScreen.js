import React, { useState, useEffect } from "react";
import { ScreenWrapper, OutlinedButton } from "./UXComponents";
import { STAMPS } from "../lib/stamps";

function ConnDot({ connected }) {
  return (
    <span style={{
      width: 8, height: 8, borderRadius: "50%",
      background: connected ? "#28a028" : "#e03030",
      boxShadow: connected ? "0 0 0 2px rgba(40,160,40,.2)" : "none",
      flexShrink: 0, display: "inline-block", transition: "background .3s",
      marginLeft: 8
    }}/>
  );
}

// Inline Stamp Float for Lobby
function StampFloat({ stampData }) {
  const [activeStamp, setActiveStamp] = useState(null);

  useEffect(() => {
    if (stampData && stampData.ts) {
      const msSince = Date.now() - stampData.ts;
      if (msSince < 2500) {
        const stampDef = STAMPS.find(s => s.id === stampData.id);
        setActiveStamp({ key: stampData.ts, label: stampDef ? stampDef.label : "" });
        const timer = setTimeout(() => setActiveStamp(null), 2500 - msSince);
        return () => clearTimeout(timer);
      }
    }
  }, [stampData]);

  if (!activeStamp) return null;

  return (
    <div key={activeStamp.key} className="stamp-float" style={{ top: -38, zIndex: 10 }}>
      {activeStamp.label}
    </div>
  );
}

export function OnlineRoomScreen({ isHost, roomId, players, maxPlayers, onStart, onLeave, emit, myId }) {
  const [copiedType, setCopiedType] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (!showQr || !roomId) return;
    import("qrcode").then(QRCode => {
      QRCode.default.toDataURL(
        `${window.location.origin}/join?code=${roomId}`,
        { width: 240, margin: 1, color: { dark: "#111111", light: "#ffffff" } }
      ).then(setQrDataUrl);
    });
  }, [showQr, roomId]);

  const shareToLine = () => {
    const joinUrl = `${window.location.origin}/join?code=${roomId}`;
    const text = encodeURIComponent(`ALGOSIXで対戦しよう！\nルームコード: ${roomId}\n${joinUrl}`);
    window.open(`https://line.me/R/msg/text/?${text}`, "_blank", "noopener");
  };

  const copyUrl = async () => {
    const url = `${window.location.origin}/join?code=${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("input");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedType("url");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
    } catch {
       const el = document.createElement("input");
       el.value = roomId;
       document.body.appendChild(el);
       el.select();
       document.execCommand("copy");
       document.body.removeChild(el);
    }
    setCopiedType("code");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleKick = (p) => {
    if (!window.confirm(`${p.name} をキックしますか？`)) return;
    emit("kick_player", { roomId, targetId: p.id });
  };

  const connectedPlayers = players.filter(p => p.connected).length;

  return (
    <ScreenWrapper>
      <div style={{ 
        padding: "24px 20px", 
        textAlign: "center", 
        display: "flex", 
        flexDirection: "column", 
        height: "100%", 
        overflow: "hidden", 
        justifyContent: "space-between" 
      }}>
        {/* Top Section: LINE Invitation */}
        <div>
          <button 
            onClick={shareToLine}
            style={{
              width: "100%",
              background: "#06C755",
              color: "#fff",
              padding: "16px",
              borderRadius: "16px",
              fontSize: 18,
              fontWeight: 900,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 6px 16px rgba(6,199,85,0.25)",
              marginBottom: 16
            }}
          >
            LINEで友達を招待する
          </button>

          <div 
            onClick={copyCode}
            style={{ 
              background: "rgba(0,0,0,0.03)", 
              padding: "14px", 
              borderRadius: "16px", 
              cursor: "pointer",
              border: copiedType === 'code' ? "1.5px solid var(--black)" : "1.5px solid transparent",
              transition: "all 0.2s"
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--gray3)", letterSpacing: "0.1em", marginBottom: 2 }}>
              {copiedType === 'code' ? "COPIED!" : "ROOM ID (TAP TO COPY)"}
            </div>
            <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: 8, fontFamily: "'Inter', sans-serif" }}>
              {roomId}
            </div>
          </div>
        </div>

        {/* Middle Section: Players and QR Toggle */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20, margin: "20px 0", minHeight: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "var(--gray4)" }}>参加者 ({players.length}/{maxPlayers})</span>
            <button 
              onClick={() => setShowQr(!showQr)}
              style={{ background: "none", border: "none", color: "var(--gray3)", fontSize: 11, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
            >
              QRコードを表示
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", paddingRight: 4 }}>
            {players.map((p, index) => (
              <div key={p.id} style={{ 
                padding: "12px 16px", 
                borderRadius: "12px", 
                background: "var(--white)", 
                display: "flex", 
                alignItems: "center",
                border: "1.5px solid var(--gray1)"
              }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--black)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, marginRight: 12 }}>
                  {index + 1}
                </div>
                <span style={{ fontWeight: 800, fontSize: 15, flex: 1, textAlign: "left" }}>{p.name}</span>
                {p.isHost && <span style={{ fontSize: 9, background: "rgba(0,0,0,0.05)", padding: "2px 6px", borderRadius: 10, marginRight: 8, fontWeight: 800 }}>HOST</span>}
                {isHost && p.id !== myId && (
                  <button onClick={() => handleKick(p)} style={{ background: "none", border: "none", padding: 4, cursor: "pointer", fontSize: 14 }}>✕</button>
                )}
                <ConnDot connected={p.connected} />
              </div>
            ))}
            {Array.from({ length: maxPlayers - players.length }).map((_, i) => (
              <div key={`empty-${i}`} style={{ padding: "12px 16px", borderRadius: "12px", border: "1.5px dashed var(--gray2)", color: "var(--gray3)", fontSize: 12, fontWeight: 600 }}>
                待機中...
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section: Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {isHost ? (
            <button 
              onClick={onStart}
              disabled={connectedPlayers < 2}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "30px",
                background: connectedPlayers >= 2 ? "var(--black)" : "var(--gray2)",
                color: "#fff",
                fontSize: 16,
                fontWeight: 900,
                border: "none",
                cursor: connectedPlayers >= 2 ? "pointer" : "not-allowed"
              }}
            >
              ゲームを開始する
            </button>
          ) : (
            <div style={{ fontSize: 12, color: "var(--gray4)", fontWeight: 700 }}>ホストの開始を待っています...</div>
          )}
          
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <button 
              onClick={copyUrl} 
              style={{ background: "none", border: "none", color: "var(--gray4)", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
            >
              URLをコピー
            </button>
            <button 
              onClick={onLeave} 
              style={{ background: "none", border: "none", color: "var(--red)", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: 0.7 }}
            >
              退出する
            </button>
          </div>
        </div>

        {/* QR Overlay */}
        {showQr && qrDataUrl && (
          <div 
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
            onClick={() => setShowQr(false)}
          >
            <div style={{ background: "#fff", padding: 24, borderRadius: 24, textAlign: "center" }} onClick={e => e.stopPropagation()}>
              <img src={qrDataUrl} style={{ width: 240, height: 240, display: "block", marginBottom: 16 }} alt="QR" />
              <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 8 }}>友達を招待</div>
              <OutlinedButton onClick={() => setShowQr(false)}>閉じる</OutlinedButton>
            </div>
          </div>
        )}
      </div>
    </ScreenWrapper>
    );
}

const ConnDot = ({ connected }) => (
  <div style={{ 
    width: 8, height: 8, borderRadius: "50%", 
    background: connected === false ? "var(--red)" : connected === true ? "var(--green)" : "var(--gray3)",
    marginLeft: 8,
    boxShadow: connected ? "0 0 8px currentColor" : "none"
  }} />
);
