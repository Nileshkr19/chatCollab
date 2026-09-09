import mongoose from "mongoose";

const chatPermissionSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["ADMIN", "MANAGER", "MEMBER"],
      required: true,
    },
    description: {
      type: String,
      default: null,
      required: false,
    },
    permissions: {
      // Message permissions
      canSendMessages: {
        type: Boolean,
        default: true,
      },
      canEditMessages: {
        type: Boolean,
        default: false,
      },
      canEditAllMessages: {
        type: Boolean,
        default: false,
      },
      canDeleteMessages: {
        type: Boolean,
        default: false,
      },
      canDeleteAllMessages: {
        type: Boolean,
        default: false,
      },

      // Channel permissions
      canCreateChannels: {
        type: Boolean,
        default: false,
      },
      canEditChannels: {
        type: Boolean,
        default: false,
      },
      canDeleteChannels: {
        type: Boolean,
        default: false,
      },
      canArchiveChannels: {
        type: Boolean,
        default: false,
      },

      // Member management
      canInviteMembers: {
        type: Boolean,
        default: false,
      },
      canRemoveMembers: {
        type: Boolean,
        default: false,
      },
      canManageRoles: {
        type: Boolean,
        default: false,
      },

      // Moderation
      canMuteUsers: {
        type: Boolean,
        default: false,
      },
      canBanUsers: {
        type: Boolean,
        default: false,
      },
      canPinMessages: {
        type: Boolean,
        default: false,
      },

      // Reactions
      canAddReactions: {
        type: Boolean,
        default: true,
      },
      canRemoveReactions: {
        type: Boolean,
        default: false,
      },
      canRemoveAllReactions: {
        type: Boolean,
        default: false,
      },

      // Thread permissions
      canCreateThreads: {
        type: Boolean,
        default: true,
      },
      canReplyInThreads: {
        type: Boolean,
        default: true,
      },
    },
  },
  { timestamps: true },
);

chatPermissionSchema.index({ workspaceId: 1, role: 1 }, { unique: true });

const ChatPermission = mongoose.model("ChatPermission", chatPermissionSchema);

export default ChatPermission;
