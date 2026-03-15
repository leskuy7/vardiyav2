import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ProtectedShell } from '../../components/protected-shell';
import { fetchServerAuthUser, verifySessionToken } from '../../lib/server-auth';

export default async function ProtectedLayout({ children }: PropsWithChildren) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (!accessToken && !refreshToken) {
    redirect('/login');
  }

  let initialUser = null;
  if (accessToken) {
    const session = await verifySessionToken(accessToken);
    if (session) {
      initialUser = await fetchServerAuthUser(accessToken);
    }
  }

  if (!initialUser && !refreshToken) {
    redirect('/login');
  }

  const queryClient = new QueryClient();
  if (initialUser) {
    queryClient.setQueryData(['auth', 'me'], initialUser);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProtectedShell initialUser={initialUser}>{children}</ProtectedShell>
    </HydrationBoundary>
  );
}
