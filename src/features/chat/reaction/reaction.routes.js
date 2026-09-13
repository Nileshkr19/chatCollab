import express from "express";
import {
  addReactionController,
  removeReactionController,
  getReactionsForMessageController,
  getReactionsByEmojiController,
} from "./reaction.controller.js";

import {
  reactionMessageParamsSchema,
  reactionBodySchema,
  reactionQuerySchema,
  reactionEmojiParamsSchema,
} from "./reaction.validation.js";

import { validate } from "@middleware/validate.middleware.js";

const router = express.Router({ mergeParams: true });

router.post(
  "/",
  validate({
    params: reactionMessageParamsSchema,
    body: reactionBodySchema,
  }),
  addReactionController,
);

router.delete(
  "/",
  validate({
    params: reactionMessageParamsSchema,
    body: reactionBodySchema,
  }),
  removeReactionController,
);

router.get(
  "/",
  validate({
    params: reactionMessageParamsSchema,
  }),
  getReactionsForMessageController,
);

router.get(
  "/:emoji",
  validate({
    params: reactionEmojiParamsSchema,
  }),
  getReactionsByEmojiController,
);

export default router;
