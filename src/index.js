import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { createGlobalStyle, ThemeProvider } from 'styled-components';

// Global theme provder through styled components
const GlobalStyle = createGlobalStyle`
html, body{
  box-sizing: border-box;
  background-color:#fafafa;
  margin: 0;
  padding: 0;
  font-family: Arial, Helvetica, sans-serif;
  width: 100%;
}
`;
const theme = {
  colour: {
    red: 'hsl(357, 100%, 60%)',
    strava: '#fc4c02',
    ghostwhite: 'hsl(240, 100, 99)',
    yellow: 'hsl(47, 100%, 50%)',
    green: 'hsl(100, 66%, 46%)',
    blue: 'hsl(209, 100%, 58%)',
    purple: 'hsl(267, 100%, 66%)',
    grey: 'hsl(0, 0%, 20%)',
    black: 'hsl(0, 0%, 0%)',
    white: 'hsl(100, 100%, 100%)',
    error: 'hsl(0, 100%, 50%)',
  },
  loading: {},
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
