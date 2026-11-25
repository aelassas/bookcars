// Ad-hoc RTA fines lookup from the CLI.
//
//   npx tsx scripts/rta-fines.ts <sourceCode> <plateCategory> <plateCode> <plateNo>
//   npx tsx scripts/rta-fines.ts DXB PRIVATE M 50154
//
// Prints the payable fines for one plate as a small table. Proves the
// connector end-to-end and doubles as the lookup the Telegram bot shells out
// to until it is wired in-process.

import { lookupFines } from "../src/platform/integrations/rta/client";

async function main() {
  const [sourceCode, plateCategory, plateCode, plateNo] = process.argv.slice(2);
  if (!sourceCode || !plateCategory || !plateNo) {
    console.error(
      "usage: tsx scripts/rta-fines.ts <sourceCode> <plateCategory> <plateCode> <plateNo>\n" +
        "  e.g. tsx scripts/rta-fines.ts DXB PRIVATE M 50154",
    );
    process.exit(2);
  }

  const result = await lookupFines({
    sourceCode,
    plateCategory,
    plateCode: plateCode ?? "",
    plateNo,
  });

  const { fines, totalAmount, totalBlackPoints } = result;
  if (fines.length === 0) {
    console.log(`No payable fines for ${sourceCode} ${plateCategory} ${plateCode} ${plateNo}. ✅`);
    return;
  }

  console.log(
    `${fines.length} fine(s) — ${totalAmount} AED, ${totalBlackPoints} black point(s):\n`,
  );
  for (const f of fines) {
    const date = f.ticketDate ? f.ticketDate.slice(0, 10) : "—";
    console.log(
      `  • ${f.amount} AED  ${date}  ${f.source}\n    ${f.description || "(no description)"}` +
        (f.referenceNo ? `  [ref ${f.referenceNo}]` : ""),
    );
  }
  if (fines[0]?.car) console.log(`\n  car: ${fines[0].car}`);
}

main().catch((e) => {
  console.error("RTA lookup failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
