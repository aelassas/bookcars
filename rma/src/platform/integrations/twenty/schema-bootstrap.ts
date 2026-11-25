// Idempotent schema bootstrap for the self-hosted Twenty workspace.
//
// Creates ONLY what is missing: existing objects/fields (matched by name) are
// left untouched, so running it twice creates nothing the second time. Field
// types are derived from our canonical Drizzle schema (platform/db/schema.ts);
// SELECT option sets come from the status enums documented in its comments.

import type {
  TwentyClient,
  TwentyCreateFieldInput,
  TwentyCreateObjectInput,
  TwentyFieldMetadata,
  TwentySelectOption,
} from "./client";

export interface BootstrapResult {
  /** nameSingular of objects created on this run. */
  objectsCreated: string[];
  /** "<object>.<field>" of fields created on this run. */
  fieldsCreated: string[];
  /** "<object>" / "<object>.<field>" already present — left untouched. */
  alreadyPresent: string[];
}

// ─── Desired schema ─────────────────────────────────────────────────────────

type FieldType = TwentyCreateFieldInput["type"];

interface DesiredField {
  name: string;
  label: string;
  type: FieldType;
  description?: string;
  icon?: string;
  options?: TwentySelectOption[];
  /** RELATION target — resolved to an objectMetadataId at bootstrap time. */
  relation?: { targetObject: string; targetFieldLabel: string };
}

interface DesiredObject {
  input: TwentyCreateObjectInput;
  fields: DesiredField[];
}

/**
 * The stage-transition audit object. Nothing wrote to it until the Bitrix
 * semantic mirror (2026-08): the mirror now records one row per observed
 * deal stage move, idempotent by `externalId` = deal:<id>:<MOVED_TIME>.
 * Exported so scripts/create-bitrix-mirror-twenty-fields.ts can ensure the
 * object (and the two mirror-facing fields) without running the full bootstrap.
 */
export const STAGE_EVENT_OBJECT: DesiredObject = {
  input: {
    nameSingular: "stageEvent",
    namePlural: "stageEvents",
    labelSingular: "Stage Event",
    labelPlural: "Stage Events",
    description: "Audit trail of pipeline stage transitions — who moved what, when",
    icon: "IconHistory",
  },
  fields: [
    { name: "dealType", label: "Deal Type", type: "SELECT", icon: "IconGitBranch", options: selectOptions(["lease", "rent"]) },
    { name: "leaseDeal", label: "Lease Deal", type: "RELATION", icon: "IconChartBar", relation: { targetObject: "leaseDeal", targetFieldLabel: "Stage History" } },
    { name: "rentDeal", label: "Rent Deal", type: "RELATION", icon: "IconKey", relation: { targetObject: "rentDeal", targetFieldLabel: "Stage History" } },
    { name: "fromStage", label: "From Stage", type: "TEXT", icon: "IconArrowLeft" },
    { name: "toStage", label: "To Stage", type: "TEXT", icon: "IconArrowRight" },
    { name: "changedBy", label: "Changed By", type: "TEXT", icon: "IconUser" },
    { name: "changedAt", label: "Changed At", type: "DATE_TIME", icon: "IconCalendarTime" },
    // Mirror-facing (2026-08): the idempotency key and the opportunity the
    // transition belongs to (the mirror writes opportunities, not
    // leaseDeal/rentDeal rows).
    { name: "externalId", label: "External ID", type: "TEXT", icon: "IconLink" },
    { name: "opportunity", label: "Opportunity", type: "RELATION", icon: "IconBriefcase", relation: { targetObject: "opportunity", targetFieldLabel: "Stage Events" } },
  ],
};

function selectOptions(values: string[]): TwentySelectOption[] {
  // Twenty validates option VALUES as UPPER_SNAKE_CASE (400 INVALID_FIELD_INPUT
  // on lowercase). Labels stay human; values get uppercased here — and the
  // mirror layer must write the same UPPER_SNAKE values into records.
  return values.map((value, position) => ({
    label: value
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    value: value.toUpperCase(),
    position,
  }));
}

