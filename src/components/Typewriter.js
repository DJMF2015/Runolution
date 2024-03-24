import * as React from 'react';
import { useState, useEffect } from 'react';

const Typewriter = ({ text, delay, infinite }) => {
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let timeout;
    if (currentIndex < text.length) {
      timeout = setTimeout(() => {
        setCurrentText((currentTxt) => currentTxt + text[currentIndex]);
        setCurrentIndex((currentIdx) => currentIdx + 1);
      }, delay);
    } else if (infinite) {
      setCurrentText('');
      setCurrentIndex(0);
    }
    return () => clearTimeout(timeout);
  }, [currentIndex, text, infinite, delay]);
  return <span>{currentText}</span>;
};

export default Typewriter;
