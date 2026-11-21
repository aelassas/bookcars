import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import { parseTarsHandoff, type TarsHandoff } from "../src/platform/integrations/tars/handoff";

const SESSION = "rma-tars";
const CLI = process.env.TARS_AGENT_BROWSER_CLI ?? resolve(process.cwd(), "node_modules", ".bin", "agent-browser");
const ORG_DID = process.env.TARS_ORG_DID ?? "did:rta:51646245";
const EMPLOYEE_USER_ID = process.env.TARS_EMPLOYEE_USER_ID ?? "rmacarrental";

type RunnerResult = { status: "dry_run" | "succeeded"; documentNumber?: string; summary: string };

function outputResult(result: RunnerResult, json: boolean): void {
  if (json) console.log(JSON.stringify(result));
  else console.log(`${result.summary}\n${result.status === "dry_run" ? "DRY RUN COMPLETE — no final Submit button was pressed." : `TARS DOCUMENT: ${result.documentNumber}`}`);
}

function findExistingDocument(handoff: TarsHandoff): string | null {
  return evaluate<string | null>(`(async () => {
    const response = await fetch('/api/agencies/${ORG_DID}/rentals/100?q=' + encodeURIComponent(${JSON.stringify(handoff.agreementNumber)}));
    if (!response.ok) throw new Error('Unable to reconcile the TARS agreement before submission');
    const payload = await response.json();
    const matches = (payload.data || []).filter(row => row.documentNumber === ${JSON.stringify(handoff.agreementNumber)});
    if (matches.length > 1) throw new Error('More than one existing TARS agreement matches this handoff');
    return matches[0]?.documentNumber || null;
  })()`);
}

function finishAutomaticSubmission(handoff: TarsHandoff, submit: boolean, dryRun: boolean): RunnerResult {
  const summary = browser(["get", "text", "body"]);
  const normalizedSummary = summary.toUpperCase();
  if (!normalizedSummary.includes(handoff.vehicle.vin.toUpperCase()) ||
      !normalizedSummary.includes(handoff.agreementNumber.toUpperCase()) ||
      !summary.replace(/\D/g, "").includes(handoff.customer.emiratesId)) {
    throw new Error("TARS Summary does not match the reviewed customer, agreement and VIN; nothing was submitted");
  }
  if (dryRun) return { status: "dry_run", summary: summary.slice(0, 4000) };
  if (!submit) return { status: "dry_run", summary: summary.slice(0, 4000) };

  evaluate(`(() => {
    const button = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Submit' && b.getClientRects().length);
    if (!button) throw new Error('Final TARS Submit button was not found');
    button.click();
  })()`);
  browser(["wait", "--fn", `(() => {
    const text = document.body.innerText.toLowerCase();
    return text.includes('success') || text.includes('rental contracts') || !Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === 'Submit' && b.getClientRects().length);
  })()`]);
  const documentNumber = findExistingDocument(handoff);
  if (!documentNumber) throw new Error("TARS submission outcome unknown: the agreement was not found after Submit; reconciliation is required before retrying");
  return { status: "succeeded", documentNumber, summary: summary.slice(0, 4000) };
}

