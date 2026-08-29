-- T3chCollab
-- Robust room creation and invite-code support.
--
-- This migration is intentionally added after 004 because some deployed
-- databases may already have applied the empty 004_room_invites.sql file.


-- =========================================================
-- INVITE CODES
-- =========================================================

CREATE OR REPLACE FUNCTION generate_room_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  index INTEGER;
BEGIN
  FOR index IN 1..8 LOOP
    code := code || substr(
      alphabet,
      floor(random() * length(alphabet) + 1)::INTEGER,
      1
    );
  END LOOP;

  RETURN code;
END;
$$;

ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS invite_code TEXT;

UPDATE rooms
SET invite_code = generate_room_invite_code()
WHERE invite_code IS NULL;

ALTER TABLE rooms
ALTER COLUMN invite_code SET DEFAULT generate_room_invite_code();

ALTER TABLE rooms
ALTER COLUMN invite_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS rooms_invite_code_unique_idx
ON rooms(invite_code);


-- =========================================================
-- LOOK UP ROOM BY INVITE CODE
-- =========================================================

CREATE OR REPLACE FUNCTION get_room_by_invite_code(code TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  owner_id UUID,
  invite_code TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rooms.id,
    rooms.name,
    rooms.description,
    rooms.owner_id,
    rooms.invite_code,
    rooms.created_at
  FROM rooms
  WHERE rooms.invite_code = upper(trim(code))
    AND auth.uid() IS NOT NULL
  LIMIT 1;
$$;


-- =========================================================
-- CREATE ROOM SAFELY
-- =========================================================

CREATE OR REPLACE FUNCTION create_room_with_owner(
  room_name TEXT,
  room_description TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  owner_id UUID,
  invite_code TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_room rooms%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be logged in.';
  END IF;

  IF trim(coalesce(room_name, '')) = '' THEN
    RAISE EXCEPTION 'Room name is required.';
  END IF;

  INSERT INTO rooms (
    name,
    description,
    owner_id
  )
  VALUES (
    trim(room_name),
    nullif(trim(coalesce(room_description, '')), ''),
    auth.uid()
  )
  RETURNING * INTO inserted_room;

  INSERT INTO room_members (
    room_id,
    user_id
  )
  VALUES (
    inserted_room.id,
    auth.uid()
  )
  ON CONFLICT (room_id, user_id) DO NOTHING;

  RETURN QUERY
  SELECT
    inserted_room.id,
    inserted_room.name,
    inserted_room.description,
    inserted_room.owner_id,
    inserted_room.invite_code,
    inserted_room.created_at;
END;
$$;


-- =========================================================
-- EXECUTE PERMISSIONS
-- =========================================================

GRANT EXECUTE ON FUNCTION generate_room_invite_code()
TO authenticated;

GRANT EXECUTE ON FUNCTION get_room_by_invite_code(TEXT)
TO authenticated;

GRANT EXECUTE ON FUNCTION create_room_with_owner(TEXT, TEXT)
TO authenticated;
