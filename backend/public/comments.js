/**
 * Comments Client-Side Logic
 * --------------------------
 * Handles client-side interactions for comments:
 * - Upvote / downvote reactions
 * - Editing comments inline
 * - Sending updates to the backend via fetch API
 */


document.addEventListener("DOMContentLoaded", () => {

  /* ---------- VOTING ---------- */
  document.querySelectorAll(".vote-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const card = btn.closest(".comment-card");
      const id = card.dataset.id;
      const value = Number(btn.dataset.vote);

      const res = await fetch(`/api/comments/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value })
      });

      if (!res.ok) return;

      const data = await res.json();
      card.querySelector(".vote-score").textContent = data.score;
    });
  });

  /* ---------- EDITING ---------- */
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".comment-card");
      const bodyDiv = card.querySelector("[data-body]");
      const original = bodyDiv.textContent.trim();

      bodyDiv.innerHTML = `
        <textarea class="edit-box">${original}</textarea>
        <button class="save-edit">Save</button>
        <button class="cancel-edit">Cancel</button>
      `;

      bodyDiv.querySelector(".cancel-edit").onclick = () => {
        bodyDiv.innerHTML = original;
      };

      bodyDiv.querySelector(".save-edit").onclick = async () => {
        const newBody = bodyDiv.querySelector(".edit-box").value;

        const res = await fetch(`/api/comments/${card.dataset.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: newBody })
        });

        if (!res.ok) return alert("Edit failed");

        location.reload();
      };
    });
  });

});
