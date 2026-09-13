import validate from "@middleware/validate.middleware.js";
import express from "express";
import {
  createChannelInvitationController,
  acceptChannelInvitationController,
  rejectChannelInvitationController,
  revokeChannelInvitationController,
  getUserInvitationsController,
} from "./channelInvitation.controller.js";
import {
  createChannelInvitationBodySchema,
  createChannelInvitationParamsSchema,
  invitationParamsSchema,
  invitationQuerySchema,
} from "./channelInvitation.validation.js";

const router = express.Router({ mergeParams: true });

router.post(
  "/",
  validate({
    params: createChannelInvitationParamsSchema,
    body: createChannelInvitationBodySchema,
  }),
  createChannelInvitationController,
);

router.post(
  "/:invitationId/accept",
  validate({
    params: invitationParamsSchema,
  }),
  acceptChannelInvitationController,
);

router.post(
  "/:invitationId/reject",
  validate({
    params: invitationParamsSchema,
  }),
  rejectChannelInvitationController,
);

router.post(
  "/:invitationId/revoke",
  validate({
    params: invitationParamsSchema,
  }),
  revokeChannelInvitationController,
);

router.get(
  "/",
  validate({
    query: invitationQuerySchema,
  }),
  getUserInvitationsController,
);

export default router;
