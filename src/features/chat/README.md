# Chat Feature

> Real-time messaging, channels, direct messages, reactions, and read receipts.

## Overview

The Chat feature provides:

- **Channels** - Group discussions with members
- **Direct Messages** - 1-to-1 conversations
- **Threaded Replies** - Organized conversations within messages
- **Reactions** - Emoji reactions to messages
- **Read Receipts** - Track message read status
- **User Presence** - Redis-based online status
- **File Sharing** - Attach media to messages
- **Typing Indicators** - Real-time typing notifications

## Quick Start

```typescript
// Create Channel
POST /api/channels
{
  name: "general",
  description: "General discussion",
  workspaceId: "workspace_123",
  isPrivate: false
}

// Send Message
POST /api/channels/{channelId}/messages
{
  content: "Hello team!",
  attachments: [{ url: "s3://...", type: "image" }]
}

// Join Channel
POST /api/channels/{channelId}/join

// Get Messages
GET /api/channels/{channelId}/messages?limit=50&skip=0

// Add Reaction
POST /api/messages/{messageId}/reactions
{ emoji: "👍" }

// Thread Reply
POST /api/messages/{messageId}/replies
{ content: "Great idea!" }
```

## Architecture

### File Structure (Feature-Based)

```
features/chat/
├── channel/
│   ├── channel.controller.js    # Channel handlers
│   ├── channel.service.js       # Channel business logic
│   ├── channel.routes.js        # Channel routes
│   └── channel.validation.js    # Channel validation schemas
├── message/
│   ├── message.controller.js    # Message handlers
│   └── message.service.js       # Message business logic
├── member/
│   ├── member.controller.js     # Member handlers
│   ├── member.service.js        # Member business logic
│   ├── channelMember.controller.js
│   ├── channelMember.routes.js
│   └── channelMember.validation.js
├── reaction/
│   └── reaction.service.js      # Reaction business logic
├── readReceipts/
│   └── readReceipts.service.js  # Read receipt tracking
├── userPresence/
│   └── userPresence.service.js  # User presence status
├── channelInvitation/
│   └── channelInvitation.service.js  # Invitation logic
├── messageAttachment/
│   └── messageAttachment.service.js  # File attachment handling
├── chat.middleware.js           # Shared middleware
├── index.js                     # Main router
└── README.md
```

Each feature folder is self-contained with:

- **Controllers** - HTTP request handlers
- **Services** - Business logic and database operations
- **Routes** - API endpoint definitions
- **Validation** - Input validation schemas (Zod)

Note: MongoDB models are centralized in a shared models directory.

### Data Models

#### Channel (MongoDB)

```javascript
{
  _id: ObjectId,
  workspaceId: string,        // Reference to workspace
  name: string,               // "general", "announcements"
  description: string,
  isPrivate: boolean,         // false = public, true = private
  createdBy: string,          // userId of creator
  members: [string],          // Array of user IDs
  topic: string,              // Current topic/description
  avatar: string,             // Channel icon URL
  lastMessageAt: Date,        // For sorting
  createdAt: Date,
  updatedAt: Date
}
```

#### Message (MongoDB)

```javascript
{
  _id: ObjectId,
  channelId: ObjectId,        // Which channel
  userId: string,             // Who sent it
  content: string,            // Message text
  parentId: ObjectId,         // For threaded replies
  mentions: [string],         // @mentioned users
  reactions: [{
    emoji: string,
    users: [string]           // Who reacted
  }],
  attachments: [{
    url: string,              // S3 or CDN URL
    type: string,             // "image", "video", "file"
    fileName: string,
    size: number
  }],
  editedAt: Date,
  deletedAt: Date,            // Soft delete
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
db.messages.createIndex({ channelId: 1, createdAt: -1 })
db.messages.createIndex({ userId: 1, createdAt: -1 })
db.messages.createIndex({ parentId: 1 })        // threaded replies
```

#### ReadReceipt (MongoDB)

```javascript
{
  _id: ObjectId,
  channelId: ObjectId,
  userId: string,
  lastReadMessageId: ObjectId,
  lastReadAt: Date,
  unreadCount: number
}

// Unique index ensures one receipt per user per channel
db.read_receipts.createIndex(
  { channelId: 1, userId: 1 },
  { unique: true }
)
```

### Real-Time Flow with Socket.IO

