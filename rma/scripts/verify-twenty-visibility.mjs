// Prove the brand separation actually holds, by logging in as each of the six
// and counting what they can see — not by reading the role config back.
//
// A role that LOOKS right in the settings screen and a role that actually
// filters are different claims. This script only makes the second one.
//
//   node scripts/verify-twenty-visibility.mjs
//
// Exit code 1 if any expectation fails, so it can gate a deploy.
import { readFileSync } from "node:fs";

const BASE = process.env.TWENTY_BASE_URL ?? "http://localhost:3001";
const PASSWORD = process.env.TWENTY_TEST_PASSWORD ?? "12345678";

// Who should see which brands. `null` = everything, including unbranded.
const EXPECTED = [
  { email: "azat@takeauto.com", brands: ["takeauto"] },
  { email: "firuz@takeauto.com", brands: ["takeauto"] },
  { email: "abdullah@cardiwan.com", brands: ["cardiwan"] },
  { email: "ali@etm.com", brands: ["cardiwan", "easyrent"] },
  { email: "babek@easyrent.com", brands: ["cardiwan", "easyrent"] },
  { email: "moe@takeauto.com", brands: null },
];

const ALL_BRANDS = ["takeauto", "cardiwan", "easyrent"];

function apiKey() {
  // The env var wins: with one instance per brand, a script that always
  // read .env.local would aim the sales key at whichever brand's URL it was
  // pointed to and quietly do the wrong thing.
  if (process.env.TWENTY_API_KEY?.trim()) return process.env.TWENTY_API_KEY.trim();
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const line = env.split("\n").find((l) => l.startsWith("TWENTY_API_KEY="));
  if (!line) throw new Error("TWENTY_API_KEY missing from .env.local");
  return line.slice("TWENTY_API_KEY=".length).trim().replace(/^"|"$/g, "");
}

async function gql(endpoint, query, variables, token) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(60_000),
  });
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors).slice(0, 300));
  return body.data;
}

/** Sign in as a real user and exchange the login token for a workspace token. */
async function signIn(email) {
  const d = await gql(
    "/metadata",
    `mutation ($e: String!, $p: String!, $o: String!) {
       getLoginTokenFromCredentials(email: $e, password: $p, origin: $o) {
         loginToken { token }
       }
     }`,
    { e: email, p: PASSWORD, o: BASE }
  );
  const loginToken = d.getLoginTokenFromCredentials.loginToken.token;
  const t = await gql(
    "/metadata",
    `mutation ($t: String!, $o: String!) {
       getAuthTokensFromLoginToken(loginToken: $t, origin: $o) {
         tokens { accessOrWorkspaceAgnosticToken { token } }
       }
     }`,
    { t: loginToken, o: BASE }
  );
  return t.getAuthTokensFromLoginToken.tokens.accessOrWorkspaceAgnosticToken.token;
}

/** How many people of a given brand can this token see? */
async function countPeopleOfBrand(token, brand) {
  const d = await gql(
    "/graphql",
    `query ($f: PersonFilterInput) { people(filter: $f) { totalCount } }`,
    { f: { brandLine: { eq: brand } } },
    token
  );
  return d.people.totalCount;
}

async function countAllPeople(token) {
  const d = await gql("/graphql", `{ people { totalCount } }`, {}, token);
  return d.people.totalCount;
}

/** Ground truth, read with the admin API key — what SHOULD be visible. */
async function truthByBrand() {
  const key = apiKey();
  const out = {};
  for (const brand of ALL_BRANDS) {
    const d = await gql(
      "/graphql",
      `query ($f: PersonFilterInput) { people(filter: $f) { totalCount } }`,
      { f: { brandLine: { eq: brand } } },
      key
    );
    out[brand] = d.people.totalCount;
  }
  return out;
}

async function main() {
  const truth = await truthByBrand();
  console.log("ground truth (people per brand):", truth);

  let failures = 0;
  for (const { email, brands } of EXPECTED) {
    let token;
    try {
      token = await signIn(email);
    } catch (e) {
      console.log(`FAIL  ${email} — cannot sign in: ${String(e.message).slice(0, 120)}`);
      failures++;
      continue;
    }

    const total = await countAllPeople(token);
    const seen = {};
    for (const brand of ALL_BRANDS) seen[brand] = await countPeopleOfBrand(token, brand);

    const allowed = brands ?? ALL_BRANDS;
    const forbidden = ALL_BRANDS.filter((b) => !allowed.includes(b));

    const leaks = forbidden.filter((b) => seen[b] > 0);
    // A role that sees nothing at all is not "safe", it is broken — the person
    // cannot work. Both directions are failures.
    const blind = allowed.filter((b) => truth[b] > 0 && seen[b] === 0);

    if (leaks.length === 0 && blind.length === 0) {
      console.log(`OK    ${email}  total=${total}  ${JSON.stringify(seen)}`);
    } else {
      failures++;
      if (leaks.length) console.log(`FAIL  ${email} SEES FOREIGN BRAND: ${leaks.map((b) => `${b}=${seen[b]}`).join(", ")}`);
      if (blind.length) console.log(`FAIL  ${email} sees NOTHING of its own brand: ${blind.join(", ")}`);
    }
  }

  if (failures > 0) {
    console.log(`\n${failures} of ${EXPECTED.length} logins are wrong — do NOT invite the team yet.`);
    process.exit(1);
  }
  console.log(`\nall ${EXPECTED.length} logins verified`);
}

main().catch((e) => {
  console.error(String(e.message ?? e));
  process.exit(1);
});
