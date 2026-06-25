export type Role = "client" | "practitioner" | "admin" | "license_holder";

export type ProtocolStatus = "available" | "locked" | "in_progress" | "completed" | "future";

export type Protocol = {
  id: string;
  slug: string;
  title: string;
  phase: string;
  type: "core" | "bundle" | "child" | "capstone" | "commercial" | "future";
  status: ProtocolStatus;
  completion: number;
  nextAction: string;
  description: string;
  requirements?: string[];
  children?: string[];
};

export type Resource = {
  id: string;
  title: string;
  category: string;
  protocol: string;
  audience: "Client" | "Practitioner" | "Client + Practitioner" | "Advisor";
  access: "Unlocked" | "Practitioner" | "Future";
  description: string;
  href?: string;
};

export type DownloadAsset = {
  id: string;
  title: string;
  protocol: string;
  type: string;
  audience: string;
  status: "Available" | "Required" | "Locked" | "Updated";
  href?: string;
};

export type ClientReview = {
  id: string;
  name: string;
  protocol: string;
  phase: string;
  completion: number;
  lastSignal: string;
  riskFlag: "None" | "Monitor" | "Needs Review";
  nextReview: string;
};

export type PractitionerNote = {
  id: string;
  client: string;
  protocol: string;
  type: "Observation" | "Pacing Note" | "Safety Boundary" | "Integration Note";
  status: "Draft" | "Shared" | "Practitioner Only";
  summary: string;
};

export type TherapeuticAddendum = {
  id: string;
  title: string;
  protocol: string;
  scope: string;
  reviewUse: string;
};

export type EnterpriseIpModule = {
  id: string;
  title: string;
  phase: string;
  objective: string;
  deliverable: string;
  gate: string;
};

export type EnterpriseIpClientNote = {
  id: string;
  moduleId: string;
  title: string;
  body: string;
  status: "Shared" | "Draft";
  updatedAt: string;
};

export const mockUser = {
  name: "Portal Account",
  role: "client" as Role,
  activeProtocol: "Somatic Baseline Protocol",
  currentPhase: "Section II: Biological Architecture"
};

export const protocols: Protocol[] = [
  {
    id: "DC-P01-SBP",
    slug: "somatic-baseline",
    title: "Somatic Baseline Protocol",
    phase: "Phase 1",
    type: "core",
    status: "in_progress",
    completion: 42,
    nextAction: "Complete the nervous system zone check and log one tactical reset.",
    description:
      "The biological foundation for behavioral governance. Establish nervous system literacy, baseline regulation, and a repeatable return-to-command practice."
  },
  {
    id: "DC-P02-COG",
    slug: "cognitive-architecture",
    title: "Cognitive Architecture",
    phase: "Phase 2",
    type: "bundle",
    status: "locked",
    completion: 0,
    nextAction: "Requires Somatic Baseline completion.",
    description:
      "A three-part identity and interpretation architecture: IOS-1, MES-1, and NCS-1.",
    requirements: ["Complete DC-P01-SBP", "Submit exit assessment"],
    children: ["IOS-1", "MES-1", "NCS-1"]
  },
  {
    id: "DC-P03-EXE",
    slug: "execution-architecture",
    title: "Execution Architecture Protocol",
    phase: "Phase 3",
    type: "core",
    status: "locked",
    completion: 0,
    nextAction: "Requires Cognitive Architecture completion.",
    description:
      "A behavioral operating system for consistent action without urgency, depletion, or emotional dependency.",
    requirements: ["Complete IOS-1", "Complete MES-1", "Complete NCS-1"]
  },
  {
    id: "DC-P04-REL",
    slug: "relational-command",
    title: "Relational Command",
    phase: "Phase 4",
    type: "bundle",
    status: "locked",
    completion: 0,
    nextAction: "Requires Execution Architecture completion.",
    description:
      "Authority Framework and Internal Signal Calibration: relational governance, soft power, and signal fidelity.",
    requirements: ["Complete DC-P03-EXE"],
    children: ["Authority Framework", "Internal Signal Calibration"]
  },
  {
    id: "DC-P05-SOV",
    slug: "sovereignty-reset",
    title: "30-Day Sovereignty Reset",
    phase: "Phase 5",
    type: "core",
    status: "locked",
    completion: 0,
    nextAction: "Requires Relational Command completion.",
    description:
      "A timed behavioral enforcement container that turns comprehension into daily biological and relational integration.",
    requirements: ["Complete Relational Command"]
  },
  {
    id: "DC-P06-SMB",
    slug: "self-mastery-blueprint",
    title: "Self-Mastery Blueprint",
    phase: "Capstone",
    type: "capstone",
    status: "locked",
    completion: 0,
    nextAction: "Requires 30-Day Sovereignty Reset final audit.",
    description:
      "The flagship capstone protocol: a guided life architecture command center for integrated self-mastery.",
    requirements: ["Complete 30-Day Final Audit"]
  },
  {
    id: "DC-P07-EIP",
    slug: "enterprise-ip-mastermind",
    title: "Enterprise IP Mastermind",
    phase: "Tier 3",
    type: "commercial",
    status: "locked",
    completion: 0,
    nextAction: "Requires Enterprise IP Mastermind access.",
    description:
      "A high-ticket commercial incubation system for converting self-mastery into licensable intellectual property."
  }
];