// All fields are created isNullable: the Twenty workspace is a MIRROR of the
// platform DB, and a partially-synced row (e.g. a vehicle whose GPS fields
// have not landed yet) must not fail the insert.
const CUSTOM_OBJECTS: DesiredObject[] = [
  {
    input: {
      nameSingular: "vehicle",
      namePlural: "vehicles",
      labelSingular: "Vehicle",
      labelPlural: "Vehicles",
      description: "Fleet vehicle — mirrors platform vehicle table",
      icon: "IconCar",
    },
    fields: [
      { name: "plate", label: "Plate", type: "TEXT", icon: "IconLicense" },
      { name: "make", label: "Make", type: "TEXT", icon: "IconTag" },
      { name: "model", label: "Model", type: "TEXT", icon: "IconTag" },
      { name: "year", label: "Year", type: "NUMBER", icon: "IconCalendar" },
      // schema.ts: division "rent | lease"
      { name: "division", label: "Division", type: "SELECT", icon: "IconGitBranch", options: selectOptions(["rent", "lease"]) },
      // schema.ts: status "available | on_rent | reserved | in_service | overdue"
      {
        name: "status",
        label: "Status",
        type: "SELECT",
        icon: "IconFlag",
        options: selectOptions(["available", "on_rent", "reserved", "in_service", "overdue"]),
      },
      { name: "dailyRate", label: "Daily Rate", type: "NUMBER", icon: "IconCurrencyDollar" },
      { name: "odometer", label: "Odometer", type: "NUMBER", icon: "IconGauge" },
      { name: "gpsBlocked", label: "GPS Blocked", type: "BOOLEAN", icon: "IconLock" },
      { name: "imei", label: "IMEI", type: "TEXT", icon: "IconDeviceMobile" },
      { name: "externalId", label: "External ID", type: "TEXT", icon: "IconLink" },
    ],
  },
  {
    input: {
      nameSingular: "booking",
      namePlural: "bookings",
      labelSingular: "Booking",
      labelPlural: "Bookings",
      description: "Reservation holding a vehicle for a customer",
      icon: "IconCalendarEvent",
    },
    fields: [
      { name: "vehicle", label: "Vehicle", type: "RELATION", icon: "IconCar", relation: { targetObject: "vehicle", targetFieldLabel: "Bookings" } },
      { name: "customer", label: "Customer", type: "RELATION", icon: "IconUser", relation: { targetObject: "person", targetFieldLabel: "Bookings" } },
      { name: "dateFrom", label: "Date From", type: "DATE_TIME", icon: "IconCalendarTime" },
      { name: "dateTo", label: "Date To", type: "DATE_TIME", icon: "IconCalendarTime" },
      // Channels mirror message.channel in schema.ts.
      {
        name: "channel",
        label: "Channel",
        type: "SELECT",
        icon: "IconMessage",
        options: selectOptions(["whatsapp", "instagram", "facebook", "localrent", "yango", "walk_in"]),
      },
      {
        name: "status",
        label: "Status",
        type: "SELECT",
        icon: "IconFlag",
        options: selectOptions(["pending", "confirmed", "cancelled", "completed"]),
      },
      { name: "deposit", label: "Deposit", type: "NUMBER", icon: "IconCurrencyDollar" },
    ],
  },
  {
    input: {
      nameSingular: "rental",
      namePlural: "rentals",
      labelSingular: "Rental",
      labelPlural: "Rentals",
      description: "Rental contract — mirrors platform rental table",
      icon: "IconKey",
    },
    fields: [
      { name: "customer", label: "Customer", type: "RELATION", icon: "IconUser", relation: { targetObject: "person", targetFieldLabel: "Rentals" } },
      { name: "vehicle", label: "Vehicle", type: "RELATION", icon: "IconCar", relation: { targetObject: "vehicle", targetFieldLabel: "Rentals" } },
      { name: "startDate", label: "Start Date", type: "DATE_TIME", icon: "IconCalendarTime" },
      { name: "returnDate", label: "Return Date", type: "DATE_TIME", icon: "IconCalendarTime" },
      { name: "actualReturnDate", label: "Actual Return Date", type: "DATE_TIME", icon: "IconCalendarDue" },
      { name: "dailyRate", label: "Daily Rate", type: "NUMBER", icon: "IconCurrencyDollar" },
      { name: "totalDays", label: "Total Days", type: "NUMBER", icon: "IconCalendarStats" },
      { name: "deposit", label: "Deposit", type: "NUMBER", icon: "IconCurrencyDollar" },
      { name: "total", label: "Total", type: "NUMBER", icon: "IconCurrencyDollar" },
      { name: "balanceDue", label: "Balance Due", type: "NUMBER", icon: "IconCurrencyDollar" },
      // schema.ts: status "reserved | active | returned | completed | cancelled"
      {
        name: "status",
        label: "Status",
        type: "SELECT",
        icon: "IconFlag",
        options: selectOptions(["reserved", "active", "returned", "completed", "cancelled"]),
      },
      // schema.ts: deposit_status "held | returned | partial | withheld"
      {
        name: "depositStatus",
        label: "Deposit Status",
        type: "SELECT",
        icon: "IconPigMoney",
        options: selectOptions(["held", "returned", "partial", "withheld"]),
      },
    ],
  },
  {
    input: {
      nameSingular: "lease",
      namePlural: "leases",
      labelSingular: "Lease",
      labelPlural: "Leases",
      description: "Lease-to-own contract — mirrors platform lease table",
      icon: "IconContract",
    },
    fields: [
      { name: "customer", label: "Customer", type: "RELATION", icon: "IconUser", relation: { targetObject: "person", targetFieldLabel: "Leases" } },
      { name: "vehicle", label: "Vehicle", type: "RELATION", icon: "IconCar", relation: { targetObject: "vehicle", targetFieldLabel: "Leases" } },
      { name: "contractRef", label: "Contract Ref", type: "TEXT", icon: "IconFileText" },
      { name: "termMonths", label: "Term Months", type: "NUMBER", icon: "IconCalendarStats" },
      { name: "monthlyPayment", label: "Monthly Payment", type: "NUMBER", icon: "IconCurrencyDollar" },
      { name: "balanceDue", label: "Balance Due", type: "NUMBER", icon: "IconCurrencyDollar" },
      // schema.ts: status "draft | active | completed | defaulted | cancelled"
      {
        name: "status",
        label: "Status",
        type: "SELECT",
        icon: "IconFlag",
        options: selectOptions(["draft", "active", "completed", "defaulted", "cancelled"]),
      },
    ],
  },
  {
    input: {
      nameSingular: "leaseDeal",
      namePlural: "leaseDeals",
      labelSingular: "Lease Deal",
      labelPlural: "Lease Deals",
      description: "Leasing pipeline deal (TakeAuto sales) — 15-stage owner-approved process",
      icon: "IconChartBar",
    },
    fields: [
      { name: "customer", label: "Customer", type: "RELATION", icon: "IconUser", relation: { targetObject: "person", targetFieldLabel: "Lease Deals" } },
      { name: "vehicle", label: "Vehicle", type: "RELATION", icon: "IconCar", relation: { targetObject: "vehicle", targetFieldLabel: "Lease Deals" } },
      {
        name: "stage",
        label: "Stage",
        type: "SELECT",
        icon: "IconFlag",
        // Owner regulation, 15 stages + closed-lost. Order matters — it is the
        // kanban column order, so do not reorder without owner sign-off.
        options: selectOptions([
          "new_application",
          "needs_analysis",
          "quote_sent",
          "quote_warmup",
          "meeting_scheduled",
          "docs_requested",
          "sent_to_security",
          "security_approved",
          "price_approval",
          "down_payment",
          "contract",
          "preparation_handover",
          "admin_dept",
          "monthly_cycle",
          "closed_won",
          "closed_lost",
        ]),
      },
      { name: "meetingAt", label: "Meeting At", type: "DATE_TIME", icon: "IconCalendarTime" },
      // JSON checklist keyed by document: emiratesId / drivingLicense /
      // passport / tradeLicense / bankStatement — each { received, verified }.
      { name: "documentsChecklist", label: "Documents Checklist", type: "RAW_JSON", icon: "IconChecklist" },
      {
        name: "paymentMethod",
        label: "Payment Method",
        type: "SELECT",
        icon: "IconCurrencyDollar",
        // Confirmation duty is split by method (owner regulation): on-site
        // cash/card → manager/driver, transfer/crypto → accounting, link → manager.
        options: selectOptions(["cash", "card_on_site", "bank_transfer", "crypto", "payment_link"]),
      },
      { name: "contractRef", label: "Contract Ref", type: "TEXT", icon: "IconFileText" },
      { name: "termMonths", label: "Term Months", type: "NUMBER", icon: "IconCalendarStats" },
      { name: "downPayment", label: "Down Payment", type: "NUMBER", icon: "IconCurrencyDollar" },
      { name: "monthlyPayment", label: "Monthly Payment", type: "NUMBER", icon: "IconCurrencyDollar" },
      { name: "residualValue", label: "Residual Value", type: "NUMBER", icon: "IconCurrencyDollar" },
      { name: "totalValue", label: "Total Value", type: "NUMBER", icon: "IconCurrencyDollar" },
      // JSON: { actSigned, odometer, condition, dashboardPhotoAttached }.
      { name: "handoverChecklist", label: "Handover Checklist", type: "RAW_JSON", icon: "IconChecklist" },
      // TARS is human-in-the-loop: entering this stage raises a task for the
      // admin dept (see pipelines app); a person records the entry in TARS by
      // hand and flips tarsStatus to DONE. Replace with API sync when TARS
      // ships an official API.
      { name: "tarsStatus", label: "TARS Status", type: "SELECT", icon: "IconDatabase", options: selectOptions(["pending", "done"]) },
      { name: "closeReason", label: "Close Reason", type: "TEXT", icon: "IconMessage" },
      // v1: plain manager name, not a workspaceMember relation (unverified API).
      { name: "assignedTo", label: "Assigned To", type: "TEXT", icon: "IconUser" },
      { name: "externalId", label: "External ID", type: "TEXT", icon: "IconLink" },
      { name: "externalSource", label: "External Source", type: "TEXT", icon: "IconDatabase" },
      { name: "brandLine", label: "Brand Line", type: "TEXT", icon: "IconTag" },
    ],
  },
  {
    input: {
      nameSingular: "rentDeal",
      namePlural: "rentDeals",
      labelSingular: "Rent Deal",
      labelPlural: "Rent Deals",
      description: "Rent-a-car pipeline deal (Babek team) — 12-step owner-approved process",
      icon: "IconKey",
    },
    fields: [
      { name: "customer", label: "Customer", type: "RELATION", icon: "IconUser", relation: { targetObject: "person", targetFieldLabel: "Rent Deals" } },
      { name: "vehicle", label: "Vehicle", type: "RELATION", icon: "IconCar", relation: { targetObject: "vehicle", targetFieldLabel: "Rent Deals" } },
      { name: "booking", label: "Booking", type: "RELATION", icon: "IconCalendarEvent", relation: { targetObject: "booking", targetFieldLabel: "Rent Deals" } },
      { name: "rental", label: "Rental", type: "RELATION", icon: "IconKey", relation: { targetObject: "rental", targetFieldLabel: "Rent Deals" } },
      {
        name: "stage",
        label: "Stage",
        type: "SELECT",
        icon: "IconFlag",
        // Owner regulation, 12 steps + terminals. Order matters (kanban).
        options: selectOptions([
          "new_request",
          "first_contact",
          "docs_blacklist",
          "booked",
          "price_security",
          "delivery",
          "payment_pending",
          "payment_confirmed",
          "docs_to_admin",
          "admin_dept",
          "tars",
          "active_rent",
          "completed",
          "cancelled",
        ]),
      },
      { name: "startDate", label: "Start Date", type: "DATE_TIME", icon: "IconCalendarTime" },
      { name: "endDate", label: "End Date", type: "DATE_TIME", icon: "IconCalendarDue" },
      { name: "dailyRate", label: "Daily Rate", type: "NUMBER", icon: "IconCurrencyDollar" },
      { name: "deposit", label: "Deposit", type: "NUMBER", icon: "IconCurrencyDollar" },
      { name: "total", label: "Total", type: "NUMBER", icon: "IconCurrencyDollar" },
      {
        name: "paymentMethod",
        label: "Payment Method",
        type: "SELECT",
        icon: "IconCurrencyDollar",
        options: selectOptions(["cash", "card_on_site", "bank_transfer", "crypto", "payment_link"]),
      },
      {
        name: "paymentConfirmedBy",
        label: "Payment Confirmed By",
        type: "SELECT",
        icon: "IconUserCheck",
        // Owner regulation: driver (on-site), accountant (transfer/crypto),
        // manager (payment link).
        options: selectOptions(["driver", "accountant", "manager"]),
      },
      { name: "blacklistChecked", label: "Blacklist Checked", type: "BOOLEAN", icon: "IconShieldCheck" },
      { name: "docsChecklist", label: "Docs Checklist", type: "RAW_JSON", icon: "IconChecklist" },
      // JSON: { dashboardPhoto, contractPhoto, docsPhoto } — each attached:bool.
      { name: "docsToAdminChecklist", label: "Docs To Admin Checklist", type: "RAW_JSON", icon: "IconChecklist" },
      // TARS is human-in-the-loop: entering this stage raises a task for the
      // admin dept (see pipelines app); a person records the entry in TARS by
      // hand and flips tarsStatus to DONE. Replace with API sync when TARS
      // ships an official API.
      { name: "tarsStatus", label: "TARS Status", type: "SELECT", icon: "IconDatabase", options: selectOptions(["pending", "done"]) },
      { name: "assignedTo", label: "Assigned To", type: "TEXT", icon: "IconUser" },
      { name: "closeReason", label: "Close Reason", type: "TEXT", icon: "IconMessage" },
      { name: "externalId", label: "External ID", type: "TEXT", icon: "IconLink" },
      { name: "externalSource", label: "External Source", type: "TEXT", icon: "IconDatabase" },
      { name: "brandLine", label: "Brand Line", type: "TEXT", icon: "IconTag" },
    ],
  },
  STAGE_EVENT_OBJECT,
];

