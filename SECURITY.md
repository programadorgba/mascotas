# Seguridad de PetCare

PetCare trata datos personales y datos medicos veterinarios. La seguridad principal debe estar en Supabase, no solo en React.

## Medidas incluidas

- RLS activado en `profiles`, `vet_profiles`, `pets` y `medical_records`.
- Cada propietario solo accede a sus propias mascotas.
- Los veterinarios deben existir en `vet_profiles`.
- Los veterinarios solo acceden a mascotas con chip.
- Los registros medicos guardan siempre `vet_id = auth.uid()`.
- Las politicas veterinarias exigen MFA verificado con nivel `aal2`.

## Configuracion necesaria en Supabase

1. Activa confirmacion de email en Authentication.
2. Activa MFA/TOTP para las cuentas veterinarias.
3. Verifica manualmente a cada veterinario:

```sql
update public.vet_profiles
set verified = true
where license_number = 'NUMERO_COLEGIADO';
```

4. Usa un bucket privado para documentos medicos y entrega URLs firmadas.
5. No pongas service role keys en el frontend.

## Pendiente en la app

La base de datos ya exige `aal2` para el acceso veterinario a datos sensibles. Falta construir las pantallas de enrolamiento y verificacion MFA en React para que el veterinario pueda completar ese segundo factor desde la interfaz.
