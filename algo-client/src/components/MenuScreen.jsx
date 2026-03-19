import React from "react";
import { ScreenWrapper, OutlinedButton } from "./UXComponents";

/* ─── Design Tokens ─── */
const C = {
  bg: "#ffffff",
  white: "#ffffff",
  black: "#111111",
  gray1: "#f0f0f0",
  gray2: "#d0d0d0",
  gray3: "#a0a0a0",
  gray4: "#606060",
  red: "#e03030",
  green: "#28a028",
  border: "#222222",
};

/* ─── Menu Screen ─── */
export default function MenuScreen({ onNavigate }) {
  return (
    <ScreenWrapper>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 24,
          padding: 32,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "var(--gray3)", letterSpacing: "0.2em", marginBottom: 4 }}>WELCOME TO</div>
          <h1
            style={{
              fontSize: 64,
              fontWeight: 900,
              fontFamily: "'Inter', sans-serif",
              color: "var(--black)",
              letterSpacing: -4,
              margin: 0,
              lineHeight: 0.9,
            }}
          >
            ALGOSIX
          </h1>
          <p
            style={{
              fontSize: 12,
              color: "var(--gray4)",
              fontWeight: 700,
              margin: "12px 0 0",
              letterSpacing: 6,
              opacity: 0.8
            }}
          >
            論理カードゲーム
          </p>
        </div>

        {/* Menu Buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            width: "100%",
            maxWidth: 320,
          }}
        >
          <OutlinedButton
            onClick={() => onNavigate("tutorial")}
            style={{ height: 60, fontSize: 16, borderRadius: "30px" }}
          >
            初めての方はこちら
          </OutlinedButton>

          <OutlinedButton
            onClick={() => onNavigate("setup")}
            style={{ padding: "18px 24px", fontSize: 18 }}
          >
            オフライン戦
          </OutlinedButton>

          <div style={{ display: "flex", gap: 12 }}>
            <OutlinedButton
              onClick={() => onNavigate("online_setup")}
              style={{ flex: 1, padding: "14px 12px", fontSize: 13 }}
            >
              オンライン戦
              <br />
              <span style={{ fontSize: 10, fontWeight: 400 }}>（作成）</span>
            </OutlinedButton>
            <OutlinedButton
              onClick={() => onNavigate("online_join")}
              style={{ flex: 1, padding: "14px 12px", fontSize: 13 }}
            >
              オンライン戦
              <br />
              <span style={{ fontSize: 10, fontWeight: 400 }}>（参加）</span>
            </OutlinedButton>
            <OutlinedButton
              onClick={() => onNavigate("setup_cpu")}
              style={{ flex: 1, padding: "14px 12px", fontSize: 13 }}
            >
              コンピュータ戦
            </OutlinedButton>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 16,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: C.gray3,
              fontFamily: "'Inter', sans-serif",
              letterSpacing: 1,
            }}
          >
            Produced by ALGOSIX
          </span>
        </div>
      </div>
    </ScreenWrapper>
  );
}
