import { supabase } from "./config.js";

// User Session
let currentUser = {
  id: null,
  name: null,
  isAdmin: false,
};

// Initialize user session
function initializeUser() {
  let userId = localStorage.getItem("chatUserId");
  let userName = localStorage.getItem("chatUserName");

  if (!userId) {
    userId = "user_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("chatUserId", userId);
  }

  if (!userName) {
    userName = prompt("Please enter your name for the chat:") || "Guest";
    localStorage.setItem("chatUserName", userName);
  }

  currentUser.id = userId;
  currentUser.name = userName;
}

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

    // Clear existing items
    items = {
      photos: [],
      shortVideos: [],
      longVideos: [],
    };

    // Organize items by category
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

        if (item.category === "photos") {
          items.photos.push(formattedItem);
        } else if (item.category === "shortVideos") {
          items.shortVideos.push(formattedItem);
        } else if (item.category === "longVideos") {
          items.longVideos.push(formattedItem);
        }
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
    ? `
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${item.progress}%"></div>
      <span class="progress-label">${item.progress}% Complete</span>
    </div>
  `
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

      <textarea placeholder="Add your feedback here..." class="comment-box" data-id="${
        item.id
      }">${item.comment || ""}</textarea>

      <div class="item-footer">
        <div class="approve-box">
          <input type="checkbox" id="${checkId}" class="approve-checkbox" data-id="${
    item.id
  }" ${item.isApproved ? "checked" : ""}>
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
  const allCategories = ["photos", "shortVideos", "longVideos"];

  allCategories.forEach((category) => {
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

// Attach event listeners to dynamically created elements
function attachEventListeners() {
  const checkboxes = document.querySelectorAll(".approve-checkbox");
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", handleApprovalChange);
  });

  const commentBoxes = document.querySelectorAll(".comment-box");
  commentBoxes.forEach((box) => {
    box.addEventListener("input", handleCommentChange);
  });
}

// Handle approval change
async function handleApprovalChange(e) {
  const itemElement = e.target.closest(".item");
  const badge = itemElement.querySelector(".badge");
  const itemId = Number(e.target.dataset.id);

  if (e.target.checked) {
    itemElement.classList.add("approved");
    badge.classList.remove(
      "badge-pending",
      "badge-uploaded",
      "badge-rendering"
    );
    badge.classList.add("badge-approved");
    badge.textContent = "Approved";
  } else {
    itemElement.classList.remove("approved");
    badge.classList.remove("badge-approved");
    badge.classList.add("badge-pending");
    badge.textContent = "Pending";
  }

  // Update in database
  try {
    const { error } = await supabase
      .from("client_deliverables")
      .update({ is_approved: e.target.checked })
      .eq("id", itemId);

    if (error) throw error;

    // Update local data
    ["photos", "shortVideos", "longVideos"].forEach((category) => {
      const item = items[category].find((i) => i.id === itemId);
      if (item) {
        item.isApproved = e.target.checked;
      }
    });
  } catch (error) {
    console.error("Error updating approval:", error);
  }

  updateProgress();
}

// Handle comment change (save comment)
async function handleCommentChange(e) {
  const itemId = Number(e.target.dataset.id);
  const comment = e.target.value.trim();

  // Update in database
  try {
    const { error } = await supabase
      .from("client_deliverables")
      .update({ comment: comment })
      .eq("id", itemId);

    if (error) throw error;

    // Update local data
    ["photos", "shortVideos", "longVideos"].forEach((category) => {
      const item = items[category].find((i) => i.id === itemId);
      if (item) {
        item.comment = comment;
      }
    });
  } catch (error) {
    console.error("Error updating comment:", error);
  }
}

// Update progress indicator
function updateProgress() {
  const total = document.querySelectorAll(".approve-checkbox").length;
  const approved = document.querySelectorAll(
    ".approve-checkbox:checked"
  ).length;
  document.getElementById(
    "progressText"
  ).textContent = `${approved}/${total} Approved`;
}

// Tab Switching
const tabs = document.querySelectorAll(".tab");
const sections = document.querySelectorAll(".content");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    sections.forEach((sec) => sec.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.target).classList.add("active");
  });
});

// Dark Mode Toggle
const modeToggle = document.getElementById("modeToggle");

modeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  if (document.body.classList.contains("dark")) {
    modeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    modeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  }
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

modalClose.addEventListener("click", () => {
  adminModal.classList.remove("active");
});

