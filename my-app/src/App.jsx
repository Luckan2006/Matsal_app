import { useEffect, useRef, useState } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function App() {
  const [counts, setCounts] = useState({ one: 0, two: 0, three: 0, four: 0 });
  const [hideFS, setHideFS] = useState(false);
  const [loading, setLoading] = useState(true);

  const [showThanks, setShowThanks] = useState(false);
  const [thanksFadeOut, setThanksFadeOut] = useState(false);

  const fadeTimerRef = useRef(null);
  const removeTimerRef = useRef(null);

  const day = todayStr();

  async function fetchToday() {
    setLoading(true);

    const { data, error } = await supabase
      .from("daily_clicks")
      .select("one, two, three, four")
      .eq("day", day)
      .single();

    if (!error && data) setCounts(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchToday();
  }, []);

  useEffect(() => {
    function onFsChange() {
      if (document.fullscreenElement) setHideFS(true);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
    };
  }, []);

  function goFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }

  async function persist(updated) {
    await supabase.from("daily_clicks").upsert({ day, ...updated }, { onConflict: "day" });
  }

  async function handleClick(key) {
    const updated = { ...counts, [key]: (counts[key] ?? 0) + 1 };
    setCounts(updated);
    await persist(updated);

    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    if (removeTimerRef.current) clearTimeout(removeTimerRef.current);

    setShowThanks(true);
    setThanksFadeOut(false);

    const visibleMs = 1100;
    const fadeMs = 600;

    fadeTimerRef.current = setTimeout(() => {
      setThanksFadeOut(true);
    }, visibleMs);

    removeTimerRef.current = setTimeout(() => {
      setShowThanks(false);
      setThanksFadeOut(false);
    }, visibleMs + fadeMs);
  }

  return (
    <div className="app">
      {showThanks && (
        <div className={`thanks-overlay ${thanksFadeOut ? "fade-out" : ""}`}>
          <div className="thanks-text">Tack!</div>
        </div>
      )}

      {!hideFS && (
        <button className="fullscreen-btn" onClick={goFullscreen}>
          Fullscreen
        </button>
      )}

      <h1 className="title">Varför slängde du maten?</h1>

      {loading ? (
        <div className="loading">Laddar...</div>
      ) : (
        <div className="grid">
          <button className="button one" onClick={() => handleClick("one")}>
            Hann inte äta
          </button>

          <button className="button two" onClick={() => handleClick("two")}>
            Tog för mycket
          </button>

          <button className="button three" onClick={() => handleClick("three")}>
            Ogillade maten
          </button>

          <button className="button four" onClick={() => handleClick("four")}>
            Slängde inte
          </button>
        </div>
      )}
    </div>
  );
}
