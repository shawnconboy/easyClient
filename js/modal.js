// Modal helpers
export function showModal(content) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.18)';
    modal.style.zIndex = '1005';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.innerHTML = content;
    document.body.appendChild(modal);
    return modal;
}

export function closeModal(modal) {
    if (modal && modal.parentNode) {
        modal.parentNode.removeChild(modal);
    }
}

export function showConfirmModal({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmStyle = 'btn btn-error',
    cancelStyle = 'btn btn-secondary',
    onConfirm = () => { },
    onCancel = () => { }
}) {
    const modalContent = `
        <div style="background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 450px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
            <div style="margin-bottom: 1.5rem;">
                <div style="width: 60px; height: 60px; border-radius: 50%; background: #fee; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                </div>
                <h3 style="margin: 0 0 0.5rem 0; color: #333; font-size: 1.25rem;">${title}</h3>
                <p style="margin: 0; color: #666; line-height: 1.5;">${message}</p>
            </div>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button id="confirmCancel" class="${cancelStyle}">${cancelText}</button>
                <button id="confirmAction" class="${confirmStyle}">${confirmText}</button>
            </div>
        </div>
    `;

    const modal = showModal(modalContent);

    // Add event listeners
    const confirmBtn = modal.querySelector('#confirmAction');
    const cancelBtn = modal.querySelector('#confirmCancel');

    confirmBtn.addEventListener('click', () => {
        closeModal(modal);
        onConfirm();
    });

    cancelBtn.addEventListener('click', () => {
        closeModal(modal);
        onCancel();
    });

    // Close on escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal(modal);
            onCancel();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);

    return modal;
}
