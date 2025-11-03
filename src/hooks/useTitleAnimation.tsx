import { useEffect, useRef } from "react";

export const useTitleAnimation = (
  analyserRef: React.RefObject<AnalyserNode | null>,
  titleRef: React.RefObject<HTMLHeadingElement | null>,
  isPlaying: boolean
) => {
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTime = useRef<number>(0);
  const prevBassFastRef = useRef<number>(0);
  const beatImpulseRef = useRef<number>(0);
  const tRef = useRef<number>(0);

  useEffect(() => {
    if (!titleRef.current || !isPlaying) {
      // Сбрасываем стили когда не играет
      if (titleRef.current) {
        titleRef.current.style.setProperty("--audio-scale", "1");
        titleRef.current.style.backgroundImage = "";
        titleRef.current.style.textShadow = "";
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const animate = () => {
      const now = performance.now();
      // Ограничиваем частоту обновления до 30 FPS для производительности
      if (now - lastUpdateTime.current < 33) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      lastUpdateTime.current = now;
      // Ведём собственный таймер для фазовых сдвигов
      tRef.current += 0.033; // ~30 FPS инкремент секунд

      if (!analyserRef.current || !titleRef.current) {
        // Продолжаем пытаться если analyserRef еще не готов
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      // Проверяем, что analyser готов
      try {
        if (analyserRef.current.frequencyBinCount === 0) {
          animationFrameRef.current = requestAnimationFrame(animate);
          return;
        }
      } catch {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      // Получаем частотные данные
      const bufferLength = analyserRef.current.frequencyBinCount;
      const frequencyData = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(frequencyData);

      // Вычисляем энергию низких частот (басы) для пульсации
      const bassRange = Math.max(1, Math.floor(bufferLength * 0.1)); // Первые 10% частот - это басы
      let bassEnergy = 0;
      for (let i = 0; i < bassRange && i < frequencyData.length; i++) {
        bassEnergy += frequencyData[i];
      }
      bassEnergy = bassEnergy / bassRange / 255; // Нормализуем от 0 до 1
      bassEnergy = Math.min(1, Math.max(0, bassEnergy)); // Ограничиваем от 0 до 1

      // Быстрое сглаживание для детекции ударов (onset)
      const fastSmoothing = 0.45; // быстрый трекер уровня
      const prevBassFast = prevBassFastRef.current;
      const bassFast =
        prevBassFast * (1 - fastSmoothing) + bassEnergy * fastSmoothing;
      prevBassFastRef.current = bassFast;

      // Импульс удара: положительная разница сырых басов и быстрого трекера
      const onset = Math.max(0, bassEnergy - prevBassFast);
      // Накапливаем импульс и применяем экспоненциальное затухание
      const impulseAttack = 0.9; // как быстро подхватываем удар
      const impulseDecay = 0.82; // как быстро гасим импульс
      beatImpulseRef.current = Math.max(
        beatImpulseRef.current * impulseDecay,
        onset * impulseAttack
      );
      const beatImpulse = Math.min(1, beatImpulseRef.current * 1.5);

      // Вычисляем общую энергию для цвета и свечения
      let totalEnergy = 0;
      for (let i = 0; i < bufferLength && i < frequencyData.length; i++) {
        totalEnergy += frequencyData[i];
      }
      totalEnergy = totalEnergy / bufferLength / 255; // Нормализуем от 0 до 1
      totalEnergy = Math.min(1, Math.max(0, totalEnergy)); // Ограничиваем от 0 до 1

      // Вычисляем средние частоты для изменения цвета (расширенные диапазоны для большей динамики)
      const midRangeStart = Math.floor(bufferLength * 0.15);
      const midRangeEnd = Math.floor(bufferLength * 0.6);
      let midEnergy = 0;
      for (
        let i = midRangeStart;
        i < midRangeEnd && i < frequencyData.length;
        i++
      ) {
        midEnergy += frequencyData[i];
      }
      midEnergy = midEnergy / (midRangeEnd - midRangeStart) / 255;
      midEnergy = Math.min(1, Math.max(0, midEnergy));

      // Вычисляем высокие частоты (расширенный диапазон)
      const highRangeStart = Math.floor(bufferLength * 0.5);
      let highEnergy = 0;
      for (
        let i = highRangeStart;
        i < bufferLength && i < frequencyData.length;
        i++
      ) {
        highEnergy += frequencyData[i];
      }
      highEnergy = highEnergy / (bufferLength - highRangeStart) / 255;
      highEnergy = Math.min(1, Math.max(0, highEnergy));

      // Вычисляем пиковые частоты для максимальной динамики
      let peakEnergy = 0;
      for (let i = 0; i < bufferLength && i < frequencyData.length; i++) {
        if (frequencyData[i] > peakEnergy) {
          peakEnergy = frequencyData[i];
        }
      }
      peakEnergy = peakEnergy / 255;

      // Применяем плавное сглаживание (EMA) для пульсации и свечения
      const smoothingFactor = 0.15;
      const currentBass = titleRef.current.dataset.bassEnergy
        ? parseFloat(titleRef.current.dataset.bassEnergy)
        : 0;
      const currentTotal = titleRef.current.dataset.totalEnergy
        ? parseFloat(titleRef.current.dataset.totalEnergy)
        : 0;

      const smoothedBass =
        currentBass * (1 - smoothingFactor) + bassEnergy * smoothingFactor;
      const smoothedTotal =
        currentTotal * (1 - smoothingFactor) + totalEnergy * smoothingFactor;

      // Добавляем минимальные значения после сглаживания для постоянной анимации
      const finalBass = Math.max(0.12, smoothedBass); // немного ниже, чтобы не раздувать на плотном бите
      const finalTotal = Math.max(0.25, smoothedTotal); // Минимум 0.25 для базового свечения

      // Для цветов градиента используем менее сглаженные значения для более резких изменений
      // Сохраняем предыдущие значения энергии для цветов
      const currentMid = titleRef.current.dataset.midEnergy
        ? parseFloat(titleRef.current.dataset.midEnergy)
        : midEnergy;
      const currentHigh = titleRef.current.dataset.highEnergy
        ? parseFloat(titleRef.current.dataset.highEnergy)
        : highEnergy;

      // Легкое сглаживание для цветов (меньше чем для пульсации)
      const smoothingFactorColor = 0.3; // Более быстрое реагирование на изменения
      const smoothedMid =
        currentMid * (1 - smoothingFactorColor) +
        midEnergy * smoothingFactorColor;
      const smoothedHigh =
        currentHigh * (1 - smoothingFactorColor) +
        highEnergy * smoothingFactorColor;

      // Сохраняем для следующего кадра
      titleRef.current.dataset.midEnergy = smoothedMid.toString();
      titleRef.current.dataset.highEnergy = smoothedHigh.toString();

      // Сохраняем значения для следующего кадра
      titleRef.current.dataset.bassEnergy = smoothedBass.toString();
      titleRef.current.dataset.totalEnergy = smoothedTotal.toString();

      // Применяем анимации к заголовку
      // 1. Пульсация и удар: оставляем мягкую пульсацию и небольшой буст на ударе, без дрожания
      const compressedBass = finalBass / (1 + 1.6 * finalBass); // мягкая компрессия
      const baseScale = 1 + Math.pow(compressedBass, 0.85) * 0.25; // базовая пульсация
      const hitBoost = beatImpulse * 0.3; // чуть больше скейла на бит
      const scale = Math.min(1.45, baseScale + hitBoost);

      // 2. Динамический цвет градиента на основе частот
      // Используем сырые и сглаженные значения для максимальной динамики
      // Комбинируем разные частотные диапазоны для более интересных цветов

      // Первый цвет градиента: более насыщенный, зависит от басов и средних частот
      // Увеличиваем влияние частот на цвета - делаем изменения более резкими
      const bassColorIntensity = bassEnergy * 0.7 + smoothedBass * 0.3; // Комбинация сырых и сглаженных
      const midColorIntensity = midEnergy * 0.8 + smoothedMid * 0.2;
      const highColorIntensity = highEnergy * 0.8 + smoothedHigh * 0.2;

      // Применяем пиковую энергию для дополнительной яркости
      const peakMultiplier = 1 + peakEnergy * 0.5;

      // Первый цвет: от темно-фиолетового через розовый к ярко-красному
      const r1 = Math.floor(
        Math.min(
          255,
          (100 + bassColorIntensity * 120 + midColorIntensity * 35) *
            peakMultiplier
        )
      );
      const g1 = Math.floor(
        Math.min(
          255,
          (0 + midColorIntensity * 180 + highColorIntensity * 40) *
            peakMultiplier
        )
      );
      const b1 = Math.floor(
        Math.min(
          255,
          (80 + highColorIntensity * 140 + bassColorIntensity * 35) *
            peakMultiplier
        )
      );

      // Второй цвет: от темно-оранжевого через желтый к голубому
      // Делаем его более контрастным относительно первого
      const r2 = Math.floor(
        Math.min(
          255,
          (150 + smoothedTotal * 80 + midColorIntensity * 25) * peakMultiplier
        )
      );
      const g2 = Math.floor(
        Math.min(
          255,
          (50 + smoothedTotal * 150 + highColorIntensity * 55) * peakMultiplier
        )
      );
      const b2 = Math.floor(
        Math.min(
          255,
          (0 + highColorIntensity * 200 + midColorIntensity * 55) *
            peakMultiplier
        )
      );

      // 3. Эффект свечения в зависимости от общей энергии
      // Увеличиваем интенсивность свечения для большей заметности
      const glowIntensity = finalTotal * 100; // от 0 до 100px
      const glowIntensity2 = finalTotal * 60; // от 0 до 60px
      const glowIntensity3 = finalTotal * 30; // от 0 до 30px для внешнего свечения

      const glowColor = `rgba(${r1}, ${g1}, ${b1}, ${Math.min(
        1,
        finalTotal * 1
      )})`;
      const glowColor2 = `rgba(${r2}, ${g2}, ${b2}, ${Math.min(
        0.8,
        finalTotal * 0.8
      )})`;
      const glowColor3 = `rgba(${r1}, ${g1}, ${b1}, ${Math.min(
        0.4,
        finalTotal * 0.4
      )})`;

      // Вычисляем покачивание под бит: только вращение, без тряски и прыжков
      const swaySpeed = 1.2 + midEnergy * 1.5; // скорость покачивания
      const swayAmplitude = 0.2 + beatImpulse * 0.6; // градусы: 0.2..0.8
      const tiltDeg = Math.sin(tRef.current * swaySpeed) * swayAmplitude;

      // Устанавливаем CSS переменные и стили напрямую
      if (titleRef.current) {
        // Обновляем scale
        titleRef.current.style.setProperty("--audio-scale", scale.toString());
        titleRef.current.style.setProperty("--audio-translate-x", `0px`);
        titleRef.current.style.setProperty("--audio-translate-y", `0px`);
        titleRef.current.style.setProperty(
          "--audio-rotate",
          `${tiltDeg.toFixed(2)}deg`
        );

        // Обновляем градиент напрямую в background-image для гарантированного обновления
        const gradientValue = `linear-gradient(90deg, rgb(${r1}, ${g1}, ${b1}), rgb(${r2}, ${g2}, ${b2}))`;
        titleRef.current.style.backgroundImage = gradientValue;

        // Также обновляем CSS переменные для совместимости
        titleRef.current.style.setProperty(
          "--audio-gradient-start",
          `rgb(${r1}, ${g1}, ${b1})`
        );
        titleRef.current.style.setProperty(
          "--audio-gradient-end",
          `rgb(${r2}, ${g2}, ${b2})`
        );

        // Применяем многослойное свечение для более заметного эффекта
        const glowValue = `0 0 ${glowIntensity}px ${glowColor}, 0 0 ${glowIntensity2}px ${glowColor2}, 0 0 ${glowIntensity3}px ${glowColor3}`;
        titleRef.current.style.textShadow = glowValue;
        titleRef.current.style.setProperty("--audio-glow", glowValue);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyserRef, titleRef, isPlaying]);
};
