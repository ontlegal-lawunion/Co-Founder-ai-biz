
import React from 'react';
import { SessionState } from '../types';
import { MicrophoneIcon, StopIcon } from './Icons';
import Spinner from './Spinner';

interface ControlsProps {
  sessionState: SessionState;
  onStart: () => void;
  onStop: () => void;
}

const Controls: React.FC<ControlsProps> = ({ sessionState, onStart, onStop }) => {
  const isIdle = sessionState === SessionState.IDLE || sessionState === SessionState.ERROR;
  const isActive = sessionState === SessionState.ACTIVE;
  const isConnecting = sessionState === SessionState.CONNECTING;

  const handleClick = () => {
    if (isIdle) {
      onStart();
    } else {
      onStop();
    }
  };

  const getButtonContent = () => {
    if (isConnecting) {
      return <Spinner />;
    }
    if (isActive) {
      return <StopIcon />;
    }
    return <MicrophoneIcon />;
  };

  const buttonClasses = `
    w-20 h-20 rounded-full flex items-center justify-center text-white
    shadow-lg transform transition-all duration-300 ease-in-out
    focus:outline-none focus:ring-4
    ${isConnecting ? 'bg-gray-500 cursor-not-allowed' : ''}
    ${isActive ? 'bg-red-500 hover:bg-red-600 focus:ring-red-400/50' : ''}
    ${isIdle ? 'bg-green-500 hover:bg-green-600 focus:ring-green-400/50' : ''}
  `;

  return (
    <div className="mt-4">
      <button
        onClick={handleClick}
        disabled={isConnecting}
        className={buttonClasses}
        aria-label={isIdle ? 'Start session' : 'Stop session'}
      >
        {getButtonContent()}
      </button>
    </div>
  );
};

export default Controls;
