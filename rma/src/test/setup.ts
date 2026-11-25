import { config } from "dotenv";
config({ path: ".env.local" });

// day-note's media lines mint /api/media links; tests have no real secret.
process.env.MEDIA_TOKEN_SECRET ||= "vitest-media-secret";
