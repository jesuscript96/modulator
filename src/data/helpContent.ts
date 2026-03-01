export interface HelpEntry {
  title: string;
  technical: string;
  beginner: string;
}

const helpContent: Record<string, HelpEntry> = {
  euclideanRhythm: {
    title: 'Euclidean Rhythms',
    technical:
      'Algoritmo de Bjorklund: distribuye k pulsos en n pasos maximizando la equidistancia entre golpes. Genera los ritmos más importantes de la música mundial.',
    beginner:
      'Imagina repartir 3 aplausos en 8 tiempos lo más uniforme posible: _ X _ _ X _ _ X. Eso es un ritmo euclidiano. Más pulsos = más lleno suena.',
  },

  circularSequencer: {
    title: 'Circular Sequencer',
    technical:
      'Visualización polar de 4 patrones rítmicos concéntricos (kick, snare, hihat, perc). Los polígonos conectan los golpes activos formando figuras geométricas.',
    beginner:
      'Los puntos en el círculo son golpes de batería. Cada anillo es un instrumento diferente. La línea que gira marca el tiempo actual — cuando toca un punto, suena.',
  },

  fibonacciModulator: {
    title: 'Fibonacci Modulator',
    technical:
      'La secuencia F(n) = F(n-1) + F(n-2) controla el tamaño del grano y el overlap del sampler granular. Los valores se normalizan al rango [0.01, 0.5].',
    beginner:
      'Cada número es la suma de los dos anteriores (1, 1, 2, 3, 5, 8...). Aquí esos números cambian cómo suena el trozo de canción: a veces más fino, a veces más grueso.',
  },

  goldenRatio: {
    title: 'Golden Ratio',
    technical:
      'Frecuencia del filtro = 200 × φⁿ, donde φ = 1.618... (proporción áurea). El filtro lowpass recorre frecuencias siguiendo esta progresión geométrica.',
    beginner:
      'El filtro deja pasar frecuencias siguiendo la misma proporción que tienen los pétalos de un girasol. El sonido se abre y cierra de forma natural.',
  },

  noiseModulator: {
    title: 'Simplex Noise',
    technical:
      'Función pseudo-aleatoria sin(x)·sin(2.1x)·sin(3.72x) que modula overlap y detune. Genera variaciones orgánicas sin repetición exacta.',
    beginner:
      'Como el viento: nunca sopla exactamente igual dos veces, pero tampoco es completamente aleatorio. Hace que el sonido cambie de forma impredecible pero musical.',
  },

  complexity: {
    title: 'Complexity',
    technical:
      'Controla el módulo del step counter: step % complexity. Valores altos alargan el ciclo de la secuencia matemática antes de repetirse.',
    beginner:
      'Cuánto "viaja" la secuencia matemática antes de volver al inicio. Más complejidad = más variación antes de que el patrón se repita.',
  },

  grainSize: {
    title: 'Grain Size',
    technical:
      'Duración de cada micro-fragmento (grano) en la síntesis granular, medido en segundos [0.01 – 0.5]. Valores pequeños = textura más difusa.',
    beginner:
      'El tamaño de cada trocito en que se corta el audio. Trozos diminutos suenan como una nube; trozos grandes suenan más reconocibles.',
  },

  overlap: {
    title: 'Overlap',
    technical:
      'Grado de solapamiento entre granos consecutivos [0.01 – 0.5]. Mayor overlap = transiciones más suaves entre granos, sonido más denso.',
    beginner:
      'Cuánto se montan unos trocitos sobre otros. Mucho overlap = sonido más lleno y continuo. Poco = más rítmico y entrecortado.',
  },

  filterFreq: {
    title: 'Filter Frequency',
    technical:
      'Frecuencia de corte del filtro lowpass en Hz [200 – 10000]. Frecuencias por encima del corte se atenúan a -12dB/octava.',
    beginner:
      'Es como una puerta para los sonidos agudos. Frecuencia baja = solo pasan graves (sonido apagado). Frecuencia alta = pasa todo (sonido brillante).',
  },

  detune: {
    title: 'Detune',
    technical:
      'Desafinación del grainPlayer en cents (centésimas de semitono). ±1200 cents = ±1 octava. Modulado por simplex noise cuando está activo.',
    beginner:
      'Cambia la afinación del sonido. Valores pequeños dan un efecto "chorus" sutil. Valores grandes hacen que suene como otro instrumento.',
  },

  affineTransform: {
    title: 'Affine Transforms',
    technical:
      'Transformación afín 3×3 sobre vectores V=(t,p). Retrograde refleja en eje temporal, inversión refleja en eje de pitch, augmentación/diminución escala el tiempo.',
    beginner:
      'Como voltear una melodía en un espejo: puede sonar al revés en el tiempo, con las notas graves vueltas agudas, más lenta o más rápida.',
  },

  board: {
    title: 'Composition Board',
    technical:
      'Plano cartesiano donde X=tiempo (beats) y Y=pitch (MIDI 0-127). Los clips se posicionan como vectores V=(t,p) y se transforman con matrices afines.',
    beginner:
      'Una pizarra donde colocas trozos de música. Horizontal = cuándo suena. Vertical = qué tan agudo o grave. Puedes mover, estirar y voltear cada trozo.',
  },

  lsystem: {
    title: 'L-System Rhythms',
    technical:
      'Sistema de Lindenmayer: gramática formal con reglas de reescritura paralela que genera patrones auto-similares a distintas escalas temporales.',
    beginner:
      'Como un árbol que se ramifica: cada rama genera ramas más pequeñas iguales. Aquí las ramas son golpes de batería que se subdividen en patrones cada vez más complejos.',
  },

  mandelbrotDrums: {
    title: 'Mandelbrot Drums',
    technical:
      'z(n+1) = z(n)² + c. El número de iteraciones antes de divergir determina si hay golpe. Diferentes filas (cy) del plano complejo generan diferentes instrumentos.',
    beginner:
      'Navegas por un fractal y la zona donde haces click se convierte en un ritmo. Cada franja horizontal genera un instrumento diferente.',
  },

  sampler: {
    title: 'Granular Sampler',
    technical:
      'Tone.GrainPlayer divide el audio en micro-fragmentos que se superponen y reproducen en loop. Los parámetros (grainSize, overlap, detune) se modulan matemáticamente.',
    beginner:
      'Arrastra un MP3 aquí. El sistema lo trocea en cientos de fragmentos diminutos y los reorganiza. El resultado suena parecido pero con una textura completamente nueva.',
  },
};

export default helpContent;
