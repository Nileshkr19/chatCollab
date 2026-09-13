import { prisma } from "../../config/connectPostgres.js";

export const getWorkspaceMembership = async (workspaceId, userId) => {
  return prisma.workspaceMember.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: userId,
      },
    },
    include: {
      workspace: {
        select: {
          id: true,
          deleted_at: true,
        },
      },
    },
  });
};

export const getActiveWorkspaceMembership = async (workspaceId, userId) => {
  const membership = await getWorkspaceMembership(workspaceId, userId);

  return membership?.is_active && !membership.workspace.deleted_at
    ? membership
    : null;
};

export const assertCanCreateChannel = async (workspaceId, userId) => {
  const membership = await getWorkspaceMembership(workspaceId, userId);

  if (
    !membership ||
    !membership.is_active ||
    membership.workspace.deleted_at ||
    !["OWNER", "MANAGER"].includes(membership.role)
  ) {
    const error = new Error(
      "Only active workspace owners or managers can create channels",
    );
    error.status = 403;
    throw error;
  }

  return membership;
};
