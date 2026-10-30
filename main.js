const supabaseUrl = 'https://inuapjmbwtzavjgevnfw.supabase.co';
const supabaseKey = 'sb_publishable_gDZnHwhR9FCB87GcjVdlbw_zFpmwvJA';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const form = document.getElementById('form-foro');
const listaComentarios = document.getElementById('lista-comentarios');
const btnPublicar = document.getElementById('btnPublicar');
const indicadorRespuesta = document.getElementById('indicador-respuesta');
const nombreRespuesta = document.getElementById('nombre-respuesta');
const btnCancelar = document.getElementById('btn-cancelar');

// Elementos del sistema de etiquetas
const inputEtiqueta = document.getElementById('input-etiqueta');
const dropdownEtiquetas = document.getElementById('dropdown-etiquetas');
const contenedorTags = document.getElementById('tags-seleccionadas');
const filtroIndicador = document.getElementById('filtro-indicador');
const tagFiltrado = document.getElementById('tag-filtrado');

let idComentarioPadre = null;
let etiquetasSeleccionadas = [];
let todasLasEtiquetasBD = new Set(); // Guarda las etiquetas únicas existentes
let filtroActual = null; // Guarda la etiqueta que se está buscando

async function cargarComentarios() {
    const { data, error } = await supabaseClient
        .from('COMENTARIO')
        .select('*')
        .order('created_at', { ascending: true }); 

    if (error) return;

    // Recolectar todas las etiquetas existentes para sugerirlas en el dropdown
    todasLasEtiquetasBD.clear();
    data.forEach(c => {
        if (c.etiquetas) {
            c.etiquetas.forEach(tag => todasLasEtiquetasBD.add(tag));
        }
    });

    listaComentarios.innerHTML = '';
    
    let principales = data.filter(c => !c.respuesta_a);
    const respuestas = data.filter(c => c.respuesta_a);

    // Motor de Búsqueda (Paso 4: Conocimiento conectable y buscable)
    if (filtroActual) {
        principales = principales.filter(padre => {
            const padreTiene = padre.etiquetas && padre.etiquetas.includes(filtroActual);
            // Si una respuesta tiene la etiqueta, mostramos el hilo completo
            const hijosTienen = respuestas.some(r => Number(r.respuesta_a) === padre.id && r.etiquetas && r.etiquetas.includes(filtroActual));
            return padreTiene || hijosTienen;
        });
        filtroIndicador.style.display = 'flex';
        tagFiltrado.textContent = filtroActual;
    } else {
        filtroIndicador.style.display = 'none';
    }

    if (principales.length === 0) {
        listaComentarios.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No hay apuntes para esta etiqueta.</p>';
        return;
    }

    let htmlFinal = '';

    principales.reverse().forEach(padre => {
        htmlFinal += generarHTMLComentario(padre, false);
        const susRespuestas = respuestas.filter(r => Number(r.respuesta_a) === padre.id);
        
        if (susRespuestas.length > 0) {
            htmlFinal += `<button class="btn-ver-respuestas" onclick="toggleRespuestas(${padre.id})">Ver ${susRespuestas.length} respuesta(s) ▼</button>`;
            htmlFinal += `<div id="respuestas-${padre.id}" style="display: none;">`;
            susRespuestas.forEach(hijo => {
                htmlFinal += generarHTMLComentario(hijo, true);
            });
            htmlFinal += `</div>`;
        }
    });

    listaComentarios.innerHTML = htmlFinal;
}

