import { prisma } from "../../config/connectPostgres.js";
import logger from "../../utils/logger.js";
import slugify from "slugify";
import apiError from "../../utils/apiError.js";

const generateUniqueSlug = async (name) => {
  const baseSlug = slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  });

  const existingSlug = await prisma.workspace.findUnique({
    where: {
      slug: baseSlug,
    },
  });

  if (!existingSlug) {
    return baseSlug;
  }

  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${randomSuffix}`;
};

// ─── create a new workspace ──────────────────────
export const createWorkspaceService = async (userId, { name, logo_url }) => {
  const slug = await generateUniqueSlug(name);

  const workspace = await prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.create({
      data: {
        name,
        slug,
        logo_url: logo_url || null,
        owner_id: userId,
      },
    });
    await tx.WorkspaceMember.create({
      data: {
        workspace_id: ws.id,
        user_id: userId,
        role: "OWNER",
        invited_by: null,
      },
    });
    return ws;
  });
  logger.info(
    `Workspace created with ID: ${workspace.id} and slug: ${workspace.slug}`,
  );

  return workspace;
};

// ─── get all workspaces for current user ──────────────────────
export const getUserWorkspacesService = async (userId) => {
  const memberships = await prisma.workspaceMember.findMany({
    where: {
      user_id: userId,
      is_active: true,
      workspace: {
        deleted_at: null,
      },
    },
    select: {
      role: true,
      joined_at: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo_url: true,
          owner_id: true,
          created_at: true,
          _count: {
            select: {
              members: true,
            },
          },
        },
      },
    },
    orderBy: {
      joined_at: "desc",
    },
  });

  return memberships.map(({ workspace, role, joined_at }) => ({
    ...workspace,
    role,
    joined_at,
    memberCount: workspace._count.members,
  }));
};

// ─── get single workspace ─────────────────────────────────────
export const getWorkspaceService = async (workspaceId, userId) => {
  const workspace = await prisma.workspace.findUnique({
    where: {
      id: workspaceId,
      deleted_at: null,
      members: {
        some: {
          user_id: userId,
          is_active: true,
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logo_url: true,
      owner_id: true,
      created_at: true,
      updated_at: true,
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  if (!workspace) {
    throw new apiError(404, "Workspace not found or access denied");
  }

  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: userId,
      },
    },
    select: {
      role: true,
    },
  });

  return {
    ...workspace,
    role: member ? member.role : null,
    memberCount: workspace._count.members,
  };
};

// ─── update workspace details ─────────────────────────────────────
export const updateWorkspaceService = async (
  workspaceId,
  userId,
  updatedData,
) => {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      deleted_at: null,
    },
    select: {
      owner_id: true,
      name: true,
    },
  });

  if (!workspace) {
    throw new apiError(404, "Workspace not found");
  }

  if (workspace.owner_id !== userId) {
    throw new apiError(403, "Only workspace owner can update the workspace");
  }

  let slug;
  if (updatedData.name && updatedData.name !== workspace.name) {
    slug = await generateUniqueSlug(updatedData.name);
  }

  if ("logo_url" in updatedData && !updatedData.logo_url) {
    updatedData.logo_url = null;
  }

  const updatedWorkspace = await prisma.workspace.update({
    where: {
      id: workspaceId,
    },
    data: {
      ...updatedData,
      slug: slug || undefined,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logo_url: true,
      owner_id: true,
      created_at: true,
      updated_at: true,
    },
  });

  logger.info(`Workspace with ID: ${workspaceId} updated by user: ${userId}`);

  return updatedWorkspace;
};

// ─── delete workspace ─────────────────────────────────────
export const deleteWorkspaceService = async (workspaceId, userId) => {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      deleted_at: null,
    },
    select: {
      owner_id: true,
    },
  });

  if (!workspace) {
    throw new apiError(404, "Workspace not found");
  }

  if (workspace.owner_id !== userId) {
    throw new apiError(403, "Only workspace owner can delete the workspace");
  }

  await prisma.workspace.update({
    where: {
      id: workspaceId,
    },
    data: {
      deleted_at: new Date(),
    },
  });

  logger.info(`Workspace with ID: ${workspaceId} deleted by user: ${userId}`);

  return { message: "Workspace deleted successfully" };
};

// ─── get workspace members ────────────────────────────────────
export const getWorkspaceMembersService = async (workspaceId) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true },
  });

  if (!workspace) {
    throw new apiError(404, "Workspace not found");
  }

  const members = await prisma.workspaceMember.findMany({
    where: {
      workspace_id: workspaceId,
      is_active: true,
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          email: true,
          avatar_url: true,
          last_seen: true,
          status: true,
        },
      },
    },
    orderBy: {
      joined_at: "asc",
    },
  });

  return members.map((m) => ({
    ...m.user,
    role: m.role,
    joined_at: m.joined_at,
    invited_by: m.invited_by,
  }));
};

// ─── invite member ────────────────────────────────────────────
export const inviteMemberService = async (
  workspaceId,
  invitedBy,
  { email, role },
) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true },
  });
  if (!workspace) {
    throw new apiError(404, "Workspace not found");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    throw new apiError(404, "User with this email does not exist");
  }

  const existingMembership = await prisma.workspaceMember.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: user.id,
      },
    },
  });

  if (existingMembership) {
    if (existingMembership.is_active) {
      throw new apiError(400, "User is already a member of the workspace");
    }
    const reactivated = await prisma.workspaceMember.update({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: user.id,
        },
      },
      data: {
        is_active: true,
        role: role || "MEMBER",
        invited_by: invitedBy,
        joined_at: new Date(),
      },
    });
    logger.info(
      `User with ID: ${user.id} re-activated in workspace: ${workspaceId} by user: ${invitedBy}`,
    );
    return reactivated;
  }

  const member = await prisma.workspaceMember.create({
    data: {
      workspace_id: workspaceId,
      user_id: user.id,
      role: role || "MEMBER",
      invited_by: invitedBy,
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          email: true,
        },
      },
    },
  });

  logger.info(
    `User with ID: ${user.id} invited to workspace: ${workspaceId} by user: ${invitedBy}`,
  );

  return member;
};

// ─── update member role ───────────────────────────────────────
export const updateMemberRoleService = async (
  workspaceId,
  targetUserId,
  newRole,
  requestingUserId,
) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { owner_id: true },
  });

  if (!workspace) {
    throw new apiError(404, "Workspace not found");
  }

  if (workspace.owner_id !== requestingUserId) {
    throw new apiError(403, "Only workspace owner can update member roles");
  }

  if (targetUserId === requestingUserId) {
    throw new apiError(400, "You cannot change your own role");
  }

  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: targetUserId,
      },
    },
  });
  if (!member || !member.is_active) {
    throw new apiError(404, "Member not found in the workspace");
  }

  if (member.role === "OWNER") {
    throw new apiError(
      400,
      "Cannot change role of the workspace owner, please transfer ownership first",
    );
  }

  const updatedMember = await prisma.workspaceMember.update({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: targetUserId,
      },
    },
    data: {
      role: newRole,
    },
    select: {
      role: true,
      user: {
        select: {
          id: true,
          firstName: true,
          email: true,
        },
      },
    },
  });

  logger.info(
    `User with ID: ${targetUserId} role updated to ${newRole} in workspace: ${workspaceId} by user: ${requestingUserId}`,
  );

  return updatedMember;
};

// ─── remove member ────────────────────────────────────────────
export const removeMemberService = async (
  workspaceId,
  targetUserId,
  requestingUserId,
) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { owner_id: true },
  });
  if (!workspace) {
    throw new apiError(404, "Workspace not found");
  }

  if (workspace.owner_id !== requestingUserId) {
    throw new apiError(403, "Only workspace owner can remove members");
  }

  if (targetUserId === requestingUserId) {
    throw new apiError(
      400,
      "You cannot remove yourself from the workspace, please transfer ownership first",
    );
  }

  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: targetUserId,
      },
    },
  });

  if (!member || !member.is_active) {
    throw new apiError(404, "Member not found in the workspace");
  }

  if (member.role === "OWNER") {
    throw new apiError(
      400,
      "Cannot remove the workspace owner, please transfer ownership first",
    );
  }

  await prisma.workspaceMember.update({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: targetUserId,
      },
    },
    data: {
      is_active: false,
    },
  });

  logger.info(
    `User with ID: ${targetUserId} removed from workspace: ${workspaceId} by user: ${requestingUserId}`,
  );

  return { message: "Member removed successfully" };
};

// ─── leave workspace ───────────────────────────────────────
export const leaveWorkspaceService = async (workspaceId, userId) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { owner_id: true },
  });
  if (!workspace) {
    throw new apiError(404, "Workspace not found");
  }

  if (workspace.owner_id === userId) {
    throw new apiError(
      400,
      "Workspace owner cannot leave the workspace, please transfer ownership first",
    );
  }

  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: userId,
      },
    },
  });

  if (!member || !member.is_active) {
    throw new apiError(404, "You are not a member of this workspace");
  }

  await prisma.workspaceMember.update({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: userId,
      },
    },
    data: {
      is_active: false,
    },
  });

  logger.info(`User with ID: ${userId} left workspace: ${workspaceId}`);

  return { message: "You have left the workspace successfully" };
};

// ─── transfer ownership ───────────────────────────────────────
export const transferOwnershipService = async (
  workspaceId,
  currentOwnerId,
  newOwnerId,
) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { owner_id: true },
  });
  if (!workspace) {
    throw new apiError(404, "Workspace not found");
  }

  if (workspace.owner_id !== currentOwnerId) {
    throw new apiError(
      403,
      "Only current workspace owner can transfer ownership",
    );
  }

  if (newOwnerId === currentOwnerId) {
    throw new apiError(400, "You are already the owner of the workspace");
  }

  const newOwnerMembership = await prisma.workspaceMember.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: newOwnerId,
      },
    },
  });

  if (!newOwnerMembership) {
    throw new apiError(
      404,
      "New owner must be an active member of the workspace",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.workspaceMember.update({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: currentOwnerId,
        },
      },
      data: {
        role: "MANAGER",
      },
    });

    await tx.workspaceMember.update({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: newOwnerId,
        },
      },
      data: {
        role: "OWNER",
      },
    });

    await tx.workspace.update({
      where: { id: workspaceId },
      data: {
        owner_id: newOwnerId,
      },
    });
  });

  logger.info(
    `Ownership of workspace with ID: ${workspaceId} transferred from user: ${currentOwnerId} to user: ${newOwnerId}`,
  );

  return { message: "Workspace ownership transferred successfully" };
};
