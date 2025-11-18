require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

// MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS CONFIGURACIÓN
app.use(
  cors({
    origin: [
      "http://127.0.0.1:5500",
      "http://localhost:5500",
      "https://tiendanepe.onrender.com" // dominio de Render
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// FIX PARA RENDER (acepta cualquier origin válido)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

// =============================================
// ================ RUTAS =======================
// =============================================

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("API de Tiendanepe funcionando correctamente.");
});

// PRODUCTOS
app.get("/api/productos", async (req, res) => {
  try {
    const productos = [
      { id: 1, nombre: "Producto A", precio: 199 },
      { id: 2, nombre: "Producto B", precio: 299 },
      { id: 3, nombre: "Producto C", precio: 399 },
    ];

    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo productos" });
  }
});

// CATEGORÍAS
app.get("/api/categorias", async (req, res) => {
  try {
    const categorias = [
      { id: 1, nombre: "Ropa" },
      { id: 2, nombre: "Electrónica" },
      { id: 3, nombre: "Juguetes" },
    ];

    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo categorías" });
  }
});

// =============================================
// ================ SERVER ======================
// =============================================

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("======================================");
  console.log("🚀 Servidor corriendo en puerto:", PORT);
  console.log("🌐 URL pública:", "https://tiendanepe.onrender.com");
  console.log("======================================");
});
