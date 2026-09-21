import React from 'react';
import { Check } from 'lucide-react';

interface BookingStepperProps {
  currentStep: number;
  steps: string[];
}

export default function BookingStepper({ currentStep, steps }: BookingStepperProps) {
  return (
    <div className="w-full max-w-4xl mx-auto mb-10 px-2 sm:px-4">
      <div className="hidden sm:flex items-center justify-between relative">
        {/* Connecting bar */}
        <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-[2px] bg-[#e6dece] z-0" />
        <div
          className="absolute top-1/2 left-6 -translate-y-1/2 h-[2px] bg-[#8a3243] transition-all duration-500 z-0"
          style={{
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`
          }}
        />

        {steps.map((step, idx) => {
          const stepNumber = idx + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div key={idx} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-[#8a3243] text-[#faf8f5] shadow-sm'
                    : isCurrent
                    ? 'bg-[#2d1117] text-[#c5a059] ring-4 ring-[#c5a059]/20 shadow-md font-bold'
                    : 'bg-[#faf8f5] border-2 border-[#e6dece] text-[#525960]'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : stepNumber}
              </div>
              <span
                className={`text-[11px] uppercase tracking-wider mt-2 font-medium transition-colors text-center ${
                  isCurrent
                    ? 'text-[#2d1117] font-bold'
                    : isCompleted
                    ? 'text-[#8a3243]'
                    : 'text-[#525960]/70'
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile Step Indicator */}
      <div className="sm:hidden flex items-center justify-between bg-white border border-[#e6dece] rounded-xl px-4 py-3">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#8a3243] font-semibold block">
            Step {currentStep} of {steps.length}
          </span>
          <span className="font-serif text-sm font-medium text-[#191c1f]">
            {steps[currentStep - 1]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx + 1 === currentStep
                  ? 'w-6 bg-[#8a3243]'
                  : idx + 1 < currentStep
                  ? 'w-2 bg-[#c5a059]'
                  : 'w-2 bg-[#e6dece]'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
