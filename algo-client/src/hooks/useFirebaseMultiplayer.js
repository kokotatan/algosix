import { useState, useCallback, useRef, useEffect } from "react";
import { db } from "../lib/firebase";
import { ref, set, get, onValue, onChildAdded, push, remove, onDisconnect } from "firebase/database";

/**
 * A Firebase Realtime Database Adapter that strictly mimics the previous socket.io-client API.
 * This allows AlgoApp.js and GameScreen.js to remain largely untouched while offloading the backend to Google.
 */
export function useFirebaseMultiplayer() {
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef({}); // Stores 'on' callbacks
  const connectionRef = useRef({ roomId: null, selfId: null, isHost: false });
  const unsubscribeFuncs = useRef([]); // Stores cleanup functions for RTDB listeners

  // Connect is just setting "connected" for Firebase, since initialized app is always ready
  const connect = useCallback(() => {
    setConnected(true);
    // Generate a quick random ID for the current user's session
    if (!connectionRef.current.selfId) {
       connectionRef.current.selfId = Math.random().toString(36).substr(2, 9);
    }
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

  // Map "socket.emit" concepts into Firebase Realtime DB writes
  const emit = useCallback((event, payload) => {
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
        maxPlayers: payload.maxPlayers,
        hostId: selfId,
        createdAt: Date.now()
      }).then(() => {
        clearTimeout(timeoutId);
        // Add self to players
        return set(myPlayerRef, {
          id: selfId,
          name: payload.name,
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
        const actionsRef = ref(db, `rooms/${roomId}/actions`);
        const unsubActions = onChildAdded(actionsRef, (snapshot) => {
           if (snapshot.exists()) {
              const actionData = snapshot.val();
              trigger("peer_action", actionData);
              // Clean up action so history doesn't grow infinitely? (Optional, but good for performance)
              remove(ref(db, `rooms/${roomId}/actions/${snapshot.key}`));
           }
        });
        unsubscribeFuncs.current.push(unsubActions);
      }).catch((err) => {
        trigger("error", { message: "ルーム作成に失敗しました: " + err.message });
        connectionRef.current.roomId = null;
        connectionRef.current.isHost = false;
      });
      return;
    }

    if (event === "join_room") {
      const roomId = payload.roomId;
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
        
        const myPlayerRef = ref(db, `rooms/${roomId}/players/${selfId}`);
        set(myPlayerRef, {
          id: selfId,
          name: payload.name,
          isHost: false,
          connected: true
        }).then(() => {
          // Update connection state on disconnect
          onDisconnect(myPlayerRef).update({ connected: false });
          
          // Listen to player updates
          const playersRef = ref(db, `rooms/${roomId}/players`);
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
                 trigger("sync_state", ssnap.val());
             }
          });
          unsubscribeFuncs.current.push(unsubState);
        });
      }).catch((err) => {
        trigger("error", { message: "ルーム参加に失敗しました: " + err.message });
        connectionRef.current.roomId = null;
      });
      return;
    }
    
    if (event === "host_sync_state") {
       // Host writes state specifically to the targetPeer's node
       const { roomId, targetId, state } = payload;
       if (roomId && targetId) {
          set(ref(db, `rooms/${roomId}/states/${targetId}`), state);
       }
       return;
    }
    
    if (event === "peer_action") {
       // Peer pushes an action to the actions list for Host to process
       const { roomId, action, payload: actionPayload } = payload;
       if (roomId) {
          push(ref(db, `rooms/${roomId}/actions`), {
            senderId: selfId,
            action,
            payload: actionPayload,
            timestamp: Date.now()
          });
       }
       return;
    }

    // --- NEW ONLINE UX ACTIONS ---

    if (event === "send_stamp") {
      const { roomId, stampId } = payload;
      if (roomId && selfId) {
        set(ref(db, `rooms/${roomId}/players/${selfId}/lastStamp`), {
          id: stampId,
          ts: Date.now()
        });
      }
      return;
    }

    // Following actions are generally executed by Host or globally
    if (event === "swap_seats") {
      const { roomId, seatA_player_id, seatB_player_id } = payload;
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
      const { roomId, targetId } = payload;
      if (roomId && connectionRef.current.isHost) {
        remove(ref(db, `rooms/${roomId}/players/${targetId}`));
      }
      return;
    }

    if (event === "rematch_vote") {
      const { roomId } = payload;
      if (roomId) {
        set(ref(db, `rooms/${roomId}/rematchVotes/${selfId}`), true);
      }
      return;
    }

    if (event === "clear_rematch_votes") {
      const { roomId } = payload;
      if (roomId && connectionRef.current.isHost) {
        remove(ref(db, `rooms/${roomId}/rematchVotes`));
      }
      return;
    }

    if (event === "pair_change") {
      const { roomId } = payload;
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

  }, [trigger]);

  return { connected, socket: { id: connectionRef.current.selfId }, connect, disconnect, emit, on, off };
}
