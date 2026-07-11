import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { AppStoreProvider } from './store';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppStoreProvider>
      <App />
    </AppStoreProvider>
  </StrictMode>,
);