// Fields added to Twenty's BUILT-IN objects so the sync can round-trip our
// identity/matching keys on the records Twenty already owns.
//
// phoneTail9 deserves a special note: it is the LAST 9 DIGITS of the phone
// number — the platform's standard matching key (MIN_PHONE_MATCH_DIGITS in
// platform/messaging/phone.ts). Phones arrive in wildly different formats
// ("+971 50 123 4567" vs "0501234567" vs a WhatsApp JID); the leading part
// (country code / trunk prefix) is what disagrees, so matching is
// right-anchored on the trailing 9 digits. Every phone-bearing record carries
// this pre-computed tail so Twenty-side lookups need no normalization logic.
// CallGear relay (integrations/callgear/twenty-relay.ts): telephony metadata
// carried on the lead opportunity the relay creates per inbound call. The
// relay discovers the opportunity field list at startup and skips anything
// absent, so an older workspace keeps working without these — bootstrap them
// to get the full call record. Single source of truth: the standalone script
// scripts/create-callgear-twenty-fields.ts creates exactly this set.
//
// `recording` is a LINKS field — the only Twenty type that renders a
// CLICKABLE anchor (a URL in TEXT is dead text). It supersedes the earlier
// `recordingUrl` TEXT spec: Twenty cannot retype a field in place, so the
// link lives under a NEW name and any already-created recordingUrl column is
// simply left behind (harmless — the relay no longer writes it).
export const CALL_OPPORTUNITY_FIELDS: DesiredField[] = [
  { name: "recording", label: "Recording", type: "LINKS", icon: "IconPlayerPlay", description: "CallGear call recording (clickable link)" },
  { name: "callDurationSeconds", label: "Call Duration (s)", type: "NUMBER", icon: "IconClock", description: "Call duration in seconds" },
  {
    name: "callDirection",
    label: "Call Direction",
    type: "SELECT",
    icon: "IconPhoneCall",
    description: "inbound = new lead; outbound calls are not relayed",
    options: selectOptions(["inbound", "outbound"]),
  },
  { name: "callStartedAt", label: "Call Started At", type: "DATE_TIME", icon: "IconCalendarTime", description: "When the CallGear call started" },
  { name: "callAgentName", label: "Call Agent", type: "TEXT", icon: "IconHeadset", description: "CallGear agent who handled the call" },
  // Owner, 2026-08-10, opening a card with Babek: «look at each card u created
  // and see what is there — u will find nothing that helps». Two facts he
  // needed and had to dig for (or could not get at all) now sit ON the card:
  //
  //   callSource  — where the lead came from: the line scenario that answered,
  //                 the site/campaign behind the number, the operator's tags.
  //                 CallGear sent all of it from day one; we discarded it.
  //   callSummary — the AI read of the conversation. The transcriber already
  //                 wrote it as a Timeline note, which is one tab too far
  //                 away to be read between two ringing phones.
  { name: "callSource", label: "Lead Source", type: "TEXT", icon: "IconRoute", description: "Where the call came from: line scenario · site · campaign · tags" },
  { name: "callSummary", label: "Call Summary (AI)", type: "TEXT", icon: "IconSparkles", description: "What the caller wanted, in one paragraph — written by the transcriber" },
  // The booking facts, as fields. A manager scanning the board must be able to
  // answer "how many days, from when, how much" without reading a paragraph —
  // and to sort and filter by them, which prose cannot do.
  { name: "rentalDays", label: "Rent Duration (days)", type: "NUMBER", icon: "IconCalendarStats", description: "How long the caller wants the car" },
  { name: "neededFrom", label: "Needed From", type: "TEXT", icon: "IconCalendarPlus", description: "When they want it, in the caller's own words" },
  { name: "whatsappConfirmed", label: "WhatsApp Confirmed", type: "BOOLEAN", icon: "IconBrandWhatsapp", description: "The caller confirmed this number is on WhatsApp" },
  // Owner, 2026-08-13: leads need serial numbers so the manager can reference
  // one by "#N" — in conversation, in the staff bot, in the daily review.
  // Written by the relays from the platform sequence (twenty_lead_seq); the
  // same number also prefixes the card name so the board shows it.
  { name: "leadNumber", label: "Lead №", type: "TEXT", icon: "IconNumber", description: "Serial lead number — reference this lead as #N" },
];

