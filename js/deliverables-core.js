import { supabase } from "./config.js";
import { initializeUser, currentUser } from "./chat.js";

// Initialize user (needed so admin controls detect roles)
initializeUser();

// EXPORT items so admin script can access it
export let items = {
  photos: [],
  shortVideos: [],
  longVideos: [],
};

// Load data from Supabase
export async function loadData() {
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
        if (item.category === "shortVideos")
          items.shortVideos.push(formattedItem);
        if (item.category === "longVideos")
          items.longVideos.push(formattedItem);
      });
    }
  } catch (error) {
    console.error("Error loading deliverables:", error);
  }
}

// Create item HTML
export function createItemHTML(item, category) {
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
    ? `
    <div class="progress-bar">
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

      <a href="${item.url}" class="btn btn-view" target="_blank">
        <i class="fas fa-external-link-alt"></i> View File
      </a>

      <textarea placeholder="Add your feedback here..." class="comment-box" data-id="${
        item.id
      }">
${item.comment || ""}
</textarea>

      <div class="item-footer">
        <div class="approve-box">
          <input type="checkbox" id="${checkId}" class="approve-checkbox" data-id="${
    item.id
  }"
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

// Render items
export async function renderItems() {
  const photosGrid = document.getElementById("photosGrid");
  const shortVideosGrid = document.getElementById("shortVideosGrid");
  const longVideosGrid = document.getElementById("longVideosGrid");

  photosGrid.innerHTML = items.photos
    .map((i) => createItemHTML(i, "photos"))
    .join("");
  shortVideosGrid.innerHTML = items.shortVideos
    .map((i) => createItemHTML(i, "shortVideos"))
    .join("");
  longVideosGrid.innerHTML = items.longVideos
    .map((i) => createItemHTML(i, "longVideos"))
    .join("");

  attachEventListeners();
  updateProgress();
  updateApprovalStates();
}

// Update approvals
export function updateApprovalStates() {
  ["photos", "shortVideos", "longVideos"].forEach((category) => {
    items[category].forEach((item) => {
      const el = document.querySelector(`.item[data-id="${item.id}"]`);
      if (el && item.isApproved) {
        el.classList.add("approved");

        const badge = el.querySelector(".badge");
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

// Attach listeners
export function attachEventListeners() {
  document
    .querySelectorAll(".approve-checkbox")
    .forEach((c) => c.addEventListener("change", handleApprovalChange));

  document
    .querySelectorAll(".comment-box")
    .forEach((box) => box.addEventListener("input", handleCommentChange));
}

// Handle approval
export async function handleApprovalChange(e) {
  const itemId = Number(e.target.dataset.id);
  const el = e.target.closest(".item");
  const badge = el.querySelector(".badge");

  if (e.target.checked) {
    el.classList.add("approved");
    badge.classList.remove(
      "badge-pending",
      "badge-uploaded",
      "badge-rendering"
    );
    badge.classList.add("badge-approved");
    badge.textContent = "Approved";
  } else {
    el.classList.remove("approved");
    badge.classList.remove("badge-approved");
    badge.classList.add("badge-pending");
    badge.textContent = "Pending";
  }

  await supabase
    .from("client_deliverables")
    .update({
      is_approved: e.target.checked,
    })
    .eq("id", itemId);

  ["photos", "shortVideos", "longVideos"].forEach((cat) => {
    const item = items[cat].find((i) => i.id === itemId);
    if (item) item.isApproved = e.target.checked;
  });

  updateProgress();
}

// Handle comments
export async function handleCommentChange(e) {
  const itemId = Number(e.target.dataset.id);
  const comment = e.target.value.trim();

  await supabase
    .from("client_deliverables")
    .update({ comment })
    .eq("id", itemId);

  ["photos", "shortVideos", "longVideos"].forEach((cat) => {
    const item = items[cat].find((i) => i.id === itemId);
    if (item) item.comment = comment;
  });
}

// Progress
export function updateProgress() {
  const total = document.querySelectorAll(".approve-checkbox").length;
  const approved = document.querySelectorAll(
    ".approve-checkbox:checked"
  ).length;
  document.getElementById(
    "progressText"
  ).textContent = `${approved}/${total} Approved`;
}

// Realtime
export function subscribeToDeliverables() {
  supabase
    .channel("client_deliverables")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "client_deliverables" },
      async () => {
        await loadData();
        await renderItems();
      }
    )
    .subscribe();
}

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  await renderItems();
  subscribeToDeliverables();
});
