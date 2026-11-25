import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterAll, describe, expect, it } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "tars-runner-test-"));
const cli = join(dir, "fake-agent-browser.cjs");
const state = join(dir, "state.json");
const handoff = join(dir, "handoff.json");
const contract = join(dir, "contract.pdf");

writeFileSync(cli, `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
const statePath = process.env.FAKE_TARS_STATE;
if (args.includes('eval')) {
  const script = fs.readFileSync(0, 'utf8');
  if (script.includes('/rentals/100?q=')) {
    const value = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : null;
    process.stdout.write(JSON.stringify(value?.documentNumber || null));
  } else if (script.includes('/employees?')) {
    process.stdout.write(JSON.stringify([{ did: 'employee', userId: 'rmacarrental' }]));
  } else if (script.includes('return { form: vm?.form }')) {
    const countPath = statePath + '.selection';
    const count = fs.existsSync(countPath) ? Number(fs.readFileSync(countPath, 'utf8')) : 0;
    fs.writeFileSync(countPath, String(count + 1));
    process.stdout.write(JSON.stringify(count % 2 === 0
      ? { form: { vin: 'TESTVIN0000000001' } }
      : { form: { emiratesId: { id: '784200142184884' } } }));
  } else if (script.includes('Final TARS Submit button')) {
    const current = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : { submits: 0 };
    fs.writeFileSync(statePath, JSON.stringify({ documentNumber: 'TEST-DRY-RUN', submits: current.submits + 1 }));
    process.stdout.write('null');
  } else process.stdout.write('null');
} else if (args.includes('get') && args.includes('url')) {
  process.stdout.write('https://tars.rta.ae/apps/business/en/rentals/new');
} else if (args.includes('get') && args.includes('text')) {
  process.stdout.write('Summary TEST-DRY-RUN TESTVIN0000000001 784200142184884');
} else process.stdout.write('');
`);
chmodSync(cli, 0o755);
writeFileSync(contract, "%PDF-1.4\nTEST ONLY\n");
writeFileSync(handoff, JSON.stringify({
  version: 1,
  rentalId: "6ee540e3-0c13-4f0b-a3f2-e8c5f8c2f750",
  agreementNumber: "TEST-DRY-RUN",
  signatureConfirmed: true,
  customer: { name: "TEST CUSTOMER", emiratesId: "784200142184884" },
  vehicle: { plate: "TEST 00001", vin: "TESTVIN0000000001" },
  rental: { startAt: "2026-11-21T06:00:00.000Z", returnAt: "2026-11-22T06:00:00.000Z", location: "TEST", odometer: 1, fuelPercent: 50 },
}));

function run(flag: string) {
  const result = spawnSync(resolve("node_modules/.bin/tsx"), [resolve("scripts/tars-prepare.ts"), handoff, "--contract", contract, flag, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, TARS_AGENT_BROWSER_CLI: cli, FAKE_TARS_STATE: state },
    timeout: 30_000,
  });
  expect(result.stderr).toBe("");
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout.trim().split("\n").at(-1)!) as { status: string; documentNumber?: string };
}

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("TARS automatic runner against a fake browser", () => {
  it("dry-run stops before Submit", () => {
    expect(run("--dry-run").status).toBe("dry_run");
    expect(existsSync(state)).toBe(false);
  });

  it("submits once and reconciles an exact repeat", () => {
    expect(run("--submit").documentNumber).toBe("TEST-DRY-RUN");
    expect(JSON.parse(readFileSync(state, "utf8")).submits).toBe(1);
    expect(run("--submit").documentNumber).toBe("TEST-DRY-RUN");
    expect(JSON.parse(readFileSync(state, "utf8")).submits).toBe(1);
  });
});
