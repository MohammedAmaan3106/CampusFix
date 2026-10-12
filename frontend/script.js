
const API_URL = "campusfix-84qbecz5u-amaan-f3c2.vercel.app ";

const complaintList = document.getElementById("complaint-list");
const emptyMessage = document.getElementById("empty-message");
const reportDialog = document.getElementById("report-dialog");
const reportForm = document.getElementById("report-form");
const formMessage = document.getElementById("form-message");
const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");
const refreshButton = document.getElementById("refresh-button");
const toast = document.getElementById("toast");

let complaints = [];
let toastTimer;

// Show a small notification
function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}

// Communicate with the Flask backend
async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Request failed");
    }

    return data;
}

// Open and close the report popup
document.getElementById("open-report").addEventListener("click", () => {
    formMessage.textContent = "";
    reportDialog.showModal();
});

document.getElementById("close-report").addEventListener("click", () => {
    reportDialog.close();
});

// Close the dialog if the user clicks outside it
reportDialog.addEventListener("click", (event) => {
    if (event.target === reportDialog) {
        reportDialog.close();
    }
});

// Update dashboard statistics
function updateStatistics() {
    document.getElementById("total-count").textContent =
        complaints.length;

    document.getElementById("pending-count").textContent =
        complaints.filter(c => c.status === "Pending").length;

    document.getElementById("progress-count").textContent =
        complaints.filter(c => c.status === "In Progress").length;

    document.getElementById("resolved-count").textContent =
        complaints.filter(c => c.status === "Resolved").length;
}

// Create a complaint card safely
function createComplaintCard(complaint) {
    const card = document.createElement("article");
    card.className = "complaint-card";

    const info = document.createElement("div");
    info.className = "complaint-info";

    const title = document.createElement("h3");
    title.className = "complaint-title";
    title.textContent = complaint.title;

    const meta = document.createElement("div");
    meta.className = "complaint-meta";

    const category = document.createElement("span");
    category.textContent = `Category: ${complaint.category}`;

    const location = document.createElement("span");
    location.textContent = `Location: ${complaint.location}`;

    meta.append(category, location);

    const description = document.createElement("p");
    description.className = "complaint-description";
    description.textContent = complaint.description;

    info.append(title, meta, description);

    const actions = document.createElement("div");
    actions.className = "complaint-actions";

    const badge = document.createElement("span");
    badge.className = "status-badge";

    if (complaint.status === "Pending") {
        badge.classList.add("status-pending");
    } else if (complaint.status === "In Progress") {
        badge.classList.add("status-in-progress");
    } else {
        badge.classList.add("status-resolved");
    }

    badge.textContent = complaint.status;

    const deleteButton = document.createElement("button");
    deleteButton.className = "secondary-button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute(
        "aria-label",
        `Delete complaint: ${complaint.title}`
    );

    deleteButton.addEventListener("click", async () => {
        const confirmed = window.confirm(
            `Delete "${complaint.title}"?`
        );

        if (!confirmed) return;

        deleteButton.disabled = true;

        try {
            await apiRequest(`/api/complaints/${complaint.id}`, {
                method: "DELETE"
            });

            await loadComplaints();
            showToast("Complaint deleted successfully.");
        } catch (error) {
            showToast(error.message);
            deleteButton.disabled = false;
        }
    });

    actions.append(badge, deleteButton);
    card.append(info, actions);

    return card;
}

// Display complaints according to the current filters
function renderComplaints() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;

    const filtered = complaints.filter(complaint => {
        const searchableText = [
            complaint.title,
            complaint.category,
            complaint.location,
            complaint.description
        ].join(" ").toLowerCase();

        const matchesSearch = searchableText.includes(searchTerm);
        const matchesStatus =
            selectedStatus === "All" ||
            complaint.status === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    complaintList.replaceChildren();

    filtered.forEach(complaint => {
        complaintList.appendChild(createComplaintCard(complaint));
    });

    emptyMessage.style.display =
        filtered.length === 0 ? "block" : "none";
}

// Fetch complaints from the backend
async function loadComplaints() {
    refreshButton.disabled = true;
    refreshButton.textContent = "Loading...";

    try {
        const data = await apiRequest("/api/complaints");

        complaints = Array.isArray(data) ? data : [];

        updateStatistics();
        renderComplaints();
    } catch (error) {
        showToast("Could not load complaints. Check your backend.");
        console.error("Loading complaints failed:", error);
    } finally {
        refreshButton.disabled = false;
        refreshButton.textContent = "↻ Refresh";
    }
}

// Submit a new complaint
reportForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = reportForm.querySelector(
        'button[type="submit"]'
    );

    const complaint = {
        title: document.getElementById("title").value.trim(),
        category: document.getElementById("category").value,
        location: document.getElementById("location").value.trim(),
        description: document.getElementById("description").value.trim()
    };

    if (
        !complaint.title ||
        !complaint.location ||
        !complaint.description
    ) {
        formMessage.textContent = "Please complete all fields.";
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {
        await apiRequest("/api/complaints", {
            method: "POST",
            body: JSON.stringify(complaint)
        });

        reportForm.reset();
        reportDialog.close();

        await loadComplaints();
        showToast("Your complaint was submitted!");
    } catch (error) {
        formMessage.textContent = error.message;
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Submit report →";
    }
});

// Search and filtering
searchInput.addEventListener("input", renderComplaints);
statusFilter.addEventListener("change", renderComplaints);
refreshButton.addEventListener("click", loadComplaints);

// Start the application
loadComplaints();
