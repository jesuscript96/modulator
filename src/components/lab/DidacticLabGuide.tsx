import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Waves, Disc, HelpCircle, FastForward } from 'lucide-react';

interface LabGuideSection {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  explanation: string;
  parametersExplained: string;
  musicalUse: string;
}

export default function DidacticLabGuide() {
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);

  const sections: LabGuideSection[] = [
    {
      id: 'granular',
      title: 'Síntesis Granular',
      subtitle: 'El sonido cortado en confeti de audio',
      icon: <Waves className="w-4 h-4 text-freq-mid" />,
      explanation: 'En lugar de reproducir una grabación de principio a fin como un cassette convencional, el motor granular toma tu archivo MP3 y lo tritura en miles de fragmentos microscópicos llamados "granos" (de entre 10 y 500 milisegundos). Al solapar y reordenar estos granos a gran velocidad, podemos estirar el sonido infinitamente sin que cambie de tono, o deformar su textura por completo.',
      parametersExplained: '• Tamaño de Grano (Grain Size): Define la duración de cada trocito. Muy corto suena a nube o gas; muy largo suena a pequeños ecos.\n• Solapamiento (Overlap): Cuánto se enciman los trocitos. Mucho solapamiento da un sonido continuo y denso como una alfombra. Poco da un efecto entrecortado como tartamudeo.',
      musicalUse: 'Úsalo para crear atmósferas envolventes de fondo (pads) a partir de un fragmento de voz corto, o para añadir un zumbido denso e irreal a cualquier instrumento.',
    },
    {
      id: 'euclidean',
      title: 'Rítmica Euclidiana y Bjorklund',
      subtitle: 'La batería más ordenada del planeta',
      icon: <Disc className="w-4 h-4 text-freq-bass" />,
      explanation: 'El algoritmo euclidiano distribuye un número de golpes de percusión de la forma más uniforme posible a lo largo de un ciclo de tiempo (generalmente 16 pasos). Este principio matemático simple genera, casi por accidente, los ritmos más famosos del mundo: el tresillo latino, la clave de salsa, ritmos tradicionales africanos y el compás techno de cuatro por cuatro.',
      parametersExplained: '• Control K/N (ej. 3/16): "K" es la cantidad de golpes activos que quieres oír, y "N" es el total de divisiones del compás (16 golpes). Al mover el slider de K, el algoritmo recalcula la distancia perfecta entre golpes para que sigan sonando estables y bailables.',
      musicalUse: 'Ideal para diseñar de inmediato bases rítmicas de percusión exóticas que encajen matemáticamente a la perfección entre sí sin sonar aburridas.',
    },
    {
      id: 'stretch',
      title: 'Estiramiento Espectral (Time Stretch)',
      subtitle: 'Estirando el tiempo al infinito',
      icon: <FastForward className="w-4 h-4 text-freq-low-mid" />,
      explanation: 'Estirar un audio normalmente lo hace sonar grave y lento (como un disco de vinilo frenado con la mano). Con el estiramiento espectral, separamos la información de frecuencia y tiempo en el dominio matemático para poder alargar el tiempo sin afectar el tono (vocoder).',
      parametersExplained: '• Paulstretch: Un algoritmo especializado en estiramientos gigantescos (ej. 8x o 16x). Difumina el audio en un túnel de resonancias celestiales.\n• Padovan / Primos: Utiliza sucesiones matemáticas para acelerar o desacelerar el audio de forma rítmica no lineal, logrando texturas que cambian de velocidad orgánicamente.',
      musicalUse: 'Perfecto para transformar cualquier muestra de audio corta en un paisaje sonoro ambiental infinito. ¡Arrastra una voz o un acorde y actívalo en 8x con Paulstretch!',
    },
    {
      id: 'modulators',
      title: 'Moduladores de Parámetros',
      subtitle: 'La naturaleza controlando la mesa de mezclas',
      icon: <HelpCircle className="w-4 h-4 text-freq-high" />,
      explanation: 'Para que el sonido no sea estático, necesitamos mover las perillas de grano, desafinación y filtro constantemente. En lugar de hacerlo a mano, conectamos estas perillas a reglas matemáticas que imitan la naturaleza (el orden de Fibonacci, el crecimiento simétrico del Golden Ratio o las ráfagas caóticas del Ruido Simplex).',
      parametersExplained: '• Complejidad: Elige cada cuántos pasos la ecuación vuelve a empezar. Valores más altos crean ciclos de modulación muy largos y progresivos.',
      musicalUse: 'Consigue que tu sonido granular "respire" y cambie de timbre por sí solo en cada tiempo del secuenciador, logrando que la música nunca suene idéntica en cada ciclo.',
    },
  ];

  return (
    <div className="border border-black bg-[#fafafa] p-4 mt-8">
      <div className="flex items-center gap-2 border-b border-black pb-3 mb-4">
        <BookOpen className="w-5 h-5" />
        <h3 className="font-black uppercase tracking-tighter text-sm">
          Guía Didáctica: Laboratorio de Sonido
        </h3>
        <span className="text-[9px] font-mono text-black/50 ml-auto uppercase">
          Manual del Laboratorio
        </span>
      </div>

      <p className="text-xs text-black/70 mb-4 leading-relaxed">
        El laboratorio (Lab) manipula archivos de audio reales mediante física ondulatoria y algoritmos.
        Haz click en los temas para descubrir cómo esculpir tu sonido con matemáticas aplicadas.
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
                <div className="border-t border-black/10 p-4 bg-[#fbfbfa] text-xs flex flex-col gap-3">
                  <div>
                    <span className="font-bold font-mono text-[9px] uppercase tracking-wider text-black/40 block mb-1">
                      ¿Qué es y cómo funciona?
                    </span>
                    <p className="leading-relaxed text-black/80">{sec.explanation}</p>
                  </div>

                  <div className="border-t border-black/5 pt-3">
                    <span className="font-bold font-mono text-[9px] uppercase tracking-wider text-black/40 block mb-1">
                      Los Controles Clave
                    </span>
                    <p className="leading-relaxed text-black/70 whitespace-pre-line">{sec.parametersExplained}</p>
                  </div>

                  <div className="border-t border-black/5 pt-3 border-l-2 border-black bg-black/[0.02] p-2.5">
                    <span className="font-black uppercase tracking-wider text-[9px] block mb-0.5 text-black">
                      Cuándo y cómo usarlo:
                    </span>
                    <p className="leading-relaxed text-black/70">{sec.musicalUse}</p>
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
