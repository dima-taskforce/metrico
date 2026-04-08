import { useState } from 'react';
import { GLOSSARY } from '../data/hints';

interface GlossaryTooltipProps {
  term: string;
  children: React.ReactNode;
}

export function GlossaryTooltip({ term, children }: GlossaryTooltipProps) {
  const [visible, setVisible] = useState(false);
  const entry = GLOSSARY.find((g) => g.term === term);

  if (!entry) return <>{children}</>;

  return (
    <span className="relative inline-block">
      <span
        className="cursor-help underline decoration-dotted decoration-blue-400 text-blue-700"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        tabIndex={0}
        aria-describedby={`glossary-${term}`}
      >
        {children}
      </span>
      {visible && (
        <span
          id={`glossary-${term}`}
          role="tooltip"
          className="absolute z-50 left-0 bottom-full mb-1 w-64 bg-gray-900 text-white text-xs rounded-md px-3 py-2 shadow-lg"
        >
          <span className="font-semibold">{entry.term}</span>
          {' — '}
          {entry.definition}
        </span>
      )}
    </span>
  );
}
