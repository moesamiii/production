import { supabase } from "./config.js";
import { initializeUser, currentUser } from "./chat.js";

// =========================
// USER SESSION INITIALIZE
// =========================
initializeUser();

// Data Storage
let items = {
  photos: [],
  shortVideos: [],
  longVideos: [],
};

// Load data from Supabase
async function loadData() {
  try {
    const { data, error } = await supabase
      .from("client_deliverables")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;

    items = { photos: [], shortVideos: [], longVideos: [] };

    if (data && data.length > 0) {
      data.forEach((item) => {
        const formattedItem = {
          id: item.id,
          title: item.title,
          url: item.url,
          status: item.status,
          duration: item.duration,
          progress: item.progress,
          comment: item.comment,
          isApproved: item.is_approved,
          timestamp: item.created_at,
        };

        if (item.category === "photos") items.photos.push(formattedItem);
        else if (item.category === "shortVideos")
          items.shortVideos.push(formattedItem);
        else if (item.category === "longVideos")
          items.longVideos.push(formattedItem);
      });
    }
  } catch (error) {
    console.error("Error loading deliverables:", error);
  }
}

// Create item HTML
function createItemHTML(item, category) {
  const isVideo = category !== "photos";
  const itemId = `item-${item.id}`;
  const checkId = `check-${item.id}`;

  const statusBadge =
    {
      pending: "badge-pending",
      uploaded: "badge-uploaded",
      rendering: "badge-rendering",
      approved: "badge-approved",
    }[item.status] || "badge-pending";

  const statusText = item.status.charAt(0).toUpperCase() + item.status.slice(1);

  const previewClass = isVideo ? "item-preview video-preview" : "item-preview";
  const previewIcon = isVideo ? "fa-play-circle" : "fa-image";
  const durationHTML = item.duration
    ? `<span class="duration">${item.duration}</span>`
    : "";

  const progressHTML = item.progress
    ? `<div class="progress-bar">
         <div class="progress-fill" style="width: ${item.progress}%"></div>
         <span class="progress-label">${item.progress}% Complete</span>
       </div>`
    : "";

  const timestamp = new Date(item.timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return `
    <div class="item" data-item="${itemId}" data-id="${item.id}">
      <div class="item-header">
        <h3>${item.title}</h3>
        <span class="badge ${statusBadge}">${statusText}</span>
      </div>
      
      <div class="${previewClass}">
        <i class="fas ${previewIcon}"></i>
        <p>Click to view ${isVideo ? "video" : "file"}</p>
        ${durationHTML}
      </div>

      ${progressHTML}

      <a href="${
        item.url
      }" class="btn btn-view" target="_blank" rel="noopener noreferrer">
        <i class="fas fa-external-link-alt"></i> View File
      </a>

      <textarea placeholder="Add your feedback here..." 
        class="comment-box" 
        data-id="${item.id}">${item.comment || ""}</textarea>

      <div class="item-footer">
        <div class="approve-box">
          <input type="checkbox" id="${checkId}" 
            class="approve-checkbox" 
            data-id="${item.id}" 
            ${item.isApproved ? "checked" : ""}>
          <label for="${checkId}">
            <i class="fas fa-check-circle"></i> Approved
          </label>
        </div>
        <div class="item-meta">
          <span class="timestamp">${timestamp}</span>
        </div>
      </div>
    </div>
  `;
}

// Render all items
async function renderItems() {
  const photosGrid = document.getElementById("photosGrid");
  const shortVideosGrid = document.getElementById("shortVideosGrid");
  const longVideosGrid = document.getElementById("longVideosGrid");

  photosGrid.innerHTML = items.photos
    .map((item) => createItemHTML(item, "photos"))
    .join("");
  shortVideosGrid.innerHTML = items.shortVideos
    .map((item) => createItemHTML(item, "shortVideos"))
    .join("");
  longVideosGrid.innerHTML = items.longVideos
    .map((item) => createItemHTML(item, "longVideos"))
    .join("");

  attachEventListeners();
  updateProgress();
  updateApprovalStates();
}

// Update approval states in UI
function updateApprovalStates() {
  ["photos", "shortVideos", "longVideos"].forEach((category) => {
    items[category].forEach((item) => {
      const itemElement = document.querySelector(`.item[data-id="${item.id}"]`);
      if (itemElement && item.isApproved) {
        itemElement.classList.add("approved");
        const badge = itemElement.querySelector(".badge");
        if (badge) {
          badge.classList.remove(
            "badge-pending",
            "badge-uploaded",
            "badge-rendering"
          );
          badge.classList.add("badge-approved");
          badge.textContent = "Approved";
        }
      }
    });
  });
}

// Attach event listeners
function attachEventListeners() {
  document
    .querySelectorAll(".approve-checkbox")
    .forEach((checkbox) =>
      checkbox.addEventListener("change", handleApprovalChange)
    );

  document
    .querySelectorAll(".comment-box")
    .forEach((box) => box.addEventListener("input", handleCommentChange));
}

// Handle approval change
async function handleApprovalChange(e) {
  const itemElement = e.target.closest(".item");
  const badge = itemElement.querySelector(".badge");
  const itemId = Number(e.target.dataset.id);

  if (e.target.checked) {
    itemElement.classList.add("approved");
    badge.classList.replace("badge-pending", "badge-approved");
    badge.textContent = "Approved";
  } else {
    itemElement.classList.remove("approved");
    badge.classList.replace("badge-approved", "badge-pending");
    badge.textContent = "Pending";
  }

  try {
    await supabase
      .from("client_deliverables")
      .update({ is_approved: e.target.checked })
      .eq("id", itemId);

    ["photos", "shortVideos", "longVideos"].forEach((category) => {
      const item = items[category].find((i) => i.id === itemId);
      if (item) item.isApproved = e.target.checked;
    });
  } catch (error) {
    console.error("Error updating approval:", error);
  }

  updateProgress();
}

// Handle comment change
async function handleCommentChange(e) {
  const itemId = Number(e.target.dataset.id);
  const comment = e.target.value.trim();

  try {
    await supabase
      .from("client_deliverables")
      .update({ comment })
      .eq("id", itemId);

    ["photos", "shortVideos", "longVideos"].forEach((category) => {
      const item = items[category].find((i) => i.id === itemId);
      if (item) item.comment = comment;
    });
  } catch (error) {
    console.error("Error updating comment:", error);
  }
}

// Update progress
function updateProgress() {
  const total = document.querySelectorAll(".approve-checkbox").length;
  const approved = document.querySelectorAll(
    ".approve-checkbox:checked"
  ).length;
  document.getElementById(
    "progressText"
  ).textContent = `${approved}/${total} Approved`;
}

// ================================
// TABS + UI + DARK MODE + MODALS
// ================================
const tabs = document.querySelectorAll(".tab");
const sections = document.querySelectorAll(".content");

tabs.forEach((tab) =>
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    sections.forEach((sec) => sec.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.target).classList.add("active");
  })
);

