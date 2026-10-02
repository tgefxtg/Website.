import { getStore } from "@netlify/blobs";
import { requireAdmin } from "./lib/admin-auth.mjs";
import { randomUUID } from "node:crypto";

const limit = 3 * 1024 * 1024;
const reply = (error, status) => Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export default async (request) => {
  try {
    if (request.method === "GET") {
      const id = new URL(request.url).searchParams.get("id");
      if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(id || "")) return reply("Image not found.", 404);
      const store = getStore({ name: "harley-package-images", consistency: "strong" });
      const image = await store.get(id, { type: "arrayBuffer" });
      if (!image) return reply("Image not found.", 404);
      const type = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" }[id.split(".").pop()];
      return new Response(image, { headers: { "Content-Type": type, "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=31536000, immutable" } });
    }
    if (request.method !== "POST") return reply("Method not allowed.", 405);
    // Uploads must originate from the site's own admin page.
    if (request.headers.get("origin") !== new URL(request.url).origin) return reply("Invalid request origin.", 403);
    const access = await requireAdmin(request);
    if (access.error) return access.error;
    if (Number(request.headers.get("content-length")) > limit) return reply("Choose an image smaller than 3 MB.", 413);
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (!bytes.length || bytes.length > limit) return reply("Choose an image smaller than 3 MB.", 413);
    let extension;
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) extension = "jpg";
    else if ([137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value)) extension = "png";
    else if (String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP") extension = "webp";
    if (!extension) return reply("Choose a JPG, PNG or WebP image.", 400);
    const id = `${randomUUID()}.${extension}`;
    const store = getStore({ name: "harley-package-images", consistency: "strong" });
    await store.set(id, bytes.buffer);
    return Response.json({ image: `/.netlify/functions/package-image?id=${id}` }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return reply("The image service is unavailable. Please try again.", 503);
  }
};
