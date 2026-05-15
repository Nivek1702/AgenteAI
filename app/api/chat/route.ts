///import { NextResponse } from "next/server";
///import driver from "../../../lib/neo4j";
///
///export async function GET() {
///  const session = driver.session();
///
///  try {
///    const result = await session.run(`
///      MATCH (a:Author)
///      RETURN a.nombre AS nombre
///      LIMIT 5
///    `);
///
///    const authors = result.records.map((record) => ({
///      nombre: record.get("nombre"),
///    }));
///
///    return NextResponse.json(authors);
///  } catch (error) {
///    console.error(error);
///
///    return NextResponse.json(
///      { error: "Error querying Neo4j" },
///      { status: 500 }
///    );
///  } finally {
///    await session.close();
///  }
///}