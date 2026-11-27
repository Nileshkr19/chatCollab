import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
      index: false,
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
      min: 0,
    },

    reactionsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    replyCount: {
      type: Number,
      default: 0,
      min: 0,
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
  {
    timestamps: true,
  },
);

// Active messages: channel pagination and cursor sorting
messageSchema.index(
  { channelId: 1, createdAt: -1, _id: -1 },
  {
    partialFilterExpression: {
      isDeleted: false,
    },
  },
);

// User's message history
messageSchema.index({
  senderId: 1,
  createdAt: -1,
});

// Thread replies
messageSchema.index({
  parentId: 1,
  deletedAt: 1,
  createdAt: -1,
});

// Full-text message search
messageSchema.index({
  channelId: 1,
  content: "text",
});

const Message = mongoose.model("Message", messageSchema);

export default Message;
