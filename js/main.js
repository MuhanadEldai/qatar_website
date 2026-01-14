// main.js - Main JavaScript File
// Initialize AOS
AOS.init({
    duration: 1000,
    once: true,
    offset: 100
});

// Navbar scroll effect
window.addEventListener('scroll', function() {
    const navbar = document.getElementById('mainNav');
    if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    
    // Update active nav link
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 100;
    
    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop;
        const sectionId = section.getAttribute('id');
        
        if (scrollPos > sectionTop && scrollPos <= sectionTop + sectionHeight) {
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set date restrictions
    const today = new Date();
    document.getElementById('tourDate').min = today.toISOString().split('T')[0];
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    document.getElementById('tourDate').max = maxDate.toISOString().split('T')[0];
    
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('tourDate').value = tomorrow.toISOString().split('T')[0];
});
