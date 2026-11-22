import type { ReactNode } from 'react';
import { StartPage } from './start-page';

// "/" only decides where to go: Welcome, Start or join a home, or Today.
export default function HomePage(): ReactNode {
  return <StartPage />;
}
