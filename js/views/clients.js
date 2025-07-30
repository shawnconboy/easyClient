// Clients view module
import { renderSidebar } from '../sidebar.js';
import { ROLES } from '../constants.js';
import { showModal, closeModal, showConfirmModal } from '../modal.js';
import { formatPhone } from '../utils.js';

export async function renderClients({ root, companyId, db, signOut, hasPermission, addDoc, getDocs, formatPhone, generateId, route, currentUser }) {
    root.innerHTML = `
        <div class="container">
            ${renderSidebar(ROLES.OWNER)}
            <div class="main">
                <div class="topbar">
                    <h1>Clients</h1>
                    <div class="user-box">
                        <span>Client Management</span>
                        <button id="auth-btn" title="Sign out">Sign Out</button>
                    </div>
                </div>
                <div class="content">
                    <div style="margin-bottom: 2rem;">
                        <button id="addClientBtn" class="btn">Add New Client</button>
                    </div>
                    <div id="clientsList" class="cards">
                        <!-- Clients will be loaded here -->
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

    // Load and display clients
    await loadClients();

    // Add create client handler
    const addClientBtn = document.getElementById('addClientBtn');
    if (addClientBtn) {
        addClientBtn.addEventListener('click', () => showAddClientModal());
    }

    async function loadClients() {
        try {
            const { collection, getDocs, query, where } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");

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
                document.getElementById('clientsList').innerHTML = `
                    <div class="card">
                        <h3>No Company Found</h3>
                        <p>Please create a company first before adding clients.</p>
                        <button onclick="window.route('/companies')" class="btn">Go to Companies</button>
                    </div>
                `;
                return;
            }

            const clientsRef = collection(db, 'companies', userCompanyId, 'clients');
            const clientsSnapshot = await getDocs(clientsRef);

            const clientsList = document.getElementById('clientsList');

            if (clientsSnapshot.empty) {
                clientsList.innerHTML = `
                    <div class="card">
                        <h3>No Clients Yet</h3>
                        <p>Add your first client to get started.</p>
                    </div>
                `;
                return;
            }

            clientsList.innerHTML = '';
            clientsSnapshot.forEach((doc) => {
                const client = doc.data();
                const clientCard = document.createElement('div');
                clientCard.className = 'card';
                clientCard.innerHTML = `
                    <h3>${client.name}</h3>
                    <div class="cardOwner">
                        <div>Email: ${client.email}</div>
                        <div>Phone: ${formatPhone(client.phone)}</div>
                        <div>Address: ${client.address?.street || 'Not provided'}</div>
                        <div>Status: ${client.status || 'active'}</div>
                        <div>Total Bookings: ${client.totalBookings || 0}</div>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button onclick="editClient('${userCompanyId}', '${doc.id}')" class="btn btn-secondary">Edit</button>
                        <button onclick="deleteClient('${userCompanyId}', '${doc.id}')" class="btn btn-error">Delete</button>
                    </div>
                `;
                clientsList.appendChild(clientCard);
            });
        } catch (error) {
            console.error('Error loading clients:', error);
        }
    }

    function showAddClientModal() {
        const modalContent = `
            <div style="background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
                <h2>Add New Client</h2>
                <form id="addClientForm">
                    <label>Client Name:</label>
                    <input type="text" id="clientName" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <label>Email:</label>
                    <input type="email" id="clientEmail" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <label>Phone:</label>
                    <input type="tel" id="clientPhone" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <label>Street Address:</label>
                    <input type="text" id="clientStreet" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <label>City:</label>
                    <input type="text" id="clientCity" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <label>State:</label>
                    <input type="text" id="clientState" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <label>Zip Code:</label>
                    <input type="text" id="clientZip" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <label>Notes:</label>
                    <textarea id="clientNotes" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; resize: vertical;"></textarea>
                    
                    <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                        <button type="button" onclick="closeModal(this.closest('.modal-overlay'))" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn">Add Client</button>
                    </div>
                </form>
            </div>
        `;

        const modal = showModal(modalContent);

        const form = document.getElementById('addClientForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            try {
                // Get user's company
                const { collection, getDocs, addDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");

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

                const clientData = {
                    name: document.getElementById('clientName').value,
                    email: document.getElementById('clientEmail').value,
                    phone: document.getElementById('clientPhone').value,
                    address: {
                        street: document.getElementById('clientStreet').value,
                        city: document.getElementById('clientCity').value,
                        state: document.getElementById('clientState').value,
                        zipCode: document.getElementById('clientZip').value
                    },
                    notes: document.getElementById('clientNotes').value,
                    status: 'active',
                    totalBookings: 0,
                    createdAt: new Date().toISOString()
                };

                const clientsRef = collection(db, 'companies', userCompanyId, 'clients');
                await addDoc(clientsRef, clientData);

                closeModal(modal);
                await loadClients();
                alert('Client added successfully!');
            } catch (error) {
                console.error('Error adding client:', error);
                alert('Error adding client. Please try again.');
            }
        });
    }

    // Make functions globally available for onclick handlers
    window.editClient = async (companyId, clientId) => {
        try {
            const { doc, getDoc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
            const clientDoc = await getDoc(doc(db, 'companies', companyId, 'clients', clientId));

            if (!clientDoc.exists()) {
                alert('Client not found.');
                return;
            }

            const client = clientDoc.data();

            const modalContent = `
                <div style="background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
                    <h2>Edit Client</h2>
                    <form id="editClientForm">
                        <label>Client Name:</label>
                        <input type="text" id="editClientName" value="${client.name}" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label>Email:</label>
                        <input type="email" id="editClientEmail" value="${client.email}" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label>Phone:</label>
                        <input type="tel" id="editClientPhone" value="${client.phone || ''}" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label>Street Address:</label>
                        <input type="text" id="editClientStreet" value="${client.address?.street || ''}" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label>City:</label>
                        <input type="text" id="editClientCity" value="${client.address?.city || ''}" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label>State:</label>
                        <input type="text" id="editClientState" value="${client.address?.state || ''}" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label>Zip Code:</label>
                        <input type="text" id="editClientZip" value="${client.address?.zipCode || ''}" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label>Notes:</label>
                        <textarea id="editClientNotes" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; resize: vertical;">${client.notes || ''}</textarea>
                        
                        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                            <button type="button" onclick="window.closeModal(this.closest('.modal-overlay'))" class="btn btn-secondary">Cancel</button>
                            <button type="submit" class="btn">Update Client</button>
                        </div>
                    </form>
                </div>
            `;

            const modal = showModal(modalContent);

            const form = document.getElementById('editClientForm');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const updatedData = {
                    name: document.getElementById('editClientName').value,
                    email: document.getElementById('editClientEmail').value,
                    phone: document.getElementById('editClientPhone').value,
                    address: {
                        street: document.getElementById('editClientStreet').value,
                        city: document.getElementById('editClientCity').value,
                        state: document.getElementById('editClientState').value,
                        zipCode: document.getElementById('editClientZip').value
                    },
                    notes: document.getElementById('editClientNotes').value
                };

                try {
                    await updateDoc(doc(db, 'companies', companyId, 'clients', clientId), updatedData);
                    closeModal(modal);
                    await loadClients();
                    alert('Client updated successfully!');
                } catch (error) {
                    console.error('Error updating client:', error);
                    alert('Error updating client. Please try again.');
                }
            });
        } catch (error) {
            console.error('Error loading client for edit:', error);
            alert('Error loading client details.');
        }
    };

    window.deleteClient = async (companyId, clientId) => {
        showConfirmModal({
            title: 'Delete Client',
            message: 'Are you sure you want to delete this client? This will also delete all associated bookings and history. This action cannot be undone.',
            confirmText: 'Delete Client',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
                    await deleteDoc(doc(db, 'companies', companyId, 'clients', clientId));
                    await loadClients();
                    alert('Client deleted successfully!');
                } catch (error) {
                    console.error('Error deleting client:', error);
                    alert('Error deleting client. Please try again.');
                }
            }
        });
    };
}
