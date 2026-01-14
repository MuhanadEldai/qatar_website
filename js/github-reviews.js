// github-reviews.js - GitHub API Review System
const GITHUB_USERNAME = 'muhanadeldai'; // Replace with your GitHub username
const REPO_NAME = 'qatar_website'; // Replace with your repository name
const GITHUB_TOKEN = ''; // Keep empty for public repos or add token for private

// Review stats container IDs
let reviews = [];
let displayedReviews = 3;
const REVIEWS_PER_PAGE = 3;

// Initialize reviews from GitHub
async function initGitHubReviews() {
    try {
        // Try to load from localStorage first (for offline/first load)
        const cachedReviews = localStorage.getItem('goldensky_github_reviews');
        const cacheTime = localStorage.getItem('goldensky_reviews_cache_time');
        const now = Date.now();
        
        // Use cache if less than 1 hour old
        if (cachedReviews && cacheTime && (now - parseInt(cacheTime)) < 3600000) {
            reviews = JSON.parse(cachedReviews);
            console.log('Loaded reviews from cache');
        } else {
            // Fetch from GitHub
            console.log('Fetching reviews from GitHub...');
            await fetchReviewsFromGitHub();
        }
        
        updateReviewStats();
        renderReviews();
        
    } catch (error) {
        console.error('Error loading reviews:', error);
        // Fallback to localStorage if available
        const savedReviews = localStorage.getItem('goldensky_reviews');
        if (savedReviews) {
            reviews = JSON.parse(savedReviews);
            updateReviewStats();
            renderReviews();
        }
    }
}

// Fetch reviews from GitHub Issues
async function fetchReviewsFromGitHub() {
    try {
        const response = await fetch(
            `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/issues?labels=review&state=all`,
            {
                headers: GITHUB_TOKEN ? {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                } : {}
            }
        );
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }
        
        const issues = await response.json();
        
        // Convert GitHub issues to review format
        reviews = issues.map(issue => ({
            id: issue.id,
            name: extractNameFromIssue(issue.title),
            email: extractEmailFromIssue(issue.body),
            rating: extractRatingFromIssue(issue.body),
            content: extractReviewContent(issue.body),
            tour: extractTourFromIssue(issue.body),
            date: new Date(issue.created_at).toISOString().split('T')[0],
            verified: issue.state === 'closed', // Closed issues are verified/moderated
            githubUrl: issue.html_url,
            issueNumber: issue.number
        }));
        
        // Save to localStorage with timestamp
        localStorage.setItem('goldensky_github_reviews', JSON.stringify(reviews));
        localStorage.setItem('goldensky_reviews_cache_time', Date.now().toString());
        
    } catch (error) {
        console.error('Error fetching from GitHub:', error);
        throw error;
    }
}

// Helper functions to extract data from GitHub issues
function extractNameFromIssue(title) {
    // Title format: "Review from [Name] - [Tour]"
    const match = title.match(/Review from (.+?) -/);
    return match ? match[1].trim() : 'Anonymous';
}

function extractEmailFromIssue(body) {
    const match = body.match(/Email: (.+?)(\n|$)/);
    return match ? match[1].trim() : '';
}

function extractRatingFromIssue(body) {
    const match = body.match(/Rating: (\d+)/);
    return match ? parseInt(match[1]) : 5;
}

function extractReviewContent(body) {
    // Get content between "Review:" and "Tour:"
    const match = body.match(/Review:\s*\n([\s\S]+?)\n\nTour:/);
    return match ? match[1].trim() : 'No review content';
}

function extractTourFromIssue(body) {
    const match = body.match(/Tour: (.+?)(\n|$)/);
    return match ? match[1].trim() : 'Not specified';
}

// Submit review via GitHub Issues API
async function submitReviewToGitHub() {
    const name = document.getElementById('reviewName').value.trim();
    const email = document.getElementById('reviewEmail').value.trim();
    const rating = parseInt(document.getElementById('ratingValue').value);
    const reviewText = document.getElementById('reviewText').value.trim();
    const tour = document.getElementById('reviewTour').value;
    const allowPublishing = document.getElementById('allowPublishing').checked;
    
    // Validation (same as before)
    if (!name || !email || !rating || !reviewText) {
        showAlert('Please fill in all required fields (*)', 'danger');
        return;
    }
    
    if (rating === 0) {
        showAlert('Please select a rating', 'danger');
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
    
    // Create issue body
    const issueBody = `
Reviewer Information:
• Name: ${name}
• Email: ${email}
• Rating: ${rating}/5 stars

Review:
${reviewText}

Tour: ${tour || 'Not specified'}

Submitted: ${new Date().toLocaleString()}

This review needs to be moderated before publishing.
`;
    
    const issueTitle = `Review from ${name} - ${tour || 'General Review'}`;
    
    try {
        // For public repos without token, redirect to create issue page
        if (!GITHUB_TOKEN) {
            // Create issue via GitHub web interface
            const issueUrl = `https://github.com/${GITHUB_USERNAME}/${REPO_NAME}/issues/new?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}&labels=review`;
            window.open(issueUrl, '_blank');
            
            // Also save locally temporarily
            saveReviewLocally(name, email, rating, reviewText, tour);
        } else {
            // Create issue via GitHub API (requires personal access token)
            const response = await fetch(
                `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/issues`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: issueTitle,
                        body: issueBody,
                        labels: ['review', 'pending']
                    })
                }
            );
            
            if (!response.ok) {
                throw new Error(`Failed to create issue: ${response.status}`);
            }
            
            const issue = await response.json();
            console.log('Review submitted as issue:', issue.html_url);
            
            // Save locally
            saveReviewLocally(name, email, rating, reviewText, tour, issue.html_url);
        }
        
        // Show success message
        showSuccessMessage();
        
        // Clear form
        resetReviewForm();
        
        // Hide form
        document.getElementById('reviewFormContainer').classList.add('d-none');
        
        // Refresh reviews after 5 seconds
        setTimeout(() => {
            initGitHubReviews();
        }, 5000);
        
    } catch (error) {
        console.error('Error submitting review:', error);
        showAlert('Error submitting review. Please try again.', 'danger');
        
        // Fallback: save locally
        saveReviewLocally(name, email, rating, reviewText, tour);
        showSuccessMessage();
        resetReviewForm();
    }
}

