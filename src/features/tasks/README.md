# Tasks Feature

> Task management, assignments, Kanban board, deadlines, and progress tracking.

## Overview

The Tasks feature provides:

- **Task CRUD** - Create, read, update, delete tasks
- **Assignments** - Assign tasks to team members
- **Kanban Board** - Visual status tracking (TODO, IN_PROGRESS, DONE)
- **Deadlines** - Set due dates with reminders
- **Subtasks** - Break tasks into smaller work items
- **Priorities** - Low, Medium, High, Critical
- **Labels & Filters** - Organize and search tasks
- **Comments & Activity** - Discussion on tasks

## Quick Start

```typescript
// Create Task
POST /api/tasks
{
  title: "Design homepage",
  description: "Create mockups and design system",
  workspaceId: "ws_123",
  assignees: ["user_1", "user_2"],
  priority: "HIGH",
  deadline: "2026-04-15",
  status: "TODO"
}

// Get Tasks (with filters)
GET /api/tasks?workspaceId=ws_123&status=IN_PROGRESS&assigned_to=user_1

// Update Task
PATCH /api/tasks/{taskId}
{
  status: "IN_PROGRESS",
  priority: "CRITICAL"
}

// Add Subtask
POST /api/tasks/{taskId}/subtasks
{ title: "Create wireframes" }

// Comment on Task
POST /api/tasks/{taskId}/comments
{ content: "Added design feedback" }
```

## Architecture

### File Structure

```
features/tasks/
├── task.controller.js        # Request handlers
├── task.service.js           # Business logic
├── task.routes.js            # API endpoints
├── task.middleware.js        # Permission checks
├── task.validation.js        # Input validation
└── README.md
```

### Data Models

#### Task (PostgreSQL via Prisma)

```prisma
model Task {
  id            String    @id @default(cuid())
  workspaceId   String
  title         String
  description   String?
  status        String    // "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE"
  priority      String    // "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

  assignees     TaskAssignment[]  // Link to users
  subtasks      Subtask[]         // Child tasks
  comments      TaskComment[]

  createdBy     String    // User who created task
  createdAt     DateTime  @default(now())

  deadline      DateTime?
  startDate     DateTime?

  // Kanban board position
  boardPosition Int       @default(0)

  // Metadata
  labels        String[]  // ["bug", "feature", "urgent"]
  storyPoints   Int?      // For agile tracking

  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime? // Soft delete
}
```

#### TaskAssignment (PostgreSQL via Prisma)

```prisma
model TaskAssignment {
  id            String    @id @default(cuid())
  taskId        String
  userId        String
  assignedAt    DateTime  @default(now())

  task          Task      @relation(fields: [taskId], references: [id])
  user          User      @relation(fields: [userId], references: [id])

  @@unique([taskId, userId])  // One assignment per user
}
```

#### Subtask (PostgreSQL via Prisma)

```prisma
model Subtask {
  id            String    @id @default(cuid())
  taskId        String    // Parent task
  title         String
  description   String?
  completed     Boolean   @default(false)
  completedAt   DateTime?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  task          Task      @relation(fields: [taskId], references: [id])
}
```

#### TaskComment (PostgreSQL via Prisma)

```prisma
model TaskComment {
  id            String    @id @default(cuid())
  taskId        String
  userId        String
  content       String

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime? // Soft delete

  task          Task      @relation(fields: [taskId], references: [id])
  user          User      @relation(fields: [userId], references: [id])
}
```

### Status Workflow

```
        ┌─────────────┐
        │    TODO     │
        └──────┬──────┘
               │
         User picks task
               │
               ▼
        ┌──────────────────┐
        │   IN_PROGRESS    │
        └──────┬───────────┘
               │
         Feedback? ───→ REVIEW ──→ Changes
               │          ▲         │
               │          └─────────┘
               │
         All done?
               │
               ▼
        ┌──────────────┐
        │     DONE     │
        └──────────────┘
```

## Core Services

### `task.service.js` - Task Operations

#### Task Methods

```javascript
// Create task
createTaskService(workspaceId, createdBy, taskData);
// Steps:
// 1. Validate title, priority, status
// 2. Save to PostgreSQL
// 3. Create TaskAssignment for each assignee
// 4. Notify assigned users
// 5. Queue deadline reminder job
// Returns: task with assignees populated

// List tasks with filters
listTasksService(workspaceId, (filters = {}));
// Filters:
//   - status: ["TODO", "IN_PROGRESS", "DONE"]
//   - priority: ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
//   - assigned_to: userId
//   - created_by: userId
//   - search: "text search in title/description"
//   - deadline: { from, to }
//   - labels: ["bug", "feature"]
// Returns: paginated array of tasks

// Get single task
getTaskService(taskId);
// Includes: assignees, subtasks, comments, activity log

// Update task
updateTaskService(taskId, userId, updates);
// Allowed fields: title, description, status, priority, deadline
// Broadcast changes via Socket.IO
// Only creator or MANAGER can update

// Change task status
updateTaskStatusService(taskId, userId, newStatus);
// Validates status transition
// Updates updatedAt & possibly completedAt
// Notifies assignees of status change

// Delete task (soft delete)
deleteTaskService(taskId, userId);
// Sets deletedAt timestamp
// Preserves for audit trail

// Assign task to user
assignTaskService(taskId, userId, assignedBy);
// Creates TaskAssignment
// Notifies user
// Can assign same task to multiple users

// Remove assignee
removeAssigneeService(taskId, userId);
```

