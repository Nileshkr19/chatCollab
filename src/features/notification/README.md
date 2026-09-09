# Notifications Feature

> In-app alerts, email notifications, push notifications, and delivery preferences.

## Overview

The Notifications feature provides:

- **In-app notifications** - Real-time alerts in UI
- **Email notifications** - Digest and transactional emails
- **Push notifications** - Browser push & mobile
- **Notification preferences** - User control over what's sent
- **Delivery guarantees** - Retry logic with exponential backoff
- **Analytics** - Track read rates & engagement

## Quick Start

```typescript
// Get User Notifications
GET /api/notifications?unread=true&limit=20

// Mark as Read
PATCH /api/notifications/{notificationId}
{ read: true }

// Mark All as Read
POST /api/notifications/mark-all-read

// Get Read Preferences
GET /api/notifications/preferences

// Update Preferences
PATCH /api/notifications/preferences
{
  email_task_assigned: false,
  push_message_mentioned: true,
  daily_digest: true
}

// Delete Notification
DELETE /api/notifications/{notificationId}
```

## Architecture

### File Structure

```
features/notification/
├── notification.controller.js    # Request handlers
├── notification.service.js       # Business logic
├── notification.routes.js        # API endpoints
├── notification.middleware.js    # Checks & validation
├── notification.validation.js    # Input validation
└── README.md
```

### Data Models

#### Notification (PostgreSQL via Prisma)

```prisma
model Notification {
  id            String    @id @default(cuid())
  userId        String    // Recipient

  // Notification content
  type          String    // "TASK_ASSIGNED", "MESSAGE_MENTIONED", "INVITE_RECEIVED"
  title         String
  content       String    // Brief message

  // Related entity (polymorphic reference)
  relatedType   String?   // "TASK", "MESSAGE", "WORKSPACE"
  relatedId     String?   // ID of related entity

  // Status
  read          Boolean   @default(false)
  readAt        DateTime?

  // Delivery channels
  sentToEmail   Boolean   @default(false)
  sentToPush    Boolean   @default(false)

  // Metadata
  createdAt     DateTime  @default(now())
  expiresAt     DateTime  @default(now() + 30 days)  // Purge old

  user          User      @relation(fields: [userId], references: [id])
}
```

#### NotificationPreference (PostgreSQL via Prisma)

```prisma
model NotificationPreference {
  id            String    @id @default(cuid())
  userId        String    @unique

  // Email preferences
  email_task_assigned    Boolean @default(true)
  email_task_updated     Boolean @default(true)
  email_task_overdue     Boolean @default(true)
  email_message_mentioned Boolean @default(true)
  email_invite_received  Boolean @default(true)

  // Push preferences
  push_task_assigned     Boolean @default(true)
  push_message_mentioned Boolean @default(true)
  push_team_member_joined Boolean @default(true)

  // Digest preferences
  daily_digest           Boolean @default(false)
  digest_frequency       String  @default("DAILY") // "DAILY", "WEEKLY"

  // Do not disturb
  quiet_hours_enabled    Boolean @default(false)
  quiet_start_hour       Int?    // 22
  quiet_end_hour         Int?    // 8

  updatedAt     DateTime  @updatedAt
  user          User      @relation(fields: [userId], references: [id])
}
```

### Notification Types

```javascript
const NOTIFICATION_TYPES = {
  // Task related
  TASK_ASSIGNED: "Task assigned to you",
  TASK_UPDATED: "Task you created/assigned updated",
  TASK_OVERDUE: "Task is overdue",
  TASK_COMPLETED: "Task marked as complete",

  // Chat related
  MESSAGE_MENTIONED: "You were mentioned in a message",
  CHANNEL_JOINED: "Someone joined your channel",
  MESSAGE_REPLY: "New reply to your message/thread",

  // Workspace related
  INVITE_RECEIVED: "Invited to join workspace",
  MEMBER_JOINED: "New member joined workspace",
  ROLE_CHANGED: "Your role changed in workspace",
  MEMBER_REMOVED: "Removed from workspace",

  // System
  WELCOME: "Welcome to Collabify",
  ACCOUNT_VERIFICATION: "Verify your email",
};
```

## Core Services

### `notification.service.js` - Notification Management

#### Creation Methods

```javascript
// Create and send notification
createNotificationService(userId, type, data);
// Steps:
// 1. Create notification in PostgreSQL
// 2. Check user preferences
// 3. Queue email job if enabled
// 4. Queue push job if enabled
// 5. Broadcast via Socket.IO if user online
// Returns: notification object

// Bulk create (for group notifications)
createBulkNotificationsService(userIds, type, data);
// Efficiently sends same notification to multiple users
// Used for: "Team member joined", "Channel created"

// Example:
await createNotificationService("user_123", "TASK_ASSIGNED", {
  title: "New task: Design homepage",
  content: 'You have been assigned to "Design homepage" task',
  relatedType: "TASK",
  relatedId: "task_456",
});
```

#### Retrieval Methods

