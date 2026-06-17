# Terminal realista de vuelos y PNR

## Objetivo

Ampliar el terminal de Amadeus Learning Coach para que reproduzca con mayor fidelidad el flujo mental y operativo de un agente que trabaja con vuelos y PNR. La simulacion debe ser pedagogica, coherente y completamente local. No consultara inventario, tarifas, perfiles, colas ni reservas reales.

El resultado buscado es un simulador formativo de realismo guiado: la sintaxis, la secuencia de trabajo, los mensajes y los errores se pareceran a una sesion criptica, pero todos los datos y efectos seran ficticios.

## Alcance

La primera ampliacion profundizara en:

- consulta y navegacion de disponibilidad aerea;
- seleccion, venta y cancelacion de segmentos simulados;
- construccion, validacion, cierre, recuperacion e ignorado de un PNR local;
- nombres, contactos, ticketing, recibido de, SSR, OSI y observaciones;
- cotizacion y reglas tarifarias simplificadas y ficticias;
- colas y perfiles simulados como introduccion;
- errores dependientes del estado y ayuda contextual;
- escenarios guiados y uso libre del mismo motor.

Quedan fuera las conexiones externas, inventario vivo, reservas reales, emision, reemisiones, reembolsos, pagos, cancelaciones reales y modificacion de sistemas de proveedores.

## Experiencia

El terminal conservara el banner persistente de modo seguro. La interfaz ofrecera dos modos mediante un control segmentado:

- **Guiado:** presenta un objetivo, indica el siguiente tipo de accion y explica cada respuesta.
- **Libre:** permite practicar los comandos admitidos sin una secuencia obligatoria, manteniendo explicaciones opcionales.

Ambos modos compartiran historial, autocompletado y el mismo estado local. Los resultados principales se mostraran como salida criptica. La explicacion pedagogica aparecera separada visualmente para que el alumno aprenda a distinguir la respuesta del sistema de la interpretacion didactica.

## Arquitectura

El motor se dividira en unidades con responsabilidades claras:

1. **Parser:** normaliza la entrada y produce una instruccion tipada con argumentos.
2. **Catalogo:** define comandos admitidos, ejemplos, ayuda y requisitos de contexto.
3. **Sesion:** conserva area de trabajo, PNR activo, disponibilidad, tarifa, cola, historial y modo.
4. **Ejecutor:** valida precondiciones, aplica cambios locales y genera respuestas estructuradas.
5. **Formateadores:** convierten disponibilidad, PNR, tarifas y errores en lineas de terminal.
6. **Escenarios:** describen objetivos, pasos validos y criterios de finalizacion sin duplicar logica del motor.
7. **Vista:** renderiza el terminal, el modo guiado, la puntuacion y los errores de aprendizaje.

Las respuestas del motor conservaran `output`, `explanation`, `contextualHelp`, `safeMode` y `disclaimer`. Se anadiran `status`, `stateChanges` y, cuando corresponda, `errorCode`.

## Estado del PNR

El PNR local tendra estados explicitos:

- `EMPTY`: sin elementos;
- `WORKING`: contiene cambios sin finalizar;
- `COMMITTED`: PNR ficticio guardado localmente con localizador de entrenamiento;
- `RETRIEVED`: PNR ficticio recuperado para consulta o edicion;
- `IGNORED`: cambios pendientes descartados.

El cierre validara los elementos obligatorios: al menos un nombre, un segmento, un contacto, ticketing y recibido de. `ER` guardara y volvera a mostrar el PNR; `ET` guardara y cerrara el area de trabajo; `IG` descartara cambios no guardados. Ninguna accion creara una reserva fuera del navegador.

## Comandos

### Disponibilidad y navegacion

- `AN17JUNMADAMS`
- `AN17JUNMADAMS/IB`
- `AN17JUNMADAMS/IB/CY`
- `MD`, `MU`, `MB`, `MT`
- `DO1`

La disponibilidad usara vuelos, horarios, clases y plazas generados por un catalogo local determinista. Los codigos publicos pueden ser reales como referencia; los numeros, cupos y condiciones se identificaran como simulados.

### Segmentos y PNR

- `SS1Y1`
- `XE1`
- `NM1GARCIA/ANA MS`
- `AP MAD 600000000`
- `TKOK`
- `RF ANA`
- `RM TEXTO DE ENTRENAMIENTO`
- `SR WCHR`
- `SR VGML`
- `OS IB TEXTO DE ENTRENAMIENTO`
- `RT`
- `RT TRAIN1`
- `ER`, `ET`, `IG`