adminModal.addEventListener("click", (e) => {
  if (e.target === adminModal) {
    adminModal.classList.remove("active");
  }
});

// Category selection shows/hides duration field
const categorySelect = document.getElementById("categorySelect");
const durationGroup = document.getElementById("durationGroup");

categorySelect.addEventListener("change", () => {
  if (categorySelect.value === "photos") {
    durationGroup.style.display = "none";
  } else {
    durationGroup.style.display = "block";
  }
});

// Add Item Form
const addItemForm = document.getElementById("addItemForm");

addItemForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const category = document.getElementById("categorySelect").value;
  const title = document.getElementById("itemTitle").value;
  const url = document.getElementById("itemUrl").value;
  const status = document.getElementById("itemStatus").value;
  const duration = document.getElementById("itemDuration").value;

  const newItem = {
    title: title,
    url: url,
    status: status,
    category: category,
  };

  if (category !== "photos" && duration) {
    newItem.duration = duration;
  }

  if (status === "rendering") {
    newItem.progress = Math.floor(Math.random() * 100);
  }

  try {
    const { data, error } = await supabase
      .from("client_deliverables")
      .insert([newItem])
      .select();

    if (error) throw error;

    // Add to local items
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

// Render admin items list
function renderAdminItems() {
  const itemsList = document.getElementById("itemsList");
  const allItems = [
    ...items.photos.map((item) => ({
      ...item,
      category: "photos",
      categoryName: "Pictures",
    })),
    ...items.shortVideos.map((item) => ({
      ...item,
      category: "shortVideos",
      categoryName: "Short Videos",
    })),
    ...items.longVideos.map((item) => ({
      ...item,
      category: "longVideos",
      categoryName: "Long Videos",
    })),
  ];

  if (allItems.length === 0) {
    itemsList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>No items yet. Add your first deliverable above!</p>
      </div>
    `;
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
    </div>
  `
    )
    .join("");
}

// Delete Item
window.deleteItem = async function (id, category) {
  if (confirm("Are you sure you want to delete this item?")) {
    try {
      const { error } = await supabase
        .from("client_deliverables")
        .delete()
        .eq("id", id);

      if (error) throw error;

      items[category] = items[category].filter((item) => item.id !== id);
      await renderItems();
      renderAdminItems();

      alert("✅ Item deleted successfully!");
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("❌ Failed to delete item. Please try again.");
    }
  }
};

// Edit Item
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

  // Delete from database
  try {
    const { error } = await supabase
      .from("client_deliverables")
      .delete()
      .eq("id", id);

    if (error) throw error;

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

// Approve All in Section
const approveAllButtons = document.querySelectorAll(".btn-approve-all");

approveAllButtons.forEach((button) => {
  button.addEventListener("click", function () {
    const section = this.dataset.section;
    const sectionElement = document.getElementById(section);
    const checkboxes = sectionElement.querySelectorAll(".approve-checkbox");

    checkboxes.forEach((checkbox) => {
      if (!checkbox.checked) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event("change"));
      }
    });
  });
});

// Submit All Feedback
const submitButton = document.querySelector(".btn-submit");

submitButton.addEventListener("click", function () {
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
      const itemElement = box.closest(".item");
      const itemTitle = itemElement.querySelector("h3").textContent;
      comments.push({ item: itemTitle, comment: box.value });
    }
  });

  const finalNotes = document.querySelector(".final-notes").value;

  console.log("Submission Data:", {
    approved: approved,
    total: total,
    comments: comments,
    finalNotes: finalNotes,
  });

  alert(
    `✅ Feedback submitted successfully!\n\n${approved}/${total} items approved.`
  );
});

// Download Report
const downloadButton = document.querySelector(".btn-download");

