# Contratos de dominio · FIELDVERSE

> **Estado del documento:** propuesta de revisión v0.3 de Etapa 0. Borrador de trabajo sujeto a revisión y ratificación formal del equipo (Hellen, Alex y Samuel).
> **Autoría:** Hellen (`backend/src/domain/`, `docs/metodologia/`).
> **Revisión solicitada por:** Samuel (v0.2). **Conformidad general de la v0.2:** Alex. **v0.3:** incorpora D17–D21 como propuestas de diseño; **tanto el documento v0.3 en su conjunto como las decisiones D17–D21 y el contrato propuesto `Ciclo` v0.2 están estrictamente pendientes de ratificación por parte de Hellen, Alex y Samuel**, y no deben considerarse acuerdos cerrados ni implementarse en código o exponerse en la API pública sin dicha ratificación.
> **Alcance de esta etapa:** definición de contratos de datos. **No contiene código JavaScript.**
> **Regla de marcado:** toda decisión que no esté establecida en `AGENTS.md`, `README.md`, `docs/contrato-api.md`, `docs/equipo.md` o en el registro de decisiones acordadas de §0.3 se marca como **PROPUESTA PENDIENTE DE APROBACIÓN / RATIFICACIÓN**.
> **Límite explícito:** este documento no inventa fuentes científicas, valores climáticos, umbrales, rendimientos ni probabilidades de supervivencia. Los ejemplos numéricos que aparecen son los del `docs/contrato-api.md` y son **ficticios**.

---

## 0. Control de revisiones y trazabilidad

### 0.1 Historial

| Versión | Fecha | Cambio |
|---|---|---|
| v0.1 | Etapa 0 | Definición inicial de contratos de dominio. |
| v0.2 | 2026-11-14 | Se incorporan los seis ajustes solicitados por Samuel; Alex manifestó conformidad general. |
| v0.3 | 2026-11-15 | Se documentan D17–D21 y el contrato propuesto `Ciclo` v0.2; se eliminan contradicciones internas (representación de `fuenteId` en ciclos pendientes sin inventar fuentes, reglas de coherencia entre `nivelEvidencia`/`alcanceGeografico`/`localidad`, semántica de `finca.mesInicio` en validación de entrada frente a compatibilidad por estrategia, reorganización de D20 y relación con `ResultadoSimulacion` en D10); se ratifica explícitamente que el documento v0.3 y D17–D21 están pendientes de ratificación del equipo; D1–D16, D22 y rotaciones A/B/C se conservan no validadas. |

### 0.2 Los seis ajustes de esta revisión

| # | Ajuste solicitado | Dónde queda resuelto |
|---|---|---|
| 1 | Estrategia con exactamente dos ciclos ordenados mediante lista de pasos | §2.5, §2.8, §7.1 |
| 2 | Parámetros de puntuación estructurados con valor, unidad y fuente; si falta información esencial, cálculo incompleto | §2.6, §6.2, §8 |
| 3 | Opciones del formulario de finca con valor interno y etiqueta visible; vocabulario compartido | §2.7, §3 |
| 4 | Clima con series diarias de precipitación, temperatura media y máxima, unidades, fechas, procedencia y cobertura por variable; ventanas y escenarios en el motor; confirmaciones de Alex explícitas | §5, §9 |
| 5 | Separar `incompleto` de `sin_opciones`; motivos de descarte y de valores no calculables | §4.5, §6.2–§6.5, §8 |
| 6 | Corregir minimax regret: no requiere probabilidades ni supone escenarios equiprobables | §7.2, §7.6 |

### 0.3 Decisiones acordadas en esta revisión

| Decisión | Valor acordado |
|---|---|
| Escala de puntuaciones | `0` a `100` |
| Dirección de la puntuación | Mayor es mejor |
| Etapas fenológicas | No se usan en la primera versión |
| Escenarios hipotéticos | `habitual`, `seco`, `humedo` |
| Matriz de prueba de minimax | Se mantiene la matriz ficticia del contrato |
| Localidad piloto y cultivos definitivos | Siguen pendientes de confirmación |
| Valores agronómicos, umbrales, rendimientos y fuentes | No se inventan; quedan pendientes de fuente citada |

Las decisiones **D17–D21** se incorporan en §10.1–§10.5 como definidas a nivel de diseño; su ratificación se indica en la tabla de §10 y requiere acuerdo formal de Hellen, Alex y Samuel. **D1–D16 y D22** permanecen no validadas / pendientes. Las rotaciones A, B y C no están validadas (§2.4.1, §10.6).

### 0.4 Reglas invariantes

- El dominio **no importa Express, no consulta APIs y no lee credenciales**.
- Distinguir **historial**, **pronóstico** y **escenario hipotético**.
- **Desconocido no significa cero.**
- Datos de respaldo deben llevar **fecha y origen**.
- **No atribuir puntuaciones demostrativas a NASA** ni prometer rendimiento o supervivencia.
- El catálogo es la única fuente autorizada de vocabulario agronómico y estrategias.

---

## 1. Objetivo y alcance

### 1.1 Objetivo

Fijar, antes de escribir código, los contratos de datos que sostienen el catálogo agrícola y el motor de simulación, de modo que:

- El motor de dominio sea una función pura: recibe `{finca, clima, catalogo}` y devuelve resultados y evidencia.
- El catálogo sea la única fuente autorizada de vocabulario agronómico, opciones de formulario y estrategias.
- Alex pueda construir `GET /api/catalog` y `POST /api/simulations` sin reescribir la lógica de dominio.
- Samuel pueda diseñar el formulario «Mi finca» contra un vocabulario estable, con valor interno y etiqueta visible.

### 1.2 Alcance

**Dentro del alcance:**

- Esquema del catálogo (cultivos, ciclos, estrategias, parámetros de puntuación, opciones de finca, versiones y fuentes).
- Vocabulario controlado de `suelo`, `drenaje`, `riego` y `prioridad`, con valor interno y etiqueta visible.
- Formato exacto de entrada y salida del motor.
- Contrato climático diario que el motor exige a la capa de datos (Alex).
- Estructura de escenarios, estados, motivos y evidencia.
- Definición matemática del algoritmo minimax regret, sin supuestos probabilísticos.

**Fuera del alcance de esta etapa:**

- Implementación JavaScript.
- Datos climáticos reales, fuentes NASA, rendimientos o probabilidades de supervivencia.
- Etapas fenológicas en la primera versión (decisión acordada en §0.3).
- Rutas, controladores o servicios (propiedad de Alex).
- Interfaz de usuario (propiedad de Samuel).

### 1.3 Restricciones heredadas (`AGENTS.md`)

- El dominio **no importa Express, no consulta APIs y no lee credenciales**.
- Distinguir **historial**, **pronóstico** y **escenario hipotético**.
- **Desconocido no significa cero.**
- Datos de respaldo deben llevar **fecha y origen**.
- **No atribuir puntuaciones demostrativas a NASA** ni prometer rendimiento o supervivencia.

---

## 2. Esquema propuesto del catálogo

> **PROPUESTA PENDIENTE DE APROBACIÓN.** El contrato solo fija la forma externa `{cultivos, estrategias, version, fuentes}` de `GET /api/catalog` (`contrato-api.md:17`). La estructura interna se propone aquí. Las adiciones `generado`, `localidadPiloto` y `opcionesFinca` son propuestas que requieren acuerdo del equipo; no modifican `docs/contrato-api.md` en esta revisión.

### 2.1 Objeto raíz del catálogo

```jsonc
{
  "version": "string",              // identificador de versión del catálogo
  "generado": "YYYY-MM-DD",         // fecha de compilación del catálogo
  "localidadPiloto": {              // PROPUESTA PENDIENTE (ver §10, D1)
    "id": "string",
    "nombre": "string",
    "pais": "string",
    "fuenteId": "string"            // referencia a fuentes[]
  },
  "fuentes": [ Fuente ],
  "opcionesFinca": {                // vocabulario compartido frontend/motor (ver §3)
    "suelo": [ Opcion ],
    "drenaje": [ Opcion ],
    "riego": [ Opcion ],
    "prioridad": [ Opcion ],
    "mesInicio": [ OpcionMes ]
  },
  "cultivos": [ Cultivo ],
  "estrategias": [ Estrategia ]
}
```

**Compatibilidad con el contrato:** `GET /api/catalog` expondrá al menos `cultivos`, `estrategias`, `version` y `fuentes`. Los campos `generado`, `localidadPiloto` y `opcionesFinca` son adiciones propuestas; exponerlas requiere acuerdo con Alex y Samuel (§9, §10).

### 2.2 `Fuente`

```jsonc
{
  "id": "string",                   // identificador interno, referenciado por otros objetos
  "tipo": "literatura|dataset|experto|institucional",  // PROPUESTA PENDIENTE
  "titulo": "string",
  "url": "string|null",             // sin secretos
  "fecha": "YYYY-MM-DD|null",       // fecha de la fuente o de su consulta
  "notas": "string"
}
```

Regla de respaldo documental:

- Ningún valor agronómico que se utilice para evidencia, elegibilidad o cálculo de puntuaciones puede existir sin una `fuenteId` válida que lo respalde en `fuentes[]` una vez el catálogo deje de ser demostrativo.
- **Representación de ciclos pendientes sin fuente:** En el contrato propuesto, un ciclo con `nivelEvidencia = "pendiente"` que carezca de respaldo documental se representa legítima y coherentemente con `fuenteId: null` (y en su caso `ventanaSiembra: null` o `duracionDias: null`). **Está estrictamente prohibido inventar fuentes ficticias o asignar identificadores arbitrarios** para simular que existe una fuente.
- Los ciclos con `fuenteId: null` pueden figurar en el catálogo como definiciones en investigación o borradores pendientes, pero **no se consideran evidencia validada, no son elegibles para puntuación y no pueden producir estrategias recomendadas ni ganadoras**. Toda entrada con `fuenteId: null` debe resolverse antes de cargar datos reales de producción.

### 2.3 `Cultivo`

```jsonc
{
  "id": "string",
  "nombre": "string",
  "ciclos": [ Ciclo ],
  "fuenteId": "string"
}
```

### 2.4 `Ciclo` — contrato propuesto v0.2

```jsonc
{
  "id": "string",
  "cultivoId": "string",
  "ventanaSiembra": { "inicioMes": 1, "finMes": 12 }, // ejemplo de forma; no es una ventana validada
  "duracionDias": { "min": 85, "max": 92 },           // ejemplo de forma; no es una duración validada para Liberia
  "alcanceGeografico": "local|cantonal|regional|nacional|null", // null solo si parcial/pendiente y el alcance no se puede determinar
  "localidad": "string|null",                         // null para nacional o alcance null; obligatorio para local/cantonal/regional
  "nivelEvidencia": "directa_local|extrapolada|parcial|pendiente",
  "fuenteId": "string|null"                           // null solo si pendiente y falta fuente documental
}
```

**Estado:** propuesta de contrato v0.2, definida a nivel de diseño (D17–D21, §10.1–§10.5). No está implementada ni ratificada por el equipo.

