const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
const upload = multer();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_2YRDpjAv0qOZ@ep-dark-snowflake-a87q59fs-pooler.eastus2.azure.neon.tech/neondb?sslmode=require'
});

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Fermal API',
      version: '1.0.0',
      description: 'API para ElblogdeFerymal',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local server'
      }
    ],
  },
  apis: [__filename], // Documenta este archivo
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Sube una imagen a la galería
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               imagen:
 *                 type: string
 *                 format: binary
 *               descripcion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Imagen guardada correctamente
 */
app.post('/api/upload', upload.single('imagen'), async (req, res) => {
  const { buffer, mimetype } = req.file;
  const { descripcion } = req.body;

  try {
    await pool.query(
      'INSERT INTO imagenes (data, mime, descripcion) VALUES ($1, $2, $3)',
      [buffer, mimetype, descripcion]
    );
    res.json({ message: 'Imagen guardada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al guardar la imagen' });
  }
});

/**
 * @swagger
 * /api/imagenes:
 *   get:
 *     summary: Obtiene todas las imágenes (id y descripción)
 *     responses:
 *       200:
 *         description: Lista de imágenes
 */
app.get('/api/imagenes', async (req, res) => {
  const result = await pool.query('SELECT id, descripcion FROM imagenes ORDER BY fecha_subida DESC');
  res.json(result.rows);
});

/**
 * @swagger
 * /api/imagen/{id}:
 *   get:
 *     summary: Obtiene una imagen por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Imagen encontrada
 *       404:
 *         description: Imagen no encontrada
 */
app.get('/api/imagen/:id', async (req, res) => {
  const result = await pool.query('SELECT data, mime FROM imagenes WHERE id = $1', [req.params.id]);

  if (result.rows.length === 0) return res.sendStatus(404);

  res.set('Content-Type', result.rows[0].mime);
  res.send(result.rows[0].data);
});

/**
 * @swagger
 * /api/register:
 *   post:
 *     summary: Registra un nuevo usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               correo:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuario registrado correctamente
 *       400:
 *         description: Error al registrar
 */
app.post('/api/register', async (req, res) => {
  const { nombre, correo, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await pool.query('INSERT INTO usuarios (nombre, correo, password) VALUES ($1, $2, $3)', [nombre, correo, hashedPassword]);
    res.json({ message: 'Usuario registrado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Error al registrar. El correo ya existe.' });
  }
});

/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Inicia sesión
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               correo:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sesión iniciada correctamente
 *       401:
 *         description: Correo o contraseña incorrectos
 */
app.post('/api/login', async (req, res) => {
  const { correo, password } = req.body;

  const result = await pool.query('SELECT * FROM usuarios WHERE correo = $1', [correo]);

  if (result.rows.length === 0) {
    return res.status(401).json({ message: 'Correo no encontrado' });
  }

  const usuario = result.rows[0];
  const valid = await bcrypt.compare(password, usuario.password);

  if (!valid) {
    return res.status(401).json({ message: 'Contraseña incorrecta' });
  }

  res.json({ message: 'Sesión iniciada correctamente', usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo } });
});

/**
 * @swagger
 * /api/mi-dia:
 *   get:
 *     summary: Obtiene el contenido de "Mi día"
 *     responses:
 *       200:
 *         description: Contenido de "Mi día"
 *   post:
 *     summary: Guarda o actualiza el contenido de "Mi día"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contenido:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contenido actualizado
 *       500:
 *         description: Error al guardar el contenido
 */
app.get('/api/mi-dia', async (req, res) => {
  const result = await pool.query('SELECT contenido FROM mi_dia ORDER BY actualizado DESC LIMIT 1');
  res.json(result.rows[0] || { contenido: '' });
});

app.post('/api/mi-dia', async (req, res) => {
  const { contenido } = req.body;
  try {
    const result = await pool.query('SELECT COUNT(*) FROM mi_dia');
    if (parseInt(result.rows[0].count) === 0) {
      await pool.query('INSERT INTO mi_dia (contenido) VALUES ($1)', [contenido]);
    } else {
      await pool.query('UPDATE mi_dia SET contenido = $1, actualizado = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM mi_dia ORDER BY actualizado DESC LIMIT 1)', [contenido]);
    }
    res.json({ message: 'Contenido actualizado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al guardar el contenido' });
  }
});

// No servir archivos frontend ni rutas comodín

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor en http://localhost:${PORT}`));