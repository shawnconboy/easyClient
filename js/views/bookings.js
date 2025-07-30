// Bookings view module
import { renderSidebar } from '../sidebar.js';
import { ROLES, BOOKING_STATUSES } from '../constants.js';
import { showModal, closeModal, showConfirmModal } from '../modal.js';
import { formatPhone, formatDate, formatTimeString12Hour } from '../utils.js';

export async function renderBookings({ root, db, signOut, currentUser, currentRole, formatPhone, route }) {
    root.innerHTML = `
        <div class="container">
            ${renderSidebar(currentRole)}
            <div class="main">
                <div class="topbar">
                    <h1>Bookings</h1>
                    <div class="user-box">
                        <span>${currentUser?.email}</span>
                        <button id="auth-btn" title="Sign out">Sign Out</button>
                    </div>
                </div>
                <div class="content">
                    <div style="margin-bottom: 2rem;">
                        <button id="addBookingBtn" class="btn">Schedule New Booking</button>
                    </div>
                    <div id="bookingsList" class="cards">
                        <!-- Bookings will be loaded here -->
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add sign out handler
    const authBtn = document.getElementById('auth-btn');
    if (authBtn) {
        authBtn.addEventListener('click', async () => {
            try {
                await signOut();
                route('/login');
            } catch (error) {
                console.error('Sign out error:', error);
            }
        });
    }

    // Load and display bookings
    await loadBookings();

    // Add create booking handler
    const addBookingBtn = document.getElementById('addBookingBtn');
    if (addBookingBtn) {
        addBookingBtn.addEventListener('click', () => showAddBookingModal());
    }

    async function loadBookings() {
        try {
            const { collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");

            // Get current user's company
            const companiesRef = collection(db, 'companies');
            const companiesSnapshot = await getDocs(companiesRef);
            let userCompanyId = null;

            companiesSnapshot.forEach((doc) => {
                const company = doc.data();
                if (company.ownerUid === currentUser?.uid) {
                    userCompanyId = doc.id;
                }
            });

            if (!userCompanyId) {
                document.getElementById('bookingsList').innerHTML = `
                    <div class="card">
                        <h3>No Company Found</h3>
                        <p>Please create a company first before managing bookings.</p>
                        <button onclick="window.route('/companies')" class="btn">Go to Companies</button>
                    </div>
                `;
                return;
            }

            const bookingsRef = collection(db, 'companies', userCompanyId, 'bookings');
            const bookingsQuery = query(bookingsRef, orderBy('date', 'desc'));
            const bookingsSnapshot = await getDocs(bookingsQuery);

            const bookingsList = document.getElementById('bookingsList');

            if (bookingsSnapshot.empty) {
                bookingsList.innerHTML = `
                    <div class="card">
                        <h3>No Bookings Yet</h3>
                        <p>Schedule your first booking to get started.</p>
                    </div>
                `;
                return;
            }

            bookingsList.innerHTML = '';
            bookingsSnapshot.forEach((doc) => {
                const booking = doc.data();
                const bookingCard = document.createElement('div');
                bookingCard.className = 'card';

                const statusColor = {
                    'scheduled': '#007bff',
                    'completed': '#28a745',
                    'cancelled': '#dc3545',
                    'no-show': '#ffc107'
                };

                bookingCard.innerHTML = `
                    <h3>${booking.serviceName}</h3>
                    <div class="cardOwner">
                        <div>Client: ${booking.clientName}</div>
                        <div>Date: ${formatDate(booking.date)}</div>
                        <div>Time: ${formatTimeString12Hour(booking.startTime)} - ${formatTimeString12Hour(booking.endTime)}</div>
                        <div>Duration: ${booking.duration} minutes</div>
                        <div>Price: $${booking.price}</div>
                        <div style="color: ${statusColor[booking.status] || '#000'};">Status: ${booking.status}</div>
                        ${booking.notes ? `<div>Notes: ${booking.notes}</div>` : ''}
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button onclick="window.toggleBookingComplete('${userCompanyId}', '${doc.id}', '${booking.status}')" class="btn ${booking.status === 'completed' ? 'btn-secondary' : 'btn-success'}">${booking.status === 'completed' ? 'Mark Incomplete' : 'Mark Complete'}</button>
                        <button onclick="window.updateBookingStatus('${userCompanyId}', '${doc.id}', 'cancelled')" class="btn btn-error" ${booking.status === 'cancelled' ? 'disabled' : ''}>Cancel</button>
                    </div>
                `;
                bookingsList.appendChild(bookingCard);
            });
        } catch (error) {
            console.error('Error loading bookings:', error);
        }
    }

    async function showAddBookingModal() {
        // First, load clients and services for the dropdown
        const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");

        const companiesRef = collection(db, 'companies');
        const companiesSnapshot = await getDocs(companiesRef);
        let userCompanyId = null;

        companiesSnapshot.forEach((doc) => {
            const company = doc.data();
            if (company.ownerUid === currentUser?.uid) {
                userCompanyId = doc.id;
            }
        });

        if (!userCompanyId) {
            alert('Company not found. Please create a company first.');
            return;
        }

        // Load clients
        const clientsRef = collection(db, 'companies', userCompanyId, 'clients');
        const clientsSnapshot = await getDocs(clientsRef);

        let clientOptions = '';
        clientsSnapshot.forEach((doc) => {
            const client = doc.data();
            clientOptions += `<option value="${doc.id}">${client.name}</option>`;
        });

        if (!clientOptions) {
            alert('No clients found. Please add clients first.');
            return;
        }

        // Load services for this company
        const servicesRef = collection(db, 'companies', userCompanyId, 'services');
        const servicesSnapshot = await getDocs(servicesRef);

        let serviceOptions = '';
        let hasServices = false;
        servicesSnapshot.forEach((doc) => {
            const service = doc.data();
            serviceOptions += `<option value="${service.name}" data-price="${service.price}" data-duration="${service.duration}">${service.name} - $${service.price} (${service.duration} min)</option>`;
            hasServices = true;
        });

        // If no services exist, show option to create some default ones
        if (!hasServices) {
            serviceOptions = `
                <option value="">Select a service...</option>
                <option value="Consultation" data-price="100" data-duration="60">Consultation - $100 (60 min)</option>
                <option value="Follow-up" data-price="75" data-duration="30">Follow-up - $75 (30 min)</option>
                <option value="Assessment" data-price="150" data-duration="90">Assessment - $150 (90 min)</option>
                <option value="Custom Service" data-price="0" data-duration="60">Custom Service</option>
            `;
        } else {
            serviceOptions = `<option value="">Select a service...</option>` + serviceOptions + `<option value="Custom Service" data-price="0" data-duration="60">Custom Service</option>`;
        }

        const modalContent = `
            <div style="background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
                <h2>Schedule New Booking</h2>
                ${!hasServices ? '<p style="color: #666; font-size: 0.9rem; margin-bottom: 1rem;"><em>Note: No custom services found. You can select from default options or create a custom service.</em></p>' : ''}
                <form id="addBookingForm">
                    <label>Client:</label>
                    <select id="bookingClient" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="">Select a client</option>
                        ${clientOptions}
                    </select>
                    
                    <label>Service:</label>
                    <select id="bookingService" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        ${serviceOptions}
                    </select>
                    
                    <div id="customServiceFields" style="display: none;">
                        <label>Custom Service Name:</label>
                        <input type="text" id="customServiceName" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    
                    <label>Date:</label>
                    <input type="date" id="bookingDate" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <label>Start Time:</label>
                    <input type="time" id="bookingStartTime" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <label>Duration (minutes):</label>
                    <input type="number" id="bookingDuration" value="60" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <label>Price:</label>
                    <input type="number" id="bookingPrice" step="0.01" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <label>Notes:</label>
                    <textarea id="bookingNotes" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; resize: vertical;"></textarea>
                    
                    <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                        <button type="button" onclick="window.closeModal(this.closest('.modal-overlay'))" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn">Schedule Booking</button>
                    </div>
                </form>
                ${!hasServices ? '<div style="margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 4px;"><small><strong>Tip:</strong> Create custom services in your company settings to have them appear automatically in this dropdown.</small></div>' : ''}
            </div>
        `;

        const modal = showModal(modalContent);

        // Add service selection handler to auto-fill price and duration
        const serviceSelect = document.getElementById('bookingService');
        const priceInput = document.getElementById('bookingPrice');
        const durationInput = document.getElementById('bookingDuration');
        const customFields = document.getElementById('customServiceFields');

        serviceSelect.addEventListener('change', () => {
            const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];

            if (selectedOption.value === 'Custom Service') {
                customFields.style.display = 'block';
                priceInput.value = '';
                durationInput.value = '60';
            } else {
                customFields.style.display = 'none';
                const price = selectedOption.getAttribute('data-price');
                const duration = selectedOption.getAttribute('data-duration');

                if (price) priceInput.value = price;
                if (duration) durationInput.value = duration;
            }
        });

        const form = document.getElementById('addBookingForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            try {
                const selectedClientId = document.getElementById('bookingClient').value;
                const clientDoc = await getDocs(collection(db, 'companies', userCompanyId, 'clients'));
                let selectedClientName = '';

                clientDoc.forEach((doc) => {
                    if (doc.id === selectedClientId) {
                        selectedClientName = doc.data().name;
                    }
                });

                const startTime = document.getElementById('bookingStartTime').value;
                const duration = parseInt(document.getElementById('bookingDuration').value);

                // Calculate end time
                const [hours, minutes] = startTime.split(':').map(Number);
                const startMinutes = hours * 60 + minutes;
                const endMinutes = startMinutes + duration;
                const endHours = Math.floor(endMinutes / 60);
                const endMins = endMinutes % 60;
                const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

                // Get service name - either from dropdown or custom input
                const serviceSelect = document.getElementById('bookingService');
                let serviceName;

                if (serviceSelect.value === 'Custom Service') {
                    serviceName = document.getElementById('customServiceName').value;
                    if (!serviceName.trim()) {
                        alert('Please enter a custom service name.');
                        return;
                    }
                } else {
                    serviceName = serviceSelect.value;
                }

                const bookingData = {
                    clientId: selectedClientId,
                    clientName: selectedClientName,
                    serviceId: 'service_' + Date.now(),
                    serviceName: serviceName,
                    date: document.getElementById('bookingDate').value,
                    startTime: startTime,
                    endTime: endTime,
                    duration: duration,
                    status: 'scheduled',
                    price: parseFloat(document.getElementById('bookingPrice').value),
                    notes: document.getElementById('bookingNotes').value,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                const { addDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
                const bookingsRef = collection(db, 'companies', userCompanyId, 'bookings');
                await addDoc(bookingsRef, bookingData);

                closeModal(modal);
                await loadBookings();
                alert('Booking scheduled successfully!');
            } catch (error) {
                console.error('Error scheduling booking:', error);
                alert('Error scheduling booking. Please try again.');
            }
        });
    }

    // Make functions globally available for onclick handlers
    window.updateBookingStatus = async (companyId, bookingId, newStatus) => {
        // Add confirmation for canceling bookings
        if (newStatus === 'cancelled') {
            const { showConfirmModal } = await import('../modal.js');

            showConfirmModal({
                title: 'Cancel Booking',
                message: 'Are you sure you want to cancel this booking? This action cannot be undone.',
                confirmText: 'Yes, Cancel',
                cancelText: 'Keep Booking',
                confirmStyle: 'btn btn-error',
                onConfirm: async () => {
                    await performStatusUpdate(companyId, bookingId, newStatus);
                }
            });
            return;
        }

        // For other status updates, proceed directly
        await performStatusUpdate(companyId, bookingId, newStatus);
    };

    // New function to toggle between completed and scheduled
    window.toggleBookingComplete = async (companyId, bookingId, currentStatus) => {
        const newStatus = currentStatus === 'completed' ? 'scheduled' : 'completed';
        await performStatusUpdate(companyId, bookingId, newStatus);
    };

    async function performStatusUpdate(companyId, bookingId, newStatus) {
        try {
            const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");

            const bookingRef = doc(db, 'companies', companyId, 'bookings', bookingId);
            await updateDoc(bookingRef, {
                status: newStatus,
                updatedAt: new Date().toISOString()
            });

            await loadBookings();

            // Show appropriate success message
            const statusMessages = {
                'scheduled': 'Booking marked as scheduled!',
                'completed': 'Booking marked as completed!',
                'cancelled': 'Booking cancelled successfully!'
            };

            alert(statusMessages[newStatus] || `Booking ${newStatus} successfully!`);
        } catch (error) {
            console.error('Error updating booking status:', error);
            alert('Error updating booking status. Please try again.');
        }
    }

    window.editBooking = async (bookingId) => {
        try {
            const { doc, getDoc, updateDoc, collection, getDocs } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
            const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));

            if (!bookingDoc.exists()) {
                alert('Booking not found.');
                return;
            }

            const booking = bookingDoc.data();

            // Load companies and clients for dropdowns
            const companiesSnapshot = await getDocs(collection(db, 'companies'));
            let companiesOptions = '';
            let clientsData = {};

            for (const companyDoc of companiesSnapshot.docs) {
                const companyData = companyDoc.data();
                companiesOptions += `<option value="${companyDoc.id}" ${booking.companyId === companyDoc.id ? 'selected' : ''}>${companyData.name}</option>`;

                // Load clients for this company
                const clientsSnapshot = await getDocs(collection(db, 'companies', companyDoc.id, 'clients'));
                clientsData[companyDoc.id] = [];
                clientsSnapshot.forEach(clientDoc => {
                    clientsData[companyDoc.id].push({
                        id: clientDoc.id,
                        name: clientDoc.data().name
                    });
                });
            }

            // Generate clients options for selected company
            let clientsOptions = '';
            if (booking.companyId && clientsData[booking.companyId]) {
                clientsData[booking.companyId].forEach(client => {
                    clientsOptions += `<option value="${client.id}" ${booking.clientId === client.id ? 'selected' : ''}>${client.name}</option>`;
                });
            }

            const bookingDate = booking.date?.toDate ? booking.date.toDate().toISOString().split('T')[0] : booking.date?.split('T')[0] || '';
            const bookingTime = booking.time || '';

            const modalContent = `
                <div style="background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto;">
                    <h2>Edit Booking</h2>
                    <form id="editBookingForm">
                        <label>Company:</label>
                        <select id="editBookingCompany" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="">Select a company...</option>
                            ${companiesOptions}
                        </select>
                        
                        <label>Client:</label>
                        <select id="editBookingClient" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="">Select a client...</option>
                            ${clientsOptions}
                        </select>
                        
                        <label>Service:</label>
                        <input type="text" id="editBookingService" value="${booking.service}" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label>Date:</label>
                        <input type="date" id="editBookingDate" value="${bookingDate}" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label>Time:</label>
                        <input type="time" id="editBookingTime" value="${bookingTime}" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label>Duration (minutes):</label>
                        <input type="number" id="editBookingDuration" value="${booking.duration || 60}" min="15" step="15" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label>Price:</label>
                        <input type="number" id="editBookingPrice" value="${booking.price || ''}" min="0" step="0.01" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label>Status:</label>
                        <select id="editBookingStatus" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="Scheduled" ${booking.status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                            <option value="Confirmed" ${booking.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="In Progress" ${booking.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option value="Completed" ${booking.status === 'Completed' ? 'selected' : ''}>Completed</option>
                            <option value="Cancelled" ${booking.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                            <option value="No Show" ${booking.status === 'No Show' ? 'selected' : ''}>No Show</option>
                        </select>
                        
                        <label>Notes:</label>
                        <textarea id="editBookingNotes" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; resize: vertical;">${booking.notes || ''}</textarea>
                        
                        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                            <button type="button" onclick="window.closeModal(this.closest('.modal-overlay'))" class="btn btn-secondary">Cancel</button>
                            <button type="submit" class="btn">Update Booking</button>
                        </div>
                    </form>
                </div>
            `;

            const modal = showModal(modalContent);

            // Add event listener for company change to update clients
            const companySelect = document.getElementById('editBookingCompany');
            const clientSelect = document.getElementById('editBookingClient');

            companySelect.addEventListener('change', () => {
                const selectedCompanyId = companySelect.value;
                clientSelect.innerHTML = '<option value="">Select a client...</option>';

                if (selectedCompanyId && clientsData[selectedCompanyId]) {
                    clientsData[selectedCompanyId].forEach(client => {
                        clientSelect.innerHTML += `<option value="${client.id}">${client.name}</option>`;
                    });
                }
            });

            const form = document.getElementById('editBookingForm');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const updatedData = {
                    companyId: document.getElementById('editBookingCompany').value,
                    clientId: document.getElementById('editBookingClient').value,
                    service: document.getElementById('editBookingService').value,
                    date: new Date(document.getElementById('editBookingDate').value + 'T00:00:00'),
                    time: document.getElementById('editBookingTime').value,
                    duration: parseInt(document.getElementById('editBookingDuration').value),
                    price: parseFloat(document.getElementById('editBookingPrice').value) || 0,
                    status: document.getElementById('editBookingStatus').value,
                    notes: document.getElementById('editBookingNotes').value
                };

                try {
                    await updateDoc(doc(db, 'bookings', bookingId), updatedData);
                    closeModal(modal);
                    await loadBookings();
                    alert('Booking updated successfully!');
                } catch (error) {
                    console.error('Error updating booking:', error);
                    alert('Error updating booking. Please try again.');
                }
            });
        } catch (error) {
            console.error('Error loading booking for edit:', error);
            alert('Error loading booking details.');
        }
    };
}
