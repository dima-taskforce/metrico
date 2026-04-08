export interface HintData {
  title: string;
  text: string;
  svgIllustration?: string;
}

export const HINTS: Record<string, HintData> = {
  'wall-length': {
    title: 'Как измерить длину стены',
    text: 'Измерьте расстояние от угла до угла по полу, рулеткой. Запишите в миллиметрах.',
    svgIllustration: `<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="40" width="180" height="20" fill="#e5e7eb" stroke="#374151" stroke-width="2"/>
      <line x1="10" y1="30" x2="190" y2="30" stroke="#3b82f6" stroke-width="2"/>
      <text x="100" y="25" text-anchor="middle" font-size="12" fill="#1d4ed8">длина</text>
    </svg>`,
  },
  'curvature': {
    title: 'Измерение кривизны стены',
    text: 'Приложите правило к стене. Измерьте зазор в 3 точках: внизу (30см от пола), в середине (130см) и вверху (230см).',
    svgIllustration: `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 20 Q100 60 50 130" stroke="#374151" stroke-width="3" fill="none"/>
      <line x1="50" y1="20" x2="50" y2="130" stroke="#3b82f6" stroke-width="1" stroke-dasharray="4"/>
      <circle cx="55" cy="40" r="4" fill="#ef4444"/>
      <circle cx="62" cy="75" r="4" fill="#ef4444"/>
      <circle cx="55" cy="110" r="4" fill="#ef4444"/>
    </svg>`,
  },
  'window': {
    title: 'Замер оконного проёма',
    text: 'Измерьте: ширину проёма, высоту от стяжки до низа рамы (подоконник), высоту рамы. Также замерьте откосы слева и справа.',
    svgIllustration: `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
      <rect x="30" y="20" width="140" height="110" fill="#f9fafb" stroke="#374151" stroke-width="2"/>
      <rect x="50" y="40" width="100" height="70" fill="#bfdbfe" stroke="#374151"/>
      <line x1="50" y1="130" x2="150" y2="130" stroke="#3b82f6" stroke-width="1.5"/>
      <text x="100" y="145" text-anchor="middle" font-size="10" fill="#1d4ed8">ширина</text>
    </svg>`,
  },
  'door': {
    title: 'Замер дверного проёма',
    text: 'Измерьте ширину и высоту проёма (от стяжки до верха). Не забудьте замерить откосы с обеих сторон.',
  },
  'room-photo': {
    title: 'Как сфотографировать комнату',
    text: 'Сделайте фото с угла комнаты так, чтобы были видны все 4 стены. Фото нужно до и после обмера.',
  },
  'ceiling-height': {
    title: 'Измерение высоты потолка',
    text: 'Измерьте высоту в двух противоположных углах — рулеткой от стяжки до потолка. Запишите оба значения.',
  },
  'element': {
    title: 'Замер элементов',
    text: 'Для радиатора: ширина, высота, расстояние от пола. Для колонны/шахты: ширина × глубина × высота.',
  },
};
