# Elecciones Peñarol — Spec Técnico

## Overview
App web responsive (desktop + mobile) para gestionar la campaña electoral de una lista en Peñarol. Permite gestionar electores, realizar campañas de llamadas con flow dinámico, enviar emails segmentados, trackear gastos, organizar eventos y gestionar los integrantes de la lista.

## Stack
- **Frontend:** React + Tailwind CSS (shadcn/ui components)
- **Backend/DB:** Supabase (Auth, PostgreSQL, Storage, Row Level Security)
- **Hosting:** Vercel (free tier)
- **Email:** Resend (free tier — 100 emails/día)
- **PDF cartas:** react-pdf o jsPDF (client-side)
- **Excel import/export:** SheetJS (xlsx)

## Roles de Usuario
| Rol | Acceso |
|-----|--------|
| **Admin** | Todo: electores, llamadas, integrantes lista, gastos, campañas email, eventos, configuración flow, reportes |
| **Voluntario** | Solo: nombre + celular de electores asignados, flow de llamada, registrar resultado |

Auth via Supabase Auth (email/password). Rol almacenado en tabla `perfiles` con RLS policies.

---

## Data Model

> **Nota sobre IDs:** Todas las tablas usan `bigint` serial como PK, excepto `perfiles.id` que es `uuid` (= `auth.users.id`). Las FK que referencian tablas con `bigint` PK también son `bigint`.

### personas
Tabla central de personas. Puede ser elector, integrante de lista, o ambos.
| Campo | Tipo | Notas |
|-------|------|-------|
| id | bigint PK (serial) | |
| nombre | text | Nombre completo |
| fecha_nacimiento | date | |
| cedula | text | Unique |
| nro_socio | text | Unique |
| telefono | text | Fijo |
| celular | text | |
| email | text | |
| direccion | text | Dirección completa |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### electores
Extiende personas con datos electorales.
| Campo | Tipo | Notas |
|-------|------|-------|
| id | bigint PK (serial) | |
| persona_id | bigint FK → personas | |
| estado | enum | Pendiente, Llamado, Confirmado, Para_Enviar, Lista_Enviada, Numero_Incorrecto, Descartado |
| asignado_a | uuid FK → perfiles | Voluntario asignado |
| enviar_lista | boolean | default false — marcado para envío de lista |
| notas | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### roles_lista
Una persona puede tener múltiples roles en la lista.
| Campo | Tipo | Notas |
|-------|------|-------|
| id | bigint PK (serial) | |
| persona_id | bigint FK → personas | |
| tipo | enum | Dirigente, Comision_Electoral, Comision_Fiscal, Asamblea_Representativa |
| posicion | text | Para roles estructurados: "1 Titular", "1 1er Suplente", "2 2do Suplente"; para Asamblea: número |
| quien_lo_trajo | text | Aplica a todos los tipos |
| comentario | text | |
| created_at | timestamptz | |

### comisiones_interes
Qué comisión le interesa integrar a cada persona. *(Tabla creada, página pendiente de implementar)*
| Campo | Tipo | Notas |
|-------|------|-------|
| id | bigint PK (serial) | |
| persona_id | bigint FK → personas | |
| comision | enum | Futbol, Formativas, Basketball, Deportes_Anexos, Social, Infraestructura, AUFI |
| created_at | timestamptz | |

### preguntas_flow
Preguntas del cuestionario de llamadas. Admin las configura.
| Campo | Tipo | Notas |
|-------|------|-------|
| id | bigint PK (serial) | |
| texto | text | Texto de la pregunta |
| tipo | enum | text, select, boolean |
| opciones | jsonb | Array de opciones para tipo select: ["A", "B", "C"] |
| orden_default | int | Orden si no hay regla de branching |
| activa | boolean | default true |
| accion | text | Identificador de acción opcional |
| resultado_si | LlamadaResultado | Resultado automático si respuesta boolean es "si" |
| resultado_no | LlamadaResultado | Resultado automático si respuesta boolean es "no" |
| created_at | timestamptz | |

