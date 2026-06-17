# Lesson data format

Each lesson JSON object must follow this structure:

```json
{
  "id": "week-01-day-01",
  "week": 1,
  "day": 1,
  "title": "Qué es Amadeus y para qué sirve",
  "estimatedMinutes": 35,
  "objective": "Entender qué es Amadeus GDS y qué papel tiene en viajes corporativos.",
  "explanation": [
    "Amadeus es una plataforma tecnológica usada en la industria del viaje.",
    "Un GDS conecta agencias, empresas de viaje y proveedores como aerolíneas u hoteles."
  ],
  "keyConcepts": [
    {
      "term": "GDS",
      "definition": "Sistema de distribución global que conecta agencias y proveedores de viaje."
    }
  ],
  "examples": [
    {
      "title": "Viaje corporativo simple",
      "content": "Un empleado necesita viajar de Madrid a París. La consultora debe comprobar fechas, horarios, política, tarifa y condiciones."
    }
  ],
  "exercises": [
    {
      "id": "ex-001",
      "type": "open",
      "question": "¿Por qué una Travel Consultant no debe elegir siempre el vuelo más barato?",
      "expectedAnswer": "Porque debe revisar política, horarios, equipaje, condiciones de cambio, reembolso y riesgo total.",
      "correctionCriteria": [
        "Menciona política corporativa.",
        "Menciona condiciones de tarifa.",
        "Menciona que precio inicial no equivale a mejor opción."
      ]
    }
  ],
  "quiz": [
    {
      "id": "q-001",
      "type": "multiple-choice",
      "question": "¿Qué es un GDS?",
      "options": [
        "Un billete emitido",
        "Un sistema que conecta agencias y proveedores de viaje",
        "Una aerolínea",
        "Una maleta facturada"
      ],
      "correctAnswer": 1,
      "explanation": "Un GDS es un sistema de distribución global."
    }
  ],
  "summary": [
    "Amadeus es una herramienta de gestión de viajes.",
    "Una Travel Consultant debe aplicar política y revisar condiciones, no solo buscar precios."
  ],
  "safetyNote": "Este contenido es formativo. Los procedimientos reales deben verificarse con formación oficial e instrucciones internas."
}

---

# 9. Glosario inicial en JSON

`data/glossary.json`:

```json
[
  {
    "term": "GDS",
    "definition": "Sistema de distribución global que conecta agencias, empresas de viaje y proveedores como aerolíneas, hoteles o alquiler de coches.",
    "example": "Amadeus es uno de los principales GDS usados en la industria del viaje."
  },
  {
    "term": "Amadeus",
    "definition": "Plataforma usada para buscar, reservar y gestionar servicios de viaje.",
    "example": "Una Travel Consultant puede usar Amadeus para consultar disponibilidad y gestionar reservas."
  },
  {
    "term": "PNR",
    "definition": "Expediente de reserva donde se guarda información del viaje, pasajero, segmentos, contactos y otros datos.",
    "example": "Un PNR puede existir antes de que el billete esté emitido."
  },
  {
    "term": "Ticket",
    "definition": "Billete emitido con valor económico que permite viajar bajo determinadas condiciones.",
    "example": "Cambiar un ticket emitido puede requerir reissue y tener penalización."
  },
  {
    "term": "Unticketed",
    "definition": "Estado de una reserva cuando todavía no tiene billete emitido.",
    "example": "Una reserva unticketed puede perderse si no se emite antes del deadline."
  },
  {
    "term": "Segmento",
    "definition": "Cada tramo individual de un viaje.",
    "example": "Madrid-París-Madrid tiene dos segmentos."
  },
  {
    "term": "SSR",
    "definition": "Special Service Request. Solicitud o dato especial enviado a la aerolínea que puede requerir acción o confirmación.",
    "example": "Una solicitud de silla de ruedas suele gestionarse como SSR."
  },
  {
    "term": "OSI",
    "definition": "Other Service Information. Información adicional para la aerolínea, normalmente informativa.",
    "example": "Un dato informativo que no requiere acción puede enviarse como OSI según el proceso."
  },
  {
    "term": "Fare rules",
    "definition": "Condiciones de una tarifa, incluyendo cambios, reembolsos, penalizaciones, no-show y restricciones.",
    "example": "Antes de recomendar una tarifa hay que revisar sus fare rules."
  },
  {
    "term": "Reissue",
    "definition": "Reemisión de un billete ya emitido cuando se modifica el viaje.",
    "example": "Cambiar la vuelta de un ticket emitido puede requerir reissue."
  },
  {
    "term": "Refund",
    "definition": "Reembolso según las condiciones de la tarifa.",
    "example": "Cancelar una reserva no significa automáticamente obtener refund."
  },
  {
    "term": "Void",
    "definition": "Anulación temprana de una emisión dentro de un plazo permitido.",
    "example": "Void no es lo mismo que refund."
  },
  {
    "term": "Queue",
    "definition": "Bandeja de trabajo donde pueden llegar reservas o mensajes que requieren acción.",
    "example": "Un schedule change puede aparecer en una queue."
  },
  {
    "term": "Schedule change",
    "definition": "Cambio de horario, vuelo o itinerario hecho por la aerolínea.",
    "example": "Si la aerolínea cambia una conexión, puede requerir revisión."
  },
  {
    "term": "Corporate policy",
    "definition": "Normas de viaje de una empresa cliente.",
    "example": "La política puede exigir la tarifa más económica dentro de unas condiciones."
  }
]
