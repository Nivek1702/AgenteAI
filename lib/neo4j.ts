import neo4j from 'neo4j-driver';

const uri = process.env.NEO4J_URI || '';
const username = process.env.NEO4J_USERNAME || '';
const password = process.env.NEO4J_PASSWORD || '';

const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

export async function runCypher(query: string, params = {}) {
  const session = driver.session();
  try {
    const result = await session.run(query, params);
    return result.records.map(record => record.toObject());
  } finally {
    await session.close();
  }
}

export async function getGrafo(): Promise<string> {
  const session = driver.session();
  try {
    const nodeLabelsResult = await session.run('CALL db.labels()');
    const labels = nodeLabelsResult.records.map(r => r.get(0));
    
    const relTypesResult = await session.run('CALL db.relationshipTypes()');
    const relTypes = relTypesResult.records.map(r => r.get(0));
    
    return `
    Nodos de la Base de Datos (Labels): ${labels.join(', ')}
    Tipos de relaciones: ${relTypes.join(', ')}
    Esquema explícito del negocio:
    - (Autor {nombre_autor: String})
    - (Publicacion {id_publicacion: String, titulo: String, año: Integer, area_ia: String, nombre_institucion: String})
    - (:Autor)-[:Autor_de {orden_autor: Integer}]->(:Publicacion)
    `;
  } finally {
    await session.close();
  }
}