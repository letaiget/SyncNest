import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { DevicesPage } from './pages/DevicesPage';
import { FoldersPage } from './pages/FoldersPage';
import { NetworkPage } from './pages/NetworkPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      {
        index: true,
        Component: DevicesPage,
      },
      {
        path: 'folders',
        Component: FoldersPage,
      },
      {
        path: 'network',
        Component: NetworkPage,
      },
    ],
  },
]);