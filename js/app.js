// VIVO · interfaz. La lógica está en reglas.js y los textos en estrategias.js.

const CLAVE = 'vivo.checkins';
const CLAVE_LISTA = 'vivo.lista';
const $app = document.getElementById('app');

// Datos locales: nada sale del celular
const datos = {
  cargar() {
    try { return JSON.parse(localStorage.getItem(CLAVE)) || []; } catch (e) { return []; }
  },
  guardar(lista) {
    try { localStorage.setItem(CLAVE, JSON.stringify(lista)); return true; } catch (e) { return false; }
  },
  actualizar(reg) {
    const lista = this.cargar().map((r) => (r.id === reg.id ? reg : r));
    return this.guardar(lista);
  },
  // Lista semanal: la primera vez parte con LISTA_INICIAL
  cargarLista() {
    try {
      const l = JSON.parse(localStorage.getItem(CLAVE_LISTA));
      if (Array.isArray(l)) return l;
    } catch (e) { /* sigue con la inicial */ }
    return LISTA_INICIAL.map((t) => ({ ...t }));
  },
  guardarLista(lista) {
    try { localStorage.setItem(CLAVE_LISTA, JSON.stringify(lista)); return true; } catch (e) { return false; }
  },
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Pinta una pantalla y conecta los botones con data-a="acción"
function pintar(html, acciones = {}) {
  $app.innerHTML = html;
  window.scrollTo(0, 0);
  $app.querySelectorAll('[data-a]').forEach((el) => {
    el.addEventListener('click', () => acciones[el.dataset.a]?.(el.dataset.v, el));
  });
}

function barra(conAtras) {
  return `<header class="barra">${conAtras ? '<button class="atras" data-a="atras">← Atrás</button>' : ''}<span class="marca">VIVO</span></header>`;
}

// ---------- Inicio ----------

function inicio() {
  const lista = datos.cargar();
  const hoyStr = Reglas.fechaLocal(new Date());
  const deHoy = lista.filter((r) => Reglas.fechaLocal(new Date(r.fecha)) === hoyStr).pop();
  const fecha = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  pintar(`
    ${barra(false)}
    <main class="paso">
      <div class="titulo">
        <p class="eyebrow">${esc(fecha)}</p>
        <h1>Hola, Seba</h1>
        <p class="sub">¿Cómo llegas hoy? Menos de un minuto.</p>
      </div>
      ${enSafariSinInstalar() ? '<p class="aviso">Para usarla como app: Compartir → "Agregar a pantalla de inicio". Después ábrela siempre desde el ícono.</p>' : ''}
      <div class="opciones">
        <button class="btn primario" data-a="checkin">Hacer check-in</button>
        ${deHoy ? `<button class="btn" data-a="hoy">${deHoy.plan && deHoy.plan.aprobado ? 'Ver el plan de hoy' : 'Ver el de hoy'}</button>` : ''}
        <button class="btn" data-a="lista">Lista semanal</button>
        <button class="btn" data-a="historial">Historial</button>
        <button class="btn enlace" data-a="ayuda">Instalar y recordatorio</button>
      </div>
    </main>`, {
    ayuda,
    checkin: empezar,
    hoy: () => (deHoy.plan && deHoy.plan.aprobado ? pantallaPlan(deHoy, { alVolver: inicio }) : mostrarResultado(deHoy, { alVolver: inicio })),
    lista: listaSemanal,
    historial,
  });
}

// ---------- Check-in: una pregunta por pantalla ----------

let ci = null;  // check-in en curso
let ruta = [];  // pasos visitados, para volver atrás

const PASOS = [
  { pinta: () => pasoEscala('energia', '¿Cuánta energía tienes?', ['sin batería', 'a full']) },
  { pinta: () => pasoEscala('animo', '¿Cómo te sientes?', ['mal', 'bien']) },
  { pinta: pasoCuerpo },
  { pinta: () => pasoEmocion('emocion') },
  {
    aplica: () => Reglas.pideIntensidad(ci.emocion),
    pinta: () => pasoEscala('intensidad', `¿Qué tan fuerte es ${TEXTOS.emociones[ci.emocion].toLowerCase()}?`, ['apenas', 'muchísimo']),
  },
  { pinta: () => pasoEmocion('secundaria') },
  { pinta: pasoImportante },
];

function empezar() {
  ci = { energia: null, animo: null, cuerpo: null, cuerpoQue: '', emocion: null, intensidad: null, secundaria: null, importante: '' };
  ruta = [];
  irA(0);
}

function irA(i) {
  while (i < PASOS.length && PASOS[i].aplica && !PASOS[i].aplica()) i++;
  if (i >= PASOS.length) return despuesDelCheckin();
  ruta.push(i);
  PASOS[i].pinta();
}

const siguiente = () => irA(ruta[ruta.length - 1] + 1);

function atras() {
  ruta.pop();
  if (!ruta.length) return inicio();
  PASOS[ruta[ruta.length - 1]].pinta();
}

function cabeza() {
  const total = PASOS.filter((p) => !p.aplica || p.aplica()).length;
  const pct = Math.round((ruta.length / total) * 100);
  return `${barra(true)}<div class="progreso" role="progressbar" aria-valuenow="${ruta.length}" aria-valuemax="${total}"><span style="width:${pct}%"></span></div>`;
}

// Escala 0–10. "fuera" se usa cuando la escala se pide fuera del check-in (re-evaluar intensidad).
function pasoEscala(campo, titulo, ejes, fuera) {
  const botones = Array.from({ length: 11 }, (_, n) =>
    `<button class="num ${ci[campo] === n ? 'sel' : ''}" data-a="elegir" data-v="${n}">${n}</button>`).join('');
  pintar(`
    ${fuera ? barra(true) : cabeza()}
    <main class="paso">
      <h1>${esc(titulo)}</h1>
      <div class="escala">${botones}</div>
      <div class="escala-ejes"><span>0 = ${esc(ejes[0])}</span><span>10 = ${esc(ejes[1])}</span></div>
    </main>`, {
    atras: fuera ? fuera.alVolver : atras,
    elegir: (v) => { ci[campo] = Number(v); (fuera ? fuera.alElegir : siguiente)(); },
  });
}

function pasoCuerpo() {
  const ops = [['nada', 'Nada'], ['leve', 'Leve'], ['fuerte', 'Fuerte']];
  const conQue = ci.cuerpo && ci.cuerpo !== 'nada';
  pintar(`
    ${cabeza()}
    <main class="paso">
      <div class="titulo"><h1>¿Y el cuerpo?</h1><p class="sub">Algún malestar físico hoy</p></div>
      <div class="opciones fila">
        ${ops.map(([v, t]) => `<button class="btn ${ci.cuerpo === v ? 'sel' : ''}" data-a="elegir" data-v="${v}">${t}</button>`).join('')}
      </div>
      ${conQue ? `
        <label class="campo">¿Qué? (opcional)
          <input id="que" class="texto" type="text" value="${esc(ci.cuerpoQue)}" placeholder="ej: estómago, cabeza" enterkeyhint="next" autocomplete="off">
        </label>
        <button class="btn primario" data-a="seguir">Seguir</button>` : ''}
    </main>`, {
    atras,
    elegir: (v) => {
      ci.cuerpo = v;
      if (v === 'nada') { ci.cuerpoQue = ''; siguiente(); return; }
      pasoCuerpo();
      document.getElementById('que').focus();
    },
    seguir: () => { ci.cuerpoQue = document.getElementById('que').value.trim(); siguiente(); },
  });
  const que = document.getElementById('que');
  if (que) que.addEventListener('keydown', (e) => { if (e.key === 'Enter') $app.querySelector('[data-a="seguir"]').click(); });
}

function pasoEmocion(campo) {
  const principal = campo === 'emocion';
  const grupos = CUADRANTES.map((c) => `
    <div class="cuadrante ${c.agradable ? 'agradable' : 'desagradable'}">
      <span class="eyebrow">${esc(TEXTOS.cuadrantes[c.id])}</span>
      ${c.emociones.filter((e) => principal || e !== ci.emocion).map((e) =>
        `<button class="emo ${ci[campo] === e ? 'sel' : ''}" data-a="elegir" data-v="${e}">${esc(TEXTOS.emociones[e])}</button>`).join('')}
    </div>`).join('');
  pintar(`
    ${cabeza()}
    <main class="paso">
      <div class="titulo">
        <h1>${principal ? '¿Qué emoción manda hoy?' : '¿Hay otra emoción?'}</h1>
        <p class="sub">${principal ? 'La principal' : 'Opcional'}</p>
      </div>
      ${principal ? '' : '<button class="btn" data-a="ninguna">No, solo esa</button>'}
      <div class="cuadrantes">${grupos}</div>
    </main>`, {
    atras,
    elegir: (v) => {
      ci[campo] = v;
      if (principal) {
        if (!Reglas.pideIntensidad(v)) ci.intensidad = null;
        if (ci.secundaria === v) ci.secundaria = null;
      }
      siguiente();
    },
    ninguna: () => { ci.secundaria = null; siguiente(); },
  });
}

function pasoImportante() {
  pintar(`
    ${cabeza()}
    <main class="paso">
      <div class="titulo">
        <h1>Lo más importante de hoy</h1>
        <p class="sub">O lo que más te cuesta. "Ninguna" vale.</p>
      </div>
      <input id="imp" class="texto" type="text" value="${esc(ci.importante)}" placeholder="ej: avanzar la memoria" enterkeyhint="done" autocomplete="off">
      <div class="opciones">
        <button class="btn primario" data-a="seguir">Seguir</button>
        <button class="btn" data-a="ninguna">Ninguna</button>
      </div>
    </main>`, {
    atras,
    seguir: () => { ci.importante = document.getElementById('imp').value.trim(); siguiente(); },
    ninguna: () => { ci.importante = ''; siguiente(); },
  });
  document.getElementById('imp').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $app.querySelector('[data-a="seguir"]').click();
  });
}

