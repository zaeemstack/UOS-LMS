# Production Deployment Guide — University of Sahiwal Attendance System

This guide explains how to deploy the **UOS Network-Fenced Academic Attendance Management System** on a university server (Ubuntu 22.04 LTS / Debian or Windows Server).

---

## 1. Prerequisites on the University Server
- **Node.js**: v18 or v20 LTS
- **PostgreSQL**: v14+ (Recommended for 100,000+ students and multiple departments)
- **Nginx**: Web server and reverse proxy
- **Certbot**: Free SSL/TLS certificate manager

---

## 2. Switching from SQLite to PostgreSQL

In local development, the system runs on SQLite (`file:./dev.db`). For high-concurrency production deployment across 10+ departments:

### Step 2.1 — Create PostgreSQL Database
```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE uos_attendance;
CREATE USER uos_admin WITH ENCRYPTED PASSWORD 'StrongSecureDatabasePassword_2025';
GRANT ALL PRIVILEGES ON DATABASE uos_attendance TO uos_admin;
\q
```

### Step 2.2 — Update Prisma Schema
Open `backend/prisma/schema.prisma` and change line 2:
```prisma
datasource db {
  provider = "postgresql"   // <-- Change from "sqlite" to "postgresql"
  url      = env("DATABASE_URL")
}
```

### Step 2.3 — Update `.env` Database URL
In `backend/.env`:
```env
DATABASE_URL="postgresql://uos_admin:StrongSecureDatabasePassword_2025@localhost:5432/uos_attendance?schema=public"
```

### Step 2.4 — Push Schema & Seed Initial Data
```bash
cd backend
npm install
npm run prisma:generate
npx prisma db push
npm run prisma:seed
```

---

## 3. Server Configuration (`.env`)

Edit `backend/.env` with your university production values:

```env
PORT=5000
NODE_ENV=production

# Database
DATABASE_URL="postgresql://uos_admin:StrongSecureDatabasePassword_2025@localhost:5432/uos_attendance?schema=public"

# Security
JWT_SECRET="uos_academic_perimeter_super_secret_jwt_key_2025_prod_98765"
BYPASS_NETWORK_FENCE=false

# Allowed Campus Subnets (Comma-separated CIDR notation)
# Get the official Wi-Fi / LAN IP ranges from the UOS IT Department:
CAMPUS_SUBNETS=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,127.0.0.1/32

# Timetable Lock Rules (in minutes)
EARLY_ENTRY_WINDOW_MINUTES=15
LATE_ENTRY_THRESHOLD_MINUTES=15

# SMTP Email Dispatcher (Optional — for automated HOD/Teacher notifications)
SMTP_HOST=smtp.uos.edu.pk
SMTP_PORT=587
SMTP_USER=attendance-alerts@uos.edu.pk
SMTP_PASS=YourEmailPasswordHere
EMAIL_FROM="UOS Attendance System <attendance-alerts@uos.edu.pk>"
```

---

## 4. Install Additional Production Packages

Run inside `backend/`:
```bash
npm install pdf-parse nodemailer
```

---

## 5. Build Frontend Distribution

Build the production frontend assets:
```bash
cd frontend
npm install
npm run build
```
The compiled, production-ready static files are generated in `frontend/dist/`.

---

## 6. Setup Systemd Service for Node.js (Continuous Background Operation)

Create a systemd service so the backend automatically starts on system boot and restarts if crashed:

```bash
sudo nano /etc/systemd/system/uos-attendance.service
```

Paste the following:
```ini
[Unit]
Description=UOS Attendance Backend Service
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/uos-attendance/backend
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable uos-attendance
sudo systemctl start uos-attendance
sudo systemctl status uos-attendance
```

---

## 7. Nginx & SSL Setup (HTTPS)

### Step 7.1 — Copy Nginx Configuration
```bash
sudo cp /var/www/uos-attendance/deploy/nginx.conf /etc/nginx/sites-available/uos-attendance
sudo ln -s /etc/nginx/sites-available/uos-attendance /etc/nginx/sites-enabled/
```

### Step 7.2 — Test and Reload Nginx
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7.3 — Obtain Free Let's Encrypt SSL Certificate
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d attendance.uos.edu.pk
```
Certbot will configure SSL certificates and enable automatic renewals.

---

## 8. Default System Accounts

> [!CAUTION]
> All default accounts have `mustChangePassword: true` enabled. The user will be required to create a new strong password immediately upon first login.

| Role | Email | Initial Password |
|------|-------|------------------|
| **Director IT / Superadmin** | `admin@uos.edu.pk` | `Admin@123` |
| **HOD Computer Science** | `hod.cs@uos.edu.pk` | `HOD_CS@123` |
| **HOD Software Engineering** | `hod.se@uos.edu.pk` | `HOD_SE@123` |
| **HOD Electrical Engineering** | `hod.ee@uos.edu.pk` | `HOD_EE@123` |
| **Other Department HODs** | `hod.[code]@uos.edu.pk` | `HOD_[CODE]@123` |
