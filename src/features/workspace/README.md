# Workspace Feature

> Multi-tenant workspace management, team members, roles, and invitations.

## Overview

The Workspace feature provides:

- **Multi-tenant isolation** - Separate workspaces per team
- **Role-based access control** - Owner, Manager, Member, Guest
- **Member management** - Add, remove, change roles
- **Email invitations** - Pre-assign roles before joining
- **Workspace settings** - Name, avatar, description
- **Member activity** - Track who's doing what

## Quick Start

```typescript
// Create Workspace
POST /api/workspaces
{
  name: "Acme Corp",
  description: "Main workspace"
}

// Get Workspaces (user's workspaces)
GET /api/workspaces

// Get Workspace Details
GET /api/workspaces/{wsId}

// List Members
GET /api/workspaces/{wsId}/members

// Invite Member
POST /api/workspaces/{wsId}/invite
{
  email: "john@example.com",
  role: "MANAGER"
}

// Change Member Role
PATCH /api/workspaces/{wsId}/members/{userId}
{ role: "OWNER" }

// Remove Member
DELETE /api/workspaces/{wsId}/members/{userId}

// Update Workspace
PATCH /api/workspaces/{wsId}
{
  name: "New Name",
  description: "Updated description"
}
```

## Architecture

### File Structure

```
features/workspace/
├── workspace.controller.js   # Request handlers
├── workspace.service.js      # Business logic
├── workspace.routes.js       # API endpoints
├── workspace.middleware.js   # Permission checks
├── workspace.validation.js   # Input validation
└── README.md
```

### Data Models

#### Workspace (PostgreSQL via Prisma)

```prisma
model Workspace {
  id            String   @id @default(cuid())
  name          String
  description   String?
  avatar        String?  // Logo URL
  ownerId       String   // User who created it

  members       WorkspaceMember[]
  tasks         Task[]
  channels      Channel[]  // References in MongoDB

  invitations   Invitation[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

#### WorkspaceMember (PostgreSQL via Prisma)

```prisma
model WorkspaceMember {
  id            String   @id @default(cuid())
  workspaceId   String
  userId        String
  role          String   // "OWNER" | "MANAGER" | "MEMBER" | "GUEST"

  workspace     Workspace @relation(fields: [workspaceId], references: [id])
  user          User      @relation(fields: [userId], references: [id])

  joinedAt      DateTime @default(now())

  @@unique([workspaceId, userId]) // One member record per user
  @@index([workspaceId])
}
```

#### Invitation (PostgreSQL via Prisma)

```prisma
model Invitation {
  id            String   @id @default(cuid())
  workspaceId   String
  email         String
  role          String   // Role to assign when user accepts
  invitedBy     String   // User ID who sent invite

  status        String   // "PENDING" | "ACCEPTED" | "REJECTED"
  expiresAt     DateTime // 7 days from now

  workspace     Workspace @relation(fields: [workspaceId], references: [id])

  createdAt     DateTime @default(now())

  @@unique([workspaceId, email]) // One invite per email
}
```

### Role Hierarchy

```
OWNER
  └─ Full administrative access
  └─ Can manage all members & roles
  └─ Can delete workspace
  └─ Can view audit logs

MANAGER
  └─ Can create channels & tasks
  └─ Can assign tasks to members
  └─ Can manage "MEMBER" & "GUEST" roles
  └─ Cannot change OWNER or other MANAGER roles
  └─ Can view workspace analytics

MEMBER
  └─ Can join channels
  └─ Can post messages & comments
  └─ Can be assigned tasks
  └─ Cannot invite users
  └─ Cannot view members list (only in same channels)

GUEST
  └─ Read-only access
  └─ Can view channels (limited)
  └─ Cannot post messages
  └─ Temporary access (can be revoked)
```

## Core Services

### `workspace.service.js` - Workspace Operations

#### Workspace Methods

```javascript
// Create workspace (user becomes OWNER)
createWorkspaceService(userId, { name, description });
// Steps:
// 1. Create workspace in PostgreSQL
// 2. Add user as OWNER in WorkspaceMember
// 3. Create default channels (general, announcements)
// 4. Return workspace object

// Get workspace details
getWorkspaceService(workspaceId, userId);
// Validates user is member before returning

// Get all workspaces for user
listUserWorkspacesService(userId);
// Returns: workspaces where user is a member

// Update workspace
updateWorkspaceService(workspaceId, userId, updates);
// Validates userId is OWNER before allowing update