// ---------- Diagnóstico y resultado ----------

function despuesDelCheckin(alVolver = () => PASOS[ruta[ruta.length - 1]].pinta()) {
  if (Reglas.filtro(ci)) return finalizar(null);
  const propuesto = Reglas.diagnosticoPropuesto(ci);
  const pregunta = Reglas.preguntaConfirmacion(ci, propuesto);
  if (!pregunta) return finalizar({ componente: propuesto });
  pasoPregunta(pregunta, alVolver);
}

function pasoPregunta(pregunta, alVolver) {
  pintar(`
    ${barra(true)}
    <main class="paso">
      <div class="titulo">
        ${pregunta.propuesta ? `<p class="eyebrow">Te propongo: ${esc(pregunta.propuesta)}</p>` : ''}
        <h1>${esc(pregunta.texto)}</h1>
      </div>
      <div class="opciones">
        ${pregunta.opciones.map((o, i) => `<button class="btn" data-a="op" data-v="${i}">${esc(o.texto)}</button>`).join('')}
      </div>
    </main>`, {
    atras: alVolver,
    op: (i) => {
      const o = pregunta.opciones[i];
      if (o.respaldo) pasoPregunta(Reglas.preguntaRespaldo(ci), alVolver);
      else finalizar(o.dx);
    },
  });
}

