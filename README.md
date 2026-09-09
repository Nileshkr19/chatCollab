# Collabify - Server

A full-stack real-time chat and project collaboration platform. Teams can communicate through channels and direct messages, while managers can assign tasks, track progress, and manage deadlines — all in one place.

**📚 Documentation Navigation:**

- 🏗️ [System Architecture](./ARCHITECTURE.md) — Complete system design, data flow, and technical decisions
- 👤 [Authentication](./src/features/auth/README.md) — User registration, login, sessions
- 💬 [Chat](./src/features/chat/README.md) — Real-time messaging, channels, reactions
- 👥 [Workspace](./src/features/workspace/README.md) — Team management, roles, invitations
- 📋 [Tasks](./src/features/tasks/README.md) — Task management, Kanban board, deadlines
- 🔔 [Notifications](./src/features/notification/README.md) — Alerts, preferences, email delivery

---

## Features

### 💬 [Chat](./src/features/chat/README.md)

- Real-time messaging with Socket.IO
- Group channels and direct messages
- Threaded replies and emoji reactions
- File and media sharing
- Read receipts and typing indicators
- Message search and pinning
- User presence tracking (Redis)

### 📋 [Tasks](./src/features/tasks/README.md)

- Assign tasks to team members with deadlines
- Kanban board with drag-and-drop
- Subtasks, priorities, and task dependencies
- Manager dashboard with progress tracking
- Deadline reminders and overdue alerts
- Activity log and audit trail

### 👤 [Authentication](./src/features/auth/README.md)

- JWT authentication with secure password hashing
- User registration and email verification
- Session management with Redis
- Password reset via email
- Token refresh mechanism

### 👥 [Workspace](./src/features/workspace/README.md)

- Workspace-based multi-team support
- Role-based access control (Owner → Manager → Member → Guest)
- Email invitations with role pre-assignment
- Member management and activity tracking

### 🔔 [Notifications](./src/features/notification/README.md)

- In-app notifications with Socket.IO
- Email digests and transactional emails
- Notification preferences & quiet hours
- Delivery tracking and retry logic
- Daily digest and real-time alerts

---

## Tech Stack

### Frontend

| Tech             | Purpose                 |
| ---------------- | ----------------------- |
| React + Vite     | UI framework            |
| Tailwind CSS     | Styling                 |
| Socket.IO client | Real-time events        |
| TanStack Query   | Server state & caching  |
| Zustand          | Global state management |

### Backend

| Tech              | Purpose              |
| ----------------- | -------------------- |
| Node.js + Express | REST API             |
| Socket.IO         | Real-time messaging  |
| Prisma ORM        | PostgreSQL queries   |
| Mongoose          | MongoDB queries      |
| Bull + Redis      | Background job queue |
| JWT + bcryptjs    | Authentication       |
| Winston + Morgan  | Logging              |

### Databases

| Database          | Used for                                       |
| ----------------- | ---------------------------------------------- |
| MongoDB           | Messages, threads, reactions, read receipts    |
| PostgreSQL (Neon) | Users, workspaces, tasks, roles, notifications |
| Redis             | Sessions, typing indicators, job queue         |

---

## Project Structure

