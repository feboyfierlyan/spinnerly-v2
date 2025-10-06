-- Add room_name column to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_name TEXT;