function finalizar(dx) {
  const lista = datos.cargar();
  const ahora = new Date();
  const reg = {
    id: ahora.getTime().toString(36),
    fecha: ahora.toISOString(),
    checkin: { ...ci },
    dx,
    resultado: Reglas.calcular(ci, dx, lista, ahora),
  };
  lista.push(reg);
  const ok = datos.guardar(lista);
  mostrarResultado(reg, {
    alVolver: inicio,
    aviso: ok ? null : 'No se pudo guardar en este navegador. Copia el texto para no perderlo.',
  });
}

function mostrarResultado(reg, { alVolver, aviso } = {}) {
  const r = reg.resultado;
  const est = TEXTOS.estrategias[r.estrategia];
  const m = Reglas.textoModo(r.modo);
  const c = reg.checkin;
  pintar(`
    ${barra(true)}
    <main class="paso">
      <div class="titulo">
        <p class="eyebrow">${esc(Reglas.fechaLarga(reg.fecha))}</p>
        <p class="sub">Energía ${c.energia} · Te sientes ${c.animo} · ${esc(Reglas.textoEmocion(c))}</p>
      </div>
      ${aviso ? `<p class="aviso">${esc(aviso)}</p>` : ''}
      <section class="bloque">
        <span class="etq">Diagnóstico</span>
        <p>${esc(TEXTOS.diagnosticos[r.estrategia])}</p>
      </section>
      <section class="bloque">
        <span class="etq">Una estrategia · menos de 2 min</span>
        <h2>${esc(est.titulo)}</h2>
        ${est.pasos.map((p) => `<p>${esc(p)}</p>`).join('')}
        ${est.escribir ? `<input id="linea" class="texto" type="text" placeholder="${esc(est.escribir)}" value="${esc(reg.linea || '')}" enterkeyhint="done" autocomplete="off">` : ''}
        ${r.filtro === 'intensidad' ? '<button class="btn" data-a="bajo">Ya bajó, ¿lo vemos?</button>' : ''}
      </section>
      <section class="bloque modo modo-${r.modo}">
        <span class="etq">Modo</span>
        <h2>${esc(m.nombre)}</h2>
        <p>${esc(m.esenciales)}</p>
        <p class="muted">${esc(m.partir)}</p>
        ${r.cuerpoLeve ? `<p>${esc(TEXTOS.ajusteCuerpoLeve)}</p>` : ''}
      </section>
      <section class="bloque parar">
        <span class="etq">Cuándo parar</span>
        <p>${esc(m.parar)}</p>
      </section>
      ${r.alertas.map((a) => `<p class="aviso">${esc(TEXTOS.alertas[a])}</p>`).join('')}
      <p class="sub">${esc(TEXTOS.propuesta)}</p>
      <div class="opciones">
        <button class="btn primario" data-a="plan">${reg.plan && reg.plan.aprobado ? 'Ver el plan' : 'Armar el plan'}</button>
        <button class="btn" data-a="copiar">Copiar para Claude</button>
        <button class="btn" data-a="listo">Listo</button>
      </div>
      <details class="texto-claude">
        <summary>Ver el texto</summary>
        <pre id="txt">${esc(Reglas.textoParaClaude(reg))}</pre>
      </details>
    </main>`, {
    atras: alVolver,
    listo: inicio,
    plan: () => pantallaPlan(reg, { alVolver: () => mostrarResultado(reg, { alVolver }) }),
    copiar: (_, btn) => copiar(Reglas.textoParaClaude(reg), btn),
    bajo: () => {
      // Re-evaluar la intensidad; si bajó de 8, se diagnostica como un check-in nuevo
      ci = { ...reg.checkin, intensidad: null };
      const volver = () => mostrarResultado(reg, { alVolver });
      pasoEscala('intensidad', '¿Qué tan fuerte es ahora?', ['apenas', 'muchísimo'], {
        alVolver: volver,
        alElegir: () => despuesDelCheckin(volver),
      });
    },
  });
  const linea = document.getElementById('linea');
  if (linea) {
    linea.addEventListener('change', () => {
      reg.linea = linea.value.trim();
      datos.actualizar(reg);
      document.getElementById('txt').textContent = Reglas.textoParaClaude(reg);
    });
  }
}

