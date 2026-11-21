import fs from 'fs';
import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';

// Polyfills required for pdf-parse / pdfjs-dist in headless Node.js
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {};
}
if (typeof globalThis.ImageData === 'undefined') {
  globalThis.ImageData = class ImageData {};
}
if (typeof globalThis.Path2D === 'undefined') {
  globalThis.Path2D = class Path2D {};
}

let cachedDefaultPasswordHash = null;
async function getDefaultPasswordHash() {
  if (!cachedDefaultPasswordHash) {
    cachedDefaultPasswordHash = await bcrypt.hash('password123', 10);
  }
  return cachedDefaultPasswordHash;
}

const VALID_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

// Day coordinate bands in aSc Timetables (points from bottom y=0 to top y=595)
const ASC_DAYS = [
  { name: 'MONDAY', yMin: 403, yMax: 498 },
  { name: 'TUESDAY', yMin: 310, yMax: 403 },
  { name: 'WEDNESDAY', yMin: 216, yMax: 310 },
  { name: 'THURSDAY', yMin: 122, yMax: 216 },
  { name: 'FRIDAY', yMin: 25, yMax: 122 }
];

// Period columns in aSc Timetables (x coordinate bands)
const ASC_PERIODS = [
  { period: 1, startTime: '08:00', endTime: '09:00', xMin: 80, xMax: 142 },
  { period: 2, startTime: '09:00', endTime: '10:00', xMin: 142, xMax: 200 },
  { period: 3, startTime: '10:00', endTime: '11:00', xMin: 200, xMax: 257 },
  { period: 4, startTime: '11:00', endTime: '12:00', xMin: 257, xMax: 315 },
  { period: 5, startTime: '12:00', endTime: '13:00', xMin: 315, xMax: 372 },
  { period: 6, startTime: '13:00', endTime: '14:00', xMin: 372, xMax: 430 },
  { period: 7, startTime: '14:00', endTime: '15:00', xMin: 430, xMax: 487 },
  { period: 8, startTime: '15:00', endTime: '16:00', xMin: 487, xMax: 545 },
  { period: 9, startTime: '16:00', endTime: '17:00', xMin: 545, xMax: 602 },
  { period: 10, startTime: '17:00', endTime: '18:00', xMin: 602, xMax: 660 },
  { period: 11, startTime: '18:00', endTime: '19:00', xMin: 660, xMax: 717 },
  { period: 12, startTime: '19:00', endTime: '20:00', xMin: 717, xMax: 780 }
];

function isRoomText(str) {
  return /\b\d+\.[G\d]+\.[\w-]+|\bSeminar Hall|\bHALL-?\d+|\bLH-?\d+|\bLab\b/i.test(str);
}

function normalizeTeacherName(rawName) {
  if (!rawName || rawName.toLowerCase().includes('faculty member')) return 'Faculty Member';
  let clean = rawName.replace(/\s+/g, ' ').trim();
  clean = clean.replace(/Muhamma\s+d/gi, 'Muhammad');
  clean = clean.replace(/parmal/gi, 'Parvez');
  clean = clean.replace(/HUSSIAN/gi, 'Hussain');

  return clean.split(' ').map(part => {
    if (/^(dr|mr|ms|mrs|prof)\.?$/i.test(part)) {
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase().replace(/\.$/, '') + '.';
    }
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }).join(' ');
}

function generateCourseCode(subjectTitle, sectionName = 'CS') {
  const deptPrefix = sectionName.startsWith('IT') ? 'IT' : sectionName.startsWith('SE') ? 'SE' : 'CS';
  const codeMatch = subjectTitle.match(/\b([A-Z]{2,5}[-\s]?\d{3,4}[A-Z]?)\b/i);
  if (codeMatch) return codeMatch[1].replace(/\s+/g, '-').toUpperCase();

  if (/Zero Math/i.test(subjectTitle)) return 'MATH-001';

  const clean = subjectTitle.replace(/\([^)]*\)/g, '').replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
  const words = clean.split(/\s+/).filter(w => !['and', 'of', '&', 'for', 'in', 'to', 'the', 'a', 'an'].includes(w.toLowerCase()));
  const initials = words.map(w => w[0].toUpperCase()).join('');
  return `${deptPrefix}-${initials.slice(0, 6) || '101'}`;
}

