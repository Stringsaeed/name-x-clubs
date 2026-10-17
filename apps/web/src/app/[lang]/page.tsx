import { notFound } from 'next/navigation';
import { isLocale } from '../../i18n/config';
import { GameScreen } from '../../screens/GameScreen';

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) {
    notFound();
  }
  return <GameScreen lang={lang} />;
}
