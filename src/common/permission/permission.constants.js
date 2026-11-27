export const CHAT_ROLES = ["ADMIN", "MANAGER", "MEMBER"];

// Supported permission structure
export const CHAT_PERMISSION_GROUPS = {
  messages: ["send", "editOwn", "editAll", "deleteOwn", "deleteAll", "pin"],
  attachments: ["deleteOwn", "deleteAll"],
  channels: ["create", "edit", "delete", "archive"],
  members: ["invite", "remove", "manageRoles"],
  moderation: ["mute", "ban"],
  reactions: ["add", "removeOwn", "removeAll"],
  threads: ["create", "reply"],
};

// Default permissions by role
export const DEFAULT_PERMISSIONS = {
  ADMIN: {
    messages: {
      send: true,
      editOwn: true,
      editAll: true,
      deleteOwn: true,
      deleteAll: true,
      pin:true,
    },
    attachments: {
      deleteOwn: true,
      deleteAll: true,
    },
    channels: {
      create: true,
      edit: true,
      delete: true,
      archive: true,
    },
    members: {
      invite: true,
      remove: true,
      manageRoles: true,
    },
    moderation: {
      mute: true,
      ban: true,
    },
    reactions: {
      add: true,
      removeOwn: true,
      removeAll: true,
    },
    threads: {
      create: true,
      reply: true,
    },
  },

  MANAGER: {
    messages: {
      send: true,
      editOwn: true,
      editAll: false,
      deleteOwn: true,
      deleteAll: false,
      pin:true,
    },
    attachments: {
      deleteOwn: true,
      deleteAll: false,
    },
    channels: {
      create: true,
      edit: true,
      delete: false,
      archive: true,
    },
    members: {
      invite: true,
      remove: true,
      manageRoles: false,
    },
    moderation: {
      mute: true,
      ban: false,
    },
    reactions: {
      add: true,
      removeOwn: true,
      removeAll: false,
    },
    threads: {
      create: true,
      reply: true,
    },
  },

  MEMBER: {
    messages: {
      send: true,
      editOwn: true,
      editAll: false,
      deleteOwn: true,
      deleteAll: false,
      pin:false
    },
    attachments: {
      deleteOwn: true,
      deleteAll: false,
    },
    channels: {
      create: false,
      edit: false,
      delete: false,
      archive: false,
    },
    members: {
      invite: false,
      remove: false,
      manageRoles: false,
    },
    moderation: {
      mute: false,
      ban: false,
    },
    reactions: {
      add: true,
      removeOwn: true,
      removeAll: false,
    },
    threads: {
      create: true,
      reply: true,
    },
  },
};
