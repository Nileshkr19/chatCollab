import Channel from "@features/chat/channel/channel.models.js";
import ChannelMember from "@features/chat/member/channelMember.models.js";

export const canAccessChannel = async (userId, channelId) => {
  const [channel, membership] = await Promise.all([
    Channel.findOne({
      _id: channelId,
      isRemoved: false,
      isArchived: false,
    }).select("_id"),
    ChannelMember.exists({
      channelId,
      userId,
      isRemoved: false,
    }),
  ]);

  return Boolean(channel && membership);
};
