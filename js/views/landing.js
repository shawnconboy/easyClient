// Landing view module

export function renderLanding({ root }) {
    root.innerHTML = `
        <div class="hero">
            <h1>Easy Client</h1>
            <p>Your all-in-one CRM and booking management system</p>
            <button class="cta-btn" onclick="window.route('/login')">Get Started</button>
        </div>
        <div class="features">
            <div class="feature-card">
                <h3>Client Management</h3>
                <p>Keep track of all your clients and their information in one place.</p>
            </div>
            <div class="feature-card">
                <h3>Booking System</h3>
                <p>Manage appointments and bookings with an intuitive calendar interface.</p>
            </div>
            <div class="feature-card">
                <h3>Business Analytics</h3>
                <p>Get insights into your business performance with detailed reports.</p>
            </div>
        </div>
        <div class="footer">
            <p>&copy; 2025 Easy Client. All rights reserved.</p>
        </div>
    `;
}
