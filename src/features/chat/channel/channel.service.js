import mongoose from "mongoose";
import Channel from "./channel.models.js";
import ChannelMember from "../member/channelMember.models.js";
import logger from "@utils/logger.js";

export const createChannelService = async (
  workspaceId,
  creatorId,
  { name, type, topic, isPrivate },
) => {
  try {
    const existingChannel = await Channel.findOne({
      workspaceId,
      isRemoved: false,
      isArchived: false,

      name: name?.trim(),
      type: "GROUP",
    });
    if (existingChannel) {
      const error = new Error(
        "Channel with the same name and type already exists in this workspace",
      );
      error.status = 409;
      throw error;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const channel = await Channel.create(
        {
          workspaceId,
          createdBy: creatorId,
          name: name.trim(),
          type: type || "GROUP",
          topic: topic?.trim() || null,
          isPrivate: isPrivate || false,
        },
        { session },
      );

      await Promise.all([
        ChannelMember.create(
          {
            channelId: channel._id,
            userId: creatorId,
            role: "ADMIN",
          },
          { session },
        ),
        Channel.findByIdAndUpdate(
          channel._id,
          { $inc: { memberCount: 1 } },
          { session, new: true },
        ),
      ]);

      await session.commitTransaction();

      const updatedChannel = await Channel.findById(channel._id).lean();

      logger.info(
        `Channel ${updatedChannel._id} created in workspace ${workspaceId} by user ${creatorId}`,
      );
      return updatedChannel;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (error) {
    logger.error("Error creating channel", error);
    const err = error.status ? error : new Error("Failed to create channel");
    err.status = err.status || 500;
    throw err;
  }
};

export const getChannelService = async (channelId) => {
  try {
    const channel = await Channel.findOne({
      _id: channelId,
    })
      .select(
        "name description topic type isPrivate createdBy memberCount lastMessage",
      )
      .lean();

    if (!channel) {
      const error = new Error("Channel not found");
      error.status = 404;
      throw error;
    }

    logger.info(`Channel ${channelId} fetched`);
    return channel;
  } catch (error) {
    logger.error("Error fetching channel", error);
    const err = error.status ? error : new Error("Channel not found");
    err.status = err.status || 404;
    throw err;
  }
};

export const getWorkspaceChannelsService = async (workspaceId) => {
  try {
    const channels = await Channel.find({
      workspaceId,
      isArchived: false,
    })
      .select(
        "name description topic type isPrivate createdBy memberCount lastMessage",
      )
      .lean();

    logger.info(`Workspace channels for ${workspaceId} fetched`);
    return channels;
  } catch (error) {
    logger.error("Error fetching workspace channels", error);
    const err = error.status
      ? error
      : new Error("Failed to fetch workspace channels");
    err.status = err.status || 500;
    throw err;
  }
};

export const updateChannelService = async (
  channelId,
  { name, description, avatarUrl, topic, isPrivate },
) => {
  try {
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (topic !== undefined) updateData.topic = topic || null;
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate;

    const channel = await Channel.findOneAndUpdate(
      { _id: channelId, isArchived: false },
      { $set: updateData },
      { new: true },
    ).lean();

    if (!channel) {
      const error = new Error("Channel not found or archived");
      error.status = 404;
      throw error;
    }

    logger.info(`Channel ${channelId} updated`);
    return channel;
  } catch (error) {
    logger.error("Error updating channel", error);
    const err = error.status ? error : new Error("Failed to update channel");
    err.status = err.status || 500;
    throw err;
  }
};

export const deleteChannelService = async (channelId, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const channel = await Channel.findOneAndUpdate(
      { _id: channelId },
      { $set: { isRemoved: true, removedBy: userId } },
      { new: true, session },
    );

    if (!channel) {
      const error = new Error("Channel not found ");
      error.status = 404;
      throw error;
    }

    await ChannelMember.updateMany(
      { channelId },
      { $set: { isRemoved: true, removedBy: userId } },
      { session },
    );

    await session.commitTransaction();

    logger.info(`Channel ${channelId} deleted`);
    return channel;
  } catch (error) {
    await session.abortTransaction();
    logger.error("Error deleting channel", error);
    const err = error.status ? error : new Error("Failed to delete channel");
    err.status = err.status || 500;
    throw err;
  } finally {
    session.endSession();
  }
};

export const archiveChannelService = async (channelId, userId) => {
  const channel = await Channel.findOneAndUpdate(
    { _id: channelId, isArchived: false },
    { $set: { isArchived: true } },
    { new: true },
  );

  if (!channel) {
    const error = new Error("Channel not found or already archived");
    error.status = 404;
    throw error;
  }

  logger.info(`Channel ${channelId} archived`);
  return channel;
};

export const unArchiveChannelService = async (channelId, userId) => {
  // First fetch the archived channel to get its details
  const archivedChannel = await Channel.findOne({
    _id: channelId,
    isArchived: true,
    isRemoved: false,
  });

  if (!archivedChannel) {
    const error = new Error("Channel not found or not archived");
    error.status = 404;
    throw error;
  }

  // Check if an active channel with the same name and type already exists
  const duplicateChannel = await Channel.findOne({
    workspaceId: archivedChannel.workspaceId,
    name: archivedChannel.name,
    type: archivedChannel.type,
    isRemoved: false,
    isArchived: false,
    _id: { $ne: channelId },
  });

  if (duplicateChannel) {
    const error = new Error(
      "Cannot unarchive channel: an active channel with the same name already exists in this workspace",
    );
    error.status = 409;
    throw error;
  }

  const channel = await Channel.findOneAndUpdate(
    { _id: channelId, isArchived: true },
    { $set: { isArchived: false } },
    { new: true },
  );

  if (!channel) {
    const error = new Error("Failed to unarchive channel");
    error.status = 500;
    throw error;
  }

  logger.info(`Channel ${channelId} unarchived`);
  return channel;
};

export const getArchivedChannelsService = async (workspaceId) => {
  try {
    const channels = await Channel.find({
      workspaceId,
      isArchived: true,
      isRemoved: false,
    })
      .select("name description topic type isPrivate createdBy memberCount ")
      .lean();
    return channels;
  } catch (error) {
    logger.error("Error fetching archived channels", error);
    throw new Error("Failed to fetch archived channels");
  }
};

