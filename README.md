# PetCare — Diseño de base de datos v2
> Documento de planificación. Revisar y aprobar antes de ejecutar ningún SQL.

---

## Filosofía del nuevo diseño

**La visita es el documento central.**
Todo lo que ocurre en una consulta — peso, hallazgos, diagnóstico, vacunas,
medicación, imágenes — queda registrado dentro de esa visita.
El historial de una mascota es una lista de visitas ordenadas por fecha.

No hay registros sueltos sin contexto. Cada dato tiene una visita asociada.

---

## Tablas que SE MANTIENEN sin cambios

### `profiles`
Registro de usuario (owner o vet). Sin cambios.

```
id, full_name, role ('owner' | 'vet'), created_at
```

### `vet_profiles`
Datos del veterinario. Sin cambios.

```
id, license_number, clinic_name, verified, created_at
```

---

## Tablas que SE REESCRIBEN limpias

### `pets`
Se añaden `allergies` y `color`. Se elimina el índice inútil de color.
Se añade trigger para `updated_at`.

```
id                uuid  PK
owner_id          uuid  FK → auth.users
name              text  NOT NULL
animal_type       text  NOT NULL  -- 'Perro','Gato','Ave','Conejo','Reptil','Otro'
sex               text  NOT NULL  DEFAULT 'No especificado'
                        CHECK (sex IN ('Macho','Hembra','No especificado'))
breed             text
chip_number       text  UNIQUE
photo_url         text
insurance_company text
policy_number     text
birth_date        date
allergies         text            -- NUEVO: texto libre, ej: "Penicilina, AINEs"
color             text  NOT NULL  DEFAULT '#0000B8'  -- sincronizado con PASTEL_COLORS[0]
created_at        timestamptz
updated_at        timestamptz     -- actualizado por trigger
```

---

## Tablas NUEVAS

### `visits` ← tabla central
Una visita = un acto clínico completo. Puede crearla el vet (consulta real)
o el owner (cita concertada por teléfono, status pendiente).

```
id               uuid  PK
pet_id           uuid  FK → pets
created_by       uuid  FK → auth.users   -- quien crea el registro
vet_id           uuid  FK → auth.users   -- vet asignado (puede ser null si la crea el owner)
visited_at       date  NOT NULL          -- fecha de la visita
status           text  NOT NULL DEFAULT 'pendiente'
                       CHECK (status IN ('pendiente','confirmada','completada','cancelada'))
reason           text                    -- motivo de consulta
examination      text                    -- exploración y hallazgos
diagnosis        text                    -- diagnóstico
treatment_notes  text                    -- observaciones del tratamiento
weight_kg        numeric(6,2)
height_cm        numeric(6,2)
next_visit_date  date                    -- próxima visita sugerida
signed_by        text                    -- nombre del vet o clínica que firma
created_at       timestamptz
updated_at       timestamptz
```

### `visit_medications`
Medicaciones recetadas en una visita concreta.

```
id             uuid  PK
visit_id       uuid  FK → visits ON DELETE CASCADE
pet_id         uuid  FK → pets   ON DELETE CASCADE
prescribed_by  uuid  FK → auth.users
name           text  NOT NULL
dosage         text  NOT NULL     -- '350mg', '1 comprimido'
frequency      text  NOT NULL     -- 'cada 12h', 'cada 24h en ayunas'
start_date     date  NOT NULL
end_date       date               -- null = indefinida
with_food      boolean NOT NULL DEFAULT false
fasting        boolean NOT NULL DEFAULT false
active         boolean NOT NULL DEFAULT true
notes          text
created_at     timestamptz
```

### `visit_imaging`
Imágenes diagnósticas adjuntas a una visita.

```
id          uuid  PK
visit_id    uuid  FK → visits ON DELETE CASCADE
pet_id      uuid  FK → pets   ON DELETE CASCADE
vet_id      uuid  FK → auth.users
study_type  text  NOT NULL   -- 'Radiografia','Ecografia','TAC','Resonancia','Otra'
image_path  text  NOT NULL   -- ruta en bucket diagnostic-imaging
report      text
taken_at    timestamptz NOT NULL DEFAULT now()
created_at  timestamptz
```

