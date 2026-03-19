# Collabify

A full-stack real-time chat and project collaboration platform. Teams can communicate through channels and direct messages, while managers can assign tasks, track progress, and manage deadlines — all in one place.

---

## Features

### Chat

- Real-time messaging with Socket.IO
- Group channels and direct messages
- Threaded replies and emoji reactions
- File and media sharing
- Read receipts and typing indicators
- Message search and pinning

### Collaboration

- Assign tasks to team members with deadlines
- Kanban board with drag-and-drop
- Subtasks, priorities, and task dependencies
- Manager dashboard with progress tracking
- Deadline reminders and overdue alerts
- Activity log and audit trail

### General

- JWT authentication with secure password hashing
- Workspace-based multi-team support
- Role-based access control (Owner → Manager → Member → Guest)
- Email invitations with role pre-assignment
- Daily digest notifications

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
collabify/
├── client/                   # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   ├── tasks/
│   │   │   └── dashboard/
│   │   ├── store/            # Zustand stores
│   │   ├── hooks/            # useSocket, useAuth, useTasks
│   │   └── pages/
│   └── package.json
│
└── server/                   # Node.js backend
    ├── prisma/
    │   └── schema.prisma     # PostgreSQL schema
    ├── src/
    │   ├── app.js            # Express app setup
    │   ├── config/
    │   │   ├── connectMongoDB.js
    │   │   ├── connectPostgres.js
    │   ├── features/
    │   │   ├── auth/
    │   │   ├── chat/
    │   │   ├── notification/
    │   │   ├── tasks/
    │   │   └── workspace/
    │   ├── models/           # Mongoose models (MongoDB)
    │   ├── routes/           # Express REST endpoints
    │   ├── socket/           # Socket.IO event handlers
    │   ├── middleware/       # Auth, error handling
    │   ├── jobs/             # Bull background jobs
    │   ├── utils/
    │   │   └── logger.js
    │   └── server.js
    └── package.json
```

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
