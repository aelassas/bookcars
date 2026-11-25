import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LANG, LANGS, LANG_COOKIE, type Lang } from "./dict";

/** Read the viewer's language from the cookie (server components). */
export async function getServerLang(): Promise<Lang> {
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  return LANGS.includes(c as Lang) ? (c as Lang) : DEFAULT_LANG;
}