function browser(args: string[], input?: string): string {
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

function evaluate<T>(script: string): T {
  const output = browser(["eval", "--stdin"], script);
  return JSON.parse(output) as T;
}

function waitForStep(name: string): void {
  browser(["wait", "--fn", `(() => {
    const buttons = Array.from(document.querySelectorAll('button')).filter(b => b.getClientRects().length);
    for (const button of buttons) {
      let el = button;
      let vm;
      while (el && !vm) { vm = el.__vue__; el = el.parentElement; }
      const componentName = vm?.$options?.name || vm?.$options?._componentTag;
      if (componentName === ${JSON.stringify(name)}) return true;
    }
    return false;
  })()`]);
}

function submitCurrentStep(): void {
  evaluate(`(() => {
    const button = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Next' && b.getClientRects().length);
    if (!button) throw new Error('Current wizard Next button was not found');
    let el = button;
    let vm;
    while (el && !vm) { vm = el.__vue__; el = el.parentElement; }
    if (!vm?.submit) throw new Error('Current wizard validation handler was not found');
    vm.submit();
  })()`);
}

function selectFirstOption(): void {
  evaluate(`(() => {
    const wrapper = Array.from(document.querySelectorAll('.multiselect__content-wrapper')).find(e => e.style.display !== 'none');
    const option = wrapper?.querySelector('.multiselect__option');
    if (!option) throw new Error('No matching TARS option was found');
    option.click();
  })()`);
  browser(["wait", "--fn", `(() => {
    const button = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Next' && b.getClientRects().length);
    let el = button;
    let vm;
    while (el && !vm) { vm = el.__vue__; el = el.parentElement; }
    return Boolean(vm?.form?.did || vm?.form?.emiratesId?.id);
  })()`]);
}

function selectVehicle(handoff: TarsHandoff): void {
  browser(["fill", "#vehicle_select", handoff.vehicle.plate]);
  browser(["wait", "--fn", "document.querySelector('.multiselect__content-wrapper')?.style.display !== 'none'"]);
  selectFirstOption();
  const selected = evaluate<{ form?: { vin?: string; sourceKey?: string } }>(`(() => {
    const button = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Next' && b.getClientRects().length);
    let el = button;
    let vm;
    while (el && !vm) { vm = el.__vue__; el = el.parentElement; }
    return { form: vm?.form };
  })()`);
  const vin = selected.form?.vin ?? selected.form?.sourceKey;
  if (vin?.toUpperCase() !== handoff.vehicle.vin.toUpperCase()) {
    throw new Error("The selected TARS vehicle does not match the CRM VIN");
  }
  submitCurrentStep();
  waitForStep("customer-step");
}

// shortcut: existing TARS customers only; add new-customer onboarding when all ID/license/OCR fields are modeled.
function selectCustomer(handoff: TarsHandoff): void {
  browser(["fill", ".multiselect__input", handoff.customer.emiratesId]);
  browser(["wait", "--fn", "document.querySelector('.multiselect__content-wrapper')?.style.display !== 'none'"]);
  selectFirstOption();
  const selected = evaluate<{ form?: { emiratesId?: { id?: string } } }>(`(() => {
    const button = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Next' && b.getClientRects().length);
    let el = button;
    let vm;
    while (el && !vm) { vm = el.__vue__; el = el.parentElement; }
    return { form: vm?.form };
  })()`);
  const selectedId = selected.form?.emiratesId?.id?.replace(/\D/g, "");
  if (selectedId !== handoff.customer.emiratesId) {
    throw new Error("The selected TARS customer does not match the CRM Emirates ID");
  }
  submitCurrentStep();
  waitForStep("details-step");
}

type Employee = {
  did: string;
  userId: string | null;
  firstName?: { en?: string };
  lastName?: { en?: string };
};

function prepareContractDetails(handoff: TarsHandoff, contractPath: string): void {
  browser(["fill", "#document_number", handoff.agreementNumber]);
  browser(["fill", "#rental_counter", handoff.rental.location]);
  browser(["fill", "#odometer", String(handoff.rental.odometer)]);

  const employee = evaluate<Employee[]>(`(async () => {
    const response = await fetch('/api/agencies/${ORG_DID}/employees?z=100');
    if (!response.ok) throw new Error('Unable to load the TARS employee');
    const payload = await response.json();
    return (payload.data || []).filter(e => e.userId === ${JSON.stringify(EMPLOYEE_USER_ID)});
  })()`);
  if (employee.length !== 1) throw new Error(`Expected one TARS employee for ${EMPLOYEE_USER_ID}; found ${employee.length}`);

  evaluate(`(() => {
    const button = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Next' && b.getClientRects().length);
    let el = button;
    let vm;
    while (el && !vm) { vm = el.__vue__; el = el.parentElement; }
    const start = new Date(${JSON.stringify(handoff.rental.startAt)});
    const end = new Date(${JSON.stringify(handoff.rental.returnAt)});
    vm.form.documentDate = start;
    vm.form.documentTime = start;
    vm.form.expectedReturnDate = end;
    vm.form.expectedReturnTime = end;
    vm.form.readings.fuelLevel.value = ${handoff.rental.fuelPercent};
    vm.form.employee = ${JSON.stringify(employee[0])};
  })()`);

  browser(["upload", "#file-input", contractPath]);
  browser(["wait", "--fn", `(() => {
    const button = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Next' && b.getClientRects().length);
    let el = button;
    let vm;
    while (el && !vm) { vm = el.__vue__; el = el.parentElement; }
    return Boolean(vm?.form?.attachments?.length);
  })()`]);
  submitCurrentStep();
  waitForStep("optionals-step");
}

function main(): void {
  const [handoffArg, ...flags] = process.argv.slice(2);
  const contractFlag = flags.indexOf("--contract");
  const json = flags.includes("--json");
  const submit = flags.includes("--submit");
  const dryRun = flags.includes("--dry-run");
  if (submit && dryRun) throw new Error("Choose either --submit or --dry-run");
  if (!handoffArg || contractFlag < 0 || !flags[contractFlag + 1]) {
    throw new Error("Usage: npx tsx scripts/tars-prepare.ts <handoff.json> --contract <signed.pdf> [--submit|--dry-run] [--json]");
  }

  const handoff = parseTarsHandoff(JSON.parse(readFileSync(resolve(handoffArg), "utf8")));
  const contractPath = resolve(flags[contractFlag + 1]);
  const contract = statSync(contractPath);
  if (!contract.isFile() || contract.size === 0 || contract.size > 10 * 1024 * 1024) {
    throw new Error("The signed contract must be a non-empty file no larger than 10 MB");
  }
  if (![".pdf", ".png", ".jpg", ".jpeg"].includes(extname(contractPath).toLowerCase())) {
    throw new Error("The signed contract must be PDF, PNG, JPG, or JPEG");
  }

  browser(["open", "https://tars.rta.ae/apps/business/en/rentals/new"]);
  if (browser(["get", "url"]).includes("login.rta.ae")) {
    throw new Error("TARS login is required. Complete it interactively in the rma-tars agent-browser session, then rerun.");
  }
  waitForStep("vehicle-step");
  const existingDocument = findExistingDocument(handoff);
  if (existingDocument) {
    outputResult({ status: "succeeded", documentNumber: existingDocument, summary: "Existing TARS agreement reconciled; no duplicate was submitted." }, json);
    return;
  }
  selectVehicle(handoff);
  selectCustomer(handoff);
  prepareContractDetails(handoff, contractPath);
  submitCurrentStep();
  waitForStep("summary-step");
  const result = finishAutomaticSubmission(handoff, submit, dryRun);
  if (submit || dryRun || json) outputResult(result, json);
  else {
    console.log(browser(["get", "text", "body"]));
    console.log("\nREADY FOR HUMAN REVIEW — the script stopped at Summary and did not submit the contract.");
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
