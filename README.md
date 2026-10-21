# Production-Ready Full-Stack Ticketing & Email Support System (v2.0)
**BitMax Technology (P) Ltd — MERN Internship Assignment**

A production-grade, enterprise-ready full-stack customer support and ticketing platform built using the **MERN Stack** (MongoDB, Express, React, Node.js). Features bidirectional two-way email synchronization, lifecycle state management, role-based authorization (Customer, Agent, Admin), real-time Socket.IO updates, internal notes, audit logging, and automated testing.

---

## 🚀 Key Highlights & Architecture

- **Clean Modular Architecture**: Clean separation of routes, controllers, services, repositories, validators, and middlewares.
- **Robust Authentication & Security**:
  - JWT Access Token (short expiry) + Refresh Token (rotation & multi-device session tracking)
  - 6-digit OTP verification for Registration and Passwordless Login
  - Bcrypt password hashing + Account lockout protection after 5 consecutive failed attempts
  - Helmet HTTP security headers, CORS protection, express-mongo-sanitize operator injection guard, HPP, and rate limiters.
- **Full Ticket Lifecycle**:
  - Human-readable ticket numbers (`TKT-2026-000001`) with automatic monotonic sequences
  - Lifecycle state machine: `Open` &rarr; `In Progress` / `Pending` &rarr; `Resolved` &rarr; `Closed` &rarr; `Reopened`
  - Strict status transition enforcement preventing invalid states
  - Priority-based SLA resolution countdown timers (Urgent: 4h, High: 12h, Medium: 24h, Low: 48h)
- **Two-Way Bidirectional Email Synchronization**:
  - **Outbound**: Instant background worker notifications for ticket creation, assignment, public replies, and status changes with branded HTML email templates.
  - **Inbound**: Webhook processor (`POST /api/email/inbound`) that extracts ticket identifiers via `X-Ticket-Number`, `References`, `In-Reply-To`, or recipient tags (`support+TKT-XXXXXX@domain`).
  - **Email Threading & Quote Stripping**: Removes quoted email reply history so only new responses are saved.
  - **Auto Reopening**: When a customer replies by email to a `Resolved` or `Closed` ticket, the ticket is automatically reopened and logged.
  - **Idempotency & Deduplication**: Rejects duplicate Message-IDs with zero errors.
- **Real-Time Collaboration**: Socket.IO integration broadcasting live messages, status updates, and assignments to connected browser sessions without page reload.
- **Role-Based Isolation (RBAC)**:
  - **Customer**: Can only view and create their own tickets. Internal notes are strictly excluded from customer API responses and views.
  - **Agent**: Can view ticket queues, assign tickets, resolve/reopen, post public customer replies, and write confidential internal notes.
  - **Admin**: Full platform management, user role promotion/demotion (Customer &harr; Agent &harr; Admin), and custom category creation.
- **Built-in Email Simulator**: Includes an interactive UI modal to simulate external incoming customer emails with 1 click.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 5, Tailwind CSS, Redux Toolkit, React Router v6, Lucide Icons |
| **Backend** | Node.js (ES Modules), Express.js 4, Socket.IO 4, Multer, Sanitize-HTML |
| **Database** | MongoDB with Mongoose 8 ODM |
| **Email & Queue** | Resend API, Resilient Async Background Queue |
| **API & Docs** | Swagger / OpenAPI 3.0 (`/api/docs`), Postman Collection v2.1 |
| **Testing** | Vitest, Supertest (17/17 comprehensive integration tests passing) |
| **DevOps** | Docker, Docker Compose |

---

## 📂 Repository Directory Layout

```text
mern-ticketing-system/
├── backend/
│   ├── src/
│   │   ├── config/             # Environment & DB connection
│   │   ├── constants/          # Statuses, Roles, Transitions
│   │   ├── database/           # Mongoose models & seed.js
│   │   ├── docs/               # OpenAPI / Swagger specification
│   │   ├── middleware/         # Auth, RBAC, Validation, Error Handler, Rate Limiters
│   │   ├── modules/
│   │   │   ├── auth/           # Login, Register, OTP, Password Reset
│   │   │   ├── user/           # Profiles, User Management
│   │   │   ├── ticket/         # Ticket CRUD, Lifecycle transitions, Assignment
│   │   │   ├── ticketMessage/  # Conversation threads, Public & Internal notes
│   │   │   ├── ticketActivity/ # Audit trail activities
│   │   │   ├── category/       # Ticket categories
│   │   │   ├── email/          # Inbound webhook controller & routes
│   │   │   └── dashboard/      # KPI metrics & analytics
│   │   ├── queues/             # Background email worker queue
│   │   ├── routes/             # Central API router
│   │   ├── services/           # Email service, Inbound email parser, Socket.IO
│   │   ├── templates/          # Responsive HTML email templates
│   │   ├── tests/              # Vitest & Supertest integration suite
│   │   ├── utils/              # ApiError, ApiResponse, OTP, JWT token helpers
│   │   ├── app.js              # Express app definition
│   │   └── server.js           # HTTP + Socket.IO server entrypoint
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/                # Redux Toolkit store
│   │   ├── components/         # Layout (Sidebar, Topbar, AppShell), Badges, Modals
│   │   ├── features/           # Redux slices (auth, tickets, dashboard, categories)
│   │   ├── pages/
│   │   │   ├── auth/           # Login, Register, Verify OTP, Forgot/Reset Password
│   │   │   ├── dashboard/      # Stat cards, Urgency breakdown, Activity stream
│   │   │   ├── tickets/        # Ticket List, Create Ticket, Ticket Detail + Chat
│   │   │   ├── profile/        # User Profile
│   │   │   └── admin/          # User Management, Categories
│   │   ├── routes/             # ProtectedRoute & RoleRoute
│   │   ├── services/           # Axios interceptors & Socket.IO client
│   │   ├── App.jsx             # React Router tree
│   │   ├── index.css           # Tailwind design tokens
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── tailwind.config.js
├── docs/
│   └── postman_collection.json # Exported Postman collection
├── docker-compose.yml
└── README.md
```

