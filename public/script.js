const API_URL = 'https://fermal.onrender.com'; // Sin slash final para evitar dobles barras

// Subida de imagen (solo si existe el formulario)
if (document.getElementById('uploadForm')) {
  document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);

    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: form
      });
      const data = await res.json();
      alert(data.message || 'Imagen subida');
      e.target.reset();
      cargarImagenes();
    } catch (err) {
      alert('Error al subir la imagen');
    }
  });
}

// Cargar imágenes en la galería
async function cargarImagenes() {
  try {
    const res = await fetch(`${API_URL}/api/imagenes`);
    if (!res.ok) throw new Error('No se pudo cargar la galería');
    const imagenes = await res.json();

    const contenedor = document.getElementById('galeria');
    if (!contenedor) return;

    contenedor.innerHTML = '';

    for (const img of imagenes) {
      const div = document.createElement('div');
      div.innerHTML = `
        <img src="${API_URL}/api/imagen/${img.id}" alt="Imagen subida" style="width:200px; border-radius:10px; margin:10px;" />
        <p>${img.descripcion || ''}</p>
      `;
      contenedor.appendChild(div);
    }
  } catch (err) {
    const contenedor = document.getElementById('galeria');
    if (contenedor) contenedor.innerHTML = '<p>Error al cargar la galería.</p>';
  }
}

cargarImagenes();