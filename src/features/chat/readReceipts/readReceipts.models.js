import mongoose from "mongoose";

const readReceiptSchema = new mongoose.Schema(
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
    lastReadMessageId: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Message",
      default: null,
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
    },
  },
  { timestamps: true },
);

readReceiptSchema.index({ channelId: 1, userId: 1 }, { unique: true });

const ReadReceipt = mongoose.model("ReadReceipt", readReceiptSchema);

export default ReadReceipt;