```
CLIENT                           SERVER

┌─────────────────┐
│ User joins      │
│ "general"       │
└────────┬────────┘
         │ emit 'join_channel'
         │ { channelId }
         └──────────────────>
                              Socket.IO Handler
                              ├─ Validate user in channel
                              ├─ Add socket to room
                              ├─ Get recent messages
                              ├─ Get online members
                              └─ emit 'channel_joined'
         ┌──────────────────<───┤
         │ { messages, members }│
         │
         │ SUBSCRIBE to events from this channel
         │

┌────────┴────────┐
│ User types      │
│ message         │
└────────┬────────┘
         │ emit 'typing_start'
         │ { channelId }
         └──────────────────>
                              Add to typing set
                              Broadcast 'user_typing'
         ┌──────────────────<───┤
         │ (to other users)     │
         │

┌────────┴────────┐
│ User sends      │
│ message         │
└────────┬────────┘
         │ emit 'send_message'
         │ { channelId, content }
         └──────────────────>
                              Validate & save to MongoDB
                              Update presence (lastActivityAt)
                              Emit 'new_message' to room
                              Queue notification job
                              (if receiver offline)
         ┌──────────────────<───┤
         │ 'new_message'        │
         │ { messageId, ... }   │
         │
         │ Update UI optimistically
         │
```

## Core Services

### `chat.service.js` - Message & Channel Operations

#### Channel Methods

```javascript
// Create channel
createChannelService(channelData);
// Returns: channel document with members array

// Get channel
getChannelService(channelId);

// List channels in workspace
listChannelsService(workspaceId, userId);
// Only returns channels user can access

// Add member to channel
addChannelMemberService(channelId, userId);

// Remove member
removeChannelMemberService(channelId, userId);

// Update channel
updateChannelService(channelId, updates);
```

#### Message Methods

```javascript
// Send new message
createMessageService(channelId, userId, content, attachments);
// Steps:
// 1. Validate content (not empty, max 5000 chars)
// 2. Save to MongoDB
// 3. Update lastMessageAt
// 4. Broadcast via Socket.IO
// 5. Queue notifications
// Returns: created message object

// Get messages (paginated)
getMessagesService(channelId, (limit = 50), (skip = 0));
// Returns: array of messages with reactions

// Edit message
editMessageService(messageId, userId, newContent);
// Only message creator or admin can edit
// Sets editedAt timestamp

// Delete message (soft delete)
deleteMessageService(messageId, userId);
// Sets deletedAt, preserves for audit trail

// Get threaded replies
getThreadService(messageId, (limit = 20));
// Returns: parent message + all replies

// Post thread reply
createReplyService(parentId, userId, content);
// Links reply via parentId
```

### `presence.service.js` - User Presence (Redis)

```javascript
// Set presence when user goes online
setUserPresence(workspaceId, userId, { status, currentChannelId });
// Key: presence:{workspaceId}:{userId}
// TTL: 30 minutes auto-refresh on activity

// Get specific user presence
getUserPresence(workspaceId, userId);

// Get all online users
getOnlineUsers(workspaceId);
// Returns: array of presence objects

// Update status (online/away/offline)
updateUserStatus(workspaceId, userId, status);

// Update current channel
updateCurrentChannel(workspaceId, userId, channelId);

// Get users in specific channel
getUsersInChannel(workspaceId, channelId);
```

### Reaction Methods

```javascript
// Add emoji reaction
addReactionService(messageId, userId, emoji);
// Prevents duplicate reactions from same user
// Broadcasts 'message_reacted' to channel

// Remove reaction
removeReactionService(messageId, userId, emoji);

// Get all reactions on message
getReactionsService(messageId);
// Returns: { emoji: [user1, user2], ... }
```

### Read Receipt Methods

```javascript
// Mark channel as read
markAsReadService(channelId, userId, lastMessageId);
// Updates:
// 1. ReadReceipt document
// 2. Broadcasts 'message_read' to channel
// 3. Clears unreadCount

// Get unread count per channel
getUnreadCountsService(workspaceId, userId);
// Returns: { channel_1: 5, channel_2: 0, ... }
```

## Socket.IO Events

### Client → Server

| Event             | Payload                        | Validation          |
| ----------------- | ------------------------------ | ------------------- |
| `join_channel`    | `{ channelId }`                | User must be member |
| `leave_channel`   | `{ channelId }`                | Must have joined    |
| `send_message`    | `{ content, attachments }`     | Max 5000 chars      |
| `edit_message`    | `{ messageId, content }`       | Only creator        |
| `delete_message`  | `{ messageId }`                | Only creator        |
| `typing_start`    | `{ }`                          | Must be in channel  |
| `typing_stop`     | `{ }`                          | -                   |
| `add_reaction`    | `{ messageId, emoji }`         | Valid emoji         |
| `remove_reaction` | `{ messageId, emoji }`         | User owns reaction  |
| `mark_read`       | `{ channelId, lastMessageId }` | -                   |
| `update_presence` | `{ status, currentChannelId }` | status in enum      |

### Server → Client

| Event                 | Payload                                | When                    |
| --------------------- | -------------------------------------- | ----------------------- |
| `channel_joined`      | `{ messages, members }`                | User joins channel      |
| `new_message`         | Message object                         | New message in channel  |
| `message_edited`      | `{ messageId, newContent }`            | Message edited          |
| `message_deleted`     | `{ messageId }`                        | Message deleted         |
| `user_typing`         | `{ userId, channelId }`                | User typing (broadcast) |
| `message_reacted`     | `{ messageId, emoji, userId }`         | Reaction added          |
| `reaction_removed`    | `{ messageId, emoji, userId }`         | Reaction removed        |
| `message_read`        | `{ channelId, userId, message_id }`    | Message marked read     |
| `user_joined_channel` | `{ userId, channelId }`                | User joined             |
| `user_left_channel`   | `{ userId, channelId }`                | User left               |
| `presence_updated`    | `{ userId, status, currentChannelId }` | Presence changed        |

