// github-issues.js - GitHub Issues Review System
// Configuration - REPLACE THESE WITH YOUR VALUES
const GITHUB_CONFIG = {
    username: 'MuhanadEldai',      // Replace with your GitHub username
    repo: 'qatar_website',                // Replace with your repository name
    issueLabel: 'review',                  // Label to use for reviews
    moderatorLabel: 'approved',            // Label for approved reviews
    cacheDuration: 300000,                 // 5 minutes cache (in milliseconds)
    reviewsPerPage: 6                      // Reviews to show per page
};

// Global variables
let allReviews = [];
let displayedReviews = GITHUB_CONFIG.reviewsPerPage;
let currentRating = 0;

// Initialize the review system
document.addEventListener('DOMContentLoaded', function() {
    // Load reviews from GitHub
    loadReviews();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize star rating
    initStarRating();
});

// Setup event listeners
function setupEventListeners() {
    // Open review form
    document.getElementById('openReviewFormBtn').addEventListener('click', function() {
        document.getElementById('reviewFormContainer').classList.remove('d-none');
        this.scrollIntoView({ behavior: 'smooth' });
    });
    
    // Close review form
    document.getElementById('closeReviewFormBtn').addEventListener('click', closeReviewForm);
    document.getElementById('cancelReviewBtn').addEventListener('click', closeReviewForm);
    
    // Submit review
    document.getElementById('submitReviewBtn').addEventListener('click', submitReview);
    
    // Show more reviews
    document.getElementById('showMoreBtn').addEventListener('click', showMoreReviews);
    
    // Close review form when clicking outside
    document.addEventListener('click', function(event) {
        const reviewForm = document.getElementById('reviewFormContainer');
        const openBtn = document.getElementById('openReviewFormBtn');
        
        if (!reviewForm.contains(event.target) && 
            !openBtn.contains(event.target) && 
            !reviewForm.classList.contains('d-none')) {
            closeReviewForm();
        }
    });
}

// Load reviews from GitHub
async function loadReviews() {
    showLoading();
    
    try {
        // Check cache first
        const cachedData = getCachedReviews();
        if (cachedData) {
            console.log('Using cached reviews');
            allReviews = cachedData.reviews;
            updateReviewStats();
            renderReviews();
        }
        
        // Always try to fetch fresh data
        await fetchReviewsFromGitHub();
        
    } catch (error) {
        console.error('Error loading reviews:', error);
        showError('Unable to load reviews. Showing cached data if available.');
        
        // If no cached data and fetch failed, show error
        if (allReviews.length === 0) {
            document.getElementById('errorMessage').classList.remove('d-none');
            document.getElementById('errorText').textContent = 'Unable to load reviews. Please check your internet connection and try again.';
        }
    }
}

