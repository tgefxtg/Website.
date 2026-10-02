const loginPanel = document.querySelector("[data-login-panel]");
const loginCopy = document.querySelector("[data-login-copy]");
const manager = document.querySelector("[data-manager]");
const packageList = document.querySelector("[data-package-list]");
const statusMessage = document.querySelector("[data-status]");
const loginButton = document.querySelector("[data-login]");
const logoutButton = document.querySelector("[data-logout]");
const addButton = document.querySelector("[data-add]");
const saveButton = document.querySelector("[data-save]");
let packages = [];
let uploading = false;
let saving = false;

function setBusyControls() {
  const busy = uploading || saving;
  saveButton.disabled = addButton.disabled = logoutButton.disabled = busy;
  packageList.querySelectorAll("input, textarea, [data-delete]").forEach(control => control.disabled = busy);
}

const fields = [
  ["name", "Destination"], ["package", "Package name"], ["region", "Region"], ["duration", "Duration"],
  ["best", "Best for"], ["image", "Image path or HTTPS URL"], ["alt", "Image description"], ["description", "Description"]
];

const emptyPackage = () => ({ name: "New destination", package: "New signature escape", region: "KERALA", duration: "3 days / 2 nights", best: "slow travel", image: "assets/images/munnar.webp", alt: "Kerala landscape", description: "Describe this journey for your guests." });

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function renderPackages() {
  packageList.innerHTML = packages.map((item, index) => `<article class="package-editor" data-index="${index}"><div class="package-editor-heading"><span>${String(index + 1).padStart(2, "0")}</span><h3>${escapeHtml(item.name || "New destination")}</h3><button class="delete-package" type="button" data-delete="${index}" aria-label="Remove ${escapeHtml(item.name || "package")}">Remove</button></div><div class="package-fields">${fields.map(([key, label]) => `<label>${label}${key === "description" ? `<textarea data-field="${key}" rows="4">${escapeHtml(item[key])}</textarea>` : `<input data-field="${key}" value="${escapeHtml(item[key])}" required />`}</label>`).join("")}</div></article>`).join("");
  addImageControls();
}

function addImageControls() {
  packageList.querySelectorAll(".package-editor").forEach((editor) => {
    const item = packages[Number(editor.dataset.index)];
    const panel = document.createElement("div");
    panel.className = "package-image-upload";
    panel.innerHTML = `<img src="${escapeHtml(item.image)}" alt="Package photo preview" loading="lazy" width="220" height="140" /><label>Choose photo from gallery or computer<input type="file" data-upload accept="image/*" /></label><p data-upload-status role="status">Choose one photo, up to 25 MB. Large photos are resized automatically. Click Save all changes after uploading.</p>`;
    editor.append(panel);
  });
}

packageList.addEventListener("change", async (event) => {
  if (!event.target.matches("[data-upload]")) return;
  const file = event.target.files[0];
  if (!file || uploading || saving) return;
  const editor = event.target.closest("[data-index]");
  const item = packages[Number(editor.dataset.index)];
  const message = editor.querySelector("[data-upload-status]");
  uploading = true;
  setBusyControls();
  message.textContent = "Preparing photo…";
  try {
    const photo = await preparePackagePhoto(file);
    const accessToken = await token();
    if (!accessToken) throw new Error("Please sign in again before uploading.");
    message.textContent = "Uploading photo…";
    const response = await fetch("/.netlify/functions/package-image", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": photo.type }, body: photo });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Upload failed. Please try again.");
    item.image = data.image;
    editor.querySelector('[data-field="image"]').value = data.image;
    editor.querySelector(".package-image-upload img").src = data.image;
    message.textContent = "Photo uploaded. Click Save all changes to publish it.";
  } catch (error) { message.textContent = error.message; }
  finally {
    uploading = false;
    setBusyControls();
    event.target.value = "";
  }
});

async function token() {
  const user = window.netlifyIdentity?.currentUser();
  return user ? user.jwt(true) : null;
}

async function loadPackages() {
  const response = await fetch("/.netlify/functions/packages", { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not load packages.");
  packages = data.packages;
  renderPackages();
}

async function updateView(user = window.netlifyIdentity?.currentUser()) {
  const isAdmin = user?.app_metadata?.roles?.includes("admin");
  loginPanel.hidden = Boolean(isAdmin);
  manager.hidden = !isAdmin;
  if (!user) loginCopy.textContent = "Sign in with the authorised administrator account to manage packages.";
  else if (!isAdmin) loginCopy.textContent = "This account is not authorised to manage packages.";
  if (isAdmin) {
    try { await loadPackages(); statusMessage.textContent = `Signed in as ${user.email}.`; }
    catch (error) { statusMessage.textContent = error.message; }
  }
}

loginButton.addEventListener("click", () => window.netlifyIdentity?.open("login"));
logoutButton.addEventListener("click", () => window.netlifyIdentity?.logout());
addButton.addEventListener("click", () => { packages.push(emptyPackage()); renderPackages(); packageList.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "center" }); });
packageList.addEventListener("input", (event) => {
  const field = event.target.dataset.field;
  const editor = event.target.closest("[data-index]");
  if (field && editor) packages[Number(editor.dataset.index)][field] = event.target.value;
});
packageList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;
  packages.splice(Number(button.dataset.delete), 1);
  renderPackages();
});
saveButton.addEventListener("click", async () => {
  if (uploading || saving) return;
  saving = true;
  setBusyControls();
  statusMessage.textContent = "Saving your packages…";
  try {
    const accessToken = await token();
    if (!accessToken) throw new Error("Your session ended. Please sign in again.");
    const response = await fetch("/.netlify/functions/packages", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ packages }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not save packages.");
    packages = data.packages;
    renderPackages();
    statusMessage.textContent = "Saved. Your website now shows the updated packages.";
  } catch (error) { statusMessage.textContent = error.message; }
  finally { saving = false; setBusyControls(); }
});

window.netlifyIdentity?.on("init", updateView);
window.netlifyIdentity?.on("login", (user) => { window.netlifyIdentity.close(); updateView(user); });
window.netlifyIdentity?.on("logout", () => updateView(null));
// The CDN widget initializes itself on DOMContentLoaded. Calling init again
// creates a second iframe and can hide the invite/recovery password form.
