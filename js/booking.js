// booking.js - Booking System
// Time Slot Selection
document.querySelectorAll('.time-slot').forEach(slot => {
    slot.addEventListener('click', function() {
        document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('active'));
        this.classList.add('active');
        document.getElementById('selectedTime').value = this.getAttribute('data-time');
        updateSummary();
    });
});

// Counter Functions
function adjustCount(type, change) {
    const input = document.getElementById(`${type}Count`);
    let value = parseInt(input.value) + change;
    
    if (type === 'adults') {
        value = Math.max(1, value);
    } else {
        value = Math.max(0, value);
    }
    
    input.value = value;
    updateSummary();
}

// Update Booking Summary
function updateSummary() {
    const tourSelect = document.getElementById('tourSelect');
    const tourDate = document.getElementById('tourDate');
    const selectedTime = document.getElementById('selectedTime');
    const adultsCount = document.getElementById('adultsCount');
    const childrenCount = document.getElementById('childrenCount');
    const pickupLocation = document.getElementById('pickupLocation');
    
    // Update tour
    document.getElementById('summaryTour').textContent = tourSelect.value || 'Not selected';
    
    // Update date
    document.getElementById('summaryDate').textContent = tourDate.value ? 
        new Date(tourDate.value).toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        }) : '--/--/----';
    
    // Update time with new schedule
    const timeText = {
        'sunrise': 'Sunrise (4:00AM-8:00AM)',
        'morning': 'Morning (8:30AM-12:30PM)',
        'sunset': 'Sunset (2:30PM-6:30PM)'
    };
    document.getElementById('summaryTime').textContent = timeText[selectedTime.value] || 'Not selected';
    
    // Update counts
    document.getElementById('summaryAdults').textContent = adultsCount.value;
    document.getElementById('summaryChildren').textContent = childrenCount.value;
    
    // Update pickup
    document.getElementById('summaryPickup').textContent = pickupLocation.value || 'Not entered';
}

// Select Tour from cards
function selectTour(tourName) {
    document.getElementById('tourSelect').value = tourName;
    document.getElementById('booking').scrollIntoView({behavior: 'smooth'});
    updateSummary();
}

// Open Photo Modal
function openPhotoModal(photoSrc, title) {
    document.getElementById('modalPhoto').src = photoSrc;
    document.getElementById('modalTitle').textContent = title;
    const photoModal = new bootstrap.Modal(document.getElementById('photoModal'));
    photoModal.show();
}

// Process Booking with Email/SMS fallback
function processBooking() {
    const fullName = document.getElementById('fullName').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const tourSelect = document.getElementById('tourSelect').value;
    const tourDate = document.getElementById('tourDate').value;
    const pickupLocation = document.getElementById('pickupLocation').value;
    const selectedTime = document.getElementById('selectedTime').value;
    const adultsCount = document.getElementById('adultsCount').value;
    const childrenCount = document.getElementById('childrenCount').value;
    const specialRequests = document.getElementById('specialRequests').value;
    const communicationPref = document.querySelector('input[name="communicationPref"]:checked').value;
    
    // Validation
    if (!fullName || !phone || !email || !tourSelect || !tourDate || !pickupLocation) {
        alert('Please fill in all required fields (*)');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
    }
    
    // Time text mapping with new schedule
    const timeText = {
        'sunrise': 'Sunrise (4:00 AM - 8:00 AM)',
        'morning': 'Morning (8:30 AM - 12:30 PM)',
        'sunset': 'Sunset (2:30 PM - 6:30 PM)'
    };
    
    // Generate booking ID
    const bookingId = 'GS-' + Date.now().toString().slice(-8);
    
    // Create booking message
    const message = `🌟 *New Booking Request - Golden Sky Tourism* 🌟

👤 *Customer Information:*
• Name: ${fullName}
• Phone: ${phone}
• Email: ${email}
• Preferred Contact: ${communicationPref.toUpperCase()}

🗓️ *Tour Details:*
• Tour: ${tourSelect}
• Date: ${new Date(tourDate).toLocaleDateString()}
• Time: ${timeText[selectedTime]}
• Pickup Location: ${pickupLocation}

👥 *Group Information:*
• Adults: ${adultsCount}
• Children: ${childrenCount}

📝 *Special Requests:*
${specialRequests || 'No special requests'}

🆔 *Booking ID:* ${bookingId}
⏰ *Request Time:* ${new Date().toLocaleString()}

Thank you for choosing Golden Sky Tourism! We will contact you within 2 hours with pricing and to confirm your booking.`;
    
    // Create email body
    const emailSubject = `New Booking Request - ${bookingId}`;
    const emailBody = message.replace(/\*/g, '').replace(/🌟/g, '').replace(/👤/g, 'CUSTOMER INFORMATION:')
        .replace(/🗓️/g, 'TOUR DETAILS:').replace(/👥/g, 'GROUP INFORMATION:')
        .replace(/📝/g, 'SPECIAL REQUESTS:').replace(/🆔/g, 'BOOKING ID:').replace(/⏰/g, 'REQUEST TIME:');
    
    // Encode message
    const encodedMessage = encodeURIComponent(message);
    const encodedEmailSubject = encodeURIComponent(emailSubject);
    const encodedEmailBody = encodeURIComponent(emailBody);
    
    // WhatsApp number and email
    const whatsappNumber = "97466955259";
    const smsNumber = "97466955259";
    const companyEmail = "info@goldensky.com";
    
    // Determine communication method
    if (communicationPref === 'whatsapp') {
        // Try WhatsApp first
        const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
        window.open(whatsappURL, '_blank');
        
        // Also send email copy to company
        const emailURL = `mailto:${companyEmail}?subject=${encodedEmailSubject}&body=${encodedEmailBody}`;
        setTimeout(() => {
            window.location.href = emailURL;
        }, 1000);
        
    } else {
        // Send SMS (using mailto as fallback since direct SMS requires device API)
        const smsBody = `New booking from ${fullName}. Tour: ${tourSelect}. Date: ${tourDate}. Please check email for full details.`;
        const smsURL = `mailto:${smsNumber}@?subject=Booking Request&body=${encodeURIComponent(smsBody)}`;
        
        // Send to SMS gateway and company email
        window.location.href = smsURL;
        
        // Also send full details to company email
        setTimeout(() => {
            window.location.href = `mailto:${companyEmail}?subject=${encodedEmailSubject}&body=${encodedEmailBody}`;
        }, 500);
    }
    
    // Show confirmation modal
    document.getElementById('bookingId').textContent = bookingId;
    const successModal = new bootstrap.Modal(document.getElementById('successModal'));
    successModal.show();
    
    // Store booking data
    const bookingData = {
        id: bookingId,
        name: fullName,
        phone: phone,
        email: email,
        tour: tourSelect,
        date: tourDate,
        time: selectedTime,
        adults: adultsCount,
        children: childrenCount,
        pickup: pickupLocation,
        requests: specialRequests,
        timestamp: new Date().toISOString()
    };
    
    // Store in localStorage (temporary)
    localStorage.setItem(`booking_${bookingId}`, JSON.stringify(bookingData));
    
    // Clear form
    setTimeout(() => {
        document.getElementById('bookingForm').reset();
        updateSummary();
    }, 2000);
}

// Initialize booking system
document.addEventListener('DOMContentLoaded', function() {
    // Initialize summary
    document.querySelectorAll('#bookingForm select, #bookingForm input').forEach(element => {
        element.addEventListener('change', updateSummary);
        element.addEventListener('input', updateSummary);
    });
    
    updateSummary();
});
