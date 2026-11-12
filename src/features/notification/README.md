# Notification System

## 1. Overview

The Notification System provides users with in-app notifications about important activities across the platform.

It is designed to help users stay informed about events such as task assignments, task updates, message mentions, and other workspace activities.

The initial version focuses on:

- Creating and retrieving notifications.
- Tracking read and unread notifications.
- Marking individual notifications as read.
- Marking all notifications as read.
- Deleting notifications.
- Tracking unread notification counts.
- Managing user notification preferences.
- Configuring quiet hours.
- Automatically expiring notifications after seven days.

Future enhancements may include real-time notifications, email delivery, browser push notifications, and background job processing.

---

## 2. Technology Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime environment |
| Express.js | REST API |
| PostgreSQL | Database |
| Prisma ORM | Database access |
| Socket.IO | Planned real-time notifications |
| Redis + BullMQ | Planned background processing |

**Note:** Socket.IO, Redis, BullMQ, email delivery, and push notifications are future enhancements, not part of the current database implementation.

---

## 3. Database Design

The notification system uses two Prisma models:

1. `Notification`
2. `NotificationPreference`

Both models are associated with the existing `User` model.

### 3.1 Notification Model

Stores individual notifications for users.

| Field | Type | Description |
|---|---|---|
| id | String | Unique notification ID |
| userId | String | ID of the notification recipient |
| type | String | Notification category |
| title | String | Notification heading |
| content | String? | Optional notification description |
| isRead | Boolean | Whether the notification has been read |
| readAt | DateTime? | Timestamp when notification was read |
| createdAt | DateTime | Notification creation timestamp |
| expireAt | DateTime | Notification expiration timestamp |

**Important details:**

- `isRead` defaults to `false`.
- `createdAt` defaults to the current timestamp.
- `expireAt` defaults to seven days after creation.
- Notifications belong to a user.
- Deleting a user cascades to their notifications.
- An index on `userId`, `isRead`, and `createdAt` supports efficient notification retrieval.
- An index on `expireAt` supports expiration and cleanup operations.

### 3.2 NotificationPreference Model

Stores notification settings for each user.

| Field | Type | Default | Description |
|---|---|---|---|
| id | String | UUID | Unique preference ID |
| userId | String | Unique | Associated user ID |
| emailTaskAssigned | Boolean | true | Email preference for task assignments |
| emailTaskUpdated | Boolean | true | Email preference for task updates |
| emailMessageMention | Boolean | true | Email preference for message mentions |
| pushTaskAssigned | Boolean | true | Push preference for task assignments |
| pushMessageMention | Boolean | true | Push preference for message mentions |
| quietHoursEnabled | Boolean | false | Enables or disables quiet hours |
| quietHoursStart | Int? | null | Quiet-hours starting hour (0–23) |
| quietHoursEnd | Int? | null | Quiet-hours ending hour (0–23) |
| updatedAt | DateTime | Updated automatically | Last preference update |

**Important details:**

- Each user can have only one notification preference record.
- `userId` has a unique constraint.
- Preference records are deleted when their associated user is deleted.
- Quiet-hours values use the 24-hour clock, from 0 to 23.

### 3.3 Prisma Relationships

```prisma
model User {
  // Existing User fields...

  notifications           Notification[]
  notificationPreferences NotificationPreference?
}
```

The relationships are:

- One user can receive multiple notifications.
- One user can have one notification preference record.
- Notifications and preferences are associated with users through `userId`.
- Both relationships use cascading deletion.

---

## 4. Notification Types

The `type` field is stored as a String, allowing the application to support different notification categories.

Suggested notification types include:

### Task Notifications

- `TASK_ASSIGNED`
- `TASK_UPDATED`
- `TASK_COMPLETED`
- `TASK_OVERDUE`

### Chat Notifications

- `MESSAGE_MENTIONED`
- `MESSAGE_REPLY`
- `CHANNEL_JOINED`

### Workspace Notifications

- `WORKSPACE_INVITE_RECEIVED`
- `WORKSPACE_MEMBER_JOINED`
- `WORKSPACE_ROLE_CHANGED`
- `WORKSPACE_MEMBER_REMOVED`

