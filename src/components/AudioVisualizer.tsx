import { MutableRefObject, useCallback, useRef } from "react";

export const AudioVisualizer = (props: {
  model: (
    x: number,
    y: number,
    width: number,
    height: number,
    frequencyData: Uint8Array
  ) => { r: number; g: number; b: number };
  audioSrcRef?: MutableRefObject<MediaElementAudioSourceNode | null>;
  analyserRef?: React.RefObject<AnalyserNode>;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}) => {
  const { model, audioSrcRef, analyserRef, canvasRef } = props;

  // Сохраняем последнюю ссылку на анимацию
  const lastAnimationFrameRequest = useRef<number | null>(null);

  const createVizImageFromData = useCallback(
    (frequencyData: Uint8Array, canvas: HTMLCanvasElement) => {
      const { width, height } = canvas;
      const imageData = canvas
        .getContext("2d", { willReadFrequently: true })
        ?.getImageData(0, 0, width, height);
      if (!imageData) return null;

      const { data } = imageData;
      for (let y = 0, i = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1, i += 4) {
          const { r, g, b } = model(x, y, width, height, frequencyData);
          data[i] = r; // Red
          data[i + 1] = g; // Green
          data[i + 2] = b; // Blue
          data[i + 3] = 255; // Alpha
        }
      }

      return imageData;
    },
    [model]
  );

  // Рендеринг визуализатора с использованием анимации
  if (audioSrcRef?.current && analyserRef?.current && canvasRef?.current) {
    const { current: analyser } = analyserRef;
    const frequencyData = new Uint8Array(analyser.frequencyBinCount / 2);

    const renderFrame = () => {
      const { current: canvas } = canvasRef;
      if (!canvas) return;

      analyser.getByteFrequencyData(frequencyData);
      const canvasContext = canvas.getContext("2d");
      const vizImage = createVizImageFromData(frequencyData, canvas);
      if (canvasContext && vizImage) {
        canvasContext.putImageData(vizImage, 0, 0);
      }

      lastAnimationFrameRequest.current = requestAnimationFrame(renderFrame);
    };

    // Отменяем предыдущий запрос анимации перед созданием нового
    if (lastAnimationFrameRequest.current) {
      cancelAnimationFrame(lastAnimationFrameRequest.current);
      lastAnimationFrameRequest.current = null;
    }
    lastAnimationFrameRequest.current = requestAnimationFrame(renderFrame);
  }

  const refitCanvas = useCallback(() => {
    if (canvasRef?.current) {
      const { current: canvas } = canvasRef;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
  }, [canvasRef]);

  refitCanvas();
  if (canvasRef?.current) {
    const resizeObserver = new ResizeObserver(refitCanvas);
    resizeObserver.observe(canvasRef.current);
  }

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
};
