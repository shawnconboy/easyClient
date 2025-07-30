// Sidebar rendering
import { ROLES, ROUTES } from './constants.js';

export function renderSidebar(currentRole) {
    let links = [];
    if (currentRole === ROLES.OWNER) {
        links = [
            { href: ROUTES.DASHBOARD, label: 'Dashboard' },
            { href: ROUTES.BOOKINGS, label: 'Bookings' },
            { href: ROUTES.CLIENTS, label: 'Clients' },
            { href: '/services', label: 'Services' },
            { href: ROUTES.SETTINGS, label: 'Settings' }
        ];
    } else if (currentRole === ROLES.ADMIN) {
        links = [
            { href: ROUTES.DASHBOARD, label: 'Dashboard' },
            { href: ROUTES.COMPANIES, label: 'Companies' },
            { href: ROUTES.USERS, label: 'Business Owners' },
            { href: ROUTES.SETTINGS, label: 'Settings' },
            { href: ROUTES.LANDING, label: 'Landing Page' }
        ];
    } else if (currentRole === ROLES.CLIENT) {
        links = [
            { href: ROUTES.DASHBOARD, label: 'My Bookings' },
            { href: ROUTES.SETTINGS, label: 'Settings' }
        ];
    }
    return `
        <aside class="sidebar">
            <h2>Easy Client</h2>
            <nav>
                ${links.map(link => `<a href="${link.href}" class="spa-link">${link.label}</a>`).join('')}
            </nav>
        </aside>
    `;
}