// ---------- Plan del día: Esencial / Opcional / Después ----------

const SECCIONES = ['esencial', 'opcional', 'despues'];

function pantallaPlan(reg, { alVolver }) {
  const borrador = reg.plan
    ? JSON.parse(JSON.stringify(reg.plan))
    : Reglas.proponerPlan(reg, datos.cargarLista(), datos.cargar().filter((r) => r.id !== reg.id));
  pintarPlan(reg, borrador, { alVolver, abierto: null, aviso: null });
}

function pintarPlan(reg, plan, estado) {
  const { alVolver, abierto, aviso } = estado;
  const r = reg.resultado;
  const m = Reglas.textoModo(r.modo);
  const T = TEXTOS.plan;
  const aprobado = !!plan.aprobado;
  const suave = r.modo === 'recuperacion' && !abierto; // recuperación: solo la siguiente tarea a la vista

  const tarjeta = (it, seccion, i) => {
    const etq = T.versiones[it.version];
    const puedeCambiar = it.minima && it.normal && it.version !== 'suave';
    const mover = abierto === it.id ? `
      <div class="mover">
        ${SECCIONES.filter((s) => s !== seccion).map((s) => `<button class="btn chico" data-a="mover" data-v="${esc(it.id)}|${s}">→ ${esc(T.secciones[s])}</button>`).join('')}
        ${puedeCambiar ? `<button class="btn chico" data-a="version" data-v="${esc(it.id)}">${it.version === 'minima' ? 'Versión normal' : 'Versión mínima'}</button>` : ''}
      </div>` : '';
    return `<li class="tarea ${abierto === it.id ? 'abierta' : ''}">
      <button class="item" data-a="tocar" data-v="${esc(it.id)}">
        ${seccion === 'esencial' && i === 0 ? '<span class="eyebrow">Parte por aquí</span>' : ''}
        <b>${seccion === 'esencial' ? `${i + 1}. ` : ''}${esc(it.texto)}</b>
        ${etq || it.detalle ? `<span>${etq ? `${esc(etq)}${it.detalle ? ': ' : ''}` : ''}${esc(it.detalle)}</span>` : ''}
      </button>${mover}</li>`;
  };

  const seccion = (s) => `
    <section class="seccion seccion-${s}">
      <div class="seccion-cab"><h2>${esc(T.secciones[s])}</h2><span class="muted">${esc(T.ayudas[s])}</span></div>
      ${plan[s].length ? `<ul class="historial">${plan[s].map((it, i) => tarjeta(it, s, i)).join('')}</ul>` : '<p class="muted">—</p>'}
    </section>`;

  pintar(`
    ${barra(true)}
    <main class="paso">
      <div class="titulo">
        <p class="eyebrow">Plan de hoy · modo ${esc(m.nombre.toLowerCase())}</p>
        <h1>${aprobado ? 'Tu plan' : 'Te propongo este plan'}</h1>
        <p class="sub">${esc(aprobado ? T.aprobado + (plan.esencial[0] ? plan.esencial[0].texto : '') : T.tocar)}</p>
      </div>
      ${aviso ? `<p class="aviso">${esc(aviso)}</p>` : ''}
      ${seccion('esencial')}
      ${suave
        ? `<details class="lodemas"><summary>${esc(T.lodemas)}</summary>${seccion('opcional')}${seccion('despues')}</details>`
        : `${seccion('opcional')}${seccion('despues')}`}
      <section class="bloque parar">
        <span class="etq">Cuándo parar</span>
        <p>${esc(m.parar)}</p>
      </section>
      <div class="opciones">
        ${aprobado ? '' : '<button class="btn primario" data-a="aprobar">Apruebo este plan</button>'}
        <button class="btn ${aprobado ? 'primario' : ''}" data-a="copiar">Copiar para Claude</button>
        ${aprobado ? '<button class="btn" data-a="listo">Listo</button>' : ''}
      </div>
    </main>`, {
    atras: alVolver,
    listo: inicio,
    tocar: (id) => pintarPlan(reg, plan, { alVolver, abierto: abierto === id ? null : id }),
    mover: (v) => {
      const [id, destino] = v.split('|');
      if (destino === 'esencial' && plan.esencial.length >= CONFIG.maxEsenciales) {
        pintarPlan(reg, plan, { alVolver, abierto, aviso: T.llena });
        return;
      }
      const origen = SECCIONES.find((s) => plan[s].some((it) => it.id === id));
      const it = plan[origen].splice(plan[origen].findIndex((x) => x.id === id), 1)[0];
      plan[destino].push(it);
      cambiarPlan(reg, plan, { alVolver });
    },
    version: (id) => {
      const it = SECCIONES.flatMap((s) => plan[s]).find((x) => x.id === id);
      it.version = it.version === 'minima' ? 'normal' : 'minima';
      it.detalle = Reglas.detalleVersion(it, it.version);
      cambiarPlan(reg, plan, { alVolver, abierto: id });
    },
    aprobar: () => {
      plan.aprobado = new Date().toISOString();
      reg.plan = plan;
      datos.actualizar(reg);
      pintarPlan(reg, plan, { alVolver });
    },
    copiar: (_, btn) => copiar(Reglas.textoParaClaude(reg), btn),
  });
}