const BUILTIN_FIELD_ADDITIONS: { objectName: string; fields: DesiredField[] }[] = [
  ...["person", "company", "opportunity"].map((objectName) => ({
    objectName,
    fields: [
      { name: "externalId", label: "External ID", type: "TEXT", icon: "IconLink", description: "ID of this record in the source system (bitrix24/kaiten/…)" },
      { name: "externalSource", label: "External Source", type: "TEXT", icon: "IconDatabase", description: "System the record was synced from" },
      { name: "stageDetail", label: "Stage Detail", type: "TEXT", icon: "IconListDetails", description: "Free-text detail behind the coarse kanban stage" },
      { name: "phoneTail9", label: "Phone Tail 9", type: "TEXT", icon: "IconPhone", description: "Last 9 digits of the phone — platform matching key" },
      { name: "brandLine", label: "Brand Line", type: "TEXT", icon: "IconTag", description: "Brand/business line this record belongs to" },
      // Babek, 2026-08-07: «Не могу нажать кнопку и позвонить отсюда, не могу
      // написать. Я не хочу второй телефон таскать.» LINKS (not TEXT) because
      // only LINKS renders as an anchor you can actually click.
      { name: "whatsapp", label: "WhatsApp", type: "LINKS", icon: "IconBrandWhatsapp", description: "WhatsApp Web deep link to this record's number" },
    ] as DesiredField[],
  })),
  {
    objectName: "opportunity",
    fields: CALL_OPPORTUNITY_FIELDS,
  },
];

