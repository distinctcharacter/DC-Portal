const PROTOCOL_SLUG_ALIASES: Record<string, string> = {
  "somatic-baseline-protocol": "somatic-baseline",
  "cognitive-architecture-bundle": "cognitive-architecture",
  "execution-architecture-protocol": "execution-architecture",
  "relational-command-bundle": "relational-command",
  "30-day-sovereignty": "sovereignty-reset",
  "30-day-sovereignty-reset": "sovereignty-reset",
  "sovereignty-installation": "sovereignty-reset",
  "sovereignty-installation-protocol": "sovereignty-reset",
  "selfmastery-blueprint": "self-mastery-blueprint",
  "self-mastery-blueprint-protocol": "self-mastery-blueprint",
  "enterprise-ip-mastermind-application": "enterprise-ip-mastermind",
  "enterprise-ip-mastermind-course": "enterprise-ip-mastermind",
  "ios-1": "identity-operating-system",
  ios1: "identity-operating-system",
  "identity-operating-system-ios-1": "identity-operating-system",
  "masking-economy-system-mes-1": "masking-economy-system",
  "mes-1": "masking-economy-system",
  mes1: "masking-economy-system",
  "narrative-control-system-ncs-1": "narrative-control-system",
  "ncs-1": "narrative-control-system",
  ncs1: "narrative-control-system",
  "authority-framework-protocol": "authority-framework",
  "internal-signal-calibration-protocol": "internal-signal-calibration"
};

export function canonicalProtocolSlug(slug: string) {
  const normalized = slug.trim().toLowerCase();
  return PROTOCOL_SLUG_ALIASES[normalized] ?? normalized;
}

export function protocolHref(slug: string) {
  return `/protocols/${canonicalProtocolSlug(slug)}`;
}
