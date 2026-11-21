# Network-Fenced & Router-Geofenced Academic Attendance Management System
### **University of Sahiwal (UOS)**
*Developed & Powered by **Muhammad Zaeem** and **Muhammad Saif Ullah***

[![System Status](https://img.shields.io/badge/System-Online-emerald.svg)]()
[![Campus Fence](https://img.shields.io/badge/Perimeter%20Gatekeeper-Active-blue.svg)]()
[![Router Geofence](https://img.shields.io/badge/Classroom%20Geofence-Enforced-indigo.svg)]()
[![Biometrics](https://img.shields.io/badge/WebAuthn%20Biometrics-Native%20Hardware-amber.svg)]()
[![Offline LAN](https://img.shields.io/badge/Network-100%25%20Offline%20Intranet-purple.svg)]()

---

## 1. Executive Summary & Purpose

The **University of Sahiwal Attendance Management System** is a next-generation, high-security academic portal engineered to solve proxy attendance, unauthorized remote logins, and teacher punctuality challenges across university campuses.

### The Fundamental Problem in Traditional Attendance Systems:
1. **Proxy Attendance**: Students mark attendance for absent friends, or teachers log in from home, car parking, or faculty cafeterias and mark classes without being physically inside the classroom.
2. **Fragile Cloud Dependency**: Most traditional systems rely on public cloud servers. If the university's external internet connection drops or PERN fiber is cut, attendance halts entirely.
3. **Expensive Biometric Hardware**: Installing specialized biometric fingerprint machines in 100+ classrooms costs millions of rupees, requires tedious cabling, and breaks down constantly.

### Our Solution:
- **100% Offline University Intranet Operation**: The entire system is hosted locally inside the University campus server connected to the core LAN switch. It functions flawlessly without needing external public internet.
- **2-Tier Network Perimeter & Micro-Geofencing**: Inspects requests at the campus boundary (CIDR subnets) and down to the specific classroom Wi-Fi Access Point (Router IP/MAC/Subnet).
- **Zero-Cost Native Hardware Biometrics**: Leverages the teacher's smartphone native biometric hardware (Fingerprint / TouchID / Face Unlock) via WebAuthn, eliminating external biometric hardware costs.
- **Automated Late-Lockout Engine**: Restricts attendance marking strictly to scheduled class hours ($\pm 15$ minutes). Classes automatically lock if a teacher is $>15$ minutes late, requiring an audited HOD/Admin unlock request.
- **Dual Attendance Certification**: A single submission atomically records both the student roster and certifies the teacher's presence with an immutable audit log.

---

## 2. Developer & Master Admin Credentials

The system comes pre-configured with Master Administrator credentials for both system developers:

| Developer Name | Designation | Login Username / Email | Password | Privileges |
|:---|:---|:---|:---|:---|
| **Muhammad Zaeem** | Lead System Developer & Master Admin | `zaeem@uosahiwal.edu.pk` *or* `zaeem` | `zaeem123` | Full Master Control, Live Monitoring, Timetable Scheduler, Router Geofencing, Bulk Data Ingestion |
| **Muhammad Saif Ullah** | Lead System Developer & Master Admin | `saif@uosahiwal.edu.pk` *or* `saif` | `saif123` | Full Master Control, Live Monitoring, Timetable Scheduler, Router Geofencing, Bulk Data Ingestion |

> **Note**: Developers can log in by typing their full university email OR simply typing their username (`zaeem` or `saif`) in the login field. 1-click Quick Login buttons are also provided on the login page.

---

## 3. The 5 Core Security Pillars: How It Works

```
                                  [ CAMPUS NETWORK PERIMETER ]
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
     [ Request from Inside LAN ]                                   [ Request from Outside (Public IP) ]
   (10.0.0.0/8, 192.168.0.0/16, etc.)                                   (e.g., Home, 8.8.8.8)
                 │                                                             │
                 ▼                                                             ▼
    Pillar 1: Perimeter Passed                                      HTTP 403 Hard-Block Screen
                 │                                                  (Access Strictly Forbidden)
                 ▼
    Pillar 2: Classroom Router Geofence
   Is Teacher connected to Room 4.1.20's Router 52?
                 │
        ┌────────┴────────┐
        ▼                 ▼
     [ YES ]           [ NO ] ──► "Wrong Classroom Wi-Fi! Connect to Router 52"
        │
        ▼
    Pillar 3: Timetable Late-Lock Engine
   Is it within class start time ± 15 mins?
        │
        ┌────────┴────────┐
        ▼                 ▼
     [ YES ]           [ NO ] ──► Session Status: LOCKED_LATE (Requires HOD Unlock)
        │
        ▼
    Pillar 4: Native Hardware Fingerprint Scan
   Teacher scans phone fingerprint via WebAuthn
        │
        ▼
    Pillar 5: Dual Atomic Attendance Submission
   1. Student Roster Saved
   2. Teacher Presence Certified with Server Timestamp, AP IP & MAC
   3. Real-time WebSocket Broadcast to Admin Live Stream
```

---

### Pillar 1: Campus-Wide Perimeter Gatekeeper (IP Subnet Fencing)
- Every incoming HTTP and WebSocket request is intercepted by the `ipFenceMiddleware`.
- The client IP address is validated against university-approved internal CIDR subnets:
  - `10.0.0.0/8` (Campus Private Network)
  - `172.16.0.0/12` (Academic Internal Subnet)
  - `192.168.0.0/16` (Departmental Wi-Fi / LAN Subnets)
  - `127.0.0.1/32` & `::1/128` (Local Server / Loopback)
- **Hard-Block Barrier**: Any device connecting from outside the campus perimeter receives an immediate **HTTP 403 Forbidden** barrier screen (`CAMPUS_PERIMETER_RESTRICTION`). No academic data, timetable slots, or authentication endpoints can be accessed.
- **Continuous WebSocket Heartbeat**: An active 30-second ping/pong heartbeat continuously verifies network presence. If a teacher disconnects from campus Wi-Fi or leaves the premises, the portal automatically logs them out.

---

### Pillar 2: Classroom-Level Router Micro-Geofencing
Even within the university campus, a teacher sitting in the cafeteria or parking lot cannot mark attendance for a class in the Academic Block.
- Each classroom (`Room`) in the database is bound to its physical corridor/room Wi-Fi Access Point:
  - **Gateway IP** (e.g. `192.168.52.1`)
  - **Subnet Range** (e.g. `192.168.52.0/24`)
  - **Router MAC / BSSID** (e.g. `AA:BB:CC:52:00:01`)
  - **Wi-Fi SSID** (e.g. `UOS-Physics-52`)
- When a teacher attempts to open or submit an attendance session, `attendanceController.js` and `ipUtils.js` verify that the teacher's device IP belongs to that specific room's subnet (`isIpInRoomSubnet`).
- If mismatched, the system rejects attendance with code `ROOM_ROUTER_MISMATCH` and guides the teacher to connect to the correct classroom access point.

---

### Pillar 3: Native WebAuthn Hardware Biometrics (Anti-Proxy Lock)
To guarantee that the teacher themselves is physically holding the device (and hasn't handed their phone to a student representative):
- Built on the browser standard **W3C WebAuthn API** (`PublicKeyCredential`).
- When the teacher clicks **"Submit & Verify Attendance"**, a native biometric challenge is dispatched to the smartphone or laptop hardware.
- The phone pops up its native **Touch Fingerprint / Face ID** sensor dialog.
- Upon successful physical verification, a cryptographically signed biometric token is appended to the attendance session and permanently logged in the database (`biometricVerified: true`, `biometricType: 'WEBAUTHN_FINGERPRINT'`).
- Works **100% offline** without calling any external Google, Apple, or 3rd-party cloud biometric APIs.

---

### Pillar 4: Automated Timetable & Late-Entry Lock Engine
- Class schedules are mapped by Day of Week (`MONDAY` - `SUNDAY`), Start Time, End Time, Instructor, Course, Section, and Room.
- **On-Time Window**: Teachers can mark attendance from **15 minutes before class start** to **15 minutes after class start**.
- **Automated Late-Lockout**: If a teacher arrives more than 15 minutes after class starts, the lock engine automatically marks the class as `LOCKED_LATE`.
- **HOD / Admin Override Protocol**:
  1. The teacher submits a formal **Override Request** stating their justification (e.g. *"Lab equipment calibration delay"*).
  2. The Head of Department (HOD) or Admin reviews the request on their dashboard with timestamps and student counts.
  3. Upon approval, the session unlocks temporarily for attendance marking, and all decisions are recorded in the audit trail.

---

### Pillar 5: Dual Attendance Certification on Single Submission
When the teacher marks student attendance (Present, Absent, Late, Excused) and verifies their fingerprint:
- An atomic database transaction executes:
  1. Records individual student attendance records.
  2. Automatically records and certifies the **Teacher's own attendance** (`teacherStatus: 'PRESENT'`) with the exact server timestamp, client IP, router MAC, and biometric signature.
  3. Broadcasts a real-time event via WebSockets to the Admin Live Stream dashboard, instantly displaying the class as completed.

---

## 4. University Pilot Deployment: Physics Department

As per the university network topology provided by faculty, the initial pilot is deployed in the **Physics Department** across **3 classrooms**:

```
                       [ University Backbone / PERN ]
                                     │
                             [ Mikrotik Router ]
                                     │
                     [ Switch 1 (Manageable Central Switch) ]
                                     │
                     [ Campus Server (This Portal - LAN) ]
                                     │
                     [ Switch 2 (Wi-Fi PoE Switch) ]
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
       [ Router 52 (Corridor AP 1) ]           [ Router 56 (Dedicated AP 2) ]
        Subnet: 172.200.47.0/24 (Sample)        Subnet: 172.200.37.0/24 (Sample)
        Gateway IP: 172.x.x.x (Protected)       Gateway IP: 172.x.x.x (Protected)
        MAC: AA:BB:CC:52:XX:XX (Protected)      MAC: AA:BB:CC:56:XX:XX (Protected)
                 │                                       │
        ┌────────┴────────┐                              │
        ▼                 ▼                              ▼
  [ Room 4.1.20 ]   [ Room 4.1.21 ]                [ Room 4.1.4 ]
  (Physics Lab 1)   (Physics Lab 2)                (Lecture Hall 4)
```

### Pilot Room Configuration:
| Room No | Department | Access Point Name | Assigned Subnet | Gateway IP | Physical MAC |
|:---|:---|:---|:---|:---|:---|
| **`4.1.20`** | Department of Physics | **Router 52** (Physics AP - Corridor) | `172.200.47.0/24` | `Protected in Local DB` | `Protected in Local DB` |
| **`4.1.21`** | Department of Physics | **Router 52** (Shared AP - Corridor) | `172.200.47.0/24` | `Protected in Local DB` | `Protected in Local DB` |
| **`4.1.4`**  | Department of Physics | **Router 56** (Physics AP - Dedicated) | `172.200.37.0/24` | `Protected in Local DB` | `Protected in Local DB` |

> **Privacy & Security Note**: Real university network topology parameters, BSSIDs, and exact Gateway IP addresses are stored strictly in the server's private local database and are not committed to public version control.

---

## 5. Built-in Evaluator Testing Simulator

During project presentations, thesis defenses, or faculty evaluations, examiners may not be connected to physical routers 52 or 56.

To enable comprehensive live evaluation, a **Network Perimeter Simulator widget** is built directly into the Navigation Bar and the Blocked Screen:

| Simulation Mode | Simulated IP | Expected Behavior |
|:---|:---|:---|
| **Router 52 (Physics AP 1)** | Subnet Gateway IP | Allowed & Geofenced — Verifies Room `4.1.20` & `4.1.21` geofence as **MATCHED**. |
| **Router 56 (Physics AP 2)** | Subnet Gateway IP | Allowed & Geofenced — Verifies Room `4.1.4` geofence as **MATCHED**. |
| **General Campus Wi-Fi** | `10.12.1.45` | Allowed — Full access to campus intranet. |
| **Public Internet (Outside)** | `8.8.8.8` | **Blocked HTTP 403** — Displays the red perimeter restriction barrier. |
| **Reset to Real IP** | Client Device IP | Restores live physical IP detection. |

---

## 6. Roles & Capabilities (RBAC)

### 1. System Administrator (Developers / IT Directorate)
- **Live Campus Monitor**: Real-time status of every lecture scheduled across campus today (`ON_TIME`, `IN_PROGRESS`, `COMPLETED`, `LOCKED_LATE`).
- **Administrative Lock Override**: Instantly unlock any late or expired slot with an audit log reason.
- **Classroom Router Geofence Manager (Tab 6)**: Add, edit, auto-detect, or delete classroom routers, subnets, and MAC addresses.
- **User & Faculty Manager (Tab 3)**: Create new teachers, HODs, or students; delete accounts; reset passwords; export login credentials to CSV.
- **Master Timetable & Entity Scheduler (Tab 5)**: Add departments, courses, sections, and schedule weekly timetable slots.
- **High-Speed Bulk Ingestion**: Upload CSV or Word/PDF files to batch-import 300+ teachers, courses, or 100,000+ students in ~15 seconds.
- **Delinquency & Audit Reports (Tab 4)**: View faculty punctuality analytics and perimeter security violation logs.

### 2. Head of Department (HOD)
- **Department-Scoped View**: Automatically scoped to their department (e.g. Physics, Computer Science).
- **Override Request Review**: Review pending attendance unlock requests submitted by departmental teachers with 1-click Approve / Reject.
- **Faculty Roster**: Monitor punctuality and submission records of departmental teachers.

### 3. Teacher / Faculty Member
- **Today's Classes**: View scheduled lecture slots for the current day.
- **Router Geofence Indicator**: Live badge showing connected router status (Green = Verified, Red = Wrong AP).
- **Interactive Student Roster**: Mark students as Present, Absent, Late, or Excused with quick-fill toggles.
- **Biometric Sensor Modal**: Touch native device fingerprint sensor before submitting attendance.
- **Unlock Request Submission**: Request HOD override if class is locked due to emergency delays.

---

## 7. Technology Stack

| Layer | Technologies Used |
|:---|:---|
| **Frontend Framework** | React 18, Vite 6, Modern Vanilla Tailwind CSS |
| **Icons & Design** | Lucide React, Glassmorphism, Responsive Dark Mode Palette |
| **Biometric Engine** | W3C WebAuthn API (`navigator.credentials.create`) — Native Hardware Fingerprint |
| **Real-Time Communication** | Native WebSocket Client with auto-reconnect and heartbeat ping/pong |
| **Backend Framework** | Node.js (v18+), Express.js (ES Modules) |
| **Database & ORM** | SQLite (`dev.db` for zero-config local LAN) / PostgreSQL, Prisma ORM (v6.19) |
| **Security & Cryptography** | Bcrypt.js (Password Hashing), JSON Web Tokens (JWT), Subnet CIDR matching |
| **File Ingestion** | Multer, CSV-Parser, Mammoth (Word document parsing), PDF-Parse |

---

## 8. API Endpoint Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/auth/login` | Log in using Email OR Username (`zaeem` / `saif`) and Password |
| `GET` | `/api/auth/me` | Fetch authenticated user profile and department details |
| `POST` | `/api/auth/change-password` | Update account password |

### Network & Router Geofencing (`/api/network`)
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/network/status` | Non-blocking perimeter status and client IP diagnostics |
| `GET` | `/api/network/rooms` | List all classrooms with configured router IPs, MACs, and subnets |
| `POST` | `/api/network/rooms` | Create a new classroom with router geofencing info |
| `PUT` | `/api/network/rooms/:id` | Update router IP, MAC, SSID, and subnet for a classroom |
| `DELETE` | `/api/network/rooms/:id` | Delete a classroom |
| `POST` | `/api/network/rooms/:id/auto-link` | 1-Click bind: auto-detect current connected Wi-Fi IP and assign to room |
| `POST` | `/api/network/verify-room` | Verify if teacher's current device IP matches the room's router |

### Attendance (`/api/attendance`)
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/attendance/slot/:slotId` | Fetch student roster and session lock status for a timetable slot |
| `POST` | `/api/attendance/submit` | Submit student roster + teacher attendance with biometric verification |
| `POST` | `/api/attendance/request-override` | Submit formal unlock request to HOD for a locked class |

### Administration (`/api/admin`)
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/admin/dashboard` | Live campus dashboard of all classes scheduled today |
| `POST` | `/api/admin/override` | Unlock a locked slot with administrative justification |
| `GET` | `/api/admin/override-requests` | List pending teacher unlock requests |
| `POST` | `/api/admin/override-requests/review` | Approve or reject a teacher's unlock request |
| `GET` | `/api/admin/users` | List all registered users (Faculty, HODs, Admins, Students) |
| `POST` | `/api/admin/users` | Create a new user account |
| `DELETE` | `/api/admin/users/:userId` | Delete a user account |
| `POST` | `/api/admin/users/reset-password` | Administrative password reset |
| `GET` | `/api/admin/departments` | List all university departments |
| `POST` | `/api/admin/departments` | Create a new academic department |
| `POST` | `/api/admin/courses` | Create a new course / subject |
| `POST` | `/api/admin/sections` | Create a new student section |
| `GET` | `/api/admin/timetable/manage` | Fetch timetable metadata (teachers, courses, sections, rooms, slots) |
| `POST` | `/api/admin/timetable/slot` | Schedule a new weekly timetable class slot |
| `DELETE` | `/api/admin/timetable/slot/:slotId` | Delete a timetable slot |
| `POST` | `/api/admin/import/:type` | Bulk ingest teachers, students, or timetables via CSV/Word/PDF |
| `GET` | `/api/admin/delinquency-report` | Faculty punctuality analytics and lock frequency report |
| `GET` | `/api/admin/audit-logs` | Network perimeter security violation logs |

---

## 9. Quick Start & Local Setup Guide

### Prerequisites:
- **Node.js**: v18.0.0 or higher
- **NPM**: v9.0.0 or higher

### Step 1: Clone or Navigate to Project Directory
```bash
cd "d:\xampp\htdocs\UOS project"
```

### Step 2: Start the Backend Server
```bash
cd backend
npm install
npm run dev
```
- Backend starts at **`http://localhost:5000`**
- WebSocket server starts at **`ws://localhost:5000`**
- Database: SQLite `backend/prisma/dev.db`

### Step 3: Start the Frontend Application
Open a second terminal window:
```bash
cd frontend
npm install
npm run dev
```
- Frontend starts at **`http://localhost:3001`** (or `http://localhost:3000`)

### Step 4: Login & Test
1. Open **`http://localhost:3001`** in Google Chrome, Microsoft Edge, or a mobile browser.
2. Click **"Muhammad Zaeem"** or **"Muhammad Saif Ullah"** for instant 1-click developer login.
3. Access the Admin Dashboard, view the Physics Pilot zone, and configure classrooms!

---

## 10. Database Reset & Fresh Setup Commands

If you ever wish to re-seed or wipe all test records:

```bash
# Sync developer accounts (Muhammad Zaeem and Muhammad Saif Ullah)
node backend/scripts/syncDevs.js

# Complete reset to pristine state (Zero dummy data, clean Physics Dept, 3 Pilot Rooms)
node backend/scripts/resetFreshDb.js
```

---

## 11. Production Deployment on University Server

For permanent deployment on a campus server running Ubuntu 22.04 LTS or Windows Server:
1. Refer to the comprehensive deployment guide in [`deploy/PRODUCTION_DEPLOYMENT.md`](deploy/PRODUCTION_DEPLOYMENT.md).
2. Configure Nginx reverse proxy with HTTPS as documented in [`deploy/nginx.conf`](deploy/nginx.conf).
3. The server runs directly on the central switch LAN backbone, ensuring complete immunity against external internet outages.

---

## 12. Authors & Acknowledgments

- **Muhammad Zaeem** — Lead System Architecture, Network Perimeter Gatekeeper, Backend Engineering, Router Geofencing Engine.
- **Muhammad Saif Ullah** — Core Application Development, Database Architecture, WebAuthn Biometrics, Frontend UI/UX.
- **Institution**: **University of Sahiwal (UOS)**, Department of Physics & Department of Computer Science.

---
*© 2026 University of Sahiwal. All rights reserved. Developed & Powered by Muhammad Zaeem and Muhammad Saif Ullah.*
