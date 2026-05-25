import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Clip, SoundVector, AffineMatrix } from '../types';
import { applyAffine } from '../engine/math/affine';

const BG_COLOR = 0xf4f4f0;
const FG_COLOR = 0x111111;
const GRID_COLOR = 0xe5e5e5;
const GRID_PRIME_COLOR = 0xcccccc;
const PLAYHEAD_COLOR = 0x111111;

function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

function fibonacciUpTo(max: number): number[] {
  const fibs: number[] = [1, 1];
  while (fibs[fibs.length - 1] + fibs[fibs.length - 2] <= max) {
    fibs.push(fibs[fibs.length - 1] + fibs[fibs.length - 2]);
  }
  return fibs;
}

const FREQ_COLORS = [
  { min: 0, max: 24, color: 0x8b0000 },
  { min: 24, max: 48, color: 0xff6600 },
  { min: 48, max: 72, color: 0xffd700 },
  { min: 72, max: 96, color: 0x00aa44 },
  { min: 96, max: 112, color: 0x0066cc },
  { min: 112, max: 128, color: 0x7700cc },
];

function colorForPitch(p: number): number {
  for (const band of FREQ_COLORS) {
    if (p >= band.min && p < band.max) return band.color;
  }
  return FG_COLOR;
}

export class TimelineCanvas {
  private app: Application | null = null;
  private mainContainer: Container = new Container();
  private gridContainer: Container = new Container();
  private clipContainer: Container = new Container();
  private playheadGraphics: Graphics = new Graphics();
  private overlayContainer: Container = new Container();

  zoom = { x: 1, y: 1 };
  pan = { x: 80, y: 0 };
  private pixelsPerBeat = 60;
  private pixelsPerNote = 6;
  private _width = 0;
  private _height = 0;

  private _clips: Clip[] = [];
  private _playheadTime = 0;
  private _selectedClipId: string | null = null;
  private _bpm = 120;

  onClipSelect?: (clipId: string | null) => void;
  onClipMove?: (clipId: string, newStartTime: number, newLane: number, deltaSemitones: number) => void;
  onSeek?: (beat: number) => void;

  setBpm(bpm: number) {
    this._bpm = bpm;
    this.drawGrid();
    this.renderClips();
  }

  private draggingClip: {
    id: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    startTime: number;
    lane: number;
  } | null = null;

  async init(canvas: HTMLCanvasElement) {
    this.app = new Application();
    this._width = canvas.clientWidth || canvas.width || 800;
    this._height = canvas.clientHeight || canvas.height || 400;

    await this.app.init({
      canvas,
      width: this._width,
      height: this._height,
      backgroundColor: BG_COLOR,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio,
    });

    this.app.stage.addChild(this.mainContainer);
    this.mainContainer.addChild(this.gridContainer);
    this.mainContainer.addChild(this.clipContainer);
    this.mainContainer.addChild(this.playheadGraphics);
    this.mainContainer.addChild(this.overlayContainer);

    this.setupInteraction(canvas);
    this.drawGrid();
  }

  resize(w: number, h: number) {
    if (!this.app) return;
    this._width = w;
    this._height = h;
    this.app.renderer.resize(w, h);
    this.drawGrid();
    this.renderClips();
  }

  setClips(clips: Clip[]) {
    this._clips = clips;
    this.renderClips();
  }

  setPlayhead(timeInBeats: number) {
    this._playheadTime = timeInBeats;
    this.drawPlayhead();
  }

  setSelectedClip(id: string | null) {
    this._selectedClipId = id;
    this.renderClips();
  }

  private toScreenX(beats: number): number {
    return beats * this.pixelsPerBeat * this.zoom.x + this.pan.x;
  }

  private toScreenY(midiNote: number): number {
    return (127 - midiNote) * this.pixelsPerNote * this.zoom.y + this.pan.y;
  }

  private beatWidth(durationBeats: number): number {
    return durationBeats * this.pixelsPerBeat * this.zoom.x;
  }

