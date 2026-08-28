-- T3chCollab Phase 3
-- Rooms, room membership, and channels


-- =========================================================
-- ROOMS
-- =========================================================

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL,
  description TEXT,

  owner_id UUID NOT NULL
    REFERENCES profiles(user_id)
    ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =========================================================
-- ROOM MEMBERS
-- =========================================================

CREATE TABLE IF NOT EXISTS room_members (
  room_id UUID NOT NULL
    REFERENCES rooms(id)
    ON DELETE CASCADE,

  user_id UUID NOT NULL
    REFERENCES profiles(user_id)
    ON DELETE CASCADE,

  joined_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (room_id, user_id)
);


-- =========================================================
-- CHANNELS
-- =========================================================

CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  room_id UUID NOT NULL
    REFERENCES rooms(id)
    ON DELETE CASCADE,

  name TEXT NOT NULL,

  type TEXT NOT NULL DEFAULT 'text'
    CHECK (type IN ('text')),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (room_id, name)
);


-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;


-- =========================================================
-- HELPER FUNCTION
-- =========================================================
-- Checks whether the currently authenticated user belongs
-- to a room.
--
-- SECURITY DEFINER prevents RLS from recursively checking
-- room_members while this function is being used by an
-- RLS policy.

CREATE OR REPLACE FUNCTION is_room_member(target_room_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM room_members
    WHERE room_id = target_room_id
      AND user_id = auth.uid()
  );
$$;


-- =========================================================
-- ROOM POLICIES
-- =========================================================

-- Members can see rooms they belong to.
CREATE POLICY "Members can read rooms"
ON rooms
FOR SELECT
USING (
  is_room_member(id)
);


-- Any authenticated user can create a room,
-- but they must become its owner.
CREATE POLICY "Users can create rooms"
ON rooms
FOR INSERT
WITH CHECK (
  auth.uid() = owner_id
);


-- Owners can update their own rooms.
CREATE POLICY "Owners can update rooms"
ON rooms
FOR UPDATE
USING (
  auth.uid() = owner_id
)
WITH CHECK (
  auth.uid() = owner_id
);


-- Owners can delete their own rooms.
CREATE POLICY "Owners can delete rooms"
ON rooms
FOR DELETE
USING (
  auth.uid() = owner_id
);


-- =========================================================
-- ROOM MEMBER POLICIES
-- =========================================================

-- Users can see membership records for rooms they belong to.
CREATE POLICY "Members can read room members"
ON room_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR is_room_member(room_id)
);


-- Users can add themselves to a room.
CREATE POLICY "Users can join rooms"
ON room_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
);


-- Users can leave a room themselves.
CREATE POLICY "Users can leave rooms"
ON room_members
FOR DELETE
USING (
  user_id = auth.uid()
);


-- =========================================================
-- CHANNEL POLICIES
-- =========================================================

-- Room members can see channels in their rooms.
CREATE POLICY "Members can read channels"
ON channels
FOR SELECT
USING (
  is_room_member(room_id)
);


-- Room owners can create channels.
CREATE POLICY "Owners can create channels"
ON channels
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM rooms
    WHERE rooms.id = channels.room_id
      AND rooms.owner_id = auth.uid()
  )
);


-- Room owners can update channels.
CREATE POLICY "Owners can update channels"
ON channels
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM rooms
    WHERE rooms.id = channels.room_id
      AND rooms.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM rooms
    WHERE rooms.id = channels.room_id
      AND rooms.owner_id = auth.uid()
  )
);


-- Room owners can delete channels.
CREATE POLICY "Owners can delete channels"
ON channels
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM rooms
    WHERE rooms.id = channels.room_id
      AND rooms.owner_id = auth.uid()
  )
);


-- =========================================================
-- AUTOMATIC OWNER MEMBERSHIP
-- =========================================================
-- When a room is created, automatically add its owner
-- to room_members.

CREATE OR REPLACE FUNCTION add_room_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO room_members (room_id, user_id)
  VALUES (NEW.id, NEW.owner_id)
  ON CONFLICT (room_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;


DROP TRIGGER IF EXISTS on_room_created_add_owner
ON rooms;

CREATE TRIGGER on_room_created_add_owner
AFTER INSERT ON rooms
FOR EACH ROW
EXECUTE FUNCTION add_room_owner_as_member();