export const resources: Resource[] = [
  {
    id: "DC-R01-BIC",
    title: "Biological Infrastructure Companion",
    category: "Foundation Resource",
    protocol: "Foundation",
    audience: "Client + Practitioner",
    access: "Unlocked",
    description:
      "A reference architecture for body, energy, recovery, and nervous system governance.",
    href: "/resources/biological-infrastructure-companion.pdf"
  },
  {
    id: "DC-R02-12W",
    title: "12 Dimensions of Self-Mastery",
    category: "Foundation Resource",
    protocol: "Foundation",
    audience: "Client + Practitioner",
    access: "Unlocked",
    description:
      "The Distinct Character whole-system framework for physical, relational, identity, boundary, nervous system, and self-efficacy signals.",
    href: "/resources/12-dimensions-wellness.pdf"
  },
  {
    id: "DC-R03-GLO",
    title: "Distinct Character Framework Glossary",
    category: "Foundation Reference",
    protocol: "Foundation",
    audience: "Client + Practitioner",
    access: "Unlocked",
    description:
      "A shared language reference for protocol concepts, practitioner alignment, and future licensing.",
    href: "/resources/distinct-character-framework-glossary.pdf"
  },
  {
    id: "DC-R04-BSI",
    title: "Body Signal Index",
    category: "Foundation Reference",
    protocol: "Foundation",
    audience: "Client + Practitioner",
    access: "Unlocked",
    description:
      "A structured signal index for reading body-based capacity, activation, recovery, and adaptation patterns.",
    href: "/resources/body-signal-index.pdf"
  },
  {
    id: "DC-R05-NSG",
    title: "Nervous System Governance Guide",
    category: "Foundation Reference",
    protocol: "Foundation",
    audience: "Client + Practitioner",
    access: "Unlocked",
    description:
      "A practical governance reference for state literacy, regulation boundaries, and evidence-calibrated nervous system education.",
    href: "/resources/nervous-system-governance-guide.pdf"
  },
  {
    id: "DC-R06-NSG-ESMR",
    title: "Nervous System Governance: Eating, Sleep, Movement, Recovery",
    category: "Nervous System Governance",
    protocol: "Foundation",
    audience: "Client + Practitioner",
    access: "Unlocked",
    description:
      "A standalone reference for translating nervous system governance into daily biological infrastructure.",
    href: "/resources/nsg-digestion-sleep-movement-recovery.pdf"
  },
  {
    id: "DC-P01-SBP-CM01",
    title: "Somatic Baseline Companion Materials",
    category: "Unified Companion Resource",
    protocol: "Somatic Baseline Protocol",
    audience: "Client + Practitioner",
    access: "Unlocked",
    description:
      "The current SBP companion resource for research context, integration exercises, quick reference support, low-capacity adaptations, and deepening paths.",
    href: "/resources/somatic-baseline-companion.pdf"
  },
  {
    id: "DC-P01-SBP-TA01",
    title: "Somatic Baseline Therapeutic Addendum",
    category: "Therapeutic Addendum",
    protocol: "Somatic Baseline Protocol",
    audience: "Practitioner",
    access: "Practitioner",
    description:
      "Practitioner-facing safety, pacing, and clinical-adjacent review notes.",
    href: "/resources/somatic-baseline-protocol.pdf"
  },
  {
    id: "DC-P07-EIP-RS01",
    title: "Enterprise IP Mastermind Resource Suite",
    category: "Commercial Incubation Resource",
    protocol: "Enterprise IP Mastermind",
    audience: "Advisor",
    access: "Practitioner",
    description:
      "A high-ticket resource suite for structuring, pricing, packaging, and protecting intellectual property as a commercial asset.",
    href: "/resources/enterprise-ip-mastermind-resource-suite.pdf"
  },
  {
    id: "DC-P07-EIP-ADV01",
    title: "Enterprise IP Mastermind Advisor Legal-Ops Guide",
    category: "Advisor Resource",
    protocol: "Enterprise IP Mastermind",
    audience: "Advisor",
    access: "Practitioner",
    description:
      "An advisor-facing guide for legal-operational boundaries, commercial review, licensing readiness, and professional oversight.",
    href: "/resources/enterprise-ip-mastermind-advisor-guide.pdf"
  },
  {
    id: "DC-PR-CASE01",
    title: "Client Review Template",
    category: "Practitioner Tool",
    protocol: "Cross-Protocol",
    audience: "Practitioner",
    access: "Practitioner",
    description:
      "Structured review format for state patterns, protocol adherence, pacing concerns, and next-session focus.",
    href: "/resources/distinct-character-framework-glossary.pdf"
  },
  {
    id: "DC-PR-SAFETY01",
    title: "Therapeutic Boundary and Referral Guide",
    category: "Practitioner Tool",
    protocol: "Cross-Protocol",
    audience: "Practitioner",
    access: "Practitioner",
    description:
      "Scope guidance for educational use, escalation boundaries, and referral indicators.",
    href: "/resources/nervous-system-governance-guide.pdf"
  }
];