Reglas de la v0.2:

- `duracionDias` sustituye a `duracionMeses`. No se mantiene `duracionMeses` como alias ni como campo derivado persistido.
- `duracionDias` es `null` o un objeto con `min` y `max` enteros positivos, `min <= max`. Un valor exacto usa `min = max`. No se aceptan cero, negativos ni fracciones.
- No se convierte automáticamente de meses a días. Si la fuente solo expresa meses, se usa `null` y se conserva la expresión original en `Fuente.notas`.
- `ventanaSiembra` es `null` o un objeto con `inicioMes`/`finMes` enteros en `[1, 12]`. En la v0.2 se exige `inicioMes <= finMes`; las ventanas que cruzan año no están soportadas.
- `ventanaSiembra: null` solo se permite si `nivelEvidencia = "pendiente"`. Lo recíproco no siempre se cumple: un ciclo con ventana conocida sigue siendo `pendiente` si su duración es `null` o si carece de fuente comprobada.
- `duracionDias: null` solo se permite si `nivelEvidencia = "pendiente"`.
- `fuenteId` referencia al `id` de una `Fuente` en `fuentes[]` que respalda los valores conocidos de ventana y duración del ciclo:
  - Para `nivelEvidencia = "directa_local"` o `"extrapolada"`, `fuenteId` es **obligatorio** (string no vacío, debe existir en `fuentes[]`).
  - Para `nivelEvidencia = "parcial"`, `fuenteId` es **obligatorio** (string no vacío, debe existir en `fuentes[]`), respaldando la referencia parcial o preliminar.
  - Para `nivelEvidencia = "pendiente"`, `fuenteId` es **`null`** cuando se carece de fuente documental comprobada. Si existe una fuente pero los valores son incompletos o no verificados, puede contener el string de dicha fuente en `fuentes[]`. Nunca se inventa una fuente ficticia.
  - Si ventana y duración provienen de fuentes distintas, no se inventa una fuente compuesta; se requiere resolver D22 (§10.7) antes de cargar datos reales.

#### Reglas de coherencia entre `nivelEvidencia`, `alcanceGeografico` y `localidad`

| `nivelEvidencia` | `alcanceGeografico` permitido | `localidad` permitida | Requisitos sobre valores (`ventanaSiembra`, `duracionDias`) | `fuenteId` |
|---|---|---|---|---|
| `directa_local` | Exclusivamente `"local"` | Exclusivamente `"Liberia"` (o la localidad piloto formal de D1). No nulo. | Ambos obligatorios, completos y verificados directamente en la localidad. | Obligatorio (`string` en `fuentes[]`). |
| `extrapolada` | `"cantonal"`, `"regional"` o `"nacional"`. Prohibido `"local"` y prohibido `null`. | Si es `"cantonal"` o `"regional"`: obligatorio (`string` con nombre). Si es `"nacional"`: estrictamente `null`. | Ambos obligatorios, completos y verificados en la localidad/alcance citado. | Obligatorio (`string` en `fuentes[]`). |
| `parcial` | `"local"`, `"cantonal"`, `"regional"`, `"nacional"`, o `null` si no se puede determinar. | Si el alcance es `"local"`, `"cantonal"` o `"regional"`: obligatorio (`string`). Si es `"nacional"` o `null`: estrictamente `null`. | Al menos un valor proviene de fuente parcial, índice o mención contextual. Valores no nulos (si alguno es `null`, pasa a `pendiente`). | Obligatorio (`string` en `fuentes[]`). |
| `pendiente` | `"local"`, `"cantonal"`, `"regional"`, `"nacional"`, o `null` si no se puede determinar. | Si el alcance es `"local"`, `"cantonal"` o `"regional"`: obligatorio (`string`). Si es `"nacional"` o `null`: estrictamente `null`. | Al menos un valor es `null` o carece de fuente documental comprobada. | `string|null` (`null` si falta fuente). |

Invariantes de consistencia:

1. **Regla de localidad nula:** `localidad` es estrictamente `null` si y solo si `alcanceGeografico` es `"nacional"` o `null`. Para cualquier otro alcance (`local`, `cantonal`, `regional`), `localidad` es obligatoria y no vacía.
2. **Incompatibilidad de directa_local:** `directa_local` prohíbe cualquier alcance distinto a `"local"`, y cualquier localidad distinta a la localidad piloto oficial (Liberia en la propuesta actual).
3. **Incompatibilidad de extrapolada:** `extrapolada` prohíbe alcance `"local"` (ya que sería evidencia local) y prohíbe alcance `null` (la extrapolación exige origen geográfico explícito).
4. **Regla del eslabón más débil:** El `nivelEvidencia` del ciclo es el mínimo nivel entre la evidencia de `ventanaSiembra` y de `duracionDias`: `directa_local > extrapolada > parcial > pendiente` (D19, §10.3).
5. **Principio de no fragmentación:** Un `Ciclo` declara un único `alcanceGeografico` y una única `localidad`. Ventana y duración deben compartir alcance y localidad; si difieren, aplica D22 (§10.7) antes de cargar datos reales.
6. **Elegibilidad para simulación:** Un ciclo `parcial` o `pendiente` puede mostrarse en catálogo con su etiqueta, pero no es elegible para puntuación ni puede producir estrategias ganadoras. Un ciclo con evidencia `extrapolada` puede puntuarse, pero la salida y la interfaz deben exhibir la advertencia de extrapolación geográfica; la representación de esta etiqueta en la salida queda pendiente en D10.

**Decisión acordada:** la primera versión **no contiene etapas fenológicas**. No se incluye el campo `etapas` en `Ciclo`. Si en el futuro se necesitan, se incorporarán como una nueva versión del contrato, no como un campo opcional silencioso.

#### 2.4.1 Estado de las rotaciones A, B y C

Las rotaciones candidatas son:

- **A:** maíz → frijol.
- **B:** maíz → sorgo.
- **C:** sorgo → frijol.

**No están validadas agronómica ni temporalmente.** Siguen siendo candidatas de diseño. A y B no pueden declararse compatibles con la evidencia actual; C es plausible pero no verificada. La matriz ficticia de §7.5 no las valida. No deben presentarse como recomendación, ni usarse para puntuación, hasta cumplir D18 y D20 y ratificar D17–D21.

### 2.5 `Estrategia`

La estrategia representa **exactamente dos ciclos ordenados**. La secuencia se expresa con una lista de pasos; cada paso identifica el cultivo y el ciclo correspondiente.

```jsonc
{
  "id": "string",                  // el contrato usa "A", "B", "C" en el ejemplo ficticio
  "nombre": "string",
  "descripcion": "string",
  "pasos": [                       // exactamente dos pasos, ordenados
    { "orden": 1, "cultivoId": "string", "cicloId": "string" },
    { "orden": 2, "cultivoId": "string", "cicloId": "string" }
  ],
  "parametrosPuntuacion": [ ParametroPuntuacion ],
  "fuenteId": "string"             // respaldo de la definición de la estrategia
}
```

Reglas de forma:

- `pasos` debe contener **exactamente dos elementos**.
- `orden` debe ser `1` y `2`, sin duplicados; el orden es significativo (el paso 1 precede al paso 2).
- Cada `cultivoId` debe existir en `cultivos[]`.
- Cada `cicloId` debe existir y pertenecer al `cultivoId` del mismo paso.
- No se fija aquí si los dos cultivos deben ser distintos; si el equipo lo restringe, se registra como decisión (D13).
- La estrategia no describe etapas fenológicas.

### 2.6 `ParametroPuntuacion`

Los parámetros que alimentan la puntuación son **datos estructurados**, no texto libre. Cada parámetro debe incluir valor numérico, unidad y referencia a una fuente.

```jsonc
{
  "id": "string",                  // clave única dentro de la estrategia; su semántica la fija D7
  "valor": "number",               // obligatorio; cero es un valor válido, la ausencia no
  "unidad": "string",              // obligatorio; el motor no asume unidad por defecto
  "fuenteId": "string",            // obligatorio; debe existir en fuentes[]
  "notas": "string|null"
}
```

Regla de información esencial:

- Se consideran esenciales `id`, `valor` numérico finito, `unidad` no vacía y `fuenteId` existente.
- Si falta cualquiera de ellos, o el `valor` no es numérico, la puntuación que dependa de ese parámetro **no es calculable**.
- Una puntuación no calculable deja el resultado en `estado: "incompleto"` y se reporta con `null` más un motivo explícito (§6.2).
- Nunca se sustituye un valor ausente por `0` (`AGENTS.md`).
- La lista definitiva de parámetros, su semántica y su combinación en la puntuación están pendientes (D7). Este documento no inventa parámetros agronómicos.

### 2.7 `Opcion` y `OpcionMes`

Las opciones del formulario de finca forman parte del catálogo y se comparten entre frontend y motor.

```jsonc
// Opcion
{
  "valor": "string",               // valor interno enviado por el frontend y aceptado por el motor
  "etiqueta": "string"             // texto visible para la persona usuaria
}

// OpcionMes
{
  "valor": "number",               // 1–12
  "etiqueta": "string"             // p. ej. "Enero"
}
```

Regla: `valor` es el único token que viaja como dato agronómico; `etiqueta` es solo presentación. El frontend no debe enviar etiquetas y el motor no debe interpretarlas.

### 2.8 Reglas de integridad del catálogo

- `version` es obligatoria y no vacía.
- Toda `fuenteId` no nula referenciada debe existir en `fuentes[]`.
- `fuenteId` en `Ciclo` es obligatoria para `directa_local`, `extrapolada` y `parcial`; es `null` únicamente cuando `nivelEvidencia = "pendiente"` y no se dispone de fuente documental comprobada. En ningún caso se crea una `Fuente` ficticia.
- Todo `cultivoId`/`cicloId` de una estrategia debe existir; el ciclo debe pertenecer al cultivo del paso.
- `pasos` tiene exactamente dos elementos con `orden` 1 y 2.
- Los `id` de `parametrosPuntuacion` son únicos dentro de la estrategia.
- Todo `ParametroPuntuacion` tiene `valor` numérico finito, `unidad` no vacía y `fuenteId` existente en `fuentes[]`.
- Los `valor` de cada lista de `opcionesFinca` son únicos y no vacíos.
- `inicioMes`/`finMes` y `mesInicio` ∈ [1, 12].
- `duracionDias` es `null` o `{min, max}` con enteros positivos y `min <= max`; no se acepta `duracionMeses`.
- `ventanaSiembra` es `null` solo si `nivelEvidencia = "pendiente"`; si existe, `inicioMes <= finMes` en la v0.2.
- `alcanceGeografico` y `nivelEvidencia` cumplen estrictamente la matriz de coherencia de §2.4. `alcanceGeografico` es `null` solo si `nivelEvidencia` es `parcial` o `pendiente` y el alcance no se puede determinar.
- `localidad` es estrictamente `null` si y solo si `alcanceGeografico` es `"nacional"` o `null`; es obligatoria para `local`, `cantonal` y `regional`.
- `directa_local` exige `alcanceGeografico = "local"` y `localidad = "Liberia"`; `extrapolada` exige alcance `"cantonal"`, `"regional"` o `"nacional"` (nunca `"local"` ni `null`).
- Un ciclo no mezcla alcances ni localidades entre ventana y duración; si provienen de fuentes o alcances distintos, D22 debe resolverse antes de cargar datos reales.
- Un ciclo `parcial` o `pendiente` no es elegible para cálculo de puntuación ni puede producir recomendaciones ganadoras.
- El catálogo es **inmutable en tiempo de ejecución**: el motor lo recibe, no lo modifica.