### Account Notifications

- `WELCOME`
- `ACCOUNT_VERIFICATION`

These are suggested application-level values. They are not currently enforced by a Prisma enum.

---

## 5. API Design

The following endpoints define the planned REST API contract.

Base URL:

```text
/api/notifications
```

All user-specific operations must use the authenticated user's identity. A client must never be allowed to access another user's notifications by supplying a different `userId`.

### 5.1 Get Notifications

**GET** `/api/notifications`

Retrieve notifications belonging to the authenticated user.

Query parameters:

| Parameter | Description |
|---|---|
| unread | Return only unread notifications when true |
| limit | Maximum number of notifications to retrieve |
| cursor | Optional pagination cursor |

Example:

```http
GET /api/notifications?unread=true&limit=20
```

### 5.2 Get Unread Notification Count

**GET** `/api/notifications/unread-count`

Returns the number of unread notifications belonging to the authenticated user.

### 5.3 Mark Notification as Read

**PATCH** `/api/notifications/:notificationId`

Marks a notification as read.

Example request:

```json
{
  "isRead": true
}
```

When marked as read:

- `isRead` becomes `true`.
- `readAt` is updated to the current timestamp.

### 5.4 Mark All Notifications as Read

**POST** `/api/notifications/mark-all-read`

Marks all unread notifications belonging to the authenticated user as read.

### 5.5 Delete Notification

**DELETE** `/api/notifications/:notificationId`

Deletes a notification belonging to the authenticated user.

### 5.6 Get Notification Preferences

**GET** `/api/notifications/preferences`

Returns the authenticated user's notification preferences.

### 5.7 Update Notification Preferences

**PATCH** `/api/notifications/preferences`

Updates notification preferences.

Example request:

```json
{
  "emailTaskAssigned": true,
  "emailTaskUpdated": false,
  "emailMessageMention": true,
  "pushTaskAssigned": true,
  "pushMessageMention": false,
  "quietHoursEnabled": true,
  "quietHoursStart": 22,
  "quietHoursEnd": 8
}
```

Preference updates should validate the supplied values:

- Boolean fields must contain Boolean values.
- Quiet-hours values must be integers between 0 and 23.
- Quiet-hours start and end should be supplied together when configuring a time interval.

These endpoints describe the intended API contract; they should be considered planned until implemented and tested.

---

## 6. Suggested Project Structure

```text
src/
└── features/
    └── notification/
        ├── notification.controller.js
        ├── notification.service.js
        ├── notification.routes.js
        ├── notification.validation.js
        ├── notification.middleware.js
        └── README.md
```

### Responsibilities

**notification.controller.js**

- Handles incoming HTTP requests.
- Calls notification service methods.
- Returns appropriate API responses.

**notification.service.js**

- Creates notifications.
- Retrieves user notifications.
- Marks notifications as read.
- Marks all notifications as read.
- Deletes notifications.
- Calculates unread counts.
- Retrieves and updates user preferences.
- Handles notification expiration and cleanup.

**notification.routes.js**

- Defines notification API endpoints.
- Connects routes to authentication middleware, validation, and controllers.

**notification.validation.js**

- Validates request parameters and payloads.
- Validates notification IDs.
- Validates notification preference values.

**notification.middleware.js**

- Contains notification-specific middleware when required.

---

## 7. Service Layer Design

The following service methods are suggested for implementation.

| Method | Responsibility |
|---|---|
| createNotification | Creates a notification for a user |
| getUserNotifications | Retrieves notifications for a user |
| getNotificationById | Retrieves a specific user's notification |
| getUnreadCount | Calculates unread notification count |
| markAsRead | Marks one notification as read |
| markAllAsRead | Marks all user notifications as read |
| deleteNotification | Deletes a user's notification |
| getNotificationPreferences | Retrieves user preferences |
| updateNotificationPreferences | Updates user preferences |
| cleanupExpiredNotifications | Removes expired notifications |

Every operation involving a notification must verify ownership using the authenticated user's ID.

---

## 8. Quiet Hours

