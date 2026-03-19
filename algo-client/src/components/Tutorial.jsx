"use client";
import React, { useState, useCallback, useMemo } from "react";
import { Card, NumberSelector } from "./GameUI";
import { sortHand } from "../lib/gameLogic";

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
};

const GEO_COLORS = [
  "#e03030", "#28a028", "#2070d0", "#d0a020",
  "#9040c0", "#e06020", "#20b0a0", "#c04080",
];

/* ─── Geometric BG (lighter version for tutorial) ─── */
function TutorialGeoBG() {
  const shapes = useMemo(() => {
    const items = [];
    const circles = [
      { x: "5%", y: "10%", size: 50, color: GEO_COLORS[0] },
      { x: "90%", y: "8%", size: 40, color: GEO_COLORS[1] },
      { x: "8%", y: "80%", size: 35, color: GEO_COLORS[2] },
      { x: "88%", y: "85%", size: 45, color: GEO_COLORS[3] },
      { x: "50%", y: "5%", size: 28, color: GEO_COLORS[4] },
      { x: "70%", y: "40%", size: 22, color: GEO_COLORS[5] },
    ];
    circles.forEach((c, i) => {
      items.push(
        <div
          key={`c${i}`}
          style={{
            position: "absolute",
            left: c.x,
            top: c.y,
            width: c.size,
            height: c.size,
            borderRadius: "50%",
            border: `1.5px solid ${c.color}`,
            opacity: 0.25,
            animation: `float ${6 + (i % 3)}s ease-in-out infinite`,
            animationDelay: `${i * 0.6}s`,
          }}
        />
      );
    });
    return items;
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
      {shapes}
    </div>
  );
}

/* ─── Step Indicator ─── */
function StepIndicator({ current, total }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 16 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 28 : 8,
            height: 8,
            background: i === current ? C.black : C.gray2,
            transition: "all 0.3s",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Outlined Button ─── */
function Btn({ children, onClick, disabled, filled = true, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 28px",
        border: `2px solid ${disabled ? C.gray2 : C.black}`,
        background: disabled ? C.gray1 : filled ? C.black : C.white,
        color: disabled ? C.gray3 : filled ? C.white : C.black,
        fontSize: 14,
        fontWeight: 700,
        fontFamily: "'Noto Sans JP', sans-serif",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s",
        borderRadius: 0,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/* ─── Step 1: Card Introduction ─── */
function Step1Cards({ onNext }) {
  const [slide, setSlide] = useState(0);
  const blackCards = [
    { id: "demo-b3", color: "black", number: 3, revealed: true },
    { id: "demo-b7", color: "black", number: 7, revealed: true },
  ];
  const whiteCards = [
    { id: "demo-w2", color: "white", number: 2, revealed: true },
    { id: "demo-w9", color: "white", number: 9, revealed: true },
  ];
  const sortedHand = sortHand([
    { id: "s-b5", color: "black", number: 5, revealed: true },
    { id: "s-w2", color: "white", number: 2, revealed: true },
    { id: "s-b2", color: "black", number: 2, revealed: true },
    { id: "s-w8", color: "white", number: 8, revealed: true },
  ]);

  return (
    <div style={slideContainer}>
      {slide === 0 ? (
        <>
          <h2 style={titleStyle}>カードを知ろう</h2>
          <p style={descStyle}>
            アルゴには<strong>黒カード（0〜11）</strong>と<strong>白カード（0〜11）</strong>の
            計24枚があります。
          </p>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", margin: "16px 0" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, color: C.gray4, marginBottom: 6, fontWeight: 700 }}>黒カード</div>
              <div style={{ display: "flex", gap: 4 }}>
                {blackCards.map((c) => <Card key={c.id} card={c} size="xl" />)}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, color: C.gray4, marginBottom: 6, fontWeight: 700 }}>白カード</div>
              <div style={{ display: "flex", gap: 4 }}>
                {whiteCards.map((c) => <Card key={c.id} card={c} size="xl" />)}
              </div>
            </div>
          </div>
          <Btn onClick={() => setSlide(1)}>次へ →</Btn>
        </>
      ) : (
        <>
          <h2 style={titleStyle}>手札の並び順</h2>
          <p style={descStyle}>
            手札は<strong>数字の小さい順</strong>に左から並べます。
            <br />
            同じ数字のときは<strong>黒が左、白が右</strong>です。
          </p>
          <div style={{ display: "flex", gap: 4, justifyContent: "center", margin: "16px 0" }}>
            {sortedHand.map((c) => <Card key={c.id} card={c} size="xl" />)}
          </div>
          <div style={{ fontSize: 11, color: C.gray3, textAlign: "center", marginBottom: 12 }}>
            黒2 → 白2 → 黒5 → 白8
          </div>
          <Btn onClick={onNext}>次のステップへ →</Btn>
        </>
      )}
    </div>
  );
}

/* ─── Step 2: Turn Flow ─── */
function Step2TurnFlow({ onNext }) {
  const [subStep, setSubStep] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawComplete, setDrawComplete] = useState(false);
  const cpuHand = [
    { id: "cpu-b1", color: "black", number: 1, revealed: false },
    { id: "cpu-w4", color: "white", number: 4, revealed: false },
    { id: "cpu-b8", color: "black", number: 8, revealed: false },
  ];
  const [selectedCard, setSelectedCard] = useState(null);

  return (
    <div style={slideContainer}>
      <h2 style={titleStyle}>ターンの流れ</h2>
      {subStep === 0 && (
        <>
          <p style={descStyle}>
            まず、<strong>山札からカードを1枚引きます</strong>。
            引いたカードは自分だけ見えます。
          </p>
          
          <div style={{ margin: "16px 0", height: 86, display: "flex", justifyContent: "center", alignItems: "center" }}>
            {isDrawing ? (
               <div style={{ animation: "flip-reveal 0.6s ease-out forwards" }}>
                 <Card card={{ id: "draw-w5", color: "white", number: 5, revealed: true }} size="xl" />
               </div>
            ) : (
               <Card card={{ id: "draw-back", color: "black", number: null, revealed: false }} size="xl" />
            )}
          </div>

          {!isDrawing ? (
             <>
               <div style={hintBox}>タップして引いてみよう！</div>
               <Btn onClick={() => {
                 setIsDrawing(true);
                 setTimeout(() => setDrawComplete(true), 800);
               }}>カードを引く</Btn>
             </>
          ) : (
             drawComplete && (
               <div style={{ animation: "fadeIn 0.4s ease", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
                 <div style={{ ...hintBox, borderColor: C.black, color: C.black }}>白の5を引きました！</div>
                 <Btn onClick={() => setSubStep(1)}>次へ →</Btn>
               </div>
             )
          )}
        </>
      )}
      {subStep === 1 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, background: C.gray1, padding: "8px 16px", borderRadius: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.black }}>引いたカード:</span>
            <Card card={{ id: "draw-w5-small", color: "white", number: 5, revealed: true }} size="md" />
          </div>
          <p style={descStyle}>
            次に、<strong>相手の伏せカードを1枚選びます</strong>。
          </p>
          <div style={{ display: "flex", gap: 4, justifyContent: "center", margin: "12px 0" }}>
            {cpuHand.map((c, i) => (
              <Card
                key={c.id}
                card={c}
                size="xl"
                isSelectable={true}
                isSelected={selectedCard === i}
                onClick={() => {
                  setSelectedCard(i);
                  setTimeout(() => setSubStep(2), 300);
                }}
              />
            ))}
          </div>
          <div style={hintBox}>伏せカードをタップ！</div>
        </>
      )}
      {subStep === 2 && (
        <>
          <p style={descStyle}>
            カードを選んだら、<strong>数字を宣言（アタック）</strong>します。
            <br />
            当たればオープン！外れたら引いたカードを公開してターン終了です。
          </p>
          <Btn onClick={onNext}>次のステップへ →</Btn>
        </>
      )}
    </div>
  );
}

