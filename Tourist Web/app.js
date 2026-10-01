let destinations = [
  { name: "Munnar", region: "IDUKKI · HILL COUNTRY", image: "assets/images/munnar.webp", alt: "Misty tea-covered hills in Munnar", description: "An unhurried ascent into tea country—cloud-wrapped viewpoints, estate walks and cool air that changes the tempo of a day.", best: "tea, trails & quiet mornings", duration: "3 days / 2 nights", package: "Munnar Mist Escape" },
  { name: "Alappuzha", region: "ALAPPUZHA · BACKWATERS", image: "assets/images/alappuzha.webp", alt: "Houseboat on Kerala backwaters", description: "Palm-fringed waterways and the gentle rhythm of a houseboat. Let the landscape come to you, one ripple at a time.", best: "water, food & deep rest", duration: "2 days / 1 night", package: "Alappuzha Backwater Drift" },
  { name: "Thekkady", region: "IDUKKI · WILDLIFE", image: "assets/images/thekkady.webp", alt: "Rainforest and calm lake in Thekkady", description: "A softer kind of wild: Periyar waters, spice-scented hills and rainforest edges where the day stays surprising.", best: "wildlife & spice trails", duration: "3 days / 2 nights", package: "Thekkady Wild Trails" },
  { name: "Wayanad", region: "WESTERN GHATS · NORTH KERALA", image: "assets/images/wayanad.webp", alt: "Forest waterfall in Wayanad", description: "Green in every direction—forest trails, waterfall air, coffee country and stories held close by the hills.", best: "forest, adventure & culture", duration: "3 days / 2 nights", package: "Wayanad Forest Retreat" },
  { name: "Fort Kochi", region: "ERNAKULAM · HERITAGE COAST", image: "assets/images/kochi.webp", alt: "Chinese fishing nets at Fort Kochi", description: "Walk between sea breeze and history. Fort Kochi gives you art, layered architecture and a coastline that lingers.", best: "culture, cafés & history", duration: "2 days / 1 night", package: "Fort Kochi Heritage Walk" },
  { name: "Varkala", region: "THIRUVANANTHAPURAM · COAST", image: "assets/images/varkala.webp", alt: "Cliffs and beach at Varkala", description: "A cliffside pause above the Arabian Sea, where sunset strolls, salt air and open horizons do the talking.", best: "coast, wellness & sunset", duration: "3 days / 2 nights", package: "Varkala Cliff & Coast" },
  { name: "Kanyakumari", region: "TAMIL NADU", image: "assets/images/kanyakumari.webp", alt: "Kanyakumari ocean and memorial at the confluence of three seas", description: "Experience the confluence of three oceans at the southern tip of India.", best: "sunset & monuments", duration: "2 days / 1 night", package: "Where Three Seas Meet" },
  { name: "Rameswaram", region: "TAMIL NADU", image: "assets/images/rameswaram.webp", alt: "Rameswaram bridge and ocean view", description: "A sacred island town surrounded by the sea, known for its temples and the iconic Pamban Bridge.", best: "temples & ocean views", duration: "2 days / 1 night", package: "Island of Sacred Shores" },
  { name: "Madurai", region: "TAMIL NADU", image: "assets/images/madurai.webp", alt: "Madurai Meenakshi temple gopuram at sunset", description: "Immerse yourself in the ancient heritage of the Temple City.", best: "heritage & architecture", duration: "2 days / 1 night", package: "Temple City Heritage" }
];

const grid = document.querySelector("[data-destinations]");
const dialog = document.querySelector("[data-dialog]");
const dialogImage = dialog?.querySelector("[data-dialog-image]");
const dialogRegion = dialog?.querySelector("[data-dialog-region]");
const dialogTitle = dialog?.querySelector("[data-dialog-title]");
const dialogDesc = dialog?.querySelector("[data-dialog-description]");
const dialogBest = dialog?.querySelector("[data-dialog-best]");
const dialogRequest = dialog?.querySelector("[data-request]");
const dialogCloseBtn = dialog?.querySelector(".dialog-close");
const contactSection = document.querySelector("#contact");
const form = document.querySelector("[data-enquiry-form]");
const journeySelect = form?.querySelector("select[name=journey]");
const formStatus = form?.querySelector(".form-status");
const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector(".mobile-menu");
let openedBy;

