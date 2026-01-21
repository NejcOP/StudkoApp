-- Update existing profiles with empty or default names to use auth metadata
update public.profiles
set full_name = coalesce(
  (select raw_user_meta_data->>'full_name' 
   from auth.users 
   where auth.users.id = profiles.id),
  'Uporabnik'
)
where full_name is null 
   or full_name = '' 
   or full_name = 'User'
   or full_name = 'Študent';