// Fetch reviews from GitHub API
async function fetchReviewsFromGitHub() {
    try {
        // Fetch issues with the review label
        const response = await fetch(
            `https://api.github.com/repos/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/issues?labels=${GITHUB_CONFIG.issueLabel}&state=all&per_page=100`,
            {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    // Add your GitHub token here if you want to access private repo or avoid rate limits
                    // 'Authorization': 'token YOUR_GITHUB_TOKEN'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }
        
        const issues = await response.json();
        
        // Process issues into reviews
        allReviews = issues.map(issue => ({
            id: issue.id,
            issueNumber: issue.number,
            title: issue.title,
            body: issue.body,
            rating: extractRatingFromIssue(issue),
            name: extractNameFromIssue(issue),
            email: extractEmailFromIssue(issue),
            content: extractReviewContent(issue),
            tour: extractTourFromIssue(issue),
            date: new Date(issue.created_at).toISOString().split('T')[0],
            createdAt: issue.created_at,
            updatedAt: issue.updated_at,
            state: issue.state,
            isApproved: hasLabel(issue, GITHUB_CONFIG.moderatorLabel),
            labels: issue.labels.map(label => label.name),
            url: issue.html_url,
            comments: issue.comments
        }));
        
        // Sort by date (newest first)
        allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Cache the results
        cacheReviews(allReviews);
        
        // Update UI
        updateReviewStats();
        renderReviews();
        
    } catch (error) {
        console.error('Error fetching from GitHub:', error);
        throw error;
    }
}

// Helper functions to extract data from GitHub issues
function extractRatingFromIssue(issue) {
    // Look for rating in body or labels
    const body = issue.body || '';
    const ratingMatch = body.match(/Rating:?\s*(\d+)/i) || body.match(/(\d)\s*stars?/i);
    
    if (ratingMatch) {
        return parseInt(ratingMatch[1]);
    }
    
    // Check labels for rating
    const ratingLabel = issue.labels.find(label => label.name.match(/^\d-star$/));
    if (ratingLabel) {
        return parseInt(ratingLabel.name[0]);
    }
    
    return 5; // Default rating
}

function extractNameFromIssue(issue) {
    // Try to extract from title
    const titleMatch = issue.title.match(/Review from (.+?)(?: -|$)/i);
    if (titleMatch) {
        return titleMatch[1].trim();
    }
    
    // Try to extract from body
    const body = issue.body || '';
    const nameMatch = body.match(/Name:?\s*(.+?)(?:\n|$)/i);
    if (nameMatch) {
        return nameMatch[1].trim();
    }
    
    return 'Anonymous';
}

function extractEmailFromIssue(issue) {
    const body = issue.body || '';
    const emailMatch = body.match(/Email:?\s*(.+?)(?:\n|$)/i);
    return emailMatch ? emailMatch[1].trim() : '';
}

function extractReviewContent(issue) {
    const body = issue.body || '';
    
    // Try to find review content section
    const reviewMatch = body.match(/Review:?\s*\n([\s\S]+?)(?:\n\n\w+:|$)/i) || 
                       body.match(/(?:Review|Feedback):?\s*\n([\s\S]+)/i);
    
    if (reviewMatch) {
        return reviewMatch[1].trim();
    }
    
    // If no specific section, use the body (excluding metadata lines)
    const lines = body.split('\n');
    const contentLines = lines.filter(line => {
        const lowerLine = line.toLowerCase();
        return !lowerLine.includes('name:') && 
               !lowerLine.includes('email:') && 
               !lowerLine.includes('rating:') && 
               !lowerLine.includes('tour:');
    });
    
    return contentLines.join('\n').trim() || 'No review content available';
}

function extractTourFromIssue(issue) {
    const body = issue.body || '';
    const tourMatch = body.match(/Tour:?\s*(.+?)(?:\n|$)/i);
    return tourMatch ? tourMatch[1].trim() : 'Not specified';
}

function hasLabel(issue, labelName) {
    return issue.labels.some(label => label.name === labelName);
}

// Cache management
function cacheReviews(reviews) {
    const cacheData = {
        reviews: reviews,
        timestamp: Date.now()
    };
    localStorage.setItem('github_reviews_cache', JSON.stringify(cacheData));
}

function getCachedReviews() {
    const cached = localStorage.getItem('github_reviews_cache');
    if (!cached) return null;
    
    const cacheData = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - cacheData.timestamp < GITHUB_CONFIG.cacheDuration) {
        return cacheData;
    }
    
    return null;
}

// Update review statistics
function updateReviewStats() {
    const approvedReviews = allReviews.filter(review => review.isApproved);
    
    if (approvedReviews.length === 0) {
        document.getElementById('averageRating').textContent = '0.0';
        document.getElementById('totalReviews').textContent = '0';
        document.getElementById('responseRate').textContent = '0%';
        document.getElementById('recentReviews').textContent = '0';
        return;
    }
    
    // Calculate average rating
    const totalRating = approvedReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / approvedReviews.length;
    
    // Calculate recent reviews (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentReviews = approvedReviews.filter(review => 
        new Date(review.createdAt) > thirtyDaysAgo
    ).length;
    
    // Update stats
    document.getElementById('averageRating').textContent = averageRating.toFixed(1);
    document.getElementById('totalReviews').textContent = approvedReviews.length;
    document.getElementById('responseRate').textContent = '98%'; // Static for now
    document.getElementById('recentReviews').textContent = recentReviews;
}

