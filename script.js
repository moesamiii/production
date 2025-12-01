// Supabase Configuration
const SUPABASE_URL = "https://kfsutnshxukcebymoitu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtmc3V0bnNoeHVrY2VieW1vaXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTAxMjcsImV4cCI6MjA4MDE2NjEyN30.0Hk5IaAHlCSNWkrEGOjYdSViAX5zMYb25IOBYdc9El4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

let itemIdCounter = 0;

// Load data from memory
function loadData() {
  const savedData = {
    photos: [
      {
        id: 1,
        title: "Feed Image 01",
        url: "https://drive.google.com/file/d/example1",
        status: "pending",
        timestamp: new Date().toISOString(),
      },
      {
        id: 2,
        title: "Story Image 01",
        url: "https://drive.google.com/file/d/example2",
        status: "pending",
        timestamp: new Date().toISOString(),
      },
    ],
    shortVideos: [
      {
        id: 3,
        title: "Reel Video 01",
        url: "https://drive.google.com/file/d/example3",
        status: "uploaded",
        duration: "0:28",
        timestamp: new Date().toISOString(),
      },
    ],
    longVideos: [
      {
        id: 4,
        title: "Promo Video",
        url: "https://drive.google.com/file/d/example4",
        status: "rendering",
        duration: "1:05",
        progress: 75,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  items = savedData;
  itemIdCounter = 4;
}

// Save data to memory
function saveData() {
  console.log("Data saved:", items);
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
      }"></textarea>

      <div class="item-footer">
        <div class="approve-box">
          <input type="checkbox" id="${checkId}" class="approve-checkbox" data-id="${
    item.id
  }">
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
function renderItems() {
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
function handleApprovalChange(e) {
  const itemElement = e.target.closest(".item");
  const badge = itemElement.querySelector(".badge");

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

  updateProgress();
}

// Handle comment change (save comment)
function handleCommentChange(e) {
  const itemId = Number(e.target.dataset.id);

  ["photos", "shortVideos", "longVideos"].forEach((category) => {
    const item = items[category].find((i) => i.id === itemId);
    if (item) {
      item.comment = e.target.value.trim();
    }
  });

  saveData();
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

addItemForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const category = document.getElementById("categorySelect").value;
  const title = document.getElementById("itemTitle").value;
  const url = document.getElementById("itemUrl").value;
  const status = document.getElementById("itemStatus").value;
  const duration = document.getElementById("itemDuration").value;

  itemIdCounter++;

  const newItem = {
    id: itemIdCounter,
    title: title,
    url: url,
    status: status,
    timestamp: new Date().toISOString(),
  };

  if (category !== "photos" && duration) {
    newItem.duration = duration;
  }

  if (status === "rendering") {
    newItem.progress = Math.floor(Math.random() * 100);
  }

  items[category].push(newItem);
  saveData();
  renderItems();
  renderAdminItems();

  addItemForm.reset();
  durationGroup.style.display = "none";

  alert("✅ Item added successfully!");
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
window.deleteItem = function (id, category) {
  if (confirm("Are you sure you want to delete this item?")) {
    items[category] = items[category].filter((item) => item.id !== id);
    saveData();
    renderItems();
    renderAdminItems();
  }
};

// Edit Item
window.editItem = function (id, category) {
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

  items[category] = items[category].filter((i) => i.id !== id);
  saveData();
  renderItems();
  renderAdminItems();

  alert(
    'ℹ️ Item loaded for editing. Update the fields and click "Add Item" to save.'
  );
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

// Initialize Chat
async function initializeChat() {
  initializeUser();
  await loadMessages();
  subscribeToMessages();
}

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  renderItems();
  initializeChat();
});
