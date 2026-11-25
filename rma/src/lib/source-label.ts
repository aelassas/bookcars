// Display helper: Bitrix SOURCE_ID composites are machine strings
// ("2|ank_chats_app24_whatsapp", "46|fbinstagramdirect") — never show those
// to a human. Map to the channel name; unknown raw values pass through
// trimmed (first meaningful token), never the "n|" prefix.
export function humanizeLeadSource(raw: string | null | undefined): string {
  if (!raw) return "—";
  const s = raw.toLowerCase();
  const rules: [RegExp, string][] = [
    [/whatsapp/, "WhatsApp"],
    [/instagram|insta/, "Instagram"],
    [/facebook/, "Facebook"],
    [/telegram/, "Telegram"],
    [/call|callgear|phone/, "Phone call"],
    [/website|site|web_form|form/, "Website"],
    [/callback/, "Callback"],
    [/email/, "Email"],
    [/avito/, "Avito"],
    [/dubizzle/, "Dubizzle"],
    [/walk_?in/, "Walk-in"],
    [/import|manual/, "Manual"],
  ];
  for (const [re, label] of rules) if (re.test(s)) return label;
  // Strip the "n|" Bitrix prefix if present, else keep as-is.
  const stripped = raw.replace(/^\d+\|/, "").trim();
  return stripped || raw;
}
