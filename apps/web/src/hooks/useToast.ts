import { useCallback, useEffect, useState } from 'react';

const TOAST_DURATION_MS = 4000;

type ToastState = { id: number; message: string };

const hiddenToast: ToastState = { id: 0, message: '' };

/** Showing the same message twice restarts the hide timer because every show gets a new id. */
export function useToast() {
  const [toast, setToast] = useState<ToastState>(hiddenToast);

  const showToast = useCallback((message: string) => {
    setToast((current) => ({ id: current.id + 1, message }));
  }, []);

  useEffect(() => {
    if (!toast.message) {
      return;
    }

    const hideTimer = window.setTimeout(() => {
      setToast((current) => (current.id === toast.id ? { ...current, message: '' } : current));
    }, TOAST_DURATION_MS);

    return () => window.clearTimeout(hideTimer);
  }, [toast]);

  return { message: toast.message, showToast };
}
