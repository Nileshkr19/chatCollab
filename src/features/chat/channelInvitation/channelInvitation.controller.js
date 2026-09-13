import {
  createChannelInvitation,
  acceptChannelInvitation,
  rejectChannelInvitation,
  revokeChannelInvitation,
  getUserInvitations,
} from "./channelInvitation.service.js";

import asyncHandler from "@utils/asyncHandler.js";
import apiResponse from "@utils/apiResponse.js";
import logger from "@utils/logger.js";

export const createChannelInvitationController = asyncHandler(
  async (req, res) => {
    const { channelId, workspaceId } = req.params;
    const { invitedUserId } = req.body;
    const invitedBy = req.user.userId;

    const invitation = await createChannelInvitation(
      workspaceId,
      channelId,
      invitedUserId,
      invitedBy,
    );

    logger.info(
      `Channel invitation ${invitation._id} created for user ${invitedUserId} in channel ${channelId} by user ${invitedBy}`,
    );

    res
      .status(201)
      .json(
        new apiResponse(
          201,
          "Channel invitation created successfully",
          invitation,
        ),
      );
  },
);

export const acceptChannelInvitationController = asyncHandler(
  async (req, res) => {
    const { invitationId } = req.params;
    const userId = req.user.userId;

    const invitation = await acceptChannelInvitation(invitationId, userId);

    logger.info(
      `Channel invitation ${invitation._id} accepted by user ${userId}`,
    );

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          "Channel invitation accepted successfully",
          invitation,
        ),
      );
  },
);

export const rejectChannelInvitationController = asyncHandler(
  async (req, res) => {
    const { invitationId } = req.params;
    const userId = req.user.userId;

    const invitation = await rejectChannelInvitation(invitationId, userId);

    logger.info(
      `Channel invitation ${invitation._id} rejected by user ${userId}`,
    );

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          "Channel invitation rejected successfully",
          invitation,
        ),
      );
  },
);

export const revokeChannelInvitationController = asyncHandler(
  async (req, res) => {
    const { invitationId } = req.params;
    const revokedBy = req.user.userId;

    const revokedInvitation = await revokeChannelInvitation(
      invitationId,
      revokedBy,
    );

    logger.info(
      `Channel invitation ${revokedInvitation._id} revoked by user ${revokedBy}`,
    );

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          "Channel invitation revoked successfully",
          revokedInvitation,
        ),
      );
  },
);

export const getUserInvitationsController = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const status = req.query.status; // Optional query parameter to filter by status

  const invitations = await getUserInvitations(userId, status);

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        "User invitations retrieved successfully",
        invitations,
      ),
    );
});
