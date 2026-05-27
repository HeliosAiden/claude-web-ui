import { useEffect, useState } from 'react';

export function useKeyboardViewport() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const isKeyboardOpen = keyboardHeight > 100;

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kb = Math.max(0, window.innerHeight - vv.height);
      setKeyboardHeight(kb);
      document.documentElement.style.setProperty('--keyboard-height', `${kb}px`);
    };
    vv.addEventListener('resize', update);
    return () => vv.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (isKeyboardOpen) {
      document.documentElement.setAttribute('data-keyboard-open', 'true');
    } else {
      document.documentElement.removeAttribute('data-keyboard-open');
    }
  }, [isKeyboardOpen]);

  return { keyboardHeight, isKeyboardOpen };
}
