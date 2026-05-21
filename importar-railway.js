const fs = require("fs");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: ".env.importar" });

async function importar() {
  try {
    const url = process.env.MYSQL_PUBLIC_URL;

    if (!url) {
      console.log("Falta MYSQL_PUBLIC_URL en .env.importar");
      return;
    }

    let sql = fs.readFileSync("./DatabaseTD.sql", "utf8");

    // Quitar CREATE DATABASE y USE porque Railway ya tiene la base creada
    sql = sql
      .replace(/CREATE DATABASE[\s\S]*?;\s*/i, "")
      .replace(/USE\s+`?[^`;\s]+`?;\s*/i, "");

    // Quitar bloqueos de tablas del dump
    sql = sql
      .replace(/UNLOCK TABLES;\s*/gi, "")
      .replace(/^LOCK TABLES[\s\S]*?;\s*/gim, "");

    const conexion = await mysql.createConnection({
      uri: url,
      multipleStatements: true
    });

    console.log("Conectado a Railway MySQL...");
    console.log("Importando base de datos...");

    await conexion.query("SET FOREIGN_KEY_CHECKS=0;");
    await conexion.query(sql);
    await conexion.query("SET FOREIGN_KEY_CHECKS=1;");

    await conexion.end();

    console.log("Base de datos importada correctamente.");
  } catch (error) {
    console.error("Error importando:", error.message);
  }
}

importar();