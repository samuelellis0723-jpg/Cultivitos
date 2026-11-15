# Propuesta de integración D7: puntuaciones por escenario

> **MECANISMO EXPERIMENTAL IMPLEMENTADO; PROPUESTA PENDIENTE DE INTEGRACIÓN Y RATIFICACIÓN.** `puntuacion-d7.js` solo permite `prueba_sintetica`. El modo real y el uso como cálculo agronómico siguen deshabilitados/no aprobados. Este documento no aprueba indicadores, fuentes, pesos ni validez científica, y no modifica el contrato público de la API.

## 1. Responsabilidades y límites

- **Dominio de Hellen:** funciones ESM puras para validar configuración/insumos, aplicar las reglas D6/D7 que se ratifiquen, devolver puntuaciones y motivos, y entregar a Minimax las puntuaciones por escenario. No importa Express, no consulta fuentes, no lee credenciales ni muta sus entradas.
- **Orquestación HTTP y datos de Samuel:** validar la petición HTTP, resolver/obtener clima e información de catálogo, registrar procedencias, distinguir fallos de proveedores, preparar el contexto para el dominio y mapear su resultado al contrato de API acordado. La integración climática de Samuel es trabajo separado y no se presupone disponible aquí.
- **Contrato público:** `docs/contrato-api.md` mantiene `POST /api/simulations` como propuesto. La respuesta de ejemplo usa `resultados[].puntajes`; el módulo Minimax recibe `estrategias[].puntuaciones`. El adaptador debe hacer esa traducción explícita. Ningún campo nuevo se expone sin acuerdo de integración.

La construcción de escenarios D6 y la puntuación D7 son etapas distintas. D7 recibe valores identificados por escenario; no convierte un pronóstico en historia ni define por sí misma qué clima significa `habitual`, `seco` o `humedo`.

## 2. Interfaz de dominio propuesta

Módulo: `backend/src/domain/simulation/puntuacion-d7.js`.

```js
calcularPuntuacionesD7({
  modo,
  prioridad,
  escenarios,
  reglas,
  estrategias,
  evidencia,
})
```

Es una interfaz interna experimental. La función devuelve una puntuación para cada estrategia y escenario, o `null` con motivo. `modo: "real"` lanza `ErrorPuntuacionD7` con código `MODO_NO_HABILITADO_D7`; `demo` pertenece al ejemplo de Minimax y no se procesa aquí. La validación de entrada/configuración inválida lanza un error de dominio identificable; una estrategia descartada y una puntuación no calculable son resultados distintos y no errores de esquema. Solo se acepta el conjunto completo de escenarios `habitual`, `seco` y `humedo`.

### Entrada propuesta

El siguiente esquema `modo: "real"` describe la forma futura de entrada; no es ejecutable en esta versión porque el módulo rechaza ese modo. La entrada sintética ejecutable está completa en §4.

```json
{
  "modo": "real",
  "prioridad": "equilibrio",
  "escenarios": ["habitual", "seco", "humedo"],
  "reglas": {
    "id": "identificador-ratificado",
    "version": "version-ratificada",
    "indicadores": [
      {
        "id": "identificador-de-indicador",
        "unidad": "unidad explícita",
        "direccion": "mayor_mejor",
        "normalizacion": {"min": 0, "max": 100},
        "pesosPorPrioridad": {
          "equilibrio": 1,
          "agua": 1,
          "suelo": 1
        },
        "fuenteIds": ["fuente-documentada"]
      }
    ]
  },
  "estrategias": [
    {
      "id": "estrategia-1",
      "elegible": true,
      "motivosDescarte": [],
      "valoresPorEscenario": {
        "habitual": {
          "identificador-de-indicador": {
            "valor": 50,
            "unidad": "unidad explícita",
            "fuenteIds": ["fuente-documentada"]
          }
        },
        "seco": {},
        "humedo": {}
      }
    }
  ],
  "evidencia": {
    "catalogoVersion": "versión del catálogo",
    "fuentes": []
  }
}
```

Esquema intencionalmente explícito: el módulo rechaza pesos/normalizaciones faltantes, unidad discordante, límites inválidos, referencias de fuentes inexistentes, prioridad/escenario desconocido, duplicados y valores no numéricos/no finitos. No completa parámetros con defaults. En esta versión **todos los indicadores declarados son requeridos, aunque su peso para la prioridad elegida sea cero**. Para `prueba_sintetica`, las fuentes deben declararse `tipo: "sintetica"`. La comprobación de que un `fuenteId` existe solo verifica resolución referencial; **no comprueba calidad, pertinencia ni validez científica**. En un futuro modo real, el orquestador tendría que aportar metadatos suficientes para reconstruir datos climáticos (proveedor, URL de consulta sin secretos, coordenadas, período, unidades, fecha de consulta, cobertura y origen `live`/`backup`) como requiere `docs/contrato-api.md`.