function parseCellByClusters(cellItems) {
  if (!cellItems || cellItems.length === 0) return null;

  const clusters = [];
  let currentCluster = [cellItems[0]];

  for (let i = 1; i < cellItems.length; i++) {
    const prev = cellItems[i - 1];
    const curr = cellItems[i];
    if (prev.y - curr.y >= 10.5) {
      clusters.push(currentCluster);
      currentCluster = [curr];
    } else {
      currentCluster.push(curr);
    }
  }
  clusters.push(currentCluster);

  let subject = '', teacher = '', room = '';
  if (clusters.length >= 3) {
    subject = clusters[0].map(it => it.str).join(' ');
    teacher = clusters.slice(1, clusters.length - 1).map(c => c.map(it => it.str).join(' ')).join(' ');
    room = clusters[clusters.length - 1].map(it => it.str).join(' ');
  } else if (clusters.length === 2) {
    const firstStr = clusters[0].map(it => it.str).join(' ');
    const secondStr = clusters[1].map(it => it.str).join(' ');
    if (isRoomText(secondStr)) {
      subject = firstStr;
      teacher = 'Faculty Member';
      room = secondStr;
    } else {
      subject = firstStr;
      teacher = secondStr;
      room = 'Academic Block';
    }
  } else if (clusters.length === 1) {
    subject = clusters[0].map(it => it.str).join(' ');
    teacher = 'Faculty Member';
    room = 'Academic Block';
  }

  teacher = normalizeTeacherName(teacher);
  subject = subject.replace(/\s+/g, ' ').trim();
  room = room.replace(/\s+/g, ' ').trim();

  return { subject, teacher, room };
}

/**
 * High-accuracy aSc Timetables parser (Page-by-page grid extraction)
 */
async function parseAscTimetable(parser, defaultPassword, defaultDeptId, deptMap, courseMap, sectionMap, roomMap, teacherNameMap) {
  const numPages = parser.doc.numPages;
  console.log(`[PDF Import - aSc Parser] Detected aSc Timetables format across ${numPages} pages.`);

  let importedCount = 0;
  const errors = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    try {
      const page = await parser.doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = textContent.items
        .filter(it => it.str && it.str.trim().length > 0)
        .map(it => ({
          str: it.str.trim(),
          x: Math.round(it.transform[4] * 10) / 10,
          y: Math.round(it.transform[5] * 10) / 10
        }));

      // Find section item near header
      const secItem = items.find(it => it.y > 540 && it.str !== 'Hamza' && !it.str.includes('Timetable'));
      const rawSection = secItem ? secItem.str : `Section P${pageNum}`;
      // Clean up e.g. "CS-BS.CS 1 A SS" -> "CS 1 A"
      const cleanSection = rawSection.replace(/^CS-BS\./i, '').replace(/\s+SS$/i, '').trim() || `P${pageNum}`;

      // Find or create Section
      let sectionId = sectionMap.get(cleanSection.toUpperCase().replace(/\s+/g, '-'));
      if (!sectionId) {
        const semMatch = cleanSection.match(/(\d+)/);
        const semNum = semMatch ? Math.min(Math.max(parseInt(semMatch[1], 10), 1), 8) : 1;

        let deptId = defaultDeptId;
        if (cleanSection.startsWith('IT') && deptMap.has('IT')) deptId = deptMap.get('IT');
        if (cleanSection.startsWith('SE') && deptMap.has('SE')) deptId = deptMap.get('SE');

        const newSec = await prisma.section.create({
          data: {
            name: cleanSection,
            semester: semNum,
            academicYear: '2025-2026',
            departmentId: deptId,
          },
        });
        sectionMap.set(cleanSection.toUpperCase().replace(/\s+/g, '-'), newSec.id);
        sectionId = newSec.id;
      }

      for (const day of ASC_DAYS) {
        for (const p of ASC_PERIODS) {
          const cellItems = items
            .filter(it => it.x >= p.xMin && it.x < p.xMax && it.y >= day.yMin && it.y < day.yMax)
            .sort((a, b) => b.y - a.y);

          if (cellItems.length === 0) continue;

          const parsed = parseCellByClusters(cellItems);
          if (!parsed || !parsed.subject) continue;

          // 1. Room
          const roomKey = parsed.room.toUpperCase().replace(/\s+/g, '-');
          let roomId = roomMap.get(roomKey);
          if (!roomId) {
            const building = parsed.room.toLowerCase().includes('hall') ? 'Seminar Block' : 'Academic Block';
            const newRoom = await prisma.room.create({
              data: { roomNumber: parsed.room, building, floor: 1 },
            });
            roomMap.set(roomKey, newRoom.id);
            roomId = newRoom.id;
          }

          // 2. Course
          const courseCode = generateCourseCode(parsed.subject, cleanSection);
          const courseKey = courseCode.toUpperCase();
          let courseId = courseMap.get(courseKey);
          if (!courseId) {
            let deptId = defaultDeptId;
            if (cleanSection.startsWith('IT') && deptMap.has('IT')) deptId = deptMap.get('IT');
            if (cleanSection.startsWith('SE') && deptMap.has('SE')) deptId = deptMap.get('SE');

            const newCourse = await prisma.course.create({
              data: {
                code: courseCode,
                title: parsed.subject,
                creditHours: parsed.subject.toLowerCase().includes('lab') ? 1 : 3,
                departmentId: deptId,
              },
            });
            courseMap.set(courseKey, newCourse.id);
            courseId = newCourse.id;
          }

          // 3. Teacher
          const normTeacher = parsed.teacher.toLowerCase().replace(/[^a-z0-9]/g, '');
          let teacher = teacherNameMap.get(normTeacher);
          if (!teacher) {
            const emailSlug = parsed.teacher.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
            const teacherEmail = `${emailSlug}@uos.edu.pk`;

            let deptId = defaultDeptId;
            if (cleanSection.startsWith('IT') && deptMap.has('IT')) deptId = deptMap.get('IT');
            if (cleanSection.startsWith('SE') && deptMap.has('SE')) deptId = deptMap.get('SE');

            teacher = await prisma.user.upsert({
              where: { email: teacherEmail },
              update: { fullName: parsed.teacher, departmentId: deptId },
              create: {
                email: teacherEmail,
                fullName: parsed.teacher,
                employeeOrRollId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
                passwordHash: defaultPassword,
                role: 'TEACHER',
                departmentId: deptId,
              },
            });
            teacherNameMap.set(normTeacher, teacher);
          }

          // 4. Create Timetable Slot
          await prisma.timetableSlot.create({
            data: {
              dayOfWeek: day.name,
              startTime: p.startTime,
              endTime: p.endTime,
              courseId,
              sectionId,
              roomId,
              teacherId: teacher.id,
            },
          });

          importedCount++;
        }
      }
    } catch (pageErr) {
      errors.push({ page: pageNum, error: pageErr.message });
    }
  }

  return {
    total: importedCount,
    imported: importedCount,
    errors: errors.slice(0, 10),
  };
}