```javascript
// Get user's notifications
getNotificationsService(userId, (options = {}));
// Options:
//   - limit: 20
//   - skip: 0
//   - unread: true
//   - type: 'TASK_ASSIGNED'
// Returns: paginated array with total count

// Get single notification
getNotificationService(notificationId);
// Returns: full notification with related entity expanded

// Get notification count
getUnreadCountService(userId);
// Returns: { unread: 5, total: 128 }
```

#### Status Update Methods

```javascript
// Mark single notification as read
markAsReadService(notificationId);
// Sets read = true, readAt = now()

// Mark all notifications as read
markAllAsReadService(userId);
// Efficient bulk update

// Mark notification for deletion
deleteNotificationService(notificationId);

// Cleanup expired notifications (run daily)
cleanupExpiredNotificationsService();
// Delete notifications older than 30 days
// Runs as scheduled job
```

#### Preference Methods

```javascript
// Get user preferences
getPreferencesService(userId);
// Returns: all notification preferences

// Update preferences
updatePreferencesService(userId, updates);
// Only updates provided fields
// Validates quiet hours (0-23)
// Validates frequency enum

// Get default preferences (for new users)
getDefaultPreferencesService();
// Returns: sensible defaults

// Check if notification should be sent
shouldSendNotificationService(userId, notificationType);
// Steps:
// 1. Get user preferences
// 2. Check type is enabled
// 3. Check quiet hours (if enabled)
// 4. Return boolean
```

#### Delivery Methods

```javascript
// Send email notification
sendEmailNotificationService(userId, notificationType, data);
// Steps:
// 1. Get user email
// 2. Build email template
// 3. Send via SMTP
// 4. Update Notification.sentToEmail
// 5. Return: success | retry

// Send push notification
sendPushNotificationService(userId, title, body);
// Steps:
// 1. Get user device subscriptions
// 2. Send via FCM / Web Push API
// 3. Update Notification.sentToPush
// 4. Handle failures

// Send daily digest
sendDailyDigestService(userId);
// Steps:
// 1. Get all unread notifications from last 24h
// 2. Group by type
// 3. Build digest email
// 4. Send email
// 5. Mark digest notifications as read
```

### Job Queue Integration (Bull + Redis)

```javascript
const notificationQueue = new Queue("notifications", redisUrl);

// Email job (async)
notificationQueue.add(
  "send-email",
  {
    userId,
    notificationType,
    data,
  },
  {
    delay: 0, // Immediate or delayed
    attempts: 3, // Retry 3 times
    backoff: {
      type: "exponential",
      delay: 2000, // 2s, 4s, 8s
    },
    removeOnComplete: true, // Clean up after success
    removeOnFail: false, // Keep failed jobs for debugging
  },
);

// Daily digest (scheduled)
notificationQueue.add(
  "daily-digest",
  {},
  {
    repeat: { cron: "0 8 * * *" }, // 8 AM daily
  },
);
```

## API Endpoints

### Notifications

```
GET    /api/notifications                   # List user's notifications
GET    /api/notifications/:id               # Get single notification
PATCH  /api/notifications/:id               # Mark as read/update
DELETE /api/notifications/:id               # Delete notification

POST   /api/notifications/mark-all-read     # Mark all as read
GET    /api/notifications/unread-count      # Get unread count
```

### Preferences

```
GET    /api/notifications/preferences       # Get user preferences
PATCH  /api/notifications/preferences       # Update preferences
POST   /api/notifications/preferences/reset # Reset to defaults
```

### Admin

```
POST   /api/admin/notifications/send        # Send test notification
GET    /api/admin/notifications/delivery-stats  # Delivery metrics
```

## Real-Time Events

### Socket.IO Integration

```javascript
// When notification created
notificationReceived: {
  id,
  type,
  title,
  content,
  relatedType,
  relatedId,
  createdAt
}

// When notification read
notificationRead: {
  notificationId,
  readAt
}

// When notification deleted
notificationDeleted: {
  notificationId
}

// Unread count updated
unreadCountUpdated: {
  unread: 3,
  total: 50
}
```

## Usage Examples

### Get Notifications

```bash
curl "http://localhost:3003/api/notifications?limit=20&unread=true" \
  -H "Authorization: Bearer {token}"

# Response:
# {
#   "notifications": [
#     {
#       "id": "notif_123",
#       "type": "TASK_ASSIGNED",
#       "title": "New task: Design homepage",
#       "content": "You have been assigned...",
#       "read": false,
#       "createdAt": "2026-03-28T10:30:00Z",
#       "relatedType": "TASK",
#       "relatedId": "task_456"
#     },
#     ...
#   ],
#   "total": 15,
#   "unread": 5
# }
```

### Update Preferences

```bash
curl -X PATCH http://localhost:3003/api/notifications/preferences \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "email_task_assigned": false,
    "push_message_mentioned": true,
    "daily_digest": true,
    "digest_frequency": "WEEKLY",
    "quiet_hours_enabled": true,
    "quiet_start_hour": 22,
    "quiet_end_hour": 8
  }'
```

