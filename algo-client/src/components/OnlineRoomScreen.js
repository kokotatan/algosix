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
  const [stampCooldown, setStampCooldown] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (!showQr || !roomId) return;
    import("qrcode").then(QRCode => {
      QRCode.default.toDataURL(
        `${window.location.origin}/join?code=${roomId}`,
        { width: 200, margin: 1, color: { dark: "#111111", light: "#ffffff" } }
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

  const sendStamp = (stampId) => {
    if (stampCooldown) return;
    emit("send_stamp", { roomId, stampId });
    setStampCooldown(true);
    setTimeout(() => setStampCooldown(false), 3000);
  };

  const handleKick = (p) => {
    if (!window.confirm(`${p.name} をキックしますか？`)) return;
    emit("kick_player", { roomId, targetId: p.id });
  };

  const isFull = players.length >= maxPlayers;
  const connectedPlayers = players.filter(p => p.connected).length;

  return (
    <ScreenWrapper>
      <div style={{ padding: 24, paddingBottom: 0, textAlign: "center", display: "flex", flexDirection: "column", flex: 1, overflowY: "auto" }}>
        <h2 style={{ fontSize: 24, margin: "0 0 8px", fontWeight: 800 }}>ルーム待機室</h2>
        {/* Room ID Section */}
        <div style={{ 
          background: "rgba(0,0,0,0.03)", 
          padding: "20px", 
          borderRadius: "16px", 
          margin: "12px 0 24px",
          border: "1px solid rgba(0,0,0,0.05)"
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gray3)", letterSpacing: "0.1em", marginBottom: 4 }}>ROOM ID</div>
          <div style={{ 
            fontSize: 32, 
            fontWeight: 900, 
            letterSpacing: 6, 
            fontFamily: "'Inter', sans-serif", 
            color: "var(--black)",
            textShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}>
            {roomId}
          </div>
        </div>

        {/* Share Tools */}
        <div style={{ maxWidth: 360, margin: "0 auto 32px", width: "100%" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--gray4)", marginBottom: 10, textAlign: "left", letterSpacing: "0.02em" }}>友達を招待</div>
          <div className="share-row">
            <button className="share-btn share-line" onClick={shareToLine}>
              LINEで送る
            </button>
            <button className={`share-btn ${copiedType === 'url' ? 'copied' : ''}`} onClick={copyUrl}>
              {copiedType === 'url' ? 'コピー完了' : 'URLをコピー'}
            </button>
            <button className={`share-btn ${copiedType === 'code' ? 'copied' : ''}`} onClick={copyCode}>
              {copiedType === 'code' ? 'コピー完了' : 'コードをコピー'}
            </button>
            <button className="share-btn share-qr" onClick={() => setShowQr(!showQr)}>
              QRコードを表示 {showQr ? "▲" : "▼"}
            </button>
          </div>
          {showQr && qrDataUrl && (
            <div style={{ textAlign:"center", padding:"20px 0", animation:"logSlideUp .3s cubic-bezier(0.22, 1, 0.36, 1) both", background: "var(--white)", borderRadius: 12, marginTop: 12, border: "1px solid var(--gray1)" }}>
              <img src={qrDataUrl} alt="QR" style={{ width:180, height:180, borderRadius:8, display:"block", margin:"0 auto", border: "4px solid white", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}/>
              <p style={{ fontSize:12, color:"var(--gray3)", marginTop:10, fontWeight: 600 }}>カメラで読み取って参加</p>
            </div>
          )}
        </div>

        {/* Players List */}
        <div style={{ flex: 1, maxWidth: 320, margin: "0 auto", width: "100%", textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
            参加者 ({players.length}/{maxPlayers})
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {players.map((p, index) => (
              <div key={p.id} className="slot-item filled" style={{ 
                position: "relative", 
                padding: "14px 18px", 
                borderRadius: "12px", 
                background: "var(--white)", 
                display: "flex", 
                alignItems: "center",
                border: "1.5px solid var(--gray1)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
              }}>
                <div style={{ 
                  width: 28, height: 28, borderRadius: "50%", 
                  background: "var(--black)", color: "var(--white)", 
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 900, marginRight: 12
                }}>
                  {(p.seatIndex ?? index) + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 16, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {p.name}
                  </span>
                  {p.isHost && (
                    <span style={{ 
                      fontSize: 10, 
                      background: "rgba(17,17,17,0.08)", 
                      color: "var(--black)", 
                      padding: "2px 8px", 
                      borderRadius: "12px", 
                      fontWeight: 800,
                      letterSpacing: "0.05em",
                      border: "1px solid rgba(0,0,0,0.1)"
                    }}>HOST</span>
                  )}
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {isHost && index > 0 && (
                    <button className="swap-btn-new" 
                      style={{ background: "none", border: "1px solid var(--gray2)", borderRadius: "6px", width: 28, height: 28, cursor: "pointer", fontSize: 14 }}
                      onClick={() => emit("swap_seats", { roomId, seatA_player_id: players[index-1].id, seatB_player_id: p.id })}
                    >
                      ↑
                    </button>
                  )}
                  {isHost && p.id !== myId && (
                    <button className="kick-btn-new" 
                      style={{ background: "none", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "6px", width: 28, height: 28, cursor: "pointer", fontSize: 12 }}
                      onClick={() => handleKick(p)}
                    >
                      ✕
                    </button>
                  )}
                  <ConnDot connected={p.connected} />
                </div>
              </div>
            ))}
            
            {Array.from({ length: maxPlayers - players.length }).map((_, i) => (
              <div key={`empty-${i}`} style={{ padding: "12px 16px", borderRadius: 8, border: "2px dashed #d0d0d0", color: "#a0a0a0", display: "flex", justifyContent: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>空き待機中...</span>
              </div>
            ))}
          </div>
        </div>

        {/* Start/Leave Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 320, margin: "24px auto 16px", width: "100%" }}>
          {isHost ? (
            <OutlinedButton
              onClick={onStart}
              selected={true}
              disabled={connectedPlayers < 2}
            >
              ゲームを開始する
            </OutlinedButton>
          ) : (
            <div style={{ fontSize: 13, color: "#606060", marginBottom: 4, fontWeight: 600 }}>
              ホストの開始を待っています...
            </div>
          )}
        <OutlinedButton onClick={onLeave}>退出する</OutlinedButton>
      </div>
    </div>
  </ScreenWrapper>
  );
}
