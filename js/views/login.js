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
                    <a href="/signup" class="spa-link" style="color: #007bff; text-decoration: none;">Don't have an account? Sign up</a>
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
}