Los comandos de eliminacion o modificacion actuaran exclusivamente sobre la copia local. Los datos de ejemplo seran ficticios.

### Tarifas

- `FXP`
- `FXX`
- `FQN1`
- `TQT`

La cotizacion producira una tarifa y tasas inventadas a partir de reglas locales. `FXX` sera informativo y no almacenara la tarifa; `FXP` guardara una cotizacion ficticia en el PNR; `FQN1` mostrara reglas resumidas; `TQT` recuperara la tarifa almacenada.

### Colas, perfiles y ayuda

- `QT`
- `QS8`
- `QN`
- `PDN/DEMO CORP`
- `HE`, `HE NM`, `HE SR`, `HE FXP`

Las colas contendran expedientes de demostracion y el perfil sera una plantilla ficticia de empresa. No se replicaran datos corporativos reales.

## Errores y realismo contextual

El ejecutor rechazara acciones incompatibles con el estado. Ejemplos:

- vender sin disponibilidad previa: `NO AVAILABILITY ACTIVE`;
- finalizar sin elementos obligatorios: `NEED RECEIVED FROM`, `NEED CONTACT ELEMENT` u otro requisito concreto;
- cotizar sin segmentos: `NO ITINERARY`;
- recuperar un localizador inexistente: `RECORD LOCATOR NOT FOUND - TRAINING DATA ONLY`;
- usar una linea fuera de rango: `CHECK LINE NUMBER`;
- usar datos con aspecto sensible: advertencia para sustituirlos por datos ficticios.

Cada error incluira una explicacion en espanol y una sugerencia accionable, pero la linea de terminal se mantendra concisa.

## Escenarios guiados

La primera entrega incluira tres escenarios:

1. Crear y finalizar un PNR basico de ida.
2. Anadir SSR y OSI adecuados y corregir una clasificacion incorrecta.
3. Comparar una cotizacion informativa con una almacenada y revisar reglas.

El escenario comprobara resultados y estado, no una unica cadena exacta. Asi permitira rutas validas alternativas sin convertir la practica en memorizacion rigida.

## Persistencia

El navegador guardara en `localStorage`:

- modo seleccionado;
- PNR ficticios finalizados;
- area de trabajo actual;
- historial reciente;
- progreso y errores de escenarios.

La opcion `RESET` limpiara solo la sesion activa tras una confirmacion visible. Se ofrecera una accion independiente para borrar todos los datos locales de entrenamiento.

## Seguridad

- No habra llamadas de red desde el motor del terminal.
- No se incluiran credenciales, endpoints ni SDK de Amadeus o proveedores.
- La salida mostrara permanentemente que es un simulador no conectado.
- Los localizadores comenzaran por `TRN` o se marcaran expresamente como entrenamiento.
- Los comandos de emision, reembolso, reemision, pago o cancelacion de proveedor responderan como no disponibles.
- Los telefonos, correos, nombres y empresas de los ejemplos seran ficticios.
- La aplicacion no se presentara como formacion oficial de Amadeus.

## Pruebas

El desarrollo seguira ciclos TDD. Las pruebas cubriran:

- reconocimiento y argumentos de cada familia de comandos;
- transiciones validas e invalidas del PNR;
- validacion de elementos obligatorios;
- navegacion de disponibilidad;
- alta, cancelacion y renumeracion de elementos;
- cotizacion informativa frente a almacenada;
- recuperacion e ignorado;
- colas y perfiles ficticios;
- persistencia y reinicio;
- bloqueo de operaciones prohibidas;
- funcionamiento de escenarios mediante resultados equivalentes.

La validacion final incluira pruebas automatizadas y un recorrido en navegador por modo guiado y modo libre, comprobando consola, salida visible, persistencia y disposicion responsive.

## Criterios de aceptacion

- Un alumno puede construir, validar, finalizar, recuperar y modificar un PNR ficticio sin abandonar el terminal.
- Los errores dependen del contexto y explican como continuar.
- La disponibilidad se puede navegar y consultar antes de vender.
- Las tarifas ficticias distinguen cotizacion informativa y almacenada.
- SSR, OSI y observaciones se reflejan correctamente en el PNR local.
- Los escenarios guiados usan el mismo motor que el modo libre.
- Recargar la pagina conserva el progreso y el estado local previsto.
- Ninguna accion consulta o modifica sistemas externos.
