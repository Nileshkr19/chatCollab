// Channel Controllers
import asyncHandler from "@utils/asyncHandler.js";
import apiResponse from "@utils/apiResponse.js";
import apiError from "@utils/apiError";
import logger from "@utils/logger.js";
import {
  createChannelService,
  getChannelService,
  getWorkspaceChannelsService,
  updateChannelService,
  deleteChannelService,
  archiveChannelService,
  unArchiveChannelService,
} from "./channel.service.js";

export const createChannelController = asyncHandler(async (req, res) => {
  const workspaceId = req.params.workspaceId;
  const creatorId = req.user.userId;
  const { name, type, topic, isPrivate } = req.body;

  const channel = await createChannelService(workspaceId, creatorId, {
    name,
    type,
    topic,
    isPrivate,
  });

  if (!channel) {
    throw new apiError(400, "Failed to create channel");
  }

  logger.info(
    `Channel ${channel._id} created in workspace ${workspaceId} by user ${creatorId}`,
  );

  res
    .status(201)
    .json(new apiResponse(201, "Channel created successfully", channel));
});

export const getChannelController = asyncHandler(async (req, res) => {
  const channelId = req.params.channelId;

  const channel = await getChannelService(channelId);

  if (!channel) {
    throw new apiError(404, "Channel not found");
  }

  res
    .status(200)
    .json(new apiResponse(200, "Channel retrieved successfully", channel));
});

export const getWorkspaceChannelsController = asyncHandler(async (req, res) => {
  const workspaceId = req.params.workspaceId;

  const channels = await getWorkspaceChannelsService(workspaceId);
  if (!channels) {
    throw new apiError(404, "Channels not found");
  }

  res
    .status(200)
    .json(new apiResponse(200, "Channels retrieved successfully", channels));
});

export const updateChannelController = asyncHandler(async (req, res) => {
  const channelId = req.params.channelId;
  const { name, description, avatarUrl, topic, isPrivate } = req.body;

  const updatedChannel = await updateChannelService(channelId, {
    name,
    description,
    avatarUrl,
    topic,
    isPrivate,
  });

  if (!updatedChannel) {
    throw new apiError(404, "Channel not found");
  }

  res
    .status(200)
    .json(new apiResponse(200, "Channel updated successfully", updatedChannel));
});

export const deleteChannelController = asyncHandler(async (req, res) => {
  const channelId = req.params.channelId;
  const userId = req.user.userId;

  const deletedChannel = await deleteChannelService(channelId, userId);

  if (!deletedChannel) {
    throw new apiError(404, "Channel not found");
  }

  res
    .status(200)
    .json(new apiResponse(200, "Channel deleted successfully", deletedChannel));
});

export const archiveChannelController = asyncHandler(async (req, res) => {
  const channelId = req.params.channelId;
  const userId = req.user.userId;

  const archivedChannel = await archiveChannelService(channelId, userId);

  if (!archivedChannel) {
    throw new apiError(404, "Channel not found");
  }

  res
    .status(200)
    .json(
      new apiResponse(200, "Channel archived successfully", archivedChannel),
    );
});

export const unArchiveChannelController = asyncHandler(async (req, res) => {
  const channelId = req.params.channelId;
  const userId = req.user.userId;

  const unArchivedChannel = await unArchiveChannelService(channelId, userId);

  if (!unArchivedChannel) {
    throw new apiError(404, "Channel not found");
  }

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        "Channel unarchived successfully",
        unArchivedChannel,
      ),
    );
});
