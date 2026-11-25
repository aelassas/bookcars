-- ADR-001 §16: trigger-based _history tables for tenant-scoped tables.
-- Portable across hosts (no extension dependency).

CREATE OR REPLACE FUNCTION write_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
    EXECUTE format(
      'INSERT INTO %I_history SELECT $1.*, now(), %L',
      TG_TABLE_NAME, TG_OP
    ) USING OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- History tables mirror their source tables + valid_until + op
CREATE TABLE IF NOT EXISTS vehicle_history (LIKE vehicle INCLUDING ALL, valid_until timestamptz, op text);
CREATE TABLE IF NOT EXISTS rental_history (LIKE rental INCLUDING ALL, valid_until timestamptz, op text);
CREATE TABLE IF NOT EXISTS lead_history (LIKE lead INCLUDING ALL, valid_until timestamptz, op text);
CREATE TABLE IF NOT EXISTS deal_history (LIKE deal INCLUDING ALL, valid_until timestamptz, op text);
CREATE TABLE IF NOT EXISTS customer_history (LIKE customer INCLUDING ALL, valid_until timestamptz, op text);
CREATE TABLE IF NOT EXISTS message_history (LIKE message INCLUDING ALL, valid_until timestamptz, op text);
CREATE TABLE IF NOT EXISTS task_history (LIKE task INCLUDING ALL, valid_until timestamptz, op text);

-- Drop existing triggers to make migration idempotent, then recreate
DROP TRIGGER IF EXISTS vehicle_history_t ON vehicle;
CREATE TRIGGER vehicle_history_t AFTER UPDATE OR DELETE ON vehicle
  FOR EACH ROW EXECUTE FUNCTION write_history();

DROP TRIGGER IF EXISTS rental_history_t ON rental;
CREATE TRIGGER rental_history_t AFTER UPDATE OR DELETE ON rental
  FOR EACH ROW EXECUTE FUNCTION write_history();

DROP TRIGGER IF EXISTS lead_history_t ON lead;
CREATE TRIGGER lead_history_t AFTER UPDATE OR DELETE ON lead
  FOR EACH ROW EXECUTE FUNCTION write_history();

DROP TRIGGER IF EXISTS deal_history_t ON deal;
CREATE TRIGGER deal_history_t AFTER UPDATE OR DELETE ON deal
  FOR EACH ROW EXECUTE FUNCTION write_history();

DROP TRIGGER IF EXISTS customer_history_t ON customer;
CREATE TRIGGER customer_history_t AFTER UPDATE OR DELETE ON customer
  FOR EACH ROW EXECUTE FUNCTION write_history();

DROP TRIGGER IF EXISTS message_history_t ON message;
CREATE TRIGGER message_history_t AFTER UPDATE OR DELETE ON message
  FOR EACH ROW EXECUTE FUNCTION write_history();

DROP TRIGGER IF EXISTS task_history_t ON task;
CREATE TRIGGER task_history_t AFTER UPDATE OR DELETE ON task
  FOR EACH ROW EXECUTE FUNCTION write_history();
