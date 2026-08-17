<div align="center">

# 🚀 FutureCodeAI
### Next-Generation EdTech, Multi-Course Bootcamps & Verified Credentials Platform

[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore_%26_Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL_3D-000000?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)

<p align="center">
  <strong>An enterprise-grade, full-stack educational ecosystem empowering students, coaching institutes, and administrators with interactive learning, multi-day live bootcamps, automated attendance tracking, and tamper-proof verified certificates.</strong>
</p>

[✨ Live Demo](https://futurecodeai.com) • [📖 Documentation](#-table-of-contents) • [🚀 Quick Start](#-getting-started) • [🛠️ Architecture](#-system-architecture)

---

</div>

## 📑 Table of Contents
- [🌟 Platform Overview](#-platform-overview)
- [✨ Core Features](#-core-features)
  - [🎓 Student Experience Portal](#-student-experience-portal)
  - [🛡️ Super Admin Control Center](#-super-admin-control-center)
  - [🏢 Coaching Partner & Institute Portal](#-coaching-partner--institute-portal)
  - [📜 Verified Certificate & QR Verification Engine](#-verified-certificate--qr-verification-engine)
  - [🎨 3D Visual Experience & Custom Avatars](#-3d-visual-experience--custom-avatars)
- [🛠️ Technology Stack](#️-technology-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Setup](#installation--setup)
- [🔐 Security & Role-Based Access Control (RBAC)](#-security--role-based-access-control-rbac)
- [⚡ Build & Deployment](#-build--deployment)
- [🤝 Contributing & License](#-contributing--license)

---

## 🌟 Platform Overview

**FutureCodeAI** is designed to bridge the gap between academia and industry. Built from the ground up with high performance, visual elegance, and cloud scalability, it delivers seamless learning journeys across:

- **Parallel Multi-Enrollments**: Students can concurrently enroll across multiple technical courses, industrial internships, and multi-day live bootcamps.
- **15-Day Multi-Day Bootcamps**: Live sessions with daily attendance marking, back-date support, and smart schedule extensions (`+1d`) when sessions are postponed.
- **Automated Certificate Issuance**: 1-click generation of verified certificates for students achieving $\ge 75\%$ attendance or completing technical programs.
- **Instant Public Verification**: Real-time validation of certificates with unique ID lookup and QR code inspection.

---

## ✨ Core Features

### 🎓 Student Experience Portal
- **Unified Dashboard**: Real-time overview of enrolled courses, internship applications, bootcamp schedules, and earned credentials.
- **Multi-Program Enrollment**: Enroll in multiple courses simultaneously without losing active progress or past enrollments.
- **Interactive Daily Attendance Tracker**: Monitor attendance day-by-day with real-time percentage gauges and progress indicators.
- **Profile Picture & 3D Avatars**: Choose from curated 3D avatar presets or upload custom photos with automatic client-side canvas compression (`~80–120KB`).
- **Instant Certificate Access**: Download high-resolution completion certificates directly from the dashboard.

### 🛡️ Super Admin Control Center
- **Multi-Day Webinar Manager**:
  - Organize multi-day bootcamps (e.g. 15 active days) with interactive day ribbon carousels.
  - **⏸️ Postpone Day Option**: Postpone any day with custom/preset reasons (`Instructor Unavailable`, `Holiday`, etc.) and automatically extend the bootcamp calendar by **+1 day** without penalizing student attendance.
  - **Google Form CSV Import**: 1-click batch import of hundreds of student registrations with automatic header matching.
  - **Bulk Certificate Generation**: 1-click credential issuance for all students with $\ge 75\%$ attendance.
- **Student Management & Deduplication**:
  - Intelligent deduplication and profile merging by `email + course` preventing duplicate table rows.
  - Comprehensive cascading deletion that purges duplicate user IDs and enrollments in one atomic batch.
- **Institute & Center Approvals**: Verify partner centers, assign branch locations, and manage student allocations.
- **Audit Logging**: Real-time administrative activity logging for all administrative actions (`CREATED`, `UPDATED`, `DELETED`, `BULK_ISSUED`).

### 🏢 Coaching Partner & Institute Portal
- **Center Onboarding**: Register physical or online coaching institutes with facility highlights and contact details.
- **Batch Management**: Organize student cohorts across morning, evening, and weekend batches.
- **Enrollment Monitoring**: Track student completion rates and center performance metrics.

### 📜 Verified Certificate & QR Verification Engine
- **Tamper-Proof Credentials**: Unique serial IDs formatted as `FC-YYYY-XXXXXX`.
- **Public Verification Route**: Anyone can verify student credentials at `/verify` or by scanning certificate QR codes.
- **Revocation System**: Admins can flag or revoke compromised certificates in real-time.
- **High-Fidelity PDF & Print View**: Pixel-perfect vector rendering for print-ready downloads.

### 🎨 3D Visual Experience & Custom Avatars
- **Three.js WebGL Canvas**: Hardware-accelerated 3D floating orb on the hero section with local physical lighting and error-boundary fallback.
- **Resilient UserAvatar System**: Automatic fallback to gradient initials if remote images fail to load.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | [React 19](https://react.dev/) + [TypeScript 5.7](https://www.typescriptlang.org/) |
| **Build & Bundler** | [Vite 8](https://vitejs.dev/) with optimized manual chunk splitting |
| **Styling & UI** | [Tailwind CSS 3.4](https://tailwindcss.com/) + Custom Glassmorphism System |
| **Motion & Animations** | [Framer Motion](https://www.framer.com/motion/) + [Lucide React](https://lucide.dev/) Icons |
| **3D Graphics** | [Three.js](https://threejs.org/) + [React Three Fiber](https://r3f.docs.pmnd.rs/) + [Drei](https://github.com/pmndrs/drei) |
| **Backend & Cloud** | [Google Firebase](https://firebase.google.com/) (Authentication, Cloud Firestore, Storage) |
| **Forms & Validation** | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| **Data Processing** | [PapaParse](https://www.papaparse.com/) (CSV Import/Export) |
| **Code Quality** | [oxlint](https://oxc.rs/) + TypeScript Compiler (`tsc -b`) |

---

## 📁 Project Structure

```text
FutureCodeAI/
├── src/
│   ├── components/
│   │   ├── admin/             # Admin modals, student enrollment & profile tools
│   │   ├── certificate/       # Certificate generator, modal preview & verification
│   │   ├── common/            # Shared UI components, error boundaries
│   │   ├── dashboard/         # Student portal (MyCourses, MyWebinars, MyInternships)
│   │   ├── home/              # Hero 3D section, features, testimonials
│   │   ├── Navbar.tsx         # Responsive top navigation with UserAvatar
│   │   └── UserAvatar.tsx     # Resilient avatar component with initials fallback
│   ├── firebase/
│   │   └── config.ts          # Firebase SDK initialization & Firestore references
│   ├── hooks/
│   │   ├── useAuth.ts         # User session & role state management
│   │   └── useCertificates.ts # Certificate querying and verification hooks
│   ├── pages/
│   │   ├── admin/             # ManageStudents, ManageWebinars, ManageCertificates
│   │   ├── StudentDashboard.tsx
│   │   ├── VerifyCertificate.tsx
│   │   └── ...
│   ├── utils/
│   │   ├── adminLogger.ts     # Admin action logging utility
│   │   └── webinarSchedule.ts # Schedule engine & +1d postponement calculator
│   ├── App.tsx                # Application routing & layout tree
│   └── main.tsx               # Root entry point
├── firestore.rules            # Robust Role-Based Access Control security rules
├── storage.rules              # Firebase Storage permissions
└── vite.config.ts             # Vite configuration with chunk optimization
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** `v18.0.0` or higher
- **npm** `v9.0.0` or higher
- A **Firebase Project** with Authentication and Cloud Firestore enabled

### Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/RaviRanjanKumar8904/FutureCodeAI.git
   cd FutureCodeAI
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the project root:
   ```bash
   cp .env.example .env
   ```

   Fill in your Firebase credentials in `.env`:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. **Start the Local Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔐 Security & Role-Based Access Control (RBAC)

The platform enforces strict security rules in [`firestore.rules`](./firestore.rules):

- **Students (`student`)**: Can read course content, register for bootcamps, and view/modify their own profile data.
- **Collaborators (`institute`)**: Can manage center details and view assigned batches.
- **Admins (`admin`)**: Authorized to create/edit webinars, manage attendance, enroll students, issue/revoke certificates, and approve centers.

---

## ⚡ Build & Deployment

### Production Build
To create a production-ready optimized bundle:
```bash
npm run build
```
This runs `tsc -b` for strict type validation followed by Vite chunk compression.

### Code Quality Check
```bash
npm run lint
```
Runs `oxlint` across all source files for high-speed static code analysis with **0 errors and 0 warnings**.

### Vercel Deployment
The repository includes a pre-configured `vercel.json` for SPA routing:
1. Connect your repository to **Vercel**.
2. Add your environment variables (`VITE_FIREBASE_*`) in the Vercel dashboard.
3. Deploy!

---

<div align="center">

Made with ❤️ by the **FutureCodeAI Team**

</div>