// Dark Mode
const modeToggle = document.getElementById("modeToggle");
modeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  modeToggle.innerHTML = document.body.classList.contains("dark")
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
});

// Admin Modal
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

// Category selection
const categorySelect = document.getElementById("categorySelect");
const durationGroup = document.getElementById("durationGroup");

categorySelect.addEventListener("change", () => {
  durationGroup.style.display =
    categorySelect.value === "photos" ? "none" : "block";
});

// Add Item Form
const addItemForm = document.getElementById("addItemForm");

addItemForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const category = categorySelect.value;
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

    const formattedItem = {
      id: data[0].id,
      title: data[0].title,
      url: data[0].url,
      status: data[0].status,
      duration: data[0].duration,
      progress: data[0].progress,
      timestamp: data[0].created_at,
      isApproved: false,
      comment: "",
    };

    items[category].push(formattedItem);
    await renderItems();
    renderAdminItems();

    addItemForm.reset();
    durationGroup.style.display = "none";

    alert("✅ Item added successfully!");
  } catch (error) {
    console.error("Error adding item:", error);
    alert("❌ Failed to add item. Please try again.");
  }
});

// Render Admin Items
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

// Delete Item
window.deleteItem = async function (id, category) {
  if (!confirm("Are you sure you want to delete this item?")) return;

  try {
    await supabase.from("client_deliverables").delete().eq("id", id);

    items[category] = items[category].filter((item) => item.id !== id);
    await renderItems();
    renderAdminItems();

    alert("✅ Item deleted successfully!");
  } catch (error) {
    console.error("Error deleting item:", error);
    alert("❌ Failed to delete item. Please try again.");
  }
};

