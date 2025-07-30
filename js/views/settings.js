// Settings view module
import { renderSidebar } from '../sidebar.js';
import { showModal, closeModal } from '../modal.js';

export async function renderSettings({ root, db, signOut, currentUser, currentRole, updateDoc, hasPermission, sendPasswordResetEmail, route }) {
    root.innerHTML = `
        <div class="container">
            ${renderSidebar(currentRole)}
            <div class="main">
                <div class="topbar">
                    <h1>Settings</h1>
                    <div class="user-box">
                        <span>${currentUser?.displayName || currentUser?.name || currentUser?.email}</span>
                        <button id="auth-btn" title="Sign out">Sign Out</button>
                    </div>
                </div>
                <div class="content">
                    <div class="cards">
                        <div class="card">
                            <h3>Profile Settings</h3>
                            <div class="cardOwner">
                                <div><strong>Name:</strong> ${currentUser?.displayName || 'Not set'}</div>
                                <div><strong>Email:</strong> ${currentUser?.email}</div>
                                <div><strong>Role:</strong> ${currentRole}</div>
                                <div><strong>Account Created:</strong> ${new Date(currentUser?.metadata?.creationTime).toLocaleDateString()}</div>
                            </div>
                            <button id="editProfileBtn" class="btn">Edit Profile</button>
                        </div>
                        
                        <div class="card">
                            <h3>Account Security</h3>
                            <p>Manage your account security settings.</p>
                            <button id="changePasswordBtn" class="btn btn-secondary">Change Password</button>
                        </div>
                        
                        <div class="card">
                            <h3>Notifications</h3>
                            <p>Configure your notification preferences.</p>
                            <div style="margin: 1rem 0;">
                                <label style="display: flex; align-items: center; gap: 0.5rem;">
                                    <input type="checkbox" id="emailNotifications" checked>
                                    Email notifications
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem;">
                                    <input type="checkbox" id="smsNotifications">
                                    SMS notifications
                                </label>
                            </div>
                            <button id="saveNotificationsBtn" class="btn">Save Preferences</button>
                        </div>
                        
                        ${currentRole === 'Owner' ? `
                        <div class="card">
                            <h3>Business Services</h3>
                            <p>Manage the services you offer to your clients.</p>
                            <div class="cardOwner">
                                <div>Configure your service offerings, pricing, and duration</div>
                            </div>
                            <button onclick="window.manageMyServices()" class="btn">Manage Services</button>
                        </div>
                        ` : ''}
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

    // Add edit profile handler
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => showEditProfileModal());
    }

    // Add change password handler
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', () => showChangePasswordModal());
    }

    // Add save notifications handler
    const saveNotificationsBtn = document.getElementById('saveNotificationsBtn');
    if (saveNotificationsBtn) {
        saveNotificationsBtn.addEventListener('click', () => saveNotificationPreferences());
    }

    function showEditProfileModal() {
        const modalContent = `
            <div style="background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px;">
                <h2>Edit Profile</h2>
                <form id="editProfileForm">
                    <label>Display Name:</label>
                    <input type="text" id="displayName" value="${currentUser?.displayName || ''}" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <label>Email:</label>
                    <input type="email" id="userEmail" value="${currentUser?.email}" readonly style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; background: #f5f5f5;">
                    
                    <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                        <button type="button" onclick="closeModal(this.closest('.modal-overlay'))" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn">Save Changes</button>
                    </div>
                </form>
            </div>
        `;

        const modal = showModal(modalContent);

        const form = document.getElementById('editProfileForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            try {
                const { updateProfile } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js");
                const { doc, updateDoc, getDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");

                const newDisplayName = document.getElementById('displayName').value;

                // Update Firebase Auth profile
                await updateProfile(currentUser, {
                    displayName: newDisplayName
                });

                // Update Firestore user document with both name fields
                await updateDoc(doc(db, 'users', currentUser.uid), {
                    name: newDisplayName,
                    displayName: newDisplayName
                });

                // If user is a business owner, also update the company document
                if (currentRole === 'owner') {
                    const companyRef = doc(db, 'companies', currentUser.uid);
                    const companyDoc = await getDoc(companyRef);

                    if (companyDoc.exists()) {
                        await updateDoc(companyRef, {
                            ownerName: newDisplayName
                        });
                    }
                }

                closeModal(modal);
                alert('Profile updated successfully!');
                // Reload the page to reflect changes
                location.reload();
            } catch (error) {
                console.error('Error updating profile:', error);
                alert('Error updating profile. Please try again.');
            }
        });
    }

    function showChangePasswordModal() {
        const modalContent = `
            <div style="background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px;">
                <h2>Change Password</h2>
                <p>We'll send you a password reset email.</p>
                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                    <button type="button" onclick="closeModal(this.closest('.modal-overlay'))" class="btn btn-secondary">Cancel</button>
                    <button type="button" onclick="sendPasswordReset()" class="btn">Send Reset Email</button>
                </div>
            </div>
        `;

        const modal = showModal(modalContent);

        window.sendPasswordReset = async () => {
            try {
                const { sendPasswordResetEmail, getAuth } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js");
                const auth = getAuth();
                await sendPasswordResetEmail(auth, currentUser.email);
                closeModal(modal);
                alert('Password reset email sent! Check your inbox.');
            } catch (error) {
                console.error('Error sending password reset email:', error);
                alert('Error sending password reset email. Please try again.');
            }
        };
    }

    function saveNotificationPreferences() {
        const emailNotifications = document.getElementById('emailNotifications').checked;
        const smsNotifications = document.getElementById('smsNotifications').checked;

        // In a real app, this would save to the database
        localStorage.setItem('emailNotifications', emailNotifications);
        localStorage.setItem('smsNotifications', smsNotifications);

        alert('Notification preferences saved!');
    }

    // Load saved notification preferences
    const emailNotifications = localStorage.getItem('emailNotifications');
    const smsNotifications = localStorage.getItem('smsNotifications');

    if (emailNotifications !== null) {
        document.getElementById('emailNotifications').checked = emailNotifications === 'true';
    }
    if (smsNotifications !== null) {
        document.getElementById('smsNotifications').checked = smsNotifications === 'true';
    }
}
