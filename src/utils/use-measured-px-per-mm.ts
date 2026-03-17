import { useLayoutEffect, useState } from 'react';
import {
  createDefaultViewerMeasuredPxPerMm,
  normalizeViewerMeasuredPxPerMm,
  type ViewerMeasuredPxPerMm,
} from './viewer-print.ts';

const PROBE_SIZE_MM = 100;
const MEASUREMENT_EPSILON = 0.01;

const isClose = (left: number, right: number) => Math.abs(left - right) < MEASUREMENT_EPSILON;

const measureViewerPxPerMm = (): ViewerMeasuredPxPerMm => {
  if (typeof document === 'undefined' || !document.body) {
    return createDefaultViewerMeasuredPxPerMm();
  }

  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.position = 'absolute';
  probe.style.left = '-10000px';
  probe.style.top = '0';
  probe.style.width = `${PROBE_SIZE_MM}mm`;
  probe.style.height = `${PROBE_SIZE_MM}mm`;
  probe.style.pointerEvents = 'none';
  probe.style.visibility = 'hidden';
  probe.style.overflow = 'hidden';

  document.body.appendChild(probe);
  const rect = probe.getBoundingClientRect();
  probe.remove();

  return normalizeViewerMeasuredPxPerMm({
    pxPerMmX: rect.width / PROBE_SIZE_MM,
    pxPerMmY: rect.height / PROBE_SIZE_MM,
  });
};

export const useMeasuredPxPerMm = (): ViewerMeasuredPxPerMm => {
  const [measurement, setMeasurement] = useState<ViewerMeasuredPxPerMm>(() =>
    createDefaultViewerMeasuredPxPerMm(),
  );

  useLayoutEffect(() => {
    let frameId = 0;

    const updateMeasurement = () => {
      const next = measureViewerPxPerMm();
      setMeasurement((current) =>
        isClose(current.pxPerMmX, next.pxPerMmX) && isClose(current.pxPerMmY, next.pxPerMmY)
          ? current
          : next,
      );
    };

    updateMeasurement();
    const handleResize = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateMeasurement);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return measurement;
};