// Render reviews to the page
function renderReviews() {
    const reviewsContainer = document.getElementById('reviewsContainer');
    const noReviewsMessage = document.getElementById('noReviewsMessage');
    const showMoreContainer = document.getElementById('showMoreContainer');
    const errorMessage = document.getElementById('errorMessage');
    
    // Hide error message
    errorMessage.classList.add('d-none');
    
    // Filter only approved reviews for public display
    const approvedReviews = allReviews.filter(review => review.isApproved);
    const pendingReviews = allReviews.filter(review => !review.isApproved);
    
    if (approvedReviews.length === 0 && pendingReviews.length === 0) {
        reviewsContainer.innerHTML = '';
        noReviewsMessage.classList.remove('d-none');
        showMoreContainer.classList.add('d-none');
        return;
    }
    
    noReviewsMessage.classList.add('d-none');
    
    // Get reviews to display (only approved ones)
    const reviewsToShow = approvedReviews.slice(0, displayedReviews);
    
    let reviewsHTML = '';
    
    if (approvedReviews.length === 0 && pendingReviews.length > 0) {
        // Show message about pending reviews
        reviewsHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-clock me-2"></i>
                <strong>Reviews pending moderation:</strong> ${pendingReviews.length} review(s) are waiting for approval.
                <a href="https://github.com/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/issues?q=label%3A${GITHUB_CONFIG.issueLabel}" 
                   target="_blank" class="alert-link">
                    View on GitHub
                </a>
            </div>
        `;
    } else {
        // Render approved reviews
        reviewsToShow.forEach((review, index) => {
            const reviewDate = new Date(review.createdAt);
            const formattedDate = reviewDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const shouldCollapse = review.content.length > 200;
            const isCollapsed = shouldCollapse && index >= 3;
            const displayContent = isCollapsed ? 
                review.content.substring(0, 200) + '...' : 
                review.content;
            
            const starsHTML = getStarsHTML(review.rating);
            const avatarInitial = review.name.charAt(0).toUpperCase();
            
            reviewsHTML += `
                <div class="review-card" data-review-id="${review.id}">
                    <div class="review-header">
                        <div class="row align-items-center">
                            <div class="col-auto">
                                <div class="review-avatar">
                                    ${avatarInitial}
                                </div>
                            </div>
                            <div class="col">
                                <div class="d-flex justify-content-between align-items-center flex-wrap">
                                    <div>
                                        <h5 class="mb-1">${review.name}</h5>
                                        <div class="d-flex align-items-center gap-2 mb-1">
                                            <div class="rating-stars">
                                                ${starsHTML}
                                            </div>
                                            <span class="text-muted">${review.rating}.0</span>
                                            <span class="verified-badge">
                                                <i class="fas fa-check-circle me-1"></i>Verified
                                            </span>
                                            <a href="${review.url}" target="_blank" class="github-link" title="View on GitHub">
                                                <i class="fab fa-github"></i>
                                            </a>
                                        </div>
                                    </div>
                                    <div class="text-muted">
                                        <i class="far fa-calendar me-1"></i> ${formattedDate}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="review-body">
                        <div class="review-content ${isCollapsed ? 'collapsed' : ''}">
                            ${displayContent}
                        </div>
                        ${shouldCollapse ? `
                            <button class="read-more-btn" onclick="toggleReview(${review.id})">
                                <i class="fas fa-chevron-${isCollapsed ? 'down' : 'up'} me-1"></i>
                                ${isCollapsed ? 'Read More' : 'Show Less'}
                            </button>
                        ` : ''}
                        <div class="review-meta mt-3">
                            <div>
                                <i class="fas fa-map-marked-alt me-1 text-gold"></i>
                                <span class="text-muted">${review.tour || 'Not specified'}</span>
                            </div>
                            <div class="text-muted">
                                ${reviewDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                ${review.comments > 0 ? ` · ${review.comments} comment${review.comments === 1 ? '' : 's'}` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    reviewsContainer.innerHTML = reviewsHTML;
    
    // Show/hide "Show More" button
    if (approvedReviews.length > displayedReviews) {
        showMoreContainer.classList.remove('d-none');
        const remaining = approvedReviews.length - displayedReviews;
        document.getElementById('showMoreBtn').innerHTML = `
            <i class="fas fa-chevron-down me-2"></i>
            Load More Reviews (${remaining} more)
        `;
    } else {
        showMoreContainer.classList.add('d-none');
    }
}

// Get stars HTML for rating
function getStarsHTML(rating) {
    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            starsHTML += '<i class="fas fa-star"></i>';
        } else if (i === Math.ceil(rating) && !Number.isInteger(rating)) {
            starsHTML += '<i class="fas fa-star-half-alt"></i>';
        } else {
            starsHTML += '<i class="far fa-star"></i>';
        }
    }
    return starsHTML;
}

// Toggle review content
function toggleReview(reviewId) {
    const reviewCard = document.querySelector(`[data-review-id="${reviewId}"]`);
    if (!reviewCard) return;
    
    const reviewContent = reviewCard.querySelector('.review-content');
    const readMoreBtn = reviewCard.querySelector('.read-more-btn');
    
    const review = allReviews.find(r => r.id === reviewId);
    if (!review) return;
    
    if (reviewContent.classList.contains('collapsed')) {
        reviewContent.classList.remove('collapsed');
        reviewContent.textContent = review.content;
        readMoreBtn.innerHTML = '<i class="fas fa-chevron-up me-1"></i>Show Less';
    } else {
        reviewContent.classList.add('collapsed');
        reviewContent.textContent = review.content.substring(0, 200) + '...';
        readMoreBtn.innerHTML = '<i class="fas fa-chevron-down me-1"></i>Read More';
    }
}

// Show more reviews
function showMoreReviews() {
    displayedReviews += GITHUB_CONFIG.reviewsPerPage;
    renderReviews();
    
    // Scroll to the newly loaded reviews
    const newReviews = document.querySelectorAll('.review-card');
    if (newReviews.length > 0) {
        newReviews[newReviews.length - 1].scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }
}

// Initialize star rating
function initStarRating() {
    document.querySelectorAll('#starRating i').forEach(star => {
        star.addEventListener('mouseover', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            highlightStars(rating);
        });
        
        star.addEventListener('click', function() {
            currentRating = parseInt(this.getAttribute('data-rating'));
            highlightStars(currentRating);
            document.getElementById('ratingValue').value = currentRating;
            document.getElementById('ratingText').textContent = `${currentRating} out of 5 stars`;
        });
    });
    
    document.getElementById('starRating').addEventListener('mouseleave', function() {
        highlightStars(currentRating);
    });
}

