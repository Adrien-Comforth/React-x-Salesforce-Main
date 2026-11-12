import type { RouteObject } from 'react-router';
import ContactCardPage from './pages/ContactCardPage';

// A single-view app embedded in a record page: every path shows the card, with
// no navigation chrome, whatever path the host serves the bundle under.
export const routes: RouteObject[] = [
  {
    path: '*',
    element: <ContactCardPage />,
  },
];
