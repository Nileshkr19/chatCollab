import asyncHandler from "@utils/asyncHandler.js";
import apiResponse from "@utils/apiResponse.js";
import {
  createReadReceipt,
  getReadReceipt,
  getUnreadCount,
  deleteReadReceipt,
  updateLastReadMessage,
  getChannelReadStatus,
} from "./readReceipts.service.js";

export const createReadReceiptController = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user.userId;

  const readReceipt = await createReadReceipt(channelId, userId);

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        readReceipt,
        "Read receipt retrieved or created successfully",
      ),
    );
});

export const getReadReceiptController = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user.userId;

  const readReceipt = await getReadReceipt(channelId, userId);

  if (!readReceipt) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Read receipt not found"));
  }

  return res
    .status(200)
    .json(
      new apiResponse(200, readReceipt, "Read receipt retrieved successfully"),
    );
});

export const getUnreadCountController = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user.userId;

  const unreadCount = await getUnreadCount(channelId, userId);

  if (unreadCount === null) {
    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          { unreadCount: 0 },
          "Unread count retrieved successfully",
        ),
      );
  }

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        { unreadCount },
        "Unread count retrieved successfully",
      ),
    );
});

export const updateLastReadMessageController = asyncHandler(
  async (req, res) => {
    const { channelId, messageId } = req.params;
    const userId = req.user.userId;

    const updatedReadReceipt = await updateLastReadMessage(
      channelId,
      userId,
      messageId,
    );

    if (!updatedReadReceipt) {
      return res
        .status(404)
        .json(
          new apiResponse(404, null, "Message not found or has been deleted"),
        );
    }

    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          updatedReadReceipt,
          "Last read message updated successfully",
        ),
      );
  },
);

export const deleteReadReceiptController = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user.userId;

  const deletedReadReceipt = await deleteReadReceipt(channelId, userId);

  if (!deletedReadReceipt) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Read receipt not found"));
  }

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        deletedReadReceipt,
        "Read receipt deleted successfully",
      ),
    );
});

export const getChannelReadStatusController = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  const readStatus = await getChannelReadStatus(channelId);

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        readStatus,
        "Channel read status retrieved successfully",
      ),
    );
});
