-- T3chCollab Phase 6
-- Files and media metadata


-- =========================================================
-- FILES
-- =========================================================

CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  channel_id UUID NOT NULL
    REFERENCES channels(id)
    ON DELETE CASCADE,

  user_id UUID NOT NULL
    REFERENCES profiles(user_id)
    ON DELETE CASCADE,

  filename TEXT NOT NULL,

  storage_path TEXT NOT NULL,

  file_size BIGINT NOT NULL
    CHECK (file_size >= 0),

  mime_type TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS files_channel_id_idx
ON files(channel_id);

CREATE INDEX IF NOT EXISTS files_user_id_idx
ON files(user_id);

CREATE INDEX IF NOT EXISTS files_created_at_idx
ON files(created_at);


-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

ALTER TABLE files ENABLE ROW LEVEL SECURITY;


-- =========================================================
-- HELPER FUNCTION
-- =========================================================

-- Checks whether the current user belongs to the room
-- containing the channel.

CREATE OR REPLACE FUNCTION is_channel_member(
  target_channel_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM channels
    INNER JOIN room_members
      ON room_members.room_id = channels.room_id
    WHERE channels.id = target_channel_id
      AND room_members.user_id = auth.uid()
  );
$$;


-- =========================================================
-- FILE POLICIES
-- =========================================================


-- Room members can see file metadata.

CREATE POLICY "Members can read files"
ON files
FOR SELECT
USING (
  is_channel_member(channel_id)
);


-- Authenticated room members can upload files.

CREATE POLICY "Members can upload files"
ON files
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND is_channel_member(channel_id)
);


-- Users can update their own file records.

CREATE POLICY "Users can update own files"
ON files
FOR UPDATE
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);


-- Users can delete their own files.

CREATE POLICY "Users can delete own files"
ON files
FOR DELETE
USING (
  user_id = auth.uid()
);


-- =========================================================
-- SUPABASE STORAGE
-- =========================================================

-- IMPORTANT:
-- Create a Storage bucket named:
--
--     files
--
-- from the Supabase Dashboard.
--
-- The bucket should remain PRIVATE.
--
-- This SQL migration intentionally does NOT create the
-- Storage bucket because Storage bucket creation is normally
-- handled through Supabase Storage configuration.


-- =========================================================
-- STORAGE RLS
-- =========================================================

-- Storage objects are stored using paths such as:
--
--     channel-id/user-id/filename
--
-- Storage access policies should be configured separately
-- after the "files" bucket has been created.


-- =========================================================
-- COMPLETE
-- =========================================================

-- Phase 6 now provides:
--
-- ✓ File metadata
-- ✓ Channel association
-- ✓ Uploader tracking
-- ✓ File size
-- ✓ MIME type
-- ✓ Storage path
-- ✓ Upload timestamps
-- ✓ Room-member access control
-- ✓ Own-file deletion
-- ✓ Automatic cleanup when channels are deleted