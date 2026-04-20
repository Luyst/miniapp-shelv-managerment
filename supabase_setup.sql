-- Create Shelves table
CREATE TABLE IF NOT EXISTS shelves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: The inventory_items table is likely an existing table in your main app.
-- This mini-app expects it to have the following structure:
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    serial_number TEXT,
    shelf_code TEXT REFERENCES shelves(code),
    quantity NUMERIC DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_items_inventory_code ON inventory_items(inventory_code);
CREATE INDEX IF NOT EXISTS idx_items_shelf_code ON inventory_items(shelf_code);
CREATE INDEX IF NOT EXISTS idx_shelves_code ON shelves(code);