// ─── Bootstrap ──────────────────────────────────────────────────────────────

/**
 * Bring the Twenty workspace schema up to the desired state, creating only
 * what is missing. Safe to re-run: a second run creates zero objects/fields.
 */
export async function bootstrapTwentySchema(client: TwentyClient): Promise<BootstrapResult> {
  const result: BootstrapResult = { objectsCreated: [], fieldsCreated: [], alreadyPresent: [] };

  // Pass 1 — objects. All objects are created BEFORE any field so RELATION
  // fields can resolve their target object ids regardless of field order.
  const objects = await client.metadata.listObjects();
  const objectBySingular = new Map(objects.map((o) => [o.nameSingular, o]));

  for (const desired of CUSTOM_OBJECTS) {
    if (objectBySingular.has(desired.input.nameSingular)) {
      result.alreadyPresent.push(desired.input.nameSingular);
      continue;
    }
    const created = await client.metadata.createObject(desired.input);
    objectBySingular.set(created.nameSingular, created);
    result.objectsCreated.push(created.nameSingular);
  }

  // Pass 2 — fields, on both the custom objects and the built-ins.
  const existingFields = await client.metadata.listFields();
  const fieldExists = (objectMetadataId: string, name: string) =>
    existingFields.some((f) => f.objectMetadataId === objectMetadataId && f.name === name);

  async function ensureField(objectName: string, spec: DesiredField): Promise<void> {
    const target = objectBySingular.get(objectName);
    if (!target) {
      // A missing built-in (person/company/opportunity) means the workspace is
      // not a standard Twenty workspace — fail loudly rather than half-boot.
      throw new Error(`Twenty object "${objectName}" not found in workspace metadata`);
    }
    const key = `${objectName}.${spec.name}`;
    if (fieldExists(target.id, spec.name)) {
      result.alreadyPresent.push(key);
      return;
    }
    const input: TwentyCreateFieldInput = {
      objectMetadataId: target.id,
      name: spec.name,
      label: spec.label,
      type: spec.type,
      description: spec.description,
      icon: spec.icon,
      isNullable: true,
      ...(spec.options ? { options: spec.options } : {}),
    };
    if (spec.relation) {
      const relationTarget = objectBySingular.get(spec.relation.targetObject);
      if (!relationTarget) {
        throw new Error(
          `Twenty relation target "${spec.relation.targetObject}" for ${key} not found in workspace metadata`
        );
      }
      input.relationCreationPayload = {
        // MANY_TO_ONE from this object towards the target: many rentals point
        // at one vehicle/person, and Twenty creates the inverse list field on
        // the target side from targetFieldLabel.
        type: "MANY_TO_ONE",
        targetObjectMetadataId: relationTarget.id,
        targetFieldLabel: spec.relation.targetFieldLabel,
        targetFieldIcon: spec.icon,
      };
    }
    const created: TwentyFieldMetadata = await client.metadata.createField(input);
    existingFields.push(created); // so a repeated spec within one run is skipped too
    result.fieldsCreated.push(key);
  }

  for (const desired of CUSTOM_OBJECTS) {
    for (const field of desired.fields) {
      await ensureField(desired.input.nameSingular, field);
    }
  }
  for (const addition of BUILTIN_FIELD_ADDITIONS) {
    for (const field of addition.fields) {
      await ensureField(addition.objectName, field);
    }
  }

  return result;
}