---

## 3. Opciones del formulario de finca y vocabulario compartido

> El contrato (`contrato-api.md:39`) exige que **el catálogo defina** los valores de `suelo`, `drenaje` y `riego`, y prohíbe aceptar texto arbitrario como propiedad agronómica comprobada. Este apartado incorpora las opciones del formulario con **valor interno** y **etiqueta visible**. Las etiquetas son propuestas de interfaz; no son definiciones agronómicas.

### 3.1 Regla de vocabulario compartido

- El catálogo es la **única fuente** de opciones para el formulario «Mi finca».
- El frontend renderiza `etiqueta` y envía `valor`; el motor acepta únicamente `valor`.
- No se duplican listas fijas en el frontend ni en el motor: ambas partes consumen la misma versión del catálogo.
- Un valor fuera del catálogo produce entrada inválida, nunca una interpretación libre.
- `desconocido` es un valor explícito válido que significa «no se conoce»; no es ausencia de campo ni cero.

### 3.2 `suelo`

| `valor` | `etiqueta` propuesta | Origen | Estado |
|---|---|---|---|
| `desconocido` | No lo sé / Desconocido | `contrato-api.md` (ejemplo de entrada) | **Aprobado por contrato** |
| `arenoso` | Arenoso | propuesta | PROPUESTA PENDIENTE |
| `franco` | Franco | propuesta | PROPUESTA PENDIENTE |
| `arcilloso` | Arcilloso | propuesta | PROPUESTA PENDIENTE |
| `limoso` | Limoso | propuesta | PROPUESTA PENDIENTE |

> Las clases texturales requieren una **clasificación citada** antes de usarse; por ahora son solo tokens sin comportamiento agronómico asignado. Las etiquetas están pendientes de validación con Samuel.

### 3.3 `drenaje`

| `valor` | `etiqueta` propuesta | Origen | Estado |
|---|---|---|---|
| `desconocido` | No lo sé / Desconocido | `contrato-api.md` | **Aprobado por contrato** |
| `pobre` | Pobre | propuesta | PROPUESTA PENDIENTE |
| `moderado` | Moderado | propuesta | PROPUESTA PENDIENTE |
| `bueno` | Bueno | propuesta | PROPUESTA PENDIENTE |
| `excesivo` | Excesivo | propuesta | PROPUESTA PENDIENTE |

### 3.4 `riego`

| `valor` | `etiqueta` propuesta | Origen | Estado |
|---|---|---|---|
| `desconocido` | No lo sé / Desconocido | `contrato-api.md` | **Aprobado por contrato** |
| `secano` | Secano | propuesta | PROPUESTA PENDIENTE |
| `riego_apoyo` | Riego de apoyo | propuesta | PROPUESTA PENDIENTE |
| `riego_completo` | Riego completo | propuesta | PROPUESTA PENDIENTE |

### 3.5 `prioridad`

| `valor` | `etiqueta` propuesta | Origen | Estado |
|---|---|---|---|
| `equilibrio` | Equilibrio | `contrato-api.md:38` | **Aprobado por contrato** |
| `agua` | Agua | `contrato-api.md:38` | **Aprobado por contrato** |
| `suelo` | Suelo | `contrato-api.md:38` | **Aprobado por contrato** |

### 3.6 `mesInicio`

| `valor` | `etiqueta` propuesta | Origen | Estado |
|---|---|---|---|
| `1` | Enero | `contrato-api.md:38` (mes 1–12) | **Aprobado por contrato** |
| `2` | Febrero | idem | **Aprobado por contrato** |
| `3` | Marzo | idem | **Aprobado por contrato** |
| `4` | Abril | idem | **Aprobado por contrato** |
| `5` | Mayo | idem | **Aprobado por contrato** |
| `6` | Junio | idem | **Aprobado por contrato** |
| `7` | Julio | idem | **Aprobado por contrato** |
| `8` | Agosto | idem | **Aprobado por contrato** |
| `9` | Septiembre | idem | **Aprobado por contrato** |
| `10` | Octubre | idem | **Aprobado por contrato** |
| `11` | Noviembre | idem | **Aprobado por contrato** |
| `12` | Diciembre | idem | **Aprobado por contrato** |

> Las etiquetas de mes son texto de interfaz en español; no agregan semántica agronómica.

### 3.7 `cultivosAnteriores`

- Las opciones de `cultivosAnteriores` se derivan de `cultivos[]`: `valor` = `cultivoId`, `etiqueta` = `nombre` del cultivo.
- El formato definitivo (ids de cultivo frente a otro formato) sigue pendiente (D4).
- No se acepta texto libre como cultivo anterior.

### 3.8 Validación del vocabulario

- El motor **rechaza** cualquier valor fuera de las listas del catálogo. `desconocido` es un valor válido, no una ausencia.
- La lista definitiva se versiona junto al catálogo y se comparte con el frontend.
- Si el catálogo no está disponible, el formulario no debe recurrir a listas locales ni a texto libre; debe mostrar indisponibilidad.

---

## 4. Contrato de entrada del motor

### 4.1 Firma (función pura)

```text
motorSimular({ finca, clima, catalogo }) -> ResultadoSimulacion
```

- Sin acceso a red, sin Express, sin credenciales, sin lectura de archivos.
- Determinista: misma entrada ⇒ misma salida (salvo campos de marca temporal que se inyecten explícitamente).

### 4.2 `finca`

```jsonc
{
  "latitude": 9.93,          // [-90, 90]
  "longitude": -84.09,       // [-180, 180]
  "suelo": "desconocido",    // §3.2
  "drenaje": "desconocido",  // §3.3
  "riego": "desconocido",    // §3.4
  "cultivosAnteriores": [],  // PROPUESTA PENDIENTE: ids de cultivo (D4)
  "mesInicio": 5,            // [1, 12]; mes previsto para el primer ciclo de cultivo
  "prioridad": "equilibrio"  // §3.5
}
```

#### Semántica de `finca.mesInicio`: validación de entrada frente a compatibilidad por estrategia

Para evitar confusiones en la integración entre capas, se distinguen rigurosamente dos niveles de procesamiento:

1. **Validación del dato de entrada (Frontera del motor / Esquema):**
   - El motor valida únicamente que `mesInicio` sea un número entero en el rango `[1, 12]`.
   - Si el valor falta, no es entero o está fuera de `1–12`, la entrada es **inválida** y se rechaza antes de simular (error de validación de entrada). Esto **no produce un `ResultadoSimulacion`**.
   - **En la entrada NO se comprueba si el mes cae dentro de la ventana de siembra de algún cultivo o ciclo**, porque las ventanas pertenecen a los ciclos específicos del catálogo y varían por estrategia. La finca no tiene un único ciclo asignado a priori.

2. **Compatibilidad agronómica y temporal por estrategia (Motor de simulación):**
   - Una vez admitida la entrada, el motor evalúa cada estrategia individualmente contra el `mesInicio` provisto.
   - Para cada estrategia candidata, se consulta la ventana de siembra del ciclo de su primer paso (`pasos[0]`):
     - Si la ventana es conocida (`ventanaSiembra != null`) y `mesInicio` se encuentra dentro del rango `[inicioMes, finMes]`, la estrategia es temporalmente admisible para iniciar en ese mes.
     - Si la ventana es conocida y `mesInicio` se encuentra **fuera** de `[inicioMes, finMes]`, la estrategia es incompatible temporalmente con la fecha deseada de la finca. La estrategia se marca como `elegible: false` y se registra el motivo de descarte en `motivosDescarte`.
     - Si la ventana del primer ciclo es desconocida (`ventanaSiembra: null`), la compatibilidad temporal de la estrategia resulta `no_evaluable`.
   - **Sin códigos de error inventados:** El nombre de trabajo preliminar `MES_INICIO_FUERA_DE_VENTANA` mencionado en borradores previos es **únicamente un identificador ilustrativo de trabajo, no un código aprobado ni definitivo**. No se inventan códigos definitivos de error de API ni identificadores normativos de descarte; los códigos y textos finales quedan sujetos al acuerdo de las decisiones D5 y D10 entre Hellen, Alex y Samuel.

Validación general de entrada (entrada inválida ⇒ rechazo antes de simular; no produce `ResultadoSimulacion`):

- Tipos numéricos y rangos de coordenadas (`latitude` en `[-90, 90]`, `longitude` en `[-180, 180]`).
- `mesInicio` entero en `[1, 12]`.
- Valores de `suelo`, `drenaje`, `riego` y `prioridad` dentro del vocabulario controlado del catálogo.
- `cultivosAnteriores` conforme al formato que se apruebe (D4).

> El ejemplo de coordenadas `9.93 / -84.09` proviene del contrato y es **ilustrativo, no una finca validada**.

### 4.3 `clima`

Ver §5. El motor no obtiene clima: lo recibe ya normalizado por Alex.

### 4.4 `catalogo`

Ver §2. El motor no construye el catálogo: lo recibe.

### 4.5 Precedencia de estados

1. **Entrada inválida** (esquema o vocabulario) ⇒ se rechaza antes de simular; no produce `ResultadoSimulacion`.
2. **Datos esenciales faltantes** ⇒ `estado: "incompleto"`. Prevalece sobre `sin_opciones`, porque no se pueden evaluar todas las restricciones.
3. **Sin estrategias elegibles**, con datos esenciales disponibles ⇒ `estado: "sin_opciones"`.
4. **Datos suficientes, al menos una estrategia elegible y todas las elegibles con puntuaciones calculables en todos los escenarios** ⇒ `estado: "completo"`.
5. **`demo`** es un modo explícito para verificar el algoritmo con la matriz ficticia; no se deriva de datos reales.

> La forma en que `indeterminada`, `no_evaluable`, `parcial` y `pendiente` se asignan a estos estados queda pendiente en D10; no se crean estados nuevos en v0.3.

---

## 5. Contrato climático para Alex

> El contrato exige que **Hellen defina la estructura de `clima`** antes de que Alex agregue datos (`contrato-api.md:60`). Lo siguiente es esa definición. **PROPUESTA PENDIENTE DE CONFIRMACIÓN TÉCNICA DE ALEX** en los detalles marcados en §5.6.

### 5.1 Objeto `clima`

