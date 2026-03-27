import {
  createWorkspaceService,
  getUserWorkspacesService,
  getWorkspaceService,
  updateWorkspaceService,
  deleteWorkspaceService,
  getWorkspaceMembersService,
  inviteMemberService,
  updateMemberRoleService,
  removeMemberService,
  leaveWorkspaceService,
  transferOwnershipService,
} from "./workspace.service.js";

import apiResponse from "../../utils/apiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";

export const createWorkspace = asyncHandler(async (req, res) => {
  const { name, logo_url } = req.body;
  const userId = req.user.userId;
  const workspace = await createWorkspaceService(userId, { name, logo_url });
  res
    .status(201)
    .json(new apiResponse(201, "Workspace created successfully", workspace));
});

export const getUserWorkspaces = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const workspaces = await getUserWorkspacesService(userId);
  res
    .status(200)
    .json(new apiResponse(200, "Workspaces fetched successfully", workspaces));
});

export const getWorkspace = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.user.userId;
  const workspace = await getWorkspaceService(workspaceId, userId);
  res
    .status(200)
    .json(new apiResponse(200, "Workspace fetched successfully", workspace));
});

export const updateWorkspace = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.user.userId;
  const { name, logo_url } = req.body;
  const workspace = await updateWorkspaceService(workspaceId, userId, {
    name,
    logo_url,
  });
  res
    .status(200)
    .json(new apiResponse(200, "Workspace updated successfully", workspace));
});

export const deleteWorkspace = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.user.userId;
  const result = await deleteWorkspaceService(workspaceId, userId);
  res.status(200).json(new apiResponse(200, result.message));
});

export const getWorkspaceMembers = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const members = await getWorkspaceMembersService(workspaceId);
  res
    .status(200)
    .json(
      new apiResponse(200, "Workspace members fetched successfully", members),
    );
});

export const inviteMember = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const invitedBy = req.user.userId;
  const { email, role } = req.body;
  const member = await inviteMemberService(workspaceId, invitedBy, {
    email,
    role,
  });
  res
    .status(201)
    .json(new apiResponse(201, "Member invited successfully", member));
});

export const updateMemberRole = asyncHandler(async (req, res) => {
  const { workspaceId, userId: targetUserId } = req.params;
  const requestingUserId = req.user.userId;
  const { role } = req.body;
  const member = await updateMemberRoleService(
    workspaceId,
    targetUserId,
    role,
    requestingUserId,
  );
  res
    .status(200)
    .json(new apiResponse(200, "Member role updated successfully", member));
});

export const removeMember = asyncHandler(async (req, res) => {
  const { workspaceId, userId: targetUserId } = req.params;
  const requestingUserId = req.user.userId;
  const result = await removeMemberService(
    workspaceId,
    targetUserId,
    requestingUserId,
  );
  res.status(200).json(new apiResponse(200, result.message));
});

export const leaveWorkspace = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.user.userId;
  const result = await leaveWorkspaceService(workspaceId, userId);
  res.status(200).json(new apiResponse(200, result.message));
});

export const transferOwnership = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const currentOwnerId = req.user.userId;
  const { newOwnerId } = req.body;
  const result = await transferOwnershipService(
    workspaceId,
    currentOwnerId,
    newOwnerId,
  );
  res.status(200).json(new apiResponse(200, result.message));
});