export const downloads: DownloadAsset[] = [
  {
    id: "DC-P01-SBP-PC01",
    title: "Somatic Baseline Printable Companion",
    protocol: "Somatic Baseline Protocol",
    type: "Printable Companion",
    audience: "Client",
    status: "Available",
    href: "/resources/somatic-baseline-protocol.pdf"
  },
  {
    id: "DC-P01-SBP-CM01",
    title: "Somatic Baseline Companion Materials",
    protocol: "Somatic Baseline Protocol",
    type: "Unified Companion Resource",
    audience: "Client + Practitioner",
    status: "Available",
    href: "/resources/somatic-baseline-companion.pdf"
  },
  {
    id: "DC-P01-SBP-AS01",
    title: "Somatic Dysregulation Index",
    protocol: "Somatic Baseline Protocol",
    type: "Assessment",
    audience: "Client",
    status: "Required",
    href: "/resources/body-signal-index.pdf"
  },
  {
    id: "DC-P01-SBP-LOG01",
    title: "Daily Governance Log",
    protocol: "Somatic Baseline Protocol",
    type: "Interactive Portal Tool",
    audience: "Client",
    status: "Locked"
  },
  {
    id: "DC-P01-SBP-TA01",
    title: "Therapeutic Addendum",
    protocol: "Somatic Baseline Protocol",
    type: "Practitioner Resource",
    audience: "Practitioner",
    status: "Locked",
    href: "/resources/somatic-baseline-protocol.pdf"
  },
  {
    id: "DC-P02-IOS-PC01",
    title: "IOS-1 Printable Protocol",
    protocol: "Identity Operating System",
    type: "Printable Protocol",
    audience: "Client",
    status: "Locked",
    href: "/resources/ios1-protocol.pdf"
  },
  {
    id: "DC-P02-MES-PC01",
    title: "MES-1 Printable Protocol",
    protocol: "Masking Economy System",
    type: "Printable Protocol",
    audience: "Client",
    status: "Locked",
    href: "/resources/mes1-protocol.pdf"
  },
  {
    id: "DC-P02-NCS-PC01",
    title: "NCS-1 Printable Protocol",
    protocol: "Narrative Control System",
    type: "Printable Protocol",
    audience: "Client",
    status: "Locked",
    href: "/resources/ncs1-protocol.pdf"
  },
  {
    id: "DC-P03-EXE-PC01",
    title: "Execution Architecture Protocol",
    protocol: "Execution Architecture",
    type: "Printable Protocol",
    audience: "Client",
    status: "Locked",
    href: "/resources/execution-architecture-protocol.pdf"
  },
  {
    id: "DC-P04-AUT-PC01",
    title: "Authority Framework Protocol",
    protocol: "Relational Command",
    type: "Printable Protocol",
    audience: "Client",
    status: "Locked",
    href: "/resources/authority-framework-protocol.pdf"
  },
  {
    id: "DC-P04-ISC-PC01",
    title: "Internal Signal Calibration Protocol",
    protocol: "Relational Command",
    type: "Printable Protocol",
    audience: "Client",
    status: "Locked",
    href: "/resources/internal-signal-calibration-protocol.pdf"
  },
  {
    id: "DC-P05-SOV-PC01",
    title: "30-Day Sovereignty Reset Protocol",
    protocol: "30-Day Sovereignty Reset",
    type: "Printable Protocol",
    audience: "Client",
    status: "Locked",
    href: "/resources/30-day-sovereignty-reset-protocol.pdf"
  },
  {
    id: "DC-P06-SMB-PC01",
    title: "Self-Mastery Blueprint Protocol",
    protocol: "Self-Mastery Blueprint",
    type: "Printable Protocol",
    audience: "Client",
    status: "Locked",
    href: "/resources/self-mastery-blueprint-protocol.pdf"
  },
  {
    id: "DC-P07-EIP-RS01",
    title: "Enterprise IP Mastermind Resource Suite",
    protocol: "Enterprise IP Mastermind",
    type: "Commercial Incubation Resource",
    audience: "Advisor",
    status: "Locked",
    href: "/resources/enterprise-ip-mastermind-resource-suite.pdf"
  },
  {
    id: "DC-P07-EIP-ADV01",
    title: "Enterprise IP Mastermind Advisor Legal-Ops Guide",
    protocol: "Enterprise IP Mastermind",
    type: "Advisor Resource",
    audience: "Advisor",
    status: "Locked",
    href: "/resources/enterprise-ip-mastermind-advisor-guide.pdf"
  }
];