### reglas_flow
Branching condicional entre preguntas.
| Campo | Tipo | Notas |
|-------|------|-------|
| id | bigint PK (serial) | |
| pregunta_origen_id | bigint FK → preguntas_flow | |
| respuesta_valor | text \| null | Valor que activa la regla |
| pregunta_destino_id | bigint \| null FK → preguntas_flow | Siguiente pregunta; null = terminar flow |
| created_at | timestamptz | |

Lógica: al responder una pregunta, buscar en reglas_flow si hay match. Si hay → ir a pregunta_destino (o terminar si es null). Si no → seguir orden_default.

### llamadas
Registro de cada llamada realizada.
| Campo | Tipo | Notas |
|-------|------|-------|
| id | bigint PK (serial) | |
| elector_id | bigint FK → electores | |
| voluntario_id | uuid FK → perfiles | Quién llamó |
| resultado | enum | No_Atendio, Numero_Incorrecto, Nos_Vota, No_Nos_Vota |
| fecha | timestamptz | |
| created_at | timestamptz | |

### respuestas_flow
Respuestas individuales a cada pregunta del flow.
| Campo | Tipo | Notas |
|-------|------|-------|
| id | bigint PK (serial) | |
| llamada_id | bigint FK → llamadas | |
| pregunta_id | bigint FK → preguntas_flow | |
| valor | text \| null | Respuesta dada |
| created_at | timestamptz | |

### campanas_email
Campañas de email marketing.
| Campo | Tipo | Notas |
|-------|------|-------|
| id | bigint PK (serial) | |
| nombre | text \| null | |
| asunto | text | Subject del email |
| template_html | text | HTML con variables {{nombre}}, etc. |
| segmento | text \| null | Filtros serializados |
| estado | enum | Borrador, Enviando, Enviada |
| enviados | int | Counter |
| created_at | timestamptz | |

### gastos
Tracking de gastos de campaña.
| Campo | Tipo | Notas |
|-------|------|-------|
| id | bigint PK (serial) | |
| concepto | text | Descripción del gasto |
| rubro | enum | Publicidad_Radio, TV, Redes, Comida, Evento, Sonido, Community_Manager, Disenador_Grafico |
| monto | decimal | En pesos |
| programa_campana | text | A qué programa/campaña pertenece |
| quien_pago | text | |
| fecha | date | |
| created_at | timestamptz | |

### eventos
Charlas, reuniones, eventos de campaña.
| Campo | Tipo | Notas |
|-------|------|-------|
| id | bigint PK (serial) | |
| nombre | text | Ej: "Reunión COET" |
| fecha | date | |
| hora | time \| null | Hora de inicio (opcional) |
| direccion | text | |
| descripcion | text | |
| created_at | timestamptz | |

### perfiles
Usuarios de la app (extends Supabase Auth).
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK (= auth.users.id) | |
| nombre | text | |
| email | text | |
| rol | enum | Admin, Voluntario |
| avatar_url | text \| null | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

## Páginas / Vistas

### Home / Dashboard
- KPI cards: Total Electores, Total Llamadas, Confirmados (Aceptaron), Tasa de Aceptación (Confirmados / Total)
- **Admin:** tabla de progreso por voluntario — asignados, llamadas realizadas, confirmados, tasa de conversión (color-coded)
- Lista de próximos eventos (los 5 próximos, ordenados por fecha+hora)

### Electores
- **Admin:** Tabla completa con búsqueda, filtro por estado, filtro "Sin asignar" (toggle), export CSV, import Excel
- **Admin — columnas:** Nombre, Edad (calculada desde fecha_nacimiento), Nro Socio, Celular, Estado (badge), Asignado a
- **Admin — acciones masivas (checkboxes):** selección por página con patrón Gmail (banner para seleccionar todos los N resultados), asignación masiva a voluntario, cambio masivo de estado
- **Voluntario:** Solo ve los asignados (nombre + celular)
- Click en elector → detalle (ver sección Detalle de Elector)

