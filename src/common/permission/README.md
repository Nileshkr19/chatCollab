# Permission System Documentation

## Overview

The permission system is a **role-based access control (RBAC)** that manages what users can and cannot do within a workspace. It uses a two-layer security approach:

1. **Feature-specific middleware** - Checks membership and basic role restrictions
2. **Permission middleware** - Validates granular permissions from the database

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────┐
│              permission.service.js                  │
│  • Manages permission data (CRUD operations)        │
│  • Seeds default permissions for new workspaces     │
│  • Used by middleware and admin controllers         │
└─────────────────────────────────────────────────────┘
                          ↑
                          │
          Called internally by:
                          │
┌─────────────────────────────────────────────────────┐
│            permission.middleware.js                 │
│  • Validates permissions on each request            │
│  • Used in routes to protect actions               │
│  • Supports ownership-based checks                 │
└─────────────────────────────────────────────────────┘
                          ↑
                          │
                    Used in routes for:
                          │
        • Message deletion/editing
        • Channel management
        • Reactions
        • Attachments
        • User invitations
```

---

## Default Roles & Permissions

### 3 Workspace Roles

#### **ADMIN** - Super User

- ✅ Can do **everything**
- ✅ Edit/delete all messages
- ✅ Delete channels
- ✅ Manage roles
- ✅ Ban/mute users

#### **MANAGER** - Team Lead

- ✅ Create/edit channels
- ✅ Invite/remove members
- ✅ Edit own content
- ✅ Pin messages
- ❌ Delete channels
- ❌ Ban users
- ❌ Manage roles

#### **MEMBER** - Regular User

- ✅ Send messages
- ✅ Edit own messages
- ✅ React to messages
- ✅ Reply in threads
- ❌ Create channels
- ❌ Invite members
- ❌ Pin messages

---

## Permission List

| Permission                | ADMIN | MANAGER | MEMBER |
| ------------------------- | ----- | ------- | ------ |
| `canSendMessages`         | ✅    | ✅      | ✅     |
| `canEditMessages`         | ✅    | ✅      | ✅     |
| `canEditAllMessages`      | ✅    | ❌      | ❌     |
| `canDeleteMessages`       | ✅    | ✅      | ✅     |
| `canDeleteAllMessages`    | ✅    | ❌      | ❌     |
| `canDeleteAttachments`    | ✅    | ✅      | ✅     |
| `canDeleteAllAttachments` | ✅    | ❌      | ❌     |
| `canCreateChannels`       | ✅    | ✅      | ❌     |
| `canEditChannels`         | ✅    | ✅      | ❌     |
| `canDeleteChannels`       | ✅    | ❌      | ❌     |
| `canArchiveChannels`      | ✅    | ✅      | ❌     |
| `canInviteMembers`        | ✅    | ✅      | ❌     |
| `canRemoveMembers`        | ✅    | ✅      | ❌     |
| `canManageRoles`          | ✅    | ❌      | ❌     |
| `canMuteUsers`            | ✅    | ✅      | ❌     |
| `canBanUsers`             | ✅    | ❌      | ❌     |
| `canPinMessages`          | ✅    | ✅      | ❌     |
| `canAddReactions`         | ✅    | ✅      | ✅     |
| `canRemoveReactions`      | ✅    | ✅      | ✅     |
| `canRemoveAllReactions`   | ✅    | ❌      | ❌     |
| `canCreateThreads`        | ✅    | ✅      | ✅     |
| `canReplyInThreads`       | ✅    | ✅      | ✅     |

---

## How It Works

### Request Flow

```
1. CLIENT SENDS REQUEST
   DELETE /workspaces/ws_1/channels/ch_1/messages/msg_1

2. AUTHENTICATION MIDDLEWARE
   ✅ Verify JWT token, extract userId

3. FEATURE-SPECIFIC MIDDLEWARE
   ✅ checkWorkspaceMembership - Is user in workspace?
   ✅ checkChannelMembership - Is user in channel?
   ✅ checkChannelNotArchived - Is channel active?
   Sets: req.membership, req.channelMembership

4. PERMISSION MIDDLEWARE (permission.middleware.js)
   ✅ checkPermission("canDeleteMessages", {
       ownershipKey: "canDeleteAllMessages",
       getOwnerId: (req) => req.message.senderId
     })

   Flow inside middleware:
   a) Is user OWNER? YES → ✅ BYPASS all checks
   b) Get user's role permissions from cache/database
   c) Check: Has canDeleteMessages? NO → ❌ DENY
   d) Check: Ownership?
      - Is owner? YES → ✅ ALLOW
      - Not owner + Has canDeleteAllMessages? YES → ✅ ALLOW
      - Not owner + No canDeleteAllMessages? NO → ❌ DENY

