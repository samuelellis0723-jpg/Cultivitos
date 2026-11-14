# Contratos de dominio · FIELDVERSE

> **Estado del documento:** borrador de Etapa 0.
> **Autoría:** Hellen (`backend/src/domain/`, `docs/metodologia/`).
> **Alcance de esta etapa:** definición de contratos de datos. **No contiene código JavaScript.**
> **Regla de marcado:** toda decisión que no esté ya establecida en `AGENTS.md`, `README.md`, `docs/contrato-api.md` o `docs/equipo.md` se marca como **PROPUESTA PENDIENTE DE APROBACIÓN**.
> **Límite explícito:** este documento no inventa fuentes científicas, valores climáticos ni rendimientos agrícolas. Los ejemplos numéricos que aparecen son los del `docs/contrato-api.md` y son **ficticios**.

---

## 1. Objetivo y alcance

### 1.1 Objetivo

Fijar, antes de escribir código, los contratos de datos que sostienen el catálogo agrícola y el motor de simulación, de modo que:

- El motor de dominio sea una función pura: recibe `{finca, clima, catalogo}` y devuelve resultados y evidencia.
- El catálogo sea la única fuente autorizada de vocabulario agronómico y estrategias.
- Alex pueda construir `GET /api/catalog` y `POST /api/simulations` sin reescribir la lógica de dominio.
- Samuel pueda diseñar el formulario «Mi finca» contra un vocabulario estable.

### 1.2 Alcance

**Dentro del alcance:**
- Esquema del catálogo (cultivos, ciclos, ventanas, estrategias, versiones, fuentes).
- Vocabulario controlado de `suelo`, `drenaje` y `riego`.
- Formato exacto de entrada y salida del motor.
- Contrato climático que el motor exige a la capa de datos (Alex).
- Estructura de escenarios, estados y evidencia.
- Definición matemática del algoritmo minimax regret.

**Fuera del alcance de esta etapa:**
- Implementación JavaScript.
- Datos climáticos reales, fuentes NASA, rendimientos o probabilidades de supervivencia.
- Rutas, controladores o servicios (propiedad de Alex).
- Interfaz de usuario (propiedad de Samuel).

### 1.3 Restricciones heredadas (AGENTS.md)

- El dominio **no importa Express, no consulta APIs y no lee credenciales**.
- Distinguir **historial**, **pronóstico** y **escenario hipotético**.
- **Desconocido no significa cero.**
- Datos de respaldo deben llevar **fecha y origen**.
- **No atribuir puntuaciones demostrativas a NASA** ni prometer rendimiento o supervivencia.

---

## 2. Esquema propuesto del catálogo

> **PROPUESTA PENDIENTE DE APROBACIÓN.** El contrato solo fija la forma externa `{cultivos, estrategias, version, fuentes}` de `GET /api/catalog` (contrato-api.md:17). La estructura interna se propone aquí.

### 2.1 Objeto raíz del catálogo

```jsonc
{
  "version": "string",              // identificador de versión del catálogo
  "generado": "YYYY-MM-DD",         // fecha de compilación del catálogo
  "localidadPiloto": {              // PROPUESTA PENDIENTE (ver §9)
    "id": "string",
    "nombre": "string",
    "pais": "string",
    "fuenteId": "string"            // referencia a fuentes[]
  },
  "fuentes": [ Fuente ],
  "cultivos": [ Cultivo ],
  "estrategias": [ Estrategia ]
}
```

