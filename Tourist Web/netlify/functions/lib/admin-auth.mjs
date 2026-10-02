const failure = (message, status) => ({ error: Response.json({ error: message }, {
  status, headers: { "Cache-Control": "no-store" }
}) });

// Verify with this site's Identity service, not decoded JWTs or browser metadata.
// Older @netlify/identity releases omit app_metadata.roles from getUser().
export async function requireAdmin(request) {
  const authorization = request.headers.get("authorization");
  if (!/^Bearer\s+\S+$/i.test(authorization || "")) {
    return failure("Please sign out and sign in again before saving or uploading.", 401);
  }
  const allowedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!allowedEmail) return failure("Set ADMIN_EMAIL in this Netlify project's environment variables, include Functions, then redeploy.", 503);

  try {
    // URL is a read-only Netlify runtime variable. Never trust a client-supplied host.
    const site = new URL(process.env.URL);
    if (site.protocol !== "https:") return failure("The site's secure Identity URL is not configured.", 503);
    const response = await fetch(new URL("/.netlify/identity/user", site), {
      headers: { Authorization: authorization }, cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(10000)
    });
    if (response.status === 401 || response.status === 403) return failure("Your session ended. Please sign out and sign in again.", 401);
    if (!response.ok) return failure("The sign-in service is unavailable. Please try again.", 503);
    const user = await response.json();
    if (typeof user.email !== "string" || user.email.trim().toLowerCase() !== allowedEmail) {
      return failure("This account does not match ADMIN_EMAIL for this Netlify project. Check the setting and redeploy.", 403);
    }
    if (!Array.isArray(user.app_metadata?.roles) || !user.app_metadata.roles.includes("admin")) {
      return failure("This account needs the admin role in this project's Identity users. Save the role, then sign in again.", 403);
    }
    return { user };
  } catch {
    return failure("Could not verify your administrator account. Please try again.", 503);
  }
}
