"use client";
import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  GameBoard,
  ActionPanel,
  GameLog,
  Card,
} from "./GameUI";
import Tutorial from "./Tutorial";
import { useFirebaseMultiplayer } from "../hooks/useFirebaseMultiplayer";
import { OnlineSetupScreen, OnlineJoinScreen } from "./OnlineLobbyScreen";
import { OnlineRoomScreen } from "./OnlineRoomScreen";
import GameScreen from "./GameScreen";
import ResultScreen from "./ResultScreen";
import SetupScreen from "./SetupScreen";
import MenuScreen from "./MenuScreen";
import {
  initGame,
} from "../lib/gameLogic";

import { GeometricBG, ScreenWrapper, OutlinedButton } from "./UXComponents";

/* ─── Main AlgoApp ─── */
export default function AlgoApp() {
  const [screen, setScreen] = useState("menu");
  const [isCpuSetup, setIsCpuSetup] = useState(false);
  const [playerNames, setPlayerNames] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [winner, setWinner] = useState(null);
  const [cpuSettings, setCpuSettings] = useState(null);
  const [pendingCode, setPendingCode] = useState("");

  // Online Multiplayer State (Firebase Adaptive Hook)
  const { connected, socket, selfId, connect, disconnect, emit, on, off } = useFirebaseMultiplayer();
  const [onlineRoomId, setOnlineRoomId] = useState(null);

  // Sync room ID with URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (onlineRoomId) {
        url.searchParams.set("room", onlineRoomId);
      } else {
        url.searchParams.delete("room");
      }
      window.history.replaceState({}, "", url.toString());
    }
  }, [onlineRoomId]);

  // Handle auto-join from URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const roomFromUrl = url.searchParams.get("room");
      if (roomFromUrl && !onlineRoomId && screen === "menu") {
        setPendingCode(roomFromUrl);
        setScreen("online_join");
      }
    }
  }, [onlineRoomId, screen]);
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [onlineConfig, setOnlineConfig] = useState(null); // { playerCount, mode }

  // Automatically handle socket connection for room creation/joining
  useEffect(() => {
    const code = sessionStorage.getItem("pendingRoomCode");
    if (code) {
      sessionStorage.removeItem("pendingRoomCode");
      setPendingCode(code);
      setScreen("online_join");
    }
  }, []);

  const handleCreateOnlineRoom = useCallback((config) => {
    connect();
    setIsHost(true);
    setOnlineConfig({ playerCount: config.playerCount, mode: config.mode });
    setOnlinePlayers([{ id: "self", name: config.name, isHost: true }]); // Optimistic UI
    
    // Slight delay to ensure connection is ready before emitting
    setTimeout(() => {
      emit("create_room", { name: config.name, playerCount: config.playerCount, mode: config.mode });
    }, 500);
  }, [connect, emit]);

  const handleJoinOnlineRoom = useCallback((data) => {
    connect();
    setIsHost(false);
    setOnlineRoomId(data.roomId);
    
    setTimeout(() => {
      emit("join_room", { roomId: data.roomId, name: data.name });
    }, 500);
  }, [connect, emit]);

  const handleLeaveOnlineRoom = useCallback(() => {
    disconnect();
    setOnlineRoomId(null);
    setOnlinePlayers([]);
    setIsHost(false);
    setScreen("menu");
  }, [disconnect]);

  const handleStartGame = useCallback((names, mode, cpuOpts) => {
    // Both Local and Online entry point? If online, names comes from onlinePlayers
    setPlayerNames(names);
    if (cpuOpts) {
      setCpuSettings(cpuOpts);
      setGameState(initGame(names, mode, cpuOpts.cpuConfig));
    } else {
      setCpuSettings(null);
      setGameState(initGame(names, mode));
    }
    setScreen("game");
  }, []);

  const handleOnlineHostStart = useCallback(() => {
    if (!isHost) return;

    // seatIndex 順に並び替えてゲームのプレイヤー順を座席順と一致させる
    const sortedPlayers = [...onlinePlayers].sort((a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0));
    const names = sortedPlayers.map(p => ({
      id: p.id,
      name: p.name,
    }));

    let finalNames = [...names];
    let cpuOpts = undefined;

    if (finalNames.length < onlineConfig.playerCount) {
      const cpuCount = onlineConfig.playerCount - finalNames.length;
      const cpuConfig = {};
      for (let i = 0; i < cpuCount; i++) {
        const idx = finalNames.length;
        finalNames.push({ id: `cpu_${i}`, name: `CPU ${i + 1}` });
        cpuConfig[idx] = true;
      }
      cpuOpts = { level: "normal", cpuConfig };
    }

    emit("start_game", { roomId: onlineRoomId });
    handleStartGame(finalNames, onlineConfig.mode, cpuOpts);
  }, [isHost, onlinePlayers, onlineConfig, handleStartGame, emit, onlineRoomId]);

  const handleGameEnd = useCallback((finalState) => {
    setGameState(finalState);
    setScreen("result");
  }, []);

  const handleBackToMenu = useCallback((targetScreen = "menu") => {
    if (typeof targetScreen !== "string") targetScreen = "menu"; 
    
    setScreen(targetScreen);
    setGameState(null);
    setWinner(null);
    setPlayerNames([]);
  }, []);

  useEffect(() => {
    on("room_created", (data) => {
      setOnlineRoomId(data.roomId);
      setScreen("online_room");
    });

    on("player_joined", (data) => {
      setOnlinePlayers(data.players);
      // If we joined successfully and we aren't already in the room screen (as a peer)
      if (screen === "online_join") {
        setScreen("online_room");
      }
    });

    on("room_joined", (data) => {
      setOnlineConfig(data.config);
      setOnlineRoomId(data.roomId);
      setIsHost(false);
      setScreen("online_room");
    });

    on("error", (error) => {
      let msg = error.message;
      if (msg && msg.includes("失敗しました")) {
        msg = "【Firebase接続エラー】\n通信タイムアウト: Firebaseとの接続に失敗しました。\n\n" +
              "ローカル開発の場合: .env.local の NEXT_PUBLIC_FIREBASE_DATABASE_URL を確認してください。\n" +
              "公開サーバーの場合: Vercelなどの環境変数設定に NEXT_PUBLIC_FIREBASE_DATABASE_URL が追加され、再デプロイされているか確認してください。";
      }
      alert(msg);
    });

    on("room_closed", (data) => {
      alert(data.message);
      setScreen("menu");
      setOnlineRoomId(null);
      setOnlinePlayers([]);
      setIsHost(false);
      disconnect();
    });

    on("player_left", (data) => {
      setOnlinePlayers(data.players);
    });

    on("game_started", () => {
      setScreen("game");
    });

    on("sync_state", (newState) => {
      setGameState(newState);
      if (newState.phase !== "gameover" && screen !== "game") {
        setScreen("game");
      }
      if (newState.phase === "gameover") {
         setTimeout(() => handleGameEnd(newState), 800);
      }
    });

    return () => {
      off("room_created");
      off("player_joined");
      off("room_joined");
      off("error");
      off("room_closed");
      off("player_left");
      off("game_started");
      off("sync_state");
    };
  }, [on, off, screen, disconnect, handleGameEnd]);



  return (
    <>
      {(() => {
        switch (screen) {
          case "menu":
            return <MenuScreen onNavigate={(target) => {
              if (target === "setup_cpu") {
                setIsCpuSetup(true);
                setScreen("setup");
              } else if (target === "setup") {
                setIsCpuSetup(false);
                setScreen("setup");
              } else {
                setScreen(target);
              }
            }} />;
          case "tutorial":
            return <Tutorial onComplete={handleBackToMenu} />;
          case "setup":
            return (
              <SetupScreen isCpuMode={isCpuSetup} onStart={handleStartGame} onBack={handleBackToMenu} />
            );
          case "online_setup":
            return <OnlineSetupScreen onCreate={handleCreateOnlineRoom} onBack={handleBackToMenu} />;
          case "online_join":
            return <OnlineJoinScreen onJoin={handleJoinOnlineRoom} onBack={handleBackToMenu} defaultRoomId={pendingCode} />;
          case "online_room":
            return (
              <OnlineRoomScreen 
                isHost={isHost} 
                roomId={onlineRoomId} 
                players={onlinePlayers} 
                maxPlayers={onlineConfig?.playerCount || 4}
                mode={onlineConfig?.mode || "individual"}
                onStart={handleOnlineHostStart}
                onLeave={handleLeaveOnlineRoom}
                emit={emit}
                myId={selfId}
              />
            );
          case "game":
            return (
              <GameScreen
                gameState={gameState}
                onGameStateChange={setGameState}
                onGameEnd={handleGameEnd}
                onHome={handleBackToMenu}
                playerNames={playerNames}
                cpuSettings={cpuSettings}
                onlineContext={{ isHost, roomId: onlineRoomId, socket, emit, on, off, onlinePlayers }}
                selfId={selfId}
              />
            );
          case "result":
            return <ResultScreen state={gameState} onBackToMenu={handleBackToMenu} onlineContext={{ isHost, roomId: onlineRoomId, socket, emit, on, off, onlinePlayers }} />;
          default:
            return <MenuScreen onNavigate={setScreen} />;
        }
      })()}
      {screen !== "tutorial" && (
        <div style={{ position: "fixed", bottom: 8, width: "100%", textAlign: "center", fontSize: 10, color: "var(--gray3)", pointerEvents: "none", zIndex: 100 }}>
          ALGOSIX v1.2.0 {onlineRoomId ? `| ROOM: ${onlineRoomId} | ID: ${selfId?.slice(0,4)}` : ""}
        </div>
      )}
    </>
  );
}
