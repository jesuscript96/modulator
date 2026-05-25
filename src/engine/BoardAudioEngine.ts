import * as Tone from 'tone';
import type { Clip } from '../types';
import { useProjectStore } from '../stores/useProjectStore';

export class BoardAudioEngine {
  private players = new Map<string, Tone.Player>();
  private synth: Tone.PolySynth;
  private scheduleIds: number[] = [];
  private filter: Tone.Filter;
  private delay: Tone.FeedbackDelay;
  private reverb: Tone.Freeverb;
  private clips: Clip[] = [];

  private playbackMode: 'both' | 'synth' | 'audio' = 'both';

  constructor() {
    this.filter = new Tone.Filter(1800, 'lowpass');
    this.delay = new Tone.FeedbackDelay('8n.', 0.3);
    this.reverb = new Tone.Freeverb({ roomSize: 0.75, dampening: 4000 });

    // Additive harmonic synth: triangle wave with light chorus / space delay
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'triangle',
      },
      envelope: {
        attack: 0.04,
        decay: 0.12,
        sustain: 0.5,
        release: 0.6,
      },
      volume: -8,
    });

    this.synth.connect(this.filter);
    this.filter.connect(this.delay);
    this.delay.connect(this.reverb);
    this.reverb.toDestination();
  }

  setPlaybackMode(mode: 'both' | 'synth' | 'audio') {
    this.playbackMode = mode;
  }

  stopAllPlayers() {
    this.players.forEach((p) => {
      try {
        p.stop();
      } catch (e) {}
    });
  }

  playActiveClips(currentSeconds: number) {
    this.stopAllPlayers();

    const bpm = Tone.Transport.bpm.value;
    for (const clip of this.clips) {
      if (!clip.audioBuffer) continue;

      const playAudio =
        this.playbackMode === 'both' ||
        this.playbackMode === 'audio' ||
        clip.vectors.length === 0;

      if (!playAudio) continue;

      const startSeconds = clip.startTime * (60 / bpm);
      const durationSeconds = clip.duration * (60 / bpm);
      const endSeconds = startSeconds + durationSeconds;

      // Start player immediately with appropriate offset if playhead lies within the clip
      if (currentSeconds > startSeconds && currentSeconds < endSeconds - 0.05) {
        const offsetSeconds = currentSeconds - startSeconds;
        const remainingSeconds = endSeconds - currentSeconds;
        const player = this.players.get(clip.id);
        if (player) {
          player.start(Tone.immediate(), offsetSeconds, remainingSeconds);
        }
      }
    }
  }

  sync(clips: Clip[], bpm: number, mode: 'both' | 'synth' | 'audio') {
    this.clips = clips;
    this.playbackMode = mode;

    // 1. Clear previous transport schedules
    this.scheduleIds.forEach((id) => Tone.Transport.clear(id));
    this.scheduleIds = [];

    // 2. Stop and dispose old players
    this.players.forEach((p) => {
      try {
        p.stop();
      } catch (e) {}
      p.dispose();
    });
    this.players.clear();

    // Update BPM
    Tone.Transport.bpm.value = bpm;

    // 3. Reschedule all clips
    for (const clip of clips) {
      if (!clip.audioBuffer) continue;

      // Play original audio if playback mode allows it, OR if the clip has no vectors
      const playAudio =
        this.playbackMode === 'both' ||
        this.playbackMode === 'audio' ||
        clip.vectors.length === 0;

      if (playAudio) {
        const player = new Tone.Player(clip.audioBuffer).toDestination();
        this.players.set(clip.id, player);

        // Apply transposition (detune) if clip has vectors
        const match = clip.id.match(/^board-(.+?)-[^-]+$/);
        if (match) {
          const labClipId = match[1];
          const labClip = useProjectStore.getState().labClips.find((c) => c.id === labClipId);
          if (labClip && labClip.vectors && labClip.vectors.length > 0 && clip.vectors.length > 0) {
            const originalPitch = labClip.vectors[0].p;
            const currentPitch = clip.vectors[0].p;
            const semitones = currentPitch - originalPitch;
            player.detune.value = semitones * 100;
          }
        }

        const startSeconds = clip.startTime * (60 / bpm);
        const durationSeconds = clip.duration * (60 / bpm);

        const startId = Tone.Transport.schedule((time) => {
          player.start(time, 0, durationSeconds);
        }, startSeconds);
        this.scheduleIds.push(startId);

        const stopId = Tone.Transport.schedule((time) => {
          player.stop(time);
        }, startSeconds + durationSeconds);
        this.scheduleIds.push(stopId);
      }

      // Play synth notes if playback mode allows it, and the clip has vectors
      const playSynth =
        (this.playbackMode === 'both' || this.playbackMode === 'synth') &&
        clip.vectors.length > 0;

      if (playSynth) {
        const msPerBeat = 60000 / bpm;
        for (const v of clip.vectors) {
          const beatOffset = v.t / msPerBeat;
          const durationBeats = v.duration / msPerBeat;
          const absoluteBeat = clip.startTime + beatOffset;
          
          if (absoluteBeat < 0) continue; // Boundary guard

          const freq = Tone.Frequency(v.p, 'midi').toFrequency();
          const id = Tone.Transport.schedule((time) => {
            this.synth.triggerAttackRelease(
              freq,
              `${durationBeats}q`,
              time,
              v.velocity
            );
          }, `${absoluteBeat}q`);
          this.scheduleIds.push(id);
        }
      }
    }

    if (Tone.Transport.state === 'started') {
      this.playActiveClips(Tone.Transport.seconds);
    }
  }

  dispose() {
    this.scheduleIds.forEach((id) => Tone.Transport.clear(id));
    this.players.forEach((p) => p.dispose());
    this.synth.dispose();
    this.filter.dispose();
    this.delay.dispose();
    this.reverb.dispose();
  }
}