function renderDestinations() {
  if (!grid) return;
  grid.innerHTML = destinations.map((destination, index) => `<article class="destination-card reveal"><button type="button" data-destination="${destination.name}" aria-label="Explore ${destination.name}"><img src="${destination.image}" alt="${destination.alt}" width="1000" height="667" loading="${index > 1 ? "lazy" : "eager"}" decoding="async" /><span class="card-overlay"></span><span class="card-count">0${index + 1}</span><span class="card-arrow">↗</span><span class="card-copy"><small>${destination.region.split(" · ")[0]}</small><strong>${destination.name}</strong><em>${destination.package}</em></span></button></article>`).join("");
  observeReveals(grid.querySelectorAll(".reveal"));
}

function populateJourneyOptions() {
  if (!journeySelect) return;
  const selectedValue = journeySelect.value;
  journeySelect.innerHTML = '<option value="">Choose a journey</option>';
  destinations.forEach((destination) => {
    const option = new Option(`${destination.name} — ${destination.package}`, destination.name);
    journeySelect.add(option);
  });
  journeySelect.value = selectedValue;
}


function showDestination(name, trigger) {
  const destination = destinations.find((item) => item.name === name);
  if (!destination || !dialog) return;
  openedBy = trigger;
  if (dialogImage) { dialogImage.src = destination.image; dialogImage.alt = destination.alt; }
  if (dialogRegion) dialogRegion.textContent = destination.region;
  if (dialogTitle) dialogTitle.textContent = destination.name;
  if (dialogDesc) dialogDesc.textContent = destination.description;
  if (dialogBest) dialogBest.textContent = destination.best;
  if (dialogRequest) dialogRequest.dataset.journey = destination.name;
  dialog.showModal();
}

if (grid) {
  grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-destination]");
    if (button) showDestination(button.dataset.destination, button);
  });
}

document.querySelectorAll("[data-journey]").forEach((button) => {
  button.addEventListener("click", () => showDestination(button.dataset.journey, button));
});

function closeDialog() {
  dialog.close();
  openedBy?.focus();
}

if (dialogCloseBtn) {
  dialogCloseBtn.addEventListener("click", closeDialog);
}
if (dialog) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });
}

if (dialogRequest) {
  dialogRequest.addEventListener("click", (event) => {
    journeySelect.value = event.currentTarget.dataset.journey;
    closeDialog();
    contactSection?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => journeySelect?.focus(), 600);
  });
}


if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      formStatus.textContent = "Please add your name, a valid email and a journey first.";
      form.querySelector(":invalid").focus();
      return;
    }
    const data = new FormData(form);
    const selected = destinations.find((item) => item.name === data.get("journey"));
    const body = [
      `Hello Harley Wild Escape Holidays,`,
      "",
      `Name: ${data.get("name")}`,
      `Email: ${data.get("email")}`,
      `Journey: ${selected?.package || data.get("journey")}`,
      `Travellers: ${data.get("travellers")}`,
      `Preferred date: ${data.get("date") || "Not specified"}`,
      "",
      `Travel notes: ${data.get("message") || "Not specified"}`,
      "",
      "Please share availability and a final quote."
    ].join("\n");
    formStatus.textContent = "Opening WhatsApp with your journey details…";
    window.location.href = `https://wa.me/918943006157?text=${encodeURIComponent(body)}`;
  });
}

let scrollTicking = false;
window.addEventListener("scroll", () => {
  if (!scrollTicking && header) {
    requestAnimationFrame(() => {
      header.classList.toggle("scrolled", window.scrollY > 40);
      scrollTicking = false;
    });
    scrollTicking = true;
  }
}, { passive: true });

if (menuToggle && mobileMenu) {
  menuToggle.addEventListener("click", () => {
    const open = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!open));
    mobileMenu.hidden = open;
    document.body.classList.toggle("menu-open", !open);
  });

  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => menuToggle.click());
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      menuToggle.click();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900 && menuToggle.getAttribute("aria-expanded") === "true") {
      menuToggle.setAttribute("aria-expanded", "false");
      mobileMenu.hidden = true;
      document.body.classList.remove("menu-open");
    }
  }, { passive: true });
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

function observeReveals(elements) {
  elements.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index % 4, 3) * 80}ms`;
    observer.observe(element);
  });
}

observeReveals(document.querySelectorAll(".reveal"));

renderDestinations();
populateJourneyOptions();

fetch("/.netlify/functions/packages")
  .then((response) => response.ok ? response.json() : Promise.reject())
  .then(({ packages }) => {
    if (!Array.isArray(packages) || packages.length === 0) return;
    destinations = packages;
    renderDestinations();
    populateJourneyOptions();
  })
  .catch(() => {
    // The static fallback above keeps the site useful before Netlify is configured.
  });

document.querySelectorAll("[data-year]").forEach(el => { el.textContent = new Date().getFullYear(); });
