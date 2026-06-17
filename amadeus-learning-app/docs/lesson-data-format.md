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
