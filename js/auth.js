// Authentication and permission helpers
import { ROLES } from './constants.js';

export function hasPermission(action, currentUser, currentRole, companyId = null) {
    if (!currentUser || !currentRole) return false;
    switch (action) {
        case 'view_all_companies':
        case 'create_company':
        case 'view_all_users':
            return currentRole === ROLES.ADMIN;
        case 'manage_company':
        case 'view_company_data':
        case 'manage_bookings':
        case 'manage_clients':
            if (currentRole === ROLES.ADMIN) return true;
            if (currentRole === ROLES.OWNER && companyId === currentUser.uid) return true;
            return false;
        case 'view_own_bookings':
            return currentRole === ROLES.CLIENT || currentRole === ROLES.OWNER || currentRole === ROLES.ADMIN;
        default:
            return false;
    }
}
