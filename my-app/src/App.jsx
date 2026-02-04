import { useEffect, useRef, useState } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";
import Login from "./Login";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function App() {

  const [session, setSession] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  const [counts, setCounts] = useState({
    one: 0,
    two: 0,
    three: 0,
    four: 0,
  });
  const [loading, setLoading] = useState(true);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThanks, setShowThanks] = useState(false);
  const [thanksFadeOut, setThanksFadeOut] = useState(false);

  const fadeTimerRef = useRef(null);
  const removeTimerRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function checkSession(session) {
      if (!session?.user) {
        if (mounted) {
          setSession(null);
          setCheckingAuth(false);
        }
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("approved")
        .eq("id", session.user.id)
        .single();

      if (error || !profile?.approved) {
        await supabase.auth.signOut();
        if (mounted) {
          setSession(null);
          setAuthError("Kontot är inte godkänt för kiosk-läge.");
          setCheckingAuth(false);
        }
        return;
      }

      if (mounted) {
        setSession(session);
        setCheckingAuth(false);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      checkSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        checkSession(session);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function onFsChange() {
      const fs =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;

      setIsFullscreen(!!fs);
    }

    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  function goFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }

  useEffect(() => {
    function preventContextMenu(e) {
      e.preventDefault();
    }
    document.addEventListener("contextmenu", preventContextMenu);
    return () =>
      document.removeEventListener("contextmenu", preventContextMenu);
  }, []);

  async function fetchToday() {
    setLoading(true);

    const currentDay = todayStr();

    const { data, error } = await supabase
      .from("daily_clicks")
      .select("one, two, three, four")
      .eq("day", currentDay)
      .single();

    if (!error && data) setCounts(data);
    setLoading(false);
  }

  useEffect(() => {
    if (session) fetchToday();
  }, [session]);

  async function persist(updated) {
    await supabase
      .from("daily_clicks")
      .upsert({ day: todayStr(), ...updated }, { onConflict: "day" });
  }

  async function handleClick(key) {
    const updated = { ...counts, [key]: counts[key] + 1 };
    setCounts(updated);
    await persist(updated);

    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    if (removeTimerRef.current) clearTimeout(removeTimerRef.current);

    setShowThanks(true);
    setThanksFadeOut(false);

    fadeTimerRef.current = setTimeout(
      () => setThanksFadeOut(true),
      1100
    );
    removeTimerRef.current = setTimeout(() => {
      setShowThanks(false);
      setThanksFadeOut(false);
    }, 1700);
  }

  if (checkingAuth) return <div className="loading">Laddar…</div>;
  if (!session) return <Login externalError={authError} />;

  return (
    <div className="app">
      {showThanks && (
        <div className={`thanks-overlay ${thanksFadeOut ? "fade-out" : ""}`}>
          <div className="thanks-text">Tack!</div>
        </div>
      )}

      {!isFullscreen && (
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
