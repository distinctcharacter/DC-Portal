export function legacyPractitionerAccessHelperUnavailable() {
  throw new Error("Practitioner access checks now run through Neon server-side functions.");
}
