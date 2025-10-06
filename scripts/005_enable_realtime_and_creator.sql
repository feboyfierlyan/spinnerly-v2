-- Add creator_session_id to track who created the room
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS creator_session_id TEXT;

-- Enable realtime for rooms table
ALTER TABLE rooms REPLICA IDENTITY FULL;

-- Enable realtime for spin_history table  
ALTER TABLE spin_history REPLICA IDENTITY FULL;

-- Note: The ALTER PUBLICATION command requires superuser privileges
-- If you get a permission error, you can enable realtime from the Supabase dashboard:
-- 1. Go to Database > Replication
-- 2. Enable replication for 'rooms' and 'spin_history' tables
