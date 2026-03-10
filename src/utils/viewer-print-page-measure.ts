import type {
  ViewerEffectivePrintPageMeasurement,
  ViewerResolvedPageMetrics,
} from './viewer-print.ts';

const MEASUREMENT_TOLERANCE_PX = 3;

export interface ViewerPrintFrameDocument {
  iframe: HTMLIFrameElement;
  frameWindow: Window;
  frameDocument: Document;
  whenReady: Promise<void>;
  cleanup: () => void;
}

interface CreateViewerPrintFrameDocumentInput {
  title: string;
  printCssText: string;
  mode: 'measure' | 'print';
}

const createHiddenIframe = (mode: 'measure' | 'print'): HTMLIFrameElement => {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.style.pointerEvents = 'none';
  if (mode === 'measure') {
    iframe.style.width = '2400px';
    iframe.style.height = '2400px';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
  } else {
    iframe.style.width = '0';
    iframe.style.height = '0';
  }
  return iframe;
};

const createDocumentReadyPromise = (
  frameWindow: Window,
  frameDocument: Document,
  stylesheetPromises: Promise<void>[],
): Promise<void> =>
  Promise.all(stylesheetPromises)
    .catch(() => undefined)
    .then(() => frameDocument.fonts?.ready.catch(() => undefined))
    .then(
      () =>
        new Promise<void>((resolve) => {
          frameWindow.requestAnimationFrame(() => resolve());
        }),
    );

export const createViewerPrintFrameDocument = ({
  title,
  printCssText,
  mode,
}: CreateViewerPrintFrameDocumentInput): ViewerPrintFrameDocument | null => {
  if (typeof document === 'undefined' || !document.body) {
    return null;
  }

  const iframe = createHiddenIframe(mode);
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = iframe.contentDocument;
  if (!frameWindow || !frameDocument) {
    iframe.remove();
    return null;
  }

  frameDocument.open();
  frameDocument.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body></body></html>`,
  );
  frameDocument.close();

  const { head } = frameDocument;
  const stylesheetNodes = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  );
  const inlineStyleNodes = Array.from(document.querySelectorAll<HTMLStyleElement>('style'));

  const stylesheetPromises = stylesheetNodes.map((source) => {
    const target = frameDocument.createElement('link');
    target.rel = 'stylesheet';
    target.href = source.href;
    head.appendChild(target);
    return new Promise<void>((resolve) => {
      target.addEventListener('load', () => resolve(), { once: true });
      target.addEventListener('error', () => resolve(), { once: true });
      window.setTimeout(() => resolve(), 1200);
    });
  });

  inlineStyleNodes.forEach((source) => {
    const target = frameDocument.createElement('style');
    target.textContent = source.textContent;
    head.appendChild(target);
  });

  const pageStyle = frameDocument.createElement('style');
  pageStyle.textContent = `${printCssText}
html, body { margin: 0; padding: 0; background: #fff; }
body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }`;
  head.appendChild(pageStyle);

  return {
    iframe,
    frameWindow,
    frameDocument,
    whenReady: createDocumentReadyPromise(frameWindow, frameDocument, stylesheetPromises),
    cleanup: () => {
      iframe.remove();
    },
  };
};

const roundMeasurement = (value: number) => Math.round(value);

export const validateViewerEffectivePrintPageMeasurement = (
  measurement: ViewerEffectivePrintPageMeasurement | null,
  tolerancePx = MEASUREMENT_TOLERANCE_PX,
): measurement is ViewerEffectivePrintPageMeasurement => {
  if (!measurement) return false;
  const values = Object.values(measurement);
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
    return false;
  }
  if (measurement.paperWidthPx < measurement.contentWidthPx) return false;
  if (measurement.paperHeightPx < measurement.contentHeightPx) return false;
  if (
    measurement.marginTopPx < 0 ||
    measurement.marginRightPx < 0 ||
    measurement.marginBottomPx < 0 ||
    measurement.marginLeftPx < 0
  ) {
    return false;
  }

  const horizontalSum =
    measurement.marginLeftPx + measurement.contentWidthPx + measurement.marginRightPx;
  const verticalSum =
    measurement.marginTopPx + measurement.contentHeightPx + measurement.marginBottomPx;

  if (Math.abs(horizontalSum - measurement.paperWidthPx) > tolerancePx) {
    return false;
  }
  if (Math.abs(verticalSum - measurement.paperHeightPx) > tolerancePx) {
    return false;
  }

  return true;
};

export const measureEffectivePrintPage = async (input: {
  pageMetrics: ViewerResolvedPageMetrics;
  printCssText: string;
}): Promise<ViewerEffectivePrintPageMeasurement | null> => {
  const frame = createViewerPrintFrameDocument({
    title: 'MallaVisual Print Measurement',
    printCssText: input.printCssText,
    mode: 'measure',
  });
  if (!frame) return null;

  const { frameDocument, whenReady, cleanup } = frame;

  try {
    const shell = frameDocument.createElement('div');
    shell.setAttribute('data-print-page-shell', 'true');
    shell.style.boxSizing = 'border-box';
    shell.style.width = `${input.pageMetrics.paperWidthMm}mm`;
    shell.style.minHeight = `${input.pageMetrics.paperHeightMm}mm`;
    shell.style.margin = '0';
    shell.style.padding = '0';
    shell.style.background = '#fff';
    shell.style.position = 'relative';

    const content = frameDocument.createElement('div');
    content.setAttribute('data-print-page-content', 'true');
    content.style.boxSizing = 'border-box';
    content.style.width = `${input.pageMetrics.contentWidthMm}mm`;
    content.style.minHeight = `${input.pageMetrics.contentHeightMm}mm`;
    content.style.margin = `${input.pageMetrics.marginTopMm}mm ${input.pageMetrics.marginRightMm}mm ${input.pageMetrics.marginBottomMm}mm ${input.pageMetrics.marginLeftMm}mm`;
    content.style.padding = '0';
    content.style.background = 'transparent';

    shell.appendChild(content);
    frameDocument.body.appendChild(shell);

    await whenReady;

    const shellRect = shell.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const measurement: ViewerEffectivePrintPageMeasurement = {
      paperWidthPx: roundMeasurement(shellRect.width),
      paperHeightPx: roundMeasurement(shellRect.height),
      contentWidthPx: roundMeasurement(contentRect.width),
      contentHeightPx: roundMeasurement(contentRect.height),
      marginTopPx: roundMeasurement(contentRect.top - shellRect.top),
      marginRightPx: roundMeasurement(shellRect.right - contentRect.right),
      marginBottomPx: roundMeasurement(shellRect.bottom - contentRect.bottom),
      marginLeftPx: roundMeasurement(contentRect.left - shellRect.left),
    };

    return validateViewerEffectivePrintPageMeasurement(measurement) ? measurement : null;
  } finally {
    cleanup();
  }
};