```jsonc
{
  "coordenadas": {
    "solicitadas": { "latitude": 9.93, "longitude": -84.09 },
    "devueltas":   { "latitude": 9.93, "longitude": -84.09 }   // pueden diferir (rejilla del proveedor)
  },
  "periodo": { "inicio": "YYYYMMDD", "fin": "YYYYMMDD" },
  "resolucion": "diaria",                 // la primera versión exige resolución diaria
  "variables": {
    "precipitacion": { SerieDiaria },     // obligatoria
    "temperaturaMedia": { SerieDiaria },  // obligatoria
    "temperaturaMaxima": { SerieDiaria }  // obligatoria
  },
  "fuentes": [ FuenteClimatica ]          // ver §5.3
}
```

### 5.2 `SerieDiaria`

Cada variable requerida debe entregarse como serie diaria con su propia unidad, fechas, procedencia y cobertura.

```jsonc
{
  "unidad": "string",                    // obligatoria; valor canónico a confirmar con Alex
  "fechas": { "inicio": "YYYYMMDD", "fin": "YYYYMMDD" },
  "procedencia": "live|backup",          // obligatoria por variable
  "fechaConsulta": "ISO-8601",           // cuándo se obtuvo el dato
  "fuenteId": "string",                  // referencia a fuentes[]
  "cobertura": {
    "diasEsperados": "number",
    "diasPresentes": "number",
    "porcentaje": "number",
    "faltantes": [ "YYYYMMDD" ]          // fechas ausentes, explícitas
  },
  "serie": [
    { "fecha": "YYYYMMDD", "valor": "number|null" }
  ]
}
```

Reglas:

- Las tres variables —`precipitacion`, `temperaturaMedia` y `temperaturaMaxima`— son **obligatorias**.
- La serie debe cubrir el período declarado. Los días sin dato se representan con `valor: null` y se listan en `cobertura.faltantes`; no se omiten en silencio.
- No se rellena un hueco con `0`.
- La unidad es obligatoria por variable; el motor no asume unidades por defecto.
- La procedencia es obligatoria por variable; si es `backup`, se indica la antigüedad en la fuente correspondiente.
- La cobertura es por variable, porque un proveedor puede entregar una variable con más huecos que otra.

### 5.3 `FuenteClimatica` (alineada con `contrato-api.md:67`)

```jsonc
{
  "id": "string",
  "proveedor": "string",
  "urlConsulta": "string",        // sin secretos
  "coordenadasSolicitadas": { "latitude": "number", "longitude": "number" },
  "coordenadasDevueltas": { "latitude": "number", "longitude": "number" },
  "periodo": { "inicio": "YYYYMMDD", "fin": "YYYYMMDD" },
  "unidades": {
    "precipitacion": "string",
    "temperaturaMedia": "string",
    "temperaturaMaxima": "string"
  },
  "fechaConsulta": "ISO-8601",
  "cobertura": { "porcentaje": "number" },
  "origen": "live|backup",
  "antiguedad": "string|null"      // requerido si origen = backup
}
```

### 5.4 Requisitos mínimos del motor

- **Variables:** precipitación diaria, temperatura media diaria y temperatura máxima diaria.
- **Unidades explícitas** por variable.
- **Fechas explícitas** de inicio y fin, tanto globales como por variable.
- **Procedencia explícita** por variable: `live` o `backup`; si es `backup`, antigüedad.
- **Cobertura explícita** por variable: días esperados, presentes, porcentaje y fechas faltantes.
- **Trazabilidad:** cada variable referencia una `fuenteId` y cada fuente conserva coordenadas, período, unidades y fecha de consulta.

Si falta una variable, su unidad, sus fechas, su procedencia o su cobertura, el resultado es **`incompleto`**, con el motivo correspondiente. No se asume que las tres variables provengan del mismo proveedor ni que tengan la misma cobertura.

### 5.5 Responsabilidad sobre ventanas y escenarios

**PROPUESTA PENDIENTE DE CONFIRMACIÓN TÉCNICA DE ALEX.**

- Las **ventanas de cultivo** las calcula el motor de dominio a partir de `Ciclo.ventanaSiembra`, `Ciclo.duracionDias`, `finca.mesInicio`, `Ciclo.nivelEvidencia` y el catálogo, aplicando D17–D21 (§10.1–§10.5).
- Si `ventanaSiembra` o `duracionDias` es `null`, la estrategia no es evaluable; no se sustituye por cero ni por un valor supuesto.
- Si `nivelEvidencia` es `parcial` o `pendiente`, el ciclo no se puntúa aunque sus valores estén presentes; la falta de fuente o la evidencia incompleta no se compensa con un valor supuesto (D19).
- Los **escenarios hipotéticos** (`habitual`, `seco`, `humedo`) los define y aplica el motor de dominio (D6).
- Alex entrega **series diarias normalizadas y metadatos**; no necesita precalcular ventanas por cultivo ni escenarios.
- Esto difiere de la frase ilustrativa de `contrato-api.md:60` («Alex agregue datos por ventanas de cultivo»). La diferencia se registra en §9 y requiere acuerdo.

### 5.6 Detalles de integración que requieren confirmación técnica de Alex

| # | Detalle | Por qué requiere confirmación |
|---|---|---|
| C1 | Unidad canónica y conversión de `precipitacion`, `temperaturaMedia` y `temperaturaMaxima` | El motor no asume unidades; hay que fijar el contrato exacto del proveedor. |
| C2 | Convención de datos ausentes (`null`, campo omitido o centinela) | Evitar confundir ausencia con cero; la serie debe ser inequívoca. |
| C3 | Zona horaria y límite del día para asignar `fecha` | Un desplazamiento de día cambia la ventana y la cobertura. |
| C4 | Disponibilidad diaria real de `temperaturaMaxima` | No se asume que el proveedor entregue las tres variables con la misma resolución. |
| C5 | Fórmula de `cobertura` (días esperados, presentes, porcentaje) | Debe ser consistente entre proveedor, caché y respaldo. |
| C6 | Coordenadas devueltas, rejilla e interpolación | El punto solicitado puede no coincidir con el píxel devuelto. |
| C7 | Forma del payload y nombres de campo de `GET /api/climate/history` | El contrato propuesto no fija el sobre HTTP ni los nombres exactos. |
| C8 | Series continuas, paginadas o por lotes | El motor espera una serie diaria completa por variable. |
| C9 | Múltiples fuentes por variable | Hay que definir cómo se combinan sin romper la trazabilidad. |
| C10 | Antigüedad máxima aceptable de un `backup` | Es una decisión de producto y operación, no del dominio. |
| C11 | Formato de fechas (`YYYYMMDD` frente a ISO-8601) en la frontera HTTP | El contrato usa `YYYYMMDD` en la consulta; la normalización interna debe acordarse. |

Ninguno de estos detalles fija valores agronómicos; son acuerdos de integración.

### 5.7 Lo que el motor NO hace con el clima

- No obtiene datos por red; recibe el objeto `clima`.
- No convierte pronóstico en historial ni en escenario de toda una temporada.
- No trata un pronóstico antiguo como aviso actual.
- No rellena huecos con ceros (ver §8).
- No inventa unidades ni asume una por defecto.

---

## 6. Contrato de salida y evidencia

> Alineado con `contrato-api.md:43-56`. Los valores del ejemplo del contrato son **ficticios**.

### 6.1 `ResultadoSimulacion`

```jsonc
{
  "estado": "completo|incompleto|sin_opciones|demo",
  "escenarios": [ "habitual", "seco", "humedo" ],
  "resultados": [
    {
      "estrategiaId": "string",
      "elegible": true,
      "puntajes": { "habitual": "number|null", "seco": "number|null", "humedo": "number|null" },
      "peorArrepentimiento": "number|null",
      "motivoPeorArrepentimiento": "string|null",
      "motivosNoCalculable": { "habitual": "string|null", "seco": "string|null", "humedo": "string|null" },
      "motivosDescarte": [ "string" ]
    }
  ],
  "descartes": [
    { "estrategiaId": "string", "motivos": [ "string" ] }
  ],
  "ganadoras": [ "string" ],
  "explicacion": "string",
  "evidencia": {
    "origen": "demo|live|backup",
    "fuentes": [ "Fuente" ],
    "supuestos": [ "string" ],
    "datosFaltantes": [ "string" ],
    "motorVersion": "string",
    "catalogoVersion": "string",
    "reglasVersion": "string",
    "pesos": { },
    "escenarios": { }
  }
}
```

- `resultados[].motivosDescarte` es la fuente de verdad de los descartes.
- `descartes` es un resumen derivado para lectura rápida; debe ser consistente con `resultados[]` y queda vacío si no hay descartes.
- `motivosNoCalculable` puede omitir las claves cuyo valor sea calculable; si se incluyen, usan `null`.
- `motivoPeorArrepentimiento` explica por qué `peorArrepentimiento` es `null`.

#### Relación entre compatibilidad temporal, niveles de evidencia y `ResultadoSimulacion`

El contrato propuesto articula las evaluaciones de ciclo y estrategia con el resultado de simulación respetando la precedencia de estados y sin añadir campos públicos definitivos no acordados:

1. **Estrategia con compatibilidad temporal `compatible`:**
   - Si ambos ciclos cuentan con evidencia `directa_local` o `extrapolada` y los parámetros requeridos están disponibles, la estrategia es `elegible: true` y sus puntajes se calculan numéricamente en todos los escenarios.
   - Si la evidencia de alguno de los ciclos es `extrapolada`, la estrategia es calculable y elegible, pero debe acompañarse de advertencia de alcance geográfico; la vía de reporte se define en D10.

2. **Estrategia con compatibilidad temporal `incompatible`:**
   - La secuencia temporal no es viable (el ciclo 1 se solapa con el ciclo 2, o `finca.mesInicio` está fuera de la ventana del primer ciclo).
   - Se representa en `ResultadoSimulacion` con `elegible: false` y un motivo descriptivo en `resultados[].motivosDescarte` (así como en el resumen derivado `descartes[]`).
   - No invalida la simulación de otras estrategias; si ninguna resulta elegible y no faltan datos esenciales, el estado global es `sin_opciones`.

3. **Estrategia con compatibilidad temporal `indeterminada`:**
   - La secuencia temporal no puede confirmarse ni descartarse debido a la amplitud del rango `{min, max}` o a la granularidad mensual (D18).
   - Una estrategia indeterminada **no puede producir ganadoras ni recomendarse**.
   - No se inventan puntuaciones ni probabilidades. La opción de registrarla como descarte en `motivosDescarte` frente a valor no calculable en `motivosNoCalculable` queda como mapeo pendiente en D10.

4. **Estrategia con compatibilidad temporal `no_evaluable` o ciclos con evidencia `parcial` / `pendiente`:**
   - Si a un ciclo le falta `ventanaSiembra` o `duracionDias` (`no_evaluable`), o si carece de fuente comprobada (`nivelEvidencia = "pendiente"` o `"parcial"`), la estrategia **no puede ser puntuada ni declarada ganadora**.
   - En `ResultadoSimulacion`, los puntajes afectados se reportan como `null` con su motivo en `motivosNoCalculable`.
   - Si faltan datos esenciales para evaluar las estrategias de la simulación, el estado global es `incompleto` y las ausencias se declaran en `evidencia.datosFaltantes`.

