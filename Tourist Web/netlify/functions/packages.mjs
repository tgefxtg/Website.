import { getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";
import { defaultPackages } from "./default-packages.mjs";

const STORE_NAME = "harley-wild-packages";
const STORE_KEY = "packages";
const jsonHeaders = { "Content-Type": "application/json", "Cache-Control": "no-store" };

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function cleanPackage(value) {
  const fields = ["name", "region", "image", "alt", "description", "best", "duration", "package"];
  if (!value || typeof value !== "object") return null;
  const item = {};
  for (const field of fields) {
    if (typeof value[field] !== "string" || !value[field].trim() || value[field].length > 600) return null;
    item[field] = value[field].trim();
  }
  if (!/^(assets\/images\/|https:\/\/)/.test(item.image) && !/^\/\.netlify\/functions\/package-image\?id=[a-f0-9-]{36}\.(jpg|png|webp)$/.test(item.image)) return null;
  return item;
}

async function readPackages() {
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  const saved = await store.get(STORE_KEY, { type: "json", consistency: "strong" });
  return Array.isArray(saved) ? saved : defaultPackages;
}

async function requireAdmin() {
  const user = await getUser();
  const allowedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const isAllowedEmail = allowedEmail && user?.email?.toLowerCase() === allowedEmail;
  if (!user) return { error: json({ error: "Please sign in first." }, 401) };
  if (!user.roles?.includes("admin") || !isAllowedEmail) {
    return { error: json({ error: "You do not have permission to manage packages." }, 403) };
  }
  return { user };
}

export default async (request) => {
  if (request.method === "GET") return json({ packages: await readPackages() });
  if (request.method !== "PUT") return json({ error: "Method not allowed." }, 405);

  const access = await requireAdmin();
  if (access.error) return access.error;

  let payload;
  try { payload = await request.json(); } catch { return json({ error: "Invalid request body." }, 400); }
  if (!Array.isArray(payload?.packages) || payload.packages.length === 0 || payload.packages.length > 30) {
    return json({ error: "Please provide between 1 and 30 packages." }, 400);
  }
  const packages = payload.packages.map(cleanPackage);
  if (packages.some((item) => !item)) return json({ error: "Every package needs valid details and an approved image path." }, 400);
  if (new Set(packages.map((item) => item.name.toLowerCase())).size !== packages.length) {
    return json({ error: "Each destination name must be unique." }, 400);
  }

  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  await store.setJSON(STORE_KEY, packages);
  return json({ packages, updatedBy: access.user.email });
};