/**
 * Fallback / Generic PDF Timetable parser for unformatted or tabular stream PDFs
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

  if (isPM && hour < 12) hour += 12;
  if (isAM && hour === 12) hour = 0;

  if (!isPM && !isAM) {
    if (hour >= 1 && hour <= 6) {
      hour += 12;
    } else if (isEndTime && startTimeStr) {
      const startHour = parseInt(startTimeStr.split(':')[0], 10);
      if (hour < startHour && hour <= 11) {
        hour += 12;
      }
    }
  }

  return `${String(hour).padStart(2, '0')}:${min}`;
}

const TIME_REGEX = /(\d{1,2}:\d{2})\s*(?:AM|PM)?\s*(?:-|–|—|to|\/)\s*(\d{1,2}:\d{2})\s*(?:AM|PM)?/i;
const SECTION_REGEX = /\b((?:BS|MS|MCS|MSc)?[A-Z]{2,5}[-\s]?(?:1st|2nd|3rd|4th|5th|6th|7th|8th|\d{1,2})[-\s]?[A-Z]?)\b/i;
const COURSE_CODE_REGEX = /\b([A-Z]{2,5}[-\s]?\d{3,4}[A-Z]?)\b/i;
const ROOM_REGEX = /\b(LH[-\s]?\d+|Lab[-\s]?\d+|Room[-\s]?\d+|Hall[-\s]?[A-Z0-9]+|CL[-\s]?\d+|LT[-\s]?\d+|Auditorium)\b/i;
const TEACHER_PREFIX_REGEX = /(?:Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.|Engr\.|Lect\.)\s+([A-Za-z][A-Za-z\s.]{2,30})/i;

/**
 * Main PDF Import Entry Point
 */
