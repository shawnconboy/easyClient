// Users view module
import { renderSidebar } from '../sidebar.js';
import { ROLES } from '../constants.js';
import { showModal, closeModal, showConfirmModal } from '../modal.js';
import { formatPhone } from '../utils.js';

export async function renderUsers({ root, db, signOut, formatPhone, route }) {
    root.innerHTML = `
        <div class="container">
            ${renderSidebar(ROLES.ADMIN)}
            <div class="main">
                <div class="topbar">
                    <h1>Business Owners</h1>
                    <div class="user-box">
                        <span>Admin Panel</span>
                        <button id="auth-btn" title="Sign out">Sign Out</button>
                    </div>
                </div>
                <div class="content">
                    <div style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0;">Registered Businesses</h2>
                            <p style="margin: 0.5rem 0 0 0; color: #666;">Total business owners signed up in the system</p>
                        </div>
                        <button id="addUserBtn" class="btn">Add New Business</button>
                    </div>
                    <div id="businessCount" style="margin-bottom: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff;">
                        <strong id="countDisplay">Loading business count...</strong>
                    </div>
                    <div id="usersList" class="cards">
                        <!-- Business owners will be loaded here -->
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

    // Load and display users
    await loadUsers();

    // Add create user handler
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => showAddUserModal());
    }

    async function loadUsers() {
        try {
            const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
            const usersRef = collection(db, 'users');
            const usersSnapshot = await getDocs(usersRef);

            const usersList = document.getElementById('usersList');
            const countDisplay = document.getElementById('countDisplay');

            // Filter for business owners only
            const businessOwners = [];
            usersSnapshot.forEach((doc) => {
                const user = doc.data();
                // Check for both 'owner' and 'Owner' to handle inconsistencies
                if (user.role === 'owner' || user.role === 'Owner') {
                    businessOwners.push({ id: doc.id, ...user });
                }
            });

            // Update count display
            countDisplay.textContent = `${businessOwners.length} Business Owner${businessOwners.length !== 1 ? 's' : ''} Registered`;

            if (businessOwners.length === 0) {
                usersList.innerHTML = `
                    <div class="card">
                        <h3>No Business Owners Found</h3>
                        <p>No business owners have signed up yet. Encourage businesses to register!</p>
                    </div>
                `;
                return;
            }

            usersList.innerHTML = '';
            businessOwners.forEach((owner) => {
                const userCard = document.createElement('div');
                userCard.className = 'card';
                const displayName = owner.displayName || owner.name || 'Unnamed Business Owner';
                const businessName = owner.business || 'Not specified';
                const phone = owner.phone || 'Not provided';
                const status = owner.status || 'undefined';
                const createdDate = owner.createdAt ? new Date(owner.createdAt).toLocaleDateString() : 'Not provided';

                userCard.innerHTML = `
                    <h3>${displayName}</h3>
                    <div class="cardOwner">
                        <div>Email: ${owner.email}</div>
                        <div>Role: ${owner.role}</div>
                        <div>Business: ${businessName}</div>
                        <div>Phone: ${formatPhone(phone) || phone}</div>
                        <div>Status: ${status}</div>
                        <div>Created: ${createdDate}</div>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button onclick="editUser('${owner.id}')" class="btn btn-secondary">Edit</button>
                        <button onclick="toggleUserStatus('${owner.id}', '${status}')" class="btn ${status === 'active' ? 'btn-error' : 'btn-success'}">${status === 'active' ? 'Deactivate' : 'Activate'}</button>
                    </div>
                `;
                usersList.appendChild(userCard);
            });
        } catch (error) {
            console.error('Error loading business owners:', error);
            const countDisplay = document.getElementById('countDisplay');
            if (countDisplay) {
                countDisplay.textContent = 'Error loading business count';
            }
        }
    }

    function showAddUserModal() {
        const modalContent = `
            <div style="background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
                <h2>Add New Business Owner</h2>
                <form id="addUserForm">
                    <label>Business Owner Name:</label>
                    <input type="text" id="userName" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <label>Email:</label>
                    <input type="email" id="userEmail" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <label>Phone:</label>
                    <input type="tel" id="userPhone" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <label>Role:</label>
                    <select id="userRole" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="owner" selected>Business Owner</option>
                    </select>
                    
                    <label>Business Name:</label>
                    <input type="text" id="userBusiness" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                        <button type="button" onclick="closeModal(this.closest('.modal-overlay'))" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn">Add Business Owner</button>
                    </div>
                </form>
            </div>
        `;

        const modal = showModal(modalContent);

        const form = document.getElementById('addUserForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const userData = {
                displayName: document.getElementById('userName').value,
                email: document.getElementById('userEmail').value,
                phone: document.getElementById('userPhone').value,
                role: 'owner', // Always set to owner for business owners
                business: document.getElementById('userBusiness').value,
                status: 'active',
                createdAt: new Date().toISOString()
            };

            try {
                const { doc, setDoc, getDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
                // Use email as document ID for now (in real app, you'd create Firebase Auth user first)
                const userId = userData.email.replace('@', '_').replace('.', '_');
                await setDoc(doc(db, 'users', userId), userData);

                // For business owners, also create a company document with the same ID
                if (userData.role === 'owner') {
                    const companyData = {
                        name: userData.business,
                        ownerName: userData.displayName,
                        ownerEmail: userData.email,
                        ownerPhone: userData.phone,
                        ownerUid: userId,
                        createdAt: new Date().toISOString(),
                        services: [],
                        totalRevenue: 0
                    };

                    await setDoc(doc(db, 'companies', userId), companyData);
                }

                closeModal(modal);
                await loadUsers();
                alert('Business owner added successfully! Note: In a production app, this would also create a Firebase Auth account.');
            } catch (error) {
                console.error('Error adding business owner:', error);
                alert('Error adding business owner. Please try again.');
            }
        });
    }

    // Make functions globally available for onclick handlers
    window.editUser = async (userId) => {
        try {
            const { doc, getDoc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
            const userDoc = await getDoc(doc(db, 'users', userId));

            if (!userDoc.exists()) {
                alert('User not found.');
                return;
            }

            const user = userDoc.data();

            const modalContent = `
                <div style="background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
                    <h2>Edit Business Owner</h2>
                    <form id="editUserForm">
                        <label>Business Owner Name:</label>
                        <input type="text" id="editUserName" value="${user.displayName || user.name || ''}" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label>Email:</label>
                        <input type="email" id="editUserEmail" value="${user.email}" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label>Phone:</label>
                        <input type="tel" id="editUserPhone" value="${user.phone || ''}" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label>Business Name:</label>
                        <input type="text" id="editUserBusiness" value="${user.business || ''}" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label>Role:</label>
                        <select id="editUserRole" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" disabled>
                            <option value="owner" selected>Business Owner</option>
                        </select>
                        <small style="color: #666; font-style: italic;">Role cannot be changed for business owners</small>
                        
                        <label style="margin-top: 1rem; display: block;">Status:</label>
                        <select id="editUserStatus" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="active" ${(user.status === 'active' || user.status === 'Active') ? 'selected' : ''}>Active</option>
                            <option value="inactive" ${(user.status === 'inactive' || user.status === 'Inactive') ? 'selected' : ''}>Inactive</option>
                            <option value="pending" ${(user.status === 'pending' || user.status === 'Pending') ? 'selected' : ''}>Pending</option>
                        </select>
                        
                        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                            <button type="button" onclick="window.closeModal(this.closest('.modal-overlay'))" class="btn btn-secondary">Cancel</button>
                            <button type="submit" class="btn">Update Business Owner</button>
                        </div>
                    </form>
                </div>
            `;

            const modal = showModal(modalContent);

            const form = document.getElementById('editUserForm');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const updatedData = {
                    displayName: document.getElementById('editUserName').value,
                    email: document.getElementById('editUserEmail').value,
                    phone: document.getElementById('editUserPhone').value,
                    business: document.getElementById('editUserBusiness').value,
                    role: 'owner', // Always keep as owner
                    status: document.getElementById('editUserStatus').value
                };

                try {
                    const { doc, updateDoc, getDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");

                    await updateDoc(doc(db, 'users', userId), updatedData);

                    // If this is a business owner, also update their company document
                    if (updatedData.role === 'owner') {
                        const companyRef = doc(db, 'companies', userId);
                        const companyDoc = await getDoc(companyRef);

                        if (companyDoc.exists()) {
                            await updateDoc(companyRef, {
                                ownerName: updatedData.displayName,
                                ownerEmail: updatedData.email,
                                ownerPhone: updatedData.phone,
                                name: updatedData.business // Update company name to match business name
                            });
                        }
                    }

                    closeModal(modal);
                    await loadUsers();
                    alert('Business owner updated successfully!');
                } catch (error) {
                    console.error('Error updating business owner:', error);
                    alert('Error updating business owner. Please try again.');
                }
            });
        } catch (error) {
            console.error('Error loading business owner for edit:', error);
            alert('Error loading business owner details.');
        }
    };

    window.toggleUserStatus = async (userId, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
            await updateDoc(doc(db, 'users', userId), { status: newStatus });
            await loadUsers();
            alert(`Business owner ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
        } catch (error) {
            console.error('Error updating business owner status:', error);
            alert('Error updating business owner status. Please try again.');
        }
    };
}
