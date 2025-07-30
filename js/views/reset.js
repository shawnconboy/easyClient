// Reset password view module
import { addSpaLinkHandlers } from '../utils.js';

export function renderReset({ root, auth, sendPasswordResetEmail }) {
    root.innerHTML = `
        <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f5;">
            <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); width: 100%; max-width: 400px;">
                <h2 style="text-align: center; margin-bottom: 2rem; color: #333;">Reset Password</h2>
                <div id="resetError" style="display: none; background: #f8d7da; color: #721c24; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; border: 1px solid #f5c6cb;"></div>
                <div id="resetSuccess" style="display: none; background: #d4edda; color: #155724; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; border: 1px solid #c3e6cb;"></div>
                <form id="resetForm">
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; color: #555;">Email:</label>
                        <input type="email" id="resetEmail" required 
                               style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
                    </div>
                    <button type="submit" id="resetButton"
                            style="width: 100%; padding: 0.75rem; background: #dc3545; color: white; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer;">
                        Send Reset Link
                    </button>
                </form>
                <div style="text-align: center; margin-top: 1rem;">
                    <a href="/login" class="spa-link" style="color: #007bff; text-decoration: none;">Back to Login</a>
                </div>
            </div>
        </div>
    `;

    // Add form submit handler
    const form = document.getElementById('resetForm');
    const resetButton = document.getElementById('resetButton');
    const errorDiv = document.getElementById('resetError');
    const successDiv = document.getElementById('resetSuccess');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('resetEmail').value.trim();

            // Show loading state
            resetButton.textContent = 'Sending...';
            resetButton.disabled = true;
            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';

            try {
                await sendPasswordResetEmail(auth, email);

                // Show success message
                successDiv.textContent = 'Password reset email sent! Check your inbox.';
                successDiv.style.display = 'block';

                // Clear the form
                document.getElementById('resetEmail').value = '';

                console.log('Password reset email sent');
            } catch (error) {
                // Show error message
                let errorMessage = 'Failed to send reset email. Please try again.';

                switch (error.code) {
                    case 'auth/user-not-found':
                        errorMessage = 'No account found with this email address.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Invalid email address format.';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = 'Too many requests. Please try again later.';
                        break;
                    default:
                        errorMessage = error.message || 'Failed to send reset email.';
                }

                errorDiv.textContent = errorMessage;
                errorDiv.style.display = 'block';
                console.error('Password reset error:', error);
            } finally {
                // Reset button state
                resetButton.textContent = 'Send Reset Link';
                resetButton.disabled = false;
            }
        });
    }

    // Add SPA link handlers for the reset form links
    setTimeout(() => addSpaLinkHandlers(), 0);
}
