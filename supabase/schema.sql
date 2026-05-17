create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'owner' check (role in ('owner', 'vet')),
  created_at timestamptz not null default now()
);

create table if not exists public.vet_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  license_number text not null unique,
  clinic_name text not null,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  animal_type text not null,
  breed text,
  chip_number text unique,
  photo_url text,
  insurance_company text,
  policy_number text,
  birth_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medical_records (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  vet_id uuid not null references auth.users(id),
  record_type text not null,
  weight_kg numeric(6,2),
  height_cm numeric(6,2),
  notes text,
  document_url text,
  recorded_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.vet_profiles enable row level security;
alter table public.pets enable row level security;
alter table public.medical_records enable row level security;

create or replace function public.is_verified_vet()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vet_profiles
    where id = auth.uid()
      and verified = true
  );
$$;

create or replace function public.has_strong_auth()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt()->>'aal', '') = 'aal2';
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from auth.users
  where id = auth.uid();
end;
$$;

revoke all on function public.delete_current_user() from public;
grant execute on function public.delete_current_user() to authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "vet_profiles_select_own_or_verified_vet" on public.vet_profiles;
create policy "vet_profiles_select_own_or_verified_vet"
on public.vet_profiles for select
to authenticated
using (id = auth.uid() or public.is_verified_vet());

drop policy if exists "pets_owner_full_access" on public.pets;
create policy "pets_owner_full_access"
on public.pets for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "pets_verified_vet_read_by_chip" on public.pets;
create policy "pets_verified_vet_read_by_chip"
on public.pets for select
to authenticated
using (
  public.is_verified_vet()
  and chip_number is not null
);

drop policy if exists "medical_records_owner_read" on public.medical_records;
create policy "medical_records_owner_read"
on public.medical_records for select
to authenticated
using (
  exists (
    select 1 from public.pets
    where pets.id = medical_records.pet_id
      and pets.owner_id = auth.uid()
  )
);

drop policy if exists "medical_records_verified_vet_read" on public.medical_records;
create policy "medical_records_verified_vet_read"
on public.medical_records for select
to authenticated
using (
  public.is_verified_vet()
);

drop policy if exists "medical_records_verified_vet_insert" on public.medical_records;
create policy "medical_records_verified_vet_insert"
on public.medical_records for insert
to authenticated
with check (
  public.is_verified_vet()
  and vet_id = auth.uid()
  and exists (
    select 1 from public.pets
    where pets.id = medical_records.pet_id
      and pets.chip_number is not null
  )
);

create index if not exists pets_owner_id_idx on public.pets(owner_id);
create index if not exists pets_chip_number_idx on public.pets(chip_number);
create index if not exists medical_records_pet_id_idx on public.medical_records(pet_id);
create index if not exists medical_records_vet_id_idx on public.medical_records(vet_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pet-photos',
  'pet-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "pet_photos_owner_read" on storage.objects;
create policy "pet_photos_owner_read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'pet-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "pet_photos_verified_vet_read" on storage.objects;
create policy "pet_photos_verified_vet_read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'pet-photos'
  and public.is_verified_vet()
);

drop policy if exists "pet_photos_owner_insert" on storage.objects;
create policy "pet_photos_owner_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'pet-photos'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "pet_photos_owner_update" on storage.objects;
create policy "pet_photos_owner_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'pet-photos'
  and owner_id = auth.uid()::text
)
with check (
  bucket_id = 'pet-photos'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = auth.uid()::text
);
