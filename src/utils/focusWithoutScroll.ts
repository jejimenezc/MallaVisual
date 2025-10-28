type FocusWithPreventScrollOptions = {
  preventScroll?: boolean;
};

export const focusWithoutScroll = (element: HTMLInputElement | null) => {
  if (!element) {
    return;
  }

  const { scrollX, scrollY } = window;
  let preventScrollSupported = false;

  try {
    const focusOptions = {
      get preventScroll() {
        preventScrollSupported = true;
        return true;
      },
    } as FocusWithPreventScrollOptions;

    element.focus(focusOptions);
  } catch {
    preventScrollSupported = false;
  }

  if (!preventScrollSupported) {
    element.focus();
    window.scrollTo(scrollX, scrollY);
  }

  const valueLength = element.value?.length ?? 0;
  if (typeof element.setSelectionRange === 'function') {
    element.setSelectionRange(0, valueLength);
  }
};