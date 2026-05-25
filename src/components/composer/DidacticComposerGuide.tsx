import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, AlertCircle, Music, GitBranch, Zap, Sparkles } from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  musicalAnalogy: string;
  howItWorks: string;
  musicalEffect: string;
  tip: string;
}

export default function DidacticComposerGuide() {
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);

  const sections: GuideSection[] = [
    {
      id: 'dodeca',
      title: 'Matriz Dodecafónica (Z₁₂)',
      subtitle: 'La democracia de las 12 notas',
      icon: <Music className="w-4 h-4 text-freq-mid" />,
      musicalAnalogy: 'Imagina una votación donde está prohibido que alguien vote dos veces hasta que todos los ciudadanos hayan votado. Eso es el dodecafonismo: ninguna de las 12 notas de la escala puede repetirse hasta que las otras 11 hayan sonado. Así se evita que el oído sienta que hay una nota "principal" o "en casa", creando una música suspendida, atonal e intrigante.',
      howItWorks: 'Tú diseñas o generas una fila inicial de 12 notas distintas (llamada Serie Original, P_0). La cuadrícula calcula automáticamente un espejo de esa serie en todas las direcciones: invertida en espejo vertical (I), al revés en espejo horizontal (R) y al revés e invertida (RI).',
      musicalEffect: 'Al hacer click en las cabeceras (P, R, I, RI) de la matriz a la derecha, extraes esa serie de 12 notas y las encadenas. Esto te permite componer usando las mismas simetrías geométricas que Johann Sebastian Bach o Arnold Schoenberg usaban a mano en sus partituras.',
      tip: 'Prueba a encadenar una fila Prime (P) y luego su Retrograda (R) correspondiente. Escucharás la misma melodía resolviéndose hacia atrás, como un cangrejo musical.',
    },
    {
      id: 'collatz',
      title: 'Conjetura de Collatz (3n + 1)',
      subtitle: 'La gravedad matemática y melodías que caen',
      icon: <AlertCircle className="w-4 h-4 text-freq-bass" />,
      musicalAnalogy: 'Es como soltar una pelota en una montaña rusa: no importa en qué altura de la montaña la sueltes (la "semilla"), la gravedad siempre la hará rebotar arriba y abajo de forma impredecible, pero al final terminará cayendo al mismo charco de agua abajo (el bucle estable 4 -> 2 -> 1). Ese viaje de picos y caídas se traduce directamente en notas agudas y graves.',
      howItWorks: 'Tomamos un número inicial. Si es par, lo dividimos a la mitad (caída suave). Si es impar, lo multiplicamos por 3 y le sumamos 1 (salto brusco hacia arriba). Repetimos este cálculo hasta llegar al 1. Cada número intermedio se mapea a una nota de tu escala musical.',
      musicalEffect: 'Genera melodías con una "tensión" muy natural: saltos rápidos y agudos seguidos de bajadas ordenadas y progresivas hacia la calma. Además, si el número es par, la nota dura el doble de tiempo, creando ritmos variados pero lógicos.',
      tip: 'Cambia la "Semilla" inicial para cambiar por completo el punto de partida de la melodía. Algunas semillas crean órbitas cortas y tranquilas, mientras que otras se disparan en viajes largos y dramáticos antes de caer.',
    },
    {
      id: 'lsystem',
      title: 'Sistemas-L (Fractales Botánicos)',
      subtitle: 'Melodías que crecen como ramas de plantas',
      icon: <GitBranch className="w-4 h-4 text-freq-low-mid" />,
      musicalAnalogy: 'Es la música de la botánica. Funciona como el crecimiento de un helecho: una pequeña rama se divide en dos, y cada una de ellas vuelve a dividirse en dos ramitas más pequeñas siguiendo un patrón idéntico. En música, esto genera patrones que se repiten dentro de sí mismos a diferentes velocidades (fractales rítmicos y melódicos).',
      howItWorks: 'Se parte de una letra inicial (axioma) y se aplican reglas de sustitución repetidamente (ej. "cada vez que veas una A, reemplázala por AB"). Después, un "personaje invisible" (la tortuga) lee el texto resultante: las letras son notas, los "+" suben el tono y los "-" bajan el tono.',
      musicalEffect: 'Produce una textura melódica auto-semejante: escucharás pequeños motivos o "frases" de notas que vuelven a aparecer más adelante pero transportadas o con variaciones de velocidad. Es ideal para crear melodías ambientales y patrones hipnóticos.',
      tip: 'Prueba la regla "Tree Branching" (Árbol) con un "Paso de Intervalo" de 2 semitonos. Escucharás cómo la melodía asciende y se bifurca en cascadas de notas que imitan la silueta de un árbol.',
    },
    {
      id: 'logistic',
      title: 'Mapa Logístico (Teoría del Caos)',
      subtitle: 'El sonido de la naturaleza y el caos controlado',
      icon: <Zap className="w-4 h-4 text-freq-high-mid" />,
      musicalAnalogy: 'Imagina una población de conejos en una isla con comida limitada. Si nacen pocos, la población crece. Si nacen demasiados, se quedan sin comida y la población cae. Esta simple regla de equilibrio natural es el Mapa Logístico. En la música, define el volumen y la afinación de las notas basándose en este vaivén biológico.',
      howItWorks: 'La fórmula calcula el siguiente valor basándose en el anterior. El comportamiento depende del "Factor de Crecimiento (r)": por debajo de 3.0, el sistema es estable (toca siempre la misma nota); entre 3.0 y 3.5, oscila entre 2 o 4 notas; y por encima de 3.57, se desata el caos absoluto.',
      musicalEffect: 'Es perfecto para experimentar con la transición entre el orden y el caos. Puedes crear melodías repetitivas tipo "eco", patrones oscilantes tipo "trino", o ráfagas de notas totalmente impredecibles pero que conservan una cohesión física orgánica.',
      tip: 'Prueba a deslizar el "Factor de Caos (r)" lentamente. Por debajo de 3.4 escucharás un patrón muy estable de dos notas alternadas. Aumenta a 3.8 y verás en el visualizador cómo el orden explota en una cascada caótica de notas.',
    },
    {
      id: 'fibonacci',
      title: 'Fibonacci y Espiral Áurea',
      subtitle: 'La geometría de la belleza natural',
      icon: <Sparkles className="w-4 h-4 text-freq-high" />,
      musicalAnalogy: 'La sucesión de Fibonacci (1, 1, 2, 3, 5, 8, 13...) y la espiral de las conchas de mar están ligadas a la Proporción Áurea. Los humanos percibimos estas proporciones como perfectas tanto visual como acústicamente. Al aplicarlas aquí, creamos secuencias que suenan naturales, equilibradas y misteriosamente familiares.',
      howItWorks: 'En el modo "Golden Spiral" (Paso de Tono), calculamos la distancia geométrica de una espiral que se expande hacia afuera en cada paso y la traducimos a la altura de la nota. En el modo "Fibonacci Rhythms" (Ritmo), colocamos las notas en los tiempos correspondientes a los números de la secuencia.',
      musicalEffect: 'El modo espiral crea arpegios ascendentes y majestuosos que parecen expandirse infinitamente en el espacio. El modo ritmo crea ritmos asimétricos, síncopas y contratiempos muy interesantes que se asemejan al latido irregular pero fluido de la naturaleza.',
      tip: 'Usa el modo "Fibonacci Rhythms" combinado con una escala "Pentatónica" para obtener bases rítmicas orgánicas y mágicas ideales para ambientar.',
    },
  ];

  return (
    <div className="border border-black bg-[#fafafa] p-4 mt-8">
      <div className="flex items-center gap-2 border-b border-black pb-3 mb-4">
        <BookOpen className="w-5 h-5" />
        <h3 className="font-black uppercase tracking-tighter text-sm">
          Guía Didáctica: Música & Matemáticas
        </h3>
        <span className="text-[9px] font-mono text-black/50 ml-auto uppercase">
          Manual para Músicos
        </span>
      </div>

      <p className="text-xs text-black/70 mb-4 leading-relaxed">
        ¿Te confunden los números? ¡No te preocupes! Aquí te explicamos qué hace cada generador matemático
        en términos puramente musicales y cómo usar la geometría del sonido a tu favor. Haz click en cualquier sección para explorar.
      </p>

      <div className="flex flex-col gap-2">
        {sections.map((sec) => {
          const isOpen = openSectionId === sec.id;
          return (
            <div key={sec.id} className="border border-black/10 bg-white">
              {/* Accordion Trigger */}
              <button
                onClick={() => setOpenSectionId(isOpen ? null : sec.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-black/5 cursor-pointer"
              >
                {sec.icon}
                <div className="flex-grow">
                  <h4 className="font-bold text-xs uppercase font-mono tracking-wide">
                    {sec.title}
                  </h4>
                  <p className="text-[10px] text-black/50 italic">{sec.subtitle}</p>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-black/40" /> : <ChevronDown className="w-4 h-4 text-black/40" />}
              </button>

              {/* Accordion Content */}
              {isOpen && (
                <div className="border-t border-black/10 p-4 bg-[#fbfbfa] text-xs flex flex-col gap-4">
                  {/* Analogy Section */}
                  <div>
                    <span className="font-bold font-mono text-[9px] uppercase tracking-wider text-black/40 block mb-1">
                      Intuición Musical
                    </span>
                    <p className="leading-relaxed text-black/80">{sec.musicalAnalogy}</p>
                  </div>

                  {/* Math explanation */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-black/5 pt-3">
                    <div>
                      <span className="font-bold font-mono text-[9px] uppercase tracking-wider text-black/40 block mb-1">
                        ¿Cómo funciona la regla?
                      </span>
                      <p className="leading-relaxed text-black/70">{sec.howItWorks}</p>
                    </div>
                    <div>
                      <span className="font-bold font-mono text-[9px] uppercase tracking-wider text-black/40 block mb-1">
                        Efecto Sonoro
                      </span>
                      <p className="leading-relaxed text-black/70">{sec.musicalEffect}</p>
                    </div>
                  </div>

                  {/* Tip alert box */}
                  <div className="border-l-2 border-black bg-black/[0.03] p-3 text-[11px] leading-relaxed">
                    <span className="font-black uppercase tracking-wider text-[9px] block mb-0.5 text-black">
                      ¡Pruébalo así!
                    </span>
                    <span className="text-black/70">{sec.tip}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
