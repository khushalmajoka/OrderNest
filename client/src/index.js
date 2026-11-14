import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// Poppins in the weights the app uses (regular, medium, semi-bold, bold), so
// bold text is the real bold font and not one faked by the browser
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import { setupAuthInterceptor } from './common/utils/api';

setupAuthInterceptor();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
