import { useCallback, useMemo, useRef, useState } from "react";
import { AudioVisualizer } from "@components/AudioVisualizer";

type MediaElement = HTMLAudioElement | HTMLVideoElement;
type MediaElementRef = React.MutableRefObject<MediaElement>;

export const useVisualizer = (mediaElementRef: MediaElementRef) => {
  const [hasInitialized, setHasInitialized] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioSrcRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const ReactAudioViz = useMemo(
    () => (props) =>
      (
        <AudioVisualizer
          canvasRef={canvasRef}
          audioSrcRef={audioSrcRef}
          analyserRef={analyserRef}
          {...props}
        />
      ),
    [canvasRef, audioSrcRef, analyserRef]
  );

  const initializer = useCallback(() => {
    if (hasInitialized) {
      return;
    }

    if (audioContextRef.current == null) {
      if ("AudioContext" in window) {
        audioContextRef.current = new AudioContext();
      } else {
        console.warn("Can't show visualizations in this browser :(");
        return null;
      }
    }

    if (audioContextRef.current && mediaElementRef.current) {
      audioSrcRef.current = audioContextRef.current.createMediaElementSource(
        mediaElementRef.current
      );
      analyserRef.current = audioContextRef.current.createAnalyser();
      if (audioSrcRef.current && analyserRef.current) {
        audioSrcRef.current.connect(analyserRef.current);
        audioSrcRef.current.connect(audioContextRef.current.destination);
      }
      audioContextRef.current.resume();
      setHasInitialized(true);
    }
  }, [
    audioContextRef.current,
    analyserRef.current,
    audioSrcRef.current,
    mediaElementRef,
    hasInitialized,
  ]);

  return [ReactAudioViz, initializer];
};