---

## ⚡ Getting Started (Quick Run)

### 1. Prerequisites
- **Node.js** v18+ (tested on v22.x)
- **MongoDB** running on `mongodb://127.0.0.1:27017`

### 2. Backend Setup
```bash
cd backend
# Create .env from template
copy .env.example .env

# Install dependencies
npm install

# Seed the database with demo accounts, categories, and tickets
npm run seed

# Run the backend server
npm run dev
```
Backend will start on `http://localhost:5000` with Swagger documentation available at `http://localhost:5000/api/docs`.

### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Frontend will be live at `http://localhost:5173`.

---

## 🔑 Demo Credentials (Seeded)

| Role | Email | Password | Key Permissions |
|---|---|---|---|
| **Administrator** | `admin@bitmax.local` | `Password123!` | All tickets, User role management, Category creation, Audit logs |
| **Support Agent 1** | `sarah.agent@bitmax.local` | `Password123!` | Ticket queues, Internal notes, Assign, Resolve, Reopen |
| **Support Agent 2** | `david.agent@bitmax.local` | `Password123!` | Ticket queues, Internal notes, Assign, Resolve, Reopen |
| **Customer 1** | `john.doe@example.com` | `Password123!` | Own tickets, Web reply, Email reply, Reopen own resolved tickets |
| **Customer 2** | `emma.watson@example.com` | `Password123!` | Own tickets, Raise new requests |

> **Pro Tip**: The login page includes **1-Click Demo Buttons** (`Admin`, `Agent`, `Customer`) to auto-fill credentials instantly!

---

## 🧪 Automated Testing

The backend includes a comprehensive Vitest suite covering authentication, RBAC, ticket creation, internal notes privacy, email deduplication, and automatic reopening:

```bash
cd backend
npm test
```
Result: **17 tests passing across 5 test suites**.

---

## 🎬 Mandatory Demo Walkthrough (Section 22)

Follow these steps to demonstrate every requirement in the assignment specification:

### Scenario 10 & 11: Registration & Login with OTP
1. Go to `http://localhost:5173/register`.
2. Register a new user (e.g. `alex@example.com`, Phone: `+91 9999900000`, Password: `Password123!`).
3. You will be redirected to the **Security Check (OTP)** screen.
4. In development mode, the screen displays a convenient **Demo OTP** badge (e.g. `123456`). Click **Paste** and click **Verify & Continue**.
5. You are logged in with JWT access & refresh tokens issued and redirected to your Dashboard!

### Scenario 12 & 13: Create Ticket & Confirmation Email
1. Click **New Ticket** in the sidebar or top banner.
2. Enter Subject: `Cannot download monthly subscription invoice`.
3. Select Category: `Billing & Invoicing`, Priority: `High`.
4. Enter Description: `Receiving 500 server error when clicking download PDF button.`
5. Click **Submit Ticket**.
6. The system generates a human-readable number (e.g. `TKT-2026-000004`) and dispatches a confirmation email to the requester via background queue.

### Scenario 14 & 15: Agent Login & Ticket Assignment
1. Log out, then click the **1-Click Agent** demo button (`sarah.agent@bitmax.local`) and log in.
2. Go to **All Tickets** &rarr; Open the newly created ticket.
3. In the right-hand **Ticket Details** panel, select an agent from the **Assigned Agent** dropdown.
4. The ticket assignment is immediately recorded in the **Activity Timeline** and the assigned agent receives an email notification.

### Scenario 16: Agent Public Reply & Internal Note
1. In the ticket conversation, select **Internal Note** (amber banner).
2. Enter: `Verified invoice PDF generator logs. S3 bucket permission error detected.`
3. Click **Add Note**. Notice the gold border and confidential indicator.
4. Toggle back to **Public Reply** and enter: `Hello, we have identified the issue and are deploying a fix.` Click **Send Reply**.
5. The public reply is emailed to the customer.