// Ajustar un plan ya aprobado lo deja otra vez como propuesta, hasta que se apruebe de nuevo
function cambiarPlan(reg, plan, estado) {
  if (plan.aprobado) {
    delete plan.aprobado;
    reg.plan = plan;
    datos.actualizar(reg);
  }
  pintarPlan(reg, plan, { abierto: null, aviso: null, ...estado });
}

// ---------- Lista semanal ----------

function listaSemanal() {
  const lista = datos.cargarLista();
  const items = lista.map((t) => `<li><button class="item" data-a="editar" data-v="${esc(t.id)}">
      <span class="eyebrow">${esc(TEXTOS.metas[t.meta || ''])} · ${t.facil ? 'fácil' : 'pesada'}</span>
      <b>${esc(t.texto)}</b>
      <span>Mín: ${esc(t.minima || '—')} · Normal: ${esc(t.normal || '—')}</span>
    </button></li>`).join('');
  pintar(`
    ${barra(true)}
    <main class="paso">
      <div class="titulo">
        <h1>Lista semanal</h1>
        <p class="sub">Lo que te gustaría hacer esta semana. No es una lista de deudas: el plan saca de aquí según tu energía, en este orden.</p>
      </div>
      ${lista.length ? `<ul class="historial">${items}</ul>` : '<p class="sub">Todavía no hay nada.</p>'}
      <button class="btn primario" data-a="nueva">Agregar algo</button>
    </main>`, {
    atras: inicio,
    editar: (id) => editarTarea(lista.find((t) => t.id === id)),
    nueva: () => editarTarea(null),
  });
}

