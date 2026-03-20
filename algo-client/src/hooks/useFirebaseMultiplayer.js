import { useState, useCallback, useRef, useEffect } from "react";
import { db } from "../lib/firebase";
import { ref, set, get, onValue, remove, onDisconnect } from "firebase/database";

/**
 * A Firebase Realtime Database Adapter that strictly mimics the previous socket.io-client API.
 * This allows AlgoApp.js and GameScreen.js to remain largely untouched while offloading the backend to Google.
 */
export function useFirebaseMultiplayer() {
  const [connected, setConnected] = useState(false);
  const [remoteGameState, setRemoteGameState] = useState(null);
  const listenersRef = useRef({}); // Stores 'on' callbacks
  const connectionRef = useRef({ roomId: null, selfId: null, isHost: false });
  const unsubscribeFuncs = useRef([]); // Stores cleanup functions for RTDB listeners
  const actionsListenerRef = useRef(null); // peer_action リスナーの登録状態を管理

  const [selfId] = useState(() => {
    if (typeof window === "undefined") return null;
    let id = sessionStorage.getItem("algo_self_id");
    if (!id) {
      id = "user_" + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem("algo_self_id", id);
    }
    connectionRef.current.selfId = id;
    return id;
  });

  const connect = useCallback(() => {
    setConnected(true);
  }, []);

  const disconnect = useCallback(() => {
    const { roomId, selfId, isHost } = connectionRef.current;
    if (roomId && selfId) {
      if (isHost) {
        // If host leaves, delete the room
        remove(ref(db, `rooms/${roomId}`));
      } else {
        // If peer leaves, remove from players list
        remove(ref(db, `rooms/${roomId}/players/${selfId}`));
      }
    }
    
    // Cleanup all RTDB subscriptions
    unsubscribeFuncs.current.forEach(unsub => unsub());
    unsubscribeFuncs.current = [];
    actionsListenerRef.current = null; // リスナー状態をリセット

    // Also clear the UI-level listeners to prevent stale triggers
    listenersRef.current = {};

    setConnected(false);
    connectionRef.current = { roomId: null, selfId: null, isHost: false };
  }, []);

  // Internal event trigger
  const trigger = useCallback((event, data) => {
    if (listenersRef.current[event]) {
      listenersRef.current[event].forEach(cb => cb(data));
    }
  }, []);

  const on = useCallback((event, callback) => {
    if (!listenersRef.current[event]) {
      listenersRef.current[event] = [];
    }
    listenersRef.current[event].push(callback);
  }, []);

  const off = useCallback((event, callback) => {
    if (!listenersRef.current[event]) return;
    if (callback) {
      listenersRef.current[event] = listenersRef.current[event].filter(cb => cb !== callback);
    } else {
      listenersRef.current[event] = [];
    }
  }, []);

  // ホスト用 peer_action リスナーを登録する（二重登録防止付き）
  const registerActionsListener = useCallback((roomId) => {
    if (actionsListenerRef.current) return; // 既に登録済み
    let lastProcessedTs = 0;
    const pendingRef = ref(db, `rooms/${roomId}/pendingAction`);
    const unsubActions = onValue(pendingRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const actionData = snapshot.val();
      if (!actionData.ts || actionData.ts <= lastProcessedTs) return;
      lastProcessedTs = actionData.ts;
      trigger("peer_action", actionData);
      set(pendingRef, null);
    });
    actionsListenerRef.current = unsubActions;
    unsubscribeFuncs.current.push(unsubActions);
  }, [trigger]);

  // Map "socket.emit" concepts into Firebase Realtime DB writes
  const emit = useCallback((event, data) => {
    const { selfId } = connectionRef.current;
    if (!selfId) return;

    if (event === "create_room") {
      // 1. Generate 6-char Room ID
      const roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
      connectionRef.current.roomId = roomId;
      connectionRef.current.isHost = true;

      const roomRef = ref(db, `rooms/${roomId}`);
      const myPlayerRef = ref(db, `rooms/${roomId}/players/${selfId}`);

      // Firebase connection timeout to prevent hanging on bad URL
      const timeoutId = setTimeout(() => {
        trigger("error", { message: "通信タイムアウト: Firebaseとの接続に失敗しました。\n\n※.env.local の NEXT_PUBLIC_FIREBASE_DATABASE_URL が正しく設定されているか確認してください。" });
        connectionRef.current.roomId = null;
        connectionRef.current.isHost = false;
      }, 5000);

      // Set room meta
      set(ref(db, `rooms/${roomId}/meta`), {
        playerCount: data.playerCount,
        mode: data.mode,
        hostId: selfId,
        createdAt: Date.now()
      }).then(() => {
        clearTimeout(timeoutId);
        // Add self to players
        return set(myPlayerRef, {
          id: selfId,
          name: data.name,
          isHost: true,
          connected: true,
          seatIndex: 0,
        });
      }).then(() => {
        // Delete room on disconnect if I am host
        onDisconnect(roomRef).remove();
        onDisconnect(myPlayerRef).update({ connected: false });
        
        trigger("room_created", { roomId });
        
        // Listen to player joins
        const playersRef = ref(db, `rooms/${roomId}/players`);
        const unsub = onValue(playersRef, (snapshot) => {
          if (snapshot.exists()) {
             const playersObject = snapshot.val();
             const playersArray = Object.values(playersObject);
             trigger("player_joined", { players: playersArray, roomId });
          }
        });
        unsubscribeFuncs.current.push(unsub);
        
        // Listen to rematch votes
        const rematchRef = ref(db, `rooms/${roomId}/rematchVotes`);
        const unsubRematch = onValue(rematchRef, (snap) => {
          const votes = snap.exists() ? Object.keys(snap.val()).length : 0;
          trigger("rematch_update", { count: votes });
        });
        unsubscribeFuncs.current.push(unsubRematch);
        
        // Listen for peer actions (Host only)
        registerActionsListener(roomId);
      }).catch((err) => {
        trigger("error", { message: "ルーム作成に失敗しました: " + err.message });
        connectionRef.current.roomId = null;
        connectionRef.current.isHost = false;
      });

      // Watch for game start (if I am host, but also good for consistency)
      const startRef = ref(db, `rooms/${roomId}/meta/started`);
      const unsubStart = onValue(startRef, (snap) => {
        if (snap.val() === true) {
           trigger("game_started", {});
        }
      });
      unsubscribeFuncs.current.push(unsubStart);

      return;
    }

    if (event === "join_room") {
      const roomId = data.roomId;
      connectionRef.current.roomId = roomId;
      connectionRef.current.isHost = false;

      // Firebase connection timeout to prevent hanging on bad URL or slow network
      const timeoutId = setTimeout(() => {
        trigger("error", {
          message: "【接続タイムアウト】\nFirebaseとの接続に時間がかかっています。\n\n" +
                   "1. ページを「強力に更新(Ctrl+F5)」してみてください。\n" +
                   "2. Vercelの設定で NEXT_PUBLIC_FIREBASE_DATABASE_URL が正しく設定されているか、再デプロイが完了しているか確認してください。"
        });
        connectionRef.current.roomId = null;
      }, 10000);

      const roomMetaRef = ref(db, `rooms/${roomId}/meta`);
      get(roomMetaRef).then((snapshot) => {
        clearTimeout(timeoutId);
        if (!snapshot.exists()) {
          trigger("error", { message: "ルームが見つかりません" });
          return;
        }
        
        const meta = snapshot.val();
        // Notify the app about the room configuration immediately
        trigger("room_joined", { roomId, config: meta });

        const myPlayerRef = ref(db, `rooms/${roomId}/players/${selfId}`);
        const playersRef = ref(db, `rooms/${roomId}/players`);

        // 既存プレイヤー数を確認して次の seatIndex を決定する
        get(playersRef).then((playerSnap) => {
          const seatIndex = playerSnap.exists() ? Object.keys(playerSnap.val()).length : 1;
          return set(myPlayerRef, {
            id: selfId,
            name: data.name,
            isHost: false,
            connected: true,
            seatIndex,
          });
        }).then(() => {
          // Update connection state on disconnect
          onDisconnect(myPlayerRef).update({ connected: false });

          // Listen to player updates
          const unsubPlayers = onValue(playersRef, (psnap) => {
             if (psnap.exists()) {
                 const playersObject = psnap.val();
                 trigger("player_joined", { players: Object.values(playersObject), roomId });
             } else {
                 // Room deleted!
                 trigger("room_closed", { message: "ホストが退出したためルームが解散されました。" });
             }
          });
          unsubscribeFuncs.current.push(unsubPlayers);

          // Listen to rematch votes
          const rematchRef = ref(db, `rooms/${roomId}/rematchVotes`);
          const unsubRematch = onValue(rematchRef, (snap) => {
            const votes = snap.exists() ? Object.keys(snap.val()).length : 0;
            trigger("rematch_update", { count: votes });
          });
          unsubscribeFuncs.current.push(unsubRematch);
          
          // Listen to state syncs tailored for me
          const myStateRef = ref(db, `rooms/${roomId}/states/${selfId}`);
           const unsubState = onValue(myStateRef, (ssnap) => {
              if (ssnap.exists()) {
                  setRemoteGameState(ssnap.val());
              }
           });
           unsubscribeFuncs.current.push(unsubState);

           // Watch for game start
           const startRef = ref(db, `rooms/${roomId}/meta/started`);
           const unsubStart = onValue(startRef, (snap) => {
             if (snap.val() === true) {
                trigger("game_started", {});
             }
           });
           unsubscribeFuncs.current.push(unsubStart);
         });
      }).catch((err) => {
        trigger("error", { message: "ルーム参加に失敗しました: " + err.message });
        connectionRef.current.roomId = null;
      });
      return;
    }
    
    if (event === "host_sync_state") {
      const { roomId, targetId, state } = data;
      if (roomId && targetId) {
        set(ref(db, `rooms/${roomId}/states/${targetId}`), state);
      }
      return;
    }

    if (event === "peer_action") {
      const { roomId, action, payload } = data;
      if (roomId) {
        set(ref(db, `rooms/${roomId}/pendingAction`), {
          senderId: selfId,
          action,
          payload,
          ts: Date.now()
        });
      }
      return;
    }

    if (event === "start_game") {
      const { roomId } = data;
      if (roomId) {
        set(ref(db, `rooms/${roomId}/meta/started`), true);
        // ホストの peer_action リスナーが失われていた場合に備えて再確認・再登録
        if (connectionRef.current.isHost) {
          registerActionsListener(roomId);
        }
      }
      return;
    }

    // --- NEW ONLINE UX ACTIONS ---

    if (event === "send_stamp") {
      const { roomId, stampId } = data;
      if (roomId && selfId) {
        set(ref(db, `rooms/${roomId}/players/${selfId}/lastStamp`), {
          id: stampId,
          ts: Date.now()
        });
      }
      return;
    }

    if (event === "toggle_ready") {
      const { roomId, ready } = data;
      if (roomId && selfId) {
        set(ref(db, `rooms/${roomId}/players/${selfId}/ready`), ready);
      }
      return;
    }

    // Following actions are generally executed by Host or globally
    if (event === "swap_seats") {
      const { roomId, seatA_player_id, seatB_player_id } = data;
      if (roomId && connectionRef.current.isHost) {
        const pRef = ref(db, `rooms/${roomId}/players`);
        get(pRef).then(snap => {
          if (!snap.exists()) return;
          const pl = snap.val();
          if (pl[seatA_player_id] && pl[seatB_player_id]) {
            // Swap their indices
            const tempIdx = pl[seatA_player_id].seatIndex;
            pl[seatA_player_id].seatIndex = pl[seatB_player_id].seatIndex;
            pl[seatB_player_id].seatIndex = tempIdx;
            set(pRef, pl);
          }
        });
      }
      return;
    }

    if (event === "kick_player") {
      const { roomId, targetId } = data;
      if (roomId && connectionRef.current.isHost) {
        remove(ref(db, `rooms/${roomId}/players/${targetId}`));
      }
      return;
    }

    if (event === "rematch_vote") {
      const { roomId } = data;
      if (roomId) {
        set(ref(db, `rooms/${roomId}/rematchVotes/${selfId}`), true);
      }
      return;
    }

    if (event === "clear_rematch_votes") {
      const { roomId } = data;
      if (roomId && connectionRef.current.isHost) {
        remove(ref(db, `rooms/${roomId}/rematchVotes`));
      }
      return;
    }

    if (event === "pair_change") {
      const { roomId } = data;
      if (roomId && connectionRef.current.isHost) {
        const pRef = ref(db, `rooms/${roomId}/players`);
        get(pRef).then(snap => {
          if (!snap.exists()) return;
          const pl = snap.val();
          const players = Object.values(pl);
          // Shuffle indices
          const indices = players.map((_, i) => i);
          for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
          }
          players.forEach((p, i) => {
            p.seatIndex = indices[i];
            pl[p.id] = p;
          });
          set(pRef, pl);
        });
      }
      return;
    }

  }, [selfId, trigger, registerActionsListener]);

  return {
    connected,
    socket: { id: selfId }, // Mock socket for compatibility
    selfId,
    roomId: connectionRef.current.roomId,
    isHost: connectionRef.current.isHost,
    connect,
    disconnect,
    emit,
    on,
    off,
    remoteGameState,
  };
}
