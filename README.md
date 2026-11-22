# University of Sahiwal (UOS) – Attendance Portal Mobile App
### **High-Security Campus Wi-Fi & Biometric Faculty Attendance System**
*Engineered & Developed by **Muhammad Zaeem** & **Muhammad Saif Ullah***

[![App Platform](https://img.shields.io/badge/Platform-React%20Native%20%7C%20Expo%20SDK%2058-blue.svg)]()
[![Backend API](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express%20%7C%20Prisma%20SQLite-emerald.svg)]()
[![Campus Fence](https://img.shields.io/badge/Security-Campus%20Wi--Fi%20Gatekeeper-darkgreen.svg)]()
[![Biometrics](https://img.shields.io/badge/Biometrics-Thumbprint%20%26%20Face%20ID-amber.svg)]()
[![Android Target](https://img.shields.io/badge/Android%20Target-SDK%2036%20(Android%2015)-green.svg)]()

---

## 1. Executive Summary & Purpose

The **University of Sahiwal (UOS) Attendance Portal Mobile App** is an enterprise-grade mobile application designed to eliminate proxy attendance, enforce faculty punctuality, and streamline classroom attendance marking using the instructor's personal smartphone.

### The Fundamental Problems Solved:
1. **Proxy Attendance Prevention**: Attendance submission is strictly locked unless the instructor's device is physically connected to authorized **University Campus Wi-Fi** subnets.
2. **Zero Extra Hardware Costs**: Replaces expensive, failure-prone classroom fingerprint machines by leveraging the native biometric sensors (**Thumbprint / Touch ID / Face ID**) already built into teachers' smartphones.
3. **Automated Cutoff & Lockout**: Classes automatically lock if a teacher is late beyond the allowed window. Unlocking requires a formal academic override request reviewed and approved by the Department Head (HOD).
4. **Dual Atomic Certification**: A single tap atomically records both the student roster and certifies the instructor's physical presence on campus with an immutable audit log.

---

## 2. Official Design Language & Palette

The application strictly implements the University of Sahiwal portal design specifications:

| Component | Color Hex | Visual Purpose |
|:---|:---|:---|
| **Deep Forest Green** | `#0a4d36` | Curved top header cards, primary buttons, active present `[ P ]` toggle |
| **Golden Amber** | `#f2b737` | University badge, "Confirm & Submit" button, avatar circles, active late `[ L ]` toggle |
| **Mint Green** | `#e6f7ef` / `#065f46` | "Open now" status pills, "Mark all present" button, active approval chips |
| **Crimson Red** | `#fee2e2` / `#dc2626` | "Locked (late)" status pills, active absent `[ A ]` toggle, reject buttons |
| **Clean Background** | `#f8fafc` | Soft, modern card surfaces and segmented roster containers |

---

## 3. Core Mobile Application Modules

### 👩‍🏫 Teacher / Lecturer Module
1. **Public Faculty Login (`LoginScreen.js`)**:
   - Clean curved header with golden UoS badge.
   - Real-time **Campus Wi-Fi indicator pill** (`🟢 Connected` / `🟠 External Data`).
   - Standard password sign-in and instant **Fingerprint / Face ID** biometric entry.
   - 1-click test login chips for rapid faculty demonstration.

2. **Weekly Timetable Schedule (`TeacherDashboardScreen.js`)**:
   - **Monday to Friday Calendar Selector**: Horizontal day pills (`Mon 17`, `Tue 18`, `Wed 19`, `Thu 20`, `Fri 21`) allowing teachers to preview their classes for any day of the week.
   - **Real-Time Class Cards**:
     - `Open now` (Mint green badge, closes in countdown timer, "Mark attendance →" button).
     - `Locked (late)` (Crimson badge, late duration calculator, "Request override from HOD" button).
     - `Upcoming` (Amber badge, scheduled start time).
     - `✓ Completed` (Sky badge, certified records summary).

3. **Student Roster Marking (`MarkAttendanceScreen.js`)**:
   - Quick student search by name or roll number.
   - Fast batch actions: **"Mark all present"** and **"Mark all absent"**.
   - **3-Way Segmented Toggle `[ P ] [ A ] [ L ]`**:
     - `[ P ]`: Deep Forest Green (`#0a4d36`)
     - `[ A ]`: Crimson Red (`#dc2626`)
     - `[ L ]`: Golden Amber (`#f2b737`)
   - Sticky footer with Golden Amber **"Confirm & submit attendance"** button.
   - Biometric modal prompting Fingerprint / Face ID scan before cryptographic transmission to the university server.

4. **Late Arrival Request Engine (`TeacherRequestScreen.js`)**:
   - Quick Reason Chips: *Power outage in academic block*, *Traffic delay*, *Lab equipment setup*, *Extended previous lecture*.
   - Slot picker and custom justification text box.
   - Live Request Tracker displaying real-time HOD decisions (`⏳ Pending`, `🟢 Approved`, `🔴 Rejected`).

5. **Historical Registers & Dossiers (`HistoryScreen.js` & `TeacherRecordScreen.js`)**:
   - Segmented view toggling between **Submitted Registers** and **Sent Override Requests**.
   - Chronological date-wise breakdown showing conducted classes, on-time punctuality rate, and biometric audit stamps.

---

### 👨‍💼 HOD & Department Administration Module
1. **HOD Personal Teaching Classes (`HodClassesScreen.js`)**:
   - Shows the HOD's own postgraduate (MPhil/PhD) teaching timetable with Monday to Friday calendar selection.
   - Enables the HOD to mark their own classroom registers.

2. **Department Overview & Override Approvals (`HodOverviewScreen.js`)**:
   - Live KPI stat boxes: Marked classes, Locked classes, Pending override requests.
   - Department punctuality progress bar (e.g. *91% on-time classes*).
   - Instant **Approve** (solid green) and **Reject** (outlined red) action controls with review notes.

3. **Faculty Directory & Individual Attendance Dossiers (`HodFacultyScreen.js`)**:
   - Complete department faculty roster with designations, emails, employee IDs, and weekly scheduled hours.
   - Tapping any teacher opens their **complete date-wise submitted attendance chronicle** with present/absent breakdowns and biometric stamps.

4. **Smart Timetable Engine & Versioning (`HodTimetableManagerScreen.js`)**:
   - **Direct File Upload (No Manual Writing Required)**: Upload timetable files directly (`.csv`, `.pdf`, `.doc`, `.docx`) picked from device storage using `expo-document-picker`.
   - **Smart Teacher Reassignment**: If an assigned instructor changed in the new timetable, the system automatically detects and updates the slot.
   - **Safe Historical Archiving**: Past timetable data and historical attendance records are **100% preserved** in the archive.
   - **Visual Distinction Badges**: Clear badges on every class (`[🟢 Active v2.0]` vs `[📁 Archived v1.0]`) distinguish current sessions from archived semesters.

5. **Class Student Roster Import (`MarkAttendanceScreen.js`)**:
   - Teachers can import / share their class student list (`.csv`, `.txt`, Excel-exported roster) directly on the attendance screen.
   - Includes columns for **Roll Number**, **Student Name**, **Class / Degree**, **Section**, and **Academic Session / Batch**.
   - Automatically provisions student accounts, binds them to the section and class slot, and immediately populates the live attendance register.

---

## 4. Project Directory Structure

```
├── mobile/                        # React Native / Expo SDK 58 Mobile Application
│   ├── assets/                    # App icons, splash screens, favicon
│   ├── src/
│   │   ├── api/                   # Axios client with JWT interceptor & server switcher
│   │   ├── context/               # AuthContext & real-time campus Wi-Fi state
│   │   └── screens/               # Mobile screens
│   │       ├── LoginScreen.js                 # Faculty login & biometrics
│   │       ├── TeacherDashboardScreen.js      # Mon-Fri schedule & class cards
│   │       ├── MarkAttendanceScreen.js        # Roster with [P][A][L] segmented toggles
│   │       ├── HistoryScreen.js               # Submitted registers & sent requests
│   │       ├── TeacherRequestScreen.js        # Late override submission to HOD
│   │       ├── TeacherRecordScreen.js         # Date-wise faculty academic dossier
│   │       ├── HodClassesScreen.js            # HOD teaching timetable
│   │       ├── HodOverviewScreen.js           # Department stats & approvals
│   │       ├── HodFacultyScreen.js            # Faculty directory & individual dossiers
│   │       └── HodTimetableManagerScreen.js   # Timetable paste import & versioning
│   ├── App.js                     # Tab navigation & role-based routing
│   ├── app.json                   # Expo config (package: pk.edu.uosahiwal.attendance)
│   └── package.json
│
├── backend/                       # Node.js Express REST API & Database
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema (User, TimetableSlot, AttendanceSession, etc.)
│   │   └── dev.db                 # SQLite database engine
│   ├── src/
│   │   ├── config/                # Database client & faculty credentials
│   │   ├── controllers/           # Auth, attendance, timetable, admin controllers
│   │   ├── middlewares/           # JWT auth & IP campus subnet fencing
│   │   ├── routes/                # Express API routes
│   │   ├── services/              # Lock engine, bulk import, PDF parser
│   │   ├── utils/                 # Subnet calculation & IP validation
│   │   ├── app.js                 # Express application definition
│   │   └── server.js              # HTTP server entry point
│   ├── package.json
│   └── Faculty_Official_Credentials.csv # Pre-configured faculty accounts
│
└── README.md                      # Primary project documentation
```

---

## 5. Quick Start & Setup Guide

### Prerequisites
- Node.js (v18 or higher)
- Expo Go app on your physical Android / iOS device (or Android Emulator)

### Step 1: Start the Backend REST API
Open a terminal:
```powershell
cd backend
npm install
npm start
```
The server will start listening on `http://localhost:5000` and output the authorized campus CIDR subnets.

### Step 2: Start the Expo Mobile App
Open a second terminal:
```powershell
cd mobile
npm install
npx expo start -c
```
1. Scan the displayed QR Code with the **Expo Go** app on your phone.
2. Ensure your phone and computer are on the same Wi-Fi network.
3. If using an Android Emulator, set the server IP to `http://10.0.2.2:5000/api` on the login screen.

---

## 6. Pre-Configured Test Accounts

| Role | Name | Username | Password | Notes |
|:---|:---|:---|:---|:---|
| **Teacher** | Dr. Farooq Aziz | `dr.farooq` | `farooq123` | 9 scheduled classes, Physics Dept |
| **Teacher** | Ms. Misbah | `ms.misbah` | `misbah123` | 6 scheduled classes, Physics Dept |
| **HOD** | Dr. M. Asif Nawaz | `dr.asif` | `asif123` | Head of Physics, 11 teaching classes |
| **Master Admin** | Muhammad Zaeem | `zaeem` | `zaeem123` | System Developer & Master Control |
| **Master Admin** | Muhammad Saif Ullah | `saif` | `saif123` | System Developer & Master Control |

---

## 7. Google Play Store Readiness

The mobile application is fully configured for Google Play Console submission:
- **Package Name**: `pk.edu.uosahiwal.attendance`
- **Version**: `1.0.0` (VersionCode: `1`)
- **Permissions**: Network state, Camera (optional biometric face recognition), Fingerprint hardware (`android.permission.USE_BIOMETRIC`).
- **Android Target**: Min SDK `24` (Android 7.0), Target SDK `36` (Android 15 ready).
- **Network Security**: Strict HTTPS enforcement for production endpoints with LAN HTTP permitted for internal development.

---

## 8. License & Intellectual Property

Designed, architected, and built specifically for the **University of Sahiwal (UOS)** by **Muhammad Zaeem** and **Muhammad Saif Ullah**. All rights reserved.

