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

  const [counts, setCounts] = useState({
    one: 0,
    two: 0,
    three: 0,
    four: 0,
  });

  const [loading, setLoading] = useState(true);
  const [isClicking, setIsClicking] = useState(false);

  const [todayFood, setTodayFood] = useState(null);

  const [showThanks, setShowThanks] = useState(false);
  const [thanksFadeOut, setThanksFadeOut] = useState(false);

  const fadeTimerRef = useRef(null);
  const removeTimerRef = useRef(null);

  // ──────────────────────────────────────────────
  // Auth & session handling
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
  // Fetch today's school menu from Skolmaten RSS
  // ──────────────────────────────────────────────
  const fetchTodayFood = async () => {
    const rssUrl = "https://skolmaten.se/sven-eriksonsgymnasiet";
    const attempts = [
      () => fetch(rssUrl).then((r) => r.text()),
      () =>
        fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`)
          .then((r) => r.json())
          .then((j) => j.contents),
    ];

    for (const attempt of attempts) {
      try {
        const text = await attempt();
        const xml = new DOMParser().parseFromString(text, "text/xml");
        if (xml.querySelector("parsererror")) continue;
        for (const item of xml.querySelectorAll("item")) {
          const desc = item.querySelector("description")?.textContent || "";
          if (desc && desc !== "Ingen meny för idag") {
            setTodayFood(desc);
            return;
          }
        }
        return; // valid RSS but no menu today (weekend/holiday)
      } catch {
        // try next
      }
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
      fetchTodayFood();
    }
  }, [session]);

  // ──────────────────────────────────────────────
  // Handle food-waste button clicks
  // ──────────────────────────────────────────────
  const handleClick = async (key) => {
    if (isClicking) return;
    setIsClicking(true);

    const updated = { ...counts, [key]: counts[key] + 1 };
    setCounts(updated);

    try {
      const payload = { day: todayStr(), ...updated };
      if (todayFood) payload.food = todayFood;
      await supabase
        .from("daily_clicks")
        .upsert(payload, { onConflict: "day" });
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