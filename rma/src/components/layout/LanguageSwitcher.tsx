"use client";

import { useRouter } from "next/navigation";
import { LANGS, LANG_COOKIE, type Lang } from "@/platform/i18n/dict";

/**
 * RU/EN toggle. Writes the `lang` cookie and refreshes so server components
 * re-render in the chosen language. Per browser — each person picks their own.
 */
export default function LanguageSwitcher({ lang, compact }: { lang: Lang; compact?: boolean }) {
  const router = useRouter();
  const set = (l: Lang) => {
    // eslint-disable-next-line react-hooks/immutability -- document.cookie assignment is the standard set-cookie API, not state mutation
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  };
  return (
    <div style={{ display: "inline-flex", gap: 2, border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden", fontSize: compact ? 12 : 13 }}>
      {LANGS.map((l) => (
        <button
          key={l}
          onClick={() => set(l)}
          aria-pressed={l === lang}
          style={{
            padding: compact ? "3px 8px" : "5px 10px",
            border: "none",
            cursor: "pointer",
            fontWeight: l === lang ? 700 : 500,
            background: l === lang ? "#2563eb" : "transparent",
            color: l === lang ? "#fff" : "#475569",
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
