# Elecciones Peñarol — Spec Técnico 

## Overview
App web responsive (desktop + mobile) para gestionar la campaña electoral de una lista en Peñarol. Permite gestionar electores, realizar campañas de llamadas con flow dinámico, enviar emails segmentados, trackear gastos, organizar eventos y gestionar los integrantes de la lista.

## Stack
- **Frontend:** React + Tailwind CSS (shadcn/ui components)
- **Backend/DB:** Supabase (Auth, PostgreSQL, Storage, Row Level Security)
- **Hosting:** Vercel (free tier)
- **Email:** Resend (free tier — 100 emails/día)
- **PDF cartas:** react-pdf o jsPDF (client-side)
- **Excel import:** SheetJS (xlsx)

## Roles de Usuario
| Rol | Acceso |
|-----|--------|
| **Admin** | Todo: electores, llamadas, integrantes lista, gastos, campañas email, eventos, configuración flow, reportes |
| **Voluntario** | Solo: nombre + celular de electores asignados, flow de llamada, registrar resultado |

Auth via Supabase Auth (email/password). Rol almacenado en tabla `perfiles` con RLS policies.

---

## Data Model

### personas
Tabla central de personas. Puede ser elector, integrante de lista, o ambos.
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
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
| id | uuid PK | |
| persona_id | uuid FK → personas | |
| estado | enum | Pendiente, Llamado, Aceptó, Sobre Enviado, Descartado |
| asignado_a | uuid FK → perfiles | Voluntario asignado |
| notas | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### roles_lista
Una persona puede tener múltiples roles en la lista.
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| persona_id | uuid FK → personas | |
| tipo | enum | Dirigente, Comisión Electoral, Comisión Fiscal, Asamblea Representativa |
| posicion | text | 1-11, 1er Suplente, 2do Suplente (Dirigentes) o nº posición (Asamblea) |
| quien_lo_trajo | text | Solo Asamblea |
| comentario | text | |
| created_at | timestamptz | |

### comisiones_interes
Qué comisión le interesa integrar a cada persona.
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| persona_id | uuid FK → personas | |
| comision | enum | Fútbol, Formativas, Basketball, Deportes Anexos, Social, Infraestructura, AUFI |
| created_at | timestamptz | |

### preguntas_flow
Preguntas del cuestionario de llamadas. Admin las configura.
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| texto | text | Texto de la pregunta |
| tipo | enum | text, select, boolean |
| opciones | jsonb | Array de opciones para tipo select: ["A", "B", "C"] |
| orden_default | int | Orden si no hay regla de branching |
| activa | boolean | default true |
| created_at | timestamptz | |

### reglas_flow
Branching condicional entre preguntas.
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| pregunta_origen_id | uuid FK → preguntas_flow | |
| respuesta_valor | text | Valor que activa la regla |
| pregunta_destino_id | uuid FK → preguntas_flow | Siguiente pregunta si match |
| created_at | timestamptz | |

Lógica: al responder una pregunta, buscar en reglas_flow si hay match. Si hay → ir a pregunta_destino. Si no → seguir orden_default.

### llamadas
Registro de cada llamada realizada.
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| elector_id | uuid FK → electores | |
| voluntario_id | uuid FK → perfiles | Quién llamó |
| resultado | enum | No Atendió, Número Incorrecto, Nos Vota, No Nos Vota |
| fecha | timestamptz | |
| created_at | timestamptz | |

### respuestas_flow
Respuestas individuales a cada pregunta del flow.
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| llamada_id | uuid FK → llamadas | |
| pregunta_id | uuid FK → preguntas_flow | |
| respuesta | text | |
| created_at | timestamptz | |

### campanas_email
Campañas de email marketing.
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| nombre | text | |
| asunto | text | Subject del email |
| template_html | text | HTML con variables {{nombre}}, etc. |
| segmento | jsonb | Filtros: rango edad, resultado llamada, estado, etc. |
| estado | enum | Borrador, Enviando, Enviada |
| enviados | int | Counter |
| created_at | timestamptz | |

### gastos
Tracking de gastos de campaña.
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| concepto | text | Descripción del gasto |
| rubro | enum | Publicidad Radio, TV, Redes, Comida, Evento, Sonido, Community Manager, Diseñador Gráfico |
| monto | decimal | En pesos |
| programa_campana | text | A qué programa/campaña pertenece |
| quien_pago | text | |
| fecha | date | |
| created_at | timestamptz | |

### eventos
Charlas, reuniones, eventos de campaña.
| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| nombre | text | Ej: "Reunión COET" |
| fecha | timestamptz | |
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
| created_at | timestamptz | |

