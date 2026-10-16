const LINE_BREAKS_AND_TABS = /\s*[\r\n\t]+\s*/g;
const HAS_LINE_BREAK = /[\r\n]/;

/**
 * Turns a multi-line paste into a comma list inserted over the selection,
 * or returns null when the paste has no line breaks and should be left to the browser.
 */
export function pasteIntoValue(
  value: string,
  start: number,
  end: number,
  pasted: string,
  maxLength = 12000,
) {
  if (!HAS_LINE_BREAK.test(pasted)) {
    return null;
  }

  const room = Math.max(maxLength - (value.length - (end - start)), 0);
  const inserted = pasted.trim().replace(LINE_BREAKS_AND_TABS, ', ').slice(0, room);

  return {
    value: value.slice(0, start) + inserted + value.slice(end),
    caret: start + inserted.length,
  };
}

export type Caret = { start: number; end: number };

export function selectionOf(field: HTMLInputElement | null, caret: Caret): Caret {
  if (field && document.activeElement === field) {
    return {
      start: field.selectionStart ?? caret.start,
      end: field.selectionEnd ?? caret.end,
    };
  }

  return caret;
}

/** A hardware key while the in-page keyboard is up. Dialogs keep their own keys. */
export function applyAnswerKey(
  event: KeyboardEvent,
  actions: { insert: (text: string) => void; remove: () => void; submit: () => void },
  field: HTMLInputElement | null,
) {
  if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) {
    return;
  }
  const target = event.target;
  if (
    target instanceof HTMLElement &&
    target.closest('dialog, [role="dialog"]') !== null &&
    target !== field
  ) {
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    actions.submit();
    return;
  }
  if (event.key === 'Backspace') {
    event.preventDefault();
    actions.remove();
    return;
  }
  if (event.key.length === 1) {
    event.preventDefault();
    actions.insert(event.key);
  }
}

/** Inserts `text` over the selection, stopping at `maxLength`. */
export function insertText(
  value: string,
  start: number,
  end: number,
  text: string,
  maxLength: number,
) {
  const room = Math.max(maxLength - (value.length - (end - start)), 0);
  const inserted = text.slice(0, room);

  return {
    value: value.slice(0, start) + inserted + value.slice(end),
    caret: start + inserted.length,
  };
}

/** Deletes the selection, or the character before the caret when nothing is selected. */
export function deleteText(value: string, start: number, end: number) {
  if (start !== end) {
    return { value: value.slice(0, start) + value.slice(end), caret: start };
  }
  if (start <= 0) {
    return { value, caret: 0 };
  }

  return { value: value.slice(0, start - 1) + value.slice(end), caret: start - 1 };
}
