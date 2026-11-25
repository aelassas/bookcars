import { handleJivoPost } from "../handler";

// Bot API variant: Jivo posts to `{bot_endpoint}/{token}` — the token arrives
// as a PATH segment, not a query param. Same handler, same auth.
export async function POST(req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  return handleJivoPost(req, token);
}
