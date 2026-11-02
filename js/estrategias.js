// VIVO · textos. Edita aquí sin tocar la lógica (js/reglas.js).
// Regla 8: nunca "aguántate", nunca miedo a fallar, nunca "debes" (usar "podrías", "te propongo").
// {n} se reemplaza por el número de esenciales de CONFIG.

const TEXTOS = {
  emociones: {
    ansiedad: 'Ansiedad', estres: 'Estrés', frustracion: 'Frustración', enojo: 'Enojo',
    entusiasmo: 'Entusiasmo', esperanza: 'Esperanza', disfrute: 'Disfrute',
    desesperanza: 'Desesperanza', aburrimiento: 'Aburrimiento', desgano: 'Desgano', agotamiento: 'Agotamiento',
    tranquilidad: 'Tranquilidad', satisfaccion: 'Satisfacción',
  },

  cuadrantes: {
    altaDesagradable: 'Más energía · desagradable',
    altaAgradable: 'Más energía · agradable',
    bajaDesagradable: 'Menos energía · desagradable',
    bajaAgradable: 'Menos energía · agradable',
  },

  // Confirmación del diagnóstico (una sola pregunta)
  nombres: { expectativa: 'Expectativa', valor: 'Valor', costo: 'Costo', todoBien: 'Todo bien' },
  preguntas: {
    expectativa: '¿Sientes que no vas a poder?',
    valor: '¿Sientes que hoy no tiene sentido?',
    costo: '¿Qué te pesa más?',
    todoBien: '¿Sientes que hoy nada te está trabando?',
    respaldo: '¿Qué se parece más?',
  },
  opciones: {
    si: { expectativa: 'Sí, siento que no voy a poder', valor: 'Sí, hoy no le veo sentido', todoBien: 'Sí, estoy bien' },
    no: { expectativa: 'No es eso', valor: 'No es eso', todoBien: 'Algo me cuesta' },
    costo: { mucho: 'Es mucho', milCosas: 'Tengo mil cosas', otraCosa: 'Prefiero otra cosa', miedo: 'Me da miedo fallar' },
    ningunaDeEsas: 'Ninguna de esas',
    respaldo: { expectativa: 'No voy a poder', valor: 'No le veo sentido', costo: 'Me cuesta demasiado' },
    cuerpo: 'Es más el cuerpo',
  },

  // Diagnóstico en una línea, con la misma clave que la estrategia
  diagnosticos: {
    intensidad: 'Sin diagnóstico por ahora: la emoción está muy fuerte. Primero bajarla.',
    cuerpoFuerte: 'Sin diagnóstico: hoy manda el cuerpo. Primero cuidarte.',
    expectativa: 'Expectativa: lo que pesa es sentir que no vas a poder.',
    valor: 'Valor: hoy no le ves sentido.',
    costo_mucho: 'Costo: se siente como mucho.',
    costo_milCosas: 'Costo: tienes mil cosas encima.',
    costo_otraCosa: 'Costo: preferirías estar haciendo otra cosa.',
    costo_miedo: 'Costo: te da miedo fallar.',
    fisico: 'Costo físico: lo que pesa es el cuerpo, no una tarea.',
    todoBien: 'Todo bien: no hay nada trabado.',
  },

  // Una sola estrategia, de menos de 2 minutos. "escribir" agrega una línea opcional.
  estrategias: {
    intensidad: {
      titulo: 'Primero, bajar la intensidad',
      pasos: ['Cambia de situación o distráete 5 a 10 min: caminar, ducha, música, Lisa.', 'Cuando baje, si quieres, vemos el diagnóstico.'],
    },
    cuerpoFuerte: {
      titulo: 'Cuidarte',
      pasos: ['Descansa, come liviano, toma algo que te haga bien y duerme si puedes.', 'Hoy nada de ejercicio.'],
    },
    expectativa: {
      titulo: 'Victoria temprana',
      pasos: ['Escribe el primer paso de 10 min y hazlo.', 'Es un reto, no un examen.', 'Acuérdate de algo que ya lograste esta semana.'],
      escribir: 'Mi primer paso de 10 min es…',
    },
    valor: {
      titulo: '¿Para qué te sirve esto hoy?',
      pasos: ['Respóndelo en una línea, conectado con lo que te importa de fondo.'],
      escribir: 'Hoy esto me sirve para…',
    },
    costo_mucho: {
      titulo: 'Solo el primer paso',
      pasos: ['Achica la tarea a su versión mínima o solo al primer paso.', 'Hazlo, y después ves si sigues.'],
      escribir: 'La versión mínima es…',
    },
    costo_milCosas: {
      titulo: 'Suelta una',
      pasos: ['Elige una cosa para sacar o posponer.', 'Dilo: "esto lo suelto por hoy".'],
      escribir: 'Hoy suelto…',
    },
    costo_otraCosa: {
      titulo: 'Hazla más disfrutable',
      pasos: ['Ponle algo rico: música, un café, otro lugar.', 'Y un premio después de terminar.'],
      escribir: 'Mi premio después es…',
    },
    costo_miedo: {
      titulo: 'Un reto, no un examen',
      pasos: ['Es un reto, no un examen.', '¿Qué depende de ti hoy? Quédate con eso.'],
      escribir: 'Lo que depende de mí hoy es…',
    },
    fisico: {
      titulo: 'Una acción de autocuidado',
      pasos: ['Elige una y hazla ahora: tomar algo tibio, comer liviano, estirar 2 min o descansar 15 min.'],
    },
    todoBien: {
      titulo: 'Saborear',
      pasos: ['Date un momento para notar que hoy estás bien.', 'Parte por lo que más te importa.'],
    },
  },

  ajusteCuerpoLeve: 'Por el cuerpo: ejercicio en versión suave (caminar, estirar) y una acción de autocuidado como esencial.',

  modos: {
    energia: {
      nombre: 'Con energía',
      esenciales: 'Hasta {n} esenciales, versión completa.',
      partir: 'Parte por la más fácil y después la de más valor.',
      parar: 'Con las {n} esenciales listas, el día está ganado. Lo opcional es extra, no deuda.',
    },
    normal: {
      nombre: 'Normal',
      esenciales: '{n} esenciales, versión normal.',
      partir: 'Parte por la más fácil: victoria temprana.',
      parar: 'Con las {n} esenciales listas. Si sobra energía, una opcional.',
    },
    recuperacion: {
      nombre: 'Recuperación',
      esenciales: '{n} esencial en versión mínima + autocuidado.',
      partir: 'Mira solo la siguiente tarea.',
      parar: 'Hecha la mínima, descansas. Lo demás pasa a "Después" sin culpa.',
    },
  },

  // Regla 10: VIVO no es clínica
  alertas: {
    cuerpo: 'El malestar físico ya va varios días. Te propongo ir al médico.',
    animo: 'La desesperanza o la intensidad alta se han repetido varios días. Podrías hablarlo con alguien de confianza o con un profesional.',
  },

  propuesta: 'La app propone; tú apruebas o ajustas.',
  cierreCopiar: 'Con esto, propónme el plan del día (Esencial / Opcional / Después) usando mi lista semanal. ¿Apruebo o ajusto?',
  cierreConPlan: '¿Ves algo que ajustarías en este plan?',

  plan: {
    autocuidado: 'Autocuidado',
    autocuidadoDetalle: 'Descansar, comer liviano o tomar algo que te haga bien.',
    ejercicioSuave: 'Caminar o estirar, sin exigirte',
    secciones: { esencial: 'Esencial', opcional: 'Opcional', despues: 'Después' },
    ayudas: {
      esencial: 'En este orden. Parte por la primera.',
      opcional: 'Solo si sobra energía. Es extra, no deuda.',
      despues: 'Queda para otro día, sin culpa.',
    },
    versiones: { minima: 'Mínima', normal: 'Normal', suave: 'Suave' },
    tocar: 'Toca una tarea para moverla o cambiar su versión.',
    llena: 'Ya hay 3 esenciales. Saca una antes de sumar otra.',
    aprobado: 'Plan aprobado. Parte por: ',
    lodemas: 'Ver lo demás',
  },

  // Metas de fondo (docs/metas.md). Sirven para proponer una opcional que no ha aparecido en la semana.
  metas: {
    '': 'Sin meta',
    paz: 'Paz y conciencia', mente: 'Mente', motivacion: 'Motivación', concentracion: 'Concentración',
    cuerpo: 'Cuerpo (ejercicio)', relaciones: 'Relaciones', proyectos: 'Proyectos', aprender: 'Aprender',
  },
};

// Lista semanal con la que parte la app (docs/lista-semanal.md). Después se edita en la app.
const LISTA_INICIAL = [
  { id: 'memoria', texto: 'Memoria de título', minima: 'Abrir el documento y escribir 3 ideas (10 min)', normal: '90 min de trabajo', facil: false, meta: 'proyectos' },
  { id: 'vivo', texto: 'VIVO: terminar el plan del MVP', minima: 'Un cambio chico', normal: 'Una sesión de trabajo', facil: true, meta: 'proyectos' },
  { id: 'ejercicio', texto: 'Ejercicio: volver de a poco', minima: 'Caminar 10 min', normal: 'Caminar, entrenar en casa o tenis', facil: true, meta: 'cuerpo' },
  { id: 'amigos', texto: 'Ver a mis amigos', minima: 'Escribirle a uno', normal: 'Juntarme con ellos', facil: true, meta: 'relaciones' },
];