> **Límite de contrato público (Pendiente D10):** No se añaden campos definitivos al contrato público de `ResultadoSimulacion` en esta revisión v0.3. Las opciones de representación formal (reutilizar `elegible`/`motivosDescarte`/`motivosNoCalculable`, incorporar metadatos opcionales o resolver advertencias en la interfaz mediante consulta al catálogo) se registran en D10 (§10.8) y requieren acuerdo formal de Hellen, Alex y Samuel.

### 6.2 Puntuaciones y valores no calculables

- La puntuación es un número en `[0, 100]`; **mayor es mejor** (decisión acordada, §0.3).
- Una puntuación no calculable se representa como **`null`** acompañada de un **motivo explícito** en `motivosNoCalculable`.
- `peorArrepentimiento` también puede ser `null`, con su motivo en `motivoPeorArrepentimiento`, cuando no hay matriz completa.
- Nunca se usa `0` para representar un dato ausente (`AGENTS.md`).
- La normalización de indicadores a la escala `0–100` forma parte de las reglas de puntuación (D7); no se fija aquí.
- Si falta un parámetro esencial (valor, unidad o fuente) o una variable climática requerida, la puntuación afectada no es calculable y el resultado queda **`incompleto`**.

### 6.3 Estados de simulación

| Estado | Datos esenciales | Estrategias elegibles | `ganadoras` |
|---|---|---|---|
| `completo` | Completos | Al menos una; todas las elegibles con puntuaciones calculables en todos los escenarios | No vacío |
| `incompleto` | Falta al menos uno | No se puede determinar por completo | Vacío; puede haber resultados parciales con `null` + motivo |
| `sin_opciones` | Completos | Ninguna satisface las restricciones conocidas | Vacío |
| `demo` | Ficticios, completos por construcción | Matriz de prueba | Según la matriz ficticia |

Regla de distinción:

- **`incompleto`**: faltan datos esenciales. No se fuerza ganador.
- **`sin_opciones`**: los datos esenciales están disponibles, pero **ninguna estrategia satisface las restricciones conocidas**. No se fuerza ganador.
- Si faltan datos esenciales **y además** no hay estrategias elegibles, prevalece `incompleto`; no se declara `sin_opciones` sobre una evaluación incompleta.
- **No forzar ganador** si no hay opciones elegibles o faltan datos esenciales (`contrato-api.md:70`).
- La forma en que `indeterminada`, `no_evaluable`, `parcial` y `pendiente` se reflejan en `estado`, `motivosDescarte` o `motivosNoCalculable` queda pendiente en D10; no se fija en v0.3.

### 6.4 Motivos de descarte

- Toda estrategia con `elegible: false` debe incluir al menos un motivo en `motivosDescarte`.
- El motivo explica qué restricción conocida no se cumplió. Los códigos y textos definitivos dependen de las reglas de elegibilidad (D5).
- `MES_INICIO_FUERA_DE_VENTANA` (D21) es un nombre de trabajo; su código y texto definitivos dependen de D5.
- Las estrategias descartadas permanecen en `resultados[]` con `elegible: false` y se excluyen del cálculo minimax regret.
- Un descarte no es lo mismo que un valor no calculable: el descarte indica que la estrategia no cumple una restricción; el valor no calculable indica que falta información para puntuar.

### 6.5 `ganadoras`

- Es un **array** para admitir empates.
- Vacío cuando el estado es `incompleto` o `sin_opciones`.
- En `demo`, contiene el resultado de la matriz ficticia y no constituye una recomendación real.

### 6.6 Evidencia

- Debe guardar **reglas, pesos y versión del catálogo** junto al resultado (`contrato-api.md:68`).
- `origen` distingue `demo` / `live` / `backup`.
- Si hay `backup`, se indica su antigüedad; un respaldo válido debe indicarlo.
- `datosFaltantes` enumera explícitamente lo ausente (variables, parámetros, cobertura); no se oculta.
- `supuestos` declara los escenarios hipotéticos y cualquier regla aplicada.
- La evidencia debe permitir reconstruir por qué se descartó una estrategia y por qué un puntaje no fue calculable.

---

## 7. Definición matemática de minimax regret

### 7.1 Notación

- Estrategias elegibles: `S = {s₁, …, sₙ}` (tras aplicar elegibilidad).
- Escenarios: `E = {e₁, …, eₘ}`; por defecto `E = {habitual, seco, humedo}`.
- Puntuación: `score(s, e) ∈ [0, 100]`, **mayor es mejor** (decisión acordada, §0.3).
- Solo se consideran estrategias con `elegible = true` y con puntuación calculable en **todos** los escenarios.
- Si alguna estrategia elegible tiene una puntuación no calculable en algún escenario, el resultado es `incompleto` y no se declara ganadora.

### 7.2 Sin supuestos probabilísticos

Minimax regret **no requiere probabilidades** y **no supone que los escenarios sean equiprobables**.

- `E` es un conjunto de escenarios hipotéticos, no una variable aleatoria.
- No se asigna `P(e)` ni se calcula un valor esperado.
- El criterio solo usa el máximo arrepentimiento por estrategia y el mínimo entre estrategias; es invariante a cualquier asignación de probabilidades.
- Los escenarios `habitual`, `seco` y `humedo` son hipótesis de trabajo (D6), no pronósticos.
- Si en el futuro se introducen probabilidades, se trataría de **expected regret**, un criterio distinto que debe nombrarse y aprobarse explícitamente; no debe presentarse como minimax.
- La `prioridad` de la finca afecta la construcción de la puntuación (D7), no la probabilidad de los escenarios.

### 7.3 Arrepentimiento (regret)

Para cada par (estrategia, escenario), el arrepentimiento es la diferencia respecto al mejor puntaje alcanzable en ese escenario:

```text
r(s, e) = max_{s' ∈ S} score(s', e) − score(s, e)
```

`r(s, e) ≥ 0` siempre; mide cuánto se pierde por elegir `s` si ocurre `e`.

### 7.4 Peor arrepentimiento y decisión

```text
R(s) = max_{e ∈ E} r(s, e)
R* = min_{s ∈ S} R(s)
ganadoras = { s ∈ S : R(s) = R* }
```

- `R(s)` es el `peorArrepentimiento` reportado por estrategia.
- `ganadoras` puede tener **más de un elemento** (empates).
- Si `S = ∅` ⇒ `estado: "sin_opciones"`, `ganadoras: []`.
- Si falta información esencial para completar la matriz ⇒ `estado: "incompleto"`, `ganadoras: []`.

### 7.5 Comprobación con la matriz ficticia del contrato

Matriz de puntajes (ficticia, `contrato-api.md:48-50`; se mantiene por decisión del equipo):

| Estrategia | habitual | seco | humedo |
|---|---|---|---|
| A | 90 | 35 | 55 |
| B | 75 | 80 | 50 |
| C | 80 | 70 | 75 |

Máximos por escenario:

```text
habitual = 90,  seco = 80,  humedo = 75
```

Arrepentimientos `r(s, e)`:

| Estrategia | habitual | seco | humedo | R(s) = max |
|---|---|---|---|---|
| A | 90−90 = 0 | 80−35 = 45 | 75−55 = 20 | **45** |
| B | 90−75 = 15 | 80−80 = 0 | 75−50 = 25 | **25** |
| C | 90−80 = 10 | 80−70 = 10 | 75−75 = 0 | **10** |

Decisión:

```text
R* = min(45, 25, 10) = 10  ⇒  ganadoras = ["C"]
```

**Coincide con el contrato:** `peorArrepentimiento` = 45 / 25 / 10 y `ganadoras: ["C"]`.

> Este cálculo es una **verificación del algoritmo con datos ficticios**, no una recomendación agrícola ni una predicción de rendimiento o supervivencia.

### 7.6 Variantes pendientes de aprobación

- Cómo incorporar `prioridad` (equilibrio/agua/suelo) en la construcción de la puntuación (D7).
- Qué parámetros de puntuación existen, cómo se normalizan a `0–100` y cómo se combinan (D7).
- Definición de los escenarios `habitual`, `seco` y `humedo` (D6).
- Si en el futuro se usara un criterio probabilístico, definirlo como **expected regret** y no como minimax.

La dirección de la puntuación ya está acordada: `0–100`, mayor es mejor. No se prevé invertirla en la primera versión.

---

## 8. Política de datos faltantes

1. **Desconocido ≠ 0.** Un dato ausente nunca se sustituye por cero.
2. **Puntaje no calculable ⇒ `null` + motivo** (§6.2). Nunca un número inventado.
3. **Datos esenciales ausentes ⇒ `estado: "incompleto"`**; no se fuerza ganador.
4. **Datos esenciales disponibles y ninguna estrategia elegible ⇒ `estado: "sin_opciones"`**; `ganadoras: []`.
5. **Cobertura climática parcial:** se reporta `cobertura.faltantes` por variable con las fechas ausentes.
6. **Respaldo (`backup`):** se marca `origen: "backup"` y su `antiguedad`. Un pronóstico antiguo no genera avisos actuales.
7. **Separar indisponibilidad de ausencia de riesgo:** «no hay datos» y «no hay riesgo» son resultados distintos.
8. **Estrategia no elegible:** se incluye en `resultados` con `elegible: false` y `motivosDescarte`, pero se excluye del cálculo minimax regret.
9. **Parámetro incompleto:** si falta `valor`, `unidad` o `fuenteId` de un parámetro esencial, la puntuación dependiente es `null` y el estado es `incompleto`.
10. **Variable climática incompleta:** si falta una de las tres variables requeridas o su cobertura, el estado es `incompleto` y se enumera en `datosFaltantes`.
11. **Diferencia entre motivos:** `motivosDescarte` explica una restricción incumplida; `motivosNoCalculable` explica información faltante. No se mezclan.

---

## 9. Diferencias con `docs/contrato-api.md`

> Este documento **no modifica** `docs/contrato-api.md`. Las siguientes diferencias se registran para que el equipo decida si actualiza el contrato.

