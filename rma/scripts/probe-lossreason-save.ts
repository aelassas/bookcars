// Probe: reproduce the Settings UI "save new loss-reason option" on the rental workspace.
// Usage: npx tsx scripts/probe-lossreason-save.ts          -> adds ZZ_PROBE_TMP and prints the server response
//        npx tsx scripts/probe-lossreason-save.ts --revert -> removes any ZZ_* options
import { config } from "dotenv";
config({ path: ".env.local" });

const base = (process.env.TWENTY_RENTAL_BASE_URL || "http://localhost:3002").replace(/\/$/, "");
const key = process.env.TWENTY_RENTAL_API_KEY;
if (!key) throw new Error("TWENTY_RENTAL_API_KEY missing");

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(`${base}/rest/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, text };
}

async function main() {
  const list = await call("GET", "metadata/fields?limit=500");
  if (list.status !== 200) {
    console.log("LIST FAILED", list.status, list.text.slice(0, 400));
    return;
  }
  const parsed = JSON.parse(list.text);
  const fields = Array.isArray(parsed.data) ? parsed.data : parsed.data?.fields ?? parsed.fields;
  if (!Array.isArray(fields)) {
    console.log("LIST SHAPE:", list.text.slice(0, 600));
    return;
  }
  const f = fields.find((x: any) => x.name === "lossReason");
  if (!f) {
    console.log("no lossReason field found");
    return;
  }
  console.log("field id", f.id, "options:", f.options.length);
  const revert = process.argv.includes("--revert");
  let options;
  if (revert) {
    options = f.options.filter((o: any) => !String(o.value).startsWith("ZZ_"));
    console.log("revert mode: keeping", options.length, "of", f.options.length, "options");
  } else {
    options = f.options;
    options.push({
      label: "ZZ Probe Tmp",
      value: "ZZ_PROBE_TMP",
      color: "gray",
      position: f.options.length,
    });
  }
  const patch = await call("PATCH", `metadata/fields/${f.id}`, { options });
  console.log("PATCH status:", patch.status);
  if (patch.status !== 200) {
    console.log(patch.text.slice(0, 1500));
  } else {
    console.log("saved options count:", JSON.parse(patch.text).options?.length);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
