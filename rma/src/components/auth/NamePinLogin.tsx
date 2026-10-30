"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import type { RosterEntry } from "@/modules/auth/roster";
import { t, type Lang } from "@/platform/i18n/dict";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";

/** Only a same-site absolute path may be a login destination. */
function safeCallback(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

/**
 * Dead-simple staff sign-in: tap your name, punch a 4-digit PIN (`name-pin`
 * provider, Tailscale-friendly). First PIN is 8888; change it in settings.
 * RU/EN via the language switcher on the card. High-contrast light card on a
 * dark backdrop so names and digits stay legible in any theme.
 */
const C = {
  backdrop: "#0f172a", card: "#ffffff", ink: "#0f172a", sub: "#475569",
  keyBg: "#f8fafc", keyBorder: "#cbd5e1", danger: "#dc2626", dotEmpty: "#cbd5e1", dotFull: "#2563eb",
};

export default function NamePinLogin({ roster, platform, lang = "ru" }: { roster: RosterEntry[]; platform: string; lang?: Lang }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const searchParams = useSearchParams();
  const destination = safeCallback(searchParams.get("callbackUrl"));

  async function submit(p: string) {
    if (!picked || p.length < 4 || busy) return;
    setBusy(true);
    setError("");
    const res = await signIn("name-pin", { name: picked, pin: p, callbackUrl: destination, redirect: false });
    setBusy(false);
    if (res?.error) {
      setError(t(lang, "login.wrongPin"));
      setPin("");
    } else {
      window.location.assign(destination);
    }
  }

  const tapDigit = (d: string) => {
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) void submit(next);
  };

  const key: React.CSSProperties = {
    padding: 18, fontSize: 24, fontWeight: 700, color: C.ink, background: C.keyBg,
    border: `1px solid ${C.keyBorder}`, borderRadius: 14, cursor: "pointer",
  };

  return (
    <div style={{ minHeight: "100dvh", background: C.backdrop, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400, background: C.card, borderRadius: 20, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
          <LanguageSwitcher lang={lang} compact />
        </div>
        <h1 style={{ textAlign: "center", fontSize: 24, fontWeight: 800, color: C.ink, margin: "0 0 4px" }}>{platform}</h1>

        {!picked ? (
          <>
            <p style={{ textAlign: "center", color: C.sub, margin: "0 0 22px", fontSize: 15 }}>{t(lang, "login.pickName")}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {roster.map((r) => (
                <button key={r.name} onClick={() => { setPicked(r.name); setPin(""); setError(""); }}
                  style={{ padding: "20px 12px", fontSize: 19, fontWeight: 700, color: C.ink, background: C.keyBg, border: `1px solid ${C.keyBorder}`, borderRadius: 14, cursor: "pointer" }}>
                  {r.name}
                </button>
              ))}
            </div>
            {roster.length === 0 && <p style={{ textAlign: "center", color: C.danger, marginTop: 16 }}>{t(lang, "login.emptyRoster")}</p>}
          </>
        ) : (
          <>
            <p style={{ textAlign: "center", fontSize: 18, color: C.ink, margin: "6px 0 2px" }}>{t(lang, "login.hi")}, <b>{picked}</b></p>
            <p style={{ textAlign: "center", color: C.sub, margin: "0 0 18px", fontSize: 15 }}>{t(lang, "login.enterPin")}</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 20 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ width: 18, height: 18, borderRadius: "50%", background: pin[i] ? C.dotFull : "transparent", border: `2px solid ${pin[i] ? C.dotFull : C.dotEmpty}` }} />
              ))}
            </div>
            {error && <p style={{ textAlign: "center", color: C.danger, margin: "0 0 12px", fontWeight: 600 }}>{error}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button key={d} onClick={() => tapDigit(d)} disabled={busy} style={key}>{d}</button>
              ))}
              <button onClick={() => setPin("")} disabled={busy} style={{ ...key, fontSize: 15, color: C.sub }}>{t(lang, "login.reset")}</button>
              <button onClick={() => tapDigit("0")} disabled={busy} style={key}>0</button>
              <button onClick={() => setPin(pin.slice(0, -1))} disabled={busy} style={{ ...key, fontSize: 20 }}>⌫</button>
            </div>
            <button onClick={() => { setPicked(null); setPin(""); setError(""); }}
              style={{ display: "block", margin: "20px auto 0", background: "none", border: "none", color: C.sub, fontSize: 15, cursor: "pointer" }}>{t(lang, "login.back")}</button>
          </>
        )}
      </div>
    </div>
  );
}
