-- Add materials column to rooms table to store name-material pairs
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS materials TEXT[];

-- Add material column to spin_history to track which material was assigned
ALTER TABLE spin_history ADD COLUMN IF NOT EXISTS assigned_material TEXT;

-- Update the updated_at trigger to work with the new schema
-- (The trigger already exists from 001_create_tables.sql, no changes needed)
