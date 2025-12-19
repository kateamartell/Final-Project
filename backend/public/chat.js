(() => {
  function el(id) {
    return document.getElementById(id);
  }

  function addMsg(chatBox, msg) {
    const div = document.createElement("div");
    const t = new Date(msg.created_at || Date.now()).toLocaleTimeString();

    const name = msg.display_name || "User";
    const color = msg.profile_color || "#111";
    const body = (msg.body || "").toString();

    div.innerHTML = `
      <div style="margin-bottom:10px;">
        <span style="color:${color}; font-weight:700;">${name}</span>
        <span style="color:#6b7280; font-size:0.85em;"> ${t}</span>
        <div>${body}</div>
      </div>
    `;

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  window.addEventListener("DOMContentLoaded", () => {
    const chatBox = el("chat-box");
    if (!chatBox) return;

    // Socket.io client must exist
    if (typeof io === "undefined") {
      chatBox.innerHTML = "<div>Chat unavailable (socket.io not loaded).</div>";
      return;
    }

    const socket = io();
    const input = el("chat-input");
    const send = el("chat-send");

    // Load history
    fetch("/api/chat")
      .then((r) => r.json())
      .then((data) => (data.messages || []).forEach((m) => addMsg(chatBox, m)))
      .catch(() => {});

    // Send message
    function doSend() {
      if (!input) return;
      const body = (input.value || "").trim();
      if (!body) return;
      socket.emit("chat:send", { body });
      input.value = "";
      input.focus();
    }

    if (send) send.addEventListener("click", doSend);
    if (input) input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSend();
    });

    // Receive
    socket.on("chat:new", (msg) => addMsg(chatBox, msg));
  });
})();
