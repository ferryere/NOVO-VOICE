import React from 'react';
import { AppStep } from '../types';
import { ScriptIcon, MicIcon, ImageIcon, VideoIcon } from './Icons';

interface StepIndicatorProps {
  currentStep: AppStep;
}

const steps = [
  { id: AppStep.SCRIPT, name: '1. Roteiro', icon: ScriptIcon },
  { id: AppStep.VOICE_OVER, name: '2. Narração', icon: MicIcon },
  { id: AppStep.IMAGES, name: '3. Imagens', icon: ImageIcon },
  { id: AppStep.VIDEO, name: '4. Vídeo', icon: VideoIcon },
];

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <nav aria-label="Progresso">
      <ol role="list" className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
            {stepIdx < currentStepIndex ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-red-600" />
                </div>
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-red-600 hover:bg-red-500">
                  <step.icon className="h-5 w-5 text-white" />
                </div>
              </>
            ) : stepIdx === currentStepIndex ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-zinc-700" />
                </div>
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-red-600 bg-zinc-800" aria-current="step">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                </div>
              </>
            ) : (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-zinc-700" />
                </div>
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-zinc-600 bg-zinc-800 group-hover:border-zinc-500">
                   <step.icon className="h-5 w-5 text-zinc-500" />
                </div>
              </>
            )}
             <span className="absolute -bottom-7 w-max text-xs font-semibold text-center text-neutral-400">{step.name}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default StepIndicator;