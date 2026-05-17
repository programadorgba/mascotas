# Plan: Depurar por qué no se ven las imágenes del bucket privado

## Problema
Las imágenes del bucket `pet-photos` no se ven después de hacer el bucket privado y añadir políticas de RLS para vets verificados.

## Análisis del código actual

### petPhotos.js
- `getStoragePath(photoUrl)`: Extrae el path del archivo de una URL completa o devuelve el path tal cual
- `createPetPhotoSignedUrl(photoUrl)`: Crea una signed URL con TTL de 3600s
- `addPetPhotoSignedUrls(pets)`: Añade `photoSignedUrl` a cada mascota

### Flujo actual
1. `photo_url` en la tabla `pets` se guarda como `{user_id}/{pet_id}.{ext}` (path relativo)
2. `getStoragePath` intenta parsearlo como URL, falla, y lo devuelve tal cual
3. `createSignedUrl` se llama con ese path relativo
4. Si falla, antes hacía fallback a `getPublicUrl` (ya eliminado)

## Posibles causas del problema

### 1. Políticas de RLS incorrectas
La política `pet_photos_owner_read` usa:
```sql
bucket_id = 'pet-photos' AND owner_id = auth.uid()::text
```
El `owner_id` en `storage.objects` debe coincidir con el `auth.uid()` del usuario logueado.

### 2. Path del archivo incorrecto
Si `photo_url` se guarda como path relativo (`user_id/pet_id.jpg`), `getStoragePath` lo devuelve tal cual. Pero si se guardó como URL completa, la extracción podría fallar.

### 3. Usuario no autenticado
Las signed URLs requieren que el usuario esté autenticado para que `auth.uid()` funcione en las políticas de RLS.

## Plan de acción

### Paso 1: Añadir logging temporal
Añadir `console.log` en:
- `getStoragePath`: mostrar `photoUrl` recibido y `filePath` extraído
- `createPetPhotoSignedUrl`: mostrar `filePath`, resultado de `createSignedUrl`, y error si existe
- `addPetPhotoSignedUrls`: mostrar pets procesados y resultados

### Paso 2: Verificar en Supabase
- Ejecutar: `SELECT name, owner_id FROM storage.objects WHERE bucket_id = 'pet-photos' LIMIT 5;`
- Verificar que `owner_id` coincide con el `auth.uid()` del usuario logueado
- Verificar que las políticas existen y están activas

### Paso 3: Probar signed URL manualmente
En la consola del navegador:
```js
const { data, error } = await supabase.storage
  .from('pet-photos')
  .createSignedUrl('user_id/pet_id.jpg', 3600)
console.log(data, error)
```

### Paso 4: Si las políticas son el problema
Actualizar la política `pet_photos_owner_read` para que use el path del archivo en lugar de `owner_id`:
```sql
drop policy if exists "pet_photos_owner_read" on storage.objects;
create policy "pet_photos_owner_read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'pet-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

## Archivos a modificar
- `src/shared/lib/petPhotos.js`: Añadir logging temporal
