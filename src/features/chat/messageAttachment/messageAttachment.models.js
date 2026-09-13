import mongoose from "mongoose";

const messageAttachmentSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
    },
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
    },
    workspaceId: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    key: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT", "OTHER"],
      default: "OTHER",
    },
    thumbnailUrl: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedBy: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

messageAttachmentSchema.index({ messageId: 1 });
messageAttachmentSchema.index({ channelId: 1 });
messageAttachmentSchema.index({ workspaceId: 1 });
messageAttachmentSchema.index({ uploadedBy: 1 });
messageAttachmentSchema.index({ expiresAt: 1 });

const MessageAttachment = mongoose.model(
  "MessageAttachment",
  messageAttachmentSchema,
);

export default MessageAttachment;