downloadButton.addEventListener("click", function () {
  const approved = document.querySelectorAll(
    ".approve-checkbox:checked"
  ).length;
  const total = document.querySelectorAll(".approve-checkbox").length;

  let report = "=== CLIENT DELIVERY PORTAL REPORT ===\n\n";
  report += `Date: ${new Date().toLocaleDateString()}\n`;
  report += `Time: ${new Date().toLocaleTimeString()}\n`;
  report += `Progress: ${approved}/${total} items approved\n\n`;

  sections.forEach((section) => {
    if (
      section.id === "photos" ||
      section.id === "shortVideos" ||
      section.id === "longVideos"
    ) {
      const sectionTitle = section.querySelector("h2").textContent;
      report += `\n--- ${sectionTitle} ---\n\n`;

      section.querySelectorAll(".item").forEach((item) => {
        const title = item.querySelector("h3").textContent;
        const isApproved = item.querySelector(".approve-checkbox").checked;
        const comment = item.querySelector(".comment-box").value;

        report += `${title}\n`;
        report += `Status: ${isApproved ? "APPROVED ✓" : "PENDING"}\n`;
        if (comment.trim()) {
          report += `Comment: ${comment}\n`;
        }
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

// =============================================
// LIVE CHAT FUNCTIONALITY
// =============================================

let chatChannel = null;
let unreadCount = 0;
let lastMessageId = 0;

// Chat UI Elements
const chatToggle = document.getElementById("chatToggle");
const chatContainer = document.getElementById("chatContainer");
const chatClose = document.getElementById("chatClose");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");
const chatBadge = document.getElementById("chatBadge");

// Toggle Chat
chatToggle.addEventListener("click", () => {
  chatContainer.classList.toggle("active");
  if (chatContainer.classList.contains("active")) {
    unreadCount = 0;
    updateChatBadge();
    chatInput.focus();
    markMessagesAsRead();
  }
});

chatClose.addEventListener("click", () => {
  chatContainer.classList.remove("active");
});

// Update badge count
function updateChatBadge() {
  if (unreadCount > 0) {
    chatBadge.textContent = unreadCount > 99 ? "99+" : unreadCount;
    chatBadge.style.display = "flex";
  } else {
    chatBadge.style.display = "none";
  }
}

// Send message on Enter key
chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Send message on button click
chatSend.addEventListener("click", sendMessage);

// Send Message Function
async function sendMessage() {
  const message = chatInput.value.trim();

  if (!message) return;

  chatSend.disabled = true;

  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .insert([
        {
          user_id: currentUser.id,
          user_name: currentUser.name,
          message: message,
          is_admin: currentUser.isAdmin,
        },
      ])
      .select();

    if (error) throw error;

    chatInput.value = "";
    chatInput.focus();
  } catch (error) {
    console.error("Error sending message:", error);
    alert("Failed to send message. Please try again.");
  } finally {
    chatSend.disabled = false;
  }
}

// Load Messages
async function loadMessages() {
  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) throw error;

    if (data && data.length > 0) {
      chatMessages.innerHTML = "";
      data.forEach((msg) => {
        displayMessage(msg, false);
      });
      lastMessageId = data[data.length - 1].id;
    }
  } catch (error) {
    console.error("Error loading messages:", error);
  }
}

// Display Message
function displayMessage(msg, isNew = true) {
  const isSent = msg.user_id === currentUser.id;
  const messageTime = new Date(msg.created_at).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const initials = msg.user_name.charAt(0).toUpperCase();
  const avatarClass = msg.is_admin ? "message-avatar admin" : "message-avatar";

  const messageHTML = `
    <div class="chat-message ${isSent ? "sent" : ""}">
      <div class="${avatarClass}">${initials}</div>
      <div class="message-content">
        <div class="message-bubble">${escapeHtml(msg.message)}</div>
        <div class="message-time">${
          isSent ? "You" : msg.user_name
        } • ${messageTime}</div>
      </div>
    </div>
  `;

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = messageHTML;
  const messageElement = tempDiv.firstElementChild;

  chatMessages.appendChild(messageElement);

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Update unread count if chat is closed and message is not from current user
  if (!chatContainer.classList.contains("active") && !isSent && isNew) {
    unreadCount++;
    updateChatBadge();
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Mark messages as read
function markMessagesAsRead() {
  unreadCount = 0;
  updateChatBadge();
}

// Subscribe to real-time messages
function subscribeToMessages() {
  chatChannel = supabase
    .channel("chat_messages")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
      },
      (payload) => {
        displayMessage(payload.new, true);
      }
    )
    .subscribe();
}

// Subscribe to real-time deliverables changes
function subscribeToDeliverables() {
  const deliverablesChannel = supabase
    .channel("client_deliverables")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "client_deliverables",
      },
      async (payload) => {
        console.log("Deliverable change detected:", payload);
        // Reload all data to sync
        await loadData();
        await renderItems();
        renderAdminItems();
      }
    )
    .subscribe();
}

// Initialize Chat
async function initializeChat() {
  initializeUser();
  await loadMessages();
  subscribeToMessages();
}

// Initialize on load
document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  await renderItems();
  initializeChat();
  subscribeToDeliverables();
});
