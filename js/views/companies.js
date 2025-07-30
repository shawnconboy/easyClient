// Companies view module
import { renderSidebar } from '../sidebar.js';
import { showModal, closeModal, showConfirmModal } from '../modal.js';
import { generateId } from '../utils.js';

export async function renderCompanies({ root, currentRole, currentUser, db, signOut, route }) {
    root.innerHTML = `
        <div class="container">
            ${renderSidebar(currentRole)}
            <div class="main">
                <div class="topbar">
                    <h1>Companies</h1>
                    <div class="user-box">
                        <span>${currentUser?.displayName || currentUser?.name || currentUser?.email}</span>
                        <button id="auth-btn" title="Sign out">Sign Out</button>
                    </div>
                </div>
                <div class="content">
                    <div style="margin-bottom: 2rem;">
                        <button id="createCompanyBtn" class="btn">Create New Company</button>
                    </div>
                    <div id="companiesList" class="cards">
                        <!-- Companies will be loaded here -->
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

    // Load and display companies
    await loadCompanies();

    // Add create company handler
    const createBtn = document.getElementById('createCompanyBtn');
    if (createBtn) {
        createBtn.addEventListener('click', () => showCreateCompanyModal());
    }

    async function loadCompanies() {
        try {
            const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
            const companiesRef = collection(db, 'companies');
            const querySnapshot = await getDocs(companiesRef);

            const companiesList = document.getElementById('companiesList');

            if (querySnapshot.empty) {
                companiesList.innerHTML = `
                    <div class="card">
                        <h3>No Companies Yet</h3>
                        <p>Create your first company to get started.</p>
                    </div>
                `;
                return;
            }

            companiesList.innerHTML = '';

            // Load companies and their service counts
            for (const companyDocSnapshot of querySnapshot.docs) {
                const company = companyDocSnapshot.data();
                const companyId = companyDocSnapshot.id;

                // Load service count from subcollection
                const servicesRef = collection(db, 'companies', companyId, 'services');
                const servicesSnapshot = await getDocs(servicesRef);
                const serviceCount = servicesSnapshot.size;

                const companyCard = document.createElement('div');
                companyCard.className = 'card';
                companyCard.innerHTML = `
                    <h3>${company.name}</h3>
                    <div class="cardOwner">
                        <div>Owner: ${company.ownerName}</div>
                        <div>Email: ${company.ownerEmail}</div>
                        <div>Phone: ${company.ownerPhone || 'Not provided'}</div>
                        <div>Services: ${serviceCount}</div>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem; flex-wrap: wrap;">
                        <button onclick="editCompany('${companyId}')" class="btn btn-secondary">Edit</button>
                        <button onclick="manageServices('${companyId}')" class="btn">Manage Services</button>
                        <button onclick="getBookingUrl('${companyId}', '${company.name}')" class="btn" style="background: #28a745;">Booking URL</button>
                        <button onclick="deleteCompany('${companyId}')" class="btn btn-error">Delete</button>
                    </div>
                `;
                companiesList.appendChild(companyCard);
            }
        } catch (error) {
            console.error('Error loading companies:', error);
        }
    }

    function showCreateCompanyModal() {
        const modalContent = `
            <div style="background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
                <h2>Create New Company</h2>
                <form id="createCompanyForm">
                    <label>Company Name:</label>
                    <input type="text" id="companyName" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <label>Owner Name:</label>
                    <input type="text" id="ownerName" value="${currentUser?.displayName || currentUser?.name || ''}" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <label>Owner Email:</label>
                    <input type="email" id="ownerEmail" value="${currentUser?.email || ''}" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <label>Owner Phone:</label>
                    <input type="tel" id="ownerPhone" value="${currentUser?.phone || ''}" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    
                    <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                        <button type="button" onclick="window.closeModal(this.closest('.modal-overlay'))" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn">Create Company</button>
                    </div>
                </form>
            </div>
        `;

        const modal = showModal(modalContent);

        const form = document.getElementById('createCompanyForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const companyData = {
                name: document.getElementById('companyName').value,
                ownerName: document.getElementById('ownerName').value,
                ownerEmail: document.getElementById('ownerEmail').value,
                ownerPhone: document.getElementById('ownerPhone').value,
                ownerUid: currentUser.uid,
                createdAt: new Date().toISOString(),
                services: [],
                totalRevenue: 0
            };

            try {
                const { doc, setDoc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");

                await setDoc(doc(db, 'companies', currentUser.uid), companyData);

                // Also update the user profile with business name
                await updateDoc(doc(db, 'users', currentUser.uid), {
                    business: companyData.name,
                    phone: companyData.ownerPhone || currentUser?.phone || ''
                });

                closeModal(modal);
                await loadCompanies();
                alert('Company created successfully!');
            } catch (error) {
                console.error('Error creating company:', error);
                alert('Error creating company. Please try again.');
            }
        });
    }

    // Make functions globally available for onclick handlers
    window.editCompany = async (companyId) => {
        try {
            const { doc, getDoc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
            const companyDoc = await getDoc(doc(db, 'companies', companyId));

            if (!companyDoc.exists()) {
                alert('Company not found.');
                return;
            }

            const company = companyDoc.data();

            const modalContent = `
                <div style="background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
                    <h2>Edit Company</h2>
                    <form id="editCompanyForm">
                        <label>Company Name:</label>
                        <input type="text" id="editCompanyName" value="${company.name}" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label>Owner Name:</label>
                        <input type="text" id="editOwnerName" value="${company.ownerName}" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label>Owner Email:</label>
                        <input type="email" id="editOwnerEmail" value="${company.ownerEmail}" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <label>Owner Phone:</label>
                        <input type="tel" id="editOwnerPhone" value="${company.ownerPhone || ''}" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        
                        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                            <button type="button" onclick="window.closeModal(this.closest('.modal-overlay'))" class="btn btn-secondary">Cancel</button>
                            <button type="submit" class="btn">Update Company</button>
                        </div>
                    </form>
                </div>
            `;

            const modal = showModal(modalContent);

            const form = document.getElementById('editCompanyForm');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const updatedData = {
                    name: document.getElementById('editCompanyName').value,
                    ownerName: document.getElementById('editOwnerName').value,
                    ownerEmail: document.getElementById('editOwnerEmail').value,
                    ownerPhone: document.getElementById('editOwnerPhone').value
                };

                try {
                    const { updateDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");

                    await updateDoc(doc(db, 'companies', companyId), updatedData);

                    // If this is the current user's company, also update their user profile
                    if (companyId === currentUser.uid) {
                        await updateDoc(doc(db, 'users', currentUser.uid), {
                            displayName: updatedData.ownerName,
                            name: updatedData.ownerName,
                            business: updatedData.name,
                            phone: updatedData.ownerPhone
                        });
                    }

                    closeModal(modal);
                    await loadCompanies();
                    alert('Company updated successfully!');
                } catch (error) {
                    console.error('Error updating company:', error);
                    alert('Error updating company. Please try again.');
                }
            });
        } catch (error) {
            console.error('Error loading company for edit:', error);
            alert('Error loading company details.');
        }
    };

    window.deleteCompany = async (companyId) => {
        showConfirmModal({
            title: 'Delete Company',
            message: 'Are you sure you want to delete this company? This will permanently delete all associated clients, bookings, and services. This action cannot be undone.',
            confirmText: 'Delete Company',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
                    await deleteDoc(doc(db, 'companies', companyId));
                    await loadCompanies();
                    alert('Company deleted successfully!');
                } catch (error) {
                    console.error('Error deleting company:', error);
                    alert('Error deleting company. Please try again.');
                }
            }
        });
    };

    // Make functions globally available for onclick handlers
    window.manageServices = async (companyId) => {
        try {
            const { collection, getDocs, addDoc, doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");

            // Load existing services
            const servicesRef = collection(db, 'companies', companyId, 'services');
            const servicesSnapshot = await getDocs(servicesRef);

            let servicesHtml = '';
            if (!servicesSnapshot.empty) {
                servicesSnapshot.forEach((serviceDoc) => {
                    const service = serviceDoc.data();
                    servicesHtml += `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border: 1px solid #eee; margin-bottom: 0.5rem; border-radius: 4px;">
                            <div style="flex: 1;">
                                <strong>${service.name}</strong> - $${service.price} (${service.duration} min)
                                ${service.description ? `<br><small style="color: #666;">${service.description}</small>` : ''}
                            </div>
                            <button onclick="window.deleteService('${companyId}', '${serviceDoc.id}')" style="background: #dc3545; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; margin-left: 1rem;">Delete</button>
                        </div>
                    `;
                });
            }

            if (!servicesHtml) {
                servicesHtml = '<p style="color: #666; font-style: italic;">No services created yet.</p>';
            }

            const modalContent = `
                <div style="background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto;">
                    <h2>Manage Services</h2>
                    
                    <div style="margin-bottom: 2rem;">
                        <h3>Existing Services</h3>
                        <div id="servicesList">
                            ${servicesHtml}
                        </div>
                    </div>
                    
                    <div style="border-top: 1px solid #eee; padding-top: 2rem;">
                        <h3>Add New Service</h3>
                        <form id="addServiceForm">
                            <label>Service Name:</label>
                            <input type="text" id="serviceName" required style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                            
                            <label>Description:</label>
                            <textarea id="serviceDescription" style="width: 100%; margin-bottom: 1rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; resize: vertical;" rows="2"></textarea>
                            
                            <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                                <div style="flex: 1;">
                                    <label>Price ($):</label>
                                    <input type="number" id="servicePrice" step="0.01" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
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
                    window.manageServices(companyId); // Reload the modal with updated services
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

    window.deleteService = async (companyId, serviceId) => {
        showConfirmModal({
            title: 'Delete Service',
            message: 'Are you sure you want to delete this service? This action cannot be undone.',
            confirmText: 'Delete Service',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
                    await deleteDoc(doc(db, 'companies', companyId, 'services', serviceId));
                    window.manageServices(companyId); // Reload the modal
                    alert('Service deleted successfully!');
                } catch (error) {
                    console.error('Error deleting service:', error);
                    alert('Error deleting service. Please try again.');
                }
            }
        });
    };

    // Function to get booking URL for any company
    window.getBookingUrl = (companyId, companyName) => {
        const bookingUrl = `${window.location.origin}/book/${companyId}`;

        const modalContent = `
            <div style="background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 600px;">
                <h2 style="margin-bottom: 1.5rem; color: #333;">Public Booking Website</h2>
                <h3 style="margin-bottom: 1rem; color: #666;">${companyName}</h3>
                
                <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #28a745;">
                    <p style="margin: 0 0 1rem 0; color: #666;">Public booking URL for this business:</p>
                    <div style="background: white; padding: 1rem; border-radius: 4px; border: 1px solid #ddd; word-break: break-all; font-family: monospace;">
                        ${bookingUrl}
                    </div>
                </div>
                
                <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                    <button onclick="copyUrl('${bookingUrl}')" class="btn" style="background: #007bff;">
                        📋 Copy Link
                    </button>
                    <button onclick="openUrl('${bookingUrl}')" class="btn" style="background: #28a745;">
                        🔗 Open Preview
                    </button>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button onclick="window.closeModal(this.closest('.modal-overlay'))" class="btn btn-secondary">Close</button>
                </div>
            </div>
        `;

        showModal(modalContent);
    };

    // Helper functions for URL operations
    window.copyUrl = async (url) => {
        try {
            await navigator.clipboard.writeText(url);
            alert('URL copied to clipboard!');
        } catch (error) {
            // Fallback for browsers that don't support clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                alert('URL copied to clipboard!');
            } catch (err) {
                alert('Failed to copy URL. Please copy it manually.');
            }
            document.body.removeChild(textArea);
        }
    };

    window.openUrl = (url) => {
        window.open(url, '_blank');
    };
}
