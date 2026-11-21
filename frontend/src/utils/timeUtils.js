/**
 * Converts a 24-hour time string (e.g. "08:00", "14:30") or ISO string into 12-hour format with AM/PM.
 * Example:
 * formatTime12h("08:00") => "08:00 AM"
 * formatTime12h("13:00") => "01:00 PM"
 * formatTime12h("17:00") => "05:00 PM"
 */
export function formatTime12h(timeStr) {
  if (!timeStr) return '';
  
  // If already formatted with AM/PM, return as is
  if (typeof timeStr === 'string' && (timeStr.includes('AM') || timeStr.includes('PM'))) {
    return timeStr;
  }

  // If passed an ISO Date string or Date object
  if (timeStr instanceof Date || (typeof timeStr === 'string' && timeStr.includes('T'))) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 becomes 12
      const hoursPad = String(hours).padStart(2, '0');
      return `${hoursPad}:${minutes} ${ampm}`;
    }
  }

  // Parse "HH:mm" or "HH:mm:ss"
  if (typeof timeStr === 'string') {
    const parts = timeStr.trim().split(':');
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1].slice(0, 2);
      if (!isNaN(hours)) {
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const hoursPad = String(hours).padStart(2, '0');
        return `${hoursPad}:${minutes} ${ampm}`;
      }
    }
  }

  return String(timeStr);
}

/**
 * Formats a start and end time range with AM/PM.
 * Example: formatTimeRange("08:00", "09:00") => "08:00 AM - 09:00 AM"
 */
export function formatTimeRange(startTime, endTime) {
  if (!startTime && !endTime) return '';
  if (!endTime) return formatTime12h(startTime);
  if (!startTime) return formatTime12h(endTime);
  return `${formatTime12h(startTime)} - ${formatTime12h(endTime)}`;
}

/**
 * Formats raw minutes into a natural, formal duration.
 * e.g. 702 => "11 hrs 42 mins"
 *      45  => "45 mins"
 *      120 => "2 hrs"
 */
export function formatWaitDuration(minutes) {
  if (!minutes || minutes <= 0) return 'momentarily';
  if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''}`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}`;
  }
  return `${hours} hr${hours > 1 ? 's' : ''} ${remainingMins} min${remainingMins > 1 ? 's' : ''}`;
}

/**
 * Formats the upcoming window notice into a polite, professional string.
 * Example: formatOpeningNotice(slotStartTime, minutesUntilOpen)
 * => "Window opens at 03:45 PM (Starts in 5 hrs 15 mins)"
 */
export function formatOpeningNotice(startTime, minutesUntilOpen) {
  if (!startTime) {
    return `Window opens in ${formatWaitDuration(minutesUntilOpen)}`;
  }

  // Calculate open time (15 mins prior to start)
  const parts = startTime.split(':').map(Number);
  if (parts.length >= 2) {
    let openTotalMins = parts[0] * 60 + parts[1] - 15;
    if (openTotalMins < 0) openTotalMins += 1440;
    const openH = Math.floor(openTotalMins / 60) % 24;
    const openM = openTotalMins % 60;
    const openTimeStr = `${String(openH).padStart(2, '0')}:${String(openM).padStart(2, '0')}`;
    const open12 = formatTime12h(openTimeStr);
    const start12 = formatTime12h(startTime);
    return `Attendance window opens at ${open12} (in ${formatWaitDuration(minutesUntilOpen)}) • Starts at ${start12}`;
  }

  return `Window opens in ${formatWaitDuration(minutesUntilOpen)}`;
}