// Edit Item
window.editItem = async function (id, category) {
  const item = items[category].find((i) => i.id === id);
  if (!item) return;

  categorySelect.value = category;
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

    alert(
      'ℹ️ Item loaded for editing. Update the fields and click "Add Item" to save.'
    );
  } catch (error) {
    console.error("Error editing item:", error);
    alert("❌ Failed to load item for editing. Please try again.");
  }
};

// Approve All
document.querySelectorAll(".btn-approve-all").forEach((button) => {
  button.addEventListener("click", function () {
    const section = document.getElementById(this.dataset.section);
    section.querySelectorAll(".approve-checkbox").forEach((checkbox) => {
      if (!checkbox.checked) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event("change"));
      }
    });
  });
});

// Submit All Feedback
document.querySelector(".btn-submit").addEventListener("click", () => {
  const approved = document.querySelectorAll(
    ".approve-checkbox:checked"
  ).length;
  const total = document.querySelectorAll(".approve-checkbox").length;

  if (approved === 0) {
    alert("⚠️ Please approve at least one item before submitting.");
    return;
  }

  const comments = [];
  document.querySelectorAll(".comment-box").forEach((box) => {
    if (box.value.trim()) {
      const title = box.closest(".item").querySelector("h3").textContent;
      comments.push({ item: title, comment: box.value });
    }
  });

  const finalNotes = document.querySelector(".final-notes").value;

  console.log("Submission Data:", { approved, total, comments, finalNotes });

  alert(
    `✅ Feedback submitted successfully!\n\n${approved}/${total} items approved.`
  );
});

// Download Report
document.querySelector(".btn-download").addEventListener("click", () => {
  const approved = document.querySelectorAll(
    ".approve-checkbox:checked"
  ).length;
  const total = document.querySelectorAll(".approve-checkbox").length;

  let report = "=== CLIENT DELIVERY PORTAL REPORT ===\n\n";
  report += `Date: ${new Date().toLocaleDateString()}\n`;
  report += `Time: ${new Date().toLocaleTimeString()}\n`;
  report += `Progress: ${approved}/${total} items approved\n\n`;

  sections.forEach((section) => {
    if (["photos", "shortVideos", "longVideos"].includes(section.id)) {
      report += `\n--- ${section.querySelector("h2").textContent} ---\n\n`;

      section.querySelectorAll(".item").forEach((item) => {
        const title = item.querySelector("h3").textContent;
        const isApproved = item.querySelector(".approve-checkbox").checked;
        const comment = item.querySelector(".comment-box").value;

        report += `${title}\nStatus: ${
          isApproved ? "APPROVED ✓" : "PENDING"
        }\n`;
        if (comment.trim()) report += `Comment: ${comment}\n`;
        report += "\n";
      });
    }
  });

  const finalNotes = document.querySelector(".final-notes").value;
  if (finalNotes.trim()) {
    report += "\n--- FINAL NOTES ---\n";
    report += finalNotes + "\n";
  }

  const blob = new Blob([report], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `client-feedback-${new Date().toISOString().split("T")[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});

// Subscribe to realtime deliverables
function subscribeToDeliverables() {
  supabase
    .channel("client_deliverables")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "client_deliverables" },
      async () => {
        await loadData();
        await renderItems();
        renderAdminItems();
      }
    )
    .subscribe();
}

// Page init
document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  await renderItems();
  subscribeToDeliverables();
});

// Export to allow chat.js to trigger refresh if needed
export { loadData, renderItems };
