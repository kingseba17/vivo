// VIVO · reglas del día. Todo se calcula aquí, sin IA.
// Si cambias un umbral, actualiza también CLAUDE.md.

const CONFIG = {
  intensidadAlta: 8, // intensidad >= 8: no se diagnostica, modo recuperación
  energiaBaja: 3,    // energía <= 3: modo recuperación
  energiaAlta: 7,    // energía >= 7, cómo me siento >= 6 y todo bien: modo con energía
  animoAlto: 6,
  esenciales: { recuperacion: 1, normal: 2, energia: 3 }, // tareas propuestas; en recuperación el autocuidado va aparte
  maxEsenciales: 3,                                       // tope al ajustar a mano (regla 6)
  opcionales: { recuperacion: 0, normal: 1, energia: 1 },
  // Malestar físico, desesperanza o intensidad alta en 3+ días de la última semana: sugerir ayuda
  alertas: { ventanaDias: 7, minDias: 3 },
};

// Emociones ordenadas por energía × agradable (regla 2)
const CUADRANTES = [
  { id: 'altaDesagradable', agradable: false, emociones: ['ansiedad', 'estres', 'frustracion', 'enojo'] },
  { id: 'altaAgradable', agradable: true, emociones: ['entusiasmo', 'esperanza', 'disfrute'] },
  { id: 'bajaDesagradable', agradable: false, emociones: ['desesperanza', 'aburrimiento', 'desgano', 'agotamiento'] },
  { id: 'bajaAgradable', agradable: true, emociones: ['tranquilidad', 'satisfaccion'] },
];

// Diagnóstico EVC sugerido por la emoción principal; las agradables van a "todo bien"
const COMPONENTE_POR_EMOCION = {
  ansiedad: 'expectativa', desesperanza: 'expectativa',
  aburrimiento: 'valor', desgano: 'valor',
  frustracion: 'costo', enojo: 'costo', estres: 'costo', agotamiento: 'costo',
};

