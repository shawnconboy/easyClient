// Company detail view module
import { renderSidebar } from '../sidebar.js';

export async function renderCompanyDetail({ root, companyId, db, signOut, hasPermission, updateDoc, generateId, formatPhone, currentRole, route }) {
    root.innerHTML = `
        <div class="container">
            ${renderSidebar(currentRole)}
            <div class="main">
                <div class="topbar">
                    <h1>Company Details</h1>
                    <div class="user-box">
                        <span>Company ID: ${companyId || 'N/A'}</span>
                        <button id="auth-btn" title="Sign out">Sign Out</button>
                    </div>
                </div>
                <div class="content">
                    <div class="cards">
                        <div class="card">
                            <h3>Company Information</h3>
                            <p>View and manage detailed company information and settings.</p>
                            <button onclick="alert('Company details features coming soon!')">Edit Details</button>
                        </div>
                        
                        <div class="card">
                            <h3>Business Stats</h3>
                            <div class="cardOwner">
                                <div>Company ID: ${companyId || 'Not specified'}</div>
                                <div>Status: Active</div>
                            </div>
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
}
