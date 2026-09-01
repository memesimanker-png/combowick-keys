INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role FROM auth.users u
WHERE u.email = 'killerkanhai861@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;