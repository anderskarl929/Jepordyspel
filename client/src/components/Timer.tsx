import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import './Timer.css';

export function Timer() {
  const timerSeconds = useAppStore((s) => s.game?.timerSeconds ?? 0);
  const timerRunning = useAppStore((s) => s.game?.timerRunning ?? false);
  const [displayTime, setDisplayTime] = useState(timerSeconds);

  useEffect(() => {
    setDisplayTime(timerSeconds);
  }, [timerSeconds]);

  useEffect(() => {
    if (!timerRunning || displayTime <= 0) return;
    const interval = setInterval(() => {
      setDisplayTime((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, displayTime]);

  const maxTime = 30;
  const pct = Math.min(100, (displayTime / maxTime) * 100);
  const urgent = displayTime <= 5 && displayTime > 0;

  return (
    <div className={`timer ${urgent ? 'timer--urgent' : ''}`} role="group" aria-label="Question timer">
      <div className="timer__bar" aria-hidden="true">
        <div className="timer__fill" style={{ width: `${pct}%` }} />
      </div>
      <span
        className="timer__text"
        role="timer"
        aria-live={urgent ? 'assertive' : 'polite'}
        aria-atomic="true"
      >
        {displayTime}s
      </span>
    </div>
  );
}
