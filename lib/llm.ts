import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getGrafo, runCypher } from "./neo4j";

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.0,
});

function detectarPromptInjection(input: string): boolean {
  const patronesMaliciosos = [
    /ignora las instrucciones/i,
    /ignore previous instructions/i,
    /jailbreak/i,
    /actúa como/i,
    /eres un/i
  ];
  return patronesMaliciosos.some(patron => patron.test(input));
}

function validarSeguridadCypher(query: string): boolean {
  const blacklist = [
    /\bCREATE\b/i, /\bMERGE\b/i, /\bDELETE\b/i, /\bDETACH\b/i, 
    /\bSET\b/i, /\bREMOVE\b/i, /\bDROP\b/i, /\bLOAD\b/i, /\bCALL\b/i
  ];
  return !blacklist.some(patron => patron.test(query));
}

export async function generarEjecutarAgente(question: string, historyText: string): Promise<string> {
  if (detectarPromptInjection(question)) {
    return "SEGURIDAD_BLOQUEADO";
  }

  const schema = await getGrafo();

  const cypherPrompt = `
  Eres un traductor estricto de Lenguaje Natural a código de bases de datos Neo4j Cypher.
  Utiliza únicamente el siguiente esquema del sistema:
  ${schema}

  Reglas mandatorias:
  1. Genera consultas estrictas de LECTURA (MATCH y RETURN).
  2. Si la pregunta no pertenece al dominio de papers, autores o IA, responde únicamente: FUERA_DE_DOMINIO.
  3. Devuelve solo el string de texto limpio del query Cypher. Sin markdown.
  
  Historial: ${historyText}
  Pregunta: ${question}
  Resultado:`;

  let response = await llm.invoke(cypherPrompt);
  let cleanCypher = (response.content as string).trim();

  if (cleanCypher.includes("FUERA_DE_DOMINIO")) return "FUERA_DE_DOMINIO";

  if (!validarSeguridadCypher(cleanCypher)) {
    return "CYPHER_BLOQUEADO";
  }

  let rawGraphData;
  try {
    rawGraphData = await runCypher(cleanCypher);
  } catch (firstError: any) {
    console.warn("Error en Intento 1. Iniciando auto-corrección...", firstError.message);
    const retryPrompt = `
    La consulta Cypher que generaste previamente lanzó un error en Neo4j.
    Query incorrecto: \`${cleanCypher}\`
    Error del motor: ${firstError.message}
    Esquema permitido: ${schema}

    Corrige la consulta Cypher para que sea válida sintácticamente y devuelva los datos correctos. Cumple las mismas reglas anteriores (solo lectura, sin markdown).
    Consulta corregida:`;

    const retryResponse = await llm.invoke(retryPrompt);
    cleanCypher = (retryResponse.content as string).trim();

    if (!validarSeguridadCypher(cleanCypher)) return "CYPHER_BLOQUEADO";

    rawGraphData = await runCypher(cleanCypher);
  }

  const synthesisPrompt = `
  Eres un asistente académico experto. Responde al usuario interpretando estos datos estructurados del grafo de Neo4j.
  Pregunta: ${question}
  Datos del grafo: ${JSON.stringify(rawGraphData)}
  
  Formatos: Responde amigablemente en español. Si está vacío ([]), notifícalo con cortesía. Usa listas si hay muchos elementos.
  `;

  const finalAnswer = await llm.invoke(synthesisPrompt);
  return finalAnswer.content as string;
}