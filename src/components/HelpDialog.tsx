'use client';

import { useLingui } from '@lingui/react/macro';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from './Icon';

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLingui();

  const tips = [
    t`Use English or Arabic, with or without accents. Small spelling mistakes are fine when the club is clear.`,
    t`Send one name at a time, or a list separated by commas, newlines, or “and”.`,
    t`If a name could mean more than one club, add the city or country. Different names for the same club only count once.`,
    t`Your progress and elapsed time are saved in this browser.`,
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <DialogContent size="lg" className="help-dialog-panel typeset">
        <span className="dialog-ball" aria-hidden>
          <Icon name="ball" />
        </span>
        <DialogHeader>
          <DialogTitle id="help-title">{t`How many clubs have you got?`}</DialogTitle>
          <DialogDescription>
            {t`Name 10, 50 or 100 clubs at your own pace. The clock measures how long you take. Practice adds countries, regions and letters.`}
          </DialogDescription>
        </DialogHeader>
        <div className="help-example">
          <strong>{t`One club, many ways to say it`}</strong>
          <span dir="auto">Manchester United · Man Utd · مانشستر يونايتد</span>
        </div>
        <ul>
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
        <p className="help-footnote">
          {t`This first edition includes a curated club collection, not every club in the world. If we miss one, try its full name.`}
        </p>
        <DialogFooter className="mt-0 sm:justify-stretch">
          <Button type="button" className="w-full" onClick={onClose}>
            {t`Got it. Let’s play.`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
