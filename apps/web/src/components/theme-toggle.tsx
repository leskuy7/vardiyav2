"use client";

import { ActionIcon, useMantineColorScheme } from '@mantine/core';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = colorScheme === 'dark';
  const icon = mounted ? (isDark ? '☀️' : '🌙') : '🌓';

  return (
    <ActionIcon
      variant="light"
      size="lg"
      radius="xl"
      aria-label="Tema değiştir"
      onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
    >
      <span suppressHydrationWarning>{icon}</span>
    </ActionIcon>
  );
}