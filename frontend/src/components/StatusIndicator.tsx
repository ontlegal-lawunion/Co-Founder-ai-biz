
import React from 'react';
import { SessionState } from '../types';

interface StatusIndicatorProps {
  state: SessionState;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ state }) => {
  let text = '';
  let color = 'text-slate-400';
  let pulse = false;

  switch (state) {
    case SessionState.CONNECTING:
      text = 'Connecting...';
      color = 'text-yellow-400';
      pulse = true;
      break;
    case SessionState.ACTIVE:
      text = 'Listening...';
      color = 'text-green-400';
      pulse = true;
      break;
    case SessionState.ERROR:
      text = 'An error occurred. Please try again.';
      color = 'text-red-400';
      break;
    case SessionState.IDLE:
    default:
      text = 'Ready to start';
      color = 'text-slate-400';
      break;
  }

  return (
    <div className="h-6 flex items-center justify-center">
        <p className={`text-sm ${color} ${pulse ? 'animate-pulse' : ''}`}>{text}</p>
    </div>
  );
};

export default StatusIndicator;