function editarTarea(tarea) {
  const t = tarea ? { ...tarea } : { id: '', texto: '', minima: '', normal: '', facil: false, meta: '' };
  const metas = Object.keys(TEXTOS.metas).map((k) => `<option value="${k}" ${t.meta === k ? 'selected' : ''}>${esc(TEXTOS.metas[k])}</option>`).join('');
  pintar(`
    ${barra(true)}
    <main class="paso">
      <h1>${tarea ? 'Editar' : 'Agregar'}</h1>
      <label class="campo">Qué
        <input id="f-texto" class="texto" type="text" value="${esc(t.texto)}" placeholder="ej: Memoria de título" autocomplete="off">
      </label>
      <label class="campo">Versión mínima (un día con poca energía)
        <input id="f-minima" class="texto" type="text" value="${esc(t.minima)}" placeholder="ej: abrir el doc y escribir 3 ideas" autocomplete="off">
      </label>
      <label class="campo">Versión normal
        <input id="f-normal" class="texto" type="text" value="${esc(t.normal)}" placeholder="ej: 90 min de trabajo" autocomplete="off">
      </label>
      <div class="campo">¿Cómo se siente partir por esta?
        <div class="opciones dos">
          <button class="btn ${t.facil ? 'sel' : ''}" data-a="facil" data-v="1">Fácil</button>
          <button class="btn ${t.facil ? '' : 'sel'}" data-a="facil" data-v="0">Pesada</button>
        </div>
      </div>
      <label class="campo">Meta de fondo
        <select id="f-meta" class="texto">${metas}</select>
      </label>
      <div class="opciones">
        <button class="btn primario" data-a="guardar">Guardar</button>
        ${tarea ? '<button class="btn peligro" data-a="borrar">Sacar de la lista</button>' : ''}
      </div>
    </main>`, {
    atras: listaSemanal,
    facil: (v, btn) => {
      t.facil = v === '1';
      $app.querySelectorAll('[data-a="facil"]').forEach((b) => b.classList.toggle('sel', b === btn));
    },
    guardar: () => {
      t.texto = document.getElementById('f-texto').value.trim();
      t.minima = document.getElementById('f-minima').value.trim();
      t.normal = document.getElementById('f-normal').value.trim();
      t.meta = document.getElementById('f-meta').value;
      if (!t.texto) { document.getElementById('f-texto').focus(); return; }
      const lista = datos.cargarLista();
      if (tarea) lista[lista.findIndex((x) => x.id === tarea.id)] = t;
      else { t.id = Date.now().toString(36); lista.push(t); }
      datos.guardarLista(lista);
      listaSemanal();
    },
    borrar: () => {
      if (!confirm(`¿Sacar "${t.texto}" de la lista?`)) return;
      datos.guardarLista(datos.cargarLista().filter((x) => x.id !== tarea.id));
      listaSemanal();
    },
  });
}