### Detalle de Elector (`/electores/[id]`)
- Header: nombre como h1 + badge de estado + "Asignado a X" (si aplica)
- Botón "Editar" (Admin) → abre ElectorFormDialog inline
- Botón "Iniciar llamada" → navega a `/llamadas/flow/[id]`
- Card Información Personal: Cédula, Nro Socio, Celular, Teléfono, Email, Dirección, Fecha de nacimiento (formateada + edad en paréntesis); campos vacíos ocultos
- Card Estado: estado (badge), asignado a, notas
- Historial de llamadas: resultado (badge con label legible), voluntario que llamó, fecha formateada

### Flow de Llamada
- Voluntario selecciona elector → inicia flow
- Una pregunta a la vez, branching automático por reglas_flow
- Al finalizar: registra resultado y actualiza estado del elector
- Admin ve el historial completo de respuestas por elector

### Llamadas
- **Voluntario:** tabla de electores asignados con filtro de estado (Para llamar = Pendiente+Llamado por defecto; también: Todos, Confirmado, Para Enviar, Lista Enviada, Número Incorrecto, Descartado). Contador de pendientes y sin atender.
- **Admin:** 4 tarjetas resumen (count + % por cada resultado: Nos vota, No nos vota, No atendió, Número incorrecto) + tabla de desglose por voluntario (total + columna por resultado) + historial completo

### Configuración del Flow (Admin)
- CRUD de preguntas
- Definir opciones por pregunta (tipo select)
- Configurar reglas de branching (si responde X → ir a pregunta Y, o terminar flow)

### Personas de la Lista (`/personas-lista`)
- Tabla de personas con sus roles en la lista (badges)
- Búsqueda por nombre o cédula
- CRUD: crear/editar datos de personas
- Import desde Excel (columnas de tabla personas)
- Export a Excel (selección de campos)

### Integrantes de la Lista (`/lista`)
- Tabla de roles con persona asociada
- Filtrar por tipo: Dirigente, Comisión Electoral, Comisión Fiscal, Asamblea Representativa
- Orden: por tipo, luego por número de posición, luego por sufijo (Titular → 1er Suplente → 2do Suplente)
- CRUD completo (Admin)
- Import desde Excel (persona debe existir previamente)
- Export a Excel (selección de campos; exporta solo los filtrados)

### Comisiones de Interés *(pendiente)*
- Ver qué personas quieren integrar qué comisiones
- Filtrar por comisión

### Campañas de Email (Admin) *(pendiente)*
- Crear campaña con template HTML
- Definir segmento (edad, resultado llamada, etc.)
- Preview con datos reales
- Enviar (via Resend API)

### Carta Personalizada (Admin) *(pendiente)*
- Template genérico con {{nombre}} dinámico
- Generar PDFs individuales o batch para imprimir

### Gastos (Admin)
- CRUD de gastos
- Filtros por rubro, programa, fecha
- Totales por rubro y general

### Eventos (Admin)
- CRUD de eventos con fecha y hora opcional
- Split view: Próximos / Pasados (corte por datetime actual, considera hora si existe)

### Usuarios (Admin)
- Crear/editar usuarios
- Asignar rol (Admin/Voluntario)
- Asignar electores a voluntarios

---

## Import Excel
1. Admin sube archivo .xlsx
2. App parsea con SheetJS
3. Muestra preview de datos mapeados
4. Confirma → insert batch

Disponible para:
- **Electores:** upsert en `personas` (por `nro_socio` primero, fallback a `cédula`) + inserta en `electores`. Optimizado para archivos grandes: lookups en chunks de 400, inserts en chunks de 500. Body limit 10MB.
- **Personas de la Lista:** upsert en `personas` (por cédula)
- **Integrantes de la Lista:** inserta en `roles_lista` (persona debe existir; busca por cédula o nombre exacto)

---

