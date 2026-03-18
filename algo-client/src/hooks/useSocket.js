// useSocket.js — Socket.io hook stub (Phase 2)
"use client";
import { useRef, useCallback } from "react";

/**
 * Placeholder Socket.io hook.
 * Will be implemented in Phase 2 for online multiplayer.
 */
export function useSocket() {
  const socketRef = useRef(null);

  const emit = useCallback((event, data) => {
    console.log("[Socket stub] emit:", event, data);
  }, []);

  const on = useCallback((event, handler) => {
    console.log("[Socket stub] on:", event);
  }, []);

  const off = useCallback((event) => {
    console.log("[Socket stub] off:", event);
  }, []);

  const connect = useCallback((url) => {
    console.log("[Socket stub] connect:", url);
  }, []);

  const disconnect = useCallback(() => {
    console.log("[Socket stub] disconnect");
  }, []);

  return {
    connected: false,
    socket: socketRef.current,
    emit,
    on,
    off,
    connect,
    disconnect,
  };
}
