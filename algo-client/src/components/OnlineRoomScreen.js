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
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 4, fontFamily: "monospace", margin: "16px 0" }}>
          {roomId}
        </div>

        {/* Share Tools */}
        <div style={{ maxWidth: 320, margin: "0 auto 24px", width: "100%" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, textAlign: "left" }}>友達を招待</div>
          <div className="share-row">
            <button className="share-btn share-line" onClick={shareToLine}>
              LINEで送る
            </button>
            <button className={`share-btn share-url ${copiedType === 'url' ? 'copied' : ''}`} onClick={copyUrl}>
              {copiedType === 'url' ? 'コピーしました' : 'URLをコピー'}
            </button>
            <button className={`share-btn share-code ${copiedType === 'code' ? 'copied' : ''}`} onClick={copyCode}>
              {copiedType === 'code' ? 'コピーしました' : 'コードをコピー'}
            </button>
            <button className="share-btn share-qr" onClick={() => setShowQr(!showQr)}>
              QRコード {showQr ? "▲" : "▼"}
            </button>
          </div>
          {showQr && qrDataUrl && (
            <div style={{ textAlign:"center", padding:"14px 0", animation:"logSlideUp .28s ease both" }}>
              <img src={qrDataUrl} alt="QR" style={{ width:180, height:180, borderRadius:8, display:"block", margin:"0 auto" }}/>
              <p style={{ fontSize:11, color:"var(--gray3)", marginTop:8 }}>カメラで読み取ってもらおう</p>
            </div>
          )}
        </div>

        {/* Players List */}
        <div style={{ flex: 1, maxWidth: 320, margin: "0 auto", width: "100%", textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
            参加者 ({players.length}/{maxPlayers})
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {players.map((p, index) => (
              <div key={p.id} className="slot-item filled" style={{ position: "relative", padding: "12px 16px", borderRadius: 8, background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center" }}>
                <StampFloat stampData={p.lastStamp} />
                <span style={{ fontWeight: 600, width: 24 }}>{p.seatIndex + 1}</span>
                <span style={{ fontWeight: 600, flex: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {p.name}
                </span>
                {p.isHost && <span style={{ fontSize: 10, background: "var(--black)", color: "#fff", padding: "2px 6px", borderRadius: 4, marginRight: 8, fontWeight: 700 }}>HOST</span>}
                
                {isHost && index > 0 && (
                  <button className="swap-btn" onClick={() => emit("swap_seats", { roomId, seatA_player_id: players[index-1].id, seatB_player_id: p.id })}>
                    ↑
                  </button>
                )}
                {isHost && p.id !== myId && (
                  <button className="kick-btn" onClick={() => handleKick(p)}>✕</button>
                )}
                <ConnDot connected={p.connected} />
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

      {/* Lobby Stamp Bar */}
      <div className="stamp-bar" style={{ background: "var(--white)", width: "100%" }}>
        {STAMPS.map(s => (
          <button key={s.id} disabled={stampCooldown} onClick={() => sendStamp(s.id)} className={`stamp-btn${stampCooldown ? " cooling" : ""}`}>
            {s.label}
          </button>
        ))}
      </div>
    </ScreenWrapper>
  );
}