| # | `docs/contrato-api.md` | Este documento | Tipo | Acción propuesta |
|---|---|---|---|---|
| A1 | `GET /api/catalog` propone `{cultivos, estrategias, version, fuentes}` (`:17`). | Añade `opcionesFinca`, `generado` y `localidadPiloto` (§2.1). | Adición de forma externa. | Acordar con Alex y Samuel antes de exponerlos. |
| A2 | La entrada `finca` no fija el formato de `cultivosAnteriores` (`:31`). | Sigue pendiente; se propone derivarlo de `cultivos[]` (§3.7, D4). | Sin conflicto; decisión abierta. | Cerrar D4. |
| A3 | La salida no incluye motivos de descarte ni de no calculable (`:43-56`). | Añade `motivosDescarte`, `motivosNoCalculable` y `descartes` (§6.1). | Adición de salida. | Acordar con Alex; es compatible con los campos existentes. |
| A4 | La salida muestra puntajes numéricos; no fija escala ni dirección. | Fija `0–100`, mayor es mejor (decisión acordada, §0.3). | Formalización. | Registrar en el contrato cuando el equipo lo apruebe. |
| A5 | `contrato-api.md:60` dice que Alex agregaría datos «por ventanas de cultivo». | Las ventanas y los escenarios los calcula el motor; Alex entrega series diarias y metadatos (§5.5). | Cambio de responsabilidad. | **Requiere confirmación técnica de Alex.** |
| A6 | No enumera las variables climáticas mínimas; pide «series y agregados, con unidades y metadatos» (`:18`). | Exige precipitación, temperatura media y temperatura máxima diarias, con unidad, fechas, procedencia y cobertura por variable (§5). | Especialización. | Confirmar viabilidad con Alex (§5.6). |
| A7 | La estrategia solo aparece como `estrategiaId` en el ejemplo (`:48-50`). | Define `pasos` de dos ciclos y `parametrosPuntuacion` estructurados (§2.5–§2.6). | Contrato interno del catálogo. | Acordar con Alex y Samuel; no cambia el ejemplo ficticio. |
| A8 | Estados `completo/incompleto/sin_opciones/demo` (`:64`). | Se mantienen y se refinan sus definiciones (§6.3). | Compatible. | Ninguna. |
| A9 | `prioridad` con `equilibrio/agua/suelo` (`:38`). | Se mantiene y se añaden etiquetas visibles (§3.5). | Compatible; adición de UI. | Validar etiquetas con Samuel. |
| A10 | No hay endpoints ni código en este documento. | Sin cambios de código, rutas, controladores ni servicios. | Sin efecto técnico. | Ninguna. |
| A11 | `contrato-api.md` no detalla el esquema de `Ciclo`. | Se propone `Ciclo` v0.2 con `duracionDias`, `alcanceGeografico`, `localidad` y `nivelEvidencia` (§2.4). | Adición al contrato interno del catálogo. | Acordar con Alex y Samuel antes de exponerlo. |

---

## 10. Decisiones: estado y responsables

| # | Decisión | Responsable | Estado |
|---|---|---|---|
| D1 | Localidad piloto y su fuente | Hellen + equipo | PENDIENTE |
| D2 | Lista de cultivos y ciclos con fuentes citadas | Hellen | PENDIENTE |
| D3 | Vocabulario definitivo de `suelo`/`drenaje`/`riego` y su semántica | Hellen (acordar con Alex y Samuel) | PENDIENTE |
| D4 | Formato de `cultivosAnteriores` (ids frente a otro formato) | Hellen + Samuel | PENDIENTE |
| D5 | Reglas de elegibilidad de estrategias y catálogo de motivos de descarte | Hellen | PENDIENTE |
| D6 | Definición de escenarios `habitual`/`seco`/`humedo` (umbrales) | Hellen | PENDIENTE |
| D7 | Pesos, indicadores, parámetros de puntuación y normalización a `0–100` | Hellen | PENDIENTE |
| D8 | Escala `0–100` y dirección «mayor es mejor» | Equipo | **ACORDADO** (§0.3) |
| D9 | Estructura de `clima` con series diarias por variable | Hellen (confirmación de Alex) | PROPUESTA; pendiente de Alex |
| D10 | Formato de `motivosNoCalculable`, `motivosDescarte`, `descartes` y representación de estados/evidencia en `ResultadoSimulacion` | Hellen + Alex | PROPUESTO; pendiente de Alex; campos públicos requieren acuerdo con Samuel |
| D11 | Dependencias de backend (si se requieren) | Alex | A definir |
| D12 | Uso de etapas fenológicas en la primera versión | Equipo | **ACORDADO: no se usan** (§0.3) |
| D13 | Si los dos cultivos de una estrategia deben ser distintos | Hellen + equipo | PENDIENTE |
| D14 | Exponer `opcionesFinca` en `GET /api/catalog` | Alex + Samuel | PENDIENTE (adición al contrato) |
| D15 | Validación de etiquetas visibles del formulario | Samuel + Hellen | PENDIENTE |
| D16 | Confirmación técnica de los detalles C1–C11 de §5.6 | Alex | PENDIENTE |
| D17 | Representación canónica de duración: `duracionDias` con rango `{min, max}` o `null` | Hellen + Alex | DEFINIDA A NIVEL DE DISEÑO; PROPUESTA PENDIENTE DE RATIFICACIÓN |
| D18 | Compatibilidad temporal entre ciclos: estados `compatible`/`incompatible`/`indeterminada`/`no_evaluable` | Hellen + Alex | DEFINIDA A NIVEL DE DISEÑO; PROPUESTA PENDIENTE DE RATIFICACIÓN |
| D19 | Alcance geográfico y etiquetado de evidencia (`alcanceGeografico`, `localidad`, `nivelEvidencia`) | Hellen + Alex + Samuel | DEFINIDA A NIVEL DE DISEÑO; PROPUESTA PENDIENTE DE RATIFICACIÓN |
| D20 | Criterios para confirmar ventanas de siembra; ninguna ventana del piloto está confirmada aún | Hellen + equipo | DEFINIDA A NIVEL DE DISEÑO; PROPUESTA PENDIENTE DE RATIFICACIÓN |
| D21 | Rol de `finca.mesInicio`: mes del primer ciclo, dentro de su ventana; no desplaza los demás ciclos | Hellen + Alex | DEFINIDA A NIVEL DE DISEÑO; PROPUESTA PENDIENTE DE RATIFICACIÓN |
| D22 | Trazabilidad cuando la ventana y la duración provienen de fuentes o alcances distintos | Hellen + Alex + Samuel | PENDIENTE |

> Ninguna de estas decisiones debe cerrarse sin fuente citada (D1–D3, D6–D7) ni sin acuerdo del equipo (D4, D8–D10, D13–D15).

> **D17–D21** están definidas a nivel de diseño en §10.1–§10.5. No están implementadas ni ratificadas por el equipo; la ratificación final corresponde a Hellen, Alex y Samuel, mientras que la columna Responsable indica quién lidera la propuesta. **D10** (§10.8) documenta el mapeo de compatibilidad temporal y evidencia en la salida sin alterar el contrato público, y permanece como propuesta pendiente de acuerdo con Alex y Samuel. **D22** sigue pendiente. Las rotaciones A, B y C no están validadas (§2.4.1, §10.6).

### 10.1 D17 — Representación de duración

**Decisión:** `Ciclo.duracionDias` es la única fuente de verdad; `duracionMeses` se elimina en la v0.2.

**Reglas:**

- `duracionDias` es `{ min, max }` o `null`.
- `min` y `max` son enteros positivos; `min <= max`. Un valor exacto usa `min = max`.
- `null` significa desconocido; nunca `0`.
- No se aceptan fracciones, negativos ni conversión automática de meses a días.
- Si la fuente solo expresa meses, se usa `null` y se conserva la expresión original en `Fuente.notas`.
- El rango se copia tal como la fuente; no se usa el punto medio.
- La UI puede derivar meses solo para visualización, marcados como aproximados; el motor no los usa.

**Limitaciones:**

- Un rango amplio puede producir compatibilidad `indeterminada` (D18).
- `null` impide evaluar y puntuar el ciclo.
- No se inventa un máximo agronómico; el validador solo exige entero positivo y orden.
- Requiere ratificación final del equipo (Hellen, Alex y Samuel) antes de cambiar el contrato o el validador; la revisión técnica la lideran Hellen + Alex.

### 10.2 D18 — Compatibilidad temporal entre ciclos

**Decisión:** evaluar la secuencia en días y devolver `compatible`, `incompatible`, `indeterminada` o `no_evaluable`.

**Reglas:**

- `finca.mesInicio` fija el mes del primer ciclo (D21).
- El primer ciclo empieza entre el primer y el último día de ese mes.
- El segundo ciclo empieza entre el primer día de `inicioMes` y el último día de `finMes` de su ventana.
- `bufferDias = 0` en la v0.2; no se inventa un colchón agronómico.
- Fechas inclusivas: `fin = inicio + duracionDias - 1`.
- El segundo ciclo empieza, como mínimo, en `fin + 1 + bufferDias`.
- No se soportan ventanas que crucen año en la v0.2.

**Fórmulas:**

```text
finMin = primerDia(mesInicio) + duracionDias.min - 1
finMax = ultimoDia(mesInicio) + duracionDias.max - 1
inicio2Min = primerDia(ventana2.inicioMes)
inicio2Max = ultimoDia(ventana2.finMes)

compatible    si finMax + bufferDias < inicio2Min
incompatible  si finMin + bufferDias >= inicio2Max
indeterminada en otro caso
no_evaluable  si falta duracionDias o ventanaSiembra
```

**Limitaciones:**

- `indeterminada` no es un fallo: expresa que la granularidad mensual no permite afirmar más.
- `indeterminada` y `no_evaluable` no se puntúan ni pueden producir ganadoras. La falta de fuente no cambia el cálculo temporal; si `nivelEvidencia` es `parcial` o `pendiente`, D19 impide puntuar.
- La representación de estos estados en `ResultadoSimulacion` queda pendiente en D10; no se añade un campo público definitivo en v0.3.
- No evalúa clima; solo secuencia y duración. El clima se evalúa en D6/D7.
- Requiere ratificación final del equipo (Hellen, Alex y Samuel); la revisión técnica la lideran Hellen + Alex.

### 10.3 D19 — Alcance geográfico y etiquetado de evidencia

**Decisión:** cada `Ciclo` declara `alcanceGeografico`, `localidad` y `nivelEvidencia`.

**Valores:**

- `alcanceGeografico`: `local` (Liberia), `cantonal` (otro cantón de Chorotega), `regional` (Chorotega), `nacional` (Costa Rica), o `null` si `nivelEvidencia` es `parcial`/`pendiente` y el alcance no se puede determinar.
- `localidad`: obligatoria para `local`, `cantonal` y `regional`; `null` para `nacional` o cuando `alcanceGeografico` es `null`.
- `nivelEvidencia`: `directa_local`, `extrapolada`, `parcial`, `pendiente`.

**Reglas de coherencia:**

