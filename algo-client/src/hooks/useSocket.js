"use client";
import { useRef, useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";

export function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback((url = "http://localhost:4000") => {
    if (!socketRef.current) {
      socketRef.current = io(url, {
        reconnectionDelayMax: 10000,
        transports: ["websocket", "polling"],
      });

      socketRef.current.on("connect", () => {
        console.log("Connected to socket server with id:", socketRef.current.id);
        setConnected(true);
      });

      socketRef.current.on("disconnect", () => {
        console.log("Disconnected from socket server");
        setConnected(false);
      });
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
    }
  }, []);

  const emit = useCallback((event, data) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn(`Cannot emit '${event}'. Socket not connected.`);
    }
  }, []);

  const on = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
  }, []);

  const off = useCallback((event, handler) => {
    if (socketRef.current) {
      if (handler) {
        socketRef.current.off(event, handler);
      } else {
        socketRef.current.off(event);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connected,
    socket: socketRef.current,
    emit,
    on,
    off,
    connect,
    disconnect,
  };
}
