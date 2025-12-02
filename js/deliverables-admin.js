import { supabase } from "./config.js";
import {
  items,
  renderItems,
  loadData,
  updateProgress,
  createItemHTML,
} from "./deliverables-core.js";
import { currentUser } from "./chat.js";

// ================================
// TABS
// ================================
const tabs = document.querySelectorAll(".tab");
const sections = document.querySelectorAll(".content");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    sections.forEach((s) => s.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.target).classList.add("active");
  });
});

// ================================
// DARK MODE
// ================================
const modeToggle = document.getElementById("modeToggle");

modeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  modeToggle.innerHTML = document.body.classList.contains("dark")
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
});

// ================================
// ADMIN MODAL
// ================================
const adminModal = document.getElementById("adminModal");
const adminToggle = document.getElementById("adminToggle");
const modalClose = document.querySelector(".modal-close");

adminToggle.addEventListener("click", () => {
  const pass = prompt("Enter Admin Password:");

  if (pass === "samitech97") {
    adminModal.classList.add("active");
    currentUser.isAdmin = true;
    renderAdminItems();
  } else {
    alert("❌ Incorrect password!");
  }
});

modalClose.addEventListener("click", () =>
  adminModal.classList.remove("active")
);
adminModal.addEventListener(
  "click",
  (e) => e.target === adminModal && adminModal.classList.remove("active")
);

// ================================
// CATEGORY TOGGLE
// ================================
const categorySelect = document.getElementById("categorySelect");
const durationGroup = document.getElementById("durationGroup");

categorySelect.addEventListener("change", () => {
  durationGroup.style.display =
    categorySelect.value === "photos" ? "none" : "block";
});

// ================================
// ADD ITEM
// ================================
const addItemForm = document.getElementById("addItemForm");

addItemForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const category = document.getElementById("categorySelect").value;
  const title = document.getElementById("itemTitle").value;
  const url = document.getElementById("itemUrl").value;
  const status = document.getElementById("itemStatus").value;
  const duration = document.getElementById("itemDuration").value;

  const newItem = { title, url, status, category };
  if (category !== "photos" && duration) newItem.duration = duration;
  if (status === "rendering")
    newItem.progress = Math.floor(Math.random() * 100);

  try {
    const { data, error } = await supabase
      .from("client_deliverables")
      .insert([newItem])
      .select();

    if (error) throw error;

    items[category].push({
      id: data[0].id,
      title: data[0].title,
      url: data[0].url,
      status: data[0].status,
      duration: data[0].duration,
      progress: data[0].progress,
      timestamp: data[0].created_at,
      isApproved: false,
      comment: "",
    });

    await renderItems();
    renderAdminItems();

    addItemForm.reset();
    durationGroup.style.display = "none";

    alert("✅ Item added successfully!");
  } catch (error) {
    console.error(error);
    alert("❌ Failed to add item.");
  }
});

// ================================
// RENDER ADMIN PANEL
// ================================
function renderAdminItems() {
  const itemsList = document.getElementById("itemsList");

  const allItems = [
    ...items.photos.map((i) => ({
      ...i,
      category: "photos",
      categoryName: "Pictures",
    })),
    ...items.shortVideos.map((i) => ({
      ...i,
      category: "shortVideos",
      categoryName: "Short Videos",
    })),
    ...items.longVideos.map((i) => ({
      ...i,
      category: "longVideos",
      categoryName: "Long Videos",
    })),
  ];

  if (allItems.length === 0) {
    itemsList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>No items yet. Add your first deliverable above!</p>
      </div>`;
    return;
  }

  itemsList.innerHTML = allItems
    .map(
      (item) => `
    <div class="item-row">
      <div class="item-info">
        <h4>${item.title}</h4>
        <p>${item.categoryName} • ${item.status}</p>
      </div>
      <div class="item-actions">
        <button class="btn-edit" onclick="editItem(${item.id}, '${item.category}')">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button class="btn-delete" onclick="deleteItem(${item.id}, '${item.category}')">
          <i class="fas fa-trash"></i> Delete
        </button>
      </div>
    </div>`
    )
    .join("");
}

// ================================
// DELETE ITEM
// ================================
window.deleteItem = async function (id, category) {
  if (!confirm("Delete this item?")) return;

  try {
    await supabase.from("client_deliverables").delete().eq("id", id);

    items[category] = items[category].filter((i) => i.id !== id);

    await renderItems();
    renderAdminItems();

    alert("✅ Item deleted!");
  } catch (error) {
    console.error(error);
    alert("❌ Could not delete.");
  }
};

// ================================
// EDIT ITEM
// ================================
window.editItem = async function (id, category) {
  const item = items[category].find((i) => i.id === id);
  if (!item) return;

  document.getElementById("categorySelect").value = category;
  document.getElementById("itemTitle").value = item.title;
  document.getElementById("itemUrl").value = item.url;
  document.getElementById("itemStatus").value = item.status;

  if (item.duration) {
    durationGroup.style.display = "block";
    document.getElementById("itemDuration").value = item.duration;
  }

  try {
    await supabase.from("client_deliverables").delete().eq("id", id);

    items[category] = items[category].filter((i) => i.id !== id);

    await renderItems();
    renderAdminItems();

    alert("ℹ️ Editing mode — update fields and click 'Add Item'");
  } catch (error) {
    console.error(error);
    alert("❌ Failed to load item for editing.");
  }
};

// ================================
// APPROVE ALL BUTTONS
// ================================
document.querySelectorAll(".btn-approve-all").forEach((button) => {
  button.addEventListener("click", function () {
    const section = document.getElementById(this.dataset.section);
    const checkboxes = section.querySelectorAll(".approve-checkbox");

    checkboxes.forEach((c) => {
      if (!c.checked) {
        c.checked = true;
        c.dispatchEvent(new Event("change"));
      }
    });
  });
});

// ================================
// SUBMIT ALL FEEDBACK
// ================================
document.querySelector(".btn-submit").addEventListener("click", () => {
  const total = document.querySelectorAll(".approve-checkbox").length;
  const approved = document.querySelectorAll(
    ".approve-checkbox:checked"
  ).length;

  if (approved === 0) return alert("⚠️ Approve at least one item.");

  alert(`✅ Feedback submitted! (${approved}/${total})`);
});

// ================================
// DOWNLOAD REPORT
// ================================
document.querySelector(".btn-download").addEventListener("click", () => {
  const approved = document.querySelectorAll(
    ".approve-checkbox:checked"
  ).length;
  const total = document.querySelectorAll(".approve-checkbox").length;

  let report = `=== CLIENT DELIVERY REPORT ===
Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}
Progress: ${approved}/${total} approved

`;

  sections.forEach((section) => {
    if (!["photos", "shortVideos", "longVideos"].includes(section.id)) return;

    report += `\n--- ${section.querySelector("h2").textContent} ---\n\n`;

    section.querySelectorAll(".item").forEach((item) => {
      const title = item.querySelector("h3").textContent;
      const isApproved = item.querySelector(".approve-checkbox").checked;
      const comment = item.querySelector(".comment-box").value;

      report += `${title}\nStatus: ${isApproved ? "APPROVED ✓" : "PENDING"}\n`;
      if (comment.trim()) report += `Comment: ${comment}\n`;
      report += "\n";
    });
  });

  const notes = document.querySelector(".final-notes").value;
  if (notes.trim()) report += `\n--- FINAL NOTES ---\n${notes}\n`;

  const blob = new Blob([report], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `client-feedback-${new Date().toISOString().split("T")[0]}.txt`;
  a.click();

  URL.revokeObjectURL(url);
});
