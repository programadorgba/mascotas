# PetCare

Aplicacion React para gestionar la salud de mascotas con dos areas separadas:

- `owners`: usuarios propietarios de mascotas.
- `veterinarians`: veterinarios autorizados que consultan por numero de chip y registran datos medicos.
- `shared`: autenticacion, Supabase, componentes y estilos comunes.

## Arranque

```bash
pnpm install
pnpm dev
```

Copia `.env.example` a `.env.local` y rellena las variables de Supabase.

## Seguridad

El frontend nunca debe proteger datos medicos por si solo. La seguridad real esta en Supabase:

- Activar RLS en todas las tablas.
- Dueños solo leen y modifican sus mascotas.
- Veterinarios solo acceden si existen en `vet_profiles`.
- Escrituras medicas registran `vet_id = auth.uid()`.
- Documentos clinicos en bucket privado con URLs firmadas.

Ejecuta `supabase/schema.sql` en el SQL editor de Supabase.
