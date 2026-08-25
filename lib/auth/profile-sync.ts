export async function syncCurrentUserProfile() {
  return {
    ok: false,
    skipped: true,
    reason: "Profile sync now runs through Clerk-authenticated Netlify functions."
  };
}
