// Signup view module
import { addSpaLinkHandlers } from '../utils.js';

export function renderSignup({ root, auth, createUserWithEmailAndPassword, doc, setDoc, db }) {
    root.innerHTML = `
        <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f5;">
            <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); width: 100%; max-width: 400px;">
                <h2 style="text-align: center; margin-bottom: 2rem; color: #333;">Sign Up for Easy Client</h2>
                <div id="signupError" style="display: none; background: #f8d7da; color: #721c24; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; border: 1px solid #f5c6cb;"></div>
                <form id="signupForm">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; color: #555;">Full Name:</label>
                        <input type="text" id="signupName" required 
                               style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; color: #555;">Email:</label>
                        <input type="email" id="signupEmail" required 
                               style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; color: #555;">Password:</label>
                        <input type="password" id="signupPassword" required minlength="6"
                               style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
                    </div>
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; color: #555;">Confirm Password:</label>
                        <input type="password" id="confirmPassword" required 
                               style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
                    </div>
                    <button type="submit" id="signupButton"
                            style="width: 100%; padding: 0.75rem; background: #28a745; color: white; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer;">
                        Sign Up
                    </button>
                </form>
                <div style="text-align: center; margin-top: 1rem;">
                    <a href="/login" class="spa-link" style="color: #007bff; text-decoration: none;">Already have an account? Login</a>
                </div>
            </div>
        </div>
    `;

    // Add form submit handler
    const form = document.getElementById('signupForm');
    const signupButton = document.getElementById('signupButton');
    const errorDiv = document.getElementById('signupError');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('signupName').value.trim();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Validate passwords match
            if (password !== confirmPassword) {
                errorDiv.textContent = 'Passwords do not match.';
                errorDiv.style.display = 'block';
                return;
            }

            // Show loading state
            signupButton.textContent = 'Creating Account...';
            signupButton.disabled = true;
            errorDiv.style.display = 'none';

            try {
                // Create Firebase Auth user
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Create user document in Firestore
                await setDoc(doc(db, 'users', user.uid), {
                    name: name,
                    email: email,
                    role: 'owner', // Default role - can be changed by admin
                    status: 'active',
                    createdAt: new Date().toISOString()
                });

                console.log('Signup successful');
                // Success - Firebase auth state observer will handle the redirect
            } catch (error) {
                // Show error message
                let errorMessage = 'Signup failed. Please try again.';

                switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorMessage = 'An account with this email already exists.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Invalid email address format.';
                        break;
                    case 'auth/weak-password':
                        errorMessage = 'Password should be at least 6 characters long.';
                        break;
                    case 'auth/operation-not-allowed':
                        errorMessage = 'Email/password accounts are not enabled.';
                        break;
                    default:
                        errorMessage = error.message || 'Signup failed. Please try again.';
                }

                errorDiv.textContent = errorMessage;
                errorDiv.style.display = 'block';
                console.error('Signup error:', error);
            } finally {
                // Reset button state
                signupButton.textContent = 'Sign Up';
                signupButton.disabled = false;
            }
        });
    }

    // Add SPA link handlers for the signup form links
    setTimeout(() => addSpaLinkHandlers(), 0);
}
