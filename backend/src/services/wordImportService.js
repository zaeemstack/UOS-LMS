import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';

let cachedDefaultPasswordHash = null;
async function getDefaultPasswordHash() {
  if (!cachedDefaultPasswordHash) {
    cachedDefaultPasswordHash = await bcrypt.hash('password123', 10);
  }
  return cachedDefaultPasswordHash;
}

const VALID_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

/**
 * Normalize time strings like "8:30", "08:30", "1:00", "01:30 PM" to 24-hr "HH:MM"
 */
function normalizeTime(rawTime, isEndTime = false, startTimeStr = null) {
  if (!rawTime) return isEndTime ? '10:00' : '08:30';
  let clean = rawTime.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  clean = clean.replace(/[^\d:]/g, '');

  const parts = clean.split(':');
  let hour = parseInt(parts[0], 10);
  const min = parts[1] ? parts[1].padStart(2, '0') : '00';

  if (isNaN(hour)) return isEndTime ? '10:00' : '08:30';

  // Explicit PM/AM
  if (isPM && hour < 12) hour += 12;
  if (isAM && hour === 12) hour = 0;

  // Infer PM for afternoon university slots if no AM/PM indicator:
  // e.g., 1:00, 2:00, 3:00, 4:00, 5:00, 6:00 are PM slots in university schedules
  if (!isPM && !isAM) {
    if (hour >= 1 && hour <= 6) {
      hour += 12;
    } else if (isEndTime && startTimeStr) {
      // If start is e.g. 11:30 and end is 1:00, end must be 13:00
      const startHour = parseInt(startTimeStr.split(':')[0], 10);
      if (hour < startHour && hour <= 11) {
        hour += 12;
      }
    }
  }

  return `${String(hour).padStart(2, '0')}:${min}`;
}

/**
 * Extract text and table data from a .docx file using mammoth
 */
async function extractDocxData(buffer) {
  try {
    const mammoth = (await import('mammoth')).default || (await import('mammoth'));
    
    // 1. Get raw text
    const textResult = await mammoth.extractRawText({ buffer });
    const rawText = textResult?.value || '';

    // 2. Get HTML representation to extract table structure cleanly
    const htmlResult = await mammoth.convertToHtml({ buffer });
    const html = htmlResult?.value || '';

    return { rawText, html };
  } catch (err) {
    console.warn('[Word Import] mammoth extraction failed, falling back to native scan:', err.message);
    return { rawText: buffer.toString('utf8'), html: '' };
  }
}

/**
 * Extract plain text from old .doc (Word 97-2003 binary format)
 */
function extractDocText(buffer) {
  const buf = buffer.toString('binary');
  const textParts = [];
  let currentRun = '';

  for (let i = 0; i < buf.length; i++) {
    const code = buf.charCodeAt(i);
    if (code >= 32 && code <= 126) {
      currentRun += buf[i];
    } else {
      if (currentRun.length >= 3) textParts.push(currentRun);
      currentRun = '';
    }
  }
  if (currentRun.length >= 3) textParts.push(currentRun);
  return textParts.join(' ');
}

/**
 * Parse HTML tables produced by Mammoth into structured rows
 */
function parseHtmlTables(html) {
  const rows = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const tdRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;

  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const trContent = trMatch[1];
    const cells = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(trContent)) !== null) {
      // Strip inner tags to get clean cell text
      const cleanCell = tdMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      cells.push(cleanCell);
    }
    if (cells.some((c) => c.length > 0)) {
      rows.push(cells);
    }
  }
  return rows;
}

/**
 * Time slot regex covering:
 * "08:30 - 10:00", "8:30 to 10:00", "08:30am - 10:00am", "8:30-10:00", "11:30-1:00", "01:30 - 03:00"
 */
