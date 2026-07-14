import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { AppStoreProvider } from './store';
import { installDisableNumberInputWheel } from './utils/disableNumberInputWheel';
import { applyTheme, getStoredTheme } from './utils/theme';
import { installCrashLogCapture } from './utils/crashLog';
import App from './App.tsx';
import './index.css';

applyTheme(getStoredTheme());
installDisableNumberInputWheel();
installCrashLogCapture();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppStoreProvider>
      <App />
    </AppStoreProvider>
  </StrictMode>,
);