export interface CallFieldsResult {
  /** Field names created on this run. */
  created: string[];
  /** Field names already present — left untouched. */
  alreadyPresent: string[];
}

/**
 * Create ONLY the CallGear call-metadata fields on the built-in opportunity
 * object — the subset of bootstrapTwentySchema the call relay needs, without
 * pulling in the whole mirror schema. Idempotent: existing fields (matched by
 * name) are left untouched, so a second run creates nothing.
 *
 * Used by scripts/create-callgear-twenty-fields.ts, which runs it against
 * BOTH Twenty deployments (sales + rental).
 */
export async function ensureCallOpportunityFields(client: TwentyClient): Promise<CallFieldsResult> {
  const objects = await client.metadata.listObjects();
  const opportunity = objects.find((o) => o.nameSingular === "opportunity");
  if (!opportunity) {
    throw new Error('Twenty object "opportunity" not found in workspace metadata');
  }
  const fields = await client.metadata.listFields();
  const result: CallFieldsResult = { created: [], alreadyPresent: [] };
  for (const spec of CALL_OPPORTUNITY_FIELDS) {
    if (fields.some((f) => f.objectMetadataId === opportunity.id && f.name === spec.name)) {
      result.alreadyPresent.push(spec.name);
      continue;
    }
    const created = await client.metadata.createField({
      objectMetadataId: opportunity.id,
      name: spec.name,
      label: spec.label,
      type: spec.type,
      description: spec.description,
      icon: spec.icon,
      isNullable: true,
      ...(spec.options ? { options: spec.options } : {}),
    });
    fields.push(created); // so a repeated spec within one run is skipped too
    result.created.push(spec.name);
  }
  return result;
}