Los campos `min`, `max`, `direccion` y pesos expresan un mecanismo de normalización/combinación propuesto, no parámetros agronómicos aprobados. Sus valores, definiciones, fuentes y reglas finales siguen pendientes en D7. Además, queda por acordar qué función pura transforma los datos originales de clima/catálogo en cada indicador y valor de `valoresPorEscenario`; no se debe fingir que esos indicadores ya existen en el sistema.

### Salida propuesta

```json
{
  "modo": "real",
  "prioridad": "equilibrio",
  "reglas": {"id": "identificador-ratificado", "version": "version-ratificada"},
  "escenarios": ["habitual", "seco", "humedo"],
  "resultados": [
    {
      "estrategiaId": "estrategia-1",
      "elegible": true,
      "puntuaciones": {"habitual": 50, "seco": null, "humedo": 70},
      "motivosNoCalculable": {"seco": ["INDICADOR_AUSENTE: identificador-de-indicador"]},
      "motivosDescarte": []
    }
  ],
  "evidencia": {
    "catalogoVersion": "versión del catálogo",
    "fuenteIds": ["fuente-documentada"]
  }
}
```

Para `elegible: false`, se conservan los motivos de descarte y la estrategia no recibe valores que puedan participar como puntuaciones en Minimax; no se exigen observaciones. Para `elegible: true` con indicador ausente o `null`, solo los escenarios afectados devuelven `null` con motivo; los restantes se calculan y no se redistribuyen pesos. La ausencia de un valor es faltante; un valor presente con tipo no numérico, `NaN`/infinito o fuera del rango es inválido. Si Minimax recibe una matriz elegible incompleta, su contrato actual devuelve `incompleto` y `ganadoras: []`.

## 3. Propuesta de cálculo de ingeniería (no agronómica)

El mecanismo experimental implementa normalización lineal acotada y combinación por media ponderada, exclusivamente como propuesta de ingeniería pendiente de ratificación:

```text
normalizado(x, min, max, mayor_mejor) = 100 * (x - min) / (max - min)
normalizado(x, min, max, menor_mejor) = 100 * (max - x) / (max - min)
puntuacion = suma(peso[indicador] * normalizado[indicador])
```

La función exige `min < max`, límites y valores finitos, valor dentro del rango, pesos finitos no negativos y pesos explícitos para las tres prioridades. Para cada prioridad, la suma **entre todos los indicadores** debe ser 1 con `TOLERANCIA_SUMA_PESOS_D7 = 1e-12`, tolerancia exclusivamente numérica para coma flotante. No se recortan valores fuera del rango ni se renormalizan pesos ante faltantes. Si falta cualquier indicador declarado (también con peso cero), la puntuación de ese escenario es `null` con motivo. Una desviación del resultado fuera de `[0, 100]` solo se ajusta al extremo si su magnitud no supera `TOLERANCIA_REDONDEO_D7 = 2e-10`; desviaciones mayores generan error. Ambas tolerancias son técnicas, no agronómicas. La orientación favorable, límites, forma funcional y pesos siguen pendientes; esta fórmula no constituye validación agronómica.

La configuración debe contener conjuntos de pesos explícitos para las tres prioridades: `equilibrio`, `agua` y `suelo`. La prioridad selecciona el conjunto recibido; no altera la probabilidad de escenarios. La escala `0–100` y dirección «mayor es mejor» constan como decisiones acordadas en `contratos-dominio.md` §0.3; el método que genera esa escala no está acordado.

## 4. Ejemplo numérico completo, sintético

> **SOLO PARA PRUEBAS; SIN VALIDEZ AGRONÓMICA**
>
> Todos los nombres, unidades, valores, límites y pesos siguientes son fixtures inventados para comprobar la aritmética del mecanismo. No describen indicadores agrícolas reales, no usan NASA ni pueden incluirse como reglas de producción.

Entrada común para tres llamadas (una llamada por prioridad):

