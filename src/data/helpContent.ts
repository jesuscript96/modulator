export interface HelpEntry {
  title: string;
  technical: string;
  beginner: string;
}

const helpContent: Record<string, HelpEntry> = {
  euclideanRhythm: {
    title: 'Ritmos Euclidianos',
    technical:
      'Algoritmo de Bjorklund: distribuye k pulsos en n pasos maximizando la equidistancia entre golpes. Genera los ritmos más importantes de la música mundial.',
    beginner:
      'Imagina repartir de la forma más uniforme posible 3 golpes en un compás de 8 tiempos: golpea en el 1, en el 4 y en el 7 (PUM _ _ PUM _ _ PUM _). Esto crea un patrón súper bailable que se usa en la música africana y latina. ¡Más golpes = ritmo más lleno!',
  },

  circularSequencer: {
    title: 'Secuenciador Circular',
    technical:
      'Visualización polar de 4 patrones rítmicos concéntricos (kick, snare, hihat, perc). Los polígonos conectan los golpes activos formando figuras geométricas.',
    beginner:
      'Los puntos en el círculo son golpes de batería. Cada anillo es un instrumento diferente. La línea que gira como las agujas del reloj es el tiempo: cuando pasa por encima de un punto, ese instrumento suena.',
  },

  fibonacciModulator: {
    title: 'Modulador de Fibonacci',
    technical:
      'La secuencia F(n) = F(n-1) + F(n-2) controla el tamaño del grano y el overlap del sampler granular. Los valores se normalizan al rango [0.01, 0.5].',
    beginner:
      'Usa la famosa secuencia de números de la naturaleza (1, 1, 2, 3, 5, 8...) para cambiar la textura del sonido. Hace que el reproductor trocee el audio a veces en granos pequeñitos (más suave/nube) y a veces en trozos más grandes (más rítmico).',
  },

  goldenRatio: {
    title: 'Proporción Áurea (Filtro)',
    technical:
      'Frecuencia del filtro = 200 × φⁿ, donde φ = 1.618... (proporción áurea). El filtro lowpass recorre frecuencias siguiendo esta progresión geométrica.',
    beginner:
      'Ajusta el brillo del sonido usando la proporción áurea (la regla matemática de la belleza visual y natural). El filtro se abre y se cierra imitando el crecimiento de los pétalos de una flor, logrando transiciones súper orgánicas.',
  },

  noiseModulator: {
    title: 'Ruido Simplex (Caos Natural)',
    technical:
      'Función pseudo-aleatoria sin(x)·sin(2.1x)·sin(3.72x) que modula overlap y detune. Genera variaciones orgánicas sin repetición exacta.',
    beginner:
      'Funciona como el viento: nunca sopla igual dos veces, pero tampoco es un desorden total. Añade una desafinación y un temblor al sonido que se siente vivo y natural, como un instrumento acústico real.',
  },

  complexity: {
    title: 'Complejidad Matemática',
    technical:
      'Controla el módulo del step counter: step % complexity. Valores altos alargan el ciclo de la secuencia matemática antes de repetirse.',
    beginner:
      'Define cuánto tiempo viaja la fórmula matemática antes de empezar a repetirse desde el principio. Una complejidad baja hace que el sonido cambie rápido en bucles cortos; una complejidad alta genera variaciones largas.',
  },

  grainSize: {
    title: 'Tamaño del Grano (Grain Size)',
    technical:
      'Duración de cada micro-fragmento (grano) en la síntesis granular, medido en segundos [0.01 – 0.5]. Valores pequeños = textura más difusa.',
    beginner:
      'El tamaño de cada "confeti" de audio en el que cortamos tu sonido. Trozos diminutos (cerca del 0) se funden como una nube de gas; trozos más grandes se escuchan como notas o repeticiones claras.',
  },

  overlap: {
    title: 'Solapamiento (Overlap)',
    technical:
      'Grado de solapamiento entre granos consecutivos [0.01 – 0.5]. Mayor overlap = transiciones más suaves entre granos, sonido más denso.',
    beginner:
      'Qué tanto se enciman los trocitos de audio. Mucho solapamiento crea una alfombra de sonido continuo y denso. Poco solapamiento hace que los trocitos suenen separados, como gotas de lluvia en el cristal.',
  },

  filterFreq: {
    title: 'Frecuencia de Corte',
    technical:
      'Frecuencia de corte del filtro lowpass en Hz [200 – 10000]. Frecuencias por encima del corte se atenúan a -12dB/octava.',
    beginner:
      'Controla la compuerta de los sonidos agudos. Si está muy baja, el sonido se apagará por completo (como si sonara bajo el agua). Si está muy alta, dejará pasar todo el brillo original.',
  },

  detune: {
    title: 'Afinación (Detune)',
    technical:
      'Desafinación del grainPlayer en cents (centésimas de semitono). ±1200 cents = ±1 octava. Modulado por simplex noise cuando está activo.',
    beginner:
      'Desafina o altera el tono del sonido. Modificaciones pequeñas dan un efecto de coro o espacialidad; cambios grandes pueden subir o bajar la música una octava completa.',
  },

  affineTransform: {
    title: 'Transformaciones Afines',
    technical:
      'Transformación afín 3×3 sobre vectores V=(t,p). Retrograde refleja en eje temporal, inversión refleja en eje de pitch, augmentación/diminución escala el tiempo.',
    beginner:
      'Es como mover o deformar un dibujo en un plano, pero aplicado a la música. Puedes voltear una melodía en un espejo (para que suene del final al principio, o que las notas agudas se vuelvan graves), duplicar su velocidad o transportarla de tono.',
  },

  board: {
    title: 'Pizarra de Composición (Board)',
    technical:
      'Plano cartesiano donde X=tiempo (beats) y Y=pitch (MIDI 0-127). Los clips se posicionan como vectores V=(t,p) y se transforman con matrices afines.',
    beginner:
      'Una pizarra geométrica donde colocas tus trozos de música. El eje horizontal indica cuándo suena y el vertical qué tan agudo es. Puedes estirar, girar y deformar tus melodías usando operaciones matemáticas.',
  },

  lsystem: {
    title: 'Ritmos L-System',
    technical:
      'Sistema de Lindenmayer: gramática formal con reglas de reescritura paralela que genera patrones auto-similares a distintas escalas temporales.',
    beginner:
      'Imagina una rama que crece y se divide en dos ramitas idénticas, y estas en otras más pequeñas. Este algoritmo genera ritmos de esa manera: subdivide los golpes de batería una y otra vez creando patrones fractales muy orgánicos.',
  },

  mandelbrotDrums: {
    title: 'Baterías de Mandelbrot',
    technical:
      'z(n+1) = z(n)² + c. El número de iteraciones antes de divergir determina si hay golpe. Diferentes filas (cy) del plano complejo generan diferentes instrumentos.',
    beginner:
      'El famoso fractal matemático de Mandelbrot esconde ritmos infinitos. Al hacer click en el panel gráfico, escaneas una coordenada del plano complejo: los puntos que tardan en escapar al infinito se traducen en golpes de batería.',
  },

  sampler: {
    title: 'Reproductor Granular',
    technical:
      'Tone.GrainPlayer divide el audio en micro-fragmentos que se superponen y reproducen en loop. Los parámetros (grainSize, overlap, detune) se modulan matemáticamente.',
    beginner:
      'Arrastra aquí cualquier archivo MP3. El sistema lo desmenuza en miles de trocitos flotantes y los vuelve a tejer en tiempo real. Esto permite modular su textura, duración y altura de formas imposibles en reproductores normales.',
  },
};

export default helpContent;
