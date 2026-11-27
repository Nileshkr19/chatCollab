import "dotenv/config";
import mongoose from "mongoose";

// ==========================================
// CONFIGURATION
// ==========================================

const MONGODB_URI = process.env.MONGODB_URI;

// Mongoose model ChatPermission uses the collection
// name "chatpermissions" by default.
const COLLECTION_NAME = "chatpermissions";

const APPLY_MIGRATION = process.argv.includes("--apply");

// ==========================================
// LEGACY TO NESTED PERMISSION MAPPING
// ==========================================

const PERMISSION_MAPPING = {
  messages: {
    send: "canSendMessages",
    editOwn: "canEditMessages",
    editAll: "canEditAllMessages",
    deleteOwn: "canDeleteMessages",
    deleteAll: "canDeleteAllMessages",
    pin: "canPinMessages",
  },

  attachments: {
    deleteOwn: "canDeleteAttachments",
    deleteAll: "canDeleteAllAttachments",
  },

  channels: {
    create: "canCreateChannels",
    edit: "canEditChannels",
    delete: "canDeleteChannels",
    archive: "canArchiveChannels",
  },

  members: {
    invite: "canInviteMembers",
    remove: "canRemoveMembers",
    manageRoles: "canManageRoles",
  },

  moderation: {
    mute: "canMuteUsers",
    ban: "canBanUsers",
  },

  reactions: {
    add: "canAddReactions",
    removeOwn: "canRemoveReactions",
    removeAll: "canRemoveAllReactions",
  },

  threads: {
    create: "canCreateThreads",
    reply: "canReplyInThreads",
  },
};

const LEGACY_KEYS = Object.values(PERMISSION_MAPPING).flatMap((group) =>
  Object.values(group),
);

const NESTED_GROUPS = Object.keys(PERMISSION_MAPPING);

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const hasNestedPermissions = (permissions) =>
  NESTED_GROUPS.some((group) => Object.hasOwn(permissions, group));

const hasCompleteNestedPermissions = (permissions) =>
  NESTED_GROUPS.every((group) => isPlainObject(permissions[group]));

const hasLegacyPermissions = (permissions) =>
  LEGACY_KEYS.some((key) => Object.hasOwn(permissions, key));

const buildNestedPermissions = (legacyPermissions, documentId) => {
  const nestedPermissions = {};

  for (const [group, mappings] of Object.entries(PERMISSION_MAPPING)) {
    nestedPermissions[group] = {};

    for (const [newKey, oldKey] of Object.entries(mappings)) {
      const value = legacyPermissions[oldKey];

      if (typeof value !== "boolean") {
        throw new Error(
          `Document ${documentId}: Missing or invalid value for ${oldKey}`,
        );
      }

      nestedPermissions[group][newKey] = value;
    }
  }

  return nestedPermissions;
};

// ==========================================
// MAIN MIGRATION
// ==========================================

const migrateChatPermissions = async () => {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from your environment");
  }

  console.log("\n====================================");
  console.log(" CHAT PERMISSIONS MIGRATION");
  console.log("====================================");

  console.log(`Mode: ${APPLY_MIGRATION ? "APPLY CHANGES" : "DRY RUN"}`);

  await mongoose.connect(MONGODB_URI);

  console.log("Connected to MongoDB successfully.");

  const collection = mongoose.connection.collection(COLLECTION_NAME);

  const documents = await collection.find({}).toArray();

  console.log(`Found ${documents.length} permission documents.\n`);

  let migrated = 0;
  let alreadyMigrated = 0;
  let failed = 0;

  for (const document of documents) {
    try {
      const permissions = document.permissions;

      if (!isPlainObject(permissions)) {
        throw new Error(`Document ${document._id}: Invalid permissions object`);
      }

      const nestedExists = hasNestedPermissions(permissions);
      const legacyExists = hasLegacyPermissions(permissions);

      // Already migrated
      if (hasCompleteNestedPermissions(permissions) && !legacyExists) {
        alreadyMigrated++;
        console.log(`[SKIP] ${document._id}: Already migrated`);
        continue;
      }

      // Partial or mixed document needs manual inspection
      if (nestedExists || !legacyExists) {
        throw new Error(
          `Document ${document._id}: Mixed or incomplete permission structure`,
        );
      }

      // Convert legacy permissions
      const nestedPermissions = buildNestedPermissions(
        permissions,
        document._id,
      );

      console.log(`[READY] ${document._id} (${document.role})`);

      if (!APPLY_MIGRATION) {
        console.log(JSON.stringify(nestedPermissions, null, 2));

        migrated++;
        continue;
      }

      // Remove old flat fields
      const unsetFields = {};

      for (const key of LEGACY_KEYS) {
        unsetFields[`permissions.${key}`] = "";
      }

      // Update only the permissions field.
      // Existing document identity and metadata remain untouched.
      const result = await collection.updateOne(
        {
          _id: document._id,
          permissions,
        },
        {
          $set: {
            permissions: nestedPermissions,
          },
          $unset: unsetFields,
        },
      );

      if (result.modifiedCount !== 1) {
        throw new Error(
          `Document ${document._id}: Update failed or document changed concurrently`,
        );
      }

      migrated++;
      console.log(`[SUCCESS] ${document._id} migrated`);
    } catch (error) {
      failed++;

      console.error(`[FAILED] ${document._id}: ${error.message}`);
    }
  }

  console.log("\n====================================");
  console.log(" MIGRATION SUMMARY");
  console.log("====================================");

  console.log(`Total documents: ${documents.length}`);
  console.log(`Migrated / ready: ${migrated}`);
  console.log(`Already migrated: ${alreadyMigrated}`);
  console.log(`Failed: ${failed}`);

  if (!APPLY_MIGRATION) {
    console.log("\nDRY RUN ONLY: No database records were changed.");
    console.log("Run with --apply to perform the migration.");
  } else {
    console.log("\nMigration execution completed.");
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
};

// ==========================================
// EXECUTION
// ==========================================

try {
  await migrateChatPermissions();
} catch (error) {
  console.error("\nMigration failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