```json
{
  "modo": "prueba_sintetica",
  "prioridad": "equilibrio",
  "escenarios": ["habitual", "seco", "humedo"],
  "reglas": {
    "id": "fixture-solo-pruebas",
    "version": "1",
    "indicadores": [
      {
        "id": "agua_sintetica",
        "unidad": "punto_sintetico",
        "direccion": "mayor_mejor",
        "normalizacion": {"min": 0, "max": 100},
        "pesosPorPrioridad": {"equilibrio": 0.5, "agua": 0.8, "suelo": 0.2},
        "fuenteIds": ["fixture-sintetico"]
      },
      {
        "id": "ajuste_suelo_sintetico",
        "unidad": "punto_sintetico",
        "direccion": "mayor_mejor",
        "normalizacion": {"min": 0, "max": 100},
        "pesosPorPrioridad": {"equilibrio": 0.5, "agua": 0.2, "suelo": 0.8},
        "fuenteIds": ["fixture-sintetico"]
      }
    ]
  },
  "estrategias": [
    {
      "id": "A", "elegible": true, "motivosDescarte": [],
      "valoresPorEscenario": {
        "habitual": {"agua_sintetica": {"valor": 80, "unidad": "punto_sintetico", "fuenteIds": ["fixture-sintetico"]}, "ajuste_suelo_sintetico": {"valor": 60, "unidad": "punto_sintetico", "fuenteIds": ["fixture-sintetico"]}},
        "seco": {"agua_sintetica": {"valor": 40, "unidad": "punto_sintetico", "fuenteIds": ["fixture-sintetico"]}, "ajuste_suelo_sintetico": {"valor": 60, "unidad": "punto_sintetico", "fuenteIds": ["fixture-sintetico"]}},
        "humedo": {"agua_sintetica": {"valor": 70, "unidad": "punto_sintetico", "fuenteIds": ["fixture-sintetico"]}, "ajuste_suelo_sintetico": {"valor": 60, "unidad": "punto_sintetico", "fuenteIds": ["fixture-sintetico"]}}
      }
    },
    {
      "id": "B", "elegible": true, "motivosDescarte": [],
      "valoresPorEscenario": {
        "habitual": {"agua_sintetica": {"valor": 60, "unidad": "punto_sintetico", "fuenteIds": ["fixture-sintetico"]}, "ajuste_suelo_sintetico": {"valor": 90, "unidad": "punto_sintetico", "fuenteIds": ["fixture-sintetico"]}},
        "seco": {"agua_sintetica": {"valor": 70, "unidad": "punto_sintetico", "fuenteIds": ["fixture-sintetico"]}, "ajuste_suelo_sintetico": {"valor": 90, "unidad": "punto_sintetico", "fuenteIds": ["fixture-sintetico"]}},
        "humedo": {"agua_sintetica": {"valor": 80, "unidad": "punto_sintetico", "fuenteIds": ["fixture-sintetico"]}, "ajuste_suelo_sintetico": {"valor": 90, "unidad": "punto_sintetico", "fuenteIds": ["fixture-sintetico"]}}
      }
    }
  ],
  "evidencia": {
    "catalogoVersion": "fixture-sintetico-1",
    "fuentes": [{"id": "fixture-sintetico", "tipo": "sintetica", "url": null, "fecha": null, "notas": "SOLO PARA PRUEBAS; SIN VALIDEZ AGRONÓMICA"}]
  }
}
```

Para las llamadas segunda y tercera solo cambia `prioridad` a `agua` y `suelo`. Como `min=0`, `max=100` y ambos indicadores son sintéticos, la normalización es identidad. Por ejemplo, A/`habitual`/`equilibrio` = `0.5×80 + 0.5×60 = 70`; A/`seco`/`agua` = `0.8×40 + 0.2×60 = 44`.

Salida de puntuación esperada (columnas en orden `habitual`, `seco`, `humedo`):

| Prioridad | Estrategia A | Estrategia B |
|---|---:|---:|
| `equilibrio` | 70, 50, 65 | 75, 80, 85 |
| `agua` | 76, 44, 68 | 66, 74, 82 |
| `suelo` | 64, 56, 62 | 84, 86, 88 |

Ejemplo de forma de salida para la llamada `prioridad: "agua"`:

```json
{
  "modo": "prueba_sintetica",
  "prioridad": "agua",
  "escenarios": ["habitual", "seco", "humedo"],
  "resultados": [
    {"estrategiaId":"A","elegible":true,"puntuaciones":{"habitual":76,"seco":44,"humedo":68},"motivosNoCalculable":{},"motivosDescarte":[]},
    {"estrategiaId":"B","elegible":true,"puntuaciones":{"habitual":66,"seco":74,"humedo":82},"motivosNoCalculable":{},"motivosDescarte":[]}
  ],
  "evidencia":{"catalogoVersion":"fixture-sintetico-1","fuenteIds":["fixture-sintetico"]}
}
```

Después, un adaptador pasa a Minimax `{id, elegible, puntuaciones, motivosDescarte}`. Si se ejecutara la llamada sintética de prioridad `agua`, B tendría el menor peor arrepentimiento: máximos por escenario `[76, 74, 82]`; arrepentimientos A `[0, 30, 14]`, B `[10, 0, 0]`; peores arrepentimientos A `30`, B `10`. Esto verifica aritmética de ejemplo y no es una recomendación.

## 5. Ejemplo sintético con faltante

> **SOLO PARA PRUEBAS; SIN VALIDEZ AGRONÓMICA**

Usar la entrada sintética anterior en la llamada `prioridad: "agua"`, pero reemplazar `A.valoresPorEscenario.seco.agua_sintetica` por `null` (indicador requerido ausente). No renormalizar el peso de `ajuste_suelo_sintetico` de 0.2 a 1.

