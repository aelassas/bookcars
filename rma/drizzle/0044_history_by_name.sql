-- 0044_history_by_name.sql
--
-- Make the audit trigger survive schema changes.
--
-- write_history() copied rows positionally:
--
--     INSERT INTO %I_history SELECT $1.*, now(), %L
--
-- which silently assumes the history table repeats the source table's columns
-- in the exact same ordinal order, followed by valid_until and op. Adding one
-- column to a source table therefore breaks every UPDATE and DELETE on it with
-- "INSERT has more expressions than target columns" — and Postgres cannot add a
-- column in the middle of a table, so the positional contract cannot be restored
-- by an ALTER either.
--
-- This is not hypothetical: adding vehicle.sheet_brand_key (0043) broke every
-- vehicle UPDATE, which is how the fleet importer started failing. The same trap
-- is armed on customer, deal, lead, message, rental and task.
--
-- Copying by NAME removes the ordering dependency. Columns present in both
-- tables are copied; a column that exists only on the source is skipped rather
-- than crashing the write. The cost is that a new column is not historised until
-- it is added to the history table too — a gap in the audit trail is recoverable,
-- a table that rejects all updates is not.

CREATE OR REPLACE FUNCTION write_history() RETURNS trigger AS $fn$
DECLARE
  cols text;
  sel  text;
BEGIN
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
    -- Columns the history table and the source table share, in the history
    -- table's own order. valid_until/op are the history table's own bookkeeping.
    SELECT string_agg(quote_ident(h.column_name), ', ' ORDER BY h.ordinal_position),
           string_agg(format('($1).%I', h.column_name), ', ' ORDER BY h.ordinal_position)
      INTO cols, sel
      FROM information_schema.columns h
     WHERE h.table_schema = TG_TABLE_SCHEMA
       AND h.table_name   = TG_TABLE_NAME || '_history'
       AND h.column_name NOT IN ('valid_until', 'op')
       AND EXISTS (
             SELECT 1 FROM information_schema.columns s
              WHERE s.table_schema = TG_TABLE_SCHEMA
                AND s.table_name   = TG_TABLE_NAME
                AND s.column_name  = h.column_name);

    IF cols IS NOT NULL THEN
      EXECUTE format(
        'INSERT INTO %I_history (%s, valid_until, op) SELECT %s, now(), %L',
        TG_TABLE_NAME, cols, sel, TG_OP
      ) USING OLD;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$fn$ LANGUAGE plpgsql;

-- Now that the copy is name-based, the new column can be historised as well.
ALTER TABLE vehicle_history ADD COLUMN IF NOT EXISTS sheet_brand_key text;