// Delete workspace (OWNER only)
deleteWorkspaceService(workspaceId, userId);
// Cascade delete: channels, tasks, members, invites
```

#### Member Management

```javascript
// List all members in workspace
listMembersService(workspaceId);
// Returns: user info + role + joinedAt

// Add member directly (OWNER/MANAGER only)
addMemberService(workspaceId, userId, role);
// Creates WorkspaceMember record
// Notifies user via Socket.IO if online

// Remove member
removeMemberService(workspaceId, userId, requestingUserId);
// Validates requestingUser has permission
// Fails if removing last OWNER
// Cascade cleanup: remove from channels

// Change member role
changeMemberRoleService(workspaceId, userId, newRole, requestingUserId);
// Validates permission & new role
// Cannot have 0 owners

// Get member details
getMemberService(workspaceId, userId);
// Returns: user + role + channels + tasks assigned
```

#### Invitation Methods

```javascript
// Send invite via email
sendInvitationService(workspaceId, email, role, requestingUserId);
// Steps:
// 1. Validate email & role
// 2. Check user not already member
// 3. Create Invitation record (7 day expiry)
// 4. Generate invite link with token
// 5. Send email with link
// Returns: invitation object

// Accept invitation
acceptInvitationService(invitationId, userId);
// Steps:
// 1. Validate invitation exists & not expired
// 2. Validate email matches user
// 3. Create WorkspaceMember
// 4. Mark invitation as ACCEPTED
// 5. Add user to default channels

// Reject invitation
rejectInvitationService(invitationId);

// List pending invitations
listInvitationsService(workspaceId);
// OWNER/MANAGER only
// Shows: email, role, status, expiry

// Resend invitation (if expired)
resendInvitationService(invitationId);
// Creates new token, sends email again

// Revoke invitation (before accepted)
revokeInvitationService(invitationId, requestingUserId);
```

### Permission Middleware

```javascript
// Check user is workspace member
checkWorkspaceMember(req, res, next) {
  const member = await WorkspaceMember.findOne({
    workspaceId: req.params.wsId,
    userId: req.user.id,
  });
  if (!member) return res.status(403).json({ error: 'Not a member' });
  req.member = member;
  next();
}

// Check specific role requirement
checkRole(allowedRoles) {
  return async (req, res, next) => {
    const role = req.member.role;
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Usage in routes
router.post(
  '/:wsId/members/:userId/role',
  checkWorkspaceMember,
  checkRole(['OWNER', 'MANAGER']),
  changeMemberRoleController
);
```

## API Endpoints

### Workspaces

```
GET    /api/workspaces                   # List user's workspaces
POST   /api/workspaces                   # Create new workspace
GET    /api/workspaces/:id               # Get workspace details
PATCH  /api/workspaces/:id               # Update workspace
DELETE /api/workspaces/:id               # Delete workspace (OWNER)
```

### Members

```
GET    /api/workspaces/:wsId/members              # List all members
POST   /api/workspaces/:wsId/members              # Add member
GET    /api/workspaces/:wsId/members/:userId     # Get member details
PATCH  /api/workspaces/:wsId/members/:userId    # Update member role
DELETE /api/workspaces/:wsId/members/:userId    # Remove member
```

### Invitations

```
GET    /api/workspaces/:wsId/invitations          # List invitations
POST   /api/workspaces/:wsId/invitations          # Send invitation
GET    /api/workspaces/:wsId/invitations/:id     # Get invitation
POST   /api/workspaces/:wsId/invitations/:id/resend  # Resend invite
POST   /api/workspaces/:wsId/invitations/:id/accept  # Accept invite
DELETE /api/workspaces/:wsId/invitations/:id     # Revoke invite
```

## Real-Time Events

### Socket.IO Integration

```javascript
// When member joins
newWorkspaceMember: {
  (workspaceId, userId, role, displayName);
}

// When member removed
memberRemoved: {
  (workspaceId, userId);
}

// When member role changed
memberRoleChanged: {
  (workspaceId, userId, newRole);
}

// When invitation sent
invitationSent: {
  (workspaceId, email, role);
}
```

## Usage Examples

### Create Workspace

```bash
curl -X POST http://localhost:3003/api/workspaces \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Team",
    "description": "Company workspace"
  }'

# Response: { id, name, ownerId, members, createdAt, ... }
```

### Invite Member

```bash
curl -X POST http://localhost:3003/api/workspaces/ws_123/invitations \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newmember@company.com",
    "role": "MANAGER"
  }'

