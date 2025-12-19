// API Base URL
const API_URL = "/cats";
const ADOPTIONS_URL = "/adoptions";

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
const adoptedCatsList = document.getElementById("adopted-cats-list");
const adoptionBadge = document.getElementById("adoption-badge");
const toggleSidebarBtn = document.getElementById("toggle-sidebar-btn");
const closeSidebarBtn = document.getElementById("close-sidebar-btn");
const adoptionSidebar = document.getElementById("adoption-sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");

// State
let isEditing = false;
let allCats = [];
let adoptedCats = [];
let currentPage = 1;
const catsPerPage = 10;
let totalPages = 1;

// Check if user is authenticated via session cookie
async function checkAuth() {
  try {
    const response = await fetch("/auth/me", {
      credentials: "include",
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  // Check if user is logged in via session cookie
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) {
    window.location.href = "login.html";
    return;
  }
  await loadAdoptions();
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
toggleSidebarBtn.addEventListener("click", toggleSidebar);
closeSidebarBtn.addEventListener("click", closeSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);

// Toggle sidebar visibility
function toggleSidebar() {
  adoptionSidebar.classList.toggle("visible");
  sidebarOverlay.classList.toggle("visible");
}

function closeSidebar() {
  adoptionSidebar.classList.remove("visible");
  sidebarOverlay.classList.remove("visible");
}

// Logout function
async function logout() {
  try {
    await fetch("/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error("Logout error:", error);
  }
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

  const adoptedIds = adoptedCats.map((c) => c.id);

  catsContainer.innerHTML = cats
    .map((cat) => {
      const isAdopted = adoptedIds.includes(cat.id);
      return `
        <div class="cat-card" data-id="${cat.id}">
            ${
              cat.pfp
                ? `<img src="${cat.pfp}" alt="${escapeHtml(
                    cat.name
                  )}" class="cat-image" loading="lazy" onerror="this.outerHTML='<div class=\\'cat-image placeholder\\'>🐱</div>'">`
                : '<div class="cat-image placeholder">🐱</div>'
            }
            <div class="cat-info">
                <h3 class="cat-name">${escapeHtml(cat.name)}</h3>
                <div class="cat-actions">
                    <button class="btn btn-adopt ${isAdopted ? "adopted" : ""}" 
                            onclick="${isAdopted ? "" : `adoptCat(${cat.id})`}"
                            ${isAdopted ? "disabled" : ""}>
                        ${isAdopted ? "Adopted ✓" : "Adopt 🏠"}
                    </button>
                </div>
                <div class="cat-actions" style="margin-top: 8px;">
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
        credentials: "include",
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
        credentials: "include",
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
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to delete cat");

    showToast("Cat deleted successfully", "success");
    loadCats();
  } catch (error) {
    console.error("Error:", error);
    showToast("Failed to delete cat", "error");
  }
}

// ==================== ADOPTIONS ====================

// Load user's adoptions
async function loadAdoptions() {
  try {
    const response = await fetch(ADOPTIONS_URL, {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch adoptions");

    const data = await response.json();
    adoptedCats = data.adoptions || [];
    renderSidebar();
  } catch (error) {
    console.error("Error loading adoptions:", error);
    adoptedCats = [];
    renderSidebar();
  }
}

// Adopt a cat
async function adoptCat(catId) {
  try {
    const response = await fetch(ADOPTIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ cat_id: catId }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to adopt cat");
    }

    showToast("Cat adopted successfully! 🎉", "success");
    await loadAdoptions();
    renderCurrentView();
  } catch (error) {
    console.error("Error adopting cat:", error);
    showToast(error.message || "Failed to adopt cat", "error");
  }
}

// Remove adoption
async function unadoptCat(catId) {
  try {
    const response = await fetch(`${ADOPTIONS_URL}/${catId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to remove adoption");

    showToast("Adoption removed", "success");
    await loadAdoptions();
    renderCurrentView();
  } catch (error) {
    console.error("Error removing adoption:", error);
    showToast("Failed to remove adoption", "error");
  }
}

// Render sidebar with adopted cats
function renderSidebar() {
  adoptionBadge.textContent = adoptedCats.length;

  if (adoptedCats.length === 0) {
    adoptedCatsList.innerHTML =
      '<div class="empty-sidebar">No cats adopted yet</div>';
    return;
  }

  adoptedCatsList.innerHTML = adoptedCats
    .map((cat) => {
      const adoptDate = cat.adopted_at
        ? new Date(cat.adopted_at).toLocaleDateString()
        : "";
      return `
        <div class="adopted-cat-item" data-id="${cat.id}">
          ${
            cat.pfp
              ? `<img src="${cat.pfp}" alt="${escapeHtml(
                  cat.name
                )}" class="adopted-cat-thumb" loading="lazy" onerror="this.outerHTML='<div class=\\'adopted-cat-thumb placeholder\\'>🐱</div>'">`
              : '<div class="adopted-cat-thumb placeholder">🐱</div>'
          }
          <div class="adopted-cat-info">
            <div class="adopted-cat-name">${escapeHtml(cat.name)}</div>
            <div class="adopted-cat-date">Adopted ${adoptDate}</div>
          </div>
          <button class="btn-remove-adoption" onclick="unadoptCat(${
            cat.id
          })" title="Remove adoption">
            ✕
          </button>
        </div>
      `;
    })
    .join("");
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