```
server/
├── ARCHITECTURE.md            # 🏗️ Complete system design & data flow
│
├── src/
│   ├── app.js                 # Express app initialization
│   ├── server.js              # Server entry point
│   │
│   ├── config/
│   │   ├── connectMongoDB.js  # MongoDB connection
│   │   ├── connectPostgres.js # PostgreSQL (Neon) connection
│   │   └── connectRedis.js    # Redis connection & client
│   │
│   ├── features/              # Feature modules (see docs below)
│   │   │
│   │   ├── auth/              # 👤 Authentication & Sessions
│   │   │   ├── README.md      # ← Feature Documentation
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.middleware.js
│   │   │   └── auth.validation.js
│   │   │
│   │   ├── chat/              # 💬 Real-time Chat
│   │   │   ├── README.md      # ← Feature Documentation
│   │   │   ├── chat.service.js
│   │   │   ├── models/        # MongoDB models
│   │   │   │   ├── channel.models.js
│   │   │   │   ├── message.models.js
│   │   │   │   ├── reaction.models.js
│   │   │   │   └── readReceipts.models.js
│   │   │   └── services/
│   │   │       └── presence.service.js  # Redis-based user presence
│   │   │
│   │   ├── workspace/         # 👥 Team Management
│   │   │   ├── README.md      # ← Feature Documentation
│   │   │   ├── workspace.controller.js
│   │   │   ├── workspace.service.js
│   │   │   ├── workspace.routes.js
│   │   │   └── workspace.middleware.js
│   │   │
│   │   ├── tasks/             # 📋 Task Management
│   │   │   ├── README.md      # ← Feature Documentation
│   │   │   ├── task.controller.js
│   │   │   ├── task.service.js
│   │   │   ├── task.routes.js
│   │   │   └── task.middleware.js
│   │   │
│   │   └── notification/      # 🔔 Notifications
│   │       ├── README.md      # ← Feature Documentation
│   │       ├── notification.controller.js
│   │       ├── notification.service.js
│   │       ├── notification.routes.js
│   │       └── notification.middleware.js
│   │
│   ├── socket/                # WebSocket event handlers
│   │   └── (Socket.IO integration)
│   │
│   ├── middleware/            # Express middleware
│   │   ├── rateLimitter.middleware.js
│   │   └── validate.middleware.js
│   │
│   ├── jobs/                  # Bull background jobs
│   │   └── (Scheduled tasks)
│   │
│   └── utils/                 # Shared utilities
│       ├── logger.js          # Winston logger with Morgan
│       ├── apiError.js        # Standardized error handling
│       ├── asyncHandler.js    # Express error wrapper
│       ├── jwt.js             # Token generation/verification
│       ├── password.js        # Password hashing/verification
│       ├── tokens.js          # Token utilities
│       ├── sendEmail.js       # Email delivery
│       └── apiResponse.js     # Standardized API responses
│
├── prisma/
│   ├── schema.prisma          # PostgreSQL schema (Neon)
│   ├── migrations/            # Database migration history
│   └── [generated files]
│
├── .env.example               # Environment variables template
├── package.json               # Dependencies & scripts
└── README.md                  # This file
```

### Quick Navigation to Feature Docs

Each feature module has its own comprehensive README:

| Feature          | Documentation                                                   | Purpose                                |
| ---------------- | --------------------------------------------------------------- | -------------------------------------- |
| 👤 Auth          | [auth/README.md](./src/features/auth/README.md)                 | Registration, login, sessions, JWT     |
| 💬 Chat          | [chat/README.md](./src/features/chat/README.md)                 | Messaging, channels, real-time updates |
| 👥 Workspace     | [workspace/README.md](./src/features/workspace/README.md)       | Team management, roles, members        |
| 📋 Tasks         | [tasks/README.md](./src/features/tasks/README.md)               | Task CRUD, assignments, Kanban board   |
| 🔔 Notifications | [notification/README.md](./src/features/notification/README.md) | Alerts, preferences, delivery          |