async function copiar(texto, btn) {
  let ok = false;
  try {
    await navigator.clipboard.writeText(texto);
    ok = true;
  } catch (e) {
    // Respaldo para navegadores sin acceso al portapapeles
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
    ta.remove();
  }
  const original = btn.textContent;
  btn.textContent = ok ? 'Copiado ✓ Pégalo en el Proyecto' : 'No se pudo copiar: abre "Ver el texto"';
  setTimeout(() => { btn.textContent = original; }, 2500);
}

// ---------- Historial y respaldo ----------

function historial() {
  const lista = datos.cargar().slice().reverse();
  const items = lista.map((r) => {
    const f = new Date(r.fecha).toLocaleString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const dx = TEXTOS.diagnosticos[r.resultado.estrategia].split(':')[0];
    return `<li><button class="item" data-a="ver" data-v="${esc(r.id)}">
      <span class="eyebrow">${esc(f)}</span>
      <b>${esc(Reglas.textoEmocion(r.checkin))}</b>
      <span>${esc(dx)} · ${esc(TEXTOS.modos[r.resultado.modo].nombre)}</span>
    </button></li>`;
  }).join('');
  pintar(`
    ${barra(true)}
    <main class="paso">
      <h1>Historial</h1>
      ${lista.length ? `<ul class="historial">${items}</ul>` : '<p class="sub">Todavía no hay check-ins.</p>'}
      <section class="bloque">
        <span class="etq">Respaldo</span>
        <p class="muted">Tus datos viven solo en este celular y iOS puede borrarlos. Exporta el respaldo cada domingo.</p>
        <div class="opciones">
          <button class="btn" data-a="exportar">Exportar respaldo</button>
          <button class="btn" data-a="importar">Importar respaldo</button>
        </div>
        <input id="archivo" type="file" accept="application/json,.json" hidden>
      </section>
    </main>`, {
    atras: inicio,
    ver: (id) => mostrarResultado(lista.find((r) => r.id === id), { alVolver: historial }),
    exportar,
    importar: () => document.getElementById('archivo').click(),
  });
  document.getElementById('archivo').addEventListener('change', importar);
}

