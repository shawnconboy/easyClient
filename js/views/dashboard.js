// Dashboard view module
import { renderSidebar } from '../sidebar.js';
import { ROLES } from '../constants.js';

export async function renderDashboard({ root, db, signOut, currentUser, currentRole, formatPhone, route }) {
    root.innerHTML = `
        <div class="container">
            ${renderSidebar(currentRole)}
            <div class="main">
                <div class="topbar">
                    <h1>Dashboard</h1>
                    <div class="user-box">
                        <span>${currentUser?.email}</span>
                        <button id="auth-btn" title="Sign out">Sign Out</button>
                    </div>
                </div>
                <div class="content">
                    <div class="cards">
                        <div class="card">
                            <h3>Welcome Back!</h3>
                            <p>Your CRM and booking management system is ready to go!</p>
                            <div class="cardOwner">
                                <div>User: ${currentUser?.email}</div>
                                <div>Role: ${currentRole}</div>
                                <div>Last Login: ${new Date().toLocaleDateString()}</div>
                            </div>
                        </div>
                        
                        <div class="card" id="statsCard">
                            <h3>Quick Stats</h3>
                            <div class="cardOwner" id="statsContent">
                                <div>Loading statistics...</div>
                            </div>
                        </div>
                        
                        <div class="card">
                            <h3>Quick Actions</h3>
                            <div style="display: flex; flex-direction: column; gap: 1rem;">
                                ${currentRole === ROLES.OWNER ? `
                                    <button onclick="window.route('/clients')" class="btn">Manage Clients</button>
                                    <button onclick="window.route('/bookings')" class="btn">View Bookings</button>
                                    <button onclick="window.route('/companies')" class="btn">Company Settings</button>
                                    <button onclick="manageMyServices()" class="btn">Manage Services</button>
                                ` : ''}
                                ${currentRole === ROLES.ADMIN ? `
                                    <button onclick="window.route('/companies')" class="btn">Manage Companies</button>
                                    <button onclick="window.route('/users')" class="btn">Manage Users</button>
                                    <button onclick="manageAllServices()" class="btn">Manage All Services</button>
                                ` : ''}
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

    // Load and display statistics
    await loadDashboardStats();

    async function loadDashboardStats() {
        try {
            const { collection, getDocs, query, where } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");

            let stats = {
                companies: 0,
                clients: 0,
                bookings: 0,
                revenue: 0,
                users: 0
            };

            if (currentRole === ROLES.ADMIN) {
                // Admin sees all system stats
                const companiesSnapshot = await getDocs(collection(db, 'companies'));
                stats.companies = companiesSnapshot.size;

                const usersSnapshot = await getDocs(collection(db, 'users'));
                stats.users = usersSnapshot.size;

                // Count all clients across all companies
                for (const companyDoc of companiesSnapshot.docs) {
                    const clientsSnapshot = await getDocs(collection(db, 'companies', companyDoc.id, 'clients'));
                    stats.clients += clientsSnapshot.size;

                    const bookingsSnapshot = await getDocs(collection(db, 'companies', companyDoc.id, 'bookings'));
                    stats.bookings += bookingsSnapshot.size;

                    // Calculate revenue
                    bookingsSnapshot.forEach((bookingDoc) => {
                        const booking = bookingDoc.data();
                        if (booking.status === 'completed') {
                            stats.revenue += booking.price || 0;
                        }
                    });
                }
            } else if (currentRole === ROLES.OWNER) {
                // Owner sees their company stats
                const companiesSnapshot = await getDocs(collection(db, 'companies'));
                let userCompanyId = null;

                companiesSnapshot.forEach((doc) => {
                    const company = doc.data();
                    if (company.ownerUid === currentUser?.uid) {
                        userCompanyId = doc.id;
                        stats.companies = 1;
                    }
                });

                if (userCompanyId) {
                    const clientsSnapshot = await getDocs(collection(db, 'companies', userCompanyId, 'clients'));
                    stats.clients = clientsSnapshot.size;

                    const bookingsSnapshot = await getDocs(collection(db, 'companies', userCompanyId, 'bookings'));
                    stats.bookings = bookingsSnapshot.size;

                    // Calculate revenue
                    bookingsSnapshot.forEach((bookingDoc) => {
                        const booking = bookingDoc.data();
                        if (booking.status === 'completed') {
                            stats.revenue += booking.price || 0;
                        }
                    });
                }
            }

            // Update the stats display
            const statsContent = document.getElementById('statsContent');
            if (statsContent) {
                if (currentRole === ROLES.ADMIN) {
                    statsContent.innerHTML = `
                        <div>Total Companies: ${stats.companies}</div>
                        <div>Total Users: ${stats.users}</div>
                        <div>Total Clients: ${stats.clients}</div>
                        <div>Total Bookings: ${stats.bookings}</div>
                        <div>Total Revenue: $${stats.revenue.toFixed(2)}</div>
                    `;
                } else {
                    statsContent.innerHTML = `
                        <div>My Companies: ${stats.companies}</div>
                        <div>My Clients: ${stats.clients}</div>
                        <div>My Bookings: ${stats.bookings}</div>
                        <div>My Revenue: $${stats.revenue.toFixed(2)}</div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            const statsContent = document.getElementById('statsContent');
            if (statsContent) {
                statsContent.innerHTML = '<div>Error loading statistics</div>';
            }
        }
    }

    // Make services management function globally available
    window.manageMyServices = async () => {
        try {
            const { collection, getDocs, addDoc, doc, deleteDoc, getDoc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
            const { showModal, closeModal, showConfirmModal } = await import('../modal.js');

            // Get the current user's company ID (should be their UID)
            const companyId = currentUser.uid;

            // Load existing services from subcollection
            const servicesRef = collection(db, 'companies', companyId, 'services');
            let servicesSnapshot = await getDocs(servicesRef);

            // If no services in subcollection, check and migrate from old format
            if (servicesSnapshot.empty) {
                console.log('No services in subcollection, checking company document for migration...');
                const companyRef = doc(db, 'companies', companyId);
                const companyDoc = await getDoc(companyRef);

                if (companyDoc.exists()) {
                    const companyData = companyDoc.data();

                    // Check if there are services in the old array format
                    if (companyData.services && Array.isArray(companyData.services) && companyData.services.length > 0) {
                        console.log('Migrating services from old format...');

                        // Migrate services to new subcollection format
                        for (const service of companyData.services) {
                            let serviceData;

                            // Handle different service formats
                            if (typeof service === 'string') {
                                serviceData = {
                                    name: service,
                                    description: '',
                                    price: 0,
                                    duration: 60,
                                    createdAt: new Date().toISOString(),
                                    active: true
                                };
                            } else if (typeof service === 'object') {
                                serviceData = {
                                    name: service.name || service.serviceName || 'Unnamed Service',
                                    description: service.description || '',
                                    price: Number(service.price) || 0,
                                    duration: Number(service.duration) || 60,
                                    createdAt: service.createdAt || new Date().toISOString(),
                                    active: service.active !== false
                                };
                            } else {
                                serviceData = {
                                    name: String(service),
                                    description: '',
                                    price: 0,
                                    duration: 60,
                                    createdAt: new Date().toISOString(),
                                    active: true
                                };
                            }

                            await addDoc(servicesRef, serviceData);
                        }

                        // Clear the old services array
                        await updateDoc(companyRef, { services: [] });

                        // Reload services after migration
                        servicesSnapshot = await getDocs(servicesRef);
                    }
                }
            }

            let servicesHtml = '';
            if (!servicesSnapshot.empty) {
                servicesSnapshot.forEach((serviceDoc) => {
                    const service = serviceDoc.data();
                    servicesHtml += `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border: 1px solid #eee; margin-bottom: 0.5rem; border-radius: 4px;">
                            <div style="flex: 1;">
                                <strong>${service.name}</strong> - $${Number(service.price).toFixed(2)} (${service.duration} min)
                                ${service.description ? `<br><small style="color: #666;">${service.description}</small>` : ''}
                                <br><small style="color: ${service.active ? '#28a745' : '#dc3545'};">Status: ${service.active ? 'Active' : 'Inactive'}</small>
                            </div>
                            <div style="display: flex; gap: 0.5rem; margin-left: 1rem;">
                                <button onclick="window.toggleMyServiceStatus('${companyId}', '${serviceDoc.id}', ${service.active})" style="background: ${service.active ? '#6c757d' : '#28a745'}; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">${service.active ? 'Deactivate' : 'Activate'}</button>
                                <button onclick="window.deleteMyService('${companyId}', '${serviceDoc.id}')" style="background: #dc3545; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer;">Delete</button>
                            </div>
                        </div>
                    `;
                });
            }

            if (!servicesHtml) {
                servicesHtml = '<p style="color: #666; font-style: italic;">No services created yet. Add your first service below!</p>';
            }

            const modalContent = `
                <div style="background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto;">
                    <h2>Manage My Services</h2>
                    
                    <div style="margin-bottom: 2rem;">
                        <h3>Your Services</h3>
                        <div id="servicesList">
                            ${servicesHtml}
                        </div>
                    </div>
                    
                    <div style="border-top: 1px solid #eee; padding-top: 2rem;">
                        <h3>Add New Service</h3>
                        <form id="addServiceForm">
                            <label>Service Name:</label>
                            <input type="text" id="serviceName" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" placeholder="e.g., Lawn Mowing, House Cleaning">
                            
                            <label>Description:</label>
                            <textarea id="serviceDescription" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; resize: vertical;" rows="2" placeholder="Brief description of the service"></textarea>
                            
                            <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                                <div style="flex: 1;">
                                    <label>Price ($):</label>
                                    <input type="number" id="servicePrice" step="0.01" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" placeholder="0.00">
                                </div>
                                <div style="flex: 1;">
                                    <label>Duration (minutes):</label>
                                    <input type="number" id="serviceDuration" value="60" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                                </div>
                            </div>
                            
                            <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                                <button type="submit" class="btn">Add Service</button>
                            </div>
                        </form>
                    </div>
                    
                    <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem; border-top: 1px solid #eee; padding-top: 1rem;">
                        <button type="button" onclick="window.closeModal(this.closest('.modal-overlay'))" class="btn btn-secondary">Close</button>
                    </div>
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
                    createdAt: new Date().toISOString()
                };

                try {
                    await addDoc(collection(db, 'companies', companyId, 'services'), serviceData);
                    closeModal(modal);
                    window.manageMyServices(); // Reload the modal with updated services
                    alert('Service added successfully!');
                } catch (error) {
                    console.error('Error adding service:', error);
                    alert('Error adding service. Please try again.');
                }
            });
        } catch (error) {
            console.error('Error loading services:', error);
            alert('Error loading services.');
        }
    };

    window.deleteMyService = async (companyId, serviceId) => {
        const { showConfirmModal } = await import('../modal.js');
        showConfirmModal({
            title: 'Delete Service',
            message: 'Are you sure you want to delete this service? This action cannot be undone.',
            confirmText: 'Delete Service',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
                    await deleteDoc(doc(db, 'companies', companyId, 'services', serviceId));
                    window.manageMyServices(); // Reload the modal
                    alert('Service deleted successfully!');
                } catch (error) {
                    console.error('Error deleting service:', error);
                    alert('Error deleting service. Please try again.');
                }
            }
        });
    };

    // Toggle service status in dashboard
    window.toggleMyServiceStatus = async (companyId, serviceId, currentStatus) => {
        try {
            const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
            const newStatus = !currentStatus;

            await updateDoc(doc(db, 'companies', companyId, 'services', serviceId), {
                active: newStatus,
                updatedAt: new Date().toISOString()
            });

            window.manageMyServices(); // Reload the modal
            alert(`Service ${newStatus ? 'activated' : 'deactivated'} successfully!`);
        } catch (error) {
            console.error('Error updating service status:', error);
            alert('Error updating service status. Please try again.');
        }
    };

    // Admin function to manage all services across all companies
    window.manageAllServices = async () => {
        try {
            const { collection, getDocs, doc, updateDoc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
            const { showModal, closeModal, showConfirmModal } = await import('../modal.js');

            // Get all companies and their services
            const companiesRef = collection(db, 'companies');
            const companiesSnapshot = await getDocs(companiesRef);

            let allServicesHtml = '';
            const servicesData = []; // Store service data for actions

            for (const companyDoc of companiesSnapshot.docs) {
                const company = companyDoc.data();
                const companyId = companyDoc.id;

                // Get services for this company
                const servicesRef = collection(db, 'companies', companyId, 'services');
                const servicesSnapshot = await getDocs(servicesRef);

                if (!servicesSnapshot.empty) {
                    allServicesHtml += `
                        <div style="margin-bottom: 2rem; padding: 1rem; border: 2px solid #e9ecef; border-radius: 8px; background: #f8f9fa;">
                            <h3 style="margin: 0 0 1rem 0; color: #495057;">${company.name} (${company.ownerName})</h3>
                    `;

                    servicesSnapshot.forEach((serviceDoc) => {
                        const service = serviceDoc.data();
                        const serviceId = serviceDoc.id;

                        // Store service data for actions
                        servicesData.push({
                            companyId,
                            serviceId,
                            companyName: company.name
                        });

                        allServicesHtml += `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border: 1px solid #dee2e6; margin-bottom: 0.5rem; border-radius: 4px; background: white;">
                                <div style="flex: 1;">
                                    <strong>${service.name}</strong> - $${Number(service.price).toFixed(2)} (${service.duration} min)
                                    ${service.description ? `<br><small style="color: #666;">${service.description}</small>` : ''}
                                    <br><small style="color: ${service.active ? '#28a745' : '#dc3545'};">Status: ${service.active ? 'Active' : 'Inactive'}</small>
                                </div>
                                <div style="display: flex; gap: 0.5rem; margin-left: 1rem;">
                                    <button onclick="window.toggleAdminServiceStatus('${companyId}', '${serviceId}', ${service.active})" style="background: ${service.active ? '#6c757d' : '#28a745'}; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">${service.active ? 'Deactivate' : 'Activate'}</button>
                                    <button onclick="window.deleteAdminService('${companyId}', '${serviceId}', '${company.name}')" style="background: #dc3545; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer;">Delete</button>
                                </div>
                            </div>
                        `;
                    });

                    allServicesHtml += '</div>';
                }
            }

            if (!allServicesHtml) {
                allServicesHtml = '<p style="color: #666; font-style: italic; text-align: center; padding: 2rem;">No services found across all companies.</p>';
            }

            const modalContent = `
                <div style="background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 800px; max-height: 90vh; overflow-y: auto;">
                    <h2>Manage All Services (Admin)</h2>
                    <p style="color: #666; margin-bottom: 2rem;">Managing services across all companies in the system.</p>
                    
                    <div style="max-height: 60vh; overflow-y: auto;">
                        ${allServicesHtml}
                    </div>
                    
                    <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem; border-top: 1px solid #eee; padding-top: 1rem;">
                        <button type="button" onclick="window.closeModal(this.closest('.modal-overlay'))" class="btn btn-secondary">Close</button>
                    </div>
                </div>
            `;

            showModal(modalContent);

        } catch (error) {
            console.error('Error loading all services:', error);
            alert('Error loading services. Please try again.');
        }
    };

    // Admin function to toggle any service status
    window.toggleAdminServiceStatus = async (companyId, serviceId, currentStatus) => {
        try {
            const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
            const newStatus = !currentStatus;

            await updateDoc(doc(db, 'companies', companyId, 'services', serviceId), {
                active: newStatus,
                updatedAt: new Date().toISOString()
            });

            window.manageAllServices(); // Reload the modal
            alert(`Service ${newStatus ? 'activated' : 'deactivated'} successfully!`);
        } catch (error) {
            console.error('Error updating service status:', error);
            alert('Error updating service status. Please try again.');
        }
    };

    // Admin function to delete any service
    window.deleteAdminService = async (companyId, serviceId, companyName) => {
        const { showConfirmModal } = await import('../modal.js');

        showConfirmModal({
            title: 'Delete Service',
            message: `Are you sure you want to delete this service from ${companyName}? This action cannot be undone.`,
            confirmText: 'Delete Service',
            cancelText: 'Cancel',
            confirmStyle: 'btn btn-error',
            onConfirm: async () => {
                try {
                    const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
                    await deleteDoc(doc(db, 'companies', companyId, 'services', serviceId));
                    window.manageAllServices(); // Reload the modal
                    alert('Service deleted successfully!');
                } catch (error) {
                    console.error('Error deleting service:', error);
                    alert('Error deleting service. Please try again.');
                }
            }
        });
    };
}
