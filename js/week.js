// Week utilities
export function getWeekStartDate(currentWeekOffset = 0) {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (currentWeekOffset * 7)); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
}

export function formatWeekDisplay(currentWeekOffset = 0) {
    const startOfWeek = getWeekStartDate(currentWeekOffset);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const options = { month: 'short', day: 'numeric' };
    const startStr = startOfWeek.toLocaleDateString('en-US', options);
    const endStr = endOfWeek.toLocaleDateString('en-US', options);
    if (currentWeekOffset === 0) {
        return `This Week (${startStr} - ${endStr})`;
    } else if (currentWeekOffset === -1) {
        return `Last Week (${startStr} - ${endStr})`;
    } else if (currentWeekOffset === 1) {
        return `Next Week (${startStr} - ${endStr})`;
    } else {
        return `Week of ${startStr} - ${endStr}`;
    }
}