- `directa_local`: ventana y duración verificadas con fuente consultada directamente, `alcanceGeografico = "local"` y `localidad = "Liberia"` (D1 pendiente). No admite ningún otro alcance ni localidad, ni valores nulos. `fuenteId` obligatorio.
- `extrapolada`: ambas verificadas, pero con `alcanceGeografico` en `cantonal`, `regional` o `nacional` (prohibido `"local"` y prohibido `null`); `localidad` obligatoria para cantonal y regional, y estrictamente `null` para nacional. `fuenteId` obligatorio.
- `parcial`: al menos un valor proviene de índice/snippet, la fuente solo cubre parte del valor o no lo aborda específicamente. Valores no nulos (si alguno es `null`, pasa a `pendiente`). `alcanceGeografico` puede ser local, cantonal, regional, nacional, o `null` si no se puede determinar. `localidad` obligatoria para local/cantonal/regional, y `null` para nacional o si el alcance es `null`. `fuenteId` obligatorio referenciando la fuente parcial.
- `pendiente`: al menos un valor (`ventanaSiembra` o `duracionDias`) es `null` o carece de fuente comprobada. `alcanceGeografico` puede ser local, cantonal, regional, nacional, o `null` si no se puede determinar. `localidad` sigue la regla general (obligatoria para local/cantonal/regional; `null` para nacional o alcance `null`). `fuenteId` es `null` si falta fuente; no se inventan fuentes.
- **Invariante de localidad:** `localidad` es estrictamente `null` si y solo si `alcanceGeografico` es `"nacional"` o `null`.
- **Regla del eslabón más débil:** `nivelEvidencia` del ciclo es el mínimo nivel entre ventana y duración: `directa_local > extrapolada > parcial > pendiente`.
- **Principio de no fragmentación:** Un ciclo declara un solo `alcanceGeografico` y una sola `localidad`; ventana y duración deben compartir alcance/localidad. Si no, D22 debe resolverse antes de cargar datos reales.
- `parcial` y `pendiente` no se puntúan; se muestran con etiqueta en el catálogo.
- `extrapolada` puede puntuarse, pero la salida y la UI deben indicar “Evidencia extrapolada desde [localidad/alcance]; no validada para Liberia”. La forma de esa etiqueta queda pendiente en D10.

**Limitaciones:**

- Hoy no hay ciclos `directa_local` ni `extrapolada` con ventana y duración verificadas para el piloto; ver D20.
- Un solo `fuenteId` no representa ventana y duración de fuentes distintas; ver D22. `fuenteId: null` no autoriza inventar una fuente.
- Requiere ratificación final del equipo (Hellen, Alex y Samuel).

### 10.4 D20 — Criterios para confirmar ventanas de siembra

**Decisión:** una ventana de siembra (`ventanaSiembra`) solo se considera confirmada si cumple de manera concurrente todos los criterios del Bloque A. La información que no satisfaga estos criterios se gestiona conforme a las reglas del Bloque B.

**A. Criterios de confirmación de ventanas de siembra (todos obligatorios):**

1. **Consulta directa y completa:** La fuente debe haber sido consultada y leída directamente en su texto íntegro; una URL con código 200, un snippet, un índice o un resumen bibliográfico no basta para confirmar la ventana.
2. **Especificidad agronómica:** La fuente debe abordar explícita y específicamente el calendario o época de siembra del cultivo evaluado; una mención contextual o secundaria sobre el régimen general de lluvias no califica como confirmación de ventana.
3. **Alcance geográfico explícito:** La fuente debe indicar claramente el ámbito territorial de aplicación (localidad específica, cantón, región o nivel nacional).
4. **Diferenciación estacional y de propósito:** La fuente debe distinguir con precisión las épocas o tipos de ciclo (p. ej. primera frente a segunda/postrera en maíz; postrera frente a primera en frijol; grano frente a forraje/silaje en sorgo).
5. **Registro bibliográfico completo en catálogo:** Deben documentarse en `Fuente.notas` el título, autor o institución, fecha, URL o ISBN, y la página, sección o cita textual exacta de la que se extrae la recomendación.
6. **Delimitación temporal explícita en meses calendario:** La ventana debe expresarse en meses inclusivos delimitados por la fuente; no se permite inferir o convertir expresiones climáticas genéricas (como «al inicio de las lluvias») en meses fijos sin que el texto original lo sustente.

**B. Reglas aplicables a información parcial o pendiente:**

1. **Ventanas con respaldo insuficiente o contextual (evidencia parcial):** Si se dispone de datos de siembra pero provienen únicamente de snippets, índices, resúmenes o menciones contextuales indirectas, la ventana no se considera confirmada. El ciclo se clasifica como `nivelEvidencia: "parcial"` (si los valores numéricos están presentes) o `"pendiente"`, y no es elegible para puntuación de estrategias ganadoras.
2. **Ausencia total de fuente o de ventana:** Si no se dispone de fuente documental o se desconoce la ventana de siembra, se asigna `ventanaSiembra: null`, `fuenteId: null` (salvo que exista una fuente que respalde únicamente la duración) y `nivelEvidencia: "pendiente"`, con `alcanceGeografico: null` si tampoco se conoce el alcance. Queda estrictamente prohibido inventar ventanas de siembra o fuentes ficticias.
3. **Independencia de confirmación entre ventana y duración:** La confirmación de una ventana aplica exclusivamente a `ventanaSiembra`. No transfiere confirmación automática a `duracionDias`. Si la ventana cumple todos los criterios del Bloque A pero `duracionDias` es desconocida o carece de fuente comprobada, el ciclo en su totalidad queda en `nivelEvidencia: "pendiente"` por la regla del eslabón más débil (D19) y no es elegible para puntuación.
4. **Tratamiento de duración en días frente a meses:** Si la fuente consultada solo expresa la duración en meses, no se realiza conversión matemática automática a días ni se promedia; se asigna `duracionDias: null`, se registra la cita literal en `Fuente.notas` (D17) y el ciclo permanece como `pendiente`.
5. **Trazabilidad y discrepancia de fuentes o alcance:** Si la ventana y la duración provienen de fuentes documentales distintas o de alcances geográficos diferentes, no se pueden unificar bajo un único registro sin resolver previamente D22 (§10.7).

**Estado del piloto (Liberia/Chorotega):**

| Cultivo | Estado | Motivo |
|---|---|---|
| **Maíz** | Sin ventana confirmada | SciELO 2021 menciona junio–octubre en Guanacaste, pero es contexto, no estudio de ventana. MAG/INTA no se pudieron leer directamente. |
| **Frijol** | Sin ventana confirmada | `15 sep–15 oct` sigue siendo hipótesis. IICA 2007 no se pudo leer directamente. PITTA aporta duración/variedad, no ventana. Matambú es contexto de frijol nativo, no una ventana comercial. |
| **Sorgo** | Sin ventana de grano confirmada | IICA/IDA 1983 no se pudo leer directamente. UCR 2026 es sorgo BMR forrajero en Cañas, no grano en Liberia. |

**Limitaciones:**

- No hay ventana confirmada para maíz, frijol ni sorgo en Liberia/Chorotega con estos criterios.
- `15 sep–15 oct` para frijol sigue siendo hipótesis.
- IICA/IDA 1983 e IICA 2007 no se pudieron leer directamente; UCR 2026 es forraje en Cañas; SciELO 2021 es contexto.
- Requiere ratificación final del equipo (Hellen, Alex y Samuel); la revisión agronómica la lidera Hellen + equipo.

### 10.5 D21 — Rol de `finca.mesInicio`

**Decisión:** `mesInicio` es el mes previsto para el primer ciclo de la finca; no es un desplazamiento global de los ciclos ni un reemplazo de `Ciclo.ventanaSiembra`.

**Reglas:**

- **Validación del dato de entrada:** Obligatorio, número entero en `1–12`. Si no cumple este formato, se rechaza la simulación antes de ejecutarse (error de validación de entrada) sin generar `ResultadoSimulacion`. La validación de entrada no comprueba la ventana de siembra.
- **Evaluación de compatibilidad por estrategia:** Debe caer dentro de la ventana de siembra del ciclo del primer paso (`pasos[0]`). Esta es una regla de compatibilidad temporal por estrategia, no un error de esquema.
- Si `mesInicio` no cae dentro de dicha ventana ⇒ la estrategia se marca como `incompatible` (`elegible: false`) con un motivo descriptivo en `motivosDescarte`.
- Si la ventana de siembra del primer ciclo es `null` ⇒ la compatibilidad temporal de la estrategia es `no_evaluable`.
- No fija el mes del segundo ciclo (el segundo ciclo depende de la secuencia y duración del primero, conforme a D18).
- No desplaza la ventana; solo selecciona un mes dentro de ella.
- El día exacto dentro del mes es desconocido; lo gestiona el cálculo de intervalos de D18.
- Si el primer ciclo tiene `nivelEvidencia` en `parcial` o `pendiente`, la estrategia no se puntúa.
- No se soportan ventanas que crucen año en la v0.2.

**Limitaciones:**

- No convierte `mesInicio` en una fecha exacta.
- No garantiza que la siembra ocurra en el mes indicado.
- **Sin códigos inventados:** `MES_INICIO_FUERA_DE_VENTANA` es exclusivamente un nombre de trabajo ilustrativo. Los códigos normativos y textos definitivos de descarte o error quedan pendientes de definición en D5 y D10, y requieren acuerdo con Alex y Samuel.
- Requiere ratificación final del equipo (Hellen, Alex y Samuel); la revisión técnica la lideran Hellen + Alex.

### 10.6 Rotaciones A, B y C: no validadas

- **A:** maíz → frijol.
- **B:** maíz → sorgo.
- **C:** sorgo → frijol.

**Estado:** candidatas de diseño, no recomendaciones. No están validadas agronómica ni temporalmente. A y B no pueden declararse compatibles con la evidencia actual; C es plausible pero no verificada. La matriz ficticia de §7.5 no las valida. No se puntúan ni se presentan como recomendación hasta cumplir D18/D20 y ratificar D17–D21.

#### Extensión interna experimental: evidencia de una secuencia

Los contratos actuales validan los pasos y referencias de una estrategia, la temporalidad D18 y la evidencia D19 asociada a cada ciclo. No definen un campo que registre evidencia documental de la secuencia completa. Para explorar esa responsabilidad, el módulo interno `evaluar-respaldo-rotacion.js` admite en una estrategia la siguiente propuesta experimental:

```js
evidenciaRotacion: {
  pasos: [{ orden, cultivoId, cicloId }, { orden, cultivoId, cicloId }],
  nivelEvidencia: "directa_local|extrapolada|parcial|pendiente",
  fuenteIds: ["id de fuente existente"]
}
```

La lista `pasos` debe coincidir exactamente con la secuencia ordenada de la estrategia. `fuenteIds` solo se comprueba contra `fuentes[]`; que una referencia exista no demuestra que el documento respalde esa secuencia ni valida su calidad científica. La fuente de un cultivo, de un ciclo o de la estrategia no sustituye esta evidencia específica. Si falta `evidenciaRotacion`, el evaluador informa el faltante. Los niveles `parcial` y `pendiente` se conservan como tales; las declaraciones `directa_local` y `extrapolada` solo se etiquetan como declaradas.

Esta extensión es una propuesta de implementación interna, no forma parte del contrato público aprobado y está pendiente de ratificación. La salida mantiene separadas estructura, compatibilidad temporal D18, elegibilidad calculada con las reglas existentes de ciclos y evidencia de secuencia. Ninguna de estas declaraciones habilita recomendaciones o ganadoras ni implica validez agronómica real. Los fixtures de sus pruebas son sintéticos y no respaldan rotaciones reales.

### 10.7 D22 — Trazabilidad de múltiples fuentes (pendiente)

**Problema:** `Ciclo.fuenteId` es singular, pero atributos distintos (por ejemplo `ventanaSiembra` y `duracionDias`) pueden tener fuentes, niveles de evidencia o alcances distintos. Una referencia existente en `fuentes[]` solo resuelve el identificador; no demuestra que esa fuente respalde un atributo ni que tenga calidad científica suficiente.

