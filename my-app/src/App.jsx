import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import "./App.css";
import Login from "./Login";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function App() {
  const [session, setSession] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  const [fullscreenEnabled, setFullscreenEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [counts, setCounts] = useState({
    one: 0,
    two: 0,
    three: 0,
    four: 0,
  });

  const [loading, setLoading] = useState(true);
  const [isClicking, setIsClicking] = useState(false);

  const [showThanks, setShowThanks] = useState(false);
  const [thanksFadeOut, setThanksFadeOut] = useState(false);

  const fadeTimerRef = useRef(null);
  const removeTimerRef = useRef(null);

  const SETTINGS_ID = 1;

  // ──────────────────────────────────────────────
  // Fetch fullscreen setting from DB (only called on exit or initial load)
  // ──────────────────────────────────────────────
  const fetchFullscreenStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("fullscreen_enabled")
        .eq("id", SETTINGS_ID)
        .single();

      if (error) {
        console.error("Error fetching fullscreen status:", error.message);
        return;
      }

      setFullscreenEnabled(data?.fullscreen_enabled ?? true);
    } catch (err) {
      console.error("Settings fetch failed:", err);
    }
  };

  // ──────────────────────────────────────────────
  // Update fullscreen setting in DB
  // ──────────────────────────────────────────────
  const updateFullscreenStatus = async (enabled) => {
    try {
      const { error } = await supabase
        .from("settings")
        .upsert(
          { id: SETTINGS_ID, fullscreen_enabled: enabled },
          { onConflict: "id" }
        );

      if (error) {
        console.error("Failed to save fullscreen setting:", error.message);
      } else {
        setFullscreenEnabled(enabled);
      }
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  // ──────────────────────────────────────────────
  // Auth & session handling + initial fetch
  // ──────────────────────────────────────────────
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
        // Load initial fullscreen setting once after login
        fetchFullscreenStatus();
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      checkSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      checkSession(session);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // ──────────────────────────────────────────────
  // Fullscreen change detection + DB refresh on exit
  // ──────────────────────────────────────────────
  useEffect(() => {
    const onFsChange = () => {
      const nowInFs = !!document.fullscreenElement;
      setIsFullscreen(nowInFs);

      // When exiting fullscreen → re-check real DB value
      if (!nowInFs) {
        fetchFullscreenStatus();
      }
    };

    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    document.addEventListener("mozfullscreenchange", onFsChange);
    document.addEventListener("MSFullscreenChange", onFsChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
      document.removeEventListener("mozfullscreenchange", onFsChange);
      document.removeEventListener("MSFullscreenChange", onFsChange);
    };
  }, []);

  // ──────────────────────────────────────────────
  // Enter / Exit fullscreen
  // ──────────────────────────────────────────────
  const goFullscreen = async () => {
    const elem = document.documentElement;

    try {
      const options = { navigationUI: "hide" };

      if (elem.requestFullscreen) {
        await elem.requestFullscreen(options);
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }

      // Optional: try to lock orientation (works on many tablets)
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch(() => {});
      }

      await updateFullscreenStatus(true);
    } catch (err) {
      console.warn("Could not enter fullscreen:", err);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      }
      // DB is re-fetched automatically via the fullscreenchange listener
    } catch (err) {
      console.warn("Could not exit fullscreen:", err);
    }
  };

  // ──────────────────────────────────────────────
  // Load today's counts
  // ──────────────────────────────────────────────
  const fetchToday = async () => {
    setLoading(true);
    const day = todayStr();

    const { data, error } = await supabase
      .from("daily_clicks")
      .select("one, two, three, four")
      .eq("day", day)
      .maybeSingle();

    if (error) {
      console.error("Error loading today's counts:", error.message);
    } else if (data) {
      setCounts(data);
    } else {
      setCounts({ one: 0, two: 0, three: 0, four: 0 });
    }

    setLoading(false);
  };

  useEffect(() => {
    if (session) {
      fetchToday();
    }
  }, [session]);

  // ──────────────────────────────────────────────
  // Handle food-waste button clicks (no fullscreen check here)
  // ──────────────────────────────────────────────
  const handleClick = async (key) => {
    if (isClicking) return;
    setIsClicking(true);

    const updated = { ...counts, [key]: counts[key] + 1 };
    setCounts(updated);

    try {
      await supabase
        .from("daily_clicks")
        .upsert({ day: todayStr(), ...updated }, { onConflict: "day" });
    } catch (err) {
      console.error("Failed to save click:", err);
    }

    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    if (removeTimerRef.current) clearTimeout(removeTimerRef.current);

    setShowThanks(true);
    setThanksFadeOut(false);

    fadeTimerRef.current = setTimeout(() => setThanksFadeOut(true), 1100);
    removeTimerRef.current = setTimeout(() => {
      setShowThanks(false);
      setThanksFadeOut(false);
    }, 1700);

    setTimeout(() => setIsClicking(false), 800);
  };

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────
  if (checkingAuth) return <div className="loading">Laddar…</div>;
  if (!session) return <Login externalError={authError} />;

  return (
    <div className="app">
      {showThanks && (
        <div className={`thanks-overlay ${thanksFadeOut ? "fade-out" : ""}`}>
          <div className="thanks-text">Tack!</div>
        </div>
      )}

      {!isFullscreen && fullscreenEnabled && (
        <button className="fullscreen-btn" onClick={goFullscreen}>
          Helskärm
        </button>
      )}

      {isFullscreen && (
        <button className="fullscreen-btn exit" onClick={exitFullscreen}>
          Avsluta helskärm
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