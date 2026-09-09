import ChannelInvitation from "./channelInvitation.models.js";
import ChannelMember from "../member/channelMember.models.js";
import Channel from "../channel/channel.models.js";
import logger from "@utils/logger.js";
import { prisma } from "@config/connectPostgres";

export const createChannelInvitation = async (
  channelId,
  workspaceId,
  invitedBy,
  invitedUserId,
) => {
  const channel = await Channel.findOne({
    _id: channelId,
    workspaceId,
    isRemoved: false,
    isArchived: false,
  });
  if (!channel) {
    throw new Error("Channel not found");
  }
  if (!channel.isPrivate) {
    const error = new Error(
      "Invitations can only be sent for private channels",
    );
    error.statusCode = 400;
    throw error;
  }

  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: invitedUserId,
      },
    },
  });
  if (!workspaceMember) {
    const error = new Error("Invited user is not a member of the workspace");
    error.statusCode = 400;
    throw error;
  }

  const channelMember = await ChannelMember.findOne({
    channelId,
    userId: invitedUserId,
    isRemoved: false,
  });
  if (channelMember) {
    const error = new Error("Invited user is already a member of the channel");
    error.statusCode = 400;
    throw error;
  }

  const existingInvitation = await ChannelInvitation.findOne({
    channelId,
    invitedUserId,
    status: "pending",
  });
  if (existingInvitation) {
    const error = new Error("An invitation is already pending for this user");
    error.statusCode = 400;
    throw error;
  }

  const invitation = await ChannelInvitation.create({
    workspaceId,
    channelId,
    invitedBy,
    invitedUserId,
    status: "pending",
  });
  return invitation;
};

export const acceptChannelInvitation = async (invitationId, userId) => {
  const invitation = await ChannelInvitation.findOne({
    _id: invitationId,
    invitedUserId: userId,
    status: "pending",
  }).lean();
  if (!invitation) {
    const error = new Error("Invitation not found or already processed");
    error.statusCode = 404;
    throw error;
  }
  if (invitation.invitedUserId !== userId) {
    const error = new Error("You are not authorized to accept this invitation");
    error.statusCode = 403;
    throw error;
  }

  if (invitation.status === "pending" && invitation.expiresAt < new Date()) {
    const error = new Error("Invitation has expired");
    error.statusCode = 410;
    throw error;
  }

  const session = await ChannelMember.startSession();
  session.startTransaction();
  try {
    const channel = await Channel.findOne({
      _id: invitation.channelId,
      isRemoved: false,
      isArchived: false,
    });
    if (!channel) {
      const error = new Error("Channel is no longer available");
      error.statusCode = 410;
      throw error;
    }

    const channelMember = await ChannelMember.create(
      [
        {
          channelId: invitation.channelId,
          userId,
          joinedAt: new Date(),
        },
      ],
      { session },
    );

    const updatedInvitation = await ChannelInvitation.findOneAndUpdate(
      {
        _id: invitationId,
        status: "pending",
      },
      {
        status: "accepted",
        responseAt: new Date(),
      },
      { new: true, session },
    );

    if (!updatedInvitation) {
      const error = new Error("Failed to accept invitation, please try again");
      error.statusCode = 500;
      throw error;
    }

    await Channel.findByIdAndUpdate(
      invitation.channelId,
      { $inc: { memberCount: 1 } },
      { session },
    );
    await session.commitTransaction();

    logger.info(
      `User ${userId} accepted invitation to channel ${invitation.channelId}`,
    );

    return channelMember;
  } catch (error) {
    await session.abortTransaction();
    logger.error(`Error accepting channel invitation: ${error.message}`);
    const err = new Error("Failed to accept invitation, please try again");
    err.statusCode = 500;
    throw err;
  } finally {
    session.endSession();
  }
};

export const rejectChannelInvitation = async (invitationId, userId) => {
  const invitation = await ChannelInvitation.findOne({
    _id: invitationId,
    invitedUserId: userId,
    status: "pending",
  });
  if (!invitation) {
    const error = new Error("Invitation not found or already processed");
    error.statusCode = 404;
    throw error;
  }
  if (invitation.invitedUserId !== userId) {
    const error = new Error("You are not authorized to reject this invitation");
    error.statusCode = 403;
    throw error;
  }

  if (invitation.status === "pending" && invitation.expiresAt < new Date()) {
    const error = new Error("Invitation has expired");
    error.statusCode = 410;
    throw error;
  }
  const updatedInvitation = await ChannelInvitation.findOneAndUpdate(
    { _id: invitationId, status: "pending" },
    { status: "rejected", responseAt: new Date() },
    { new: true },
  );
  if (!updatedInvitation) {
    const error = new Error("Failed to reject invitation, please try again");
    error.statusCode = 500;
    throw error;
  }
  return updatedInvitation;
};

export const revokeChannelInvitation = async (invitationId, revokedBy) => {
  const invitation = await ChannelInvitation.findOne({
    _id: invitationId,
    invitedBy: revokedBy,
    status: "pending",
  });
  if (!invitation) {
    const error = new Error("Invitation not found or already processed");
    error.statusCode = 404;
    throw error;
  }
  if (invitation.invitedBy !== revokedBy) {
    const error = new Error("You are not authorized to revoke this invitation");
    error.statusCode = 403;
    throw error;
  }

  if (invitation.status === "pending" && invitation.expiresAt < new Date()) {
    const error = new Error("Invitation has expired");
    error.statusCode = 410;
    throw error;
  }
  const updatedInvitation = await ChannelInvitation.findOneAndUpdate(
    {
      _id: invitationId,
      invitedBy: revokedBy,
      status: "pending",
    },
    {
      status: "revoked",
      responseAt: new Date(),
    },
    { new: true },
  );

  if (!updatedInvitation) {
    const error = new Error("Failed to revoke invitation, please try again");
    error.statusCode = 500;
    throw error;
  }
  logger.info(
    `User ${revokedBy} revoked invitation ${invitationId} for channel ${invitation.channelId}`,
  );

  return updatedInvitation;
};

export const getUserInvitations = async (userId, status) => {
  const filter = { invitedUserId: userId };
  if (
    status &&
    ["pending", "accepted", "rejected", "revoked"].includes(status)
  ) {
    filter.status = status;
  }
  const invitations = await ChannelInvitation.find(filter)
    .populate("channelId", "name isPrivate")
    .sort({ createdAt: -1 })
    .lean();
  return invitations;
};
