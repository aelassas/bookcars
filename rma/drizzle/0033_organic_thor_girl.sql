CREATE INDEX "customer_company_idx" ON "customer" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "lease_company_idx" ON "lease" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "rental_company_idx" ON "rental" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "task_company_idx" ON "task" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "vehicle_company_idx" ON "vehicle" USING btree ("company_id");--> statement-breakpoint
CREATE POLICY "customer_company_scope" ON "customer" AS RESTRICTIVE FOR ALL TO public USING ((
  coalesce(current_setting('app.is_cross', true), 'off') = 'on'
  OR coalesce(current_setting('app.company_ids', true), '') = ''
  OR company_id IS NULL
  OR company_id = ANY (string_to_array(current_setting('app.company_ids', true), ',')::uuid[])
)) WITH CHECK ((
  coalesce(current_setting('app.is_cross', true), 'off') = 'on'
  OR coalesce(current_setting('app.company_ids', true), '') = ''
  OR company_id IS NULL
  OR company_id = ANY (string_to_array(current_setting('app.company_ids', true), ',')::uuid[])
));--> statement-breakpoint
CREATE POLICY "lease_company_scope" ON "lease" AS RESTRICTIVE FOR ALL TO public USING ((
  coalesce(current_setting('app.is_cross', true), 'off') = 'on'
  OR coalesce(current_setting('app.company_ids', true), '') = ''
  OR company_id IS NULL
  OR company_id = ANY (string_to_array(current_setting('app.company_ids', true), ',')::uuid[])
)) WITH CHECK ((
  coalesce(current_setting('app.is_cross', true), 'off') = 'on'
  OR coalesce(current_setting('app.company_ids', true), '') = ''
  OR company_id IS NULL
  OR company_id = ANY (string_to_array(current_setting('app.company_ids', true), ',')::uuid[])
));--> statement-breakpoint
CREATE POLICY "rental_company_scope" ON "rental" AS RESTRICTIVE FOR ALL TO public USING ((
  coalesce(current_setting('app.is_cross', true), 'off') = 'on'
  OR coalesce(current_setting('app.company_ids', true), '') = ''
  OR company_id IS NULL
  OR company_id = ANY (string_to_array(current_setting('app.company_ids', true), ',')::uuid[])
)) WITH CHECK ((
  coalesce(current_setting('app.is_cross', true), 'off') = 'on'
  OR coalesce(current_setting('app.company_ids', true), '') = ''
  OR company_id IS NULL
  OR company_id = ANY (string_to_array(current_setting('app.company_ids', true), ',')::uuid[])
));--> statement-breakpoint
CREATE POLICY "task_company_scope" ON "task" AS RESTRICTIVE FOR ALL TO public USING ((
  coalesce(current_setting('app.is_cross', true), 'off') = 'on'
  OR coalesce(current_setting('app.company_ids', true), '') = ''
  OR company_id IS NULL
  OR company_id = ANY (string_to_array(current_setting('app.company_ids', true), ',')::uuid[])
)) WITH CHECK ((
  coalesce(current_setting('app.is_cross', true), 'off') = 'on'
  OR coalesce(current_setting('app.company_ids', true), '') = ''
  OR company_id IS NULL
  OR company_id = ANY (string_to_array(current_setting('app.company_ids', true), ',')::uuid[])
));--> statement-breakpoint
CREATE POLICY "vehicle_company_scope" ON "vehicle" AS RESTRICTIVE FOR ALL TO public USING ((
  coalesce(current_setting('app.is_cross', true), 'off') = 'on'
  OR coalesce(current_setting('app.company_ids', true), '') = ''
  OR company_id IS NULL
  OR company_id = ANY (string_to_array(current_setting('app.company_ids', true), ',')::uuid[])
)) WITH CHECK ((
  coalesce(current_setting('app.is_cross', true), 'off') = 'on'
  OR coalesce(current_setting('app.company_ids', true), '') = ''
  OR company_id IS NULL
  OR company_id = ANY (string_to_array(current_setting('app.company_ids', true), ',')::uuid[])
));