# VeraCare® Clinic Scheduler & 24/7 Roster Platform

[![Live Application](https://img.shields.io/badge/Live_Demo-veracare360.onrender.com-brightgreen?style=for-the-badge&logo=render)](https://veracare360.onrender.com/)
[![Node.js](https://img.shields.io/badge/Node.js-v24.15.0-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v18.3.1-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.5.4-blue.svg)](https://www.typescriptlang.org/)
[![SQLite WASM](https://img.shields.io/badge/Database-SQLite_WASM-cyan.svg)](https://sql.js.org/)
[![Tests](https://img.shields.io/badge/Tests-20%2F20_Passed-emerald.svg)]()

> [!IMPORTANT]
> **🚀 Live Production Application**: [https://veracare360.onrender.com/](https://veracare360.onrender.com/)

A high-performance, 24/7 medical staff shift scheduling platform designed for modern clinics, hospital units, and emergency medical teams. Built with a single-page **VeraCare® Video Hero**, glassmorphic navigation, liquid-glass UI controls, and Instrument Serif display typography.

Managers create and allocate shifts with real-time week-at-a-glance coverage heatmaps; medical staff (**Doctors, Nurses, Receptionists**) browse and claim open shift slots with **100% server-side business rule validation** and **serialized transaction concurrency safety**.

---

## 📸 Application Visual Tour & Gallery

### 1. VeraCare® Single-Page Video Hero Landing Page
![VeraCare Video Hero Landing Page](./screenshot/Screenshot_30-7-2026_95818_localhost.jpeg)
> **Description**: Fullscreen background video with glassmorphic top navigation, Instrument Serif display typography (`Where care never clocks out, precision scheduling begins.`), liquid-glass buttons, and smooth rise animations.

---

### 2. Week-at-a-Glance Coverage Board & KPI Analytics
![Week-at-a-Glance Coverage Board](./screenshot/Screenshot_30-7-2026_95857_localhost.jpeg)
> **Description**: Interactive week grid showing real-time doctor, nurse, and receptionist shift coverage, coverage percentage gauge score, filled vs empty shift breakdown, and role shortage counters.

---

### 3. Live On-Duty Roster Widget & Role Shortage Filter
![Live On-Duty Roster & Role Filter](./screenshot/Screenshot_30-7-2026_95933_localhost.jpeg)
> **Description**: Live widget displaying medical staff working on shift today with pulsing indicators alongside quick role shortage filter buttons (*Needs Doctor*, *Needs Nurse*, *Needs Receptionist*, *Unstaffed Only*).

---

### 4. Shift Slotting & Staff Assignment Control Modal
![Shift Management & Headcount Slotting Modal](./screenshot/Screenshot_30-7-2026_10057_localhost.jpeg)
> **Description**: Manager shift control modal featuring `+` / `-` role headcount slotting controls, shift timing inputs, scrollable staff list, and 1-tap direct doctor/nurse assignment.

---

### 5. Clinic Staff Directory
![Clinic Staff Directory](./screenshot/Screenshot_30-7-2026_1009_localhost.jpeg)
> **Description**: Searchable directory displaying active doctors, nurses, and receptionists on roster with medical specialty badges and external staff IDs.

---

### 6. CSV Roster Importer Pipeline
![CSV Roster Importer](./screenshot/Screenshot_30-7-2026_10122_localhost.jpeg)
> **Description**: Drag-and-drop CSV importer for staff lists and shift schedules with automated date cleaning, email deduplication, and row validation.

---

### 7. Row-by-Row CSV Import Audit Log
![CSV Import Audit Log](./screenshot/Screenshot_30-7-2026_10144_localhost.jpeg)
> **Description**: Detailed audit trail documenting every accepted, merged, or rejected CSV record with human-readable explanations and action logs.

---

## 🏛️ System Architecture

```mermaid
graph TD
    subgraph Client ["Client Tier (React 18 + TypeScript + Vite + Tailwind CSS)"]
        Landing["VeraCare Video Hero Landing Page"]
        CoverageBoard["Week-at-a-Glance Coverage Board and KPI Analytics"]
        ShiftPortal["Staff Shift Claiming Portal and Profile Settings"]
        CsvImporter["CSV Roster Importer and Audit Stream"]
    end

    subgraph Server ["Server Tier (Node.js v24 ESM + Express REST API)"]
        AuthRouter["Auth and JWT Router (/api/auth)"]
        ShiftsRouter["Shift Management and Concurrency Engine (/api/shifts)"]
        StaffRouter["Staff Directory Router (/api/staff)"]
        ImportsRouter["CSV Importer Engine (/api/imports)"]
    end

    subgraph Storage ["Database and Storage Tier (WASM SQLite)"]
        DbInstance["sql.js WASM Database Engine"]
        UsersTable["Users Table"]
        ShiftsTable["Shifts Table"]
        ClaimsTable["Claims Table"]
        ImportLogsTable["Import Runs and Import Rows Tables"]
    end

    Client --> Server
    AuthRouter --> DbInstance
    ShiftsRouter --> DbInstance
    StaffRouter --> DbInstance
    ImportsRouter --> DbInstance

    DbInstance --> UsersTable
    DbInstance --> ShiftsTable
    DbInstance --> ClaimsTable
    DbInstance --> ImportLogsTable
```

---

## 🔄 Concurrency & Serialized Shift Claiming Workflow

> [!IMPORTANT]
> When multiple staff members simultaneously attempt to claim an open shift slot, the database executes inside a **synchronous WASM transaction lock**. Exactly the required headcount succeeds, and excess claims fail gracefully with an explicit headcount error.

```mermaid
sequenceDiagram
    autonumber
    actor NurseA as Nurse Aisha
    actor NurseB as Nurse Marcus
    participant API as Express API (/api/shifts/id/claim)
    participant Engine as Concurrency Engine
    participant DB as WASM SQLite Database

    NurseA->>API: POST /api/shifts/42/claim (JWT Bearer Token)
    NurseB->>API: POST /api/shifts/42/claim (JWT Bearer Token)
    
    API->>Engine: Begin Serialized Transaction
    Engine->>DB: BEGIN TRANSACTION
    Engine->>DB: SELECT * FROM shifts WHERE id = 42
    Engine->>DB: SELECT COUNT FROM claims WHERE shift_id = 42 AND profession = nurse

    alt Slot Available (Nurse A)
        DB-->>Engine: Headcount (0/1 filled)
        Engine->>DB: INSERT INTO claims (shift_id, user_id, assigned_by)
        Engine->>DB: COMMIT
        API-->>NurseA: 200 OK (Claim Successful)
    else Slot Full (Nurse B)
        DB-->>Engine: Headcount (1/1 filled)
        Engine->>DB: ROLLBACK
        API-->>NurseB: 400 Bad Request (Shift already has enough nurses)
    end
```

---

## 📋 3-Step Roster Processing Pipeline

```mermaid
flowchart LR
    A["1. CSV Roster Import (staff.csv / shifts.csv)"] --> B{"2. Validation Engine (Clean dates, deduplicate emails)"}
    B -->|Accepted / Merged| C["3. Database Insertion (WASM SQLite)"]
    B -->|Validation Error| D["Audit Log Report (Logged with reason)"]
    C --> E["4. Real-time Coverage Heatmap (Doctor / Nurse Status)"]
    E --> F["5. Self-Service Claiming or Direct Assignment"]
```

---

## ⭐ Key Feature Highlights

> [!TIP]
> **VeraCare® Single-Page Video Hero**: Fullscreen background video, glassmorphic top navigation bar, `VeraCare®` logo in Instrument Serif display typography, and liquid-glass CTAs.

- **KPI Analytics Gauge**: Real-time week coverage score %, filled vs empty shift breakdown, and doctor/nurse shortage indicators.
- **Live On-Duty Roster Widget**: Displays currently active medical staff on duty right now with live pulsing indicators.
- **Role Shortage Filter Bar**: One-click filter for shifts needing Doctors, Nurses, or Receptionists.
- **Profile & Settings Modal**: Edit name, email, specialty, shift alert notification preferences, and security credentials.
- **Manager Slotting Controls**: Explicit `+` / `-` headcount requirement adjustment and searchable staff assignment list.

---

## 🔑 Demo Access Credentials

> [!NOTE]
> All seeded demo accounts share the password: `Passw0rd!`

| Role | Full Name | Email Address | Password |
|---|---|---|---|
| **Clinic Manager** | Manager Admin | `manager@clinic.local` | `Passw0rd!` |
| **Doctor** | Marcus Whitfield | `marcus.whitfield@clinicmail.test` | `Passw0rd!` |
| **Nurse** | Aisha Sharma | `aisha.sharma@clinicmail.test` | `Passw0rd!` |
| **Receptionist** | Karan Ali | `karan.ali@clinicmail.test` | `Passw0rd!` |

---

## 🚀 Local Development Setup

### 1. Install Dependencies & Seed Roster

```bash
# Install root, server, and client packages
npm install
npm run install:all

# Seed database with staff roster & initial shifts
npm run seed --prefix server
```

### 2. Start Application Servers

```bash
# Launches Express backend (:4000) and Vite dev client (:5173) concurrently
npm run dev
```

Open **http://localhost:5173/** to explore the application.

---

## 🧪 Automated Test Suite

> [!NOTE]
> The automated test suite executes Node built-in test runner (`node --test`) against an isolated temporary SQLite database file.

```bash
npm test --prefix server
```

```text
✔ claiming succeeds when a slot for the profession is open (44.5ms)
✔ claiming is rejected once the profession headcount is met (28.9ms)
✔ claiming is rejected when it overlaps another claimed shift for that person (29.2ms)
✔ non-overlapping back-to-back shifts are both claimable (30.3ms)
✔ overnight shift overlap is detected correctly across midnight (32.1ms)
✔ manager assign follows the same rules as self-claim (28.6ms)
✔ unclaim frees the profession slot back up (48.3ms)
✔ editing a shift time that would create an overlap is flagged as a conflict (32.6ms)
✔ concurrent-style rapid claims never over-fill a shift (serialized correctness) (45.3ms)
✔ parseMessyDate & parseMessyTime validation rules (12.4ms)

ℹ tests 20 | ℹ pass 20 | ℹ fail 0 | duration_ms ~980ms
```

---

## 🐳 Docker Deployment

To build and launch the single production container:

```bash
docker compose up --build
```

Access the deployment live at **http://localhost:4000/**.