export async function importTimetableFromPdf(filePath) {
  const pdfBuffer = fs.readFileSync(filePath);
  const defaultPassword = await getDefaultPasswordHash();

  // Load Department, Course, Section, Room, Teacher lookups
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

  // Attempt aSc Timetables coordinate extraction via pdf-parse v2
  try {
    const pdfParseModule = await import('pdf-parse');
    if (pdfParseModule && typeof pdfParseModule.PDFParse === 'function') {
      const parser = new pdfParseModule.PDFParse(new Uint8Array(pdfBuffer));
      await parser.load();

      if (parser.doc && parser.doc.numPages > 0) {
        // Inspect first page to see if it's an aSc Timetables document
        const page1 = await parser.doc.getPage(1);
        const textContent = await page1.getTextContent();
        const hasAscMarker = textContent.items.some(
          it => it.str && (it.str.includes('aSc Timetables') || it.str.includes('Timetable generated'))
        );

        if (hasAscMarker) {
          return await parseAscTimetable(
            parser,
            defaultPassword,
            defaultDeptId,
            deptMap,
            courseMap,
            sectionMap,
            roomMap,
            teacherNameMap
          );
        }
      }
    }
  } catch (ascErr) {
    console.warn('[PDF Import] aSc coordinate parser check skipped/failed:', ascErr.message);
  }

  // Fallback: Generic text stream extraction
  let rawText = '';
  try {
    const pdfParseModule = await import('pdf-parse');
    if (pdfParseModule && typeof pdfParseModule.PDFParse === 'function') {
      const parser = new pdfParseModule.PDFParse(new Uint8Array(pdfBuffer));
      await parser.load();
      const res = await parser.getText();
      rawText = res?.text || '';
    }
  } catch (_) {}

  const globalTimeRegex = new RegExp(TIME_REGEX.source, 'gi');
  const timeMatches = [...rawText.matchAll(globalTimeRegex)];

  if (timeMatches.length === 0) {
    throw new Error(
      'No timetable slots detected in this PDF. ' +
      'Please ensure the PDF contains times (e.g. 08:30 - 10:00), Days (e.g. Monday), Course Codes, and Sections.'
    );
  }

  let currentDay = 'MONDAY';
  let importedCount = 0;
  const errors = [];

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

    try {
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
      const teacherName = teacherPrefixMatch ? normalizeTeacherName(teacherPrefixMatch[0]) : 'Faculty Member';

      // Course
      let courseId = courseMap.get(courseCode);
      if (!courseId) {
        const newCourse = await prisma.course.create({
          data: {
            code: courseCode,
            title: `Course ${courseCode}`,
            creditHours: 3,
            departmentId: defaultDeptId,
          },
        });
        courseMap.set(courseCode, newCourse.id);
        courseId = newCourse.id;
      }

      // Section
      let sectionId = sectionMap.get(sectionName);
      if (!sectionId) {
        const semMatch = sectionName.match(/(\d+)/);
        const semNum = semMatch ? Math.min(Math.max(parseInt(semMatch[1], 10), 1), 8) : 1;

        const newSec = await prisma.section.create({
          data: {
            name: sectionName,
            semester: semNum,
            academicYear: '2025-2026',
            departmentId: defaultDeptId,
          },
        });
        sectionMap.set(sectionName, newSec.id);
        sectionId = newSec.id;
      }

      // Room
      let roomId = roomMap.get(roomNumber);
      if (!roomId) {
        const newRoom = await prisma.room.create({
          data: { roomNumber, building: 'Academic Block', floor: 1 },
        });
        roomMap.set(roomNumber, newRoom.id);
        roomId = newRoom.id;
      }

      // Teacher
      const normName = teacherName.toLowerCase().replace(/[^a-z0-9]/g, '');
      let teacher = teacherNameMap.get(normName);
      if (!teacher) {
        const emailSlug = teacherName.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
        const teacherEmail = `${emailSlug}@uos.edu.pk`;

        teacher = await prisma.user.upsert({
          where: { email: teacherEmail },
          update: { fullName: teacherName, departmentId: defaultDeptId },
          create: {
            email: teacherEmail,
            fullName: teacherName,
            employeeOrRollId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
            passwordHash: defaultPassword,
            role: 'TEACHER',
            departmentId: defaultDeptId,
          },
        });
        teacherNameMap.set(normName, teacher);
      }

      // Create Timetable Slot
      await prisma.timetableSlot.create({
        data: {
          dayOfWeek: currentDay,
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
      errors.push({ block: slotBlock.slice(0, 50), error: err.message });
    }
  }

  return {
    total: timeMatches.length,
    imported: importedCount,
    errors: errors.slice(0, 10),
  };
}
