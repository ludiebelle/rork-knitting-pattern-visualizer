import { Stack } from 'expo-router';
import colors from '@/constants/colors';

export default function PatternsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'My Patterns',
        }}
      />
    </Stack>
  );
}
