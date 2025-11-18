// 1. Cargar variables de entorno
require('dotenv').config();

// 2. Importaciones
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

// 3. Crear aplicación Express
const app = express();

// === CORS CONFIGURADO CORRECTAMENTE ===
app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "https://tiendanepe.onrender.com"   // SIN la barra final
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

// FIX extra para Render (obligatorio en muchos casos)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

// Permitir JSON
app.use(express.json());

const port = process.env.PORT || 3000;

// 4. Conexión a la Base de Datos
console.log('La URL de conexión es:', process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// 5. Ruta principal
app.get('/', (req, res) => {
  res.send('hola mel');
});

// -------------------------------------------
// 6. RUTA: Obtener categorías
// -------------------------------------------
app.get('/api/categorias', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM CATEGORIA');
    client.release();
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al conectar con la base de datos: ' + err.message);
  }
});

// -------------------------------------------
// 7. RUTA: Crear categoría
// -------------------------------------------
app.post('/api/categorias', async (req, res) => {
  const { nombre, descripcion } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  try {
    const consultaSQL = `
      INSERT INTO CATEGORIA (nombre_categoria, descripcion)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const valores = [nombre, descripcion];

    const client = await pool.connect();
    const result = await client.query(consultaSQL, valores);
    client.release();

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error('Error al insertar categoría:', err);
    res.status(500).send('Error al guardar en la base de datos: ' + err.message);
  }
});

// -------------------------------------------
// 8. RUTA: Obtener productos
// -------------------------------------------
app.get('/api/productos', async (req, res) => {
  try {
    const consultaSQL = `
      SELECT 
        producto.id_producto,
        producto.nombre_producto,
        producto.marca,
        producto.precio_venta,
        producto.stock,
        categoria.nombre_categoria 
      FROM producto
      JOIN categoria ON producto.id_categoria = categoria.id_categoria;
    `;

    const client = await pool.connect();
    const result = await client.query(consultaSQL);
    client.release();

    res.json(result.rows);

  } catch (err) {
    console.error('Error al obtener productos:', err);
    res.status(500).send('Error al conectar con la base de datos: ' + err.message);
  }
});

// -------------------------------------------
// 9. RUTA: Crear producto
// -------------------------------------------
app.post('/api/productos', async (req, res) => {
  const { nombre, marca, precio, stock, categoria_id } = req.body;

  if (!nombre || !precio || !stock || !categoria_id) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const consultaSQL = `
      INSERT INTO PRODUCTO (nombre_producto, marca, precio_venta, stock, id_categoria)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const valores = [nombre, marca, precio, stock, categoria_id];

    const client = await pool.connect();
    const result = await client.query(consultaSQL, valores);
    client.release();

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error('Error al insertar producto:', err);
    res.status(500).send('Error al guardar en la base de datos: ' + err.message);
  }
});

// -------------------------------------------
// 10. RUTA: Obtener proveedores
// -------------------------------------------
app.get('/api/proveedores', async (req, res) => {
  try {
    const consultaSQL = `
      SELECT 
        p.id_proveedor, 
        p.nombre_proveedor, 
        p.calle, 
        p.numero, 
        p.colonia, 
        p.codigo_postal,
        (SELECT telefono 
         FROM TELEFONOS_PROVEEDOR tp 
         WHERE tp.id_proveedor = p.id_proveedor 
         LIMIT 1) AS telefono
      FROM PROVEEDOR p;
    `;

    const client = await pool.connect();
    const result = await client.query(consultaSQL);
    client.release();

    res.json(result.rows);

  } catch (err) {
    console.error('Error al obtener proveedores:', err);
    res.status(500).send('Error al conectar con la base de datos: ' + err.message);
  }
});

// -------------------------------------------
// 11. RUTA: Crear proveedor
// -------------------------------------------
app.post('/api/proveedores', async (req, res) => {
  const { nombre, calle, numero, colonia, cp, telefono } = req.body;

  if (!nombre || !telefono) {
    return res.status(400).json({ error: 'Nombre y teléfono son obligatorios' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const sqlProveedor = `
      INSERT INTO PROVEEDOR (nombre_proveedor, calle, numero, colonia, codigo_postal)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id_proveedor;
    `;
    const valoresProveedor = [nombre, calle, numero, colonia, cp];
    const resultadoProveedor = await client.query(sqlProveedor, valoresProveedor);

    const nuevoProveedorID = resultadoProveedor.rows[0].id_proveedor;

    const sqlTelefono = `
      INSERT INTO TELEFONOS_PROVEEDOR (id_proveedor, telefono)
      VALUES ($1, $2);
    `;
    const valoresTelefono = [nuevoProveedorID, telefono];
    await client.query(sqlTelefono, valoresTelefono);

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Proveedor creado con éxito',
      id_proveedor: nuevoProveedorID
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al insertar proveedor:', err);
    res.status(500).send('Error al guardar en la base de datos: ' + err.message);
  } finally {
    client.release();
  }
});

// -------------------------------------------
// 12. Iniciar servidor
// -------------------------------------------
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