const Reglas = (() => {
  function esAgradable(emocion) {
    return CUADRANTES.some((c) => c.agradable && c.emociones.includes(emocion));
  }

  // La intensidad solo se pide si la emoción principal es desagradable
  function pideIntensidad(emocion) {
    return !esAgradable(emocion);
  }

  // Filtros antes del diagnóstico (regla 4)
  function filtro(ci) {
    if (ci.intensidad != null && ci.intensidad >= CONFIG.intensidadAlta) return 'intensidad';
    if (ci.cuerpo === 'fuerte') return 'cuerpoFuerte';
    return null;
  }

  // El cuerpo puede ser la causa si hay malestar y alguna emoción desagradable
  function cuerpoPuedePesar(ci) {
    if (!ci.cuerpo || ci.cuerpo === 'nada') return false;
    return !esAgradable(ci.emocion) || (ci.secundaria != null && !esAgradable(ci.secundaria));
  }

  function diagnosticoPropuesto(ci) {
    if (filtro(ci)) return null;
    if (!ci.importante) {
      // Sin tarea: si hay emoción desagradable y malestar, viene del cuerpo; si no, todo bien
      return !esAgradable(ci.emocion) && ci.cuerpo !== 'nada' ? 'fisico' : 'todoBien';
    }
    return COMPONENTE_POR_EMOCION[ci.emocion] || 'todoBien';
  }

  // Una sola pregunta para confirmar (regla 3). null = no hace falta preguntar.
  function preguntaConfirmacion(ci, propuesto) {
    if (!propuesto || propuesto === 'fisico') return null;
    const O = TEXTOS.opciones;
    let opciones;
    if (propuesto === 'costo') {
      opciones = Object.keys(O.costo).map((k) => ({ texto: O.costo[k], dx: { componente: 'costo', costo: k } }));
      opciones.push({ texto: O.ningunaDeEsas, respaldo: true });
    } else {
      opciones = [
        { texto: O.si[propuesto], dx: { componente: propuesto } },
        { texto: O.no[propuesto], respaldo: true },
      ];
    }
    if (cuerpoPuedePesar(ci)) opciones.push({ texto: O.cuerpo, dx: { componente: 'fisico' } });
    return { propuesta: TEXTOS.nombres[propuesto], texto: TEXTOS.preguntas[propuesto], opciones };
  }

  // Si la confirmación fue "no", se pregunta una sola vez qué se parece más
  function preguntaRespaldo(ci) {
    const R = TEXTOS.opciones.respaldo;
    const opciones = [
      { texto: R.expectativa, dx: { componente: 'expectativa', respaldo: true } },
      { texto: R.valor, dx: { componente: 'valor', respaldo: true } },
      { texto: R.costo, dx: { componente: 'costo', costo: 'mucho', respaldo: true } },
    ];
    if (cuerpoPuedePesar(ci)) opciones.push({ texto: TEXTOS.opciones.cuerpo, dx: { componente: 'fisico', respaldo: true } });
    return { texto: TEXTOS.preguntas.respaldo, opciones };
  }

  // Modo del día, en este orden: recuperación, con energía, normal
  function modo(ci, dx) {
    if (filtro(ci) || ci.energia <= CONFIG.energiaBaja || (dx && dx.costo === 'milCosas')) return 'recuperacion';
    if (ci.energia >= CONFIG.energiaAlta && ci.animo >= CONFIG.animoAlto && dx && dx.componente === 'todoBien') return 'energia';
    return 'normal';
  }

  function estrategia(ci, dx) {
    const f = filtro(ci);
    if (f) return f;
    return dx.componente === 'costo' ? `costo_${dx.costo}` : dx.componente;
  }

  function fechaLocal(d) {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function diasCon(ci, historial, ahora, condicion) {
    const desde = new Date(ahora);
    desde.setDate(desde.getDate() - (CONFIG.alertas.ventanaDias - 1));
    desde.setHours(0, 0, 0, 0);
    const dias = new Set();
    historial.forEach((r) => {
      const f = new Date(r.fecha);
      if (f >= desde && condicion(r.checkin)) dias.add(fechaLocal(f));
    });
    if (condicion(ci)) dias.add(fechaLocal(ahora));
    return dias.size;
  }

  // Regla 10: si algo se repite varios días, sugerir ayuda
  function alertas(ci, historial, ahora) {
    const lista = [];
    const conCuerpo = (c) => c.cuerpo && c.cuerpo !== 'nada';
    const conAnimoBajo = (c) => c.emocion === 'desesperanza' || c.secundaria === 'desesperanza'
      || (c.intensidad != null && c.intensidad >= CONFIG.intensidadAlta);
    if (diasCon(ci, historial, ahora, conCuerpo) >= CONFIG.alertas.minDias) lista.push('cuerpo');
    if (diasCon(ci, historial, ahora, conAnimoBajo) >= CONFIG.alertas.minDias) lista.push('animo');
    return lista;
  }

  function calcular(ci, dx, historial, ahora) {
    const m = modo(ci, dx);
    return {
      filtro: filtro(ci),
      estrategia: estrategia(ci, dx),
      modo: m,
      esenciales: CONFIG.esenciales[m],
      cuerpoLeve: ci.cuerpo === 'leve',
      alertas: alertas(ci, historial, ahora),
    };
  }

  function textoModo(m) {
    const t = TEXTOS.modos[m];
    const n = CONFIG.esenciales[m];
    const r = (s) => s.replace(/\{n\}/g, n);
    return { nombre: t.nombre, esenciales: r(t.esenciales), partir: r(t.partir), parar: r(t.parar) };
  }

  function fechaLarga(iso) {
    return new Date(iso).toLocaleString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  }

  function textoEmocion(c) {
    const T = TEXTOS.emociones;
    let s = T[c.emocion];
    if (c.intensidad != null) s += ` ${c.intensidad}/10`;
    if (c.secundaria) s += ` (secundaria: ${T[c.secundaria].toLowerCase()})`;
    return s;
  }

  function textoCuerpo(c) {
    if (c.cuerpo === 'nada') return 'nada';
    return c.cuerpoQue ? `${c.cuerpo} (${c.cuerpoQue})` : c.cuerpo;
  }

  // ---------- Plan del día ----------

  const normalizar = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  // Busca en la lista la tarea que nombra "lo más importante" (por el nombre antes de ":")
  function buscarTarea(texto, tareas) {
    const t = normalizar(texto);
    return tareas.find((x) => normalizar(x.texto.split(':')[0]).split(/\W+/).some((p) => p.length >= 4 && t.includes(p)));
  }

  function inicioSemana(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // lunes
    return x;
  }

  // Metas que ya aparecieron (esencial u opcional) en planes aprobados de esta semana
  function metasDeLaSemana(historial, fechaIso) {
    const desde = inicioSemana(new Date(fechaIso));
    const metas = new Set();
    historial.forEach((r) => {
      if (!r.plan || !r.plan.aprobado || new Date(r.fecha) < desde) return;
      [...r.plan.esencial, ...r.plan.opcional].forEach((it) => { if (it.meta) metas.add(it.meta); });
    });
    return metas;
  }

  function detalleVersion(t, version) {
    if (version === 'suave') return TEXTOS.plan.ejercicioSuave;
    return (version === 'minima' ? t.minima : t.normal) || '';
  }

  function itemDe(t, version) {
    return { id: t.id, texto: t.texto, version, detalle: detalleVersion(t, version), minima: t.minima || '', normal: t.normal || '', facil: !!t.facil, meta: t.meta || '' };
  }

  // La app propone (regla 7): esenciales según el modo, una opcional y el resto a "Después"
  function proponerPlan(reg, tareas, historial) {
    const ci = reg.checkin;
    const r = reg.resultado;
    const sinEjercicio = ci.cuerpo === 'fuerte';
    const versionBase = r.modo === 'recuperacion' ? 'minima' : 'normal';
    const version = (t, v) => (t.meta === 'cuerpo' && ci.cuerpo === 'leve' ? 'suave' : v);
    const pendientes = tareas.slice();
    const sacar = (t) => pendientes.splice(pendientes.indexOf(t), 1)[0];
    const sirve = (t) => !(sinEjercicio && t.meta === 'cuerpo');
    const esencial = [];
    const opcional = [];
    let cupo = r.esenciales;

    // Autocuidado: en recuperación va aparte; con cuerpo leve cuenta dentro del cupo
    if (r.modo === 'recuperacion' || ci.cuerpo === 'leve') {
      esencial.push({ id: 'autocuidado', texto: TEXTOS.plan.autocuidado, version: '', detalle: TEXTOS.plan.autocuidadoDetalle, minima: '', normal: '', facil: true, meta: '' });
      if (r.modo !== 'recuperacion') cupo--;
    }

    // Lo más importante de hoy va primero; con Expectativa o "es mucho", en versión mínima
    if (ci.importante && cupo > 0) {
      const v = ['expectativa', 'costo_mucho'].includes(r.estrategia) ? 'minima' : versionBase;
      const t = buscarTarea(ci.importante, pendientes);
      if (t) esencial.push(itemDe(sacar(t), version(t, v)));
      else esencial.push({ id: 'hoy', texto: ci.importante, version: v, detalle: '', minima: '', normal: '', facil: false, meta: '' });
      cupo--;
    }

    // Completar con la lista semanal, en su orden
    pendientes.filter(sirve).forEach((t) => {
      if (cupo > 0) { esencial.push(itemDe(sacar(t), version(t, versionBase))); cupo--; }
    });

    // Opcional: primero una meta que no haya aparecido esta semana
    const vistas = metasDeLaSemana(historial, reg.fecha);
    const candidatas = pendientes.filter(sirve).sort((a, b) => (vistas.has(a.meta) ? 1 : 0) - (vistas.has(b.meta) ? 1 : 0));
    candidatas.slice(0, CONFIG.opcionales[r.modo]).forEach((t) => opcional.push(itemDe(sacar(t), version(t, versionBase))));

    const despues = pendientes.map((t) => itemDe(t, version(t, versionBase)));

    // Partir por la más fácil
    esencial.sort((a, b) => (b.facil ? 1 : 0) - (a.facil ? 1 : 0));
    return { esencial, opcional, despues };
  }

  function textoItem(it) {
    const etq = TEXTOS.plan.versiones[it.version];
    if (it.detalle) return `${it.texto} (${etq ? `${etq.toLowerCase()}: ` : ''}${it.detalle})`;
    return etq ? `${it.texto} (${etq.toLowerCase()})` : it.texto;
  }

  function textoPlan(plan) {
    const lista = (items, conDetalle) => (items.length ? items.map((it, i) => `${i + 1}) ${conDetalle ? textoItem(it) : it.texto}`).join(' · ') : '—');
    return [
      `Esencial: ${lista(plan.esencial, true)}`,
      `Opcional: ${lista(plan.opcional, true)}`,
      `Después: ${lista(plan.despues, false)}`,
    ];
  }

  // "Copiar para Claude": check-in + resultado en texto plano
  function textoParaClaude(reg) {
    const c = reg.checkin;
    const r = reg.resultado;
    const est = TEXTOS.estrategias[r.estrategia];
    const m = textoModo(r.modo);
    const lineas = [
      `Check-in VIVO · ${fechaLarga(reg.fecha)}`,
      `Energía ${c.energia} · Cómo me siento ${c.animo} · Cuerpo: ${textoCuerpo(c)} · Emoción: ${textoEmocion(c)} · Lo más importante: ${c.importante || 'ninguna'}`,
      '',
      'Lo que propuso la app:',
      `Diagnóstico: ${TEXTOS.diagnosticos[r.estrategia]}`,
      `Estrategia: ${est.titulo}. ${est.pasos.join(' ')}`,
      reg.linea ? `Mi línea: ${reg.linea}` : null,
      `Modo: ${m.nombre}. ${m.esenciales}`,
      r.cuerpoLeve ? TEXTOS.ajusteCuerpoLeve : null,
      `Cuándo parar: ${m.parar}`,
      ...r.alertas.map((a) => TEXTOS.alertas[a]),
      ...(reg.plan && reg.plan.aprobado ? ['', 'Plan que aprobé:', ...textoPlan(reg.plan)] : []),
      '',
      reg.plan && reg.plan.aprobado ? TEXTOS.cierreConPlan : TEXTOS.cierreCopiar,
    ];
    return lineas.filter((l) => l !== null).join('\n');
  }

  return {
    esAgradable, pideIntensidad, filtro, diagnosticoPropuesto, preguntaConfirmacion, preguntaRespaldo,
    modo, calcular, textoModo, fechaLocal, fechaLarga, textoEmocion, textoParaClaude,
    proponerPlan, detalleVersion,
  };
})();
