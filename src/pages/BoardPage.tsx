import BoardView from '../components/board/BoardView';
import type { BoardAudioEngine } from '../engine/BoardAudioEngine';

interface BoardPageProps {
  boardEngine: BoardAudioEngine;
}

export default function BoardPage({ boardEngine }: BoardPageProps) {
  return (
    <div className="flex-grow flex flex-col min-h-0 h-full">
      <BoardView boardEngine={boardEngine} />
    </div>
  );
}
