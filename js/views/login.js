// Login view module
import { addSpaLinkHandlers } from '../utils.js';

export function renderLogin({ root, auth, signInWithEmailAndPassword }) {
    root.innerHTML = `
        <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f5;">
            <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); width: 100%; max-width: 400px;">
                <h2 style="text-align: center; margin-bottom: 2rem; color: #333;">Login to Easy Client</h2>
                <div id="loginError" style="display: none; background: #f8d7da; color: #721c24; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; border: 1px solid #f5c6cb;"></div>
                <form id="loginForm">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; color: #555;">Email:</label>
                        <input type="email" id="loginEmail" required 
                               style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
                    </div>
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; color: #555;">Password:</label>
                        <input type="password" id="loginPassword" required 
                               style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
                    </div>
                    <button type="submit" id="loginButton"
                            style="width: 100%; padding: 0.75rem; background: #007bff; color: white; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer;">
                        Login
                    </button>
                </form>
                <div style="text-align: center; margin-top: 1rem;">
                    <button onclick="showAccountTypeModal()" style="background: none; border: none; color: #007bff; text-decoration: underline; cursor: pointer; font-size: 1rem;">Don't have an account? Sign up</button>
                </div>
                <div style="text-align: center; margin-top: 0.5rem;">
                    <a href="/reset" class="spa-link" style="color: #007bff; text-decoration: none;">Forgot password?</a>
                </div>
            </div>
        </div>
    `;

    // Add form submit handler
    const form = document.getElementById('loginForm');
    const loginButton = document.getElementById('loginButton');
    const errorDiv = document.getElementById('loginError');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            // Show loading state
            loginButton.textContent = 'Logging in...';
            loginButton.disabled = true;
            errorDiv.style.display = 'none';

            try {
                await signInWithEmailAndPassword(auth, email, password);
                // Success - Firebase auth state observer will handle the redirect
                console.log('Login successful');
            } catch (error) {
                // Show error message
                let errorMessage = 'Login failed. Please try again.';

                switch (error.code) {
                    case 'auth/user-not-found':
                        errorMessage = 'No account found with this email address.';
                        break;
                    case 'auth/wrong-password':
                        errorMessage = 'Incorrect password. Please try again.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Invalid email address format.';
                        break;
                    case 'auth/user-disabled':
                        errorMessage = 'This account has been disabled.';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = 'Too many failed attempts. Please try again later.';
                        break;
                    default:
                        errorMessage = error.message || 'Login failed. Please try again.';
                }

                errorDiv.textContent = errorMessage;
                errorDiv.style.display = 'block';
                console.error('Login error:', error);
            } finally {
                // Reset button state
                loginButton.textContent = 'Login';
                loginButton.disabled = false;
            }
        });
    }

    // Add SPA link handlers for the login form links
    setTimeout(() => addSpaLinkHandlers(), 0);

    // Make the account type modal function globally available
    window.showAccountTypeModal = showAccountTypeModal;
}

async function showAccountTypeModal() {
    const { showModal, closeModal } = await import('../modal.js');

    const modalContent = `
        <div style="background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px; text-align: center;">
            <h2 style="margin-bottom: 1.5rem; color: #333;">Choose Account Type</h2>
            <p style="margin-bottom: 2rem; color: #666;">What type of account would you like to create?</p>
            
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <button onclick="showBusinessOwnerSignup()" class="btn" style="min-width: 150px; padding: 1rem 2rem;">
                    <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.5rem;">Business Owner</div>
                    <div style="font-size: 0.9rem; opacity: 0.8;">Manage your business, clients, and bookings</div>
                </button>
                
                <button onclick="showClientSignup()" class="btn btn-secondary" style="min-width: 150px; padding: 1rem 2rem;">
                    <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.5rem;">Client</div>
                    <div style="font-size: 0.9rem; opacity: 0.8;">Book services and manage appointments</div>
                </button>
            </div>
            
            <div style="margin-top: 2rem;">
                <button onclick="window.closeModal(this.closest('.modal-overlay'))" class="btn btn-secondary">Cancel</button>
            </div>
        </div>
    `;

    const modal = showModal(modalContent);

    // Make signup functions globally available
    window.showBusinessOwnerSignup = () => {
        closeModal(modal);
        showBusinessOwnerSignup();
    };

    window.showClientSignup = () => {
        closeModal(modal);
        showClientSignup();
    };
}

