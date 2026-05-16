Primero se registra. Después tú decides si ese usuario es veterinario autorizado.

  Ejemplo completo:

  1. El veterinario se registra

  El veterinario entra en la app y crea una cuenta con:

  email: vet@clinica.com
  contraseña: ********

  En ese momento Supabase crea un usuario en Authentication > Users.

  Ese usuario tendrá un User UID, por ejemplo:

  6b83d5c2-7a4f-4d90-91a1-bef25b4d12c7

  Pero todavía no es veterinario autorizado.

  2. Tú lo autorizas en Supabase

  Vas a Supabase:

  Authentication → Users

  Buscas el usuario vet@clinica.com y copias su User UID.

  Después vas a SQL Editor y ejecutas solo este bloque, cambiando el `id` por el User UID real:

```sql
insert into public.vet_profiles (
  id,
  license_number,
  clinic_name,
  verified
)
values (
  '6b83d5c2-7a4f-4d90-91a1-bef25b4d12c7',
  'COL-12345',
  'Clinica Veterinaria San Anton',
  true
);
```

  3. Qué significa eso

  Esta fila en vet_profiles dice:

  El usuario con este ID sí es veterinario.
  Tiene este número de colegiado.
  Trabaja en esta clínica.
  Está verificado.

  Desde ese momento, cuando ese usuario inicia sesión, la app ve que existe en vet_profiles y lo trata
  como veterinario.

  4. Resultado en la app

  Si entra un usuario normal:

  No existe en vet_profiles

  Entonces va a:

  /m​​ascotas

  Si entra un veterinario autorizado:

  Sí existe en vet_profiles
  verified = true

  Entonces va a:

  /veterinario

  Ahí puede introducir o leer un número de chip.

  Ejemplo real sencillo

  Usuario propietario:

  email: maria@gmail.com
  auth.uid: aaa-111

  Tabla profiles:

  id: aaa-111
  role: owner

  No tiene fila en vet_profiles.

  Resultado:

  Maria solo ve sus mascotas.

  Veterinario:

  email: vet@clinica.com
  auth.uid: bbb-222

  Tabla profiles:

  id: bbb-222
  role: owner

  Pero además tiene esto en vet_profiles:

  id: bbb-222
  license_number: COL-12345
  clinic_name: Clinica San Anton
  verified: true

  Resultado:

  Ese usuario entra como veterinario.
  Puede buscar por chip.
  Puede crear registros médicos.

  La clave es esta:

  Registrarse crea una cuenta.
  Estar en vet_profiles da permiso veterinario.

  Así evitas que cualquiera se registre diciendo “soy veterinario” y pueda ver datos médicos.
