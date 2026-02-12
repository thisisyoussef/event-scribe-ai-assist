-- Enable real-time replication for volunteers table
-- This allows real-time subscriptions to work for volunteer check-in updates
-- so that when one POC updates a volunteer's status, other POCs see it immediately

-- Add volunteers table to the supabase_realtime publication
-- This enables PostgreSQL logical replication for real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE volunteers;

COMMENT ON TABLE volunteers IS 'Real-time replication enabled for instant check-in status updates across all POCs';

