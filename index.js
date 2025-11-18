// 1. Cargar las variables de entorno (del archivo .env)
require('dotenv').config();

// 2. Importar las librerías
const express = require('express');
const { Pool } = require('pg'); // Importar el conector de PostgreSQL
const cors = require('cors'); // <--- AÑADE ESTA LÍNEA

// 3. Crear la aplicación Express
const app = express();
app.use(cors({
  origin: 'https://tiendanepe.onrender.com/', // Pon tu URL de frontend aquí
  credentials: true
}));
app.use(express.json()); // <--- AÑADE ESTA LÍNEA (para entender JSON)
const port = process.env.PORT || 3000;

// 4. Configurar la conexión a la Base de Datos
console.log('La URL de conexión es:', process.env.DATABASE_URL);
// 'Pool' maneja múltiples conexiones eficientemente.
const pool = new Pool({
connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
  // ---------------------------------
});

// 5. Crear una ruta de prueba (Homepage)
app.get('/', (req, res) => {
  res.send('hola mel');
});

// 6. ***** ¡LA RUTA DE PRUEBA DE CONEXIÓN! *****
// Vamos a crear un endpoint para LEER todas las categorías
app.get('/api/categorias', async (req, res) => {
  try {
    // 1. Pedirle al 'pool' una conexión
    const client = await pool.connect();
    
    // 2. Usar la conexión para hacer una consulta SQL
    const result = await client.query('SELECT * FROM CATEGORIA');
    
    // 3. Devolver los resultados como JSON
    res.json(result.rows);
    
    // 4. Liberar la conexión de vuelta al 'pool'
    client.release();

  } catch (err) {
    // Si algo sale mal, enviar un error
    console.error(err);
    res.status(500).send('Error al conectar con la base de datos: ' + err.message);
  }
});

// 6. ***** RUTA PARA CREAR UNA NUEVA CATEGORÍA (POST) *****
app.post('/api/categorias', async (req, res) => {
  // 1. Obtener los datos del cuerpo (body) de la petición
  // que envió el frontend
  const { nombre, descripcion } = req.body;

  // 2. Validar que el nombre no esté vacío
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  try {
    // 3. Definir la consulta SQL para INSERTAR
    const consultaSQL = `
      INSERT INTO CATEGORIA (nombre_categoria, descripcion)
      VALUES ($1, $2)
      RETURNING *; 
    `;
    // $1 y $2 son "placeholders" para evitar inyección SQL
    // RETURNING * nos devuelve la fila que se acaba de crear

    const valores = [nombre, descripcion];

    // 4. Ejecutar la consulta
    const client = await pool.connect();
    const result = await client.query(consultaSQL, valores);
    client.release();

    // 5. Devolver la nueva categoría creada (la fila de result.rows[0])
    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error('Error al insertar categoría:', err);
    res.status(500).send('Error al guardar en la base de datos: ' + err.message);
  }
});

// 7. ***** RUTA PARA OBTENER TODOS LOS PRODUCTOS (GET) *****
// Esta consulta es más avanzada, usa un JOIN para traer el nombre
// de la categoría en lugar de solo el 'id_categoria'
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

// 8. ***** RUTA PARA CREAR UN NUEVO PRODUCTO (POST) *****
app.post('/api/productos', async (req, res) => {
  // 1. Obtener los datos del cuerpo (body) de la petición
  // ¡Nota que ahora recibimos más campos!
  const { nombre, marca, precio, stock, categoria_id } = req.body;

  // 2. Validación simple
  if (!nombre || !precio || !stock || !categoria_id) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    // 3. Definir la consulta SQL para INSERTAR
    const consultaSQL = `
      INSERT INTO PRODUCTO (nombre_producto, marca, precio_venta, stock, id_categoria)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *; 
    `;
    const valores = [nombre, marca, precio, stock, categoria_id];

    // 4. Ejecutar la consulta
    const client = await pool.connect();
    const result = await client.query(consultaSQL, valores);
    client.release();

    // 5. Devolver el nuevo producto creado
    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error('Error al insertar producto:', err);
    res.status(500).send('Error al guardar en la base de datos: ' + err.message);
  }
});

// 9. ***** RUTA PARA OBTENER TODOS LOS PROVEEDORES (GET) *****
// Esta consulta usa una sub-consulta para tomar UN teléfono de la tabla de teléfonos
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

// 10. ***** RUTA PARA CREAR UN NUEVO PROVEEDOR (POST) *****
// Esta ruta es más avanzada: inserta en DOS tablas (PROVEEDOR y TELEFONOS_PROVEEDOR)
app.post('/api/proveedores', async (req, res) => {
  // 1. Obtener todos los datos del formulario
  const { nombre, calle, numero, colonia, cp, telefono } = req.body;

  // 2. Validación
  if (!nombre || !telefono) {
    return res.status(400).json({ error: 'Nombre y teléfono son obligatorios' });
  }

  // 3. Crear un "cliente" de la base de datos
  const client = await pool.connect();

  try {
    // 4. Iniciar una "Transacción" (para asegurar que ambas inserciones funcionen o ninguna)
    await client.query('BEGIN');

    // 5. Primera Inserción: Insertar en la tabla PROVEEDOR
    const sqlProveedor = `
      INSERT INTO PROVEEDOR (nombre_proveedor, calle, numero, colonia, codigo_postal)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id_proveedor; 
    `;
    const valoresProveedor = [nombre, calle, numero, colonia, cp];
    const resultadoProveedor = await client.query(sqlProveedor, valoresProveedor);

    // 6. Obtener el ID del proveedor que acabamos de crear
    const nuevoProveedorID = resultadoProveedor.rows[0].id_proveedor;

    // 7. Segunda Inserción: Insertar en la tabla TELEFONOS_PROVEEDOR
    const sqlTelefono = `
      INSERT INTO TELEFONOS_PROVEEDOR (id_proveedor, telefono)
      VALUES ($1, $2);
    `;
    const valoresTelefono = [nuevoProveedorID, telefono];
    await client.query(sqlTelefono, valoresTelefono);

    // 8. Si todo salió bien, "Confirmar" la transacción
    await client.query('COMMIT');

    // 9. Devolver una respuesta exitosa
    res.status(201).json({ 
        message: 'Proveedor creado con éxito', 
        id_proveedor: nuevoProveedorID 
    });

  } catch (err) {
    // 10. Si algo falló, "Revertir" la transacción
    await client.query('ROLLBACK');
    console.error('Error al insertar proveedor:', err);
    res.status(500).send('Error al guardar en la base de datos: ' + err.message);
  } finally {
    // 11. Liberar el cliente, pase lo que pase
    client.release();
  }
});

// 7. Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});