// Save review locally
function saveReviewLocally(name, email, rating, reviewText, tour, githubUrl = null) {
    const newReview = {
        id: Date.now(),
        name: name,
        email: email,
        rating: rating,
        content: reviewText,
        tour: tour || 'Not specified',
        date: new Date().toISOString().split('T')[0],
        verified: false,
        githubUrl: githubUrl,
        pending: true
    };
    
    reviews.unshift(newReview);
    
    // Save to localStorage
    const localReviews = JSON.parse(localStorage.getItem('goldensky_reviews') || '[]');
    localReviews.unshift(newReview);
    localStorage.setItem('goldensky_reviews', JSON.stringify(localReviews));
    
    updateReviewStats();
    renderReviews();
}

// Update review statistics
function updateReviewStats() {
    if (reviews.length === 0) {
        document.getElementById('averageRating').textContent = '0.0';
        document.getElementById('totalReviews').textContent = '0';
        return;
    }
    
    const verifiedReviews = reviews.filter(r => r.verified);
    const totalRating = verifiedReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = verifiedReviews.length > 0 ? totalRating / verifiedReviews.length : 0;
    
    document.getElementById('averageRating').textContent = averageRating.toFixed(1);
    document.getElementById('totalReviews').textContent = verifiedReviews.length;
}

// Render reviews to the page
function renderReviews() {
    const reviewsContainer = document.getElementById('reviewsContainer');
    const noReviewsMessage = document.getElementById('noReviewsMessage');
    const showMoreContainer = document.getElementById('showMoreContainer');
    const showMoreBtn = document.getElementById('showMoreBtn');
    
    // Show only verified reviews to everyone
    const verifiedReviews = reviews.filter(r => r.verified);
    const pendingReviews = reviews.filter(r => !r.verified && r.pending);
    
    // Combine verified + pending (pending shown as "Pending moderation")
    const allReviews = [...verifiedReviews, ...pendingReviews];
    
    if (allReviews.length === 0) {
        reviewsContainer.innerHTML = '';
        noReviewsMessage.classList.remove('d-none');
        showMoreContainer.classList.add('d-none');
        return;
    }
    
    noReviewsMessage.classList.add('d-none');
    
    // Sort by date (newest first)
    const sortedReviews = [...allReviews].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Get reviews to display
    const reviewsToShow = sortedReviews.slice(0, displayedReviews);
    
    let reviewsHTML = '';
    
    reviewsToShow.forEach((review, index) => {
        const reviewDate = new Date(review.date);
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
            <div class="review-card ${review.pending ? 'review-pending' : ''}" data-review-id="${review.id}">
                <div class="review-header">
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <div class="review-avatar ${review.pending ? 'pending' : ''}">
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
                                        ${review.verified ? 
                                            '<span class="verified-badge"><i class="fas fa-check-circle"></i> Verified</span>' : 
                                            '<span class="pending-badge"><i class="fas fa-clock"></i> Pending Moderation</span>'
                                        }
                                        ${review.githubUrl ? 
                                            `<a href="${review.githubUrl}" target="_blank" class="github-badge">
                                                <i class="fab fa-github"></i> View on GitHub
                                            </a>` : ''
                                        }
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
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    reviewsContainer.innerHTML = reviewsHTML;
    
    // Show/hide "Show More" button
    if (sortedReviews.length > displayedReviews) {
        showMoreContainer.classList.remove('d-none');
        showMoreBtn.innerHTML = `<i class="fas fa-chevron-down me-2"></i>Show More Reviews (${sortedReviews.length - displayedReviews} more)`;
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
    const reviewContent = reviewCard.querySelector('.review-content');
    const readMoreBtn = reviewCard.querySelector('.read-more-btn');
    
    const fullReview = reviews.find(r => r.id === reviewId);
    
    if (reviewContent.classList.contains('collapsed')) {
        reviewContent.classList.remove('collapsed');
        reviewContent.textContent = fullReview.content;
        readMoreBtn.innerHTML = '<i class="fas fa-chevron-up me-1"></i>Show Less';
    } else {
        reviewContent.classList.add('collapsed');
        reviewContent.textContent = fullReview.content.substring(0, 200) + '...';
        readMoreBtn.innerHTML = '<i class="fas fa-chevron-down me-1"></i>Read More';
    }
}

// Show more reviews
function showMoreReviews() {
    displayedReviews += REVIEWS_PER_PAGE;
    renderReviews();
    
    const newReviews = document.querySelectorAll('.review-card');
    if (newReviews.length > 0) {
        newReviews[newReviews.length - 1].scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Initialize GitHub reviews
    initGitHubReviews();
    
    // Update the submit button to use GitHub
    const submitBtn = document.getElementById('submitReviewBtn');
    if (submitBtn) {
        submitBtn.onclick = submitReviewToGitHub;
    }
    
    // Update show more button
    const showMoreBtn = document.getElementById('showMoreBtn');
    if (showMoreBtn) {
        showMoreBtn.onclick = showMoreReviews;
    }
});