#### Subtask Methods

```javascript
// Add subtask
createSubtaskService(taskId, title, description);
// Returns: subtask with completion status

// Complete subtask
completeSubtaskService(subtaskId);
// Sets completedAt timestamp
// Updates parent task completion percentage
// Broadcast update to workspace

// Uncomplete subtask
uncompleteSubtaskService(subtaskId);

// Get subtasks with completion %
getSubtasksService(taskId);
// Returns: { subtasks, completionPercentage: 67 }

// Delete subtask
deleteSubtaskService(subtaskId);
```

#### Comment Methods

```javascript
// Add comment
createCommentService(taskId, userId, content);
// Updates task.updatedAt
// Mentions are parsed (@user_name)
// Notifies mentioned users

// Edit comment
editCommentService(commentId, userId, newContent);
// Only author can edit

// Delete comment
deleteCommentService(commentId, userId);
// Soft delete

// Get comments (paginated)
getCommentsService(taskId, (limit = 20), (skip = 0));
```

#### Advanced Queries

```javascript
// Get user's assigned tasks
getUserTasksService(userId, workspaceId);
// Status: (TODO + IN_PROGRESS)
// Ordered by: deadline, then priority

// Get overdue tasks
getOverdueTasksService(workspaceId);
// Returns: tasks where deadline < now AND status !== DONE

// Get tasks due soon (7 days)
getUpcomingTasksService(workspaceId);
// Returns: tasks with deadline in next 7 days

// Get completed tasks per user (for metrics)
getCompletedTasksService(workspaceId, userId, (period = "1 month"));
// Used for dashboard analytics
```

## API Endpoints

### Tasks

```
GET    /api/tasks                           # List with filters
POST   /api/tasks                           # Create task
GET    /api/tasks/:id                       # Get task details
PATCH  /api/tasks/:id                       # Update task
DELETE /api/tasks/:id                       # Delete task
PATCH  /api/tasks/:id/status                # Change status only
```

### Assignments

```
POST   /api/tasks/:id/assign                # Assign to user
DELETE /api/tasks/:id/assign/:userId        # Remove assignee
GET    /api/users/:userId/tasks             # Get user's tasks
```

### Subtasks

```
POST   /api/tasks/:id/subtasks              # Create subtask
PATCH  /api/tasks/:id/subtasks/:subId       # Update subtask
DELETE /api/tasks/:id/subtasks/:subId       # Delete subtask
POST   /api/tasks/:id/subtasks/:subId/complete  # Mark complete
```

### Comments

```
GET    /api/tasks/:id/comments              # List comments
POST   /api/tasks/:id/comments              # Add comment
PATCH  /api/tasks/:id/comments/:commentId   # Edit comment
DELETE /api/tasks/:id/comments/:commentId   # Delete comment
```

### Board Operations

```
GET    /api/workspaces/:wsId/board          # Get Kanban board
PATCH  /api/tasks/:id/position              # Drag-drop reorder
GET    /api/workspaces/:wsId/stats          # Task statistics
```

## Real-Time Events

### Socket.IO Integration

```javascript
// Task created
taskCreated: {
  (taskId, title, createdBy, workspaceId);
}

// Task status changed
taskStatusChanged: {
  (taskId, oldStatus, newStatus, changedBy);
}

// Task assigned
taskAssigned: {
  (taskId,
    userId, // newly assigned user
    title,
    assignedBy);
}

// Comment added
commentAdded: {
  (taskId, userId, content, createdAt);
}

// Subtask completed
subtaskCompleted: {
  (taskId, subtaskId, completionPercentage);
}
```

## Usage Examples

### Create Task

```bash
curl -X POST http://localhost:3003/api/tasks \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement login",
    "description": "Add JWT authentication",
    "workspaceId": "ws_123",
    "priority": "HIGH",
    "deadline": "2026-04-15",
    "assignees": ["user_1", "user_2"]
  }'
```

### Filter Tasks by Status

```bash
curl "http://localhost:3003/api/tasks?workspaceId=ws_123&status=IN_PROGRESS,REVIEW&priority=HIGH,CRITICAL" \
  -H "Authorization: Bearer {token}"

# Returns tasks that are IN_PROGRESS or REVIEW AND HIGH or CRITICAL priority
```

### Update Task via Kanban Drag-Drop

