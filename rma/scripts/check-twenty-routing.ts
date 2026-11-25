import { config } from "dotenv";
config({ path: ".env.local" });
import { twentyInstanceForTenantSlug, resolveTwentyInstance } from "@/platform/integrations/twenty/instance";

for (const slug of ["take-auto", "cardiwan", "easyrent", "etm"]) {
  const key = twentyInstanceForTenantSlug(slug);
  const cfg = resolveTwentyInstance(key);
  console.log(
    `${slug.padEnd(10)} -> instance=${key.padEnd(8)} url=${cfg.baseUrl.padEnd(24)} live=${cfg.configured}`
  );
}
