export type Department = "sales" | "primary" | "security" | "technical";
export type Urgency = "low" | "medium" | "high";

export interface Classification {
  department: Department;
  intent: string;
  urgency: Urgency;
  confidence: number;
  reason: string;
  engine: "llm" | "heuristic";
}

const RULES: { dept: Department; intent: string; words: string[] }[] = [
  {
    dept: "technical",
    intent: "Vehicle fault / repair",
    words: [
      "broke","broken","shut down","engine","warning light","noise",
      "brake","ac ","a/c","not cooling","accident","damage","scratch",
      "dent","tyre","tire","overheat","stuck","won't start",
      "wont start","repair","service","puncture",
    ],
  },
  {
    dept: "security",
    intent: "Payment / renewal",
    words: [
      "pay","payment","invoice","installment","instalment","balance",
      "fine","salik","deposit","refund","renew","registration",
      "mulkiya","insurance","contract copy","salary certificate",
      "statement","late","overdue",
    ],
  },
  {
    dept: "sales",
    intent: "Rental / lease enquiry",
    words: [
      "rent","price","quote","available","availability","book",
      "booking","lease","buy","purchase","interested","offer",
      "new car","upgrade","weekly","monthly rate",
    ],
  },
];

const HIGH = [
  "shut down","broke down","accident","stuck","urgent","emergency",
  "won't start","wont start","not working","asap",
];
const MEDIUM = [
  "repair","payment","invoice","fine","not cooling","noise",
  "brake","late","overdue",
];

export function classifyHeuristic(text: string): Classification {
  const t = " " + text.toLowerCase() + " ";
  let best = { dept: "primary" as Department, intent: "General enquiry", score: 0 };
  for (const rule of RULES) {
    const score = rule.words.filter((w) => t.includes(w)).length;
    if (score > best.score) best = { dept: rule.dept, intent: rule.intent, score };
  }
  const urgency: Urgency = HIGH.some((w) => t.includes(w)) ? "high" : MEDIUM.some((w) => t.includes(w)) ? "medium" : "low";
  const confidence = best.score === 0 ? 0.4 : Math.min(0.95, 0.55 + best.score * 0.12);
  return {
    department: best.dept,
    intent: best.intent,
    urgency,
    confidence,
    reason: best.score === 0 ? "No strong keywords detected — routed to Primary for triage." : `Matched ${best.score} keyword signal(s) pointing to the ${best.dept} desk.`,
    engine: "heuristic",
  };
}
