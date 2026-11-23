import type { ReactNode } from 'react';
import { StartPage } from './start-page';

// "/": Welcome for anyone signed out; otherwise Start or join a home, or Today.
export default function HomePage(): ReactNode {
  return <StartPage />;
}