Quiet hours allow users to configure a period during which notification delivery should be suppressed.

The configuration uses:

- `quietHoursEnabled`
- `quietHoursStart`
- `quietHoursEnd`

Hours use the 24-hour clock.

Example:

```text
Start: 22
End: 8
```

This represents quiet hours from 10 PM to 8 AM.

### Quiet Hours Logic

```javascript
function isQuietHours(currentHour, start, end) {
  if (start === end) {
    return false;
  }

  if (start < end) {
    return currentHour >= start && currentHour < end;
  }

  return currentHour >= start || currentHour < end;
}
```

This function handles both same-day and overnight intervals.

The application should apply quiet-hours checks to delivery channels when those delivery mechanisms are implemented.

---

## 9. Notification Expiration

Notifications have a default expiration period of seven days.

The database field is:

```prisma
expireAt DateTime @default(
  dbgenerated("(CURRENT_TIMESTAMP + INTERVAL '7 days')")
)
```

A cleanup operation should periodically identify and remove expired notifications.

Example Prisma query:

```javascript
await prisma.notification.deleteMany({
  where: {
    expireAt: {
      lte: new Date()
    }
  }
});
```

The cleanup operation should be scheduled as part of a future background-job implementation.

---

## 10. Security Considerations

The notification system must follow these security practices:

1. Require authentication for all notification endpoints.
2. Retrieve the user ID from the authenticated session or token.
3. Never trust a client-provided `userId` for authorization.
4. Verify notification ownership before reading, updating, or deleting a notification.
5. Validate all request parameters and payloads.
6. Restrict notification preference updates to supported fields.
7. Avoid exposing sensitive information in notification content.
8. Apply appropriate rate limits to notification creation and other sensitive operations.

---

## 11. Future Enhancements

The following features can extend the initial notification system.

### Phase 2: Real-Time Notifications

Use Socket.IO to deliver notifications instantly.

Proposed events:

| Event | Purpose |
|---|---|
| `notificationReceived` | A new notification arrives |
| `notificationRead` | A notification is marked as read |
| `notificationDeleted` | A notification is deleted |
| `unreadCountUpdated` | Unread count changes |

Socket connections must authenticate users and ensure that notifications are delivered only to the intended recipient.

### Phase 3: Background Processing

Introduce Redis and BullMQ for:

- Asynchronous notification processing.
- Background delivery jobs.
- Retry handling.
- Failed-job tracking.
- Scheduled cleanup of expired notifications.

### Phase 4: Email Notifications

Add email delivery for supported notification categories.

Potential features:

- Task assignment emails.
- Task update emails.
- Message mention emails.
- Configurable email preferences.
- Email templates.

### Phase 5: Push Notifications

Add browser and mobile push notification support.

Potential features:

- Browser push subscriptions.
- Push delivery.
- User subscription management.
- Configurable push preferences.

### Phase 6: Analytics and Monitoring

Add operational metrics such as:

- Total notifications created.
- Read versus unread notifications.
- Notification processing failures.
- Email and push delivery success rates.
- Average notification processing time.

These enhancements require additional implementation and, where necessary, database changes.

---

## 12. Implementation Roadmap

| Phase | Work |
|---|---|
| 1 | Implement notification creation and retrieval |
| 2 | Implement read, unread, delete, and unread count |
| 3 | Implement notification preference management |
| 4 | Add validation, authorization, and error handling |
| 5 | Add notification expiration cleanup |
| 6 | Integrate Socket.IO for real-time delivery |
| 7 | Add Redis and background job processing |
| 8 | Implement email and push notifications |
| 9 | Add analytics and monitoring |

---

## 13. Current Scope

The current Prisma schema establishes the database foundation for the notification system.

It supports:

- User-associated notifications.
- Read and unread tracking.
- Notification timestamps and expiration.
- Per-user notification preferences.
- Email and push preference flags.
- Quiet-hours configuration.

The REST API, service layer, real-time delivery, background processing, email delivery, push notifications, and analytics must be implemented separately.

**The database schema defines the foundation; the implementation roadmap describes how the complete notification system will evolve.**
