import { handleJivoPost } from "./handler";

// JivoChat webhook receiver — see handler.ts. This path takes the shared
// secret as `?token=` (the Webhooks API URL field takes a full URL); the
// [token] sibling takes it as a path segment (the Bot API posts to
// `{bot_endpoint}/{token}`).
export async function POST(req: Request) {
  return handleJivoPost(req, null);
}
