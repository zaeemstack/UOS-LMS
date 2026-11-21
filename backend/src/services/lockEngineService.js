const getEarlyWindowMins = () => parseInt(process.env.EARLY_ENTRY_WINDOW_MINUTES || '10', 10);
const getLateLockMins = () => parseInt(process.env.LATE_ENTRY_THRESHOLD_MINUTES || '30', 10);

const DAYS_MAP = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

/**
 * Parses "HH:mm" into total minutes from midnight (0 - 1439).
 */
export function timeStringToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTimeString(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Formats 24h "HH:mm" to 12h AM/PM format.
 */
export function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.trim().split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1].slice(0, 2);
    if (!isNaN(hours)) {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    }
  }
  return timeStr;
}

/**
 * Formats a raw number of minutes into formal, natural phrasing.
 * e.g. 702 => "11 hrs 42 mins"
 *      45  => "45 mins"
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
 * Evaluates the current operational status of a timetable slot against current time.
 */
export function evaluateSlotStatus(slot, session = null, simulatedTime = null) {
  const isBypass = process.env.BYPASS_TIMETABLE_LOCK === 'true';
  const now = simulatedTime ? new Date(simulatedTime) : new Date();
  const currentDay = DAYS_MAP[now.getDay()];

  // 1. Check if session is already completed
  if (session && session.sessionStatus === 'COMPLETED') {
    return {
      status: 'COMPLETED',
      canMark: isBypass, // In evaluation mode, allow re-viewing/testing
      lockReason: 'Attendance has already been submitted for this session.',
      markedAt: session.teacherMarkedAt,
      isOverridden: session.isOverridden,
    };
  }

  // 2. Check if admin has granted an active override
  if (session && session.isOverridden) {
    return {
      status: 'UNLOCKED_OVERRIDE',
      canMark: true,
      lockReason: null,
      overrideReason: session.overrideReason,
      overrideById: session.overrideById,
    };
  }

  // 3. Check if day matches
  if (slot.dayOfWeek.toUpperCase() !== currentDay) {
    return {
      status: 'DIFFERENT_DAY',
      canMark: isBypass,
      lockReason: `Scheduled for ${slot.dayOfWeek} (Today is ${currentDay}).`,
      isEvaluationTestMode: isBypass,
    };
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = timeStringToMinutes(slot.startTime);
  const endMinutes = timeStringToMinutes(slot.endTime);

  const earlyMins = getEarlyWindowMins();
  const lateMins = getLateLockMins();

  const windowStartMinutes = startMinutes - earlyMins;
  const lateLockMinutes = startMinutes + lateMins;

  const windowOpensAt24 = minutesToTimeString(windowStartMinutes);
  const windowOpensAt12 = formatTime12h(windowOpensAt24);
  const windowClosesAt24 = minutesToTimeString(lateLockMinutes);
  const windowClosesAt12 = formatTime12h(windowClosesAt24);
  const slotStart12 = formatTime12h(slot.startTime);
  const slotEnd12 = formatTime12h(slot.endTime);

  // 4. Before Attendance Window: Class has not reached its marking window yet
  if (currentMinutes < windowStartMinutes) {
    const waitMins = windowStartMinutes - currentMinutes;
    const waitFormatted = formatWaitDuration(waitMins);
    return {
      status: isBypass ? 'ACTIVE_OPEN' : 'UPCOMING',
      canMark: isBypass,
      lockReason: `Attendance window opens at ${windowOpensAt12} (${waitFormatted}). Class starts at ${slotStart12}.`,
      minutesUntilOpen: waitMins,
      windowOpensAt: windowOpensAt24,
      windowOpensAtFormatted: windowOpensAt12,
      waitFormatted: waitFormatted,
      isEvaluationTestMode: isBypass,
    };
  }

  // 5. Active 30-Minute Attendance Window: Teacher can mark attendance
  if (currentMinutes >= windowStartMinutes && currentMinutes <= lateLockMinutes) {
    const remainingMins = lateLockMinutes - currentMinutes;
    const isLate = currentMinutes > startMinutes;
    return {
      status: 'ACTIVE_OPEN',
      canMark: true,
      lockReason: null,
      minutesRemainingInWindow: remainingMins,
      windowClosesAt: windowClosesAt24,
      windowClosesAtFormatted: windowClosesAt12,
      isLate: isLate,
      windowNotice: isLate
        ? `Attendance window closes in ${remainingMins} min${remainingMins > 1 ? 's' : ''} (at ${windowClosesAt12}).`
        : `Class starts at ${slotStart12} • Window closes at ${windowClosesAt12} (30 mins after start).`,
    };
  }

  // 6. 30 Minutes Expired: Window has closed! Attendance is LOCKED! Teacher must request HOD or Admin to unlock!
  if (currentMinutes > lateLockMinutes && currentMinutes <= endMinutes) {
    return {
      status: isBypass ? 'ACTIVE_OPEN' : 'LOCKED_LATE',
      canMark: isBypass,
      lockReason: `30-minute attendance window expired (closed at ${windowClosesAt12}). HOD / Admin unlock required.`,
      windowClosesAt: windowClosesAt24,
      windowClosesAtFormatted: windowClosesAt12,
      isLate: true,
      requiresOverride: !isBypass,
      isEvaluationTestMode: isBypass,
    };
  }

  // 7. Expired: Class period concluded
  return {
    status: isBypass ? 'ACTIVE_OPEN' : 'LOCKED_EXPIRED',
    canMark: isBypass,
    lockReason: `Class concluded at ${slotEnd12}. HOD or Admin override required.`,
    requiresOverride: !isBypass,
    isEvaluationTestMode: isBypass,
  };
}
