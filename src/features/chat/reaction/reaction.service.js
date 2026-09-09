import mongoose from "mongoose";
import Reaction from "./reaction.models.js";
import Message from "../message/message.models.js";
import logger from "@utils/logger";
import { prisma } from "@config/connectPostgres.js";

export const addReactionService = async (messageId, userId, emoji) => {
  const message = await Message.findById(messageId);
  if (!message || message.isDeleted) {
    logger.error(`Message with ID ${messageId} not found or has been deleted`);
    throw new Error("Message not found");
  }

  const existingReaction = await Reaction.findOne({
    messageId,
    userId,
    emoji,
  }).lean();

  if (existingReaction) {
    logger.warn(
      `User ${userId} has already reacted with ${emoji} to message ${messageId}`,
    );
    throw new Error("Reaction already exists");
  }

  const reaction = await Reaction.create({
    messageId,
    userId,
    emoji,
  });

  if (reaction) {
    await Message.findByIdAndUpdate(
      messageId,
      { $inc: { reactionsCount: 1 } },
      { new: true },
    );
  }

  logger.info(`Reaction added for message ${messageId} by user ${userId}`);
  return reaction;
};

export const removeReactionService = async (messageId, userId, emoji) => {
  const message = await Message.findById(messageId);
  if (!message || message.isDeleted) {
    logger.error(`Message with ID ${messageId} not found or has been deleted`);
    throw new Error("Message not found");
  }

  const reaction = await Reaction.findOneAndDelete({
    messageId,
    userId,
    emoji,
  });

  if (!reaction) {
    logger.warn(
      `Reaction with emoji ${emoji} by user ${userId} for message ${messageId} not found`,
    );
    throw new Error("Reaction not found");
  }
  await Message.findByIdAndUpdate(
    messageId,
    { $inc: { reactionsCount: -1 } },
    { new: true },
  );

  logger.info(`Reaction removed for message ${messageId} by user ${userId}`);
  return reaction;
};

export const getReactionsForMessageService = async (messageId) => {
  const groupedReactions = await Reaction.aggregate([
    { $match: { messageId: new mongoose.Types.ObjectId(messageId) } },
    {
      $group: {
        _id: "$emoji",
        count: { $sum: 1 },
        users: { $push: "$userId" },
      },
    },
    {
      $project: {
        _id: 0,
        emoji: "$_id",
        count: 1,
        users: 1,
      },
    },
  ]);

  const result = groupedReactions.reduce((acc, item) => {
    acc[item.emoji] = {
      count: item.count,
      users: item.users,
    };
    return acc;
  }, {});

  logger.info(`Fetched reactions for message ${messageId}`);
  return result;
};

export const getReactionsByEmojiService = async (messageId, emoji) => {
  const reactions = await Reaction.find({
    messageId,
    emoji,
  }).lean();

  const userIds = reactions.map((reaction) => reaction.userId);

  const user = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      username: true,
    },
  });

  logger.info(
    `Fetched users who reacted with ${emoji} for message ${messageId}`,
  );
  return user;
};