/* ─── Step 3: Correct / Incorrect ─── */
function Step3Results({ onNext }) {
  const [subStep, setSubStep] = useState(0);
  const correctCard = { id: "res-b8", color: "black", number: 8, revealed: false };
  const incorrectCard = { id: "res-w4", color: "white", number: 4, revealed: false };
  const [guess1, setGuess1] = useState(null);
  const [guess2, setGuess2] = useState(null);
  const [result1, setResult1] = useState(null);
  const [result2, setResult2] = useState(null);

  const handleAttack1 = () => {
    if (guess1 === 8) {
      setResult1("correct");
    } else {
      setResult1("wrong-retry");
      setGuess1(null);
    }
  };

  const handleAttack2 = () => {
    if (guess2 !== null && guess2 !== 4) {
      setResult2("wrong-on-purpose");
    }
  };

  return (
    <div style={slideContainer}>
      <h2 style={titleStyle}>正解と不正解</h2>
      {subStep === 0 && (
        <>
          <p style={descStyle}>
            まず<strong>正解</strong>のケースを体験しましょう。
            <br />このカードの数字を当ててみてください。
          </p>
          <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
            <Card card={correctCard} size="xl" />
          </div>
          <div style={hintBox}>ヒント: このカードは黒の8です</div>
          {result1 === "correct" ? (
            <>
              <div style={{ ...resultBadge, borderColor: C.green, color: C.green }}>
                正解！ カードがオープンされました！
              </div>
              <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
                <Card card={{ ...correctCard, revealed: true }} size="xl" />
              </div>
              <p style={{ ...descStyle, fontSize: 13, marginTop: 12, borderTop: `1px dashed ${C.gray2}`, paddingTop: 12 }}>
                正解した後は<strong>「続けてアタック」</strong>するか、<br/>
                安全にターンを終える<strong>「ステイ」</strong>かを選べます！
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <Btn onClick={() => setSubStep(1)} style={{ fontSize: 13, padding: "10px 16px" }}>続けてアタック</Btn>
                <Btn onClick={() => setSubStep(1)} style={{ fontSize: 13, padding: "10px 16px", background: C.white, color: C.black }}>ステイ（終了）</Btn>
              </div>
            </>
          ) : (
            <>
              {result1 === "wrong-retry" && (
                <div style={{ ...resultBadge, borderColor: C.red, color: C.red }}>
                  不正解… もう一度！
                </div>
              )}
              <NumberSelector value={guess1} onChange={setGuess1} />
              <Btn onClick={handleAttack1} disabled={guess1 === null} style={{ marginTop: 8 }}>
                アタック！
              </Btn>
            </>
          )}
        </>
      )}
      {subStep === 1 && (
        <>
          <p style={descStyle}>
            次は<strong>不正解</strong>のケースです。
            <br />わざと間違えてみましょう（正解は白4）。
          </p>
          <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
            <Card card={incorrectCard} size="xl" />
          </div>
          <div style={hintBox}>正解は白4。4以外の数字を選んでください</div>
          {result2 ? (
            <>
              <div style={{ ...resultBadge, borderColor: C.red, color: C.red }}>
                不正解！
              </div>
              <p style={{ ...descStyle, fontSize: 13, marginTop: 12, borderTop: `1px dashed ${C.gray2}`, paddingTop: 12 }}>
                外れたペナルティとして、さきほど引いたカード（白5）が<br/>
                <strong>表向きで相手にバレた状態</strong>で手札に追加され、<br/>
                ターンが終了してしまいます！
              </p>
              <div style={{ display: "flex", gap: 4, justifyContent: "center", margin: "16px 0", padding: "12px", background: C.gray1, borderRadius: 8, animation: "fadeIn 0.6s ease" }}>
                <div style={{ fontSize: 11, fontWeight: 700, writingMode: "vertical-rl", paddingRight: 8 }}>自分の手札</div>
                <Card card={{ id: "pen-wb2", color: "white", number: null, revealed: false }} size="sm" />
                <Card card={{ id: "pen-w5", color: "white", number: 5, revealed: true }} size="sm" />
                <Card card={{ id: "pen-bb8", color: "black", number: null, revealed: false }} size="sm" />
              </div>
              <Btn onClick={onNext} style={{ marginTop: 8 }}>最終ステップへ →</Btn>
            </>
          ) : (
            <>
              <NumberSelector value={guess2} onChange={setGuess2} />
              <Btn
                onClick={handleAttack2}
                disabled={guess2 === null || guess2 === 4}
                style={{ marginTop: 8 }}
              >
                アタック！（間違える）
              </Btn>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Step 4: Mini Game ─── */
function Step4MiniGame({ onComplete }) {
  const cpuFixedHand = sortHand([
    { id: "mg-b3", color: "black", number: 3, revealed: false },
    { id: "mg-w6", color: "white", number: 6, revealed: false },
    { id: "mg-b9", color: "black", number: 9, revealed: false },
  ]);

  const [cpuHand, setCpuHand] = useState(cpuFixedHand);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [guess, setGuess] = useState(null);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  const handleAttack = () => {
    if (selectedIdx === null || guess === null) return;
    const target = cpuHand[selectedIdx];
    if (target.number === guess) {
      const newHand = cpuHand.map((c, i) =>
        i === selectedIdx ? { ...c, revealed: true } : c
      );
      setCpuHand(newHand);
      setMessage("正解！");
      setSelectedIdx(null);
      setGuess(null);
      if (newHand.every((c) => c.revealed)) {
        setDone(true);
      }
    } else {
      setMessage("不正解… もう一度！");
      setGuess(null);
    }
  };

  return (
    <div style={slideContainer}>
      <h2 style={titleStyle}>実践ミニゲーム</h2>
      <p style={descStyle}>CPUの手札を全てオープンしよう！</p>

      <div style={{ ...hintBox, fontWeight: 700 }}>
        ヒント: CPU手札は 黒3・白6・黒9
      </div>

      <div style={{ display: "flex", gap: 4, justifyContent: "center", margin: "10px 0" }}>
        {cpuHand.map((c, i) => (
          <Card
            key={c.id}
            card={c}
            size="xl"
            isSelectable={!c.revealed}
            isSelected={selectedIdx === i}
            onClick={() => {
              if (!c.revealed) {
                setSelectedIdx(i);
                setGuess(null);
                setMessage("");
              }
            }}
          />
        ))}
      </div>

      {message && (
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: message.includes("正解") ? C.green : C.red,
            textAlign: "center",
            margin: "4px 0",
          }}
        >
          {message}
        </div>
      )}

      {!done && selectedIdx !== null && (
        <>
          <NumberSelector value={guess} onChange={setGuess} />
          <Btn onClick={handleAttack} disabled={guess === null} style={{ marginTop: 8 }}>
            アタック！
          </Btn>
        </>
      )}

      {done && (
        <>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: C.green,
              textAlign: "center",
              margin: "12px 0",
            }}
          >
            全てオープン！チュートリアル完了！
          </div>
          <Btn onClick={onComplete} style={{ background: C.green, borderColor: C.green }}>
            ゲームを始める
          </Btn>
        </>
      )}
    </div>
  );
}

/* ─── Main Tutorial Component ─── */
export default function Tutorial({ onComplete }) {
  const [step, setStep] = useState(0);
  const totalSteps = 4;

  return (
    <div
      style={{
        height: "100svh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: C.bg,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <TutorialGeoBG />

      {/* Skip button */}
      <button
        onClick={onComplete}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          padding: "6px 16px",
          border: `1.5px solid ${C.gray2}`,
          background: C.white,
          color: C.gray4,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "'Noto Sans JP', sans-serif",
          zIndex: 10,
          borderRadius: 0,
        }}
      >
        スキップ ✕
      </button>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "16px",
          overflowY: "auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <StepIndicator current={step} total={totalSteps} />
        {step === 0 && <Step1Cards onNext={() => setStep(1)} />}
        {step === 1 && <Step2TurnFlow onNext={() => setStep(2)} />}
        {step === 2 && <Step3Results onNext={() => setStep(3)} />}
        {step === 3 && <Step4MiniGame onComplete={onComplete} />}
      </div>
    </div>
  );
}

/* ─── Shared Styles ─── */
const slideContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  maxWidth: 360,
  width: "100%",
  animation: "fadeUp 0.4s ease",
};

const titleStyle = {
  fontSize: 22,
  fontWeight: 800,
  color: C.black,
  fontFamily: "'Noto Sans JP', sans-serif",
  marginBottom: 4,
};

const descStyle = {
  fontSize: 14,
  color: C.gray4,
  fontFamily: "'Noto Sans JP', sans-serif",
  textAlign: "center",
  lineHeight: 1.8,
  margin: 0,
};

const hintBox = {
  border: `1.5px solid ${C.green}`,
  padding: "6px 14px",
  fontSize: 12,
  color: C.green,
  fontWeight: 600,
  textAlign: "center",
  margin: "4px 0",
};

const resultBadge = {
  padding: "8px 16px",
  border: "2px solid",
  fontSize: 14,
  fontWeight: 700,
  textAlign: "center",
  margin: "8px 0",
};