function generarHTMLComentario(comentario, esRespuesta) {
    const fecha = new Date(comentario.created_at).toLocaleDateString('es-ES');
    const claseAnidada = esRespuesta ? 'comentario-respuesta' : '';
    const botonResponder = !esRespuesta ? `<button class="btn-responder" onclick="prepararRespuesta(${comentario.id}, '${comentario.nombre}')">Responder ↵</button>` : '';
    
    // Renderizar etiquetas dentro del comentario
    let htmlEtiquetas = '';
    if (comentario.etiquetas && comentario.etiquetas.length > 0) {
        htmlEtiquetas = '<div class="etiquetas-display">';
        comentario.etiquetas.forEach(tag => {
            htmlEtiquetas += `<span class="tag-clicable" onclick="aplicarFiltro('${tag}')">${tag}</span>`;
        });
        htmlEtiquetas += '</div>';
    }

    const htmlImagen = comentario.imagen_url 
        ? `<div style="margin-top: 1rem;"><img src="${comentario.imagen_url}" alt="Imagen del apunte" style="max-width: 100%; max-height: 300px; border-radius: 4px; border: 1px solid #333;"></div>` 
        : '';

    return `
        <div class="comentario-card ${claseAnidada}">
            <div class="comentario-header">
                <span class="autor">${comentario.nombre}</span>
                <span class="fecha">${fecha}</span>
            </div>
            <p>${comentario.mensaje}</p>
            ${htmlImagen}
            ${htmlEtiquetas}
            ${botonResponder}
        </div>
    `;
}

// --- LÓGICA DE LA VENTANA FLOTANTE (ESTILO NOTION) ---
inputEtiqueta.addEventListener('input', (e) => {
    let valor = e.target.value.trim();
    dropdownEtiquetas.innerHTML = '';
    
    if (valor.length === 0) {
        dropdownEtiquetas.style.display = 'none';
        return;
    }
    
    dropdownEtiquetas.style.display = 'block';
    if (!valor.startsWith('#')) valor = '#' + valor;
    valor = valor.replace(/\s+/g, ''); // Sin espacios en los hashtags
    
    // Mostrar sugerencias existentes
    todasLasEtiquetasBD.forEach(tag => {
        if (tag.toLowerCase().includes(valor.toLowerCase()) && !etiquetasSeleccionadas.includes(tag)) {
            agregarOpcionDropdown(`⚲ Seleccionar: ${tag}`, tag, false);
        }
    });
    
    // Opción para crear una nueva etiqueta (como en la captura de Notion)
    if (!etiquetasSeleccionadas.includes(valor)) {
        agregarOpcionDropdown(`+ Crear nueva: "${valor}"`, valor, true);
    }
});

function agregarOpcionDropdown(textoVisible, valorReal, esNueva) {
    const div = document.createElement('div');
    div.className = esNueva ? 'dropdown-item dropdown-item-crear' : 'dropdown-item';
    div.textContent = textoVisible;
    div.onclick = () => seleccionarEtiqueta(valorReal);
    dropdownEtiquetas.appendChild(div);
}

function seleccionarEtiqueta(tag) {
    if (!etiquetasSeleccionadas.includes(tag)) {
        etiquetasSeleccionadas.push(tag);
        renderizarEtiquetasSeleccionadas();
    }
    inputEtiqueta.value = '';
    dropdownEtiquetas.style.display = 'none';
    inputEtiqueta.focus();
}

function renderizarEtiquetasSeleccionadas() {
    contenedorTags.innerHTML = '';
    etiquetasSeleccionadas.forEach(tag => {
        contenedorTags.innerHTML += `
            <div class="tag-pill">
                ${tag} <button type="button" onclick="eliminarEtiqueta('${tag}')">✕</button>
            </div>
        `;
    });
}

window.eliminarEtiqueta = function(tag) {
    etiquetasSeleccionadas = etiquetasSeleccionadas.filter(t => t !== tag);
    renderizarEtiquetasSeleccionadas();
}

// Ocultar dropdown al hacer clic afuera
document.addEventListener('click', (e) => {
    if (e.target !== inputEtiqueta && e.target !== dropdownEtiquetas) {
        dropdownEtiquetas.style.display = 'none';
    }
});