export const sbpSections = [
  {
    id: "orientation",
    title: "Orientation",
    status: "completed",
    summary:
      "Protocol scope, safety framing, and the role of biological stability in the larger ecosystem."
  },
  {
    id: "baseline-assessment",
    title: "SDI Baseline Assessment",
    status: "completed",
    summary:
      "A structured baseline reading across sympathetic, dorsal, and fawn response patterns."
  },
  {
    id: "biological-architecture",
    title: "Biological Architecture",
    status: "in_progress",
    summary:
      "The internal mechanics of neuroception, state shifts, and the three-zone operating model."
  },
  {
    id: "vagus-nerve",
    title: "The Vagus Nerve",
    status: "available",
    summary:
      "Vagal tone, recovery capacity, and daily practices for returning to command."
  },
  {
    id: "environmental-audit",
    title: "Environmental Audit",
    status: "locked",
    summary:
      "A structured map of friction sources, body signals, and remove/restructure/regulate decisions."
  },
  {
    id: "tactical-resets",
    title: "Tactical Reset Protocols",
    status: "locked",
    summary:
      "A set of practical interventions for acute activation, shutdown, and capacity recovery."
  }
];

export const enterpriseIpModules: EnterpriseIpModule[] = [
  {
    id: "M0",
    title: "Commercial Incubation Orientation",
    phase: "Entry Gate",
    objective:
      "Enter the mastermind as a commercial build, not passive education. Clarify the asset being incubated and the identity threshold required to hold it.",
    deliverable: "Commercial Incubation Entry Brief",
    gate:
      "Client can name the commercial asset, the buyer being served, and the boundary between self-mastery work and market-facing IP."
  },
  {
    id: "M1",
    title: "Founder Identity and Authority Stabilization",
    phase: "Identity Architecture",
    objective:
      "Identify the identity patterns that distort pricing, visibility, authority, enforcement, and buyer selection.",
    deliverable: "Commercial Authority Profile",
    gate:
      "Client can state the authority risks that would weaken the offer and the governing standards that replace them."
  },
  {
    id: "M2",
    title: "IP Excavation and Asset Classification",
    phase: "IP Extraction",
    objective:
      "Separate raw insight from teachable, sellable, protectable architecture through asset classification.",
    deliverable: "Classified IP Asset Register",
    gate:
      "Client can classify assets as public signal, paid method, license-ready, or protected origin."
  },
  {
    id: "M3",
    title: "Market Problem and Buyer Architecture",
    phase: "Market Translation",
    objective:
      "Translate the work from internal brilliance into a buyer-recognizable commercial problem with economic and identity relevance.",
    deliverable: "Buyer Problem Architecture Brief",
    gate:
      "Client can name the problem, the cost of leaving it unresolved, and the buyer ready to pay for the transformation."
  },
  {
    id: "M4",
    title: "Framework Encoding",
    phase: "Method Design",
    objective:
      "Convert intuition, repeated practice, and decision logic into a named method that can be taught and evaluated.",
    deliverable: "Framework Encoding Map",
    gate:
      "Client can explain the method through structure, definitions, sequence, and boundaries without unsupported claims."
  },
  {
    id: "M5",
    title: "Transformation Design and Evidence Logic",
    phase: "Transformation Architecture",
    objective:
      "Define how transformation happens inside the offer and how progress can be observed without guaranteeing outcomes.",
    deliverable: "Transformation Evidence Map",
    gate:
      "Client can define the promised transformation with truthful language, support boundaries, and observable indicators."
  },
  {
    id: "M6",
    title: "Offer Architecture and Delivery Container",
    phase: "Offer Build",
    objective:
      "Turn the method into a purchasable premium container with clear fit, exclusions, pacing, support, and deliverables.",
    deliverable: "Premium Offer Architecture Brief",
    gate:
      "Client can explain what is included, what is not included, who it is for, who it is not for, and why the delivery model fits."
  },
  {
    id: "M7",
    title: "Pricing Mechanics and Revenue Model",
    phase: "Monetization Architecture",
    objective:
      "Price from structure, transformation depth, delivery burden, market fit, IP value, and capacity protection.",
    deliverable: "Pricing and Revenue Model Brief",
    gate:
      "Client can justify price through structure, support, commercial value, and operating cost without inflated claims."
  },
  {
    id: "M8",
    title: "Category Narrative and Soft Power Sales System",
    phase: "Market Authority",
    objective:
      "Build language that lets the market understand the offer without reducing it to generic coaching, mindset, or wellness work.",
    deliverable: "Soft Power Sales System",
    gate:
      "Client can communicate the offer through precise buyer fit, controlled authority, and responsible conversion language."
  },
  {
    id: "M9",
    title: "Client Experience and Fulfillment Governance",
    phase: "Delivery Operations",
    objective:
      "Build a delivery system that protects client experience, founder capacity, and method integrity.",
    deliverable: "Client Experience Operating System",
    gate:
      "Client has onboarding, checkpoints, support rules, completion standards, and repeatable delivery controls."
  },
  {
    id: "M10",
    title: "Licensing Rights and Implementation Architecture",
    phase: "Licensing Preparation",
    objective:
      "Determine whether the method can be licensed, what rights can be granted, and what must remain protected.",
    deliverable: "Licensing Readiness Brief",
    gate:
      "Client can identify what could be licensed, under what restrictions, and what requires professional legal review."
  },
  {
    id: "M11",
    title: "Risk, Claims, and Professional Review",
    phase: "Commercial Protection",
    objective:
      "Clean up claims, scope, disclaimers, professional review needs, and operational risk before higher-stakes selling or licensing.",
    deliverable: "Commercial Risk Review Packet",
    gate:
      "Client has identified review needs and removed unsupported, unclear, or overreaching claims from the commercial pathway."
  },
  {
    id: "M12",
    title: "Commercialization Brief and Launch Pathway",
    phase: "Market Activation",
    objective:
      "Leave with a commercialization brief and staged launch path that matches identity, capacity, buyer readiness, and revenue design.",
    deliverable: "Final IP Commercialization Brief",
    gate:
      "Client can proceed with a structured offer, responsible claims, pricing logic, delivery model, and next-step launch plan."
  }
];

