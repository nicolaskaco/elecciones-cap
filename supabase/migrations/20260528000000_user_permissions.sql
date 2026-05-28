BEGIN;

-- user_permissions: stores pre-invite role/permission config for invited users.
-- A BEFORE INSERT trigger on perfiles reads from this table to set the correct
-- role when the invited user accepts and their perfil row is created.
CREATE TABLE public.user_permissions (
  id                   bigserial PRIMARY KEY,
  email                text NOT NULL UNIQUE,
  role                 text NOT NULL DEFAULT 'Voluntario'
                         CHECK (role IN ('Admin', 'Voluntario')),
  can_manage_electores boolean NOT NULL DEFAULT false,
  can_access_gastos    boolean NOT NULL DEFAULT false,
  can_access_lista     boolean NOT NULL DEFAULT false,
  can_access_eventos   boolean NOT NULL DEFAULT false,
  can_access_campanas  boolean NOT NULL DEFAULT false,
  invited_at           timestamptz NOT NULL DEFAULT now(),
  accepted_at          timestamptz,
  invited_by           uuid REFERENCES public.perfiles(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can read or write user_permissions
CREATE POLICY "user_permissions_admin_all"
  ON public.user_permissions FOR ALL
  USING (get_user_rol() = 'Admin')
  WITH CHECK (get_user_rol() = 'Admin');

-- Reuse the existing set_updated_at() function from the initial migration
CREATE TRIGGER user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- When a new perfil row is inserted, check user_permissions by email.
-- If a matching row exists, override NEW.rol with the stored role and
-- stamp accepted_at. Runs BEFORE INSERT so NEW.rol is set before commit.
CREATE OR REPLACE FUNCTION public.sync_role_from_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  perm_role text;
BEGIN
  SELECT role INTO perm_role
  FROM public.user_permissions
  WHERE email = NEW.email
  LIMIT 1;

  IF perm_role IS NOT NULL THEN
    NEW.rol = perm_role::user_rol;
    UPDATE public.user_permissions
    SET accepted_at = now()
    WHERE email = NEW.email AND accepted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_perfil_created_sync_role
  BEFORE INSERT ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_role_from_permissions();

COMMIT;
