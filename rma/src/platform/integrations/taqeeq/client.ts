const BASE = process.env.DOCUSEAL_URL?.trim() || "https://app.taqeeq.ae";
const TOKEN = process.env.DOCUSEAL_API_TOKEN;

export type TaqeeqSubmitter = {
  submission_id: number;
  slug: string;
  status: string;
  completed_at: string | null;
};

export type TaqeeqSubmission = {
  id: number;
  status: string;
  submitters: TaqeeqSubmitter[];
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (!TOKEN) throw new Error("DOCUSEAL_API_TOKEN is not configured for RMA");
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    signal: AbortSignal.timeout(30_000),
    headers: {
      "X-Auth-Token": TOKEN,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Taqeeq ${path} failed: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

export async function createRentalSignatureRequest(input: { email: string; name: string }) {
  const templateId = Number(process.env.DOCUSEAL_TEMPLATE_ID);
  if (!Number.isInteger(templateId) || templateId <= 0) throw new Error("DOCUSEAL_TEMPLATE_ID is not configured for the RMA rental contract");
  const submitters = await api<TaqeeqSubmitter[]>("/submissions", {
    method: "POST",
    body: JSON.stringify({
      template_id: templateId,
      send_email: true,
      submitters: [{ email: input.email, name: input.name, role: process.env.DOCUSEAL_SUBMITTER_ROLE?.trim() || "Client" }],
    }),
  });
  const submitter = submitters[0];
  if (!submitter) throw new Error("Taqeeq created no signer for the rental contract");
  return submitter;
}

export function getRentalSubmission(id: string) {
  if (!/^\d+$/.test(id)) throw new Error("Invalid Taqeeq submission ID");
  return api<TaqeeqSubmission>(`/submissions/${id}`);
}

export function taqeeqSigningUrl(slug: string) {
  return `${BASE}/s/${encodeURIComponent(slug)}`;
}

export function taqeeqSignedAt(submission: TaqeeqSubmission, now = new Date()): Date | null {
  if (submission.submitters.length === 0 || submission.submitters.some((s) => s.status !== "completed")) return null;
  const completed = submission.submitters
    .map((s) => (s.completed_at ? Date.parse(s.completed_at) : NaN))
    .filter(Number.isFinite);
  return completed.length > 0 ? new Date(Math.max(...completed)) : now;
}
