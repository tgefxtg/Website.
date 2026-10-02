// Keep the native file input free of `capture` so phones can offer their gallery.
async function preparePackagePhoto(file) {
  if (!file.size || file.size > 25 * 1024 * 1024) throw new Error("Choose a photo smaller than 25 MB.");
  const supportedName = /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(file.name || "");
  if ((!file.type.startsWith("image/") && !supportedName) || file.type === "image/svg+xml" || /\.svg$/i.test(file.name || "")) {
    throw new Error("Choose a photo from your gallery (JPG, PNG or WebP recommended).");
  }
  const url = URL.createObjectURL(file);
  const photo = new Image();
  try {
    await new Promise((resolve, reject) => {
      photo.onload = resolve;
      photo.onerror = () => reject(new Error("Your browser cannot read this photo. Export it as JPG or PNG, then try again."));
      photo.src = url;
    });
    if (!photo.naturalWidth || !photo.naturalHeight) throw new Error("This photo could not be read. Choose another image.");
    const scale = Math.min(1, 1920 / Math.max(photo.naturalWidth, photo.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(photo.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(photo.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo processing is unavailable. Try another browser.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(photo, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.55]) {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
      if (!blob) throw new Error("Could not prepare this photo. Try a JPG or PNG image.");
      if (blob.size > 0 && blob.size <= 3 * 1024 * 1024) return blob;
    }
    throw new Error("This photo is still too large. Choose a smaller image.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
