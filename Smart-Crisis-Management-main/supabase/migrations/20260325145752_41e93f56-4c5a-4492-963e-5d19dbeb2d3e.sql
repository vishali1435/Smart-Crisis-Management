CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'User'), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'citizen'));
  
  -- Auto-create volunteer_status row for volunteer signups (pending approval)
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'citizen') = 'volunteer' THEN
    INSERT INTO public.volunteer_status (user_id, status, approved)
    VALUES (NEW.id, 'available', false);
  END IF;
  
  RETURN NEW;
END;
$function$;