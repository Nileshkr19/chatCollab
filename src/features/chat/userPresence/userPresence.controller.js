import asyncHandler from "@utils/asyncHandler.js";
import apiResponse from "@utils/apiResponse.js";
import {
  setUserPresence,
  getUserPresence,
  refreshUserPresence,
  getWorkspacePresence,
  deleteUserPresence,
} from "./userPresence.service.js";

export const setUserPresenceController = asyncHandler(async (req, res) => {
  const { workspaceId, channelId } = req.params;
  const userId = req.user.userId;
  const { status } = req.body;

  await setUserPresence(workspaceId, userId, status, channelId);

  return res
    .status(200)
    .json(new apiResponse(200, null, "User presence set successfully"));
});

export const getUserPresenceController = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.user.userId;

  const presenceData = await getUserPresence(workspaceId, userId);

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        presenceData,
        "User presence retrieved successfully",
      ),
    );
});

export const refreshUserPresenceController = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.user.userId;

  await refreshUserPresence(workspaceId, userId);

  return res
    .status(200)
    .json(new apiResponse(200, null, "User presence refreshed successfully"));
});

export const getWorkspacePresenceController = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;

  const presenceData = await getWorkspacePresence(workspaceId);

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        presenceData,
        "Workspace presence retrieved successfully",
      ),
    );
});

export const deleteUserPresenceController = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.user.userId;

  await deleteUserPresence(workspaceId, userId);

  return res
    .status(200)
    .json(new apiResponse(200, null, "User presence deleted successfully"));
});
