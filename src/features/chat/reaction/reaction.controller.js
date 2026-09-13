import asyncHandler from "@utils/asyncHandler.js";
import apiResponse from "@utils/apiResponse.js";
import {
  addReactionService,
  removeReactionService,
  getReactionsForMessageService,
  getReactionsByEmojiService,
} from "./reaction.service.js";

export const addReactionController = asyncHandler(async (req, res) => {
  const { emoji } = req.body;
  const { messageId } = req.params;
  const userId = req.user.userId;

  const reaction = await addReactionService(messageId, userId, emoji);

  return res
    .status(201)
    .json(new apiResponse(201, reaction, "Reaction added successfully"));
});

export const removeReactionController = asyncHandler(async (req, res) => {
  const { emoji } = req.body;
  const { messageId } = req.params;
  const userId = req.user.userId;

  await removeReactionService(messageId, userId, emoji);

  return res
    .status(200)
    .json(new apiResponse(200, null, "Reaction removed successfully"));
});

export const getReactionsForMessageController = asyncHandler(
  async (req, res) => {
    const { messageId } = req.params;

    const reactions = await getReactionsForMessageService(messageId);

    return res
      .status(200)
      .json(new apiResponse(200, reactions, "Reactions fetched successfully"));
  },
);

export const getReactionsByEmojiController = asyncHandler(async (req, res) => {
  const { messageId, emoji } = req.params;

  const users = await getReactionsByEmojiService(messageId, emoji);

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        users,
        `Users who reacted with ${emoji} fetched successfully`,
      ),
    );
});
