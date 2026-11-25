import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseTarsClosure, type TarsClosure } from "../src/platform/integrations/tars/closure";
import { evaluateTars as evaluate, tarsBrowser as browser } from "./tars-browser";

const ORG_DID = process.env.TARS_ORG_DID ?? "did:rta:51646245";
type RunnerResult = { status: "dry_run" | "succeeded"; documentNumber: string; summary: string };
type Rental = { did: string; documentNumber: string; status?: string };

function output(result: RunnerResult, json: boolean): void {
  if (json) console.log(JSON.stringify(result));
  else console.log(`${result.summary}\n${result.status === "dry_run" ? "DRY RUN COMPLETE — TARS was not closed." : `TARS CONTRACT CLOSED: ${result.documentNumber}`}`);
}

function findRental(documentNumber: string): Rental {
  return evaluate<Rental>(`(async () => {
    const response = await fetch('/api/agencies/${ORG_DID}/rentals/100?q=' + encodeURIComponent(${JSON.stringify(documentNumber)}));
    if (!response.ok) throw new Error("Unable to reconcile the TARS contract before closure");
    const payload = await response.json();
    const matches = (payload.data || []).filter(row => row.documentNumber === ${JSON.stringify(documentNumber)});
    if (matches.length !== 1) throw new Error('Expected one TARS contract ${documentNumber}; found ' + matches.length);
    const row = matches[0];
    return { did: row.did, documentNumber: row.documentNumber, status: row.status };
  })()`);
}

function closeVmExpression(): string {
  return `(() => {
    let el = document.querySelector('#rental_counter');
    let vm;
    while (el && !vm) { vm = el.__vue__; el = el.parentElement; }
    if (!vm) throw new Error('TARS close form was not found');
    return vm;
  })()`;
}

function prepareClosure(closure: TarsClosure, submit: boolean): string {
  return evaluate<string>(`(async () => {
    const vm = ${closeVmExpression()};
    if (vm.rental?.documentNumber !== ${JSON.stringify(closure.documentNumber)}) throw new Error('TARS close form belongs to another contract');
    if ((vm.currentvehicle?.vin || vm.currentvehicle?.sourceKey || '').toUpperCase() !== ${JSON.stringify(closure.vehicleVin.toUpperCase())}) throw new Error('TARS close form belongs to another vehicle');
    vm.form.counter.did = ${JSON.stringify(closure.location)};
    vm.form.checkInTime = new Date(${JSON.stringify(closure.actualReturnAt)});
    vm.form.checkInDate = new Date(${JSON.stringify(closure.actualReturnAt)});
    vm.form.fuelLevel = ${closure.fuelPercent};
    vm.form.mileage = ${closure.finalOdometer};
    vm.minValueDate();
    vm.$v.form.$touch();
    if (vm.$v.$invalid || vm.isInvalidCheckInDateTime) throw new Error('TARS rejected the reviewed return values');
    if (${submit}) {
      await vm.submit();
      return document.body.innerText.slice(0, 4000);
    }
    vm.closeForm.rentalCounter = vm.form.counter.did;
    vm.closeForm.details[0].readings[0].fuelLevel.unit = 'km';
    vm.closeForm.details[0].readings[0].fuelLevel.value = parseInt(vm.form.fuelLevel);
    vm.closeForm.details[0].readings[0].odometer.unit = 'km';
    vm.closeForm.details[0].readings[0].odometer.value = parseInt(vm.form.mileage);
    vm.closeForm.details[0].readings[0].readAt = vm.form.checkInTime;
    vm.closeForm.details[0].vehicle.did = vm.currentvehicle.did;
    vm.closeForm.details[0].returnedDate = vm.form.checkInTime;
    return JSON.stringify({ documentNumber: vm.rental.documentNumber, closure: vm.closeForm }).slice(0, 4000);
  })()`);
}

function main(): void {
  const [file, ...flags] = process.argv.slice(2);
  const submit = flags.includes("--submit");
  const dryRun = flags.includes("--dry-run");
  const json = flags.includes("--json");
  if (!file || (submit && dryRun)) throw new Error("Usage: npx tsx scripts/tars-close.ts <closure.json> [--submit|--dry-run] [--json]");
  const closure = parseTarsClosure(JSON.parse(readFileSync(resolve(file), "utf8")));

  browser(["open", "https://tars.rta.ae/apps/business/en/rentals"]);
  if (browser(["get", "url"]).includes("login.rta.ae")) throw new Error("TARS login is required in the rma-tars agent-browser session");
  const existing = findRental(closure.documentNumber);
  if (existing.status === "CLOSED") {
    output({ status: "succeeded", documentNumber: closure.documentNumber, summary: "TARS contract was already closed; no duplicate return was submitted." }, json);
    return;
  }
  if (existing.status !== "ACTIVE") throw new Error(`TARS contract cannot be closed from status ${existing.status ?? "unknown"}`);

  browser(["open", `https://tars.rta.ae/apps/business/en/rentals/${encodeURIComponent(existing.did)}/close`]);
  browser(["wait", "--fn", `(() => {
    try {
      const vm = ${closeVmExpression()};
      return vm.rental?.documentNumber === ${JSON.stringify(closure.documentNumber)};
    } catch { return false; }
  })()`]);
  const summary = prepareClosure(closure, submit);
  if (dryRun || !submit) {
    output({ status: "dry_run", documentNumber: closure.documentNumber, summary }, json);
    return;
  }

  const closed = findRental(closure.documentNumber);
  if (closed.status !== "CLOSED") throw new Error(`TARS closure outcome was not confirmed: ${summary.slice(0, 500)}`);
  output({ status: "succeeded", documentNumber: closure.documentNumber, summary }, json);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
