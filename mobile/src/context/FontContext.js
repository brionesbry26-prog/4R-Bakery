import { createContext, useContext } from 'react';

// true when Montserrat loaded; false means use the system font fallback.
export const FontContext = createContext(false);
export const useFontsReady = () => useContext(FontContext);
