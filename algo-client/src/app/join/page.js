"use client";
import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function JoinRedirect() {
  const code = useSearchParams().get("code");
  const router = useRouter();

  useEffect(() => {
    if (!code) { router.replace("/"); return; }
    sessionStorage.setItem("pendingRoomCode", code.replace(/-/g, "").toUpperCase());
    router.replace("/");
  }, [code, router]);

  return (
    <div style={{
      height:"100svh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      background:"#111", color:"#fff",
      fontFamily:"'Noto Sans JP',sans-serif", fontSize:14, gap:14,
    }}>
      <div style={{
        width:28, height:28, borderRadius:"50%",
        border:"2px solid rgba(255,255,255,.25)",
        borderTop:"2px solid #fff",
        animation:"spin .7s linear infinite",
      }}/>
      <span>ルームに参加しています...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function JoinPage() {
  return <Suspense><JoinRedirect /></Suspense>;
}
