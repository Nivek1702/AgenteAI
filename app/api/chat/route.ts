import { NextResponse } from 'next/server';
import db from '../../../lib/db';
import { generarEjecutarAgente } from '../../../lib/llm';

export async function POST(request: Request) {
  try {
    const { message, chatId } = await request.json();

    if (!message || !chatId) {
      return NextResponse.json({ error: 'Faltan parámetros obligatorios.' }, { status: 400 });
    }

    // 1. Asegurar la existencia de la sesión en SQLite
    const sessionExists = db.prepare('SELECT id FROM chats WHERE id = ?').get(chatId);
    if (!sessionExists) {
      db.prepare('INSERT INTO chats (id, title) VALUES (?, ?)').run(chatId, message.substring(0, 40));
    }

    // 2. Extraer los últimos mensajes para simular la memoria contextual de la sesión
    const pastMessages = db.prepare('SELECT role, content FROM messages WHERE chat_id = ? ORDER BY created_at ASC LIMIT 8').all(chatId) as { role: string; content: string }[];
    const formattedHistory = pastMessages
      .map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
      .join('\n');

    // 3. Registrar de inmediato la consulta del usuario en local
    const userMsgId = Math.random().toString(36).substring(7);
    db.prepare('INSERT INTO messages (id, chat_id, role, content) VALUES (?, ?, ?, ?)').run(userMsgId, chatId, 'user', message);

    // 4. Invocar la ejecución del agente cognitivo
    const agentOutput = await generarEjecutarAgente(message, formattedHistory);
   
    // Evaluar y formatear salidas controladas de los Guardrails
    let finalPayloadText = agentOutput;

    if (agentOutput === 'FUERA_DE_DOMINIO') {
        finalPayloadText = 'Lo siento, mi base de conocimientos está estrictamente limitada a consultas analíticas sobre publicaciones científicas, autores e instituciones de IA.';
    } else if (agentOutput === 'SEGURIDAD_BLOQUEADO') {
        finalPayloadText = 'Acción bloqueada. Se ha detectado una instrucción no autorizada que viola las políticas de seguridad del sistema.';
    } else if (agentOutput === 'CYPHER_BLOQUEADO') {
        finalPayloadText = 'Seguridad: La consulta generada contenía comandos de escritura o modificación no permitidos para usuarios de lectura.';
    }

    // 5. Registrar la respuesta final en local para mantener consistencia en el historial
    const assistantMsgId = Math.random().toString(36).substring(7);
    db.prepare('INSERT INTO messages (id, chat_id, role, content) VALUES (?, ?, ?, ?)').run(assistantMsgId, chatId, 'assistant', finalPayloadText);

    return NextResponse.json({ content: finalPayloadText });

  } catch (error) {
    console.error('Error crítico en API chat route:', error);
    return NextResponse.json({ error: 'Error interno en el servidor.' }, { status: 500 });
  }
}