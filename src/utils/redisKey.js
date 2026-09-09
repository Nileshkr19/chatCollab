export const redisKeys = {
  // ─── Auth ────────────────────────────────────────────
  pendingUser: (hashedToken) => `pending:user:${hashedToken}`,
  verifyToken: (hashedToken) => `verify:token:${hashedToken}`,
  verifyUser: (userId) => `verify:user:${userId}`,
  resetToken: (hashedToken) => `reset:token:${hashedToken}`,
  resetUser: (userId) => `reset:user:${userId}`,
  refreshToken: (userId, tokenId) => `refresh:${userId}:${tokenId}`,
  allRefreshTokens: (userId) => `refresh:${userId}:*`,

  // ─── Rate limiting ────────────────────────────────────
  rateLimit: (prefix, key) => `rl:${prefix}:${key}`,

  // ─── Cache ────────────────────────────────────────────
  workspace: (workspaceId) => `cache:workspace:${workspaceId}`,
  workspaceMembers: (workspaceId) => `cache:workspace:${workspaceId}:members`,
  userWorkspaces: (userId) => `cache:user:${userId}:workspaces`,
  channel: (channelId) => `cache:channel:${channelId}`,
  workspaceChannels: (workspaceId) => `cache:workspace:${workspaceId}:channels`,
  channelMembers: (channelId) => `cache:channel:${channelId}:members`,

  // ─── Permissions ──────────────────────────────────────
  chatPermissions: (workspaceId, role) =>
    `cache:permissions:${workspaceId}:${role}`,

  // ─── Real-time ────────────────────────────────────────
  userPresence: (workspaceId, userId) => `presence:${workspaceId}:${userId}`,
  typing: (channelId, userId) => `typing:${channelId}:${userId}`,
};