### Scenario 17 & 18: Inbound Customer Email Reply via Simulator
1. In the top bar or sidebar, click **Simulate Inbound Email** (or the blue button on the ticket).
2. The modal pre-fills the current ticket number (`TKT-2026-000004`) and customer email (`alex@example.com`).
3. Enter Body: `Replying from my email client: Thanks Sarah, please let me know when fixed.`
4. Click **Dispatch Inbound Email**.
5. Watch the ticket conversation update in real-time via Socket.IO with a **Received via Email** badge!

### Scenario 19: Resolve Ticket
1. In the top action bar, click **Resolve Ticket**.
2. Enter resolution summary: `S3 IAM policy updated.` Click **Confirm Resolve**.
3. Status changes to **Resolved**. Customer is notified by email.

### Scenario 20: Inbound Email Reopening Resolved Ticket
1. Click **Simulate Inbound Email** again for the same ticket.
2. Enter Body: `Wait, it is still throwing the same error when I click the link.`
3. Click **Dispatch Inbound Email**.
4. The backend processes the reply, detects the ticket was Resolved, and **automatically transitions the status to Reopened**!
5. The activity log captures: `ticket_reopened (resolved → reopened)`.

### Scenario 21: Close Ticket & Audit History
1. As an authorized user, click **Close Ticket**.
2. Check the **Activity Timeline** in the right sidebar. Every action (`ticket_created`, `ticket_assigned`, `reply_added`, `internal_note_added`, `ticket_resolved`, `ticket_reopened`, `ticket_closed`) is recorded chronologically with timestamps and actor names!

### Scenario 22: Role-Based Restrictions
1. Log in as a **Customer** (`john.doe@example.com`).
2. Notice:
   - Customer only sees their own tickets in the queue.
   - Internal notes written by agents are **completely hidden** from customer view.
   - Customers cannot access `/admin/users` or `/admin/categories` (automatic redirect).

---

## 📡 REST API Reference

Full interactive Swagger/OpenAPI documentation is available at:
👉 **`http://localhost:5000/api/docs`**

A complete Postman collection is also provided at `docs/postman_collection.json`.

| Method | Endpoint | Description | Auth Scope |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user account | Public |
| `POST` | `/api/auth/verify-otp` | Verify registration OTP | Public |
| `POST` | `/api/auth/login-password` | Email + password login | Public |
| `POST` | `/api/auth/login-otp` | Request passwordless login OTP | Public |
| `POST` | `/api/auth/verify-login-otp`| Verify login OTP | Public |
| `POST` | `/api/auth/refresh-token` | Rotate and issue fresh access token | Public |
| `POST` | `/api/auth/logout` | Invalidate refresh token session | Public |
| `POST` | `/api/auth/forgot-password`| Request password reset code | Public |
| `POST` | `/api/auth/reset-password` | Set new password with OTP | Public |
| `GET` | `/api/tickets` | Search, filter, and paginate tickets | Authenticated |
| `POST` | `/api/tickets` | Create support ticket with TKT number | Authenticated |
| `GET` | `/api/tickets/:id` | Get ticket metadata and details | Customer (Own) / Agent / Admin |
| `PATCH`| `/api/tickets/:id` | Update category, priority, or status | Agent / Admin |
| `POST` | `/api/tickets/:id/messages`| Add public reply or internal note | Authenticated |
| `POST` | `/api/tickets/:id/assign` | Assign/reassign ticket to agent | Agent / Admin |
| `POST` | `/api/tickets/:id/resolve` | Mark ticket as resolved | Agent / Admin |
| `POST` | `/api/tickets/:id/reopen` | Reopen resolved or closed ticket | Authenticated |
| `POST` | `/api/tickets/:id/close` | Close ticket | Authenticated |
| `GET` | `/api/tickets/:id/messages`| Get chronological conversation thread | Authenticated |
| `GET` | `/api/tickets/:id/activity`| Get audit timeline | Authenticated |
| `GET` | `/api/categories` | List active categories | Public |
| `POST` | `/api/categories` | Create ticket category | Admin |
| `POST` | `/api/email/inbound` | Inbound email provider webhook | Public / Webhook |
| `GET` | `/api/dashboard/summary` | Dashboard statistics and chart metrics | Authenticated |
| `GET` | `/api/users` | List users for assignment dropdowns | Agent / Admin |
| `PATCH`| `/api/users/:id/role` | Promote/demote user authorization role | Admin |

---

## 🐳 Docker Deployment (Bonus)

To run the entire system (MongoDB, Backend, and Frontend) via Docker Compose:

```bash
docker compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`
- MongoDB: `mongodb://localhost:27017`

---

## 📄 License & Credits
Developed for **BitMax Technology (P) Ltd** MERN Stack Internship Assignment.
All code is clean, modular, well-documented, and production-ready.