async function showBusinessOwnerSignup() {
    const { showModal, closeModal } = await import('../modal.js');
    const { createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js");
    const { getFirestore, doc, setDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");

    const modalContent = `
        <div style="background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
            <h2 style="margin-bottom: 1.5rem; color: #333;">Create Business Owner Account</h2>
            <div id="signupError" style="display: none; background: #f8d7da; color: #721c24; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; border: 1px solid #f5c6cb;"></div>
            
            <form id="businessSignupForm">
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #555;">Business Name:</label>
                    <input type="text" id="businessName" required 
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #555;">Owner Name:</label>
                    <input type="text" id="ownerName" required 
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #555;">Email:</label>
                    <input type="email" id="businessEmail" required 
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #555;">Phone:</label>
                    <input type="tel" id="businessPhone" 
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #555;">Password:</label>
                    <input type="password" id="businessPassword" required minlength="6"
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #555;">Confirm Password:</label>
                    <input type="password" id="businessConfirmPassword" required minlength="6"
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button type="button" onclick="window.closeModal(this.closest('.modal-overlay'))" class="btn btn-secondary">Cancel</button>
                    <button type="submit" id="businessSignupButton" class="btn">Create Business Account</button>
                </div>
            </form>
        </div>
    `;

    const modal = showModal(modalContent);

    const form = document.getElementById('businessSignupForm');
    const signupButton = document.getElementById('businessSignupButton');
    const errorDiv = document.getElementById('signupError');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const businessName = document.getElementById('businessName').value;
        const ownerName = document.getElementById('ownerName').value;
        const email = document.getElementById('businessEmail').value;
        const phone = document.getElementById('businessPhone').value;
        const password = document.getElementById('businessPassword').value;
        const confirmPassword = document.getElementById('businessConfirmPassword').value;

        if (password !== confirmPassword) {
            errorDiv.textContent = 'Passwords do not match.';
            errorDiv.style.display = 'block';
            return;
        }

        signupButton.textContent = 'Creating Account...';
        signupButton.disabled = true;
        errorDiv.style.display = 'none';

        try {
            // Get auth from the global scope
            const auth = window.auth || await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js").then(m => m.getAuth());
            const db = window.db || await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js").then(m => m.getFirestore());

            // Create user account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create user profile
            await setDoc(doc(db, 'users', user.uid), {
                email: email,
                displayName: ownerName,
                name: ownerName, // Add both for consistency
                phone: phone, // Add phone to user profile
                role: 'owner',
                business: businessName, // Add business name to user profile
                createdAt: new Date().toISOString()
            });

            // Create company profile
            await setDoc(doc(db, 'companies', user.uid), {
                name: businessName,
                ownerName: ownerName,
                ownerEmail: email,
                ownerPhone: phone,
                ownerUid: user.uid,
                createdAt: new Date().toISOString(),
                services: [],
                totalRevenue: 0
            });

            closeModal(modal);
            alert('Business account created successfully! You are now logged in.');

        } catch (error) {
            let errorMessage = 'Account creation failed. Please try again.';

            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'An account with this email already exists.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address format.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password should be at least 6 characters.';
                    break;
                default:
                    errorMessage = error.message || 'Account creation failed. Please try again.';
            }

            errorDiv.textContent = errorMessage;
            errorDiv.style.display = 'block';
            console.error('Signup error:', error);
        } finally {
            signupButton.textContent = 'Create Business Account';
            signupButton.disabled = false;
        }
    });
}

async function showClientSignup() {
    const { showModal, closeModal } = await import('../modal.js');
    const { createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js");
    const { getFirestore, doc, setDoc } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");

    const modalContent = `
        <div style="background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
            <h2 style="margin-bottom: 1.5rem; color: #333;">Create Client Account</h2>
            <div id="clientSignupError" style="display: none; background: #f8d7da; color: #721c24; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; border: 1px solid #f5c6cb;"></div>
            
            <form id="clientSignupForm">
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #555;">Full Name:</label>
                    <input type="text" id="clientName" required 
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #555;">Email:</label>
                    <input type="email" id="clientEmail" required 
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #555;">Phone:</label>
                    <input type="tel" id="clientPhone" 
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #555;">Password:</label>
                    <input type="password" id="clientPassword" required minlength="6"
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; color: #555;">Confirm Password:</label>
                    <input type="password" id="clientConfirmPassword" required minlength="6"
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button type="button" onclick="window.closeModal(this.closest('.modal-overlay'))" class="btn btn-secondary">Cancel</button>
                    <button type="submit" id="clientSignupButton" class="btn">Create Client Account</button>
                </div>
            </form>
        </div>
    `;

    const modal = showModal(modalContent);

    const form = document.getElementById('clientSignupForm');
    const signupButton = document.getElementById('clientSignupButton');
    const errorDiv = document.getElementById('clientSignupError');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('clientName').value;
        const email = document.getElementById('clientEmail').value;
        const phone = document.getElementById('clientPhone').value;
        const password = document.getElementById('clientPassword').value;
        const confirmPassword = document.getElementById('clientConfirmPassword').value;

        if (password !== confirmPassword) {
            errorDiv.textContent = 'Passwords do not match.';
            errorDiv.style.display = 'block';
            return;
        }

        signupButton.textContent = 'Creating Account...';
        signupButton.disabled = true;
        errorDiv.style.display = 'none';

        try {
            // Get auth from the global scope
            const auth = window.auth || await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js").then(m => m.getAuth());
            const db = window.db || await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js").then(m => m.getFirestore());

            // Create user account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create user profile
            await setDoc(doc(db, 'users', user.uid), {
                email: email,
                displayName: name,
                name: name, // Add both for consistency
                phone: phone,
                role: 'client',
                createdAt: new Date().toISOString()
            });

            closeModal(modal);
            alert('Client account created successfully! You are now logged in.');

        } catch (error) {
            let errorMessage = 'Account creation failed. Please try again.';

            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'An account with this email already exists.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address format.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password should be at least 6 characters.';
                    break;
                default:
                    errorMessage = error.message || 'Account creation failed. Please try again.';
            }

            errorDiv.textContent = errorMessage;
            errorDiv.style.display = 'block';
            console.error('Client signup error:', error);
        } finally {
            signupButton.textContent = 'Create Client Account';
            signupButton.disabled = false;
        }
    });
}
