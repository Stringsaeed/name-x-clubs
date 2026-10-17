import {
  type ChangeEvent,
  type Dispatch,
  type ClipboardEvent as ReactClipboardEvent,
  type RefObject,
  type SetStateAction,
  type SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import {
  applyAnswerKey,
  type Caret,
  deleteText,
  insertText,
  pasteIntoValue,
  selectionOf,
} from '../components/answerEdit';
import type { Session } from '../game/model';
import { useGameKeyboard } from './useGameKeyboard';

type DraftActions = {
  insert: (text: string) => void;
  remove: () => void;
  submit: () => void;
  paste: (text: string) => void;
};

/**
 * The club field, including the phone keyboard that types into it without
 * opening Safari's keyboard.
 */
export function useAnswerDraft(
  session: Session,
  maxLength: number,
  onSubmit: (text: string) => boolean,
  onStart: () => void,
) {
  const [value, setValue] = useState('');
  const [shift, setShift] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const caret = useRef<Caret>({ start: 0, end: 0 });
  const valueRef = useRef(value);
  valueRef.current = value;
  const playing = session.round.phase === 'playing';
  const gameKeyboard = useGameKeyboard(playing);
  const actions = useRef<DraftActions | null>(null);

  useEffect(() => {
    if (!playing) {
      valueRef.current = '';
      setValue('');
      caret.current = { start: 0, end: 0 };
      return;
    }
    if (!gameKeyboard.active) {
      input.current?.focus();
    }
  }, [playing, gameKeyboard.active]);

  actions.current = draftActions({
    valueRef,
    caret,
    input,
    setValue,
    onSubmit,
    maxLength,
    playing,
  });

  useEffect(() => {
    if (!gameKeyboard.active) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (actions.current) {
        applyAnswerKey(event, actions.current, input.current);
      }
    };
    const onPaste = (event: ClipboardEvent) => {
      const pasted = event.clipboardData?.getData('text');
      if (!pasted || !actions.current) {
        return;
      }
      event.preventDefault();
      actions.current.paste(pasted);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('paste', onPaste);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('paste', onPaste);
    };
  }, [gameKeyboard.active]);

  return draftBindings({
    value,
    shift,
    setShift,
    setValue,
    input,
    caret,
    valueRef,
    actions,
    gameKeyboard,
    onStart,
    maxLength,
  });
}

function draftBindings({
  value,
  shift,
  setShift,
  setValue,
  input,
  caret,
  valueRef,
  actions,
  gameKeyboard,
  onStart,
  maxLength,
}: {
  value: string;
  shift: boolean;
  setShift: Dispatch<SetStateAction<boolean>>;
  setValue: (value: string) => void;
  input: RefObject<HTMLInputElement | null>;
  caret: RefObject<Caret>;
  valueRef: RefObject<string>;
  actions: RefObject<DraftActions | null>;
  gameKeyboard: ReturnType<typeof useGameKeyboard>;
  onStart: () => void;
  maxLength: number;
}) {
  const remember = (field: HTMLInputElement) => {
    valueRef.current = field.value;
    caret.current = {
      start: field.selectionStart ?? field.value.length,
      end: field.selectionEnd ?? field.value.length,
    };
  };

  return {
    value,
    shift,
    input,
    gameKeyboard,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      remember(event.currentTarget);
      setValue(event.currentTarget.value);
    },
    onSelect: (event: SyntheticEvent<HTMLInputElement>) => remember(event.currentTarget),
    onPaste: (event: ReactClipboardEvent<HTMLInputElement>) => {
      const field = event.currentTarget;
      const start = field.selectionStart ?? valueRef.current.length;
      const end = field.selectionEnd ?? start;
      const result = pasteIntoValue(
        valueRef.current,
        start,
        end,
        event.clipboardData.getData('text'),
        maxLength,
      );
      if (!result) {
        return;
      }
      event.preventDefault();
      valueRef.current = result.value;
      caret.current = { start: result.caret, end: result.caret };
      setValue(result.value);
      requestAnimationFrame(() => field.setSelectionRange(result.caret, result.caret));
    },
    start: () => {
      flushSync(onStart);
      // `active` is still false in this click: the round was not playing yet.
      if (!gameKeyboard.preferred) {
        input.current?.focus();
      }
    },
    useSystemKeyboard: () => {
      flushSync(gameKeyboard.disable);
      input.current?.focus();
    },
    useInPageKeyboard: () => {
      flushSync(gameKeyboard.enable);
      input.current?.blur();
    },
    toggleShift: () => setShift((on) => !on),
    typeCharacter: (character: string) => {
      actions.current?.insert(character);
      if (character !== ' ') {
        setShift(false);
      }
    },
    remove: () => actions.current?.remove(),
    submit: () => actions.current?.submit(),
  };
}

function draftActions({
  valueRef,
  caret,
  input,
  setValue,
  onSubmit,
  maxLength,
  playing,
}: {
  valueRef: RefObject<string>;
  caret: RefObject<Caret>;
  input: RefObject<HTMLInputElement | null>;
  setValue: (value: string) => void;
  onSubmit: (text: string) => boolean;
  maxLength: number;
  playing: boolean;
}): DraftActions {
  const apply = (next: { value: string; caret: number }) => {
    valueRef.current = next.value;
    caret.current = { start: next.caret, end: next.caret };
    setValue(next.value);
    requestAnimationFrame(() => input.current?.setSelectionRange(next.caret, next.caret));
  };

  return {
    insert(text) {
      const range = selectionOf(input.current, caret.current);
      apply(insertText(valueRef.current, range.start, range.end, text, maxLength));
    },
    remove() {
      const range = selectionOf(input.current, caret.current);
      apply(deleteText(valueRef.current, range.start, range.end));
    },
    submit() {
      const text = valueRef.current.trim();
      if (!text || !playing) {
        return;
      }
      if (onSubmit(text)) {
        valueRef.current = '';
        setValue('');
        caret.current = { start: 0, end: 0 };
        return;
      }
      input.current?.focus();
      input.current?.select();
      caret.current = { start: 0, end: valueRef.current.length };
    },
    paste(pasted) {
      const range = selectionOf(input.current, caret.current);
      const multiline = pasteIntoValue(valueRef.current, range.start, range.end, pasted, maxLength);
      apply(multiline ?? insertText(valueRef.current, range.start, range.end, pasted, maxLength));
    },
  };
}