function exportar() {
  const json = JSON.stringify({ app: 'vivo', version: 1, exportado: new Date().toISOString(), checkins: datos.cargar(), lista: datos.cargarLista() }, null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `vivo-respaldo-${Reglas.fechaLocal(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importar(e) {
  const archivo = e.target.files[0];
  if (!archivo) return;
  const lector = new FileReader();
  lector.onload = () => {
    try {
      const data = JSON.parse(lector.result);
      const nuevos = Array.isArray(data) ? data : data.checkins;
      if (!Array.isArray(nuevos)) throw new Error('formato');
      const porId = new Map(datos.cargar().map((r) => [r.id, r]));
      nuevos.forEach((r) => { if (r && r.id && r.checkin && r.resultado) porId.set(r.id, r); });
      const lista = [...porId.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
      datos.guardar(lista);
      if (Array.isArray(data.lista)) datos.guardarLista(data.lista);
      historial();
      alert(`Listo: ${nuevos.length} check-ins importados.`);
    } catch (err) {
      alert('Ese archivo no parece un respaldo de VIVO.');
    }
  };
  lector.readAsText(archivo);
}

// ---------- Ayuda: instalar y recordatorio ----------

// iPhone en Safari, todavía sin abrir desde el ícono
function enSafariSinInstalar() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) && navigator.standalone === false;
}

function ayuda() {
  const url = location.href.split('#')[0].replace(/index\.html$/, '');
  pintar(`
    ${barra(true)}
    <main class="paso">
      <h1>Instalar y recordatorio</h1>
      <section class="bloque">
        <span class="etq">1 · Instalar en el iPhone</span>
        <ol class="pasos">
          <li>Abre este link en <b>Safari</b>: <span class="url">${esc(url)}</span></li>
          <li>Toca <b>Compartir</b> (el cuadrado con la flecha).</li>
          <li>Elige <b>"Agregar a pantalla de inicio"</b> y después <b>Agregar</b>.</li>
          <li>Desde ahora ábrela <b>siempre desde el ícono</b>. Lo que guardas en el ícono no se ve en Safari, y al revés.</li>
        </ol>
        <button class="btn" data-a="copiarUrl">Copiar el link</button>
      </section>
      <section class="bloque">
        <span class="etq">2 · Recordatorio diario</span>
        <p>Una app web no puede mandarte notificaciones propias en el iPhone. Por eso te propongo un recordatorio de la app <b>Recordatorios</b>:</p>
        <ol class="pasos">
          <li>Abre <b>Recordatorios</b> y crea uno: <b>"Check-in VIVO"</b>.</li>
          <li>Toca la <b>ⓘ</b>, activa <b>Fecha</b> y <b>Hora</b>, y pon la hora de <b>después del desayuno</b>.</li>
          <li>En <b>Repetir</b> elige <b>Diariamente</b>.</li>
          <li>Cuando suene, abre VIVO desde el ícono.</li>
        </ol>
        <p class="muted">Otra opción es Atajos (Automatización → Hora del día → Abrir URL). Ojo: abre VIVO en Safari y no en el ícono, así que esos check-ins quedan separados. Por eso es mejor Recordatorios.</p>
      </section>
      <section class="bloque">
        <span class="etq">3 · Respaldo cada domingo</span>
        <p>iOS puede borrar los datos de una app web que no usas por un tiempo. En la revisión del domingo, ve a <b>Historial → Exportar respaldo</b> y guárdalo en Archivos o en iCloud.</p>
      </section>
    </main>`, {
    atras: inicio,
    copiarUrl: (_, btn) => copiar(url, btn),
  });
}

// ---------- Arranque ----------

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('service-worker.js').catch(() => {});
}
inicio();
