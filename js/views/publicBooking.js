// Public booking view for client-side websites
import { showModal, closeModal } from '/js/modal.js';
import { formatPhone } from '/js/utils.js';

export async function renderPublicBooking({ root, companyId, db }) {
    try {
        const { doc, getDoc, collection, getDocs, addDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");

        // Load company information
        const companyDoc = await getDoc(doc(db, 'companies', companyId));

        if (!companyDoc.exists()) {
            root.innerHTML = `
                <div style="padding: 2rem; text-align: center;">
                    <h2>Business Not Found</h2>
                    <p>The business you're looking for could not be found.</p>
                </div>
            `;
            return;
        }

        const company = companyDoc.data();

        // Load services
        const servicesRef = collection(db, 'companies', companyId, 'services');
        const servicesSnapshot = await getDocs(servicesRef);

        let servicesHtml = '';
        const activeServices = [];

        servicesSnapshot.forEach((serviceDoc) => {
            const service = serviceDoc.data();
            if (service.active !== false) { // Show services that are active or undefined
                activeServices.push({ id: serviceDoc.id, ...service });
                servicesHtml += `
                    <div class="service-card" onclick="selectService('${serviceDoc.id}', '${service.name}', ${service.price}, ${service.duration})">
                        <h3>${service.name}</h3>
                        ${service.description ? `<p>${service.description}</p>` : ''}
                        <div class="service-details">
                            <span class="price">$${Number(service.price).toFixed(2)}</span>
                            <span class="duration">${service.duration} minutes</span>
                        </div>
                    </div>
                `;
            }
        });

        if (!servicesHtml) {
            servicesHtml = '<p>No services are currently available for booking.</p>';
        }

        root.innerHTML = `
            <style>
                .public-booking-container {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 2rem;
                    font-family: Arial, sans-serif;
                }
                .company-header {
                    text-align: center;
                    margin-bottom: 3rem;
                    padding: 2rem;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-radius: 12px;
                }
                .company-header h1 {
                    margin: 0 0 1rem 0;
                    font-size: 2.5rem;
                }
                .company-info {
                    opacity: 0.9;
                    font-size: 1.1rem;
                }
                .services-section {
                    margin-bottom: 3rem;
                }
                .services-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 1.5rem;
                    margin-top: 1.5rem;
                }
                .service-card {
                    background: white;
                    border: 2px solid #e9ecef;
                    border-radius: 12px;
                    padding: 1.5rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .service-card:hover {
                    border-color: #667eea;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                .service-card.selected {
                    border-color: #667eea;
                    background: #f8f9ff;
                }
                .service-card h3 {
                    margin: 0 0 0.5rem 0;
                    color: #333;
                }
                .service-card p {
                    color: #666;
                    margin: 0 0 1rem 0;
                }
                .service-details {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .price {
                    font-size: 1.25rem;
                    font-weight: bold;
                    color: #667eea;
                }
                .duration {
                    color: #666;
                    background: #f1f3f4;
                    padding: 0.25rem 0.75rem;
                    border-radius: 20px;
                    font-size: 0.9rem;
                }
                .booking-section {
                    background: #f8f9fa;
                    padding: 2rem;
                    border-radius: 12px;
                    margin-top: 2rem;
                }
                .btn {
                    background: #667eea;
                    color: white;
                    border: none;
                    padding: 0.75rem 2rem;
                    border-radius: 8px;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: background 0.3s ease;
                }
                .btn:hover {
                    background: #5a6fd8;
                }
                .btn:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                }
                .form-group {
                    margin-bottom: 1.5rem;
                }
                .form-group label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: bold;
                    color: #333;
                }
                .form-group input,
                .form-group textarea {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 1rem;
                }
                .selected-service {
                    background: #e8f5e8;
                    padding: 1rem;
                    border-radius: 8px;
                    margin-bottom: 1.5rem;
                    border-left: 4px solid #28a745;
                }
            </style>
            
            <div class="public-booking-container">
                <div class="company-header">
                    <h1>${company.name}</h1>
                    <div class="company-info">
                        <div>Owner: ${company.ownerName}</div>
                        ${company.ownerPhone ? `<div>Phone: ${formatPhone(company.ownerPhone)}</div>` : ''}
                        ${company.ownerEmail ? `<div>Email: ${company.ownerEmail}</div>` : ''}
                    </div>
                </div>

                <div class="services-section">
                    <h2>Our Services</h2>
                    <div class="services-grid">
                        ${servicesHtml}
                    </div>
                </div>

                <div class="booking-section">
                    <h2>Book an Appointment</h2>
                    <div id="selectedService" style="display: none;" class="selected-service">
                        <strong>Selected Service:</strong> <span id="serviceName"></span><br>
                        <strong>Duration:</strong> <span id="serviceDuration"></span> minutes<br>
                        <strong>Price:</strong> $<span id="servicePrice"></span>
                    </div>
                    
                    <form id="bookingForm">
                        <div class="form-group">
                            <label>Your Name *</label>
                            <input type="text" id="clientName" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Email Address *</label>
                            <input type="email" id="clientEmail" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Phone Number</label>
                            <input type="tel" id="clientPhone">
                        </div>
                        
                        <div class="form-group">
                            <label>Preferred Date *</label>
                            <input type="date" id="bookingDate" required min="${new Date().toISOString().split('T')[0]}">
                        </div>
                        
                        <div class="form-group">
                            <label>Preferred Time *</label>
                            <input type="time" id="bookingTime" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Additional Notes</label>
                            <textarea id="bookingNotes" rows="4" placeholder="Any special requests or information..."></textarea>
                        </div>
                        
                        <button type="submit" class="btn" id="submitBooking" disabled>
                            Select a Service to Continue
                        </button>
                    </form>
                </div>
            </div>
        `;

        // Store selected service data
        let selectedServiceData = null;

        // Make selectService function globally available
        window.selectService = (serviceId, name, price, duration) => {
            // Remove previous selections
            document.querySelectorAll('.service-card').forEach(card => {
                card.classList.remove('selected');
            });

            // Select current service
            event.target.closest('.service-card').classList.add('selected');

            // Store service data
            selectedServiceData = { serviceId, name, price, duration };

            // Update UI
            document.getElementById('serviceName').textContent = name;
            document.getElementById('serviceDuration').textContent = duration;
            document.getElementById('servicePrice').textContent = Number(price).toFixed(2);
            document.getElementById('selectedService').style.display = 'block';

            const submitBtn = document.getElementById('submitBooking');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Request Booking';
        };

        // Handle form submission
        const form = document.getElementById('bookingForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!selectedServiceData) {
                alert('Please select a service first.');
                return;
            }

            const submitBtn = document.getElementById('submitBooking');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting Request...';

            try {
                const clientName = document.getElementById('clientName').value;
                const clientEmail = document.getElementById('clientEmail').value;
                const clientPhone = document.getElementById('clientPhone').value;
                const bookingDate = document.getElementById('bookingDate').value;
                const bookingTime = document.getElementById('bookingTime').value;
                const notes = document.getElementById('bookingNotes').value;

                // Calculate end time
                const [hours, minutes] = bookingTime.split(':').map(Number);
                const startMinutes = hours * 60 + minutes;
                const endMinutes = startMinutes + selectedServiceData.duration;
                const endHours = Math.floor(endMinutes / 60);
                const endMins = endMinutes % 60;
                const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

                // First, check if client exists or create new client
                const clientsRef = collection(db, 'companies', companyId, 'clients');
                const clientsSnapshot = await getDocs(clientsRef);

                let clientId = null;
                let existingClient = null;

                // Check for existing client by email
                clientsSnapshot.forEach((doc) => {
                    const client = doc.data();
                    if (client.email.toLowerCase() === clientEmail.toLowerCase()) {
                        clientId = doc.id;
                        existingClient = client;
                    }
                });

                // Create new client if doesn't exist
                if (!clientId) {
                    const newClientData = {
                        name: clientName,
                        email: clientEmail,
                        phone: clientPhone || '',
                        address: {
                            street: '',
                            city: '',
                            state: '',
                            zipCode: ''
                        },
                        notes: '',
                        status: 'active',
                        totalBookings: 0,
                        createdAt: new Date().toISOString()
                    };

                    const newClientDoc = await addDoc(clientsRef, newClientData);
                    clientId = newClientDoc.id;
                }

                // Create booking request
                const bookingData = {
                    clientId: clientId,
                    clientName: clientName,
                    clientEmail: clientEmail,
                    clientPhone: clientPhone || '',
                    serviceId: selectedServiceData.serviceId,
                    serviceName: selectedServiceData.name,
                    date: bookingDate,
                    startTime: bookingTime,
                    endTime: endTime,
                    duration: selectedServiceData.duration,
                    price: selectedServiceData.price,
                    status: 'pending', // Pending approval from business owner
                    notes: notes,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    source: 'public_website' // Track that this came from public booking
                };

                const bookingsRef = collection(db, 'companies', companyId, 'bookings');
                await addDoc(bookingsRef, bookingData);

                // Show success message
                showModal(`
                    <div style="background: white; padding: 2rem; border-radius: 12px; text-align: center; max-width: 500px;">
                        <div style="color: #28a745; font-size: 3rem; margin-bottom: 1rem;">✓</div>
                        <h2 style="color: #28a745; margin-bottom: 1rem;">Booking Request Submitted!</h2>
                        <p style="margin-bottom: 1.5rem;">
                            Thank you, ${clientName}! Your booking request for <strong>${selectedServiceData.name}</strong> 
                            on ${new Date(bookingDate).toLocaleDateString()} at ${formatTime12Hour(bookingTime)} has been submitted.
                        </p>
                        <p style="color: #666; margin-bottom: 2rem;">
                            ${company.ownerName} will review your request and contact you at ${clientEmail} to confirm the appointment.
                        </p>
                        <button onclick="window.closeModal(this.closest('.modal-overlay')); location.reload();" class="btn">
                            Request Another Booking
                        </button>
                    </div>
                `);

            } catch (error) {
                console.error('Error submitting booking:', error);
                alert('Sorry, there was an error submitting your booking request. Please try again or contact the business directly.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Request Booking';
            }
        });

    } catch (error) {
        console.error('Error loading public booking page:', error);
        root.innerHTML = `
            <div style="padding: 2rem; text-align: center;">
                <h2>Error Loading Page</h2>
                <p>Sorry, there was an error loading the booking page. Please try again later.</p>
            </div>
        `;
    }
}

// Helper function to format time in 12-hour format
function formatTime12Hour(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}