const TIME_REGEX = /(\d{1,2}:\d{2})\s*(?:AM|PM)?\s*(?:-|–|—|to|\/)\s*(\d{1,2}:\d{2})\s*(?:AM|PM)?/i;
const SECTION_REGEX = /\b((?:BS|MS|MCS|MSc)?[A-Z]{2,5}[-\s]?(?:1st|2nd|3rd|4th|5th|6th|7th|8th|\d{1,2})[-\s]?[A-Z]?)\b/i;
const COURSE_CODE_REGEX = /\b([A-Z]{2,5}[-\s]?\d{3,4}[A-Z]?)\b/i;
const ROOM_REGEX = /\b(LH[-\s]?\d+|Lab[-\s]?\d+|Room[-\s]?\d+|Hall[-\s]?[A-Z0-9]+|CL[-\s]?\d+|LT[-\s]?\d+|Auditorium)\b/i;
const TEACHER_PREFIX_REGEX = /(?:Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.|Engr\.|Lect\.)\s+([A-Za-z][A-Za-z\s.]{2,30})/i;

/**
 * Master slot inserter
 */
async function processTimetableEntries(extractedItems) {
  const defaultPassword = await getDefaultPasswordHash();

  const [depts, courses, sections, rooms, teachers] = await Promise.all([
    prisma.department.findMany(),
    prisma.course.findMany(),
    prisma.section.findMany(),
    prisma.room.findMany(),
    prisma.user.findMany({ where: { role: 'TEACHER' } }),
  ]);

  const deptMap = new Map(depts.map((d) => [d.code.toUpperCase(), d.id]));
  const courseMap = new Map(courses.map((c) => [c.code.toUpperCase(), c.id]));
  const sectionMap = new Map(sections.map((s) => [s.name.toUpperCase().replace(/\s+/g, '-'), s.id]));
  const roomMap = new Map(rooms.map((r) => [r.roomNumber.toUpperCase().replace(/\s+/g, '-'), r.id]));
  const teacherNameMap = new Map();

  teachers.forEach((t) => {
    if (t.fullName) teacherNameMap.set(t.fullName.toLowerCase().replace(/[^a-z0-9]/g, ''), t);
  });

  const defaultDeptId =
    depts[0]?.id ||
    (await prisma.department.create({ data: { name: 'Department of Computer Science & IT', code: 'CS' } })).id;

  let importedCount = 0;
  const errors = [];

  for (const item of extractedItems) {
    try {
      const {
        dayOfWeek,
        startTime,
        endTime,
        courseCode,
        courseTitle,
        sectionName,
        roomNumber,
        teacherName,
        departmentCode,
      } = item;

      // 1. Department
      const deptId = (departmentCode && deptMap.get(departmentCode.toUpperCase())) || defaultDeptId;

      // 2. Course
      const cleanCourseCode = (courseCode || 'CS-101').toUpperCase().replace(/\s+/g, '-');
      let courseId = courseMap.get(cleanCourseCode);
      if (!courseId) {
        const newCourse = await prisma.course.create({
          data: {
            code: cleanCourseCode,
            title: courseTitle || `Course ${cleanCourseCode}`,
            creditHours: 3,
            departmentId: deptId,
          },
        });
        courseMap.set(cleanCourseCode, newCourse.id);
        courseId = newCourse.id;
      }

      // 3. Section
      const cleanSectionName = (sectionName || 'BSCS-1A').toUpperCase().replace(/\s+/g, '-');
      let sectionId = sectionMap.get(cleanSectionName);
      if (!sectionId) {
        // Guess semester number from section string (e.g. BSCS-6A -> semester 6)
        const semMatch = cleanSectionName.match(/(\d+)/);
        const semNum = semMatch ? Math.min(Math.max(parseInt(semMatch[1], 10), 1), 8) : 1;

        const newSec = await prisma.section.create({
          data: {
            name: cleanSectionName,
            semester: semNum,
            academicYear: '2025-2026',
            departmentId: deptId,
          },
        });
        sectionMap.set(cleanSectionName, newSec.id);
        sectionId = newSec.id;
      }

      // 4. Room
      const cleanRoom = (roomNumber || 'LH-01').toUpperCase().replace(/\s+/g, '-');
      let roomId = roomMap.get(cleanRoom);
      if (!roomId) {
        const newRoom = await prisma.room.create({
          data: { roomNumber: cleanRoom, building: 'Academic Block', floor: 1 },
        });
        roomMap.set(cleanRoom, newRoom.id);
        roomId = newRoom.id;
      }

      // 5. Teacher
      const cleanTeacherName = teacherName?.trim() || 'Faculty Member';
      const normName = cleanTeacherName.toLowerCase().replace(/[^a-z0-9]/g, '');
      let teacher = teacherNameMap.get(normName);

      if (!teacher) {
        const emailSlug = cleanTeacherName.toLowerCase().replace(/[^a-z0-9]/g, '.');
        const teacherEmail = `${emailSlug}@uos.edu.pk`;

        teacher = await prisma.user.upsert({
          where: { email: teacherEmail },
          update: { fullName: cleanTeacherName, departmentId: deptId },
          create: {
            email: teacherEmail,
            fullName: cleanTeacherName,
            employeeOrRollId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
            passwordHash: defaultPassword,
            role: 'TEACHER',
            departmentId: deptId,
          },
        });
        teacherNameMap.set(normName, teacher);
      }

      // 6. Create Timetable Slot
      await prisma.timetableSlot.create({
        data: {
          dayOfWeek: dayOfWeek || 'MONDAY',
          startTime,
          endTime,
          courseId,
          sectionId,
          roomId,
          teacherId: teacher.id,
        },
      });

      importedCount++;
    } catch (err) {
      errors.push({ item, error: err.message });
    }
  }

  return {
    total: extractedItems.length,
    imported: importedCount,
    errors: errors.slice(0, 10),
  };
}