## Export Excel
- Disponible en Electores, Personas de la Lista, Integrantes de la Lista
- Dialog con selección de campos (checkboxes); algunos marcados por defecto
- Exporta solo los datos actualmente filtrados
- Nombre de archivo incluye timestamp `_YYYY-MM-DD_HH-mm`

---

## Carta Personalizada *(pendiente)*
- Template almacenado como HTML/texto con variables: {{nombre}}, {{direccion}}, {{nro_socio}}
- Genera PDF con react-pdf
- Batch export: un PDF con todas las cartas para imprimir

---

## Supabase RLS Policies
- **personas/electores:** Admin = full access. Voluntario = solo SELECT donde electores.asignado_a = auth.uid()
- **llamadas/respuestas_flow:** Voluntario = INSERT own + SELECT own. Admin = full.
- **Todo lo demás:** Solo Admin.

---

## Estructura de Archivos
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── login/
│   └── (dashboard)/
│       ├── layout.tsx            # Auth guard — getRequiredPerfil()
│       ├── page.tsx              # Home/Dashboard
│       ├── electores/
│       │   ├── page.tsx          # Lista
│       │   ├── data-table.tsx    # Client component: tabla, filtros, bulk actions
│       │   ├── elector-form.tsx  # Dialog crear/editar elector
│       │   └── [id]/
│       │       ├── page.tsx      # Detalle del elector
│       │       └── actions.tsx   # Client wrapper para Edit dialog en detalle
│       │   └── import/           # Import Excel
│       ├── llamadas/
│       │   ├── page.tsx
│       │   ├── llamadas-client.tsx  # VoluntarioView + AdminView (stats + historial)
│       │   └── flow/[electorId]/page.tsx
│       ├── flow-config/          # Admin: configurar preguntas
│       ├── lista/                # Integrantes de la lista
│       ├── personas-lista/       # Datos personales de integrantes
│       ├── campanas/             # Email campaigns (stub)
│       ├── cartas/               # Envío de cartas físicas
│       ├── gastos/
│       ├── eventos/
│       └── usuarios/
├── components/
│   ├── ui/                       # shadcn components (no editar)
│   ├── confirm-dialog.tsx        # Diálogo de confirmación reutilizable
│   └── export-dialog.tsx         # Componente reutilizable de export Excel
├── lib/
│   ├── actions/                  # Server Actions (mutations)
│   │   ├── electores.ts          # getElectores, CRUD, asignarEnMasa, cambiarEstadoEnMasa
│   │   ├── llamadas.ts           # getElectoresParaLlamar, getAllLlamadas, submitLlamada
│   │   ├── import-electores.ts   # previewImport, importElectores (bulk, chunked)
│   │   └── ...
│   ├── supabase/                 # Clientes server/client
│   ├── validations/              # Zod schemas
│   └── csv-export.ts             # Export CSV de electores
└── types/
    └── database.ts               # Tipos e interfaces de DB (fuente de verdad)
```

---

## Estado de Desarrollo
1. ✅ Setup: Supabase + Vercel + Auth + RLS
2. ✅ Personas + Electores: CRUD + Import Excel (bulk, chunked, upsert por nro_socio)
3. ✅ Flow de Llamada: preguntas, reglas, motor, registro
4. ✅ Dashboard: KPIs + tabla de progreso por voluntario + próximos eventos
5. ✅ Integrantes Lista + Personas de la Lista
6. ✅ Gastos + Eventos
7. ⏳ Campañas Email (stub) · Carta PDF (stub)
8. ✅ Export CSV + Import Excel para Lista/Personas Lista
9. ✅ Electores: acciones masivas (asignar voluntario, cambiar estado, select-all Gmail pattern)
10. ✅ Electores: filtro "Sin asignar" + columna Edad
11. ✅ Detalle de elector: edición inline, llamadas con voluntario y resultado, edad formateada
12. ✅ Llamadas admin: tarjetas por resultado + desglose por voluntario
13. ✅ Llamadas voluntario: filtro de estado configurable