  private drawGrid() {
    this.gridContainer.removeChildren();
    const g = new Graphics();
    const labelStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 9,
      fill: 0x999999,
    });

    const visibleBeatsStart = Math.max(0, Math.floor(-this.pan.x / (this.pixelsPerBeat * this.zoom.x)));
    const visibleBeatsEnd = Math.ceil((this._width - this.pan.x) / (this.pixelsPerBeat * this.zoom.x));

    // Vertical lines — beats. Primes get heavier lines
    for (let beat = visibleBeatsStart; beat <= visibleBeatsEnd; beat++) {
      const x = this.toScreenX(beat);
      const prime = isPrime(beat);
      g.moveTo(x, 0);
      g.lineTo(x, this._height);
      g.stroke({ color: prime ? GRID_PRIME_COLOR : GRID_COLOR, width: prime ? 1.5 : 0.5 });

      if (beat % 4 === 0 || prime) {
        const label = new Text({ text: `${beat}`, style: labelStyle });
        label.x = x + 3;
        label.y = 2;
        this.gridContainer.addChild(label);
      }
    }

    // Fibonacci subdivision markers within each bar
    const fibs = fibonacciUpTo(16);
    for (let bar = Math.floor(visibleBeatsStart / 4); bar <= Math.ceil(visibleBeatsEnd / 4); bar++) {
      for (const f of fibs) {
        if (f >= 16) break;
        const beat = bar * 4 + f / 4;
        const x = this.toScreenX(beat);
        g.moveTo(x, this._height - 8);
        g.lineTo(x, this._height);
        g.stroke({ color: 0xbbbbbb, width: 0.5 });
      }
    }

    // Horizontal lines — MIDI notes. Show every octave + label
    const visibleNoteTop = Math.max(0, Math.floor((this.pan.y - 0) / (this.pixelsPerNote * this.zoom.y)));
    const visibleNoteBottom = Math.min(127, Math.ceil((this._height + this.pan.y) / (this.pixelsPerNote * this.zoom.y)));
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    for (let note = 127 - visibleNoteBottom; note <= 127 - visibleNoteTop; note++) {
      const y = this.toScreenY(note);
      const isC = note % 12 === 0;
      if (isC) {
        g.moveTo(0, y);
        g.lineTo(this._width, y);
        g.stroke({ color: GRID_PRIME_COLOR, width: 1 });
        const octave = Math.floor(note / 12) - 1;
        const label = new Text({ text: `C${octave} (${note})`, style: labelStyle });
        label.x = 3;
        label.y = y + 2;
        this.gridContainer.addChild(label);
      } else if (note % 12 === 7) {
        g.moveTo(0, y);
        g.lineTo(this._width, y);
        g.stroke({ color: GRID_COLOR, width: 0.5 });
      }
    }

    // Axis labels
    const xLabel = new Text({
      text: 't (beats)',
      style: new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: 0xaaaaaa }),
    });
    xLabel.x = this._width - 60;
    xLabel.y = this._height - 18;
    this.gridContainer.addChild(xLabel);

    const yLabel = new Text({
      text: 'p (MIDI)',
      style: new TextStyle({ fontFamily: 'monospace', fontSize: 10, fill: 0xaaaaaa }),
    });
    yLabel.x = 3;
    yLabel.y = this._height - 18;
    this.gridContainer.addChild(yLabel);

    this.gridContainer.addChild(g);
  }

  private renderClips() {
    this.clipContainer.removeChildren();

    for (const clip of this._clips) {
      const isDraggingThis = this.draggingClip && this.draggingClip.id === clip.id;
      if (isDraggingThis) {
        const dx = this.draggingClip!.currentX - this.draggingClip!.startX;
        const dy = this.draggingClip!.currentY - this.draggingClip!.startY;

        const deltaBeats = dx / (this.pixelsPerBeat * this.zoom.x);
        const snapGrid = 0.25;
        const targetBeats = Math.round(deltaBeats / snapGrid) * snapGrid;

        if (clip.vectors.length > 0) {
          const deltaSemitones = Math.round(-dy / (this.pixelsPerNote * this.zoom.y));
          this.renderClip(clip, { beats: targetBeats, semitones: deltaSemitones, lanes: 0 });
        } else {
          const deltaLanes = Math.round(dy / (8 * this.pixelsPerNote * this.zoom.y));
          this.renderClip(clip, { beats: targetBeats, semitones: 0, lanes: deltaLanes });
        }
      } else {
        this.renderClip(clip);
      }
    }
  }

  private renderClip(
    clip: Clip,
    dragOffsets?: { beats: number; semitones: number; lanes: number }
  ) {
    const startTime = Math.max(0, clip.startTime + (dragOffsets?.beats ?? 0));
    const lane = Math.max(0, clip.lane + (dragOffsets?.lanes ?? 0));
    const semitones = dragOffsets?.semitones ?? 0;

    const selected = clip.id === this._selectedClipId;
    const hasVectors = clip.vectors.length > 0;

    let x = this.toScreenX(startTime);
    let y = 0;
    let w = Math.max(this.beatWidth(clip.duration), 4);
    let h = 0;
    let boxColor = 0x888888;

    if (hasVectors) {
      const pitches = clip.vectors.map((v) => v.p + semitones);
      const minP = Math.min(...pitches);
      const maxP = Math.max(...pitches);
      const topPitch = Math.min(127, maxP + 2);
      const bottomPitch = Math.max(0, minP - 2);

      y = this.toScreenY(topPitch);
      h = (topPitch - bottomPitch + 1) * this.pixelsPerNote * this.zoom.y;
      boxColor = colorForPitch(maxP);
    } else {
      y = this.toScreenY(60 + lane * 8);
      h = 8 * this.pixelsPerNote * this.zoom.y;
      boxColor = colorForPitch(60 + lane * 8);
    }

    const g = new Graphics();
    g.rect(x, y, w, h);
    g.fill({ color: boxColor, alpha: selected ? 0.08 : 0.04 });
    g.stroke({
      color: selected ? FG_COLOR : boxColor,
      width: selected ? 2 : 0.8,
      alpha: selected ? 1.0 : 0.4,
    });

    const nameStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 9,
      fill: FG_COLOR,
      fontWeight: selected ? 'bold' : 'normal',
    });
    const label = new Text({ text: clip.name, style: nameStyle });
    label.x = x + 4;
    label.y = y + 2;

    this.clipContainer.addChild(g);
    this.clipContainer.addChild(label);

    if (hasVectors) {
      for (const v of clip.vectors) {
        const vx = this.toScreenX(startTime + (v.t / 1000) * (this._bpm / 60));
        const vy = this.toScreenY(v.p + semitones);
        const vw = Math.max(this.beatWidth((v.duration / 1000) * (this._bpm / 60)), 2);
        const vh = this.pixelsPerNote * this.zoom.y;

        const vg = new Graphics();
        vg.rect(vx, vy, vw, vh);
        vg.fill({ color: colorForPitch(v.p + semitones), alpha: v.velocity * 0.75 });
        vg.stroke({
          color: selected ? FG_COLOR : colorForPitch(v.p + semitones),
          width: selected ? 1 : 0.4,
          alpha: selected ? 0.8 : 0.4,
        });
        this.clipContainer.addChild(vg);
      }
    }

    g.eventMode = 'static';
    g.cursor = 'move';
    g.on('pointerdown', (e) => {
      if (e.button === 0 && !e.altKey) {
        e.stopPropagation();
        this.onClipSelect?.(clip.id);
        this.draggingClip = {
          id: clip.id,
          startX: e.clientX,
          startY: e.clientY,
          currentX: e.clientX,
          currentY: e.clientY,
          startTime: clip.startTime,
          lane: clip.lane,
        };
        this.renderClips();
      }
    });
  }

  private drawPlayhead() {
    this.playheadGraphics.clear();
    const x = this.toScreenX(this._playheadTime);
    this.playheadGraphics.moveTo(x, 0);
    this.playheadGraphics.lineTo(x, this._height);
    this.playheadGraphics.stroke({ color: PLAYHEAD_COLOR, width: 1.5, alpha: 0.6 });

    const triSize = 6;
    this.playheadGraphics.moveTo(x - triSize, 0);
    this.playheadGraphics.lineTo(x + triSize, 0);
    this.playheadGraphics.lineTo(x, triSize);
    this.playheadGraphics.closePath();
    this.playheadGraphics.fill({ color: PLAYHEAD_COLOR, alpha: 0.8 });
  }

  applyTransformToClip(clipId: string, m: AffineMatrix): Clip | undefined {
    const clip = this._clips.find((c) => c.id === clipId);
    if (!clip) return undefined;
    const transformed: Clip = {
      ...clip,
      vectors: clip.vectors.map((v) => applyAffine(v, m)),
    };
    return transformed;
  }

  private setupInteraction(canvas: HTMLCanvasElement) {
    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      if (e.shiftKey) {
        this.zoom.y *= factor;
      } else if (e.ctrlKey || e.metaKey) {
        this.zoom.x *= factor;
        this.zoom.y *= factor;
      } else {
        this.zoom.x *= factor;
      }
      this.zoom.x = Math.max(0.1, Math.min(10, this.zoom.x));
      this.zoom.y = Math.max(0.1, Math.min(10, this.zoom.y));
      this.drawGrid();
      this.renderClips();
      this.drawPlayhead();
    }, { passive: false });

    let dragging = false;
    let lastPos = { x: 0, y: 0 };

    canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 1 || e.altKey) {
        dragging = true;
        lastPos = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = 'grabbing';
      } else if (e.button === 0) {
        // Left click on background -> Seek
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const beat = (clickX - this.pan.x) / (this.pixelsPerBeat * this.zoom.x);
        
        // Snap to 16th note (0.25 beat)
        const snappedBeat = Math.max(0, Math.round(beat * 4) / 4);
        
        this.onSeek?.(snappedBeat);
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (this.draggingClip) {
        this.draggingClip.currentX = e.clientX;
        this.draggingClip.currentY = e.clientY;
        this.renderClips();
        return;
      }
      if (!dragging) return;
      this.pan.x += e.clientX - lastPos.x;
      this.pan.y += e.clientY - lastPos.y;
      lastPos = { x: e.clientX, y: e.clientY };
      this.drawGrid();
      this.renderClips();
      this.drawPlayhead();
    });

    const endDrag = () => {
      if (this.draggingClip) {
        const dx = this.draggingClip.currentX - this.draggingClip.startX;
        const dy = this.draggingClip.currentY - this.draggingClip.startY;

        const deltaBeats = dx / (this.pixelsPerBeat * this.zoom.x);
        const snapGrid = 0.25;
        const targetBeats = Math.max(0, Math.round((this.draggingClip.startTime + deltaBeats) / snapGrid) * snapGrid);

        const clip = this._clips.find((c) => c.id === this.draggingClip!.id);
        let targetLane = this.draggingClip.lane;
        let deltaSemitones = 0;

        if (clip) {
          if (clip.vectors.length > 0) {
            deltaSemitones = Math.round(-dy / (this.pixelsPerNote * this.zoom.y));
          } else {
            const deltaLanes = Math.round(dy / (8 * this.pixelsPerNote * this.zoom.y));
            targetLane = Math.max(0, this.draggingClip.lane + deltaLanes);
          }
        }

        const dragClipId = this.draggingClip.id;
        this.draggingClip = null;

        this.onClipMove?.(dragClipId, targetBeats, targetLane, deltaSemitones);
        this.renderClips();
        return;
      }
      dragging = false;
      canvas.style.cursor = 'default';
    };

    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointerleave', endDrag);
  }

  destroy() {
    this.app?.destroy(true);
    this.app = null;
  }
}
