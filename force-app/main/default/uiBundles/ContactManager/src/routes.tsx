import type { RouteObject } from 'react-router';
import AppLayout from '@/appLayout';
import ContactsPage from './pages/ContactsPage';
import NotFound from './pages/NotFound';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <ContactsPage />,
        handle: { showInNavigation: true, label: 'Contacts' },
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
];
