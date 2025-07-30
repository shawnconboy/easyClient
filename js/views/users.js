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
                    <h1>Users</h1>
                    <div class="user-box">
                        <span>Admin Panel</span>
                        <button id="auth-btn" title="Sign out">Sign Out</button>
                    </div>
                </div>
                <div class="content">
                    <div style="margin-bottom: 2rem;">
                        <button id="addUserBtn" class="btn">Add New User</button>
                    </div>
                    <div id="usersList" class="cards">
                        <!-- Users will be loaded here -->
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

            if (usersSnapshot.empty) {
                usersList.innerHTML = `
                    <div class="card">
                        <h3>No Users Found</h3>
                        <p>Start by adding users to the system.</p>
                    </div>
                `;
                return;
            }

            usersList.innerHTML = '';
            usersSnapshot.forEach((doc) => {
                const user = doc.data();
                const userCard = document.createElement('div');
                userCard.className = 'card';
                userCard.innerHTML = `
                    <h3>${user.name}</h3>
                    <div class="cardOwner">
                        <div>Email: ${user.email}</div>
                        <div>Role: ${user.role}</div>
                        <div>Phone: ${formatPhone(user.phone) || 'Not provided'}</div>
                        <div>Status: ${user.status}</div>
                        <div>Created: ${new Date(user.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button onclick="editUser('${doc.id}')" class="btn btn-secondary">Edit</button>
                        <button onclick="toggleUserStatus('${doc.id}', '${user.status}')" class="btn ${user.status === 'active' ? 'btn-error' : 'btn-success'}">${user.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                    </div>
                `;
                usersList.appendChild(userCard);
            });
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    function showAddUserModal() {
        const modalContent = `
            <div style="background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
                <h2>Add New User</h2>
                <form id="addUserForm">
                    <label>Full Name:</label>
                    <input type="text" id="userName" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <label>Email:</label>
                    <input type="email" id="userEmail" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <label>Phone:</label>
                    <input type="tel" id="userPhone" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <label>Role:</label>
                    <select id="userRole" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="client">Client</option>
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                    </select>
                    
                    <label>Business (for owners only):</label>
                    <input type="text" id="userBusiness" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                        <button type="button" onclick="closeModal(this.closest('.modal-overlay'))" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn">Add User</button>
                    </div>
                </form>
            </div>
        `;

        const modal = showModal(modalContent);

        const form = document.getElementById('addUserForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const userData = {
                name: document.getElementById('userName').value,
                email: document.getElementById('userEmail').value,
                phone: document.getElementById('userPhone').value,
                role: document.getElementById('userRole').value,
                business: document.getElementById('userBusiness').value,
                status: 'active',
                createdAt: new Date().toISOString()
            };

            try {
                const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
                // Use email as document ID for now (in real app, you'd create Firebase Auth user first)
                const userId = userData.email.replace('@', '_').replace('.', '_');
                await setDoc(doc(db, 'users', userId), userData);

                closeModal(modal);
                await loadUsers();
                alert('User added successfully! Note: In a production app, this would also create a Firebase Auth account.');
            } catch (error) {
                console.error('Error adding user:', error);
                alert('Error adding user. Please try again.');
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
                    <h2>Edit User</h2>
                    <form id="editUserForm">
                        <label>Name:</label>
                        <input type="text" id="editUserName" value="${user.displayName || ''}" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label>Email:</label>
                        <input type="email" id="editUserEmail" value="${user.email}" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label>Role:</label>
                        <select id="editUserRole" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="Owner" ${user.role === 'Owner' ? 'selected' : ''}>Owner</option>
                            <option value="Admin" ${user.role === 'Admin' ? 'selected' : ''}>Admin</option>
                            <option value="Client" ${user.role === 'Client' ? 'selected' : ''}>Client</option>
                        </select>
                        
                        <label>Status:</label>
                        <select id="editUserStatus" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="Active" ${user.status === 'Active' ? 'selected' : ''}>Active</option>
                            <option value="Inactive" ${user.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                            <option value="Pending" ${user.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        </select>
                        
                        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                            <button type="button" onclick="window.closeModal(this.closest('.modal-overlay'))" class="btn btn-secondary">Cancel</button>
                            <button type="submit" class="btn">Update User</button>
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
                    role: document.getElementById('editUserRole').value,
                    status: document.getElementById('editUserStatus').value
                };

                try {
                    await updateDoc(doc(db, 'users', userId), updatedData);
                    closeModal(modal);
                    await loadUsers();
                    alert('User updated successfully!');
                } catch (error) {
                    console.error('Error updating user:', error);
                    alert('Error updating user. Please try again.');
                }
            });
        } catch (error) {
            console.error('Error loading user for edit:', error);
            alert('Error loading user details.');
        }
    };

    window.toggleUserStatus = async (userId, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
            await updateDoc(doc(db, 'users', userId), { status: newStatus });
            await loadUsers();
            alert(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
        } catch (error) {
            console.error('Error updating user status:', error);
            alert('Error updating user status. Please try again.');
        }
    };
}
