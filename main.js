const supabaseUrl = 'https://inuapjmbwtzavjgevnfw.supabase.co';
const supabaseKey = 'sb_publishable_gDZnHwhR9FCB87GcjVdlbw_zFpmwvJA';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const form = document.getElementById('form-foro');
const listaComentarios = document.getElementById('lista-comentarios');
const btnPublicar = document.getElementById('btnPublicar');
const indicadorRespuesta = document.getElementById('indicador-respuesta');
const nombreRespuesta = document.getElementById('nombre-respuesta');
const btnCancelar = document.getElementById('btn-cancelar');

// Variable para saber si estamos respondiendo a alguien
let idComentarioPadre = null;

async function cargarComentarios() {
    const { data, error } = await supabaseClient
        .from('COMENTARIO')
        .select('*')
        .order('created_at', { ascending: true }); 

    if (error) {
        listaComentarios.innerHTML = '<p style="color: red;">Error al cargar los comentarios.</p>';
        return;
    }

    if (data.length === 0) {
        listaComentarios.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Sé el primero en compartir tu experiencia.</p>';
        return;
    }

    const principales = data.filter(c => !c.respuesta_a);
    const respuestas = data.filter(c => c.respuesta_a);

    let htmlFinal = '';

    principales.reverse().forEach(padre => {
        // 1. Pintamos el comentario principal
        htmlFinal += generarHTMLComentario(padre, false);

        // 2. Buscamos sus respuestas
        const susRespuestas = respuestas.filter(r => r.respuesta_a === padre.id);
        
        if (susRespuestas.length > 0) {
            // Agregamos el botón de "Ver respuestas"
            htmlFinal += `<button class="btn-ver-respuestas" onclick="toggleRespuestas(${padre.id})">Ver ${susRespuestas.length} respuesta(s) ▼</button>`;
            
            // Creamos un contenedor oculto por defecto para las respuestas
            htmlFinal += `<div id="respuestas-${padre.id}" style="display: none;">`;
            susRespuestas.forEach(hijo => {
                htmlFinal += generarHTMLComentario(hijo, true);
            });
            htmlFinal += `</div>`;
        }
    });

    listaComentarios.innerHTML = htmlFinal;
}

// Nueva función para mostrar/ocultar el contenedor de respuestas
window.toggleRespuestas = function(id) {
    const contenedor = document.getElementById(`respuestas-${id}`);
    const boton = contenedor.previousElementSibling; // Selecciona el botón que está justo arriba
    
    if (contenedor.style.display === 'none') {
        contenedor.style.display = 'block';
        boton.textContent = boton.textContent.replace('Ver', 'Ocultar').replace('▼', '▲');
    } else {
        contenedor.style.display = 'none';
        // Usamos una pequeña expresión regular para volver a poner "Ver X respuesta(s)"
        boton.textContent = boton.textContent.replace('Ocultar', 'Ver').replace('▲', '▼');
    }
}

function generarHTMLComentario(comentario, esRespuesta) {
    const fecha = new Date(comentario.created_at).toLocaleDateString('es-ES');
    const claseAnidada = esRespuesta ? 'comentario-respuesta' : '';
    
    // Solo mostramos el botón "Responder" en los comentarios principales
    const botonResponder = !esRespuesta 
        ? `<button class="btn-responder" onclick="prepararRespuesta(${comentario.id}, '${comentario.nombre}')">Responder ↵</button>` 
        : '';

    return `
        <div class="comentario-card ${claseAnidada}">
            <div class="comentario-header">
                <span class="autor">${comentario.nombre}</span>
                <span class="fecha">${fecha}</span>
            </div>
            <p>${comentario.mensaje}</p>
            ${botonResponder}
        </div>
    `;
}

// Función que se activa al hacer clic en "Responder"
window.prepararRespuesta = function(id, nombre) {
    idComentarioPadre = id;
    nombreRespuesta.textContent = nombre;
    indicadorRespuesta.style.display = 'block';
    document.getElementById('mensajeInput').focus(); // Lleva el cursor al campo de texto
}

// Función para cancelar la respuesta
btnCancelar.addEventListener('click', () => {
    idComentarioPadre = null;
    indicadorRespuesta.style.display = 'none';
});

// Enviar formulario
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btnPublicar.textContent = "Publicando...";

    const nombre = document.getElementById('nombreInput').value;
    const mensaje = document.getElementById('mensajeInput').value;

    const { error } = await supabaseClient
        .from('COMENTARIO')
        .insert([{ 
            nombre: nombre, 
            mensaje: mensaje, 
            respuesta_a: idComentarioPadre // Si no es respuesta, esto envía "null"
        }]);

    if (!error) {
        form.reset();
        idComentarioPadre = null;
        indicadorRespuesta.style.display = 'none';
        await cargarComentarios();
    }
    
    btnPublicar.textContent = "Publicar";
});

cargarComentarios();