**→ [View System Architecture](./ARCHITECTURE.md)** for complete data flow, database design, and scalability patterns.

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- PostgreSQL ([Neon](https://neon.tech) recommended — free tier available)
- Redis (local or [Upstash](https://upstash.com) — free tier available)

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/collabify.git
cd collabify
```

### 2. Set up the server

```bash
cd server
npm install
```

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

| Variable         | Description                                          |
| ---------------- | ---------------------------------------------------- |
| `PORT`           | Server port (default 3003)                           |
| `MONGODB_URI`    | MongoDB connection string                            |
| `DATABASE_URL`   | Neon PostgreSQL pooled connection URL                |
| `DIRECT_URL`     | Neon PostgreSQL direct connection URL                |
| `JWT_SECRET`     | Secret key for signing JWT tokens                    |
| `JWT_EXPIRES_IN` | Token expiry duration (e.g. `7d`)                    |
| `CLIENT_URL`     | Frontend URL for CORS (e.g. `http://localhost:5173`) |

### 3. Set up the database

Generate the Prisma client and push the schema:

```bash
npx prisma generate
npx prisma db push
```

### 4. Start the server

```bash
npm run dev
```

Server runs at `http://localhost:3003`. Health check at `http://localhost:3003/health`.

### 5. Set up the client

```bash
cd ../client
npm install
npm run dev
```

Client runs at `http://localhost:5173`.

---

## 📚 Documentation Guide

### For Different Audiences

**I want to...**

- **Understand the overall system** → Read [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Learn about a specific feature** → Click the feature link below:
  - [👤 Authentication](./src/features/auth/README.md)
  - [💬 Chat](./src/features/chat/README.md)
  - [👥 Workspace](./src/features/workspace/README.md)
  - [📋 Tasks](./src/features/tasks/README.md)
  - [🔔 Notifications](./src/features/notification/README.md)
- **Understand data flow** → See [ARCHITECTURE.md - Data Flow](./ARCHITECTURE.md#data-flow) section
- **Set up the project** → Continue reading below (Getting Started)
- **Find API endpoints** → See [ARCHITECTURE.md - API Overview](./ARCHITECTURE.md#api-overview) or feature docs

### Documentation Structure

```
README.md (you are here)
  └── Quick start & project overview

ARCHITECTURE.md
  └── System design & technical decisions
      ├── High-level architecture
      ├── Data flow examples
      ├── Database schema
      ├── Real-time communication
      └── Scalability patterns

src/features/[feature]/README.md
  └── Feature-specific documentation
      ├── Quick start examples
      ├── Core services & methods
      ├── API endpoints
      ├── Socket.IO events
      ├── Error handling
      ├── Performance tips
      └── Testing examples
```

---

## Database Schema

### MongoDB collections

- `channels` — group channels and DMs
- `messages` — all messages and threaded replies (via `parentId`)
- `reactions` — emoji reactions per message
- `read_receipts` — last read position per user per channel

### PostgreSQL tables

- `users` — accounts and auth
- `workspaces` — top-level team containers
- `workspace_members` — user↔workspace with roles
- `invitations` — pending email invites
- `tasks` — assigned work items with deadlines
- `subtasks` — breakdown of tasks
- `task_assignments` — task↔member mapping
- `notifications` — in-app alerts

### Redis key patterns

- `session:{userId}:{tokenId}` — auth session cache (TTL 7d)
- `typing:{channelId}:{userId}` — typing indicator (TTL 5s)

---

## API Overview

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout

GET    /api/workspaces
POST   /api/workspaces
GET    /api/workspaces/:id/members

GET    /api/channels
POST   /api/channels
GET    /api/channels/:id/messages

GET    /api/tasks
POST   /api/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
```

---

## Socket Events

```
# Client → Server
join_channel          join a channel room
send_message          send a new message
typing_start          user started typing
typing_stop           user stopped typing

# Server → Client
new_message           broadcast message to channel
user_typing           notify others of typing
message_read          read receipt update
task_updated          live task status change
notification          new notification for user
```

---

## Scripts

```bash
# Server
npm run dev         # start with nodemon (development)
npm start           # start without nodemon (production)

# Prisma
npx prisma generate          # regenerate Prisma client
npx prisma db push           # push schema changes (development)
npx prisma migrate dev       # create a named migration
npx prisma migrate deploy    # apply migrations (production)
npx prisma studio            # open visual DB browser
```

---

## Roadmap

- [x] Project setup and database connections
- [ ] Authentication (register, login, JWT)
- [ ] Workspace and member management
- [ ] Real-time chat with Socket.IO
- [ ] File uploads (S3 / Cloudflare R2)
- [ ] Task management and Kanban board
- [ ] Notifications and deadline reminders
- [ ] Manager dashboard and analytics
- [ ] React frontend
- [ ] Deployment

---

## License

MIT
