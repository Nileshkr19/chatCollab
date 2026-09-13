import mongoose from "mongoose";

const userPresenceSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: String,
      required: true,
    },
    userId: {
      type: String, 
      required: true,
  
    },
    status: {
      type: String,
      enum: ["online", "away", "offline"],
      default: "offline",
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    currentChannelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      default: null,
    },
  },
  { timestamps: true },
);

userPresenceSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
userPresenceSchema.index({ workspaceId: 1, status: 1 });
userPresenceSchema.index({ workspaceId: 1, currentChannelId: 1, status: 1 });
userPresenceSchema.index({ workspaceId: 1, lastActivityAt: 1 });

const UserPresence = mongoose.model("UserPresence", userPresenceSchema);

export default UserPresence;
