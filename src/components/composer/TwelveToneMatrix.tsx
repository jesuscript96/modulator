import React, { useMemo, useState } from 'react';

interface TwelveToneMatrixProps {
  primeRow: number[]; // 12 numbers from 0-11 (permutations of Z_12)
  onSelectSequence: (sequence: { name: string; notes: number[] }) => void;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export default function TwelveToneMatrix({
  primeRow,
  onSelectSequence,
}: TwelveToneMatrixProps) {
  const [hoveredLine, setHoveredLine] = useState<{
    type: 'P' | 'R' | 'I' | 'RI';
    index: number;
  } | null>(null);

  // Compute 12x12 matrix
  const matrix = useMemo(() => {
    if (primeRow.length !== 12) return Array.from({ length: 12 }, () => new Array(12).fill(0));
    const mat = Array.from({ length: 12 }, () => new Array(12).fill(0));

    // Top row
    for (let j = 0; j < 12; j++) mat[0][j] = primeRow[j];

    // Left column & fill
    for (let i = 0; i < 12; i++) {
      const valCol0 = (2 * primeRow[0] - primeRow[i] + 12) % 12;
      mat[i][0] = valCol0;
      for (let j = 1; j < 12; j++) {
        mat[i][j] = (primeRow[j] + valCol0 - primeRow[0] + 12) % 12;
      }
    }

    return mat;
  }, [primeRow]);

  // Check if a cell is highlighted based on the hovered line
  const isCellHighlighted = (r: number, c: number) => {
    if (!hoveredLine) return false;
    if (hoveredLine.type === 'P' || hoveredLine.type === 'R') {
      return r === hoveredLine.index;
    }
    if (hoveredLine.type === 'I' || hoveredLine.type === 'RI') {
      return c === hoveredLine.index;
    }
    return false;
  };

  // Triggered when clicking a sequence header
  const handleSelectSequence = (type: 'P' | 'R' | 'I' | 'RI', index: number) => {
    let notes: number[] = [];
    let name = '';

    if (type === 'P') {
      notes = [...matrix[index]];
      const interval = (matrix[index][0] - matrix[0][0] + 12) % 12;
      name = `Prime P_${interval} (Row ${index + 1})`;
    } else if (type === 'R') {
      notes = [...matrix[index]].reverse();
      const interval = (matrix[index][0] - matrix[0][0] + 12) % 12;
      name = `Retrograde R_${interval} (Row ${index + 1} Rev)`;
    } else if (type === 'I') {
      notes = matrix.map((row) => row[index]);
      const interval = (matrix[0][index] - matrix[0][0] + 12) % 12;
      name = `Inversion I_${interval} (Col ${index + 1})`;
    } else if (type === 'RI') {
      notes = matrix.map((row) => row[index]).reverse();
      const interval = (matrix[0][index] - matrix[0][0] + 12) % 12;
      name = `Retrograde Inversion RI_${interval} (Col ${index + 1} Rev)`;
    }

    onSelectSequence({ name, notes });
  };

  return (
    <div className="flex flex-col gap-4 items-center">
      <div className="text-center max-w-md text-xs leading-relaxed text-black/60 uppercase tracking-wider mb-2">
        Click on any edge header (<strong>P</strong>, <strong>R</strong>, <strong>I</strong>, <strong>RI</strong>)
        to extract that twelve-tone row. Highlighted cells show the notes that will be captured.
      </div>

      {/* Grid container */}
      <div className="grid grid-cols-14 gap-1 select-none font-mono text-center text-[10px] border border-black p-4 bg-[#fbfbfa] w-max">
        
        {/* Top-Left Empty Corner */}
        <div className="w-8 h-8 flex items-center justify-center text-[9px] text-black/30">I \ P</div>

        {/* Top Headers: Inversion (I_0 to I_11) */}
        {Array.from({ length: 12 }).map((_, colIdx) => {
          const startNote = matrix[0][colIdx];
          const interval = (startNote - matrix[0][0] + 12) % 12;
          return (
            <button
              key={`top-${colIdx}`}
              onMouseEnter={() => setHoveredLine({ type: 'I', index: colIdx })}
              onMouseLeave={() => setHoveredLine(null)}
              onClick={() => handleSelectSequence('I', colIdx)}
              className="w-8 h-8 border border-black/10 flex flex-col items-center justify-center hover:bg-black hover:text-white transition-colors cursor-pointer"
              title={`Inversion starting on ${NOTE_NAMES[startNote]}`}
            >
              <span className="font-bold">I</span>
              <span className="text-[8px] opacity-60">{interval}</span>
            </button>
          );
        })}

        {/* Top-Right Corner */}
        <div className="w-8 h-8" />

        {/* Rows */}
        {matrix.map((row, rowIdx) => {
          const startNote = row[0];
          const interval = (startNote - matrix[0][0] + 12) % 12;

          return (
            <React.Fragment key={`row-${rowIdx}`}>
              {/* Left Header: Prime (P_0 to P_11) */}
              <button
                onMouseEnter={() => setHoveredLine({ type: 'P', index: rowIdx })}
                onMouseLeave={() => setHoveredLine(null)}
                onClick={() => handleSelectSequence('P', rowIdx)}
                className="w-8 h-8 border border-black/10 flex flex-col items-center justify-center hover:bg-black hover:text-white transition-colors cursor-pointer"
                title={`Prime row starting on ${NOTE_NAMES[startNote]}`}
              >
                <span className="font-bold">P</span>
                <span className="text-[8px] opacity-60">{interval}</span>
              </button>

              {/* Matrix Cells */}
              {row.map((val, colIdx) => {
                const highlighted = isCellHighlighted(rowIdx, colIdx);
                const isFirstRow = rowIdx === 0;
                return (
                  <div
                    key={`cell-${rowIdx}-${colIdx}`}
                    className={`w-8 h-8 flex flex-col items-center justify-center border border-black/10 transition-colors ${
                      highlighted
                        ? 'bg-black text-white border-black font-bold'
                        : isFirstRow
                        ? 'bg-black/5 border-black/25'
                        : 'bg-white'
                    }`}
                  >
                    <span>{NOTE_NAMES[val]}</span>
                    <span className="text-[7px] opacity-50">{val}</span>
                  </div>
                );
              })}

              {/* Right Header: Retrograde (R_0 to R_11) */}
              <button
                onMouseEnter={() => setHoveredLine({ type: 'R', index: rowIdx })}
                onMouseLeave={() => setHoveredLine(null)}
                onClick={() => handleSelectSequence('R', rowIdx)}
                className="w-8 h-8 border border-black/10 flex flex-col items-center justify-center hover:bg-black hover:text-white transition-colors cursor-pointer"
                title={`Retrograde row starting on ${NOTE_NAMES[row[11]]}`}
              >
                <span className="font-bold">R</span>
                <span className="text-[8px] opacity-60">{interval}</span>
              </button>
            </React.Fragment>
          );
        })}

        {/* Bottom-Left Corner */}
        <div className="w-8 h-8" />

        {/* Bottom Headers: Retrograde Inversion (RI_0 to RI_11) */}
        {Array.from({ length: 12 }).map((_, colIdx) => {
          const startNote = matrix[0][colIdx];
          const interval = (startNote - matrix[0][0] + 12) % 12;
          return (
            <button
              key={`bottom-${colIdx}`}
              onMouseEnter={() => setHoveredLine({ type: 'RI', index: colIdx })}
              onMouseLeave={() => setHoveredLine(null)}
              onClick={() => handleSelectSequence('RI', colIdx)}
              className="w-8 h-8 border border-black/10 flex flex-col items-center justify-center hover:bg-black hover:text-white transition-colors cursor-pointer"
              title={`Retrograde Inversion starting on ${NOTE_NAMES[matrix[11][colIdx]]}`}
            >
              <span className="font-bold">RI</span>
              <span className="text-[8px] opacity-60">{interval}</span>
            </button>
          );
        })}

        {/* Bottom-Right Corner */}
        <div className="w-8 h-8 flex items-center justify-center text-[9px] text-black/30">RI\R</div>
      </div>
    </div>
  );
}