function highlightStars(rating) {
    document.querySelectorAll('#starRating i').forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('far');
            star.classList.add('fas');
        } else {
            star.classList.remove('fas');
            star.classList.add('far');
        }
    });
}

// Submit review via GitHub
function submitReview() {
    const name = document.getElementById('reviewName').value.trim();
    const email = document.getElementById('reviewEmail').value.trim();
    const rating = parseInt(document.getElementById('ratingValue').value);
    const reviewText = document.getElementById('reviewText').value.trim();
    const tour = document.getElementById('reviewTour').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    
    // Validation
    if (!name || !email || !rating || !reviewText) {
        showAlert('Please fill in all required fields (*)', 'danger');
        return;
    }
    
    if (rating === 0) {
        showAlert('Please select a rating', 'danger');
        return;
    }
    
    if (!agreeTerms) {
        showAlert('Please agree to the terms to submit your review', 'danger');
        return;
    }
    
    if (reviewText.length < 50) {
        showAlert('Please write a review with at least 50 characters', 'danger');
        return;
    }
    
    if (reviewText.length > 1000) {
        showAlert('Review must be less than 1000 characters', 'danger');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert('Please enter a valid email address', 'danger');
        return;
    }
    
    // Create GitHub issue URL
    const issueTitle = `Review from ${name} - ${tour || 'General Review'}`;
    const issueBody = `
**Reviewer Information**
- Name: ${name}
- Email: ${email}
- Rating: ${rating}/5 stars

**Tour Taken:** ${tour || 'Not specified'}

**Review:**
${reviewText}

---

*Submitted: ${new Date().toLocaleString()}*
*This review needs moderation before publishing.*
    `.trim();
    
    // Encode for URL
    const encodedTitle = encodeURIComponent(issueTitle);
    const encodedBody = encodeURIComponent(issueBody);
    
    // Create GitHub issue URL
    const githubUrl = `https://github.com/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/issues/new?title=${encodedTitle}&body=${encodedBody}&labels=${GITHUB_CONFIG.issueLabel}`;
    
    // Open in new tab
    window.open(githubUrl, '_blank');
    
    // Show success message
    showSuccessMessage(name);
    
    // Clear form
    resetReviewForm();
    
    // Close form
    closeReviewForm();
    
    // Store locally for immediate display (pending)
    const pendingReview = {
        id: Date.now(),
        name: name,
        email: email,
        rating: rating,
        content: reviewText,
        tour: tour || 'Not specified',
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        isApproved: false,
        pending: true
    };
    
    allReviews.unshift(pendingReview);
    renderReviews();
}

