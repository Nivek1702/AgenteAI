import { NextResponse } from 'next/server';
import db from '../../../lib/db';

// GET: Devuelve la lista de todas las sesiones de chat para el Sidebar
export async function GET() {
  try {
    const chats = db.prepare('SELECT * FROM chats ORDER BY created_at DESC').all();
    return NextResponse.json(chats);
  } catch (error) {
    return NextResponse.json({ error: 'Error al recuperar el historial.' }, { status: 500 });
  }
}

// POST: Recupera los mensajes específicos de un chat seleccionado
export async function POST(request: Request) {
  try {
    const { chatId } = await request.json();
    const messages = db.prepare('SELECT role, content FROM messages WHERE chat_id = ? ORDER BY created_at ASC').all(chatId);                                                          
    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json({ error: 'Error al recuperar los mensajes.' }, { status: 500 });
  }
}