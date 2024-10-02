import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

let questionCounter = 0

export async function POST(request: Request) {
  const { content } = await request.json()

  if (!content || content.trim() === '') {
    return NextResponse.json({ error: 'No se recibió contenido válido' }, { status: 400 })
  }

  try {
    console.log("Mensaje enviado a Claude:", JSON.stringify({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 4000,
      temperature: 0,
      system: `Genera 5 preguntas de opción múltiple basadas en el siguiente texto. Cada pregunta debe tener 4 opciones de respuesta. Proporciona la respuesta correcta para cada pregunta. Responde SOLO con un array JSON en el siguiente formato, sin agregar ningún texto adicional:

[
  {
    "question": "Pregunta 1",
    "options": ["Opción 1", "Opción 2", "Opción 3", "Opción 4"],
    "correctAnswer": 0
  },
  ...
]

El índice de correctAnswer debe ser un número del 0 al 3, correspondiente a la posición de la respuesta correcta en el array de opciones.`,
      messages: [
        {
          role: "user",
          content: content
        }
      ]
    }, null, 2))

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 4000,
      temperature: 0,
      system: `Genera 5 preguntas de opción múltiple basadas en el siguiente texto. Cada pregunta debe tener 4 opciones de respuesta. Proporciona la respuesta correcta para cada pregunta. Responde SOLO con un array JSON en el siguiente formato, sin agregar ningún texto adicional:

[
  {
    "question": "Pregunta 1",
    "options": ["Opción 1", "Opción 2", "Opción 3", "Opción 4"],
    "correctAnswer": 0
  },
  ...
]

El índice de correctAnswer debe ser un número del 0 al 3, correspondiente a la posición de la respuesta correcta en el array de opciones.`,
      messages: [
        {
          role: "user",
          content: content
        }
      ]
    })

    const questions = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')

    questionCounter++
    console.log(`Respuestas número ${questionCounter} generadas por Claude: ${questions}`)

    return NextResponse.json({ questions })
  } catch (error) {
    return NextResponse.json({ error: 'Error al generar preguntas' }, { status: 500 })
  }
}
