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
    // 1. Consultar dinámicamente todos los nodos y sus tipos de propiedades
    const nodesPropsResult = await session.run('CALL db.schema.nodeTypeProperties()');
    const nodesSchema: { [key: string]: string[] } = {};
    
    nodesPropsResult.records.forEach(record => {
      const labels = record.get('nodeLabels');
      const propName = record.get('propertyName');
      const propTypes = record.get('propertyTypes');
      
      if (labels && propName) {
        labels.forEach((label: string) => {
          if (!nodesSchema[label]) nodesSchema[label] = [];
          const typeStr = propTypes ? propTypes.join('|') : 'String';
          nodesSchema[label].push(`${propName}: ${typeStr}`);
        });
      }
    });

    // 2. Registrar inicialmente todas las relaciones existentes en el grafo
    const relTypesResult = await session.run('CALL db.relationshipTypes()');
    const relsSchema: { [key: string]: string[] } = {};
    
    relTypesResult.records.forEach(r => {
      const type = r.get(0);
      if (type) {
        // Almacenamos el nombre limpio de la relación (ej: "AUTOR_DE")
        relsSchema[type] = [];
      }
    });

    // 3. Cruzar propiedades limpiando exhaustivamente las llaves de Neo4j
    const relsPropsResult = await session.run('CALL db.schema.relTypeProperties()');
    relsPropsResult.records.forEach(record => {
      const relType = record.get('relType');
      const propName = record.get('propertyName');
      const propTypes = record.get('propertyTypes');
      
      if (relType && propName) {
        // Limpieza absoluta: Remueve dos puntos, backticks, espacios o flechas, aislando solo el texto original
        const cleanType = String(relType).replace(/[^A-Z0-9_]/gi, '');

        // Mach perfecto con las llaves de relsSchema
        if (relsSchema[cleanType]) {
          const typeStr = propTypes ? propTypes.join('|') : 'String';
          relsSchema[cleanType].push(`${propName}: ${typeStr}`);
        }
      }
    });

    // 4. Armar el string estructurado que Gemini necesita interpretar
    let schemaPrompt = "=== ESQUEMA AUTOMÁTICO DEL GRAFO ===\n\n";
    
    schemaPrompt += "NODOS DISPONIBLES Y ATRIBUTOS:\n";
    for (const [label, props] of Object.entries(nodesSchema)) {
      schemaPrompt += `- (${label} {${props.join(', ')}})\n`;
    }

    schemaPrompt += "\nRELACIONES DISPONIBLES Y PROPIEDADES:\n";
    for (const [relType, props] of Object.entries(relsSchema)) {
      const propsStr = props.length > 0 ? ` {${props.join(', ')}}` : '';
      schemaPrompt += `- [:${relType}${propsStr}]\n`;
    }

    return schemaPrompt;

  } catch (error) {
    console.error("Error generando el esquema dinámico de Neo4j:", error);
    return "Error: No se pudo mapear la estructura del grafo de manera dinámica.";
  } finally {
    await session.close();
  }
}