/**
 * Parse structured items from HTML table rows
 */
function extractFromTableRows(rows) {
  const items = [];
  let currentDay = 'MONDAY';

  for (const row of rows) {
    const fullRowText = row.join(' ');

    // Check if the entire row is a Day header (e.g. ["Monday"], ["TUESDAY"])
    const dayFound = VALID_DAYS.find((d) => fullRowText.toUpperCase().includes(d));
    if (dayFound && row.length <= 2) {
      currentDay = dayFound;
      continue;
    }

    // Look for time slot inside the row cells
    const timeCell = row.find((c) => TIME_REGEX.test(c)) || fullRowText;
    const timeMatch = timeCell.match(TIME_REGEX);
    if (!timeMatch) continue;

    const rawStart = timeMatch[1];
    const rawEnd = timeMatch[2];
    const startTime = normalizeTime(rawStart, false);
    const endTime = normalizeTime(rawEnd, true, startTime);

    // Row-specific day if present
    const rowDay = dayFound || currentDay;

    // Detect section
    const secMatch = fullRowText.match(SECTION_REGEX);
    const sectionName = secMatch ? secMatch[1].replace(/(\d)([A-L])/i, '$1-$2').toUpperCase() : 'BSCS-1A';

    // Detect course
    const courseMatch = fullRowText.match(COURSE_CODE_REGEX);
    const courseCode = courseMatch ? courseMatch[1].replace(/\s+/g, '-').toUpperCase() : 'CS-101';

    // Detect room
    const roomMatch = fullRowText.match(ROOM_REGEX);
    const roomNumber = roomMatch ? roomMatch[1].replace(/\s+/g, '-').toUpperCase() : 'LH-01';

    // Detect teacher
    let teacherName = 'Faculty Member';
    const teacherPrefixMatch = fullRowText.match(TEACHER_PREFIX_REGEX);
    if (teacherPrefixMatch) {
      teacherName = teacherPrefixMatch[0].trim();
    } else {
      // Look for a cell that looks like a name (not time, not room, not code)
      const potentialNameCell = row.find((c) => {
        return (
          c.length >= 4 &&
          c.length <= 35 &&
          !TIME_REGEX.test(c) &&
          !COURSE_CODE_REGEX.test(c) &&
          !ROOM_REGEX.test(c) &&
          !SECTION_REGEX.test(c) &&
          !VALID_DAYS.some((d) => c.toUpperCase().includes(d)) &&
          /^[A-Za-z\s.]+$/.test(c)
        );
      });
      if (potentialNameCell) teacherName = potentialNameCell.trim();
    }

    items.push({
      dayOfWeek: rowDay,
      startTime,
      endTime,
      courseCode,
      courseTitle: `Course ${courseCode}`,
      sectionName,
      roomNumber,
      teacherName,
    });
  }

  return items;
}

