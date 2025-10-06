-- Add current_material_index to track which material we're currently assigning
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS current_material_index INTEGER DEFAULT 0;
