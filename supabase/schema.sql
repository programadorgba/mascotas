-- ============================================================
--  PetCare — Schema v2  (ejecutar en Supabase SQL Editor)
--  Borrar toda la BD anterior antes de ejecutar este fichero
-- ============================================================

begin;

-- ─── EXTENSIONES ─────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ─── TABLAS ──────────────────────────────────────────────────

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       text not null default 'owner'
             check (role in ('owner', 'vet')),
  created_at timestamptz not null default now()
);

create table public.vet_profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  license_number text not null unique,
  clinic_name    text not null,
  verified       boolean not null default false,
  created_at     timestamptz not null default now()
);

create table public.pets (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  animal_type       text not null
                    check (animal_type in ('Perro','Gato','Ave','Conejo','Reptil','Otro')),
  sex               text not null default 'No especificado'
                    check (sex in ('Macho','Hembra','No especificado')),
  breed             text,
  chip_number       text unique,
  photo_url         text,
  insurance_company text,
  policy_number     text,
  birth_date        date,
  allergies         text,
  color             text not null default '#0000B8',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.visits (
  id               uuid primary key default gen_random_uuid(),
  pet_id           uuid not null references public.pets(id) on delete cascade,
  created_by       uuid not null references auth.users(id),
  vet_id           uuid references auth.users(id),
  visited_at       date not null default current_date,
  status           text not null default 'pendiente'
                   check (status in ('pendiente','confirmada','completada','cancelada')),
  reason           text,
  examination      text,
  diagnosis        text,
  treatment_notes  text,
  weight_kg        numeric(6,2),
  height_cm        numeric(6,2),
  next_visit_date  date,
  signed_by        text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.visit_medications (
  id            uuid primary key default gen_random_uuid(),
  visit_id      uuid not null references public.visits(id) on delete cascade,
  pet_id        uuid not null references public.pets(id) on delete cascade,
  prescribed_by uuid not null references auth.users(id),
  name          text not null,
  dosage        text not null,
  frequency     text not null,
  start_date    date not null,
  end_date      date,
  with_food     boolean not null default false,
  fasting       boolean not null default false,
  active        boolean not null default true,
  notes         text,
  created_at    timestamptz not null default now()
);

create table public.visit_imaging (
  id          uuid primary key default gen_random_uuid(),
  visit_id    uuid not null references public.visits(id) on delete cascade,
  pet_id      uuid not null references public.pets(id) on delete cascade,
  vet_id      uuid not null references auth.users(id),
  study_type  text not null
              check (study_type in ('Radiografia','Ecografia','TAC','Resonancia','Otra')),
  image_path  text not null,
  report      text,
  taken_at    timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create table public.reminders (
  id         uuid primary key default gen_random_uuid(),
  pet_id     uuid not null references public.pets(id) on delete cascade,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  type       text not null
             check (type in ('vacuna','desparasitacion','medicamento','visita','otro')),
  title      text not null,
  notes      text,
  due_date   date not null,
  completed  boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── FUNCIONES ───────────────────────────────────────────────
-- Se crean DESPUÉS de las tablas porque las referencian

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_verified_vet()
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from public.vet_profiles
    where id = auth.uid() and verified = true
  );
$$;

create or replace function public.has_strong_auth()
returns boolean language sql stable as $$
  select coalesce(auth.jwt()->>'aal', '') = 'aal2';
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Usuario PetCare'),
    coalesce(new.raw_user_meta_data->>'role', 'owner')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.delete_current_user()
returns void language plpgsql security definer
set search_path = public, auth as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_current_user() from public;
grant execute on function public.delete_current_user() to authenticated;

-- ─── TRIGGERS ────────────────────────────────────────────────

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create trigger pets_updated_at
  before update on public.pets
  for each row execute procedure public.set_updated_at();

create trigger visits_updated_at
  before update on public.visits
  for each row execute procedure public.set_updated_at();

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────

alter table public.profiles         enable row level security;
alter table public.vet_profiles      enable row level security;
alter table public.pets              enable row level security;
alter table public.visits            enable row level security;
alter table public.visit_medications enable row level security;
alter table public.visit_imaging     enable row level security;
alter table public.reminders         enable row level security;

-- profiles
create policy "profiles_select_own"
on public.profiles for select to authenticated
using (id = auth.uid());

create policy "profiles_update_own"
on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

-- vet_profiles
create policy "vet_profiles_select_own_or_verified_vet"
on public.vet_profiles for select to authenticated
using (id = auth.uid() or public.is_verified_vet());

create policy "vet_profiles_update_own"
on public.vet_profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

-- pets
create policy "pets_owner_full_access"
on public.pets for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "pets_verified_vet_read"
on public.pets for select to authenticated
using (public.is_verified_vet() and chip_number is not null);

create policy "pets_verified_vet_update"
on public.pets for update to authenticated
using (public.is_verified_vet() and chip_number is not null)
with check (public.is_verified_vet());

-- visits
create policy "visits_owner_insert"
on public.visits for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.pets
    where pets.id = visits.pet_id
      and pets.owner_id = auth.uid()
  )
);

create policy "visits_owner_select"
on public.visits for select to authenticated
using (
  exists (
    select 1 from public.pets
    where pets.id = visits.pet_id
      and pets.owner_id = auth.uid()
  )
);

create policy "visits_vet_full_access"
on public.visits for all to authenticated
using (public.is_verified_vet())
with check (public.is_verified_vet());

-- visit_medications
create policy "visit_medications_owner_select"
on public.visit_medications for select to authenticated
using (
  exists (
    select 1 from public.pets
    where pets.id = visit_medications.pet_id
      and pets.owner_id = auth.uid()
  )
);

create policy "visit_medications_vet_full_access"
on public.visit_medications for all to authenticated
using (public.is_verified_vet())
with check (public.is_verified_vet());

-- visit_imaging
create policy "visit_imaging_owner_select"
on public.visit_imaging for select to authenticated
using (
  exists (
    select 1 from public.pets
    where pets.id = visit_imaging.pet_id
      and pets.owner_id = auth.uid()
  )
);

create policy "visit_imaging_vet_full_access"
on public.visit_imaging for all to authenticated
using (public.is_verified_vet())
with check (public.is_verified_vet());

-- reminders
create policy "reminders_owner_full_access"
on public.reminders for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- ─── ÍNDICES ─────────────────────────────────────────────────

create index pets_owner_id_idx              on public.pets(owner_id);
create index pets_chip_number_idx           on public.pets(chip_number);

create index visits_pet_id_idx              on public.visits(pet_id);
create index visits_visited_at_idx          on public.visits(visited_at);
create index visits_status_idx              on public.visits(status);
create index visits_vet_id_idx              on public.visits(vet_id);

create index visit_medications_visit_id_idx on public.visit_medications(visit_id);
create index visit_medications_pet_id_idx   on public.visit_medications(pet_id);
create index visit_medications_active_idx   on public.visit_medications(pet_id, active);

create index visit_imaging_visit_id_idx     on public.visit_imaging(visit_id);
create index visit_imaging_pet_id_idx       on public.visit_imaging(pet_id);

create index reminders_owner_id_idx         on public.reminders(owner_id);
create index reminders_pet_id_idx           on public.reminders(pet_id);
create index reminders_due_date_idx         on public.reminders(due_date);

-- ─── STORAGE ─────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pet-photos', 'pet-photos', false, 5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'diagnostic-imaging', 'diagnostic-imaging', false, 10485760,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Políticas pet-photos
drop policy if exists "pet_photos_owner_read"        on storage.objects;
drop policy if exists "pet_photos_verified_vet_read" on storage.objects;
drop policy if exists "pet_photos_owner_insert"      on storage.objects;
drop policy if exists "pet_photos_owner_update"      on storage.objects;

create policy "pet_photos_owner_read"
on storage.objects for select to authenticated
using (
  bucket_id = 'pet-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "pet_photos_verified_vet_read"
on storage.objects for select to authenticated
using (bucket_id = 'pet-photos' and public.is_verified_vet());

create policy "pet_photos_owner_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'pet-photos'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "pet_photos_owner_update"
on storage.objects for update to authenticated
using (bucket_id = 'pet-photos' and owner_id = auth.uid()::text)
with check (
  bucket_id = 'pet-photos'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Políticas diagnostic-imaging
drop policy if exists "diagnostic_imaging_owner_read"          on storage.objects;
drop policy if exists "diagnostic_imaging_verified_vet_read"   on storage.objects;
drop policy if exists "diagnostic_imaging_verified_vet_insert" on storage.objects;
drop policy if exists "diagnostic_imaging_verified_vet_update" on storage.objects;

create policy "diagnostic_imaging_owner_read"
on storage.objects for select to authenticated
using (
  bucket_id = 'diagnostic-imaging'
  and exists (
    select 1
    from public.visit_imaging
    join public.pets on pets.id = visit_imaging.pet_id
    where visit_imaging.image_path = name
      and pets.owner_id = auth.uid()
  )
);

create policy "diagnostic_imaging_verified_vet_read"
on storage.objects for select to authenticated
using (bucket_id = 'diagnostic-imaging' and public.is_verified_vet());

create policy "diagnostic_imaging_verified_vet_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'diagnostic-imaging'
  and public.is_verified_vet()
  and owner_id = auth.uid()::text
);

create policy "diagnostic_imaging_verified_vet_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'diagnostic-imaging'
  and public.is_verified_vet()
  and owner_id = auth.uid()::text
)
with check (
  bucket_id = 'diagnostic-imaging'
  and public.is_verified_vet()
  and owner_id = auth.uid()::text
);

-- ─── FIN ─────────────────────────────────────────────────────

commit;
