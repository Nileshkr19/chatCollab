import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      trim: true,
      default: "",
    },
    type: {
      type: String,
      enum: ["TEXT", "FILE", "IMAGE", "VIDEO", "AUDIO"],
      default: "TEXT",
    },
    hasAttachments: {
      type: Boolean,
      default: false,
    },
    attachmentCount: {
      type: Number,
      default: 0,
    },
    reactionsCount: {
      type: Number,
      default: 0,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    replyCount: {
      type: Number,
      default: 0,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

messageSchema.index(
  { channelId: 1, createdAt: -1 },
  { partialFilterExpression: { isDeleted: false } },
);


messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ parentId: 1, deletedAt: 1, createdAt: -1 });
messageSchema.index({ channelId: 1, content: "text" });
messageSchema.index({ channelId: 1, createdAt: -1, _id: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
