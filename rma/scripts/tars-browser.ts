import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const SESSION = "rma-tars";
const CLI = process.env.TARS_AGENT_BROWSER_CLI ?? resolve(process.cwd(), "node_modules", ".bin", "agent-browser");

export function tarsBrowser(args: string[], input?: string): string {
  const result = spawnSync(CLI, ["--session", SESSION, "--session-name", SESSION, ...args], {
    input,
    encoding: "utf8",
    timeout: 45_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || result.error?.message || "agent-browser failed").trim());
  }
  return result.stdout.trim();
}

export function evaluateTars<T>(script: string): T {
  const output = tarsBrowser(["eval", "--stdin"], script);
  return JSON.parse(output) as T;
}
