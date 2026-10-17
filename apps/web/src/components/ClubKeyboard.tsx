import { useLingui } from '@lingui/react/macro';
import { type PointerEvent, useRef } from 'react';

const TOP = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'] as const;
const HOME = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'] as const;
const BOTTOM = ['z', 'x', 'c', 'v', 'b', 'n', 'm'] as const;

type ClubKeyboardProps = {
  shift: boolean;
  onShift: () => void;
  onCharacter: (character: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
};

/**
 * iPhone letter keyboard: same key positions, without the suggestion bar,
 * emoji, numbers page, or the previous/next shortcut row.
 */
export function ClubKeyboard({
  shift,
  onShift,
  onCharacter,
  onDelete,
  onSubmit,
}: ClubKeyboardProps) {
  const { t } = useLingui();
  const letter = (key: string) => (shift ? key.toUpperCase() : key);

  return (
    <fieldset className="club-keyboard" dir="ltr" aria-label={t`Keyboard`}>
      <div className="club-keyboard-row">
        {TOP.map((key) => (
          <Key key={key} label={letter(key)} repeat onPress={() => onCharacter(letter(key))} />
        ))}
      </div>
      <div className="club-keyboard-row club-keyboard-row-home">
        {HOME.map((key) => (
          <Key key={key} label={letter(key)} repeat onPress={() => onCharacter(letter(key))} />
        ))}
      </div>
      <div className="club-keyboard-row club-keyboard-row-bottom">
        <Key
          label="⇧"
          className={`club-key-tool ${shift ? 'is-on' : ''}`}
          pressed={shift}
          name={t`Shift`}
          onPress={onShift}
        />
        {BOTTOM.map((key) => (
          <Key key={key} label={letter(key)} repeat onPress={() => onCharacter(letter(key))} />
        ))}
        <Key label="⌫" className="club-key-tool" name={t`Delete`} repeat onPress={onDelete} />
      </div>
      <div className="club-keyboard-row club-keyboard-row-space">
        <Key
          label=""
          className="club-key-space"
          name={t`Space`}
          repeat
          onPress={() => onCharacter(' ')}
        />
        <Key
          label="↵"
          className="club-key-tool club-key-return"
          name={t`Return`}
          onPress={onSubmit}
        />
      </div>
    </fieldset>
  );
}

function Key({
  label,
  name,
  className,
  pressed,
  repeat = false,
  onPress,
}: {
  label: string;
  name?: string;
  className?: string;
  pressed?: boolean;
  repeat?: boolean;
  onPress: () => void;
}) {
  const press = useRef(onPress);
  press.current = onPress;
  const timers = useRef<number[]>([]);

  const stop = () => {
    for (const id of timers.current) {
      window.clearTimeout(id);
      window.clearInterval(id);
    }
    timers.current = [];
  };

  const down = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    press.current();
    if (!repeat) {
      return;
    }
    const start = window.setTimeout(() => {
      const tick = window.setInterval(() => press.current(), 70);
      timers.current.push(tick);
    }, 350);
    timers.current.push(start);
  };

  return (
    <button
      type="button"
      className={`club-key ${className ?? ''}`}
      aria-label={name ?? label}
      aria-pressed={pressed}
      onPointerDown={down}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
    >
      {label}
    </button>
  );
}
