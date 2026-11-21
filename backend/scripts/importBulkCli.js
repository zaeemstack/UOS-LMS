import path from 'path';
import fs from 'fs';
import {
  importTeachersFromCsv,
  importStudentsFromCsv,
  importTimetableFromCsv,
} from '../src/services/bulkImportService.js';

async function runCliImport() {
  console.log('=====================================================');
  console.log(' UOS Attendance: High-Speed University Bulk Importer');
  console.log('=====================================================');

  const dataDir = path.resolve('data');
  const templateDir = path.resolve('templates');

  // Check for teachers file
  const teachersFile = [
    path.join(dataDir, 'teachers.csv'),
    path.join(templateDir, 'teachers_sample.csv'),
  ].find((f) => fs.existsSync(f));

  // Check for students file
  const studentsFile = [
    path.join(dataDir, 'students.csv'),
    path.join(templateDir, 'students_sample.csv'),
  ].find((f) => fs.existsSync(f));

  // Check for timetable file
  const timetableFile = [
    path.join(dataDir, 'timetable.csv'),
    path.join(templateDir, 'timetable_sample.csv'),
  ].find((f) => fs.existsSync(f));

  if (teachersFile) {
    console.log(`\n[1/3] Importing Teachers from: ${teachersFile}...`);
    const start = Date.now();
    const res = await importTeachersFromCsv(teachersFile);
    console.log(` -> Imported ${res.imported} of ${res.total} teachers in ${(Date.now() - start) / 1000}s`);
    if (res.errors.length) console.warn(` -> Encountered ${res.errors.length} skipped rows.`);
  }

  if (studentsFile) {
    console.log(`\n[2/3] Importing Students from: ${studentsFile}...`);
    const start = Date.now();
    const res = await importStudentsFromCsv(studentsFile);
    console.log(` -> Imported ${res.imported} of ${res.total} students in ${(Date.now() - start) / 1000}s`);
    if (res.errors.length) console.warn(` -> Encountered ${res.errors.length} skipped rows.`);
  }

  if (timetableFile) {
    console.log(`\n[3/3] Importing Timetable Slots from: ${timetableFile}...`);
    const start = Date.now();
    const res = await importTimetableFromCsv(timetableFile);
    console.log(` -> Imported ${res.imported} of ${res.total} timetable slots in ${(Date.now() - start) / 1000}s`);
    if (res.errors.length) console.warn(` -> Encountered ${res.errors.length} skipped rows.`);
  }

  console.log('\n=====================================================');
  console.log(' Bulk Data Ingestion Complete!');
  console.log('=====================================================');
  process.exit(0);
}

runCliImport().catch((err) => {
  console.error('Fatal import error:', err);
  process.exit(1);
});
