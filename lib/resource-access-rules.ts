export type ResourceAccessRule = {
  authenticated?: boolean;
  protocolIds?: string[];
  practitionerOnly?: boolean;
};

export const RESOURCE_ACCESS_RULES: Record<string, ResourceAccessRule> = {
  "12-dimensions-wellness.pdf": { authenticated: true },
  "biological-infrastructure-companion.pdf": { authenticated: true },
  "body-signal-index.pdf": { authenticated: true },
  "distinct-character-framework-glossary.pdf": { authenticated: true },
  "nervous-system-governance-guide.pdf": { authenticated: true },
  "nsg-digestion-sleep-movement-recovery.pdf": { authenticated: true },
  "somatic-baseline-companion.pdf": { protocolIds: ["DC-P01-SBP"] },
  "somatic-baseline-protocol.pdf": { protocolIds: ["DC-P01-SBP"] },
  "ios1-companion.pdf": { protocolIds: ["DC-P02-IOS"] },
  "ios1-protocol.pdf": { protocolIds: ["DC-P02-IOS"] },
  "mes1-companion.pdf": { protocolIds: ["DC-P02-MES"] },
  "mes1-protocol.pdf": { protocolIds: ["DC-P02-MES"] },
  "ncs1-companion.pdf": { protocolIds: ["DC-P02-NCS"] },
  "ncs1-protocol.pdf": { protocolIds: ["DC-P02-NCS"] },
  "execution-architecture-companion.pdf": { protocolIds: ["DC-P03-EXE"] },
  "execution-architecture-protocol.pdf": { protocolIds: ["DC-P03-EXE"] },
  "authority-framework-protocol.pdf": { protocolIds: ["DC-P04-AUT"] },
  "internal-signal-calibration-protocol.pdf": { protocolIds: ["DC-P04-ISC"] },
  "30-day-sovereignty-reset-protocol.pdf": { protocolIds: ["DC-P05-SOV"] },
  "self-mastery-blueprint-protocol.pdf": { protocolIds: ["DC-P06-SMB"] },
  "enterprise-ip-mastermind-resource-suite.pdf": { protocolIds: ["DC-P07-EIP"] },
  "enterprise-ip-mastermind-advisor-guide.pdf": { practitionerOnly: true }
};

export function fileNameFromHref(href: string | undefined) {
  if (!href) return "";
  const cleanHref = href.split("?")[0];
  const parts = cleanHref.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

export function canOpenResourceFromAccess({
  href,
  status,
  protocolIds,
  canAccessPractitionerLayer,
  isAuthenticated
}: {
  href?: string;
  status?: string;
  protocolIds: string[];
  canAccessPractitionerLayer: boolean;
  isAuthenticated: boolean;
}) {
  const fileName = fileNameFromHref(href);
  const rule = fileName ? RESOURCE_ACCESS_RULES[fileName] : null;

  if (!href || !rule) return false;
  if (rule.practitionerOnly) return canAccessPractitionerLayer;
  if (rule.authenticated) return isAuthenticated;
  if (rule.protocolIds?.length) {
    return rule.protocolIds.some((protocolId) => protocolIds.includes(protocolId));
  }

  return status !== "Locked";
}