## Notification Templates

### Email Template Structure

```
┌─────────────────────────────┐
│   HEADER (Logo + Title)     │
├─────────────────────────────┤
│                             │
│   MAIN CONTENT              │
│   (Type-specific HTML)      │
│                             │
├─────────────────────────────┤
│   CALL TO ACTION BUTTON     │
│   (Link to related entity)  │
├─────────────────────────────┤
│   PREFERENCES LINK          │
│   Footer with Collabify     │
└─────────────────────────────┘
```

### Example: Task Assigned Email

```html
<h2>New Task Assignment</h2>
<p>Hi {{ user.displayName }},</p>
<p>You have been assigned to a new task:</p>

<div style="border-left: 4px solid #007bff; padding: 10px;">
  <strong>{{ task.title }}</strong><br />
  Priority: {{ task.priority }}<br />
  Deadline: {{ task.deadline | date }}
</div>

<p>{{ task.description }}</p>

<a href="{{ viewTaskUrl }}" class="button">View Task</a>

<p>
  <small>
    <a href="{{ preferencesUrl }}">Manage preferences</a> | {{ projectName }}
  </small>
</p>
```

## Quiet Hours Logic

```javascript
function isInQuietHours(userPreferences, now = new Date()) {
  if (!userPreferences.quiet_hours_enabled) return false;

  const currentHour = now.getHours();
  const start = userPreferences.quiet_start_hour;
  const end = userPreferences.quiet_end_hour;

  if (start < end) {
    // Normal: 22 - 8 (evening to morning)
    return currentHour >= start || currentHour < end;
  } else {
    // Wraparound: 8 - 22 (inverted)
    return currentHour >= start && currentHour < end;
  }
}

// Example:
const prefs = {
  quiet_hours_enabled: true,
  quiet_start_hour: 22,
  quiet_end_hour: 8,
};
isInQuietHours(prefs); // 23:00 → true (quiet)
isInQuietHours(prefs); // 10:00 → false (not quiet)
```

## Delivery Tracking

### Success Metrics

```javascript
{
  total_sent: 1000,
  delivered_email: 950,
  delivered_push: 880,
  opened: 650,             // Opens from email service webhook
  unsubscribed: 45,
  bounced: 5,

  // By type
  by_type: {
    TASK_ASSIGNED: { sent: 200, delivered: 198, opened: 120 },
    MESSAGE_MENTIONED: { sent: 300, delivered: 295, opened: 250 },
    // ...
  }
}
```

## Error Handling

| Status | Error                  | Cause                    |
| ------ | ---------------------- | ------------------------ |
| 400    | Invalid preference     | quiet_hours outside 0-23 |
| 401    | Unauthorized           | Token invalid            |
| 404    | Notification not found | Invalid notificationId   |
| 500    | Failed to send email   | SMTP error               |
| 503    | Service unavailable    | Queue down               |

## Performance Optimization

### Database Queries

```javascript
// Bad: N+1 query
const notifs = await Notification.find({ userId });
notifs.forEach((n) => console.log(n.user.email)); // N queries

// Good: JOIN with user data
const notifs = await Notification.find({ userId }).populate(
  "user",
  "email displayName",
);
```

### Caching

```javascript
// Cache preferences (1 hour)
const key = `notif:prefs:${userId}`;
const prefs = await redis.get(key);
if (!prefs) {
  prefs = await NotificationPreference.findOne({ userId });
  await redis.setex(key, 3600, JSON.stringify(prefs));
}
```

### Bulk Operations

```javascript
// Announce to whole team more efficiently
const memberIds = await getWorkspaceMembers(workspaceId);
const notifications = memberIds.map((userId) => ({
  userId,
  type: "TEAM_ANNOUNCEMENT",
  title: "Team announcement",
  // ...
}));

// Bulk insert (much faster than individual)
await Notification.insertMany(notifications);
```

## Testing

```javascript
describe("Notification Service", () => {
  it("should respect quiet hours", async () => {
    const prefs = {
      quiet_hours_enabled: true,
      quiet_start_hour: 22,
      quiet_end_hour: 8,
    };

    // Mock time to 23:30
    const result = shouldSendEmailNotification(
      prefs,
      new Date("2026-01-01T23:30:00"),
    );
    expect(result).toBe(false);
  });

  it("should create notification for task assignment", async () => {
    const notif = await createNotificationService("user_1", "TASK_ASSIGNED", {
      relatedId: "task_123",
      title: "New task",
    });

    expect(notif.type).toBe("TASK_ASSIGNED");
    expect(notif.read).toBe(false);
  });
});
```

## Related Features

- 📋 **Tasks**: Task assignment/update notifications
- 💬 **Chat**: Message mention notifications
- 👥 **Workspace**: Member join/invite notifications
- 👤 **Auth**: Account verification emails

---

For more details, see [Architecture Guide](../../ARCHITECTURE.md) or [Main README](../../README.md).
