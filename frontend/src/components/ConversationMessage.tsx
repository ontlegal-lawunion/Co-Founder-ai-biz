
import React from 'react';
import { Message } from '../types';
import { UserIcon, SparklesIcon } from './Icons';

interface ConversationMessageProps {
  message: Message;
}

const ConversationMessage: React.FC<ConversationMessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';

  const containerClasses = isUser ? 'flex justify-end' : 'flex justify-start';
  const bubbleClasses = isUser
    ? 'bg-blue-600 rounded-lg rounded-br-none'
    : 'bg-slate-700 rounded-lg rounded-bl-none';
  const icon = isUser ? <UserIcon /> : <SparklesIcon />;
  const textColor = isUser ? 'text-white' : 'text-slate-200';

  return (
    <div className={`${containerClasses} items-start gap-3`}>
      {!isUser && <div className="flex-shrink-0 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-slate-900 mt-1">{icon}</div>}
      <div className={`${bubbleClasses} p-3 max-w-xs md:max-w-md`}>
        <p className={textColor}>{message.text}</p>
      </div>
       {isUser && <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white mt-1">{icon}</div>}
    </div>
  );
};

export default ConversationMessage;