### `reminders`
Recordatorios del owner en el calendario (pastillas, vacunas, revisiones).
Independiente de las visitas — es la vista del owner, no del vet.

```
id          uuid  PK
pet_id      uuid  FK → pets ON DELETE CASCADE
owner_id    uuid  FK → auth.users ON DELETE CASCADE
type        text  NOT NULL
            CHECK (type IN ('vacuna','desparasitacion','medicamento','visita','otro'))
title       text  NOT NULL
notes       text
due_date    date  NOT NULL
completed   boolean NOT NULL DEFAULT false
created_at  timestamptz
```

---

## Tablas que DESAPARECEN

| Tabla | Por qué |
|---|---|
| `medical_records` | Absorbida por `visits` (reason, examination, diagnosis, treatment_notes) |
| `medications` | Reemplazada por `visit_medications` vinculada a visita |
| `appointments` | Absorbida por `visits` con status `pendiente` |
| `imaging_records` | Reemplazada por `visit_imaging` vinculada a visita |

---

## Relaciones

```
auth.users
  ├── profiles         (1:1)
  ├── vet_profiles     (1:1)
  └── pets             (1:N) via owner_id
        └── visits     (1:N)
              ├── visit_medications  (1:N)
              └── visit_imaging      (1:N)

auth.users
  └── reminders        (1:N) via owner_id
```

---

## Flujo por rol

### Owner
1. Crea mascota con foto, chip, seguro, alergias
2. Crea visita con status `pendiente` (cita por teléfono)
3. Ve el historial de visitas de su mascota (solo lectura)
4. Gestiona recordatorios en el calendario

### Vet
1. Busca mascota por chip
2. Abre visita existente (pendiente) o crea una nueva
3. Rellena: peso, altura, exploración, diagnóstico
4. Añade medicaciones dentro de la visita
5. Adjunta imágenes dentro de la visita
6. Firma y marca como `completada`
7. Sugiere próxima visita (next_visit_date)

---

## RLS — Reglas de acceso

| Tabla | Owner | Vet verificado |
|---|---|---|
| `pets` | CRUD propio | SELECT por chip |
| `visits` | INSERT (pendiente) + SELECT propio | CRUD completo |
| `visit_medications` | SELECT propio | CRUD completo |
| `visit_imaging` | SELECT propio | CRUD completo |
| `reminders` | CRUD propio | — |
| `profiles` | SELECT + UPDATE propio | SELECT + UPDATE propio |
| `vet_profiles` | SELECT propio | SELECT + UPDATE propio |

---

## Storage buckets (sin cambios)

| Bucket | Uso | Límite |
|---|---|---|
| `pet-photos` | Foto de perfil de la mascota | 5 MB |
| `diagnostic-imaging` | Imágenes de `visit_imaging` | 10 MB |

---

## Funciones y triggers

| Nombre | Tipo | Descripción |
|---|---|---|
| `is_verified_vet()` | function | Comprueba vet_profiles.verified = true |
| `has_strong_auth()` | function | Comprueba AAL2 (2FA) |
| `handle_new_user()` | trigger | Crea profile al registrarse |
| `delete_current_user()` | function | Borra cuenta propia |
| `set_updated_at()` | trigger | Actualiza updated_at en pets y visits |

---

## Índices

```
pets:              owner_id, chip_number
visits:            pet_id, visited_at, status, vet_id
visit_medications: visit_id, pet_id, active
visit_imaging:     visit_id, pet_id
reminders:         owner_id, pet_id, due_date
```

---

## Orden de ejecución del SQL

```
1. Extensiones y funciones utilitarias
2. profiles + vet_profiles
3. pets (nueva versión limpia)
4. visits
5. visit_medications
6. visit_imaging
7. reminders
8. Triggers (handle_new_user, set_updated_at)
9. RLS de todas las tablas
10. Índices
11. Storage buckets y sus políticas
```

---

## Pendiente para v3 (no entra ahora)

- Notificaciones push para recordatorios
- Firma digital del vet (PDF del informe)
- Historial de peso con gráfica (ya calculable desde visits)
- Compartir visita con otro vet
- App móvil del owner para confirmar citas

---

*Revisar y aprobar este documento antes de escribir ningún SQL.*
*Una vez aprobado se genera: schema.sql completo listo para ejecutar en Supabase.*
