import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    emoji: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

reactionSchema.index({ messageId: 1, userId: 1, emoji: 1 }, { unique: true });
reactionSchema.index({ messageId: 1 });

const Reaction = mongoose.model("Reaction", reactionSchema);

export default Reaction;
