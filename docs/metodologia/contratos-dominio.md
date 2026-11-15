# Contratos de dominio · FIELDVERSE

> **Estado del documento:** revisión v0.2 de Etapa 0. Borrador para nueva revisión del equipo.
> **Autoría:** Hellen (`backend/src/domain/`, `docs/metodologia/`).
> **Revisión solicitada por:** Samuel. **Conformidad general:** Alex.
> **Alcance de esta etapa:** definición de contratos de datos. **No contiene código JavaScript.**
> **Regla de marcado:** toda decisión que no esté establecida en `AGENTS.md`, `README.md`, `docs/contrato-api.md`, `docs/equipo.md` o en el registro de decisiones acordadas de §0.3 se marca como **PROPUESTA PENDIENTE DE APROBACIÓN**.
> **Límite explícito:** este documento no inventa fuentes científicas, valores climáticos, umbrales, rendimientos ni probabilidades de supervivencia. Los ejemplos numéricos que aparecen son los del `docs/contrato-api.md` y son **ficticios**.

---

## 0. Control de revisiones y trazabilidad

### 0.1 Historial

| Versión | Fecha | Cambio |
|---|---|---|
| v0.1 | Etapa 0 | Definición inicial de contratos de dominio. |
| v0.2 | 2026-11-14 | Se incorporan los seis ajustes solicitados por Samuel; Alex manifestó conformidad general. |

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

Regla: **ningún valor agronómico del catálogo puede existir sin una `fuenteId` que lo respalde** una vez el catálogo deje de ser demostrativo.

### 2.3 `Cultivo`

```jsonc
{
  "id": "string",
  "nombre": "string",
  "ciclos": [ Ciclo ],
  "fuenteId": "string"
}
```

### 2.4 `Ciclo`

```jsonc
{
  "id": "string",
  "cultivoId": "string",
  "ventanaSiembra": { "inicioMes": 1, "finMes": 12 },   // meses 1–12
  "duracionMeses": "number|null",
  "fuenteId": "string"
}
```

**Decisión acordada:** la primera versión **no contiene etapas fenológicas**. No se incluye el campo `etapas` en `Ciclo`. Si en el futuro se necesitan, se incorporarán como una nueva versión del contrato, no como un campo opcional silencioso.

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
- Toda `fuenteId` referenciada debe existir en `fuentes[]`.
- Todo `cultivoId`/`cicloId` de una estrategia debe existir; el ciclo debe pertenecer al cultivo del paso.
- `pasos` tiene exactamente dos elementos con `orden` 1 y 2.
- Los `id` de `parametrosPuntuacion` son únicos dentro de la estrategia.
- Todo `ParametroPuntuacion` tiene `valor` numérico finito, `unidad` no vacía y `fuenteId` existente.
- Los `valor` de cada lista de `opcionesFinca` son únicos y no vacíos.
- `inicioMes`/`finMes` y `mesInicio` ∈ [1, 12].
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
  "mesInicio": 5,            // [1, 12]
  "prioridad": "equilibrio"  // §3.5
}
```

Validación (entrada inválida ⇒ error de dominio, no resultado):

- Tipos numéricos y rangos de coordenadas y mes.
- Valores dentro del vocabulario controlado del catálogo.
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

- Las **ventanas de cultivo** las calcula el motor de dominio a partir de `Ciclo.ventanaSiembra`, `Ciclo.duracionMeses`, `finca.mesInicio` y el catálogo.
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

### 6.4 Motivos de descarte

- Toda estrategia con `elegible: false` debe incluir al menos un motivo en `motivosDescarte`.
- El motivo explica qué restricción conocida no se cumplió. Los códigos y textos definitivos dependen de las reglas de elegibilidad (D5).
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

---

## 10. Decisiones pendientes y responsables

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
| D10 | Formato de `motivosNoCalculable`, `motivosDescarte` y `descartes` | Hellen + Alex | PROPUESTO; pendiente de Alex |
| D11 | Dependencias de backend (si se requieren) | Alex | A definir |
| D12 | Uso de etapas fenológicas en la primera versión | Equipo | **ACORDADO: no se usan** (§0.3) |
| D13 | Si los dos cultivos de una estrategia deben ser distintos | Hellen + equipo | PENDIENTE |
| D14 | Exponer `opcionesFinca` en `GET /api/catalog` | Alex + Samuel | PENDIENTE (adición al contrato) |
| D15 | Validación de etiquetas visibles del formulario | Samuel + Hellen | PENDIENTE |
| D16 | Confirmación técnica de los detalles C1–C11 de §5.6 | Alex | PENDIENTE |

> Ninguna de estas decisiones debe cerrarse sin fuente citada (D1–D3, D6–D7) ni sin acuerdo del equipo (D4, D8–D10, D13–D15).

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
