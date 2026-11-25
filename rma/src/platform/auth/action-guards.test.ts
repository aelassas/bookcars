import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

/**
 * Guards against the vulnerability class that produced 13 findings on
 * 2026-07-25.
 *
 * A `"use server"` export is invoked by POSTing any app URL with a
 * `Next-Action` header, so a function taking `tenantId` as its first argument
 * and handing it to `withDrizzleTenant(tenantId, …)` lets ANY logged-in user
 * of ANY tenant read or write another tenant's data. RLS does not help: it
 * obediently scopes to whatever tenant id the caller supplied.
 *
 * The rule is therefore mechanical — authorize the PASSED tenantId — which
 * makes it checkable. This test reads the source with the TypeScript compiler
 * rather than grepping, so it sees real call expressions and not comments or
 * strings.
 *
 * The trap it specifically catches: `canManageCRM()` (no argument) resolves
 * the caller's FIRST membership and never looks at the passed tenantId, so the
 * role check passes on the attacker's own tenant while the query runs against
 * the victim's. Only the `*ForTenant(tenantId)` variants count.
 */

const SRC = join(import.meta.dirname, "../../");

/**
 * Calls that authorize the caller against a specific tenant. The `can*ForTenant`
 * pattern is deliberately broad — it covers canManageCRMForTenant as well as
 * narrower gates like canCloseDealForTenant — because the naming convention
 * itself carries the guarantee: the ForTenant suffix means the helper takes a
 * tenant id and checks membership in THAT tenant.
 */
const TENANT_BOUND_GUARDS = [
  /^can[A-Za-z]+ForTenant$/,
  /^requireRoleForTenant$/,
  /^requireTenantAdmin$/,
  /^getTenantRoles$/,
  /^getUserScope$/,
  /^verifyAdmin$/,
  /^assertTenantMember$/,
];

/** Platform-admin gates authorize across all tenants, which is stricter. */
const GLOBAL_GUARDS = [/^requirePlatformAdmin$/, /^isPlatformAdmin$/];

/**
 * Exports that legitimately take a tenantId without a guard, each with the
 * reason it is safe. Adding an entry here is a security decision: it must be
 * justified, not used to silence the test.
 */
const ALLOWLIST = new Map<string, string>([
  // Reads are scoped to the session's own email inside the query, so a caller
  // passing someone else's tenantId still only ever sees their own rows.
  ["modules/portal/queries.ts", "customer portal — rows filtered by session email"],
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full) && !/\.test\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

function isUseServerFile(source: ts.SourceFile): boolean {
  // "use server" must be the first statement to apply to the whole module.
  const first = source.statements[0];
  if (!first || !ts.isExpressionStatement(first)) return false;
  return ts.isStringLiteral(first.expression) && first.expression.text === "use server";
}

/** Name of the callee for `foo()` and `obj.foo()`, else null. */
function calleeName(node: ts.CallExpression): string | null {
  if (ts.isIdentifier(node.expression)) return node.expression.text;
  if (ts.isPropertyAccessExpression(node.expression)) return node.expression.name.text;
  return null;
}

/**
 * True for a thin wrapper whose whole body is `return other(tenantId, …)`.
 *
 * Such a wrapper is safe exactly when its delegate is — and the delegate, being
 * an export of the same module, is checked by this test in its own right. So
 * accepting the delegation is not a hole; requiring a second guard here would
 * push people to double-authorize, which is noise, not safety.
 */
function delegatesTenant(fn: ts.FunctionDeclaration, tenantParam: string): boolean {
  const body = fn.body;
  if (!body || body.statements.length !== 1) return false;

  const only = body.statements[0];
  if (!ts.isReturnStatement(only) || !only.expression) return false;

  let call: ts.Expression = only.expression;
  if (ts.isAwaitExpression(call)) call = call.expression;
  if (!ts.isCallExpression(call)) return false;

  return call.arguments.some((arg) => ts.isIdentifier(arg) && arg.text === tenantParam);
}

function hasTenantGuard(fn: ts.FunctionDeclaration, tenantParam: string): boolean {
  if (delegatesTenant(fn, tenantParam)) return true;

  let guarded = false;

  const visit = (node: ts.Node): void => {
    if (guarded) return;
    if (ts.isCallExpression(node)) {
      const name = calleeName(node);
      if (name) {
        if (GLOBAL_GUARDS.some((re) => re.test(name))) {
          guarded = true;
          return;
        }
        if (TENANT_BOUND_GUARDS.some((re) => re.test(name))) {
          // The guard must receive the SAME identifier the query will use —
          // guarding a different tenant id is the bug, not the fix.
          const passesTenant = node.arguments.some(
            (arg) => ts.isIdentifier(arg) && arg.text === tenantParam,
          );
          if (passesTenant) {
            guarded = true;
            return;
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  if (fn.body) visit(fn.body);
  return guarded;
}

describe("every tenantId-taking server action authorizes that tenant", () => {
  const offenders: string[] = [];
  const checked: string[] = [];

  for (const file of walk(SRC)) {
    const text = readFileSync(file, "utf8");
    if (!text.includes("use server")) continue;

    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    if (!isUseServerFile(source)) continue;

    const rel = relative(SRC, file);
    if (ALLOWLIST.has(rel)) continue;

    for (const statement of source.statements) {
      if (!ts.isFunctionDeclaration(statement) || !statement.name) continue;
      const exported = statement.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.ExportKeyword,
      );
      if (!exported) continue;

      const firstParam = statement.parameters[0];
      if (!firstParam || !ts.isIdentifier(firstParam.name)) continue;
      const paramName = firstParam.name.text;
      if (paramName !== "tenantId") continue;

      const label = `${rel} → ${statement.name.text}()`;
      checked.push(label);
      if (!hasTenantGuard(statement, paramName)) offenders.push(label);
    }
  }

  it("finds the server actions it is meant to police", () => {
    // If a refactor renames the parameter or moves to arrow-function exports,
    // this test would silently pass while checking nothing.
    expect(checked.length).toBeGreaterThan(20);
  });

  it("has no unguarded tenantId-from-client action", () => {
    expect(
      offenders,
      offenders.length
        ? `These take tenantId from the caller but never authorize it, so any ` +
          `logged-in user of any tenant can invoke them against another ` +
          `tenant's data:\n  ${offenders.join("\n  ")}\n\n` +
          `Add the module's canManage*ForTenant(tenantId) as the first ` +
          `statement — NOT the unbound canManage*() variant, which checks the ` +
          `caller's own tenant and not the one passed in.`
        : undefined,
    ).toEqual([]);
  });
});
