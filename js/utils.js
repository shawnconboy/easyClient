// General utility functions
export function formatPhone(phone) {
    const digits = (phone || '').replace(/\D/g, '');
    if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
    return phone || '';
}

export function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString();
}

export function formatTime(timeStr) {
    return timeStr;
}

export function formatTime12Hour(hour) {
    if (hour === 0) return '12:00 AM';
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return '12:00 PM';
    return `${hour - 12}:00 PM`;
}

export function formatTimeString12Hour(timeStr) {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const min = minutes || '00';
    if (hour === 0) return `12:${min} AM`;
    if (hour < 12) return `${hour}:${min} AM`;
    if (hour === 12) return `12:${min} PM`;
    return `${hour - 12}:${min} PM`;
}

export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function addSpaLinkHandlers() {
    document.querySelectorAll('.spa-link').forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            if (href && window.route) {
                window.route(href);
            }
        };
    });
}