// --- FUNCIONES DE FILTRADO Y RESPUESTA ---
window.aplicarFiltro = function(tag) {
    filtroActual = tag;
    cargarComentarios();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.quitarFiltro = function() {
    filtroActual = null;
    cargarComentarios();
}

window.prepararRespuesta = function(id, nombre) {
    idComentarioPadre = id;
    nombreRespuesta.textContent = nombre;
    indicadorRespuesta.style.display = 'block';
    document.getElementById('mensajeInput').focus();
}

window.toggleRespuestas = function(id) {
    const contenedor = document.getElementById(`respuestas-${id}`);
    const boton = contenedor.previousElementSibling;
    if (contenedor.style.display === 'none') {
        contenedor.style.display = 'block';
        boton.textContent = boton.textContent.replace('Ver', 'Ocultar').replace('▼', '▲');
    } else {
        contenedor.style.display = 'none';
        boton.textContent = boton.textContent.replace('Ocultar', 'Ver').replace('▲', '▼');
    }
}

// --- ENVÍO DEL FORMULARIO CON IMAGEN ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btnPublicar.textContent = "Procesando...";

    const nombre = document.getElementById('nombreInput').value;
    const mensaje = document.getElementById('mensajeInput').value;
    const archivoImagen = document.getElementById('imagenInput').files[0];
    
    let imageUrl = null;

    try {
        // 1. Si hay una imagen, subirla primero a Storage
        if (archivoImagen) {
            btnPublicar.textContent = "Subiendo imagen...";
            const extension = archivoImagen.name.split('.').pop();
            const nombreArchivo = `${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
            
            const { data: uploadData, error: uploadError } = await supabaseClient
                .storage
                .from('comunidad')
                .upload(nombreArchivo, archivoImagen);

            if (uploadError) throw uploadError;

            // Obtener la URL pública de la imagen recién subida
            const { data: urlData } = supabaseClient
                .storage
                .from('comunidad')
                .getPublicUrl(nombreArchivo);
                
            imageUrl = urlData.publicUrl;
        }

        btnPublicar.textContent = "Guardando apunte...";

        // 2. Guardar el texto, etiquetas y la URL de la imagen en la base de datos
        const { error: dbError } = await supabaseClient
            .from('COMENTARIO')
            .insert([{ 
                nombre: nombre, 
                mensaje: mensaje, 
                respuesta_a: idComentarioPadre,
                etiquetas: etiquetasSeleccionadas,
                imagen_url: imageUrl
            }]);

        if (dbError) throw dbError;

        // 3. Limpiar y recargar
        form.reset();
        idComentarioPadre = null;
        etiquetasSeleccionadas = [];
        renderizarEtiquetasSeleccionadas();
        indicadorRespuesta.style.display = 'none';
        await cargarComentarios();
        
    } catch (err) {
        console.error("Error:", err);
        alert("Hubo un error al publicar: " + err.message);
    }
    
    btnPublicar.textContent = "Publicar";
});

cargarComentarios();

window.exportarForo = function() {
    let textoExportar = "=== SMART BLOG: KJAM ESSENZA ===\n";
    textoExportar += filtroActual ? `Filtrado por tema: ${filtroActual}\n\n` : `Todos los apuntes de la comunidad\n\n`;
    
    const tarjetas = document.querySelectorAll('.comentario-card');

    if (tarjetas.length === 0) {
        alert("No hay apuntes en pantalla para exportar.");
        return;
    }

    tarjetas.forEach(tarjeta => {
        const autor = tarjeta.querySelector('.autor').innerText;
        const fecha = tarjeta.querySelector('.fecha').innerText;
        const mensaje = tarjeta.querySelector('p').innerText;
        
        textoExportar += `[${fecha}] ${autor} escribió:\n`;
        textoExportar += `${mensaje}\n`;
        
        // NUEVO: Capturar la URL de la imagen si existe
        const imagen = tarjeta.querySelector('img');
        if (imagen) {
            textoExportar += `[Imagen adjunta: ${imagen.src}]\n`;
        }
        
        const etiquetasContenedor = tarjeta.querySelector('.etiquetas-display');
        if (etiquetasContenedor) {
            textoExportar += `Etiquetas: ${etiquetasContenedor.innerText.replace(/\n/g, ' ')}\n`;
        }
        
        textoExportar += `----------------------------------------\n`;
    });

    const blob = new Blob([textoExportar], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filtroActual ? `apuntes_${filtroActual.replace('#','')}.txt` : 'comentarios_essenza.txt';
    document.body.appendChild(a);
    a.click();
    
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}