```javascript
// Frontend (React)
const handleDragEnd = async (draggedTask, newStatus) => {
  await updateTask(draggedTask.id, {
    status: newStatus,
    boardPosition: calculateNewPosition(newStatus),
  });

  // Socket event triggers real-time update
  socket.emit("task_updated", { taskId, status: newStatus });
};
```

### Get User Dashboard

```bash
curl "http://localhost:3003/api/users/user_1/tasks?workspaceId=ws_123" \
  -H "Authorization: Bearer {token}"

# Returns:
# {
#   "assigned": [
#     { id, title, status, deadline, priority, ... },
#     ...
#   ],
#   "created": [
#     ...
#   ],
#   "stats": {
#     "total": 15,
#     "todo": 8,
#     "in_progress": 5,
#     "done": 2,
#     "overdue": 1
#   }
# }
```

## Permission Rules

| Action        | Owner | Manager | Member | Guest |
| ------------- | ----- | ------- | ------ | ----- |
| Create task   | ✅    | ✅      | ✅     | ❌    |
| View task     | ✅    | ✅      | ✅     | ❌    |
| Edit task     | ✅    | ✅\*    | ✅\*   | ❌    |
| Delete task   | ✅    | ✅\*    | ❌     | ❌    |
| Assign task   | ✅    | ✅      | ❌     | ❌    |
| Change status | ✅    | ✅      | ✅\*\* | ❌    |
| Comment       | ✅    | ✅      | ✅     | ❌    |

\*Creator or assigned users can edit, anyone can mark as done
\*\*Only for self-assigned tasks

## Deadline Reminders (Bull Jobs)

```javascript
const taskReminderQueue = new Queue('task-reminders', redisUrl);

// When task created with deadline
taskReminderQueue.add(
  'reminder-24h',
  { taskId, assignees },
  {
    delay: calculateDelay(deadline - 24hours),
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  }
);

// Job handler sends:
// 1. In-app notification
// 2. Email to assignees
// 3. Slack message (if integrated)
```

## Dashboard Analytics

### Metrics Calculated

```javascript
// Task metrics
{
  total_tasks: 50,
  completed: 32,
  in_progress: 12,
  todo: 6,
  completion_rate: 64,           // %

  // Performance
  avg_completion_time: 3.2,      // days
  on_time_rate: 87,              // %
  overdue_tasks: 2,

  // Per user
  users: [
    {
      userId,
      assigned: 10,
      completed: 8,
      in_progress: 2,
      on_time_rate: 90
    }
  ],

  // Priority breakdown
  by_priority: {
    CRITICAL: 3,
    HIGH: 8,
    MEDIUM: 25,
    LOW: 14
  }
}
```

## Error Handling

| Status | Error                     | Cause                 |
| ------ | ------------------------- | --------------------- |
| 400    | Task title required       | Missing title         |
| 400    | Invalid status transition | Cannot move DONE→TODO |
| 401    | Unauthorized              | Token invalid         |
| 403    | Cannot edit               | Not creator/manager   |
| 403    | Cannot delete             | Workspace member only |
| 404    | Task not found            | Invalid taskId        |
| 409    | Already assigned          | User already assigned |

## Performance Optimization

### Database Indexes

```sql
-- Task lookups
CREATE INDEX idx_tasks_workspace_status
ON tasks(workspace_id, status) WHERE deleted_at IS NULL;

CREATE INDEX idx_tasks_deadline
ON tasks(deadline) WHERE deadline IS NOT NULL;

-- Assignment lookups
CREATE INDEX idx_assignments_user
ON task_assignments(user_id);

-- Comment lookups
CREATE INDEX idx_comments_task
ON task_comments(task_id);
```

### Query Optimization

```javascript
// Bad: N+1 queries
const tasks = await Task.find({ workspaceId });
tasks.forEach((t) => console.log(t.createdBy.name)); // N queries

// Good: JOIN with user data
const tasks = await Task.find({ workspaceId })
  .populate("createdBy", "name email")
  .populate("assignees");
```

### Caching

- **User's tasks** - Cache 5 minutes
- **Board view** - Cache 2 minutes (invalidate on change)
- **Task stats** - Cache 1 hour

## Testing

```javascript
describe("Task Service", () => {
  it("should create task with assignees", async () => {
    const task = await createTaskService("ws_123", "user_1", {
      title: "Test",
      assignees: ["user_2", "user_3"],
    });

    expect(task.assignees).toHaveLength(2);
  });

  it("should calculate subtask completion %", async () => {
    const task = await getTaskService(taskId);
    expect(task.completionPercentage).toBe(50); // 1 of 2 done
  });
});
```

## Related Features

- 👥 **Workspace**: Tasks belong to workspaces
- 💬 **Chat**: Comment/discuss tasks in messages
- 🔔 **Notifications**: Task reminders & updates
- 📊 **Dashboard**: Task analytics & metrics

---

For more details, see [Architecture Guide](../../ARCHITECTURE.md) or [Main README](../../README.md).
