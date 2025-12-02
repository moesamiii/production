import { supabase } from "./config.js";

export let currentUser = {
  id: null,
  name: null,
  isAdmin: false,
};

// ========================
// USER SESSION
// ========================
export function initializeUser() {
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

// ========================
// CHAT VARIABLES
// ========================
let chatChannel = null;
let unreadCount = 0;
let lastMessageId = 0;

// ========================
// CHAT UI ELEMENTS
// ========================
const chatToggle = document.getElementById("chatToggle");
const chatContainer = document.getElementById("chatContainer");
const chatClose = document.getElementById("chatClose");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");
const chatBadge = document.getElementById("chatBadge");

// Toggle Chat Window
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
// Enter to send message
chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Send message on button
chatSend.addEventListener("click", sendMessage);

// Send Message
async function sendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  chatSend.disabled = true;

  try {
    await supabase.from("chat_messages").insert([
      {
        user_id: currentUser.id,
        user_name: currentUser.name,
        message,
        is_admin: currentUser.isAdmin,
      },
    ]);

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
      data.forEach((msg) => displayMessage(msg, false));
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

  const msgHtml = `
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

  const temp = document.createElement("div");
  temp.innerHTML = msgHtml;

  chatMessages.appendChild(temp.firstElementChild);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  if (!chatContainer.classList.contains("active") && !isSent && isNew) {
    unreadCount++;
    updateChatBadge();
  }
}

// Escape HTML
function escapeHtml(text) {
  return text.replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[
        m
      ])
  );
}

// Mark messages as read
function markMessagesAsRead() {
  unreadCount = 0;
  updateChatBadge();
}

// Subscribe to realtime messages
function subscribeToMessages() {
  chatChannel = supabase
    .channel("chat_messages")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages" },
      (payload) => displayMessage(payload.new, true)
    )
    .subscribe();
}

// Initialize Chat
async function initializeChat() {
  initializeUser();
  await loadMessages();
  subscribeToMessages();
}

// Auto init
document.addEventListener("DOMContentLoaded", () => initializeChat());

// Exports
export { initializeUser, currentUser };
