# Parkin and Parkonic charge feeds

## What is implemented

- Separate `parkin` and `parkonic` connectors write to the existing `rental_charge` ledger.
- Assignment uses normalized plate plus the event timestamp, including late events after return. If two VINs share a plate, exactly one covering rental must identify the vehicle; otherwise the row is reported instead of guessed.
- `(tenant, operator, reference)` is idempotent. API and CSV rows can safely overlap.
- `scripts/run-rental-operations.ts --commit --sync-parking` (run standalone scripts with `npx tsx --conditions=react-server`) pulls both operators. The production timer includes this flag.
- Managers can sync a selected car or upload a CSV on `/charges`. Bulk feed/CSV imports never queue customer WhatsApp messages automatically; existing manager-controlled notification and statement rules remain in force.
- Every outbound API call has a 30-second timeout. API errors and row-level assignment errors are returned and logged by the scheduler.

## Access the client must provide

No official public Parkin or Parkonic transaction-history API documentation or RMA operator credentials were available when this connector was built. The official consumer sites ([Parkin](https://www.parkin.ae/) and [Parkonic payment portal](https://pay.parkonic.com/)) do not by themselves authorize automated access.

For each operator, RMA must obtain from its account manager:

1. A corporate/fleet account that covers the RMA plates and is explicitly approved for automated transaction export.
2. The official transaction-history API endpoint and schema documentation, plus a bearer token with read-only access to reference, plate, event time, amount, location and description. Confirm rate limits, retention and the correct Dubai timezone.
3. If there is no API, a scheduled CSV export delivered by the operator, with the same fields and a stable unique reference for every transaction. Agree the delivery path and retention with the operator; do not scrape a consumer portal without written authorization.
4. A sandbox/test plate or a small RMA-only test account for the first authenticated pull. No real customer notification should be enabled during that validation.

If the official API schema differs from the normalized envelope below, the client must provide the schema so the operator-specific mapping can be added at the connector boundary. The current code deliberately does not claim compatibility with undocumented endpoints.

## Authenticated JSON connector

Set server-only environment variables (never commit them):

```text
PARKIN_API_URL=https://<official-parkin-endpoint>
PARKIN_API_TOKEN=<read-only token>
PARKONIC_API_URL=https://<official-parkonic-endpoint>
PARKONIC_API_TOKEN=<read-only token>
```

The connector sends `GET <url>?from=<ISO>&to=<ISO>` with `Authorization: Bearer …` and `Accept: application/json`. It accepts either a JSON array or `{ "events": [...] }`, where every event is:

```json
{
  "reference": "operator-unique-transaction-id",
  "plate": "A 12345",
  "occurredAt": "2026-11-21T10:15:00+04:00",
  "amount": 4.50,
  "location": "Zone A, bay 4",
  "description": "Hourly parking"
}
```

`occurredAt` must include `Z` or an explicit numeric timezone. Amounts retain two decimal places.

## CSV fallback

For scheduled server-side imports, set `PARKING_IMPORT_DIR` to a private readable directory and place `parkin.csv` and/or `parkonic.csv` there. The same files can be uploaded manually on `/charges` without server filesystem access.

Header (the last two columns are optional):

```csv
reference,plate,occurredAt,amount,location,description
P-123,A 12345,2026-11-21T10:15:00+04:00,4.50,"Zone A, bay 4",Hourly parking
```

Rows with unknown plates, no covering rental, ambiguous duplicate plates or invalid timestamps/amounts are reported and are not assigned to a guessed customer. Re-importing the same file creates no duplicates.
