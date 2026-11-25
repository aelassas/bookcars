import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterAll, describe, expect, it } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "tars-close-runner-test-"));
const cli = join(dir, "fake-agent-browser.cjs");
const state = join(dir, "state.json");
const closure = join(dir, "closure.json");

writeFileSync(cli, `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
const statePath = process.env.FAKE_TARS_STATE;
const current = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : { status: 'ACTIVE', submits: 0 };
if (args.includes('eval')) {
  const script = fs.readFileSync(0, 'utf8');
  if (script.includes('/rentals/100?q=')) {
    process.stdout.write(JSON.stringify({ did: 'did:rta:test-rental', documentNumber: 'TEST-CLOSE', status: current.status }));
  } else if (script.includes('if (true)') && script.includes('await vm.submit()')) {
    fs.writeFileSync(statePath, JSON.stringify({ status: 'CLOSED', submits: current.submits + 1 }));
    process.stdout.write(JSON.stringify('TARS return accepted'));
  } else if (script.includes('vm.closeForm.rentalCounter')) {
    process.stdout.write(JSON.stringify(JSON.stringify({ documentNumber: 'TEST-CLOSE', reviewed: true })));
  } else process.stdout.write('null');
} else if (args.includes('get') && args.includes('url')) {
  process.stdout.write('https://tars.rta.ae/apps/business/en/rentals');
} else process.stdout.write('');
`);
chmodSync(cli, 0o755);
writeFileSync(closure, JSON.stringify({
  version: 1,
  rentalId: "6ee540e3-0c13-4f0b-a3f2-e8c5f8c2f750",
  documentNumber: "TEST-CLOSE",
  vehicleVin: "TESTVIN0000000001",
  startAt: "2026-11-21T06:00:00.000Z",
  actualReturnAt: "2026-11-22T06:00:00.000Z",
  startOdometer: 1000,
  finalOdometer: 1100,
  fuelPercent: 50,
  location: "TEST",
}));

function run(flag: string) {
  const result = spawnSync(resolve("node_modules/.bin/tsx"), [resolve("scripts/tars-close.ts"), closure, flag, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, TARS_AGENT_BROWSER_CLI: cli, FAKE_TARS_STATE: state },
    timeout: 30_000,
  });
  expect(result.stderr).toBe("");
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout.trim().split("\n").at(-1)!) as { status: string; documentNumber: string };
}

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("TARS closure runner against a fake browser", () => {
  it("reviews the exact closure without submitting it", () => {
    expect(run("--dry-run").status).toBe("dry_run");
    expect(existsSync(state)).toBe(false);
  });

  it("closes once and reconciles an exact repeat", () => {
    expect(run("--submit").status).toBe("succeeded");
    expect(JSON.parse(readFileSync(state, "utf8")).submits).toBe(1);
    expect(run("--submit").status).toBe("succeeded");
    expect(JSON.parse(readFileSync(state, "utf8")).submits).toBe(1);
  });
});
