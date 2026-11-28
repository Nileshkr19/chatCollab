import mongoose from "mongoose";
import { CHAT_ROLES } from "./permission.constants.js";

const permissionGroupOptions = { _id: false };

// Message permissions
const messagePermissionsSchema = new mongoose.Schema(
  {
    send: { type: Boolean, default: false },
    editOwn: { type: Boolean, default: false },
    editAll: { type: Boolean, default: false },
    deleteOwn: { type: Boolean, default: false },
    deleteAll: { type: Boolean, default: false },
    pin: { type: Boolean, default: false },
  },
  permissionGroupOptions,
);

// Attachment permissions
const attachmentPermissionsSchema = new mongoose.Schema(
  {
    deleteOwn: { type: Boolean, default: false },
    deleteAll: { type: Boolean, default: false },
  },
  permissionGroupOptions,
);


// Member permissions
const channelMemberPermissionsSchema = new mongoose.Schema(
  {
    invite: { type: Boolean, default: false },
    remove: { type: Boolean, default: false },
    manageRoles: { type: Boolean, default: false },
  },
  permissionGroupOptions,
);

// Moderation permissions
const moderationPermissionsSchema = new mongoose.Schema(
  {
    mute: { type: Boolean, default: false },
    ban: { type: Boolean, default: false },
  },
  permissionGroupOptions,
);

// Reaction permissions
const reactionPermissionsSchema = new mongoose.Schema(
  {
    add: { type: Boolean, default: false },
    removeOwn: { type: Boolean, default: false },
    removeAll: { type: Boolean, default: false },
  },
  permissionGroupOptions,
);

// Thread permissions
const threadPermissionsSchema = new mongoose.Schema(
  {
    create: { type: Boolean, default: false },
    reply: { type: Boolean, default: false },
  },
  permissionGroupOptions,
);

const chatPermissionSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: String,
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: CHAT_ROLES,
      required: true,
    },

    description: {
      type: String,
      default: null,
    },

    permissions: {
      messages: {
        type: messagePermissionsSchema,
        required: true,
      },

      attachments: {
        type: attachmentPermissionsSchema,
        required: true,
      },


      channelMembers: {
        type: channelMemberPermissionsSchema,
        required: true,
      },

      moderation: {
        type: moderationPermissionsSchema,
        required: true,
      },

      reactions: {
        type: reactionPermissionsSchema,
        required: true,
      },

      threads: {
        type: threadPermissionsSchema,
        required: true,
      },
    },
  },
  {
    timestamps: true,
  },
);

chatPermissionSchema.index({ workspaceId: 1, role: 1 }, { unique: true });

const ChatPermission = mongoose.model("ChatPermission", chatPermissionSchema);

export default ChatPermission;
