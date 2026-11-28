import mongoose from "mongoose";
import { WORKSPACE_ROLES } from "./permission.constants.js";

const permissionGroupOptions = { _id: false };

const workspaceChannelPermissionsSchema = new mongoose.Schema(
  {
    create: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
    archive: { type: Boolean, default: false },
  },
  permissionGroupOptions,
);

const workspaceMemberPermissionsSchema = new mongoose.Schema(
  {
    invite: { type: Boolean, default: false },
    remove: { type: Boolean, default: false },
    manageRoles: { type: Boolean, default: false },
  },
  permissionGroupOptions,
);

const workspacePermissionSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: String,
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: WORKSPACE_ROLES,
      required: true,
    },

    description: {
      type: String,
      default: null,
    },

    permissions: {
      channels: {
        type: workspaceChannelPermissionsSchema,
        required: true,
      },

      members: {
        type: workspaceMemberPermissionsSchema,
        required: true,
      },
    },
  },
  {
    timestamps: true,
  },
);

workspacePermissionSchema.index({ workspaceId: 1, role: 1 }, { unique: true });

const WorkspacePermission = mongoose.model(
  "WorkspacePermission",
  workspacePermissionSchema,
);

export default WorkspacePermission;
