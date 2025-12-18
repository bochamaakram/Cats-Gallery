// API Base URL
const API_URL = "/cats";

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
const searchInput = document.getElementById("search-input");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const pageInfo = document.getElementById("page-info");
const logoutBtn = document.getElementById("logout-btn");

// State
let isEditing = false;
let allCats = [];
let currentPage = 1;
const catsPerPage = 10;
let totalPages = 1;

// Get auth token
function getToken() {
  return localStorage.getItem("token");
}

// Auth headers
function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in
  const token = getToken();
  if (!token) {
    window.location.href = "login.html";
    return;
  }
  loadCats();
});

// Event Listeners
catForm.addEventListener("submit", handleFormSubmit);
cancelBtn.addEventListener("click", closeModal);
addCatBtn.addEventListener("click", openAddModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});
searchInput.addEventListener("input", handleSearch);
prevBtn.addEventListener("click", () => changePage(-1));
nextBtn.addEventListener("click", () => changePage(1));
logoutBtn.addEventListener("click", logout);

// Logout function
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

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

// Handle search - filter locally
function handleSearch() {
  renderCurrentView();
}

// Get filtered cats based on search
function getFilteredCats() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  if (!searchTerm) return allCats;

  return allCats.filter((cat) => cat.name.toLowerCase().includes(searchTerm));
}

// Render current view
function renderCurrentView() {
  const filteredCats = getFilteredCats();
  renderCats(filteredCats);
}

// Update pagination controls
function updatePagination() {
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
}

// Change page
function changePage(direction) {
  currentPage += direction;
  loadCats();
}

// Load all cats
async function loadCats() {
  catsContainer.innerHTML = '<div class="loading">Loading cats...</div>';

  try {
    const response = await fetch(
      `${API_URL}?page=${currentPage}&limit=${catsPerPage}`
    );
    if (!response.ok) throw new Error("Failed to fetch cats");

    const data = await response.json();
    allCats = data.cats;
    totalPages = data.pagination.totalPages;
    currentPage = data.pagination.page;

    searchInput.value = "";
    updatePagination();
    renderCurrentView();
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
        headers: authHeaders(),
        body: JSON.stringify(updateData),
      });

      if (!response.ok) throw new Error("Failed to update cat");
      showToast("Cat updated successfully!", "success");
    } else {
      const postData = { name };
      if (pfp) postData.pfp = pfp;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: authHeaders(),
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
      headers: authHeaders(),
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
