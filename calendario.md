# Calendario PetCare

## Estado real de la implementación

El calendario del owner ya no usa una tabla `reminders`.

La implementación real se apoya en datos clínicos existentes:

- `pets`
  - aporta `id`, `name` y `color`
- `medications`
  - genera eventos diarios o por rango de fechas
- `appointments`
  - genera eventos puntuales como visitas, vacunas, desparasitaciones o revisiones

Esto evita duplicar información y hace que el calendario refleje directamente lo que el veterinario o el propietario registran en la app.

---

## Fuentes de eventos

### 1. Medicación

Tabla usada: `public.medications`

Campos relevantes:

- `pet_id`
- `name`
- `dosage`
- `frequency`
- `start_date`
- `end_date`
- `active`

Comportamiento:

- cada medicación activa se expande en el calendario desde `start_date` hasta `end_date`
- si `end_date` es `null`, al menos aparece en `start_date`
- el owner puede activarla o desactivarla desde el calendario

### 2. Visitas y recordatorios puntuales

Tabla usada: `public.appointments`

Campos relevantes:

- `pet_id`
- `title`
- `appointment_type`
- `scheduled_at`
- `status`

Tipos usados actualmente:

- `revision`
- `consulta`
- `vacuna`
- `desparasitacion`
- `cirugia`
- `otro`

Comportamiento:

- cada cita aparece solo en su fecha
- el owner puede marcarla como `completada` o volver a `pendiente`

---

## Colores por mascota

La tabla `public.pets` tiene el campo:

- `color text not null default '#A8D5BA'`

Ese color se usa:

- en la leyenda del calendario
- en los puntos de cada día
- para distinguir eventos de distintas mascotas

Si una mascota no tuviera color, el frontend usa una paleta de respaldo definida en:

- [src/features/reminders/constants.js](/home/programadorgba/Documentos/PetCare/src/features/reminders/constants.js:1)

---

## Flujo actual del usuario

### Ver calendario

Archivo principal:

- [CalendarPage.jsx](/home/programadorgba/Documentos/PetCare/src/features/reminders/pages/CalendarPage.jsx:1)

Lógica:

- carga mascotas del owner
- obtiene sus `petIds`
- carga eventos del mes desde `medications` y `appointments`

### Abrir un día

Componente:

- [EventModal.jsx](/home/programadorgba/Documentos/PetCare/src/features/reminders/components/EventModal.jsx:1)

Muestra:

- nombre del evento
- mascota asociada
- tipo
- dosis/frecuencia si es medicación
- acción para completar o desactivar

### Crear evento

Componente:

- [EventForm.jsx](/home/programadorgba/Documentos/PetCare/src/features/reminders/components/EventForm.jsx:1)

Reglas:

- si el tipo es `medicamento`, crea fila en `medications`
- si el tipo es `vacuna`, `desparasitacion`, `visita` u otro puntual, crea fila en `appointments`

Mapeo actual:

- `visita` se guarda como `appointment_type = 'revision'`
- `vacuna` se guarda como `appointment_type = 'vacuna'`
- `desparasitacion` se guarda como `appointment_type = 'desparasitacion'`
- `otro` se guarda como `appointment_type = 'otro'`

---

## Archivos implicados

- [src/features/reminders/pages/CalendarPage.jsx](/home/programadorgba/Documentos/PetCare/src/features/reminders/pages/CalendarPage.jsx:1)
- [src/features/reminders/hooks/useCalendar.js](/home/programadorgba/Documentos/PetCare/src/features/reminders/hooks/useCalendar.js:1)
- [src/features/reminders/components/CalendarGrid.jsx](/home/programadorgba/Documentos/PetCare/src/features/reminders/components/CalendarGrid.jsx:1)
- [src/features/reminders/components/EventModal.jsx](/home/programadorgba/Documentos/PetCare/src/features/reminders/components/EventModal.jsx:1)
- [src/features/reminders/components/EventForm.jsx](/home/programadorgba/Documentos/PetCare/src/features/reminders/components/EventForm.jsx:1)

---

## Cambios de base de datos necesarios

Para que el calendario funcione correctamente con el owner creando y gestionando medicaciones, la base de datos debe permitir acceso completo del owner sobre `public.medications` vinculadas a sus mascotas.

### Opción recomendada

Ejecutar la migración actualizada del proyecto en Supabase.

Archivo:

- [20260522_add_pet_sex_medications_appointments.sql](/home/programadorgba/Documentos/PetCare/supabase/migrations/20260522_add_pet_sex_medications_appointments.sql:1)

### SQL mínimo si solo quieres corregir permisos del calendario

```sql
drop policy if exists "medications_owner_read" on public.medications;
drop policy if exists "medications_owner_access" on public.medications;

create policy "medications_owner_access"
on public.medications for all
to authenticated
using (
  exists (
    select 1
    from public.pets
    where pets.id = medications.pet_id
      and pets.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.pets
    where pets.id = medications.pet_id
      and pets.owner_id = auth.uid()
  )
);
```

---

## Decisiones de diseño

- no se usa `reminders` porque duplicaría datos clínicos
- el calendario debe mostrar hechos y planes reales, no una copia paralela
- `appointments` representa eventos puntuales
- `medications` representa pautas continuadas
- el color por mascota permite escaneo visual inmediato del mes

---

## Siguientes mejoras posibles

- añadir filtro por mascota
- añadir filtro por tipo de evento
- mostrar estado visual distinto para `pendiente`, `completada`, `inactiva`
- permitir editar eventos desde el modal
- añadir soporte de eventos derivados de futuras dosis programadas más complejas