Salida parcial correspondiente:

```json
{
  "estrategiaId": "A",
  "elegible": true,
  "puntuaciones": {"habitual": 76, "seco": null, "humedo": 68},
  "motivosNoCalculable": {"seco": ["INDICADOR_AUSENTE: agua_sintetica"]},
  "motivosDescarte": []
}
```

La estrategia A sigue elegible, pero la matriz de puntuaciones de estrategias elegibles queda incompleta. Al pasarla a `calcularMinimaxRegret()`, el resultado esperado es `estado: "incompleto"` y `ganadoras: []`. Esto es distinto de una estrategia no elegible, que lleva motivo de descarte y no participa en Minimax.

## 6. Separación de modo real, sintético y demo

- **`real`:** no está habilitado en esta versión. Se rechaza con `MODO_NO_HABILITADO_D7` hasta que se ratifiquen D6/D7 y exista integración trazable. No se presenta esa limitación como falta de datos climáticos.
- **`prueba_sintetica`:** único modo aceptado por el módulo. Usa fixtures explícitos para probar el cálculo, con etiquetas que impidan confundirlos con datos observados. No produce por sí solo una salida pública de recomendación.
- **`demo`:** el ejemplo existente de `docs/contrato-api.md` puede verificar Minimax con la matriz ficticia. Es un flujo separado; no se alimenta de clima o puntuaciones reales ni se presenta como D7.

El módulo exige fuentes `tipo: "sintetica"` en su modo habilitado y conserva el modo en la salida. El demo de Minimax sigue separado. Un futuro adaptador HTTP no debe quitar la etiqueta ni permitir que datos sintéticos aparezcan como reales.

## 7. Pruebas requeridas para la futura implementación

1. Con entrada sintética completa, obtener exactamente las puntuaciones de la sección 4 para las tres prioridades y los tres escenarios.
2. Verificar rango distinto de `[0, 100]`, dirección `menor_mejor` y ambos extremos.
3. Verificar faltantes por escenario, sin redistribuir pesos, incluso si el peso del indicador es cero; Minimax devuelve incompleto y ninguna ganadora.
4. Verificar descartes sin pedir observaciones, con motivos conservados.
5. Rechazar entradas/configuración inválidas, pesos no válidos para cualquiera de las prioridades, unidades incompatibles, fuentes no resueltas y duplicados.
6. Verificar inmutabilidad, determinismo y que `real`/`demo` no se aceptan.
7. Integrar por composición con el Minimax existente: con prioridad `agua`, arrepentimientos A=30 y B=10, ganadora B; con matriz incompleta, estado incompleto y ganadoras vacías.
8. Antes de una integración HTTP real, acordar mapeo `puntuaciones` → `puntajes` y metadatos de procedencia sin ampliar unilateralmente la API.

Estas pruebas verifican solo el mecanismo técnico. Los fixtures siguen rotulados **SOLO PARA PRUEBAS; SIN VALIDEZ AGRONÓMICA**; no se habilita modo real al aprobarlas.

## 8. Decisiones pendientes

La integración queda bloqueada para puntuaciones agronómicas reales hasta que se aprueben: D6 y su relación con D7; indicadores y unidades; origen y evidencia de parámetros por estrategia; sentido favorable por indicador; funciones/límites de normalización; pesos por prioridad; regla de faltantes; fuentes y versionado; conjunto de estrategias/ciclos elegibles; y contrato entre el módulo, orquestador HTTP y respuesta pública. Esta propuesta de ingeniería ofrece una interfaz comprobable, no resuelve esas decisiones.

## Referencias locales

- `backend/src/domain/simulation/puntuacion-d7.js`: `calcularPuntuacionesD7()` implementa el mecanismo experimental, solo modo sintético.
- `backend/src/domain/simulation/puntuacion-d7.test.js`: pruebas de mecanismo y composición con Minimax.
- `backend/src/domain/simulation/minimax-regret.js`: `calcularMinimaxRegret()` consume `puntuaciones` ya calculadas.
- `backend/src/domain/catalog/validar-catalogo.js`: validación estructural de parámetros `valor`/`unidad`/`fuenteId`; no normaliza ni pondera.
- `backend/src/domain/simulation/validar-clima.js`: validación estructural/climática; no genera escenarios D6.
- `backend/src/domain/simulation/elegibilidad.js` y `compatibilidad-temporal.js`: elegibilidad y compatibilidad, distintas de D7.
- `docs/contrato-api.md`: endpoint de simulación propuesto, estados y nombres públicos `puntajes`/evidencia; ejemplo `demo` ficticio.
- `docs/metodologia/contratos-dominio.md` §0.3, §2.6, §5–§7, §10: escala acordada, reglas pendientes y separación de estados.