function extractFromTextLines(rawText) {
  const items = [];
  
  // Strategy 1: Global time segmentation (robust across newlines, spaces, or single continuous text)
  const globalTimeRegex = new RegExp(TIME_REGEX.source, 'gi');
  const timeMatches = [...rawText.matchAll(globalTimeRegex)];

  if (timeMatches.length > 0) {
    let currentDay = 'MONDAY';

    for (let i = 0; i < timeMatches.length; i++) {
      const match = timeMatches[i];
      const prevEnd = i === 0 ? 0 : timeMatches[i - 1].index + timeMatches[i - 1][0].length;
      const preText = rawText.substring(prevEnd, match.index).toUpperCase();

      for (const d of VALID_DAYS) {
        if (preText.includes(d)) {
          currentDay = d;
          break;
        }
      }

      const nextStart = i + 1 < timeMatches.length ? timeMatches[i + 1].index : rawText.length;
      const slotBlock = rawText.substring(match.index, nextStart);

      const rawStart = match[1];
      const rawEnd = match[2];
      const startTime = normalizeTime(rawStart, false);
      const endTime = normalizeTime(rawEnd, true, startTime);

      const secMatch = slotBlock.match(SECTION_REGEX);
      const courseMatch = slotBlock.match(COURSE_CODE_REGEX);
      const roomMatch = slotBlock.match(ROOM_REGEX);
      const teacherPrefixMatch = slotBlock.match(TEACHER_PREFIX_REGEX);

      const sectionName = secMatch ? secMatch[1].replace(/(\d)([A-L])/i, '$1-$2').toUpperCase() : 'BSCS-1A';
      const courseCode = courseMatch ? courseMatch[1].replace(/\s+/g, '-').toUpperCase() : 'CS-101';
      const roomNumber = roomMatch ? roomMatch[1].replace(/\s+/g, '-').toUpperCase() : 'LH-01';
      const teacherName = teacherPrefixMatch ? teacherPrefixMatch[0].trim() : 'Faculty Member';

      items.push({
        dayOfWeek: currentDay,
        startTime,
        endTime,
        courseCode,
        courseTitle: `Course ${courseCode}`,
        sectionName,
        roomNumber,
        teacherName,
      });
    }
    return items;
  }

  return items;
}

/**
 * Main export: Import Timetable from Word (.doc or .docx) file
 */
export async function importTimetableFromWord(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const fileBuffer = fs.readFileSync(filePath);

  console.log(`[Word Import] Processing file: ${filePath} (${fileBuffer.length} bytes, ext: ${ext})`);

  let items = [];

  if (ext === '.docx') {
    const { rawText, html } = await extractDocxData(fileBuffer);

    // Strategy A: Parse HTML tables if present (best for Word tables)
    if (html && html.includes('<table')) {
      const tableRows = parseHtmlTables(html);
      console.log(`[Word Import] Found ${tableRows.length} table rows in .docx HTML`);
      items = extractFromTableRows(tableRows);
    }

    // Strategy B: Fall back to raw text lines if table parsing yielded no slots
    if (items.length === 0 && rawText) {
      console.log('[Word Import] Fallback to raw text line parsing...');
      items = extractFromTextLines(rawText);
    }
  } else {
    // .doc (Word 97-2003 binary format)
    const rawText = extractDocText(fileBuffer);
    console.log(`[Word Import] Extracted ${rawText.length} characters from .doc file`);
    items = extractFromTextLines(rawText);
  }

  console.log(`[Word Import] Extracted ${items.length} timetable slot candidates`);

  if (items.length === 0) {
    throw new Error(
      'No timetable slots detected in this Word file. ' +
      'Please ensure the file contains class times (e.g., 08:30 - 10:00), Days (e.g., Monday), Course Codes (e.g., CS-101), and Sections (e.g., BSCS-1A). ' +
      'You can also download the sample CSV template from the dashboard for a guaranteed structure.'
    );
  }

  return processTimetableEntries(items);
}
