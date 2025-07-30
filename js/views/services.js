// Services view module
import { renderSidebar } from '../sidebar.js';
import { showModal, closeModal, showConfirmModal } from '../modal.js';
import { ROLES } from '../constants.js';

export async function renderServices({ root, db, signOut, currentUser, currentRole, route }) {
    root.innerHTML = `
        <div class="container">
            ${renderSidebar(currentRole)}
            <div class="main">
                <div class="topbar">
                    <h1>My Services</h1>
                    <div class="user-box">
                        <span>${currentUser?.email}</span>
                        <button id="auth-btn" title="Sign out">Sign Out</button>
                    </div>
                </div>
                <div class="content">
                    <div style="margin-bottom: 2rem;">
                        <button id="addServiceBtn" class="btn">Add New Service</button>
                    </div>
                    <div id="servicesList" class="cards">
                        <!-- Services will be loaded here -->
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

    // Load and display services
    console.log('Current user UID:', currentUser?.uid);
    console.log('Attempting to load services...');
    await loadServices();

    // Add create service handler
    const addServiceBtn = document.getElementById('addServiceBtn');
    if (addServiceBtn) {
        addServiceBtn.addEventListener('click', () => showAddServiceModal());
    }

    async function loadServices() {
        try {
            console.log('Loading services for user:', currentUser.uid);

            const { doc, getDoc, collection, getDocs, addDoc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");

            // First, try to load services from the subcollection
            const servicesRef = collection(db, 'companies', currentUser.uid, 'services');
            let querySnapshot = await getDocs(servicesRef);

            console.log('Services in subcollection:', querySnapshot.size, 'services found');

            // If no services in subcollection, check the old format in company doc
            if (querySnapshot.empty) {
                console.log('No services in subcollection, checking company document...');
                const companyRef = doc(db, 'companies', currentUser.uid);
                const companyDoc = await getDoc(companyRef);

                if (companyDoc.exists()) {
                    const companyData = companyDoc.data();
                    console.log('Company data:', companyData);

                    // Check if there are services in the old array format
                    if (companyData.services && Array.isArray(companyData.services) && companyData.services.length > 0) {
                        console.log('Found services in old array format:', companyData.services);

                        // Migrate services to new subcollection format
                        const servicesCollectionRef = collection(db, 'companies', currentUser.uid, 'services');

                        for (const service of companyData.services) {
                            let serviceData;

                            // Handle different service formats
                            if (typeof service === 'string') {
                                // Simple string format
                                serviceData = {
                                    name: service,
                                    description: '',
                                    price: 0,
                                    duration: 60,
                                    createdAt: new Date().toISOString(),
                                    active: true
                                };
                            } else if (typeof service === 'object') {
                                // Object format
                                serviceData = {
                                    name: service.name || service.serviceName || 'Unnamed Service',
                                    description: service.description || '',
                                    price: Number(service.price) || 0,
                                    duration: Number(service.duration) || 60,
                                    createdAt: service.createdAt || new Date().toISOString(),
                                    active: service.active !== false
                                };
                            } else {
                                // Fallback
                                serviceData = {
                                    name: String(service),
                                    description: '',
                                    price: 0,
                                    duration: 60,
                                    createdAt: new Date().toISOString(),
                                    active: true
                                };
                            }

                            console.log('Migrating service:', serviceData);
                            await addDoc(servicesCollectionRef, serviceData);
                        }

                        console.log('Migration complete, clearing old services array');
                        // Clear the old services array
                        await updateDoc(companyRef, { services: [] });

                        // Reload services from subcollection after migration
                        querySnapshot = await getDocs(servicesRef);
                        console.log('After migration, services in subcollection:', querySnapshot.size);
                    }
                }
            }

            const servicesList = document.getElementById('servicesList');

            if (querySnapshot.empty) {
                console.log('No services found, showing empty state');
                servicesList.innerHTML = `
                    <div class="card">
                        <h3>No Services Yet</h3>
                        <p>Add your first service to start offering it to clients.</p>
                        <button onclick="document.getElementById('addServiceBtn').click()" class="btn">Add Service</button>
                    </div>
                `;
                return;
            }

            console.log('Building services list...');
            servicesList.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const service = doc.data();
                console.log('Processing service:', service.name, service);
                const serviceCard = document.createElement('div');
                serviceCard.className = 'card';
                serviceCard.innerHTML = `
                    <h3>${service.name}</h3>
                    <div class="cardOwner">
                        <div><strong>Price:</strong> $${Number(service.price).toFixed(2)}</div>
                        <div><strong>Duration:</strong> ${service.duration} minutes</div>
                        ${service.description ? `<div><strong>Description:</strong> ${service.description}</div>` : ''}
                        <div><strong>Status:</strong> <span style="color: ${service.active ? '#28a745' : '#dc3545'};">${service.active ? 'Active' : 'Inactive'}</span></div>
                        <div><strong>Created:</strong> ${new Date(service.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button onclick="window.toggleServiceStatus('${doc.id}', ${service.active})" class="btn ${service.active ? 'btn-secondary' : 'btn-success'}">${service.active ? 'Deactivate' : 'Activate'}</button>
                        <button onclick="window.editService('${doc.id}')" class="btn btn-secondary">Edit</button>
                        <button onclick="window.deleteService('${doc.id}')" class="btn btn-error">Delete</button>
                    </div>
                `;
                servicesList.appendChild(serviceCard);
            });
            console.log('Services list built successfully with', querySnapshot.size, 'services');
        } catch (error) {
            console.error('Error loading services:', error);
            const servicesList = document.getElementById('servicesList');
            if (servicesList) {
                servicesList.innerHTML = `
                    <div class="card">
                        <h3>Error Loading Services</h3>
                        <p>There was an error loading your services. Please try refreshing the page.</p>
                        <div style="color: red; font-size: 0.9rem; margin-top: 1rem;">Error: ${error.message}</div>
                    </div>
                `;
            }
        }
    }

    function showAddServiceModal() {
        const modalContent = `
            <div style="background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
                <h2>Add New Service</h2>
                <form id="addServiceForm">
                    <label>Service Name:</label>
                    <input type="text" id="serviceName" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" placeholder="e.g., Lawn Mowing, House Cleaning">
                    
                    <label>Description:</label>
                    <textarea id="serviceDescription" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; resize: vertical;" rows="3" placeholder="Brief description of what this service includes"></textarea>
                    
                    <label>Price ($):</label>
                    <input type="number" id="servicePrice" step="0.01" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" placeholder="0.00">
                    
                    <label>Duration (minutes):</label>
                    <input type="number" id="serviceDuration" value="60" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <label style="display: flex; align-items: center; margin-bottom: 1rem; cursor: pointer;">
                        <input type="checkbox" id="serviceActive" checked style="margin-right: 0.5rem;">
                        Service is active (available for booking)
                    </label>
                    
                    <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">\n                        <button type="button" onclick="window.closeModal(this.closest('.modal-overlay'))" class="btn btn-secondary">Cancel</button>\n                        <button type="submit" class="btn">Add Service</button>\n                    </div>
                </form>
            </div>
        `;

        const modal = showModal(modalContent);

        const form = document.getElementById('addServiceForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const serviceData = {
                name: document.getElementById('serviceName').value,
                description: document.getElementById('serviceDescription').value,
                price: parseFloat(document.getElementById('servicePrice').value),
                duration: parseInt(document.getElementById('serviceDuration').value),
                active: document.getElementById('serviceActive').checked,
                createdAt: new Date().toISOString()
            };

            try {
                const { addDoc, collection } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
                await addDoc(collection(db, 'companies', currentUser.uid, 'services'), serviceData);

                closeModal(modal);
                await loadServices();
                alert('Service added successfully!');
            } catch (error) {
                console.error('Error adding service:', error);
                alert('Error adding service. Please try again.');
            }
        });
    }

    // Make functions globally available for onclick handlers
    window.editService = async (serviceId) => {
        try {
            const { doc, getDoc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
            const serviceDoc = await getDoc(doc(db, 'companies', currentUser.uid, 'services', serviceId));

            if (!serviceDoc.exists()) {
                alert('Service not found.');
                return;
            }

            const service = serviceDoc.data();

            const modalContent = `
                <div style="background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
                    <h2>Edit Service</h2>
                    <form id="editServiceForm">
                        <label>Service Name:</label>
                        <input type="text" id="editServiceName" value="${service.name}" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label>Description:</label>
                        <textarea id="editServiceDescription" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; resize: vertical;" rows="3">${service.description || ''}</textarea>
                        
                        <label>Price ($):</label>
                        <input type="number" id="editServicePrice" value="${service.price}" step="0.01" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label>Duration (minutes):</label>
                        <input type="number" id="editServiceDuration" value="${service.duration}" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label style="display: flex; align-items: center; margin-bottom: 1rem; cursor: pointer;">
                            <input type="checkbox" id="editServiceActive" ${service.active ? 'checked' : ''} style="margin-right: 0.5rem;">
                            Service is active (available for booking)
                        </label>
                        
                        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">\n                            <button type="button" onclick="window.closeModal(this.closest('.modal-overlay'))" class="btn btn-secondary">Cancel</button>\n                            <button type="submit" class="btn">Update Service</button>\n                        </div>
                    </form>
                </div>
            `;

            const modal = showModal(modalContent);

            const form = document.getElementById('editServiceForm');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const updatedData = {
                    name: document.getElementById('editServiceName').value,
                    description: document.getElementById('editServiceDescription').value,
                    price: parseFloat(document.getElementById('editServicePrice').value),
                    duration: parseInt(document.getElementById('editServiceDuration').value),
                    active: document.getElementById('editServiceActive').checked,
                    updatedAt: new Date().toISOString()
                };

                try {
                    await updateDoc(doc(db, 'companies', currentUser.uid, 'services', serviceId), updatedData);
                    closeModal(modal);
                    await loadServices();
                    alert('Service updated successfully!');
                } catch (error) {
                    console.error('Error updating service:', error);
                    alert('Error updating service. Please try again.');
                }
            });
        } catch (error) {
            console.error('Error loading service for edit:', error);
            alert('Error loading service details.');
        }
    };

    window.deleteService = async (serviceId) => {
        showConfirmModal({
            title: 'Delete Service',
            message: 'Are you sure you want to delete this service? This action cannot be undone.',
            confirmText: 'Delete Service',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
                    await deleteDoc(doc(db, 'companies', currentUser.uid, 'services', serviceId));
                    await loadServices();
                    alert('Service deleted successfully!');
                } catch (error) {
                    console.error('Error deleting service:', error);
                    alert('Error deleting service. Please try again.');
                }
            }
        });
    };

    // Toggle service active/inactive status
    window.toggleServiceStatus = async (serviceId, currentStatus) => {
        try {
            const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
            const newStatus = !currentStatus;

            await updateDoc(doc(db, 'companies', currentUser.uid, 'services', serviceId), {
                active: newStatus,
                updatedAt: new Date().toISOString()
            });

            await loadServices();
            alert(`Service ${newStatus ? 'activated' : 'deactivated'} successfully!`);
        } catch (error) {
            console.error('Error updating service status:', error);
            alert('Error updating service status. Please try again.');
        }
    };
}
