// API Base URL
const API_URL = "http://localhost:5000/cats";

// DOM Elements
const catForm = document.getElementById("cat-form");
const modalOverlay = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const catIdInput = document.getElementById("cat-id");
const catNameInput = document.getElementById("cat-name");
const catPfpInput = document.getElementById("cat-pfp");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const addCatBtn = document.getElementById("add-cat-btn");
const catsContainer = document.getElementById("cats-container");

// State
let isEditing = false;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadCats();
});

// Event Listeners
catForm.addEventListener("submit", handleFormSubmit);
cancelBtn.addEventListener("click", closeModal);
addCatBtn.addEventListener("click", openAddModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

// Open modal for adding
function openAddModal() {
  isEditing = false;
  modalTitle.textContent = "Add Cat";
  submitBtn.textContent = "Add Cat";
  catForm.reset();
  catIdInput.value = "";
  modalOverlay.classList.add("active");
}

// Open modal for editing
function openEditModal(cat) {
  isEditing = true;
  modalTitle.textContent = "Edit Cat";
  submitBtn.textContent = "Save Changes";
  catIdInput.value = cat.id;
  catNameInput.value = cat.name || "";
  catPfpInput.value = cat.pfp || "";
  modalOverlay.classList.add("active");
}

// Close modal
function closeModal() {
  modalOverlay.classList.remove("active");
  catForm.reset();
}

// Load all cats
async function loadCats() {
  catsContainer.innerHTML = '<div class="loading">Loading cats...</div>';

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Failed to fetch cats");

    const cats = await response.json();
    renderCats(cats);
  } catch (error) {
    console.error("Error loading cats:", error);
    catsContainer.innerHTML =
      '<div class="empty-state">Failed to load cats. Please try again.</div>';
    showToast("Failed to load cats", "error");
  }
}

// Render cats grid
function renderCats(cats) {
  if (cats.length === 0) {
    catsContainer.innerHTML =
      '<div class="empty-state">No cats yet. Click "Add Cat" to add your first cat!</div>';
    return;
  }

  catsContainer.innerHTML = cats
    .map((cat) => {
      const pfpDisplay = cat.pfp
        ? cat.pfp.substring(0, 40) + (cat.pfp.length > 40 ? "..." : "")
        : "";

      return `
        <div class="cat-card" data-id="${cat.id}">
            ${
              cat.pfp
                ? `<img src="${cat.pfp}" alt="${escapeHtml(
                    cat.name
                  )}" class="cat-image" onerror="this.outerHTML='<div class=\\'cat-image placeholder\\'>🐱</div>'">`
                : '<div class="cat-image placeholder">🐱</div>'
            }
            <div class="cat-info">
                <h3 class="cat-name">${escapeHtml(cat.name)}</h3>
                ${
                  cat.pfp
                    ? `<a href="${
                        cat.pfp
                      }" target="_blank" class="cat-link">${escapeHtml(
                        cat.name
                      )}</a>`
                    : ""
                }
                <div class="cat-actions">
                    <button class="btn" onclick="editCat(${
                      cat.id
                    })">Edit</button>
                    <button class="btn" onclick="deleteCat(${
                      cat.id
                    })">Delete</button>
                </div>
            </div>
        </div>
    `;
    })
    .join("");
}

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();

  const name = catNameInput.value.trim();
  const pfp = catPfpInput.value.trim();

  if (!name) {
    showToast("Please enter a cat name", "error");
    return;
  }

  try {
    if (isEditing) {
      const catId = catIdInput.value;
      const updateData = { name };
      if (pfp) updateData.pfp = pfp;

      const response = await fetch(`${API_URL}/${catId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) throw new Error("Failed to update cat");
      showToast("Cat updated successfully!", "success");
    } else {
      const postData = { name };
      if (pfp) postData.pfp = pfp;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      if (!response.ok) throw new Error("Failed to add cat");
      showToast("Cat added successfully!", "success");
    }

    closeModal();
    loadCats();
  } catch (error) {
    console.error("Error:", error);
    showToast(
      isEditing ? "Failed to update cat" : "Failed to add cat",
      "error"
    );
  }
}

// Edit cat
async function editCat(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    if (!response.ok) throw new Error("Failed to fetch cat");

    const cat = await response.json();
    openEditModal(cat);
  } catch (error) {
    console.error("Error:", error);
    showToast("Failed to load cat details", "error");
  }
}

// Delete cat
async function deleteCat(id) {
  if (!confirm("Are you sure you want to delete this cat?")) return;

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error("Failed to delete cat");

    showToast("Cat deleted successfully", "success");
    loadCats();
  } catch (error) {
    console.error("Error:", error);
    showToast("Failed to delete cat", "error");
  }
}

// Show toast notification
function showToast(message, type = "success") {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
