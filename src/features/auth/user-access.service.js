import { prisma } from "../../config/connectPostgres.js";

export const getUsersByIds = async (userIds) => {
  return prisma.user.findMany({
    where: {
      id: { in: userIds },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      username: true,
    },
  });
};

export const getUsersWithAvatarsByIds = async (userIds) => {
  return prisma.user.findMany({
    where: {
      id: { in: userIds },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      avatar_url: true,
    },
  });
};
