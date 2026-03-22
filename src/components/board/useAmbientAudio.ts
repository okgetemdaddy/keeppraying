import { useEffect, useRef, useCallback } from "react";
import { Howl } from "howler";
import { AMBIENT_SOUNDS } from "./boardThemes";

let activeHowl: Howl | null = null;
let activeId: string | null = null;

export function useAmbientAudio(
  soundId: string | null,
  volume: number,
  playing: boolean
) {
  const volumeRef = useRef(volume);

  // Keep volume ref in sync
  useEffect(() => {
    volumeRef.current = volume;
    if (activeHowl) activeHowl.volume(volume);
  }, [volume]);

  const loadAndPlay = useCallback((id: string, vol: number) => {
    const sound = AMBIENT_SOUNDS.find(s => s.id === id);
    if (!sound) return;

    // Stop old howl
    if (activeHowl) {
      activeHowl.fade(activeHowl.volume(), 0, 600);
      setTimeout(() => { activeHowl?.unload(); }, 700);
      activeHowl = null;
      activeId = null;
    }

    const h = new Howl({
      src: [sound.src],
      loop: true,
      volume: 0,
      html5: true,
      onload: () => {
        h.play();
        h.fade(0, vol, 800);
      },
    });
    activeHowl = h;
    activeId = id;
  }, []);

  useEffect(() => {
    if (!soundId || !playing) {
      if (activeHowl) {
        activeHowl.fade(activeHowl.volume(), 0, 600);
        setTimeout(() => { activeHowl?.stop(); }, 700);
      }
      return;
    }

    if (activeId !== soundId) {
      loadAndPlay(soundId, volumeRef.current);
    } else if (activeHowl) {
      if (!activeHowl.playing()) {
        activeHowl.play();
        activeHowl.fade(0, volumeRef.current, 400);
      }
    }
  }, [soundId, playing, loadAndPlay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeHowl) {
        activeHowl.fade(activeHowl.volume(), 0, 400);
        setTimeout(() => { activeHowl?.unload(); activeHowl = null; activeId = null; }, 500);
      }
    };
  }, []);
}
