import type { ProtocolStatus, Role } from "@/data/mock";

export function canOpenProtocol(status: ProtocolStatus) {
  return status === "available" || status === "in_progress" || status === "completed";
}

export function accessLabel(status: ProtocolStatus) {
  if (status === "in_progress") return "In Progress";
  if (status === "available") return "Unlocked";
  if (status === "completed") return "Completed";
  if (status === "future") return "Future";
  return "Locked";
}

export function canViewPractitionerLayer(role: Role) {
  return role === "practitioner" || role === "admin" || role === "license_holder";
}

export function canViewTherapeuticAddenda(role: Role) {
  return role === "practitioner" || role === "admin" || role === "license_holder";
}

export function canReviewClients(role: Role) {
  return role === "practitioner" || role === "admin" || role === "license_holder";
}

export function canManagePractitionerNotes(role: Role) {
  return role === "practitioner" || role === "admin";
}

export function practitionerAccessReason(role: Role) {
  if (canViewPractitionerLayer(role)) {
    return "Practitioner access active for this mock session.";
  }

  return "Practitioner layer requires a practitioner, admin, or licensed implementation entitlement.";
}