// ─── Bitrix semantic mirror fields (2026-08) ────────────────────────────────
// The fields the mirror's semantic projection (deal COMMENTS → note, UF
// labels → opportunity fields, deal traits → person, MOVED_* → stageEvent)
// writes. The STATIC ones live here; the two SELECTs (lossReason,
// languageSegment) have DYNAMIC option sets enumerated from each portal's
// crm.deal.userfield.list — the portal UF ids and option sets differ, and a
// hardcoded subset would silently break the rental portals.
//
// SELECT option VALUES are the raw Russian enumeration labels (the stageDetail
// precedent: the raw value is the match key — the mirror writes it verbatim);
// the English text lives in the option LABELS. НЕИЗВЕСНО #7 below: if the
// instance rejects non-UPPER_SNAKE option values, the create call fails and
// the script reports it — the deployer verifies on first run.

/** Static semantic fields (everything except the two dynamic SELECTs). */
export const MIRROR_SEMANTIC_STATIC_FIELDS: { objectName: string; fields: DesiredField[] }[] = [
  {
    objectName: "opportunity",
    fields: [
      { name: "carModels", label: "Car Models", type: "TEXT", icon: "IconCar", description: "Interested car model(s) — Bitrix multi-enumeration labels, '; '-joined" },
    ],
  },
  {
    objectName: "person",
    fields: [
      { name: "socialProfile", label: "Social Profile", type: "LINKS", icon: "IconBrandInstagram", description: "Client social profile URL (Instagram/…) mined from Bitrix SOURCE_DESCRIPTION / WEB" },
      { name: "returnCustomer", label: "Return Customer", type: "BOOLEAN", icon: "IconRepeat", description: "Bitrix IS_RETURN_CUSTOMER flag, propagated from the client's deal" },
    ],
  },
];

export interface MirrorSemanticFieldsResult {
  /** nameSingular of objects created on this run. */
  objectsCreated: string[];
  /** "<object>.<field>" of fields created on this run. */
  fieldsCreated: string[];
  /** "<object>" / "<object>.<field>" already present — left untouched. */
  alreadyPresent: string[];
  /** Fields deliberately NOT created (no option set on this instance's portals). */
  skipped: string[];
}

/**
 * Create the Bitrix semantic mirror fields + the stageEvent object on ONE
 * Twenty workspace. Idempotent (name-matched), safe to re-run. The dynamic
 * SELECT option sets are passed in by the caller (enumerated per portal from
 * crm.deal.userfield.list); when an option set is absent the field is SKIPPED
 * — never created with a guessed subset — and reported in `skipped`.
 *
 * Used by scripts/create-bitrix-mirror-twenty-fields.ts, which runs it
 * against BOTH Twenty deployments (sales + rental).
 */
