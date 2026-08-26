/*
# Add increment_profile_views RPC

1. New functions
- `increment_profile_views(uuid)`: atomically increments `profile_views` for a public profile. Callable by anon so anonymous profile views can be counted without granting UPDATE on the table.

2. Security
- SECURITY DEFINER, executes with the function owner's privileges.
- Only increments rows where `is_public = true`, so private profiles cannot be probed.
- Fixed search_path to prevent hijacking.
*/

CREATE OR REPLACE FUNCTION public.increment_profile_views(profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET profile_views = profile_views + 1
  WHERE id = profile_id AND is_public = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_profile_views(uuid) TO anon, authenticated;
