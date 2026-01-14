// slider.js - Slider Functionality
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');

function showSlide(n) {
    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    
    currentSlide = (n + slides.length) % slides.length;
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
}

function nextSlide() {
    showSlide(currentSlide + 1);
}

// Auto slide every 5 seconds
setInterval(nextSlide, 5000);

// Dot click events
dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        showSlide(index);
    });
});

// Initialize slider
document.addEventListener('DOMContentLoaded', function() {
    showSlide(0);
});