5. VALIDATION MIDDLEWARE
   ✅ Validate request body schema

6. CONTROLLER
   deleteMessageController()

7. SERVICE (NO PERMISSION CHECKS HERE)
   deleteMessageService()

8. DATABASE OPERATION
   Mark message as deleted

9. RESPONSE
   200 OK - Message deleted
   OR
   403 Forbidden - Insufficient permissions
```

---

## Service Functions

### `seedWorkspacePermissionsService(workspaceId)`

**Purpose:** Initialize default permissions for a new workspace

**When to call:** During workspace creation

**What it does:**

- Creates 3 permission records (ADMIN, MANAGER, MEMBER)
- Each with default permission settings
- Enables the permission system for that workspace

**Example:**

```javascript
// In workspace.service.js
export const createWorkspaceService = async (workspaceData) => {
  const workspace = await Workspace.create(workspaceData);

  // 🔑 MUST DO THIS
  await seedWorkspacePermissionsService(workspace._id);

  return workspace;
};
```

---

### `getPermissionService(workspaceId, role)`

**Purpose:** Get permissions for a specific role

**Called by:** permission.middleware.js (internally)

**Returns:** Permission object or null

**Example:**

```javascript
const perms = await getPermissionService("ws_1", "MEMBER");
// { canSendMessages: true, canDeleteMessages: true, ... }
```

---

### `getAllPermissionsService(workspaceId)`

**Purpose:** Get all roles and their permissions

**When to use:** Admin panel to display all permissions

**Returns:** Array of all permission records

---

### `updatePermissionService(workspaceId, role, updatedPermissions)`

**Purpose:** Customize permissions for a specific role

**When to use:** Admin wants to modify role permissions

**Also:** Clears Redis cache

**Example:**

```javascript
// Disable reactions for MEMBERS
await updatePermissionService("ws_1", "MEMBER", { canAddReactions: false });
```

---

### `resetPermissionsService(workspaceId, role)`

**Purpose:** Revert role to default permissions

**When to use:** Admin messed up and wants to restore defaults

**Also:** Clears Redis cache

---

## Middleware Functions

### `checkPermission(permissionKey, options)`

**Parameters:**

- `permissionKey` (string) - Permission to check (e.g., "canDeleteMessages")
- `options` (object, optional)
  - `ownershipKey` - Alternative permission for "all items"
  - `getOwnerId` - Function to extract owner ID from request

**Usage in Routes:**

```javascript
// Simple permission check
router.post("/", checkPermission("canSendMessages"), createMessageController);

// With ownership check
router.delete(
  "/:messageId",
  checkPermission("canDeleteMessages", {
    ownershipKey: "canDeleteAllMessages",
    getOwnerId: (req) => req.message.senderId,
  }),
  deleteMessageController,
);
```

**How it works:**

1. Check if user is OWNER → Bypass all checks
2. Get user's role permissions
3. Check if they have the permission
4. If ownership check enabled:
   - Is user the owner? YES → Allow
   - Not owner + has "all" permission? YES → Allow
   - Else → Deny

---

## Usage Examples

### Example 1: Delete Own Message (MEMBER)

```
User: MEMBER
Action: Delete own message

Request:
DELETE /workspaces/ws_1/channels/ch_1/messages/msg_1
(Message sent by current user)

Middleware Flow:
1. checkPermission("canDeleteMessages", {
     ownershipKey: "canDeleteAllMessages",
     getOwnerId: (req) => req.message.senderId
   })
2. Is OWNER? NO
3. Has canDeleteMessages? YES ✓
4. Is owner? YES ✓
5. ✅ ALLOW → Request proceeds

Response: 200 OK - Message deleted
```

---

### Example 2: Delete Others' Message (MEMBER)

```
User: MEMBER
Action: Try to delete another user's message

Request:
DELETE /workspaces/ws_1/channels/ch_1/messages/msg_1
(Message sent by different user)

Middleware Flow:
1. checkPermission("canDeleteMessages", {
     ownershipKey: "canDeleteAllMessages",
     getOwnerId: (req) => req.message.senderId
   })
2. Is OWNER? NO
3. Has canDeleteMessages? YES ✓
4. Is owner? NO ✗
5. Has canDeleteAllMessages? NO ✗
6. ❌ DENY

Response: 403 Forbidden
"You can only delete your own messages"
```

---

### Example 3: Pin Message (MEMBER)

```
User: MEMBER
Action: Try to pin a message

Request:
POST /workspaces/ws_1/channels/ch_1/messages/msg_1/pin

