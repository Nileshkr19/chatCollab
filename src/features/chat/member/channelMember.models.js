import mongoose from "mongoose";

const channelMemberSchema = new mongoose.Schema(
  {
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["ADMIN", "MANAGER", "MEMBER"],
      default: "MEMBER",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    invitedBy: {
      type: String,
      default: null,
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
    mutedUntil: {
      type: Date,
      default: null,
    },
    isRemoved: {
      type: Boolean,
      default: false,
    },
    removedBy: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

channelMemberSchema.index({ channelId: 1, userId: 1 }, { unique: true });
channelMemberSchema.index({ channelId: 1, role: 1 });
channelMemberSchema.index({ channelId: 1, isRemoved: 1 });
channelMemberSchema.index({ userId: 1 });
channelMemberSchema.index({ channelId: 1, joinedAt: -1 });

const ChannelMember = mongoose.model("ChannelMember", channelMemberSchema);

export default ChannelMember;