# Sends email with link:
# https://myapp.com/join/invitation/inv_456?token=xyz
```

### Accept Invitation (Client-side after email click)

```javascript
// User clicks link in email
const response = await fetch(
  "/api/workspaces/{wsId}/invitations/{invId}/accept",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`, // User's token
      "Content-Type": "application/json",
    },
  },
);

// User is now added to workspace
// Redirects to workspace dashboard
```

## Permission Matrix

| Action           | Owner | Manager | Member | Guest |
| ---------------- | ----- | ------- | ------ | ----- |
| View workspace   | ✅    | ✅      | ✅     | ✅    |
| Edit workspace   | ✅    | ❌      | ❌     | ❌    |
| Delete workspace | ✅    | ❌      | ❌     | ❌    |
| List members     | ✅    | ✅      | ❌     | ❌    |
| Add member       | ✅    | ✅      | ❌     | ❌    |
| Remove member    | ✅    | ✅\*    | ❌     | ❌    |
| Change role      | ✅    | ✅\*    | ❌     | ❌    |
| Create channel   | ✅    | ✅      | ✅     | ❌    |
| Send invitation  | ✅    | ✅      | ❌     | ❌    |
| Create task      | ✅    | ✅      | ✅     | ❌    |
| View analytics   | ✅    | ✅      | ❌     | ❌    |

\*Manager can only affect MEMBER/GUEST roles, not OWNER/MANAGER

## Error Handling

| Status | Error                    | Cause                     |
| ------ | ------------------------ | ------------------------- |
| 400    | Workspace already exists | Name taken                |
| 401    | Unauthorized             | Token invalid             |
| 403    | Insufficient permissions | Not OWNER/MANAGER         |
| 403    | Cannot remove last owner | Workspace needs owner     |
| 404    | Workspace not found      | Invalid wsId              |
| 404    | User not member          | User not in workspace     |
| 409    | Already invited          | Pending invitation exists |

## Database Constraints

### Unique Constraints

```sql
-- Only one member record per user per workspace
ALTER TABLE workspace_members ADD CONSTRAINT unique_member
UNIQUE (workspace_id, user_id);

-- Only one invite per email per workspace
ALTER TABLE invitations ADD CONSTRAINT unique_invite
UNIQUE (workspace_id, email);

-- Only one OWNER can exist per workspace
-- (Enforced in application logic)
```

## Performance Optimization

### Query Optimization

```javascript
// List members with user details (use JOIN instead of N+1)
const members = await WorkspaceMember.findMany({
  where: { workspaceId },
  include: {
    user: {
      select: { id, email, displayName, avatar },
    },
  },
  orderBy: { role: "asc" }, // OWNER first
});
```

### Caching Strategy

- **Workspace details** - Redis cache 1 hour
- **Member list** - Redis cache 30 minutes (invalidate on change)
- **User workspaces** - Redis cache 1 hour (invalidate on workspace change)

### Pagination

```javascript
// List members with pagination
GET /api/workspaces/:wsId/members?limit=20&skip=0

// Returns:
{
  members: [...],
  total: 150,
  hasMore: true,
  nextCursor: "user_100"
}
```

## Testing

```javascript
describe("Workspace Service", () => {
  it("should create workspace with owner", async () => {
    const ws = await createWorkspaceService("user_1", {
      name: "Test WS",
    });

    const member = await WorkspaceMember.findOne({
      workspaceId: ws.id,
      userId: "user_1",
    });

    expect(member.role).toBe("OWNER");
  });

  it("should reject role without owner", async () => {
    const ws = await createWorkspaceService("user_1", {});
    const member = await WorkspaceMember.findOne({
      workspaceId: ws.id,
      role: "OWNER",
    });

    expect(() => removeMemberService(ws.id, member.userId, "user_1")).toThrow(
      "Cannot remove last owner",
    );
  });
});
```

## Related Features

- 👤 **Auth**: Users must login first
- 💬 **Chat**: Channels belong to workspaces
- 📋 **Tasks**: Tasks assigned within workspaces
- 🔔 **Notifications**: Member invites & role changes
- 📊 **Dashboard**: Workspace analytics & insights

---

For more details, see [Architecture Guide](../../ARCHITECTURE.md) or [Main README](../../README.md).
