GRANT INSERT ON TABLE public.contact_messages TO anon;
GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE public.contact_messages TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE public.contact_messages TO service_role;