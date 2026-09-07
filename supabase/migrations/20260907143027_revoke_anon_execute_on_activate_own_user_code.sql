/*
  # Remove the anon EXECUTE grant on activate_own_user_code

  Project default privileges grant EXECUTE on new public functions to anon.
  The activation flip must only be callable by the signed-in owner of the
  freshly created profile, so revoke it explicitly.
*/

REVOKE EXECUTE ON FUNCTION public.activate_own_user_code(uuid) FROM anon;
