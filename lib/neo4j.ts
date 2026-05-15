import neo4j from "neo4j-driver";

const URI = process.env.NEO4J_URI!;
const USER = process.env.NEO4J_USERNAME!;
const PASSWORD = process.env.NEO4J_PASSWORD!;

const driver = neo4j.driver(
  URI,
  neo4j.auth.basic(USER, PASSWORD)
);

export default driver;