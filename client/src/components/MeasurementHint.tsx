import { useState, useRef, useEffect } from 'react';
import { HINTS } from '../data/hints';

interface MeasurementHintProps {
  stepKey: string;
  position?: 'top' | 'right' | 'bottom';
  className?: string;
}

export function MeasurementHint({ stepKey, position = 'right', className }: MeasurementHintProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hint = HINTS[stepKey];
  const svgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !svgRef.current || !hint?.svgIllustration) return;

    const svgContainer = svgRef.current;
    svgContainer.innerHTML = '';

    // Safe SVG parsing - controlled source from hints.ts
    const parser = new DOMParser();
    const doc = parser.parseFromString(hint.svgIllustration, 'image/svg+xml');

    if (doc.documentElement.tagName === 'svg') {
      const svg = doc.documentElement as unknown as SVGSVGElement;
      svgContainer.appendChild(svg);
    }
  }, [isOpen, hint?.svgIllustration]);

  if (!hint) return null;

  const positionClasses = {
    top: 'bottom-full mb-2',
    right: 'left-full ml-2',
    bottom: 'top-full mt-2',
  };

  return (
    <div className={`relative inline-block${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center hover:bg-blue-200 transition-colors"
        aria-label="Подсказка"
      >
        ?
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            className={`absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-72 ${positionClasses[position]}`}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm">{hint.title}</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            {hint.svgIllustration && (
              <div ref={svgRef} className="mb-3 bg-gray-50 rounded p-2" />
            )}

            <p className="text-sm text-gray-700 leading-relaxed">{hint.text}</p>
          </div>
        </>
      )}
    </div>
  );
}
