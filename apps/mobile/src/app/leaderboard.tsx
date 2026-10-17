import { useLocalSearchParams } from 'expo-router';
import { boardModes, defaultMode } from '../../../web/src/components/leaderboard/query';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';

export default function LeaderboardRoute() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const initialMode = boardModes.find((option) => option === mode) ?? defaultMode;

  return <LeaderboardScreen initialMode={initialMode} />;
}
