# Collabify - Architecture Documentation

> Complete system design, data flow, and technical architecture of the Collabify platform.

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Layers](#architecture-layers)
- [Data Flow](#data-flow)
- [Database Design](#database-design)
- [Real-Time Communication](#real-time-communication)
- [Authentication & Security](#authentication--security)
- [Scalability & Performance](#scalability--performance)

---

## System Overview

Collabify is a **multi-tenant, real-time collaboration platform** built with a **layered microservice-inspired architecture**. It separates concerns into distinct layers for maintainability, testability, and scalability.

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (React + Vite)                   │
│         Zustand Store | TanStack Query | Socket.IO Client    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                REST API              WebSocket
              HTTP/HTTPS              Socket.IO
                    │                     │
┌──────────────────┴─────────────────────┴──────────────────────┐
│                    NODE.JS/EXPRESS SERVER                       │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                 MIDDLEWARE LAYER                        │   │
│  │  (Auth | Rate Limiting | Error Handling | Logging)     │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           FEATURES (Controllers & Routes)               │   │
│  │  ┌─────────┬────────┬──────────┬──────────┬────────┐   │   │
│  │  │  Auth   │ Chat   │ Workspace│ Tasks    │ Notif. │   │   │
│  │  └─────────┴────────┴──────────┴──────────┴────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           SERVICE LAYER (Business Logic)                │   │
│  │  (Validation | Processing | Cross-cutting Concerns)     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────┬──────────────┬──────────────────────────┐   │
│  │ Socket.IO    │   Bull Jobs  │  Logging & Utils         │   │
│  │ Handlers     │  (Queue)     │  (JWT | Password | Email)│   │
│  └──────────────┴──────────────┴──────────────────────────┘   │
└──────────────┬───────────────────┬──────────────┬───────────────┘
               │                   │              │
        ┌──────▼──────┐   ┌────────▼──────┐  ┌───▼──────┐
        │  MONGODB    │   │  POSTGRESQL   │  │  REDIS   │
        │  (Messages) │   │  (Users/Tasks)│  │(Sessions)│
        └─────────────┘   │  (Prisma ORM) │  └──────────┘
                          │               │
                          │ Neon.tech     │
                          └───────────────┘
```

---

## Architecture Layers

### 1. **Presentation Layer** (Frontend)

- React components with TypeScript
- Zustand for global state management
- TanStack Query for server state
- Socket.IO client for real-time events
- Tailwind CSS for styling

### 2. **API Layer** (Express.js)

- **Routes**: Define HTTP endpoints
- **Controllers**: Handle request/response
- **Middleware**: Auth, validation, error handling

```
Request → Middleware Pipeline → Route → Controller → Service → Response
```

### 3. **Service Layer** (Business Logic)

Each feature has dedicated service files:

- `auth.service.js` - User authentication & token management
- `chat.service.js` - Message operations & channels
- `workspace.service.js` - Team & member management
- `task.service.js` - Task CRUD & status updates
- `notification.service.js` - Alert generation & delivery

Services handle:

- ✅ Validation & data transformation
- ✅ Cross-database queries
- ✅ Business rule enforcement
- ✅ Error handling

### 4. **Data Access Layer** (Models & ORMs)

```
Mongoose (MongoDB)           Prisma ORM (PostgreSQL)
├── Message                  ├── User
├── Channel                  ├── Workspace
├── Reaction                 ├── WorkspaceMember
├── ReadReceipt              ├── Task
├── UserPresence (Redis)     ├── Subtask
└── BlockList                └── Notification
```

### 5. **Infrastructure Layer**

- **Express.js**: HTTP server & routing
- **Socket.IO**: Real-time websocket communication
- **Bull**: Job queue for async tasks
- **Winston/Morgan**: Logging & monitoring
- **JWT + bcryptjs**: Auth & security

---

## Data Flow

### Example: Sending a Message

```
1. CLIENT SIDE
   ↓
   User types message in chat UI
   → Zustand updates local state optimistically
   → emit 'send_message' via Socket.IO
   → TanStack Query invalidates cache

2. SERVER SIDE (Socket Handler)
   ↓
   Receive 'send_message' with { channelId, content, userId }
   → Authenticate user (JWT from socket auth)
   → Validate message format & permissions
   → Save to MongoDB via Message.create()
   → Queue notification jobs in Bull (Redis)

3. SERVER BROADCASTS
   ↓
   emit 'new_message' to all users in channel room
   → Send push notification if user offline
   → Update read receipts if already read

4. CLIENT RECEIVES
   ↓
   Socket event 'new_message' received
   → TanStack Query refetch channel messages
   → Zustand updates message list
   → UI re-renders with new message
```

### Example: Creating a Task

```
1. CLIENT → POST /api/tasks
   { title, assignee, deadline, workspaceId }

2. CONTROLLER
   ↓
   Validate request
   → Check user has permission in workspace
   → Call taskService.createTask()

3. SERVICE (Business Logic)
   ↓
   Create task in PostgreSQL (Prisma)
   → Create notification record
   → Enqueue reminder job (due in 24h)
   → Log activity to audit trail

4. RESPONSE
   ↓
   Return created task with ID & timestamps
   → Client updates cache
   → Socket broadcasts to workspace members
   → Assignee gets real-time notification
```

---

## Database Design

### MongoDB (Ephemeral/Real-time Data)

```javascript
// Messages
{
  _id: ObjectId,
  channelId: ObjectId,
  userId: string,
  content: string,
  parentId: ObjectId,        // for threaded replies
  reactions: [{ emoji, users }],
  attachments: [{ url, type }],
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date             // soft delete
}

// Channels
{
  _id: ObjectId,
  workspaceId: string,
  name: string,
  description: string,
  isPrivate: boolean,
  createdBy: string,
  members: [string],          // user IDs
  createdAt: Date
}

// ReadReceipts
{
  _id: ObjectId,
  channelId: ObjectId,
  userId: string,
  lastReadMessageId: ObjectId,
  lastReadAt: Date
}
```

### PostgreSQL (Persistent Data - Prisma)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  displayName   String
  avatar        String?
  workspaces    WorkspaceMember[]
  tasks         Task[]
  createdAt     DateTime  @default(now())
}

model Workspace {
  id            String    @id @default(cuid())
  name          String
  ownerId       String
  members       WorkspaceMember[]
  tasks         Task[]
  createdAt     DateTime  @default(now())
}

model Task {
  id            String    @id @default(cuid())
  workspaceId   String
  title         String
  status        String    // "TODO" | "IN_PROGRESS" | "DONE"
  assignees     TaskAssignment[]
  deadline      DateTime?
  createdAt     DateTime  @default(now())
}
```

### Redis (Session & Cache)

```
Key Patterns:
├── session:{userId}:{tokenId}      → User session data (TTL: 7d)
├── typing:{channelId}:{userId}     → Typing indicator (TTL: 5s)
├── presence:{workspaceId}:{userId} → User online status (TTL: 30m)
└── workspace:{id}:members          → Member list cache (TTL: 1h)
```

---

## Real-Time Communication

### Socket.IO Events

#### Client → Server

| Event             | Payload                        | Purpose                      |
| ----------------- | ------------------------------ | ---------------------------- |
| `join_channel`    | `{ channelId }`                | Subscribe to channel updates |
| `leave_channel`   | `{ channelId }`                | Unsubscribe from channel     |
| `send_message`    | `{ channelId, content }`       | Broadcast message to channel |
| `typing_start`    | `{ channelId }`                | Notify typing                |
| `typing_stop`     | `{ channelId }`                | Clear typing indicator       |
| `update_presence` | `{ status, currentChannelId }` | Update user presence         |

#### Server → Client

| Event          | Payload                 | Purpose                |
| -------------- | ----------------------- | ---------------------- |
| `new_message`  | Message object          | New message in channel |
| `user_typing`  | `{ userId, channelId }` | User is typing         |
| `user_joined`  | `{ userId, channelId }` | User joined channel    |
| `task_updated` | Task object             | Task status changed    |
| `notification` | Notification object     | New in-app alert       |

### Connection Lifecycle

```
1. CLIENT CONNECTS
   └─→ Socket.IO handshake
   └─→ Server validates JWT token
   └─→ Store socket ID with user session

2. USER JOINS CHANNEL
   └─→ emit 'join_channel' { channelId }
   └─→ Server adds socket to channel room
   └─→ Broadcast 'user_joined' to all members

3. MESSAGE SENT
   └─→ emit 'send_message' { channelId, content }
   └─→ Server validates & saves to MongoDB
   └─→ emit 'new_message' to channel room
   └─→ Clients update UI

4. CLIENT DISCONNECTS
   └─→ Server removes socket from all rooms
   └─→ Emit 'user_left' to notify connection drop
   └─→ Attempt reconnection (exponential backoff)
```

---

## Authentication & Security

### JWT Flow

```
┌──────────────┐
│   Register   │
└──────┬───────┘
       │ POST /api/auth/register
       │ { email, password, name }
       ▼
┌─────────────────────────┐
│ Hash password (bcryptjs)│
│ Create user in PostgreSQL│
└──────┬──────────────────┘
       │
       ▼
┌────────────────────────────┐
│ Generate JWT token         │
│ exp: now + 7d              │
│ sub: userId                │
└──────┬─────────────────────┘
       │ Store in Redis
       │ Redis key: session:{userId}:{tokenId}
       │ TTL: 7 days
       │
       ▼
    RETURN TOKEN TO CLIENT

┌──────────────────────────────┐
│  Client stores in localStorage│
│  or HttpOnly cookie           │
└────────────┬─────────────────┘
             │
             ▼ (Every request)
┌─────────────────────────────┐
│ Authentication Middleware    │
│ 1. Extract token from header│
│ 2. Verify JWT signature     │
│ 3. Check Redis session      │
│ 4. Attach user to req       │
└─────────────────────────────┘
```

### Role-Based Access Control (RBAC)

```
Workspace Hierarchy:
├── OWNER (1 per workspace)
│   └─ Full access to all features
│   └─ Can manage members & roles
│   └─ Can view audit logs
│
├── MANAGER
│   └─ Create/edit tasks
│   └─ Assign tasks to members
│   └─ View analytics
│   └─ Cannot manage workspace settings
│
├── MEMBER
│   └─ Can join channels
│   └─ Can message & comment
│   └─ Can view assigned tasks
│
└── GUEST (optional)
    └─ Read-only access
    └─ Cannot post messages
```

Middleware check:

```javascript
checkRole(["OWNER", "MANAGER"], async (req, res, next) => {
  const { workspaceId } = req.params;
  const member = await WorkspaceMember.findOne({
    userId: req.user.id,
    workspaceId,
  });
  if (!member || !["OWNER", "MANAGER"].includes(member.role)) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  next();
});
```

---

## Scalability & Performance

### Caching Strategy

```
L1: CLIENT SIDE
├─ TanStack Query (stale-while-revalidate)
├─ Zustand local state (UI state)
└─ Browser cache (static assets)

L2: REDIS
├─ Session cache (user auth)
├─ Presence data (30m TTL)
├─ Channel member lists (1h TTL)
└─ Recent messages (12h TTL)

L3: DATABASE
├─ MongoDB indexes on frequently queried fields
├─ PostgreSQL query optimization
└─ Archived data partition (messages > 1 year)
```

### Database Optimization

**MongoDB Indexes:**

```javascript
db.messages.createIndex({ channelId: 1, createdAt: -1 });
db.messages.createIndex({ userId: 1, createdAt: -1 });
db.readReceipts.createIndex({ channelId: 1, userId: 1 }, { unique: true });
```

**PostgreSQL Performance:**

```sql
-- Composite index for common queries
CREATE INDEX idx_tasks_workspace_status
ON tasks(workspace_id, status) WHERE deleted_at IS NULL;

-- For frequently filtered columns
CREATE INDEX idx_workspace_member_workspace
ON workspace_members(workspace_id);
```

### Load Balancing & Horizontal Scaling

```
                ┌────────────────────────────┐
                │   Nginx Load Balancer      │
                │   (Round-robin)            │
                └──────────────┬─────────────┘
                               │
                ┌──────────────┬┴──────────────┐
                │              │               │
          ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
          │  Node 1    │  │  Node 2    │  │  Node 3    │
          │:3003       │  │:3003       │  │:3003       │
          └────┬───────┘  └────┬───────┘  └────┬───────┘
               │                │               │
               └────────────────┼───────────────┘
                                │
                ┌───────────────┼────────────────┐
                │               │                │
         ┌──────▼──────┐  ┌─────▼────────┐  ┌───▼────────────┐
         │ MongoDB     │  │ PostgreSQL   │  │ Redis Cluster  │
         │ Replica Set │  │ RDS Instance │  │ (Sentinel)     │
         └─────────────┘  └──────────────┘  └────────────────┘
```

### Async Processing with Bull

```javascript
// Email job (non-blocking)
emailQueue.add(
  "send-invite",
  { userId, email },
  {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: true,
  },
);

// Daily digest job (scheduled)
notificationQueue.add(
  "daily-digest",
  {},
  {
    repeat: { cron: "0 8 * * *" }, // 8 AM daily
  },
);

// Indexing job (background)
indexQueue.add(
  "rebuild-search",
  { channelId },
  {
    priority: "low",
  },
);
```

---

## Monitoring & Observability

### Logging Levels

```javascript
logger.info("User logged in", { userId, timestamp });
logger.warn("Rate limit approaching", { userId, remaining: 95 });
logger.error("Database connection failed", { error, retrying: true });
logger.debug("Query executed", { queryTime: 185, records: 42 });
```

### Key Metrics to Track

- API response times (p50, p95, p99)
- Database query performance
- Socket.IO connection stats
- Job queue depth & processing time
- Cache hit/miss ratio
- Error rates by endpoint

---

## References

- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Socket.IO Scaling Guide](https://socket.io/docs/v4/socket-io-redis/)
- [Prisma Performance](https://www.prisma.io/docs/orm/overview/databases/postgresql#optimizing-queries)
- [Redis Pattern Guide](https://redis.io/docs/latest/develop/develop-clients/)
