import { createClient } from "@supabase/supabase-js";
import logger from "@utils/logger";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  logger.error(
    "Supabase URL or Service Role Key is not defined in environment variables",
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = "attachments";

export const stroageProvider = {
  // Upload a file to Supabase Storage
  async upload(key, file, mimeType) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(key, file, {
        contentType: mimeType,
        upsert: false,
      });
    if (error) {
      logger.error(
        `Failed to upload file to Supabase Storage: ${error.message}`,
      );
      throw error;
    }
    logger.info(`File uploaded to Supabase Storage with key: ${key}`);
    return data;
  },

  getPublicUrl(key) {
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(key);
    return data.publicUrl;
  },

  // Delete a file from Supabase Storage
  async delete(key) {
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([key]);
    if (error) {
      logger.error(
        `Failed to delete file from Supabase Storage: ${error.message}`,
      );
      throw error;
    }
    logger.info(`File deleted from Supabase Storage with key: ${key}`);
  },
  // delete multiple files from Supabase Storage
  async deleteMany(keys) {
    const { error } = await supabase.storage.from(BUCKET_NAME).remove(keys);
    if (error) {
      logger.error(
        `Failed to delete files from Supabase Storage: ${error.message}`,
      );
      throw error;
    }
    logger.info(
      `Files deleted from Supabase Storage with keys: ${keys.join(", ")}`,
    );
  },
};
