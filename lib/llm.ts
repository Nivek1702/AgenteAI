import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getGrafo, runCypher } from "./neo4j";

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.0,
  apiKey: process.env.GOOGLE_API_KEY,
});

export async function generarEjecutarAgent(question: string, historyText: string): Promise<string> {
  const schema = await getGrafo();

  const cypherPrompt = `
  Eres un traductor estricto de Lenguaje Natural a código de bases de datos Neo4j Cypher.
  Utiliza únicamente el siguiente esquema mapeado del sistema:
  ${schema}

  Reglas mandatorias de control:
  1. Genera única y exclusivamente consultas de LECTURA (usando MATCH y RETURN). Está prohibido usar palabras de modificación como CREATE, MERGE, SET, DELETE, REMOVE o DROP.
  2. Si la pregunta del usuario no tiene ninguna relación temática con el grafo de publicaciones científicas, autores, áreas de IA o universidades, debes responder única y exclusivamente con la palabra exacta: FUERA_DE_DOMINIO.
  3. Devuelve únicamente el string limpio de la consulta Cypher. No agregues formatos de markdown como \`\`\`cypher, ni texto aclaratorio.

  Historial reciente del chat:
  ${historyText}

  Pregunta del usuario: ${question}
  Resultado:`;

  const response = await llm.invoke(cypherPrompt);
  const cleanCypher = (response.content as string).trim();

  if (cleanCypher.includes("FUERA_DE_DOMINIO")) {
    return "FUERA_DE_DOMINIO";
  }

  try {
    const rawGraphData = await runCypher(cleanCypher);
    const synthesisPrompt = `
    Eres un asistente académico experto. Tu tarea es responder la duda del usuario interpretando los datos estructurados que se extrajeron del grafo de Neo4j.

    Pregunta del usuario: ${question}
    Datos del grafo recuperados: ${JSON.stringify(rawGraphData)}

    Instrucciones de formato:
    - Responde amigablemente en español fluido.
    - SI LOS DATOS CONTIENEN MÚLTIPLES ELEMENTOS (como una lista de palabras clave, autores o títulos), organízalos obligatoriamente en una lista con viñetas (usando guiones de la forma "- Elemento") colocando cada uno en una línea nueva. Está prohibido ponerlos seguidos en un solo párrafo.
    - Si el conjunto de datos recuperados viene vacío ([]), indícale al usuario con cortesía que no cuentas con registros específicos que coincidan con esos criterios de búsqueda en el sistema.
    `;
    const finalAnswer = await llm.invoke(synthesisPrompt);

    return finalAnswer.content as string;

  } catch (error) {
    console.error("Fallo de ejecución Cypher:", cleanCypher, error);
    return "Lo siento, experimenté una inconsistencia al procesar la lógica de la consulta interna. Por favor, intenta estructurar tu pregunta de otra forma.";
  }
}