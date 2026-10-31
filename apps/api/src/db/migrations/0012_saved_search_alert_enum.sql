-- Add saved_search_alert to notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'saved_search_alert';