**Compatibilidad con el contrato:** `GET /api/catalog` expondrá al menos `cultivos`, `estrategias`, `version` y `fuentes`. Los campos `generado` y `localidadPiloto` son adiciones propuestas.

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
  "etapas": [ Etapa ],              // PROPUESTA PENDIENTE (opcional)
  "fuenteId": "string"
}
```

### 2.5 `Etapa` (opcional, para ventanas por fase fenológica)

```jsonc
{
  "id": "string",
  "nombre": "string",              // p. ej. establecimiento, desarrollo, maduración
  "desdeMesRelativo": "number|null",
  "hastaMesRelativo": "number|null",
  "requerimientos": {              // estructura a definir; sin valores inventados
    "agua": "string|null",
    "temperatura": "string|null"
  }
}
```

> **PROPUESTA PENDIENTE DE APROBACIÓN:** si se necesitan etapas fenológicas en la Etapa 1 o si basta con una ventana única por ciclo.

### 2.6 `Estrategia`

```jsonc
{
  "id": "string",                  // el contrato usa "A", "B", "C" en el ejemplo ficticio
  "nombre": "string",
  "cultivoId": "string",
  "cicloId": "string",
  "descripcion": "string",
  "parametros": {                  // PROPUESTA PENDIENTE: qué parámetros puntúa el motor
    "riego": "string",
    "suelo": "string",
    "drenaje": "string"
  },
  "fuenteId": "string"
}
```

### 2.7 Reglas de integridad del catálogo (criterios de validación)

- `version` es obligatoria y no vacía.
- Toda `fuenteId` referenciada debe existir en `fuentes[]`.
- Todo `cultivoId`/`cicloId` de una estrategia debe existir.
- `inicioMes`/`finMes` ∈ [1, 12].
- El catálogo es **inmutable en tiempo de ejecución**: el motor lo recibe, no lo modifica.

---

## 3. Vocabulario controlado provisional

> El contrato (contrato-api.md:39) exige que **el catálogo defina** los valores de `suelo`, `drenaje` y `riego`, y prohíbe aceptar texto arbitrario como propiedad agronómica comprobada. Este apartado propone los tokens; su **significado agronómico y sus fuentes están pendientes**.

### 3.1 `suelo`

| Valor | Origen | Estado |
|---|---|---|
| `desconocido` | contrato-api.md (ejemplo de entrada) | **Aprobado por contrato** |
| `arenoso` | propuesta | PROPUESTA PENDIENTE |
| `franco` | propuesta | PROPUESTA PENDIENTE |
| `arcilloso` | propuesta | PROPUESTA PENDIENTE |
| `limoso` | propuesta | PROPUESTA PENDIENTE |

> Las clases texturales requieren una **clasificación citada** antes de usarse; por ahora son solo tokens sin comportamiento agronómico asignado.

### 3.2 `drenaje`

| Valor | Origen | Estado |
|---|---|---|
| `desconocido` | contrato-api.md | **Aprobado por contrato** |
| `pobre` | propuesta | PROPUESTA PENDIENTE |
| `moderado` | propuesta | PROPUESTA PENDIENTE |
| `bueno` | propuesta | PROPUESTA PENDIENTE |
| `excesivo` | propuesta | PROPUESTA PENDIENTE |

### 3.3 `riego`

| Valor | Origen | Estado |
|---|---|---|
| `desconocido` | contrato-api.md | **Aprobado por contrato** |
| `secano` | propuesta | PROPUESTA PENDIENTE |
| `riego_apoyo` | propuesta | PROPUESTA PENDIENTE |
| `riego_completo` | propuesta | PROPUESTA PENDIENTE |

### 3.4 `prioridad` (finca)

| Valor | Origen | Estado |
|---|---|---|
| `equilibrio` | contrato-api.md:38 | **Aprobado por contrato** |
| `agua` | contrato-api.md:38 | **Aprobado por contrato** |
| `suelo` | contrato-api.md:38 | **Aprobado por contrato** |

### 3.5 Regla transversal del vocabulario

- El motor **rechaza** cualquier valor fuera de estas listas (`desconocido` incluido como valor válido, no como ausencia de dato).
- Cualquier valor fuera de la lista produce entrada inválida, nunca una interpretación libre.
- La lista definitiva se fija en la Etapa 0 y se versiona junto al catálogo.

---

## 4. Contrato de entrada del motor

### 4.1 Firma (función pura)

```
motorSimular({ finca, clima, catalogo }) -> ResultadoSimulacion
```

- Sin acceso a red, sin Express, sin credenciales, sin lectura de archivos.
- Determinista: misma entrada ⇒ misma salida (salvo campos de marca temporal que se inyecten explícitamente).

### 4.2 `finca`

```jsonc
{
  "latitude": 9.93,          // [-90, 90]
  "longitude": -84.09,       // [-180, 180]
  "suelo": "desconocido",    // §3.1
  "drenaje": "desconocido",  // §3.2
  "riego": "desconocido",    // §3.3
  "cultivosAnteriores": [],  // PROPUESTA PENDIENTE: ¿ids de cultivo o texto?
  "mesInicio": 5,            // [1, 12]
  "prioridad": "equilibrio"  // §3.4
}
```

Validación (entrada inválida ⇒ error de dominio, no resultado):
- Tipos numéricos y rangos de coordenadas y mes.
- Valores dentro del vocabulario controlado.
- `cultivosAnteriores` conforme al formato que se apruebe (ver §9).

> El ejemplo de coordenadas `9.93 / -84.09` proviene del contrato y es **ilustrativo, no una finca validada**.

### 4.3 `clima`

Ver §5. El motor no obtiene clima: lo recibe ya normalizado por Alex.

### 4.4 `catalogo`

Ver §2. El motor no construye el catálogo: lo recibe.

### 4.5 Precedencia de errores

1. Entrada inválida (esquema/vocabulario) ⇒ se rechaza antes de simular.
2. Datos faltantes esenciales ⇒ `estado: "incompleto"` (no es error de entrada).
3. Sin estrategias elegibles ⇒ `estado: "sin_opciones"`.

---

## 5. Contrato climático para Alex

> El contrato exige que **Hellen defina la estructura de `clima`** antes de que Alex agregue datos por ventanas de cultivo (contrato-api.md:60). Lo siguiente es esa definición. **PROPUESTA PENDIENTE DE APROBACIÓN por Alex y Samuel.**

### 5.1 Objeto `clima`

```jsonc
{
  "coordenadas": {
    "solicitadas": { "latitude": 9.93, "longitude": -84.09 },
    "devueltas":   { "latitude": 9.93, "longitude": -84.09 }   // pueden diferir (rejilla del proveedor)
  },
  "periodo": { "inicio": "YYYYMMDD", "fin": "YYYYMMDD" },
  "resolucion": "diaria|mensual",        // PROPUESTA PENDIENTE: mínimo requerido
  "unidades": {
    "precipitacion": "mm",
    "temperatura": "°C"
  },
  "procedencia": "live|backup",          // obligatorio (contrato-api.md:67)
  "fechaConsulta": "ISO-8601",           // cuándo se obtuvo el dato
  "cobertura": {
    "diasEsperados": "number",
    "diasPresentes": "number",
    "porcentaje": "number",
    "faltantes": [ "YYYYMMDD" ]          // fechas ausentes, explícitas
  },
  "fuentes": [ FuenteClimatica ],        // ver §5.3
  "series": {                            // PROPUESTA PENDIENTE: variables mínimas
    "precipitacion": [ { "fecha": "YYYYMMDD", "valor": "number|null" } ],
    "temperatura":   [ { "fecha": "YYYYMMDD", "valor": "number|null" } ]
  },
  "agregados": {                         // derivables de series; el motor puede recalcular
    "precipitacionTotal": "number|null",
    "temperaturaMedia": "number|null"
  }
}
```

### 5.2 Requisitos del motor (qué necesito sí o sí)

- **Variables mínimas:** precipitación y temperatura. Otras variables quedan **PROPUESTA PENDIENTE**.
- **Unidades explícitas** por variable; el motor no asume unidades por defecto.
- **Período explícito** con fechas de inicio y fin.
- **Cobertura explícita**: cuántos días se esperaban, cuántos llegaron y cuáles faltan.
- **Procedencia explícita**: `live` o `backup`. Si es `backup`, **antigüedad** del respaldo.
- **Ventanas de cultivo:** el motor debe poder asociar series a la ventana de cada ciclo. **PROPUESTA PENDIENTE:** recibir `clima.porVentana[ventanaId] = { series, agregados }` en lugar de (o además de) una serie continua.

### 5.3 `FuenteClimatica` (alineada con contrato-api.md:67)

```jsonc
{
  "proveedor": "string",
  "urlConsulta": "string",        // sin secretos
  "coordenadasSolicitadas": { "latitude": "number", "longitude": "number" },
  "coordenadasDevueltas": { "latitude": "number", "longitude": "number" },
  "periodo": { "inicio": "YYYYMMDD", "fin": "YYYYMMDD" },
  "unidades": { "precipitacion": "mm", "temperatura": "°C" },
  "fechaConsulta": "ISO-8601",
  "cobertura": { "porcentaje": "number" },
  "origen": "live|backup",
  "antiguedad": "string|null"      // requerido si origen = backup
}
```

### 5.4 Lo que el motor NO hace con el clima

- No convierte pronóstico en historial ni en escenario de toda una temporada.
- No trata un pronóstico antiguo como aviso actual.
- No rellena huecos con ceros (ver §8).

---

## 6. Contrato de salida y evidencia

> Alineado con contrato-api.md:43-56. Los valores del ejemplo del contrato son **ficticios**.

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
      "peorArrepentimiento": "number|null"
    }
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

### 6.2 Puntuaciones no calculables

- Un puntaje no calculable se representa como **`null`** acompañado de un **motivo**.
- **PROPUESTA PENDIENTE:** el contrato muestra puntajes numéricos; para no romperlo, se propone mantener `puntajes` numérico o `null` y añadir un mapa paralelo:

```jsonc
"motivosNoCalculable": { "seco": "faltan datos de precipitación para la ventana" }
```

- Nunca se usa `0` para representar un dato ausente (AGENTS.md).

### 6.3 Estados de simulación

| Estado | Significado |
|---|---|
| `completo` | Datos suficientes y al menos una estrategia elegible. |
| `incompleto` | Faltan datos esenciales; puede haber resultados parciales con `null` + motivo. |
| `sin_opciones` | No hay estrategias elegibles; `ganadoras` vacío. |
| `demo` | Resultados de ejemplo/matriz ficticia; **no** es recomendación real. |

Regla: **no forzar ganador** si no hay opciones elegibles o faltan datos esenciales.

### 6.4 `ganadoras`

- Es un **array** para admitir empates.
- Vacío cuando no puede recomendarse una estrategia (`sin_opciones` o `incompleto`).

### 6.5 Evidencia

- Debe guardar **reglas, pesos y versión del catálogo** junto al resultado (contrato-api.md:68).
- `origen` distingue `demo` / `live` / `backup`.
- Si hay `backup`, se indica su antigüedad; un respaldo válido debe indicarlo.
- `datosFaltantes` enumera explícitamente lo ausente (no se oculta).

---

## 7. Definición matemática de minimax regret

### 7.1 Notación

- Estrategias elegibles: `S = {s₁, …, sₙ}` (tras aplicar elegibilidad).
- Escenarios: `E = {e₁, …, eₘ}`; por defecto `E = {habitual, seco, humedo}`.
- Puntuación: `score(s, e) ∈ [0, 100]`, **mayor es mejor** (supuesto derivado del ejemplo del contrato; **PROPUESTA PENDIENTE de confirmación**).
- Solo se consideran estrategias con `elegible = true` y con puntaje calculable en todos los escenarios para el cálculo del arrepentimiento.

### 7.2 Arrepentimiento (regret)

Para cada par (estrategia, escenario), el arrepentimiento es la diferencia respecto al mejor puntaje alcanzable en ese escenario:

```
r(s, e) = max_{s' ∈ S} score(s', e) − score(s, e)
```

`r(s, e) ≥ 0` siempre; mide cuánto se pierde por elegir `s` si ocurre `e`.

### 7.3 Peor arrepentimiento

```
R(s) = max_{e ∈ E} r(s, e)
```

Es el `peorArrepentimiento` reportado por estrategia.

### 7.4 Decisión minimax regret

```
R* = min_{s ∈ S} R(s)
ganadoras = { s ∈ S : R(s) = R* }
```

- `ganadoras` puede tener **más de un elemento** (empates).
- Si `S = ∅` ⇒ `estado: "sin_opciones"`, `ganadoras: []`.

### 7.5 Comprobación con la matriz ficticia del contrato

Matriz de puntajes (ficticia, contrato-api.md:48-50):

| Estrategia | habitual | seco | humedo |
|---|---|---|---|
| A | 90 | 35 | 55 |
| B | 75 | 80 | 50 |
| C | 80 | 70 | 75 |

Máximos por escenario:

```
habitual = 90,  seco = 80,  humedo = 75
```

Arrepentimientos `r(s, e)`:

| Estrategia | habitual | seco | humedo | R(s) = max |
|---|---|---|---|---|
| A | 90−90 = 0 | 80−35 = 45 | 75−55 = 20 | **45** |
| B | 90−75 = 15 | 80−80 = 0 | 75−50 = 25 | **25** |
| C | 90−80 = 10 | 80−70 = 10 | 75−75 = 0 | **10** |

Decisión:

```
R* = min(45, 25, 10) = 10  ⇒  ganadoras = ["C"]
```

**Coincide con el contrato:** `peorArrepentimiento` = 45 / 25 / 10 y `ganadoras: ["C"]`. ✅

> Este cálculo es una **verificación del algoritmo con datos ficticios**, no una recomendación agrícola ni una predicción de rendimiento o supervivencia.

### 7.6 Variantes pendientes de aprobación

- Si el puntaje es una **pérdida** (menor es mejor), la fórmula de `r` se invierte.
- Cómo ponderar escenarios (si dejan de ser equiprobables).
- Cómo incorporar `prioridad` (equilibrio/agua/suelo) en la matriz de puntajes.

---

## 8. Política de datos faltantes

1. **Desconocido ≠ 0.** Un dato ausente nunca se sustituye por cero.
2. **Puntaje no calculable ⇒ `null` + motivo** (§6.2). Nunca un número inventado.
3. **Datos esenciales ausentes ⇒ `estado: "incompleto"`**; no se fuerza ganador.
4. **Sin estrategias elegibles ⇒ `estado: "sin_opciones"`**; `ganadoras: []`.
5. **Cobertura climática parcial:** se reporta `cobertura.faltantes` con las fechas ausentes.
6. **Respaldo (`backup`):** se marca `origen: "backup"` y su `antiguedad`. Un pronóstico antiguo no genera avisos actuales.
7. **Separar indisponibilidad de ausencia de riesgo:** «no hay datos» y «no hay riesgo» son resultados distintos.
8. **Estrategia no elegible:** se incluye en `resultados` con `elegible: false`, pero se excluye del cálculo minimax regret.

---

## 9. Decisiones pendientes y responsables

| # | Decisión | Responsable | Estado |
|---|---|---|---|
| D1 | Localidad piloto y su fuente | Hellen + equipo | PROPUESTA PENDIENTE |
| D2 | Lista de cultivos y ciclos con fuentes citadas | Hellen | PROPUESTA PENDIENTE |
| D3 | Vocabulario definitivo de `suelo`/`drenaje`/`riego` y su semántica | Hellen (acordar con Alex y Samuel) | PROPUESTA PENDIENTE |
| D4 | Formato de `cultivosAnteriores` (ids vs texto) | Hellen + Samuel | PROPUESTA PENDIENTE |
| D5 | Reglas de elegibilidad de estrategias | Hellen | PROPUESTA PENDIENTE |
| D6 | Definición de escenarios `habitual`/`seco`/`humedo` (umbrales) | Hellen | PROPUESTA PENDIENTE |
| D7 | Pesos e indicadores por `prioridad` | Hellen | PROPUESTA PENDIENTE |
| D8 | Escala de puntajes (¿0–100?) y dirección (mayor = mejor) | Hellen + equipo | PROPUESTA PENDIENTE |
| D9 | Estructura de `clima` y ventanas por cultivo | Hellen (aprobación de Alex) | PROPUESTA PENDIENTE |
| D10 | Formato de `motivosNoCalculable` en la salida | Hellen + Alex | PROPUESTA PENDIENTE |
| D11 | Dependencias de backend (si se requieren) | Alex | A definir |
| D12 | Necesidad de etapas fenológicas | Hellen | PROPUESTA PENDIENTE |

> Ninguna de estas decisiones debe cerrarse sin fuente citada (D1–D3, D6–D7) ni sin acuerdo del equipo (D4, D8–D10).

---

## 10. Criterios de aceptación para iniciar la Etapa 1

La Etapa 1 (implementación del catálogo) puede comenzar cuando:

1. **Este documento esté aprobado** por Samuel, Alex y Hellen.
2. **D1 y D2 resueltas:** localidad piloto y lista de cultivos/ciclos con **fuentes citadas**.
3. **D3 aprobada:** vocabulario controlado definitivo de `suelo`/`drenaje`/`riego`.
4. **D9 acordada con Alex:** estructura de `clima` y ventanas por cultivo.
5. **D8 y D7 definidos:** escala de puntajes, dirección y pesos/indicadores.
6. **D5 y D6 definidos:** reglas de elegibilidad y definición de escenarios.
7. **Sin contradicciones** con `docs/contrato-api.md`; cualquier cambio de contrato se registra como propuesta.

---

## Anexo A · Trazabilidad con documentos existentes

| Elemento de este documento | Origen |
|---|---|
| Forma externa `{cultivos, estrategias, version, fuentes}` | contrato-api.md:17 |
| Entrada `finca` | contrato-api.md:24-38 |
| Salida y evidencia | contrato-api.md:43-68 |
| Estados y política de no-cero | contrato-api.md:64-69; AGENTS.md:14 |
| Frontera dominio/HTTP | AGENTS.md:10; contrato-api.md:60 |
| Metadatos por fuente climática | contrato-api.md:67 |
| Asignación de áreas y responsables | AGENTS.md:5-11; README.md:35-37 |
| Minimax regret | docs/equipo.md:18; contrato-api.md:52 |

## Anexo B · Glosario mínimo

- **Historial:** observaciones pasadas.
- **Pronóstico:** estimación futura con fecha de validez.
- **Escenario:** hipótesis (`habitual`/`seco`/`humedo`), no una predicción.
- **Estrategia:** combinación cultivo + ciclo + parámetros a comparar.
- **Elegible:** estrategia que cumple las reglas para ser considerada.
- **Peor arrepentimiento:** máximo regret de una estrategia entre escenarios.
