// Agrega el event listener solo si existe el formulario de subida
if (document.getElementById('uploadForm')) {
  document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: form
    });

    const data = await res.json();
    alert(data.message);
    e.target.reset();
    cargarImagenes();
  });
}

// Función para cargar imágenes en la galería
async function cargarImagenes() {
  const res = await fetch('/api/imagenes');
  const imagenes = await res.json();

  const contenedor = document.getElementById('galeria');
  if (!contenedor) return;

  contenedor.innerHTML = '';

  for (const img of imagenes) {
    const div = document.createElement('div');
    div.innerHTML = `
      <img src="/api/imagen/${img.id}" alt="Imagen subida" style="width:200px; border-radius:10px; margin:10px;" />
      <p>${img.descripcion || ''}</p>
    `;
    contenedor.appendChild(div);
  }
}

// Llama a la función para mostrar las imágenes al cargar la página
cargarImagenes();