// Show success message
function showSuccessMessage(name = '') {
    const successMessage = document.getElementById('reviewSuccessMessage');
    const successText = document.getElementById('successMessageText');
    
    successText.textContent = name ? 
        `Thank you ${name}! Your review has been submitted and will appear here once approved.` :
        'Your review has been submitted and will appear here once approved.';
    
    successMessage.classList.remove('d-none');
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        successMessage.classList.add('d-none');
    }, 10000);
}

// Close review form
function closeReviewForm() {
    document.getElementById('reviewFormContainer').classList.add('d-none');
    resetReviewForm();
}

// Reset review form
function resetReviewForm() {
    document.getElementById('reviewForm').reset();
    currentRating = 0;
    document.getElementById('ratingValue').value = '0';
    document.getElementById('ratingText').textContent = '0 out of 5 stars';
    highlightStars(0);
}

// Show loading state
function showLoading() {
    const reviewsContainer = document.getElementById('reviewsContainer');
    reviewsContainer.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-gold" role="status">
                <span class="visually-hidden">Loading reviews...</span>
            </div>
            <p class="mt-3">Loading reviews from GitHub...</p>
        </div>
    `;
}

// Show error message
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    errorText.textContent = message;
    errorMessage.classList.remove('d-none');
}

// Show alert message
function showAlert(message, type) {
    // Remove any existing alerts
    const existingAlert = document.querySelector('.review-alert');
    if (existingAlert) existingAlert.remove();
    
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show review-alert" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    const reviewForm = document.getElementById('reviewForm');
    reviewForm.insertAdjacentHTML('afterbegin', alertHTML);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        const alert = document.querySelector('.review-alert');
        if (alert) alert.remove();
    }, 5000);
}

// Refresh reviews manually
function refreshReviews() {
    // Clear cache and reload
    localStorage.removeItem('github_reviews_cache');
    displayedReviews = GITHUB_CONFIG.reviewsPerPage;
    loadReviews();
    
    // Show refresh notification
    const refreshBtn = document.querySelector('[onclick="refreshReviews()"]');
    const originalHtml = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<i class="fas fa-check me-1"></i> Refreshed';
    refreshBtn.disabled = true;
    
    setTimeout(() => {
        refreshBtn.innerHTML = originalHtml;
        refreshBtn.disabled = false;
    }, 2000);
}

// Make functions available globally
window.toggleReview = toggleReview;
window.showMoreReviews = showMoreReviews;
window.refreshReviews = refreshReviews;