export const enterpriseIpClientNotes: EnterpriseIpClientNote[] = [
  {
    id: "EIP-NOTE-001",
    moduleId: "M1",
    title: "Authority Positioning",
    status: "Shared",
    updatedAt: "Jun 16",
    body:
      "Stay with the distinction between credibility and over-proof. The offer needs clear authority, not excessive explanation. Tighten the language around what you are qualified to govern and what requires outside review."
  },
  {
    id: "EIP-NOTE-002",
    moduleId: "M4",
    title: "Framework Encoding Focus",
    status: "Shared",
    updatedAt: "Jun 16",
    body:
      "The next pass should separate principles, steps, and decision rules. If the method depends on your personal interpretation at every point, it is not yet encoded enough for licensing preparation."
  },
  {
    id: "EIP-NOTE-003",
    moduleId: "M7",
    title: "Pricing Review",
    status: "Draft",
    updatedAt: "Jun 16",
    body:
      "Review pricing against delivery burden, buyer economics, and capacity cost. The number should be defensible through structure and commercial utility, not personal pressure."
  }
];

export const practitionerClients: ClientReview[] = [
  {
    id: "CL-1042",
    name: "Client A",
    protocol: "Somatic Baseline Protocol",
    phase: "Biological Architecture",
    completion: 42,
    lastSignal: "Sympathetic activation with improved re-entry time after tactical reset.",
    riskFlag: "Monitor",
    nextReview: "Review SDI trend and environmental friction map."
  },
  {
    id: "CL-1187",
    name: "Client B",
    protocol: "Identity Operating System",
    phase: "Handwritten Identity Audit",
    completion: 18,
    lastSignal: "High reflection volume with signs of cognitive fatigue.",
    riskFlag: "None",
    nextReview: "Encourage pacing and keep written work non-performative."
  },
  {
    id: "CL-1220",
    name: "Client C",
    protocol: "30-Day Sovereignty Reset",
    phase: "Week 2",
    completion: 53,
    lastSignal: "Repeated missed logs after relational activation.",
    riskFlag: "Needs Review",
    nextReview: "Check safety boundaries, capacity load, and practice friction."
  }
];