## API Endpoints

### Channels

```
GET    /api/channels                          # List all channels
POST   /api/channels                          # Create channel
GET    /api/channels/:id                      # Get channel details
PATCH  /api/channels/:id                      # Update channel
DELETE /api/channels/:id                      # Delete channel

POST   /api/channels/:id/join                 # Join channel
POST   /api/channels/:id/leave                # Leave channel
GET    /api/channels/:id/members              # List members
POST   /api/channels/:id/members              # Add member
DELETE /api/channels/:id/members/:userId      # Remove member
```

### Messages

```
GET    /api/channels/:channelId/messages      # List paginated messages
POST   /api/channels/:channelId/messages      # Send message
GET    /api/messages/:messageId               # Get single message
PATCH  /api/messages/:messageId               # Edit message
DELETE /api/messages/:messageId               # Delete message

GET    /api/messages/:messageId/replies       # Get thread
POST   /api/messages/:messageId/replies       # Post reply
```

### Reactions

```
POST   /api/messages/:messageId/reactions     # Add reaction
DELETE /api/messages/:messageId/reactions/:emoji  # Remove reaction
GET    /api/messages/:messageId/reactions     # Get all reactions
```

### Read Receipts

```
POST   /api/channels/:channelId/read          # Mark channel as read
GET    /api/workspaces/:wsId/unread           # Get unread counts
```

## Error Handling

| Status | Error              | Cause                 |
| ------ | ------------------ | --------------------- |
| 400    | Message too long   | >5000 characters      |
| 400    | Invalid emoji      | Not a valid emoji     |
| 401    | Unauthorized       | Token invalid/expired |
| 403    | Not channel member | User not in channel   |
| 403    | Cannot edit        | Not message creator   |
| 404    | Channel not found  | Invalid channelId     |
| 404    | Message not found  | Invalid messageId     |
| 500    | Failed to send     | Database/Socket error |

## Performance Optimization

### Pagination

```javascript
// Always paginate messages to avoid loading entire conversation
GET /api/channels/:id/messages?limit=50&skip=100

// Returns: { messages: [], total: 5000, hasMore: true }
```

### Message Search

```javascript
// Full-text search on MongoDB
GET /api/channels/:id/messages/search?q=meeting&limit=20

// Uses MongoDB text index:
db.messages.createIndex({ content: 'text', userId: 1 })
```

### Caching

- **Channel details** - Cached 1 hour in Redis
- **Member lists** - Cached 30 minutes
- **Recent messages** - Cached 12 hours
- **Presence data** - 30 minute TTL (auto-refresh)

## Example Usage

### Send a Message

```bash
curl -X POST http://localhost:3003/api/channels/ch_123/messages \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hey team, check this out!",
    "attachments": [{
      "url": "s3://bucket/image.jpg",
      "type": "image",
      "fileName": "image.jpg"
    }]
  }'
```

### Get Channel Messages

```bash
curl http://localhost:3003/api/channels/ch_123/messages?limit=20 \
  -H "Authorization: Bearer {token}"

# Response includes pagination:
# {
#   "messages": [...],
#   "total": 500,
#   "hasMore": true,
#   "nextCursor": "msg_999"
# }
```

### Join Real-Time Channel

```javascript
// Client-side (React)
import { useEffect } from "react";
import { useSocket } from "../hooks/useSocket";

function ChatChannel({ channelId }) {
  const socket = useSocket();

  useEffect(() => {
    socket.emit("join_channel", { channelId });

    socket.on("new_message", (message) => {
      // Update UI with new message
    });

    socket.on("user_typing", ({ userId }) => {
      // Show "{userId} is typing..."
    });

    return () => socket.emit("leave_channel", { channelId });
  }, [channelId]);
}
```

## Testing

```javascript
describe("Chat Service", () => {
  it("should create message", async () => {
    const msg = await createMessageService("ch_123", "user_1", "Hello!");
    expect(msg.content).toBe("Hello!");
    expect(msg.userId).toBe("user_1");
  });

  it("should reject message > 5000 chars", async () => {
    const longMsg = "x".repeat(5001);
    expect(() => createMessageService("ch_123", "user_1", longMsg)).toThrow();
  });
});
```

## Related Features

- ⚠️ **User Presence**: Integrated via Redis presence service
- 🔔 **Notifications**: Alerts when mentioned or offline
- 🚫 **Block List**: Prevent blocked users from messaging
- 👥 **Workspace**: Channels belong to workspaces

---

For more details, see [Architecture Guide](../../ARCHITECTURE.md) or [Main README](../../README.md).
