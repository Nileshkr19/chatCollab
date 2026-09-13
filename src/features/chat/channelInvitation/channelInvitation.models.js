import mongoose from "mongoose";

const channelInvitationSchema = new mongoose.Schema(
  {
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
    },
    workspaceId: {
      type: String,
      required: true,
      
    },
    invitedBy: {
      type: String,
      required: true,
    },
    invitedUserId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "revoked"],
      default: "pending",
    },
    responseAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
    },
  },
  { timestamps: true },
);

channelInvitationSchema.index(
  { channelId: 1, invitedUserId: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } },
);
channelInvitationSchema.index({ invitedUserId: 1, status: 1 });
channelInvitationSchema.index({ expiresAt: 1 });

const ChannelInvitation = mongoose.model(
  "ChannelInvitation",
  channelInvitationSchema,
);

export default ChannelInvitation;