**Implementación interna experimental:** `backend/src/domain/catalog/resolver-evidencia-atributos.js` recibe objetivos de atributos y declaraciones fuera del catálogo. Cada declaración enlaza un `atributoId` con `fuenteId`, `respaldaAtributo`, `nivelEvidencia`, `alcanceGeografico`, `localidad` y `contextoFuente`. Puede haber más de una declaración por atributo; se conservan separadas y no se fusionan fuentes ni niveles.

```js
resolverEvidenciaAtributos({
  catalogo, // contrato actual, sin campos añadidos
  modo: "prueba_sintetica", // o "real"; vocabulario D7, no ejecuta D7
  atributos: [{ id, alcanceGeografico, localidad }],
  declaraciones: [{
    atributoId,
    fuenteId, // string o null
    respaldaAtributo: true, // booleano explícito
    nivelEvidencia, // vocabulario D19 existente
    alcanceGeografico, // vocabulario D19 existente
    localidad,
    contextoFuente: "sintetica_prueba" // o "referencia_catalogo"
  }]
})
```

La salida marca el atributo sin declaraciones como `atributo_sin_fuente`; `declaraciones_por_fuente` solo indica que se recibieron registros y no es una aprobación agregada. Para cada registro se distingue `atributo_sin_fuente`, `fuente_no_resuelta`, `fuente_no_declara_respaldo_del_atributo`, `contexto_fuente_incompatible_con_modo`, `alcance_no_coincidente`, `alcance_indeterminado`, `evidencia_declarada`, `evidencia_parcial` y `evidencia_pendiente`. Los niveles y alcances se limitan a los vocabularios y coherencias ya descritos en D19; el alcance se compara por igualdad exacta, sin inferir contención geográfica. `referencia_catalogo_no_verificada` indica solo que se resolvió una referencia declarada en el contexto real; no certifica que la fuente sea auténtica, que respalde el atributo ni que sea científicamente válida. `sintetica_prueba` identifica fixtures, nunca datos reales.

Esta extensión **no cambia `Ciclo`, `Fuente`, el catálogo ni el contrato público de API**, y no conecta la salida con elegibilidad, puntuación o Minimax. `modo: "real"` solo valida declaraciones de referencias del catálogo: no habilita el modo real de D7 ni recomendaciones. La estructura es una propuesta experimental y queda pendiente decidir, con Hellen, Alex y Samuel, cómo persistir y auditar las declaraciones, qué representa exactamente la confirmación `respaldaAtributo` y si el nivel/alcance deben vivir por atributo en el modelo público. No se inventan fuentes ni se promueven los fixtures sintéticos.

**Estado:** D22 sigue pendiente de ratificación y de decisión de persistencia. La función cubre únicamente resolución interna de referencias y declaraciones; no resuelve calidad científica ni aprobación agronómica. Responsables: Hellen + Alex + Samuel.

### 10.8 D10 — Representación de compatibilidad temporal, niveles de evidencia y motivos en `ResultadoSimulacion` (pendiente de ratificación)

**Problema:** El contrato público de `POST /api/simulations` (`docs/contrato-api.md:43-56`) define los campos estándar de salida (`estado`, `escenarios`, `resultados`, `ganadoras`, `explicacion`, `evidencia`). La propuesta de dominio introduce los 4 estados de compatibilidad temporal de D18 (`compatible`, `incompatible`, `indeterminada`, `no_evaluable`) y las etiquetas de evidencia geográfica de D19 (`nivelEvidencia`, `alcanceGeografico`, `localidad`). Añadir unilateralmente campos nuevos a la respuesta pública violaría el acuerdo entre áreas y podría romper la integración con el frontend.

**Regla de contrato público acordada:** **No se añaden campos definitivos al contrato público de `ResultadoSimulacion` sin acuerdo previo y unánime de Hellen, Alex y Samuel.** En esta revisión v0.3 se mantiene la estructura pública de `contrato-api.md`, se documenta el mapeo conceptual interno a los campos existentes y se registran las alternativas a consensuar.

**Mapeo conceptual propuesto:**

1. **`compatible`:**
   - La secuencia temporal entre los ciclos es viable.
   - Si los ciclos disponen de evidencia suficiente (`directa_local` o `extrapolada`) y datos completos, la estrategia se mapea a `elegible: true` y sus puntajes se calculan numéricamente en todos los escenarios.
2. **`incompatible`:**
   - La rotación presenta solapamiento temporal o `finca.mesInicio` no cae en la ventana del primer ciclo.
   - Se mapea a `elegible: false` y se registra el motivo de descarte en `resultados[].motivosDescarte` (así como en el resumen derivado `descartes[]`).
   - No descalifica a las demás estrategias; si ninguna resulta elegible y no faltan datos esenciales, el estado global de la simulación es `sin_opciones`.
3. **`indeterminada`:**
   - La secuencia no puede confirmarse viable ni descartarse categóricamente debido a la amplitud de los rangos `{min, max}` o a la granularidad mensual (D18).
   - Una estrategia con compatibilidad indeterminada **no puede producir ganadoras ni presentarse como recomendación**.
   - *Opciones de mapeo a ratificar con Alex y Samuel:*
     - *Opción A:* Clasificarla como descarte con `elegible: false` y registrar el motivo de indeterminación temporal en `motivosDescarte`.
     - *Opción B:* Mantener `elegible: false` con `puntajes: null` y registrar la causa en `motivosNoCalculable`.
4. **`no_evaluable` (o ciclos con evidencia `parcial` o `pendiente`):**
   - Faltan datos esenciales de ventana o duración (`null`), o el ciclo carece de fuente comprobada.
   - La estrategia no es elegible para recomendación ni puede ser puntuada.
   - Se mapea en `resultados[]` con puntajes en `null` y el motivo explícito en `motivosNoCalculable`.
   - Si faltan datos esenciales para evaluar las estrategias de la simulación, el estado global resultante es `incompleto` y las carencias se enumeran en `evidencia.datosFaltantes`.
5. **Etiquetado de ciclos con evidencia `extrapolada`:**
   - La estrategia es evaluable y puntuable, pero debe acompañarse de la advertencia: *«Evidencia extrapolada desde [localidad/alcance]; no validada para Liberia»*.
   - *Opciones de diseño para no alterar unilateralmente el contrato público:*
     - *Opción 1 (Sin cambios en `ResultadoSimulacion`):* El frontend de Samuel resuelve la advertencia consultando el catálogo (`GET /api/catalog`) y cruzando la procedencia por `cicloId`.
     - *Opción 2 (Aprovechar campos existentes):* Incorporar la advertencia en el texto libre de `explicacion` o en el array de cadenas `evidencia.supuestos[]`.
     - *Opción 3 (Ampliación formal del contrato):* Añadir un campo estructurado de advertencias o metadatos por resultado en `resultados[]` (requiere aprobación conjunta de Alex y Samuel en `docs/contrato-api.md`).

**Estado:** PROPUESTO; pendiente de confirmación técnica con Alex y validación de interfaz con Samuel.

---

## 11. Criterios de aceptación para iniciar la Etapa 1

La Etapa 1 (implementación del catálogo) puede comenzar cuando:

1. **Este documento esté aprobado** por Samuel, Alex y Hellen.
2. **D1 y D2 resueltas:** localidad piloto y lista de cultivos/ciclos con **fuentes citadas**.
3. **D3 aprobada:** vocabulario controlado definitivo de `suelo`/`drenaje`/`riego` y sus etiquetas.
4. **D9 y D16 acordadas con Alex:** estructura climática diaria y detalles de integración C1–C11.
5. **D7 y D5 definidos:** parámetros de puntuación, normalización, pesos, elegibilidad y motivos de descarte.
6. **D6 definido:** escenarios y sus umbrales.
7. **D4 y D13–D15 resueltas:** `cultivosAnteriores`, regla de cultivos distintos, exposición de `opcionesFinca` y etiquetas.
8. **Sin contradicciones abiertas** con `docs/contrato-api.md`; cualquier cambio de contrato se registra como propuesta (ver §9).
9. **D17–D21 ratificadas** por Hellen, Alex y Samuel según §10, **D22 resuelta antes de cargar ciclos con ventana y duración de fuentes distintas**, y **D10** defina la representación de estados/evidencia en la salida. Las rotaciones A, B y C siguen sin validar.

---

## Anexo A · Trazabilidad con documentos existentes

| Elemento de este documento | Origen |
|---|---|
| Forma externa `{cultivos, estrategias, version, fuentes}` | `contrato-api.md:17` |
| Entrada `finca` | `contrato-api.md:24-38` |
| Salida y evidencia | `contrato-api.md:43-68` |
| Estados y política de no-cero | `contrato-api.md:64-70`; `AGENTS.md:14` |
| Frontera dominio/HTTP | `AGENTS.md:10`; `contrato-api.md:60` |
| Metadatos por fuente climática | `contrato-api.md:67` |
| Asignación de áreas y responsables | `AGENTS.md:5-11`; `README.md:35-37` |
| Minimax regret | `docs/equipo.md:18`; `contrato-api.md:52` |
| Estrategia con dos pasos ordenados | Ajuste 1 de la revisión de Samuel (§0.2) |
| Parámetros de puntuación estructurados | Ajuste 2 de la revisión de Samuel (§0.2) |
| Opciones de finca con `valor` y `etiqueta` | Ajuste 3 de la revisión de Samuel (§0.2) |
| Contrato climático diario por variable | Ajuste 4 de la revisión de Samuel (§0.2) |
| Separación `incompleto` / `sin_opciones` y motivos | Ajuste 5 de la revisión de Samuel (§0.2) |
| Minimax sin probabilidades ni equiprobabilidad | Ajuste 6 de la revisión de Samuel (§0.2) |
| Escala `0–100`, mayor es mejor; sin etapas; tres escenarios; matriz ficticia | Decisiones acordadas del equipo (§0.3) |

## Anexo B · Glosario mínimo

- **Historial:** observaciones pasadas.
- **Pronóstico:** estimación futura con fecha de validez.
- **Escenario:** hipótesis (`habitual`/`seco`/`humedo`), no una predicción ni una probabilidad.
- **Estrategia:** combinación de exactamente dos ciclos ordenados y parámetros de puntuación.
- **Paso:** cada uno de los dos elementos ordenados de una estrategia; identifica `cultivoId` y `cicloId`.
- **Parámetro de puntuación:** dato estructurado con `valor`, `unidad` y `fuenteId` que alimenta la puntuación.
- **Opción de finca:** par `valor` interno + `etiqueta` visible, definido en el catálogo.
- **Elegible:** estrategia que cumple las reglas para ser considerada.
- **Motivo de descarte:** explicación de la restricción incumplida por una estrategia no elegible.
- **Motivo no calculable:** explicación de la información faltante que impide calcular una puntuación.
- **`incompleto`:** faltan datos esenciales; no se fuerza ganador.
- **`sin_opciones`:** con datos esenciales disponibles, ninguna estrategia cumple las restricciones conocidas.
- **Peor arrepentimiento:** máximo regret de una estrategia entre escenarios.
