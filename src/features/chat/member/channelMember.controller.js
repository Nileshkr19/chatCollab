import asyncHandler from "@utils/asyncHandler.js";
import apiResponse from "@utils/apiResponse.js";
import apiError from "@utils/apiError.js";
import logger from "@utils/logger.js";
import {
  addChannelMemberService,
  removeChannelMemberService,
  updateChannelMemberRoleService,
  transferChannelOwnershipService,
  leaveChannelService,
} from "./channelMember.service.js";

export const addChannelMemberController = asyncHandler(async (req, res) => {
  const channelId = req.params.channelId;
  const workspaceId = req.params.workspaceId;
  const addedBy = req.user.userId;
  const { targetUserId } = req.body;

  const channelMember = await addChannelMemberService(
    workspaceId,
    channelId,
    addedBy,
    targetUserId,
  );

  if (!channelMember) {
    throw new apiError(500, "Failed to add member to the channel");
  }
  logger.info(
    `User ${targetUserId} added to channel ${channelId} by user ${addedBy}`,
  );

  res
    .status(201)
    .json(
      apiResponse(
        true,
        "Member added to the channel successfully",
        channelMember,
      ),
    );
});

export const removeChannelMemberController = asyncHandler(async (req, res) => {
  const channelId = req.params.channelId;
  const workspaceId = req.params.workspaceId;
  const removedBy = req.user.userId;
  const { targetUserId } = req.body;

  const removedMember = await removeChannelMemberService(
    workspaceId,
    channelId,
    removedBy,
    targetUserId,
  );

  if (!removedMember) {
    throw new apiError(500, "Failed to remove member from the channel");
  }

  logger.info(
    `User ${targetUserId} removed from channel ${channelId} by user ${removedBy}`,
  );

  res
    .status(200)
    .json(
      apiResponse(
        true,
        "Member removed from the channel successfully",
        removedMember,
      ),
    );
});

export const updateChannelMemberRoleController = asyncHandler(
  async (req, res) => {
    const channelId = req.params.channelId;
    const workspaceId = req.params.workspaceId;
    const updatedBy = req.user.userId;
    const { targetUserId, newRole } = req.body;

    const updatedMember = await updateChannelMemberRoleService(
      workspaceId,
      channelId,
      targetUserId,
      newRole,
      updatedBy,
    );

    if (!updatedMember) {
      throw new apiError(500, "Failed to update member role in the channel");
    }

    logger.info(
      `User ${targetUserId} role updated to ${newRole} in channel ${channelId} by user ${updatedBy}`,
    );

    res
      .status(200)
      .json(
        apiResponse(true, "Member role updated successfully", updatedMember),
      );
  },
);

export const transferChannelOwnershipController = asyncHandler(
  async (req, res) => {
    const channelId = req.params.channelId;
    const workspaceId = req.params.workspaceId;
    const transferedBy = req.user.userId;
    const { newOwnerId } = req.body;

    const updatedChannel = await transferChannelOwnershipService(
      workspaceId,
      channelId,
      newOwnerId,
      transferedBy,
    );

    if (!updatedChannel) {
      throw new apiError(500, "Failed to transfer channel ownership");
    }

    logger.info(
      `Channel ${channelId} ownership transferred to user ${newOwnerId} by user ${transferedBy}`,
    );

    res
      .status(200)
      .json(
        apiResponse(
          true,
          "Channel ownership transferred successfully",
          updatedChannel,
        ),
      );
  },
);

export const leaveChannelController = asyncHandler(async (req, res) => {
  const channelId = req.params.channelId;
  const channelMemberId = req.params.channelMemberId;
  const userId = req.user.userId;

  const leftChannel = await leaveChannelService(
    channelId,
    channelMemberId,
    userId,
  );

  if (!leftChannel) {
    throw new apiError(500, "Failed to leave the channel");
  }

  logger.info(`User ${userId} left channel ${channelId}`);

  res
    .status(200)
    .json(apiResponse(true, "Left the channel successfully", leftChannel));
});
