// reviews.js - Review System
let currentRating = 0;
let reviews = [];
let displayedReviews = 3;
const REVIEWS_PER_PAGE = 3;

// Initialize reviews from localStorage
function initReviews() {
    const savedReviews = localStorage.getItem('goldensky_reviews');
    if (savedReviews) {
        reviews = JSON.parse(savedReviews);
    } else {
        // Add some sample reviews
        reviews = [
            {
                id: 1,
                name: 'Sarah M.',
                email: 'sarah@example.com',
                rating: 5,
                content: 'Amazing experience! The sunset desert safari was breathtaking. Our guide Ahmed was very knowledgeable and made us feel safe throughout the dune bashing. The Inland Sea visit was magical and the photos turned out incredible. Will definitely recommend to friends visiting Qatar!',
                tour: 'Half Day Desert Safari',
                date: '2024-02-15',
                verified: true
            },
            {
                id: 2,
                name: 'James R.',
                email: 'james@example.com',
                rating: 5,
                content: 'Perfect family adventure! The kids loved the camel ride and sand boarding. Professional service from pickup to dropoff. The driver was punctual and the vehicle was very comfortable. Highly recommended for families!',
                tour: 'Half Day Desert Safari',
                date: '2024-01-20',
                verified: true
            },
            {
                id: 3,
                name: 'Fatima A.',
                email: 'fatima@example.com',
                rating: 4,
                content: 'Great value for money! The Inland Sea visit was magical. Very organized tour with excellent photo opportunities. The only minor issue was that we waited 10 minutes for pickup, but everything else was perfect.',
                tour: 'Half Day Desert Safari',
                date: '2023-12-10',
                verified: true
            }
        ];
        saveReviews();
    }
    
    updateReviewStats();
    renderReviews();
}

// Save reviews to localStorage
function saveReviews() {
    localStorage.setItem('goldensky_reviews', JSON.stringify(reviews));
}

// Update review statistics
function updateReviewStats() {
    if (reviews.length === 0) {
        document.getElementById('averageRating').textContent = '0.0';
        document.getElementById('totalReviews').textContent = '0';
        return;
    }
    
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    
    document.getElementById('averageRating').textContent = averageRating.toFixed(1);
    document.getElementById('totalReviews').textContent = reviews.length;
}

// Render reviews to the page
function renderReviews() {
    const reviewsContainer = document.getElementById('reviewsContainer');
    const noReviewsMessage = document.getElementById('noReviewsMessage');
    const showMoreContainer = document.getElementById('showMoreContainer');
    const showMoreBtn = document.getElementById('showMoreBtn');
    
    if (reviews.length === 0) {
        reviewsContainer.innerHTML = '';
        noReviewsMessage.classList.remove('d-none');
        showMoreContainer.classList.add('d-none');
        return;
    }
    
    noReviewsMessage.classList.add('d-none');
    
    // Sort reviews by date (newest first)
    const sortedReviews = [...reviews].sort((a, b) => new Date(b.date) - new Date(a.date));
    
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
                                        ${review.verified ? '<span class="verified-badge"><i class="fas fa-check-circle"></i> Verified</span>' : ''}
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

// Show more reviews
function showMoreReviews() {
    displayedReviews += REVIEWS_PER_PAGE;
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

// Submit review
function submitReview() {
    const name = document.getElementById('reviewName').value.trim();
    const email = document.getElementById('reviewEmail').value.trim();
    const rating = parseInt(document.getElementById('ratingValue').value);
    const reviewText = document.getElementById('reviewText').value.trim();
    const tour = document.getElementById('reviewTour').value;
    const allowPublishing = document.getElementById('allowPublishing').checked;
    
    // Validation
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
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert('Please enter a valid email address', 'danger');
        return;
    }
    
    // Create new review
    const newReview = {
        id: Date.now(),
        name: name,
        email: email,
        rating: rating,
        content: reviewText,
        tour: tour || 'Not specified',
        date: new Date().toISOString().split('T')[0],
        verified: false,
        published: allowPublishing
    };
    
    // Add to reviews array
    reviews.unshift(newReview);
    saveReviews();
    
    // Update stats and render
    updateReviewStats();
    displayedReviews = REVIEWS_PER_PAGE;
    renderReviews();
    
    // Show success message
    const successMessage = document.getElementById('reviewSuccessMessage');
    successMessage.classList.remove('d-none');
    
    // Send to WhatsApp for moderation (optional)
    if (allowPublishing) {
        const reviewMessage = `🌟 *New Customer Review Submission* 🌟

👤 *Reviewer Information:*
• Name: ${name}
• Email: ${email}

⭐ *Rating:* ${rating}/5 stars
${'★'.repeat(rating)}${'☆'.repeat(5-rating)}

🗺️ *Tour:* ${tour || 'Not specified'}

📝 *Review:*
${reviewText}

⏰ *Submitted:* ${new Date().toLocaleString()}

This review needs to be moderated before publishing on the website.`;
        
        const encodedReview = encodeURIComponent(reviewMessage);
        const whatsappURL = `https://wa.me/97466955259?text=${encodedReview}`;
        window.open(whatsappURL, '_blank');
    }
    
    // Clear form
    resetReviewForm();
    
    // Hide form
    document.getElementById('reviewFormContainer').classList.add('d-none');
    
    // Auto-hide success message after 5 seconds
    setTimeout(() => {
        successMessage.classList.add('d-none');
    }, 5000);
}

// Reset review form
function resetReviewForm() {
    document.getElementById('reviewForm').reset();
    currentRating = 0;
    document.getElementById('ratingValue').value = '0';
    document.getElementById('ratingText').textContent = '0 out of 5 stars';
    highlightStars(0);
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

// Initialize review system
document.addEventListener('DOMContentLoaded', function() {
    // Initialize reviews
    initReviews();
    
    // Initialize star rating
    initStarRating();
    
    // Setup event listeners
    document.getElementById('openReviewFormBtn').addEventListener('click', function() {
        document.getElementById('reviewFormContainer').classList.remove('d-none');
        this.scrollIntoView({ behavior: 'smooth' });
    });
    
    document.getElementById('closeReviewFormBtn').addEventListener('click', function() {
        document.getElementById('reviewFormContainer').classList.add('d-none');
        resetReviewForm();
    });
    
    document.getElementById('showMoreBtn').addEventListener('click', showMoreReviews);
    
    document.getElementById('submitReviewBtn').addEventListener('click', submitReview);
    
    // Close review form when clicking outside
    document.addEventListener('click', function(event) {
        const reviewForm = document.getElementById('reviewFormContainer');
        const openBtn = document.getElementById('openReviewFormBtn');
        
        if (!reviewForm.contains(event.target) && 
            !openBtn.contains(event.target) && 
            !reviewForm.classList.contains('d-none')) {
            reviewForm.classList.add('d-none');
            resetReviewForm();
        }
    });
});
