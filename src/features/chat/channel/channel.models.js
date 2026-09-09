import mongoose from "mongoose";

const lastMessageSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    content: {
      type: String,
      default: "",
    },
    senderId: {
      type: String,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const channelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minLength: 3,
      maxLength: 100,
      trim: true,
    },
    description: {
      type: String,
      maxLength: 500,
      trim: true,
      default: "",
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      enum: ["GROUP", "DM"],
      default: "GROUP",
    },
    workspaceId: {
      type: String,
      required: true,
    },
    createdBy: {
      type: String,
      required: true,
    },
    removedBy: {
      type: String,
      default: null,
    },
    pinnedMessages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
    ],
    lastMessage: {
      type: lastMessageSchema,
      default: null,
    },
    memberCount: {
      type: Number,
      default: 0,
    },
    topic: {
      type: String,
      maxLength: 200,
      trim: true,
      default: null,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    isRemoved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

channelSchema.index({ workspaceId: 1 });
channelSchema.index({ workspaceId: 1, name: 1, type: 1 });
channelSchema.index({ workspaceId: 1, lastMessage: 1 });
channelSchema.index({ workspaceId: 1, memberCount: -1 });

const Channel = mongoose.model("Channel", channelSchema);

export default Channel;
