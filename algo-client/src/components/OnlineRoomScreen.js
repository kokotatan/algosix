import React from "react";
import { ScreenWrapper, OutlinedButton } from "./UXComponents";

export function OnlineRoomScreen({ isHost, roomId, players, maxPlayers, onStart, onLeave }) {
  const isFull = players.length >= maxPlayers;

  return (
    <ScreenWrapper>
      <div style={{ padding: 24, textAlign: "center", display: "flex", flexDirection: "column", flex: 1 }}>
        <h2 style={{ fontSize: 24, margin: "0 0 8px", fontWeight: 800 }}>ルーム待機室</h2>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 4, fontFamily: "monospace", margin: "16px 0" }}>
          {roomId}
        </div>
        <p style={{ fontSize: 13, color: "#606060", marginBottom: 32 }}>
          このIDを友達に共有してください
        </p>

        <div style={{ flex: 1, maxWidth: 320, margin: "0 auto", width: "100%", textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
            参加プレイヤー ({players.length}/{maxPlayers})
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {players.map((p, i) => (
              <div key={i} style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(0,0,0,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>{p.name} {p.isHost && "(ホスト)"}</span>
                {/* 
                  TODO: CPU add logic if we want host to easily fill remaining spots with CPUs
                  {isHost && !p.isReal && <span style={{ fontSize: 11, color: "#606060" }}>CPU</span>}
                */}
              </div>
            ))}
            
            {Array.from({ length: maxPlayers - players.length }).map((_, i) => (
              <div key={`empty-${i}`} style={{ padding: "12px 16px", borderRadius: 8, border: "2px dashed #d0d0d0", color: "#a0a0a0", display: "flex", justifyContent: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>空き</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 320, margin: "0 auto", width: "100%", paddingBottom: 24 }}>
          {isHost ? (
            <OutlinedButton
              onClick={onStart}
              selected={true}
              disabled={players.length < 2 /* or block until full based on logic */}
            >
              ゲームを開始する
            </OutlinedButton>
          ) : (
            <div style={{ fontSize: 13, color: "#606060", marginBottom: 12, fontWeight: 600 }}>
              ホストが開始するのを待っています...
            </div>
          )}
          <OutlinedButton onClick={onLeave}>退出する</OutlinedButton>
        </div>
      </div>
    </ScreenWrapper>
  );
}