Middleware Flow:
1. checkPermission("canPinMessages")
2. Is OWNER? NO
3. Has canPinMessages? NO ✗
4. ❌ DENY

Response: 403 Forbidden
"Access denied: Insufficient permissions"
```

---

### Example 4: Admin Panel - Update MEMBER Permissions

```javascript
// admin.controller.js

export const updateMemberPermissionsController = asyncHandler(
  async (req, res) => {
    const { workspaceId } = req.params;
    const { canPinMessages, canInviteMembers } = req.body;

    // Use permission.service.js directly (not middleware!)
    const updated = await updatePermissionService(workspaceId, "MEMBER", {
      canPinMessages: true, // Allow MEMBERS to pin
      canInviteMembers: true, // Allow MEMBERS to invite
    });

    // Cache automatically cleared
    // Next time a MEMBER tries to pin → Permission allowed ✓

    res.status(200).json(new apiResponse(true, "Permissions updated", updated));
  },
);
```

---

## Implementation Checklist

### When Creating a New Route

- [ ] Add feature-specific middleware (checkMembership, etc.)
- [ ] Add `checkPermission()` middleware if needed
- [ ] Add validation middleware
- [ ] Call controller
- [ ] Controller calls service (NO permission checks)
- [ ] Service handles database operations

### When Creating a New Workspace

- [ ] Create workspace in database
- [ ] Call `seedWorkspacePermissionsService(workspaceId)` ← **IMPORTANT**
- [ ] Add workspace owner as first member
- [ ] Return workspace

### When Admin Needs to Customize Permissions

- [ ] Create admin controller
- [ ] Call `updatePermissionService()` or `resetPermissionsService()`
- [ ] Response with updated permissions

---

## Best Practices

### ✅ DO

```javascript
// In routes - Check permission before calling controller
router.delete(
  "/:messageId",
  checkPermission("canDeleteMessages", {
    ownershipKey: "canDeleteAllMessages",
    getOwnerId: (req) => req.message.senderId
  }),
  deleteMessageController  // Safe to call now
);

// In services - Just do database operations
export const deleteMessageService = async (messageId, userId) => {
  // No permission checks
  const deleted = await Message.findByIdAndUpdate(...);
  return deleted;
};

// Seed permissions when creating workspace
await seedWorkspacePermissionsService(workspace._id);
```

### ❌ DON'T

```javascript
// Don't check permissions in services
export const deleteMessageService = async (messageId, userId) => {
  // ❌ WRONG - Permission already checked in route
  const perms = await getPermissionService(workspaceId, role);
  if (!perms.canDeleteMessages) throw new Error("Denied");
};

// Don't forget to seed permissions
const workspace = await Workspace.create(data);
// ❌ WRONG - Missing seedWorkspacePermissionsService()

// Don't use permission middleware for workspace-level operations
router.delete("/:workspaceId", checkPermission("canDeleteWorkspace"), ...);
// ❌ Use role middleware instead: isOwner
router.delete("/:workspaceId", isOwner, ...);
```

---

## Caching Strategy

- **Permissions cached for 1 hour** in Redis
- **Cache invalidated immediately** when permissions are updated
- **Database fallback** if cache misses

**Why cache?**

- Reduce database queries
- Faster permission checks
- Better performance

---

## Troubleshooting

### Issue: User can't perform allowed action

**Cause:** Permission not seeded or cache stale

**Solution:**

1. Check if workspace was created with `seedWorkspacePermissionsService()`
2. Clear Redis cache
3. Verify permission in database

### Issue: All permissions denied for a role

**Cause:** Permissions record not found in database

**Solution:**

1. Run `seedWorkspacePermissionsService(workspaceId)` for that workspace
2. Verify workspaceId and role match

### Issue: Admin updated permission but change not reflected

**Cause:** Cache not cleared

**Solution:**

- Verify `updatePermissionService()` was called (auto-clears cache)
- Or manually clear Redis

---

## File Structure

```
src/common/permission/
├── permission.models.js      # Database schema
├── permission.service.js     # CRUD + seeding
├── permission.middleware.js  # Route protection
├── README.md                 # This file
```

---

## Summary

✅ **Two-layer security:** Feature middleware + Permission middleware  
✅ **Database-driven:** Permissions stored and customizable  
✅ **Cached:** 1-hour TTL for performance  
✅ **Ownership support:** Can edit/delete own vs all  
✅ **Admin control:** Full customization possible  
✅ **Simple to use:** Just add middleware to routes

---

## Related Documentation

- [Message Feature](../chat/message/README.md)
- [Channel Feature](../chat/channel/README.md)
- [Workspace Feature](../../features/workspace/README.md)
