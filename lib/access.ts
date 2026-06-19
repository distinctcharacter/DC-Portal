import type { ProtocolStatus, Role } from "@/data/mock";

export function canOpenProtocol(status: ProtocolStatus) {
  return status === "available" || status === "in_progress" || status === "completed";
}

export function accessLabel(status: ProtocolStatus) {
  if (status === "in_progress") return "In Progress";
  if (status === "available") return "Unlocked";
  if (status === "completed") return "Completed";
  if (status === "future") return "Locked";
  return "Locked";
}

export function canViewPractitionerLayer(role: Role) {
  return role === "practitioner" || role === "admin";
}

export function canViewTherapeuticAddenda(role: Role) {
  return role === "practitioner" || role === "admin";
}

export function canReviewClients(role: Role) {
  return role === "practitioner" || role === "admin";
}

export function canManagePractitionerNotes(role: Role) {
  return role === "practitioner" || role === "admin";
}

export function practitionerAccessReason(role: Role) {
  if (canViewPractitionerLayer(role)) {
    return "Practitioner access is active for this account.";
  }

  return "Practitioner layer requires approved practitioner access.";
}
