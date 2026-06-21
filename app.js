const state = {
  data: null,
  section: "all",
  category: "all",
  query: "",
};

const sectionButtons = [...document.querySelectorAll("[data-section]")];
const searchInput = document.querySelector("#searchInput");
const categoryList = document.querySelector("#categoryList");
const statsGrid = document.querySelector("#statsGrid");
const notesBand = document.querySelector("#notesBand");
const inventory = document.querySelector("#inventory");
const resultTitle = document.querySelector("#resultTitle");
const resultCount = document.querySelector("#resultCount");
const lastUpdated = document.querySelector("#lastUpdated");

const normal = (value) => (value || "").toString().toLowerCase().trim();

function matchesQuery(category, group, item) {
  if (!state.query) return true;
  const haystack = [
    category.name,
    group.name,
    group.note,
    item.name,
    item.quantity,
    item.note,
    item.subgroup,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(state.query);
}

function selectedSections() {
  return state.data.sections.filter((section) => state.section === "all" || section.id === state.section);
}

function allCategories() {
  return selectedSections().flatMap((section) =>
    section.categories.map((category) => ({ ...category, sectionId: section.id, sectionTitle: section.title }))
  );
}

function renderStats() {
  const totals = state.data.totals;
  statsGrid.innerHTML = [
    ["หมวดใหญ่", totals.categories],
    ["กลุ่มยา", totals.groups],
    ["รายการยา", totals.items],
  ]
    .map(([label, value]) => `<div class="stat"><strong>${value.toLocaleString("th-TH")}</strong><span>${label}</span></div>`)
    .join("");
  lastUpdated.textContent = `อัปเดตข้อมูล ${state.data.updatedAt}`;
}

function renderNotes() {
  const inside = state.data.sections.find((section) => section.id === "inside");
  if (!inside?.notes?.length || state.section === "outside") {
    notesBand.hidden = true;
    return;
  }
  const notes = inside.notes.slice(1, 5).map((note) => `<li>${escapeHtml(note)}</li>`).join("");
  notesBand.hidden = false;
  notesBand.innerHTML = `<h3>คำแนะนำก่อนสั่งรอบแรก</h3><ul>${notes}</ul>`;
}

function renderCategories() {
  const categories = allCategories();
  const buttons = [
    `<button class="category-btn ${state.category === "all" ? "active" : ""}" type="button" data-category="all">
      <span class="category-name">ทุกหมวด</span><span class="category-count">${categories.length}</span>
    </button>`,
    ...categories.map(
      (category) => `<button class="category-btn ${state.category === categoryKey(category) ? "active" : ""}" type="button" data-category="${categoryKey(category)}">
        <span class="category-name">${escapeHtml(category.name)}</span><span class="category-count">${category.itemCount}</span>
      </button>`
    ),
  ];
  categoryList.innerHTML = buttons.join("");
}

function categoryKey(category) {
  return `${category.sectionId}::${category.name}`;
}

function filteredData() {
  return allCategories()
    .filter((category) => state.category === "all" || categoryKey(category) === state.category)
    .map((category) => {
      const groups = category.groups
        .map((group) => {
          const items = group.items.filter((item) => matchesQuery(category, group, item));
          return { ...group, items };
        })
        .filter((group) => group.items.length || (state.query && normal(group.name).includes(state.query)));
      return { ...category, groups };
    })
    .filter((category) => category.groups.length);
}

function renderInventory() {
  const categories = filteredData();
  const itemTotal = categories.reduce(
    (sum, category) => sum + category.groups.reduce((groupSum, group) => groupSum + group.items.length, 0),
    0
  );
  const titleParts = [];
  if (state.section !== "all") {
    titleParts.push(state.data.sections.find((section) => section.id === state.section)?.title);
  }
  if (state.category !== "all") {
    titleParts.push(state.category.split("::")[1]);
  }
  resultTitle.textContent = titleParts.filter(Boolean).join(" / ") || "ทั้งหมด";
  resultCount.textContent = `${itemTotal.toLocaleString("th-TH")} รายการ`;

  if (!categories.length) {
    inventory.innerHTML = `<div class="empty-state">ไม่พบรายการที่ตรงกับคำค้นหา</div>`;
    return;
  }

  inventory.innerHTML = categories
    .map(
      (category) => `<article class="category-section">
        <div class="category-title">
          <h3>${escapeHtml(category.name)}</h3>
          <span class="section-label">${escapeHtml(category.sectionTitle)}</span>
        </div>
        ${category.groups.map(renderGroup).join("")}
      </article>`
    )
    .join("");
}

function renderGroup(group) {
  return `<section class="group-card">
    <div class="group-head">
      <h4>${escapeHtml(group.name)}</h4>
      <span class="item-count">${group.items.length} รายการ</span>
      ${group.note ? `<p>${escapeHtml(group.note)}</p>` : ""}
    </div>
    <div class="items">${group.items.map(renderItem).join("")}</div>
  </section>`;
}

function renderItem(item, index, items) {
  const prev = items[index - 1];
  const showSubgroup = item.subgroup && item.subgroup !== prev?.subgroup;
  return `<div class="item-row">
    <div class="item-main">
      ${showSubgroup ? `<span class="subgroup">${escapeHtml(item.subgroup)}</span>` : ""}
      <div class="item-name">${escapeHtml(item.name)}</div>
      ${item.note ? `<div class="item-note">${escapeHtml(item.note)}</div>` : ""}
    </div>
    <div class="quantity">${escapeHtml(item.quantity)}</div>
  </div>`;
}

function escapeHtml(value) {
  return (value || "").toString().replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
  });
}

function render() {
  renderNotes();
  renderCategories();
  renderInventory();
}

sectionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.section = button.dataset.section;
    state.category = "all";
    sectionButtons.forEach((item) => item.classList.toggle("active", item === button));
    render();
  });
});

searchInput.addEventListener("input", (event) => {
  state.query = normal(event.target.value);
  renderInventory();
});

categoryList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.category = button.dataset.category;
  render();
});

function boot(data) {
  state.data = data;
  renderStats();
  render();
}

if (window.STARTER_PACK_DATA) {
  boot(window.STARTER_PACK_DATA);
} else {
  fetch("data.json")
    .then((response) => response.json())
    .then(boot);
}