export const practitionerNotes: PractitionerNote[] = [
  {
    id: "NOTE-219",
    client: "Client A",
    protocol: "Somatic Baseline Protocol",
    type: "Pacing Note",
    status: "Practitioner Only",
    summary:
      "Client can identify activation accurately but may convert regulation into performance. Keep the next review focused on capacity, not compliance."
  },
  {
    id: "NOTE-220",
    client: "Client B",
    protocol: "Identity Operating System",
    type: "Observation",
    status: "Draft",
    summary:
      "Handwritten pacing appears clinically appropriate for identity work. Watch for over-analysis and premature consolidation."
  },
  {
    id: "NOTE-221",
    client: "Client C",
    protocol: "30-Day Sovereignty Reset",
    type: "Safety Boundary",
    status: "Shared",
    summary:
      "Reset should remain an educational behavior container. Client should be referred out for individualized medical or mental health needs."
  }
];

export const therapeuticAddenda: TherapeuticAddendum[] = [
  {
    id: "DC-P01-SBP-TA01",
    title: "Somatic Baseline Therapeutic Addendum",
    protocol: "Somatic Baseline Protocol",
    scope:
      "State recognition, pacing, low-capacity adaptations, referral boundaries, and non-diagnostic safety framing.",
    reviewUse:
      "Use during client review when dysregulation patterns affect protocol progression or when a client is treating regulation as performance."
  },
  {
    id: "DC-P02-IOS-TA01",
    title: "IOS-1 Therapeutic Addendum",
    protocol: "Identity Operating System",
    scope:
      "Identity transition pacing, handwritten processing support, grief around outdated self-concepts, and reflective containment.",
    reviewUse:
      "Use when identity work becomes rushed, performative, destabilizing, or overly abstract."
  },
  {
    id: "DC-P05-SOV-TA01",
    title: "30-Day Sovereignty Reset Therapeutic Addendum",
    protocol: "30-Day Sovereignty Reset",
    scope:
      "Timed reset pacing, capacity protection, cohort considerations, and escalation boundaries for practitioner-guided use.",
    reviewUse:
      "Use when daily enforcement reveals repeated nervous system strain, relational activation, or practice collapse."
  }
];
