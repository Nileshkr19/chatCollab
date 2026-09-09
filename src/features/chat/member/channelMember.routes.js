import express from "express";
import {
  checkChannelMembership,
  checkWorkspaceMembership,
  isChannelAdminOrManager,
  checkChannelNotArchived,
  checkChannelNotRemoved,
} from "../chat.middleware.js";
import { validate } from "@middleware/validate.middleware.js";
import {
  addChannelMemberController,
  removeChannelMemberController,
  updateChannelMemberRoleController,
  transferChannelOwnershipController,
  leaveChannelController,
} from "./channelMember.controller.js";
import {
  addChannelMemberSchema,
  removeChannelMemberSchema,
  updateChannelMemberRoleSchema,
  transferChannelOwnershipSchema,
} from "./channelMember.validation.js";

const router = express.Router({ mergeParams: true });

router.post(
  "/",
  checkWorkspaceMembership,
  checkChannelNotRemoved,
  checkChannelNotArchived,
  checkChannelMembership,
  isChannelAdminOrManager,
  validate(addChannelMemberSchema),
  addChannelMemberController,
);

router.delete(
  "/:channelMemberId",
  checkWorkspaceMembership,
  checkChannelNotRemoved,
  checkChannelNotArchived,
  checkChannelMembership,
  isChannelAdminOrManager,
  validate(removeChannelMemberSchema),
  removeChannelMemberController,
);

router.patch(
  "/:channelMemberId/role",
  checkWorkspaceMembership,
  checkChannelNotRemoved,
  checkChannelNotArchived,
  checkChannelMembership,
  isChannelAdminOrManager,
  validate(updateChannelMemberRoleSchema),
  updateChannelMemberRoleController,
);

router.patch(
  "/transfer-ownership",
  checkWorkspaceMembership,
  checkChannelNotRemoved,
  checkChannelNotArchived,
  checkChannelMembership,
  isChannelAdminOrManager,
  validate(transferChannelOwnershipSchema),
  transferChannelOwnershipController,
);

router.post(
  "/:channelMemberId/leave",
  checkWorkspaceMembership,
  checkChannelNotRemoved,
  checkChannelNotArchived,
  checkChannelMembership,
  leaveChannelController,
);

export default router;
