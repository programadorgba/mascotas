# Seguridad de PetCare

PetCare trata datos personales y datos medicos veterinarios. La seguridad principal debe estar en Supabase, no solo en React.

## Medidas incluidas

- RLS activado en `profiles`, `vet_profiles`, `pets` y `medical_records`.
- Cada propietario solo accede a sus propias mascotas.
- Los veterinarios deben existir en `vet_profiles`.
- Los veterinarios solo acceden a mascotas con chip.
- Los registros medicos guardan siempre `vet_id = auth.uid()`.
- Las politicas veterinarias exigen que el veterinario este verificado en `vet_profiles`.

## Configuracion necesaria en Supabase

1. Activa confirmacion de email en Authentication.
2. Verifica manualmente a cada veterinario:

```sql
update public.vet_profiles
set verified = true
where license_number = 'NUMERO_COLEGIADO';
```

3. Usa un bucket privado para documentos medicos y entrega URLs firmadas.
4. No pongas service role keys en el frontend.
