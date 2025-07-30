// Client dashboard view module
import { renderSidebar } from '../sidebar.js';
import { ROLES } from '../constants.js';
import { formatPhone, formatDate, formatTimeString12Hour } from '../utils.js';

export async function renderClientDashboard({ root, db, signOut, currentUser, currentRole, formatPhone, route }) {
    root.innerHTML = `
        <div class="container">
            ${renderSidebar(currentRole)}
            <div class="main">
                <div class="topbar">
                    <h1>My Bookings</h1>
                    <div class="user-box">
                        <span>${currentUser?.displayName || currentUser?.name || currentUser?.email}</span>
                        <button id="auth-btn" title="Sign out">Sign Out</button>
                    </div>
                </div>
                <div class="content">
                    <div class="cards">
                        <div class="card">
                            <h3>Welcome Back!</h3>
                            <p>Manage your appointments and view booking history.</p>
                            <div class="cardOwner">
                                <div>Name: ${currentUser?.displayName || currentUser?.name || 'Not provided'}</div>
                                <div>Email: ${currentUser?.email}</div>
                                <div>Role: Client</div>
                                <div>Last Login: ${new Date().toLocaleDateString()}</div>
                            </div>
                        </div>

                        <div class="card" id="statsCard">
                            <h3>Booking Summary</h3>
                            <div class="cardOwner" id="statsContent">
                                <div>Loading statistics...</div>
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: 2rem;">
                        <h2>My Appointments</h2>
                        <div id="bookingsList" class="cards">
                            <!-- Client bookings will be loaded here -->
                        </div>
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

    // Load client statistics and bookings
    await loadClientStats();
    await loadClientBookings();

    async function loadClientStats() {
        try {
            const { collection, getDocs, query, where } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");

            let stats = {
                totalBookings: 0,
                upcomingBookings: 0,
                completedBookings: 0,
                pendingBookings: 0
            };

            // Get all companies to search for bookings
            const companiesRef = collection(db, 'companies');
            const companiesSnapshot = await getDocs(companiesRef);

            const today = new Date().toISOString().split('T')[0];

            for (const companyDoc of companiesSnapshot.docs) {
                const bookingsRef = collection(db, 'companies', companyDoc.id, 'bookings');
                const bookingsSnapshot = await getDocs(bookingsRef);

                bookingsSnapshot.forEach((bookingDoc) => {
                    const booking = bookingDoc.data();

                    // Check if this booking belongs to the current user
                    if (booking.clientEmail === currentUser?.email) {
                        stats.totalBookings++;

                        if (booking.status === 'pending') {
                            stats.pendingBookings++;
                        } else if (booking.status === 'completed') {
                            stats.completedBookings++;
                        } else if (booking.date >= today && booking.status !== 'cancelled') {
                            stats.upcomingBookings++;
                        }
                    }
                });
            }

            // Update the stats display
            const statsContent = document.getElementById('statsContent');
            if (statsContent) {
                statsContent.innerHTML = `
                    <div>Total Bookings: ${stats.totalBookings}</div>
                    <div>Upcoming: ${stats.upcomingBookings}</div>
                    <div>Completed: ${stats.completedBookings}</div>
                    <div>Pending Approval: ${stats.pendingBookings}</div>
                `;
            }
        } catch (error) {
            console.error('Error loading client stats:', error);
            const statsContent = document.getElementById('statsContent');
            if (statsContent) {
                statsContent.innerHTML = '<div>Error loading statistics</div>';
            }
        }
    }

    async function loadClientBookings() {
        try {
            const { collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");

            const bookingsList = document.getElementById('bookingsList');
            bookingsList.innerHTML = '<div class="card"><p>Loading your bookings...</p></div>';

            let clientBookings = [];

            // Get all companies to search for client's bookings
            const companiesRef = collection(db, 'companies');
            const companiesSnapshot = await getDocs(companiesRef);

            for (const companyDoc of companiesSnapshot.docs) {
                const company = companyDoc.data();
                const bookingsRef = collection(db, 'companies', companyDoc.id, 'bookings');
                const bookingsSnapshot = await getDocs(bookingsRef);

                bookingsSnapshot.forEach((bookingDoc) => {
                    const booking = bookingDoc.data();

                    // Check if this booking belongs to the current user
                    if (booking.clientEmail === currentUser?.email) {
                        clientBookings.push({
                            id: bookingDoc.id,
                            companyId: companyDoc.id,
                            companyName: company.name,
                            ownerName: company.ownerName,
                            ownerPhone: company.ownerPhone,
                            ownerEmail: company.ownerEmail,
                            ...booking
                        });
                    }
                });
            }

            if (clientBookings.length === 0) {
                bookingsList.innerHTML = `
                    <div class="card">
                        <h3>No Bookings Yet</h3>
                        <p>You haven't made any bookings yet. Contact businesses directly or use their online booking links to schedule appointments.</p>
                    </div>
                `;
                return;
            }

            // Sort bookings by date (newest first)
            clientBookings.sort((a, b) => new Date(b.date) - new Date(a.date));

            bookingsList.innerHTML = '';
            clientBookings.forEach((booking) => {
                const bookingCard = document.createElement('div');
                bookingCard.className = 'card';

                const statusColor = {
                    'pending': '#ffc107',
                    'scheduled': '#007bff',
                    'completed': '#28a745',
                    'cancelled': '#dc3545',
                    'no-show': '#ffc107'
                };

                const statusText = {
                    'pending': 'Pending Approval',
                    'scheduled': 'Confirmed',
                    'completed': 'Completed',
                    'cancelled': 'Cancelled',
                    'no-show': 'No Show'
                };

                bookingCard.innerHTML = `
                    <h3>${booking.serviceName}</h3>
                    <div class="cardOwner">
                        <div><strong>Business:</strong> ${booking.companyName}</div>
                        <div><strong>Owner:</strong> ${booking.ownerName}</div>
                        ${booking.ownerPhone ? `<div><strong>Phone:</strong> ${formatPhone(booking.ownerPhone)}</div>` : ''}
                        <div><strong>Date:</strong> ${formatDate(booking.date)}</div>
                        <div><strong>Time:</strong> ${formatTimeString12Hour(booking.startTime)} - ${formatTimeString12Hour(booking.endTime)}</div>
                        <div><strong>Duration:</strong> ${booking.duration} minutes</div>
                        <div><strong>Price:</strong> $${Number(booking.price).toFixed(2)}</div>
                        <div style="color: ${statusColor[booking.status] || '#000'};"><strong>Status:</strong> ${statusText[booking.status] || booking.status}</div>
                        ${booking.notes ? `<div><strong>Notes:</strong> ${booking.notes}</div>` : ''}
                        <div><strong>Booked:</strong> ${formatDate(booking.createdAt)}</div>
                    </div>
                    
                    ${booking.status === 'pending' ? `
                        <div style="background: #fff3cd; padding: 1rem; margin-top: 1rem; border-radius: 4px; border-left: 4px solid #ffc107;">
                            <strong>⏳ Awaiting Confirmation</strong><br>
                            <small>The business owner will review and confirm your booking request. You'll be contacted at ${booking.clientEmail} with confirmation details.</small>
                        </div>
                    ` : ''}
                    
                    ${booking.status === 'scheduled' && new Date(booking.date) > new Date() ? `
                        <div style="background: #d1ecf1; padding: 1rem; margin-top: 1rem; border-radius: 4px; border-left: 4px solid #17a2b8;">
                            <strong>✓ Confirmed Appointment</strong><br>
                            <small>Your appointment is confirmed. Contact ${booking.ownerName} at ${booking.ownerPhone ? formatPhone(booking.ownerPhone) : booking.ownerEmail} if you need to make changes.</small>
                        </div>
                    ` : ''}
                `;

                bookingsList.appendChild(bookingCard);
            });

        } catch (error) {
            console.error('Error loading client bookings:', error);
            const bookingsList = document.getElementById('bookingsList');
            if (bookingsList) {
                bookingsList.innerHTML = `
                    <div class="card">
                        <h3>Error Loading Bookings</h3>
                        <p>Sorry, there was an error loading your bookings. Please try again later.</p>
                    </div>
                `;
            }
        }
    }
}