---

## Páginas / Vistas

### Home / Dashboard
- Calendario semanal/mensual con eventos
- KPIs: llamadas hoy, llamadas totales, % electores contactados, % aceptaron sobre
- Gráfico de progreso

### Electores
- **Admin:** Tabla completa con búsqueda, filtros por estado, export CSV
- **Voluntario:** Solo ve los asignados (nombre + celular)
- Import desde Excel (Admin)
- Click en elector → detalle con historial de llamadas

### Flow de Llamada
- Voluntario selecciona elector → inicia flow
- Una pregunta a la vez, branching automático
- Al finalizar: registra resultado y actualiza estado del elector
- Admin ve el historial completo de respuestas por elector

### Configuración del Flow (Admin)
- CRUD de preguntas
- Definir opciones por pregunta
- Configurar reglas de branching (si responde X → ir a pregunta Y)
- Preview del flow

### Integrantes de la Lista
- Tabla de personas con sus roles
- Filtrar por tipo: Dirigente, Comisión Electoral, Comisión Fiscal, Asamblea
- Una persona puede tener múltiples roles
- CRUD completo (Admin)

### Comisiones de Interés
- Ver qué personas quieren integrar qué comisiones
- Filtrar por comisión

### Campañas de Email (Admin)
- Crear campaña con template HTML
- Definir segmento (edad, resultado llamada, etc.)
- Preview con datos reales
- Enviar (via Resend API)

### Carta Personalizada (Admin)
- Template genérico con {{nombre}} dinámico
- Generar PDFs individuales o batch para imprimir
- Filtro: electores con estado "Aceptó"

### Gastos (Admin)
- CRUD de gastos
- Filtros por rubro, programa, fecha
- Totales por rubro y general

### Eventos (Admin)
- CRUD de eventos
- Vista calendario (integrada con Home)

### Usuarios (Admin)
- Crear/editar usuarios
- Asignar rol (Admin/Voluntario)
- Asignar electores a voluntarios

---

## Import Excel
1. Admin sube archivo .xlsx
2. App parsea con SheetJS
3. Muestra preview de datos mapeados
4. Confirma → insert batch en personas + electores
5. Manejo de duplicados por cédula o nro_socio

---

## Carta Personalizada
- Template almacenado como HTML/texto con variables: {{nombre}}, {{direccion}}, {{nro_socio}}
- Genera PDF con react-pdf
- Batch export: un PDF con todas las cartas para imprimir

---

## Supabase RLS Policies
- **personas/electores:** Admin = full access. Voluntario = solo SELECT donde electores.asignado_a = auth.uid()
- **llamadas/respuestas_flow:** Voluntario = INSERT own + SELECT own. Admin = full.
- **Todo lo demás:** Solo Admin.

---

## Estructura de Archivos (sugerida)
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              # Home/Dashboard
│   ├── login/
│   ├── electores/
│   │   ├── page.tsx          # Lista
│   │   ├── [id]/page.tsx     # Detalle
│   │   └── import/page.tsx   # Import Excel
│   ├── llamadas/
│   │   ├── page.tsx          # Mis asignados (voluntario) o todos (admin)
│   │   └── flow/[electorId]/page.tsx  # Flow de llamada
│   ├── flow-config/          # Admin: configurar preguntas
│   ├── lista/                # Integrantes de la lista
│   ├── comisiones/           # Interés en comisiones
│   ├── campanas/             # Email campaigns
│   ├── cartas/               # Carta personalizada + PDF
│   ├── gastos/
│   ├── eventos/
│   └── usuarios/             # Admin: gestión usuarios
├── components/
│   ├── ui/                   # shadcn components
│   ├── Calendar.tsx
│   ├── FlowEngine.tsx        # Motor del flow de preguntas
│   ├── KPICards.tsx
│   └── DataTable.tsx
├── lib/
│   ├── supabase.ts
│   ├── resend.ts
│   └── utils.ts
└── types/
    └── database.ts           # Types generados por Supabase
```

---

## Orden de Desarrollo Sugerido
1. **Setup:** Supabase project + Vercel + React app base + Auth + RLS
2. **Personas + Electores:** CRUD + Import Excel
3. **Flow de Llamada:** Preguntas, reglas, motor del flow, registro
4. **Dashboard:** Calendario + KPIs
5. **Integrantes Lista + Comisiones**
6. **Gastos + Eventos**
7. **Campañas Email + Carta PDF**
8. **Polish:** Búsqueda, filtros, export, responsive