export async function ensureMirrorSemanticFields(
  client: TwentyClient,
  dynamic: {
    lossReasonOptions?: TwentySelectOption[] | null;
    languageOptions?: TwentySelectOption[] | null;
  } = {}
): Promise<MirrorSemanticFieldsResult> {
  const result: MirrorSemanticFieldsResult = {
    objectsCreated: [],
    fieldsCreated: [],
    alreadyPresent: [],
    skipped: [],
  };
  const objects = await client.metadata.listObjects();
  const objectBySingular = new Map(objects.map((o) => [o.nameSingular, o]));
  const fields = await client.metadata.listFields();

  async function ensureField(objectName: string, spec: DesiredField): Promise<void> {
    const target = objectBySingular.get(objectName);
    if (!target) {
      throw new Error(`Twenty object "${objectName}" not found in workspace metadata`);
    }
    const key = `${objectName}.${spec.name}`;
    if (fields.some((f) => f.objectMetadataId === target.id && f.name === spec.name)) {
      result.alreadyPresent.push(key);
      return;
    }
    const input: TwentyCreateFieldInput = {
      objectMetadataId: target.id,
      name: spec.name,
      label: spec.label,
      type: spec.type,
      description: spec.description,
      icon: spec.icon,
      isNullable: true,
      ...(spec.options ? { options: spec.options } : {}),
    };
    if (spec.relation) {
      const relationTarget = objectBySingular.get(spec.relation.targetObject);
      if (!relationTarget) {
        throw new Error(
          `Twenty relation target "${spec.relation.targetObject}" for ${key} not found in workspace metadata`
        );
      }
      input.relationCreationPayload = {
        type: "MANY_TO_ONE",
        targetObjectMetadataId: relationTarget.id,
        targetFieldLabel: spec.relation.targetFieldLabel,
        targetFieldIcon: spec.icon,
      };
    }
    const created: TwentyFieldMetadata = await client.metadata.createField(input);
    fields.push(created); // so a repeated spec within one run is skipped too
    result.fieldsCreated.push(key);
  }

  // The stageEvent object first — its RELATION fields resolve their targets
  // (leaseDeal/rentDeal/opportunity) against what already exists. If those
  // custom objects are missing (bootstrap never ran here) the relation fields
  // throw loudly, which is the right failure for a half-bootstrapped workspace.
  if (objectBySingular.has(STAGE_EVENT_OBJECT.input.nameSingular)) {
    result.alreadyPresent.push(STAGE_EVENT_OBJECT.input.nameSingular);
  } else {
    const created = await client.metadata.createObject(STAGE_EVENT_OBJECT.input);
    objectBySingular.set(created.nameSingular, created);
    result.objectsCreated.push(created.nameSingular);
  }
  for (const spec of STAGE_EVENT_OBJECT.fields) {
    await ensureField(STAGE_EVENT_OBJECT.input.nameSingular, spec);
  }

  for (const { objectName, fields: specs } of MIRROR_SEMANTIC_STATIC_FIELDS) {
    for (const spec of specs) {
      await ensureField(objectName, spec);
    }
  }

  // The two dynamic SELECTs — only with a real option set from the portal.
  if (dynamic.lossReasonOptions?.length) {
    await ensureField("opportunity", {
      name: "lossReason",
      label: "Loss Reason",
      type: "SELECT",
      icon: "IconCircleX",
      description: "Bitrix loss-reason enumeration label (raw value is the match key)",
      options: dynamic.lossReasonOptions,
    });
  } else {
    result.skipped.push("opportunity.lossReason — no loss-reason user field on this instance's portals");
  }
  if (dynamic.languageOptions?.length) {
    await ensureField("person", {
      name: "languageSegment",
      label: "Language Segment",
      type: "SELECT",
      icon: "IconLanguage",
      description: "Client language segment — Bitrix enumeration label (raw value is the match key)",
      options: dynamic.languageOptions,
    });
  } else {
    result.skipped.push("person.languageSegment — no language user field on this instance's portals");
  }

  return result;
}

// ─── НЕИЗВЕСТНО (verify on the live instance) ───────────────────────────────
// 1. REST Metadata API object creation (POST /rest/metadata/objects): confirmed
//    against the cloud API docs (201 + data.createOneObject); some older
//    self-hosted versions only expose object creation via GraphQL /metadata.
//    If the live instance 404s/400s, fall back to the GraphQL mutation.
// 2. RELATION field creation payload (relationCreationPayload MANY_TO_ONE +
//    targetFieldLabel/targetFieldIcon): taken from community-verified examples,
//    not the official spec — confirm the exact accepted shape and whether the
//    inverse field name must also be supplied.
// 3. DATE_TIME vs DATE for booking/rental dates: our schema stores timestamptz,
//    so DATE_TIME was chosen; if the instance rejects DATE_TIME use DATE.
// 4. booking.status option set (pending|confirmed|cancelled|completed) is
//    INVENTED — our schema has rental.bookingBasis but no booking status enum.
// 5. SELECT option objects: label/value/position are documented; "color" is
//    optional and omitted here — add if the instance requires it.
// 6. List response envelope (data.objects / data.fields / pageInfo.endCursor +
//    starting_after) follows the documented cursor pagination; confirm against
//    the actual self-hosted build.
// 7. Cyrillic SELECT option VALUES (lossReason / languageSegment, 2026-08):
//    CONFIRMED REJECTED live 2026-08-07 (METADATA_VALIDATION_ERROR). Design:
//    option value = stable ASCII code (mirrorSemanticValueCode in
//    bitrix24/mappings.ts), option label = the raw Russian text; unknown raw
//    values collapse to OTHER so the option set stays bounded.
// 8. stageEvent write shape (2026-08): the mirror writes { externalId,
//    fromStage, toStage, changedAt, changedBy, opportunityId }. The relation
//    write key `opportunityId` follows the pointOfContactId convention; the
//    deployer confirms on first run that the relation field accepts it.
// 9. Note write shape: { title, bodyV2: { markdown, blocknote: null } } +
//    noteTargets rows — copied from the WA projector (push-message.ts), which
//    is verified live; mirrored here without a fresh verification.
