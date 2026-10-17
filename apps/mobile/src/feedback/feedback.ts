import AsyncStorage from '@react-native-async-storage/async-storage';
import { play, type SoundName, setEnabled } from 'cuelume-native';
import {
  ImpactFeedbackStyle,
  impactAsync,
  NotificationFeedbackType,
  notificationAsync,
  selectionAsync,
} from 'expo-haptics';
import { useSyncExternalStore } from 'react';

export type CueName =
  /** Generic press: light impact, no sound. */
  | 'tap'
  /** Segmented or level change: selection haptic and a quiet tick. */
  | 'select'
  /** Switches: light impact and a toggle click. */
  | 'toggle'
  /** Round starts: medium impact and a pulse. */
  | 'start'
  /** Club accepted: success notification and a chime. */
  | 'accepted'
  /** Unknown, duplicate or wrong answer: warning notification and a soft error. */
  | 'rejected'
  /** Target reached: success notification and the success sound. */
  | 'complete'
  /** Ended early: light impact and a droplet. */
  | 'finish'
  /** Screen or sheet opens: soft impact and a page turn. */
  | 'page'
  /** Share: light impact, no sound. */
  | 'share';

export type FeedbackSettings = Readonly<{ sound: boolean; haptics: boolean }>;

type Haptic =
  | Readonly<{ kind: 'impact'; style: ImpactFeedbackStyle }>
  | Readonly<{ kind: 'notification'; type: NotificationFeedbackType }>
  | Readonly<{ kind: 'selection' }>;

type Cue = Readonly<{ haptic: Haptic; sound?: Readonly<{ name: SoundName; volume: number }> }>;

const light: Haptic = { kind: 'impact', style: ImpactFeedbackStyle.Light };
const success: Haptic = { kind: 'notification', type: NotificationFeedbackType.Success };

const cues: Readonly<Record<CueName, Cue>> = {
  tap: { haptic: light },
  select: { haptic: { kind: 'selection' }, sound: { name: 'tick', volume: 0.5 } },
  toggle: { haptic: light, sound: { name: 'toggle', volume: 1 } },
  start: {
    haptic: { kind: 'impact', style: ImpactFeedbackStyle.Medium },
    sound: { name: 'pulse', volume: 1 },
  },
  accepted: { haptic: success, sound: { name: 'chime', volume: 1 } },
  rejected: {
    haptic: { kind: 'notification', type: NotificationFeedbackType.Warning },
    sound: { name: 'error', volume: 0.45 },
  },
  complete: { haptic: success, sound: { name: 'success', volume: 1 } },
  finish: { haptic: light, sound: { name: 'droplet', volume: 1 } },
  page: {
    haptic: { kind: 'impact', style: ImpactFeedbackStyle.Soft },
    sound: { name: 'page', volume: 0.5 },
  },
  share: { haptic: light },
};

export const soundKey = 'nxc-sound';
export const hapticsKey = 'nxc-haptics';

let settings: FeedbackSettings = { sound: true, haptics: true };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function persist(key: string, on: boolean) {
  AsyncStorage.setItem(key, on ? 'on' : 'off').catch(() => {});
}

function applySound(on: boolean) {
  try {
    setEnabled(on);
  } catch {
    // The native audio module can be missing (tests, web); sound simply stays off.
  }
}

export const feedbackSettings = {
  get(): FeedbackSettings {
    return settings;
  },
  set(patch: Partial<FeedbackSettings>) {
    const next: FeedbackSettings = {
      sound: patch.sound ?? settings.sound,
      haptics: patch.haptics ?? settings.haptics,
    };

    if (next.sound === settings.sound && next.haptics === settings.haptics) {
      return;
    }

    if (next.sound !== settings.sound) {
      applySound(next.sound);
      persist(soundKey, next.sound);
    }

    if (next.haptics !== settings.haptics) {
      persist(hapticsKey, next.haptics);
    }

    settings = next;
    emit();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
};

/** Loads saved settings from the entries read at startup. Call once before the first render. */
export function hydrateFeedbackSettings(entries: Record<string, string>) {
  settings = {
    sound: entries[soundKey] !== 'off',
    haptics: entries[hapticsKey] !== 'off',
  };
  applySound(settings.sound);
  emit();
}

function fireHaptic(haptic: Haptic): Promise<void> {
  if (haptic.kind === 'impact') {
    return impactAsync(haptic.style);
  }

  if (haptic.kind === 'notification') {
    return notificationAsync(haptic.type);
  }

  return selectionAsync();
}

/** Plays a cue's haptic and sound, respecting the settings. Never throws. */
export function cue(name: CueName): void {
  const { haptic, sound } = cues[name];

  if (settings.haptics) {
    try {
      fireHaptic(haptic).catch(() => {});
    } catch {
      // Haptics are best-effort.
    }
  }

  if (settings.sound && sound) {
    try {
      play(sound.name, { volume: sound.volume });
    } catch {
      // Sound is best-effort.
    }
  }
}

export function useFeedbackSettings(): [
  FeedbackSettings,
  (patch: Partial<FeedbackSettings>) => void,
] {
  const value = useSyncExternalStore(
    feedbackSettings.subscribe,
    feedbackSettings.get,
    feedbackSettings.get,
  );

  return [value, feedbackSettings.set];
}
