# Especificación del terminal de entrenamiento

## Propósito

El terminal permite aprender la lógica de trabajo de vuelos y PNR mediante una simulación local inspirada en un entorno críptico. Enseña secuencias, dependencias, lectura de respuestas, control de calidad y recuperación de errores.

No es un terminal oficial de Amadeus y no sustituye la formación autorizada ni los procedimientos internos de una empresa.

## Límite técnico

- No se conecta a Amadeus, aerolíneas, hoteles, trenes, pagos ni sistemas corporativos.
- No consulta inventario, tarifas, perfiles ni colas reales.
- No crea, modifica o cancela reservas reales.
- No emite, reemite, anula o reembolsa billetes.
- Todo el estado se guarda localmente en el navegador.
- Los localizadores empiezan por `TRN` y todos los datos operativos son ficticios.

Cada pantalla muestra permanentemente:

> Training simulator only. Not connected to Amadeus or any real booking system.

## Modos

### Guiado

Presenta un objetivo profesional, pasos evaluables y la siguiente orientación. El progreso se calcula a partir del estado conseguido, no de una única cadena exacta.

Escenarios iniciales:

1. PNR básico de ida.
2. Calidad SSR y OSI.
3. Comparación de pricing informativo y almacenado.

### Libre

Permite utilizar todo el catálogo admitido sin una secuencia obligatoria. Conserva ayuda, historial, persistencia y límites de seguridad.

## Estado local del PNR

- `EMPTY`: área de trabajo vacía.
- `WORKING`: PNR nuevo con cambios pendientes.
- `COMMITTED`: PNR ficticio guardado localmente.
- `RETRIEVED`: copia local recuperada para revisión o edición.

Para finalizar se requieren nombre, segmento, contacto, ticketing y recibido de. Los errores identifican el primer elemento ausente.

## Catálogo de fase 1

### Disponibilidad

- `AN17JUNMADAMS`
- `AN17JUNMADAMS/IB`
- `MD`, `MU`, `MB`, `MT`
- `DO1`

La respuesta contiene diez opciones deterministas, seis por página, con clases, horarios, escalas y equipo ficticios. Los códigos públicos pueden ser reales como referencia; el inventario nunca lo es.

### Construcción y revisión del PNR

- `SS1Y1`
- `XE1`
- `NM1GARCIA/ANA MS`
- `AP MAD 600000000`
- `TKOK`
- `RF ANA`
- `SR WCHR/P1`
- `OS IB TRAINING PASSENGER`
- `RM TRAINING ONLY`
- `RT`, `RT TRN001`
- `ER`, `ET`, `IG`

`ER` valida, guarda y vuelve a mostrar. `ET` valida, guarda y cierra el área de trabajo. `IG` restaura la última copia guardada o limpia un PNR nuevo sin guardar.

### Tarifas

- `FXX`: cotización ficticia informativa, sin almacenar.
- `FXP`: almacena una tarifa ficticia en el PNR local.
- `FQN1`: reglas simplificadas de entrenamiento.
- `TQT`: muestra la tarifa almacenada.

El total, las tasas, el fare basis y las reglas se generan desde fixtures locales. Ningún comando emite un billete.

### Colas, perfiles y ayuda

- `QT`, `QS8`, `QN`
- `PDN/DEMO CORP`
- `HE`, `HE NM`, `HE SR`, `HE FXP`

Las colas contienen únicamente localizadores `TRN`. El perfil `DEMO CORP` es ficticio y no representa políticas de AMEX GBT ni de un cliente real.

## Operaciones prohibidas

Los formatos de emisión, reembolso, reemisión, void, pago o tarjeta se clasifican como `PROHIBITED` y responden:

`OPERATION NOT AVAILABLE IN TRAINING`

La sesión no se modifica. Esta prohibición incluye, entre otros, `TTP`, `TRF`, `FXQ`, `TRDC`, datos de tarjeta y formatos de pago.

## Persistencia

Se guarda bajo `amadeus-learning-coach-terminal-v2`:

- modo seleccionado;
- escenario seleccionado;
- progreso;
- historial y respuestas;
- disponibilidad activa;
- PNR y registros ficticios;
- cola local.

El esquema tiene versión y validación. Los datos corruptos o incompatibles generan una sesión nueva y segura.

## Respuestas y feedback

Cada ejecución devuelve tipo, entrada, salida, explicación, estado, aviso de simulación y, cuando procede, código de error y ayuda contextual. La salida críptica y la explicación pedagógica se muestran separadas.
