import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './main.css';
import App from './App.tsx';
import { StoreProvider } from './components/StoreProvider.tsx';

// biome-ignore lint/style/noNonNullAssertion:
createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<StoreProvider>
			<App />
		</StoreProvider>
	</StrictMode>,
);
