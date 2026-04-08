export interface HintData {
  title: string;
  text: string;
  svgIllustration?: string;
}

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const HINTS: Record<string, HintData> = {
  'wall-length': {
    title: 'Как измерить длину стены',
    text: 'Измерьте расстояние от угла до угла по полу рулеткой. Держите рулетку горизонтально и плотно к стене. Записывайте в миллиметрах (например, 3500 мм = 3.5 м).',
    svgIllustration: `<svg viewBox="0 0 220 110" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="45" width="200" height="25" fill="#e5e7eb" stroke="#374151" stroke-width="2" rx="2"/>
      <line x1="10" y1="35" x2="210" y2="35" stroke="#3b82f6" stroke-width="2"/>
      <line x1="10" y1="28" x2="10" y2="42" stroke="#3b82f6" stroke-width="2"/>
      <line x1="210" y1="28" x2="210" y2="42" stroke="#3b82f6" stroke-width="2"/>
      <text x="110" y="28" text-anchor="middle" font-size="11" fill="#1d4ed8" font-family="sans-serif">длина стены</text>
      <circle cx="10" cy="70" r="4" fill="#374151"/>
      <circle cx="210" cy="70" r="4" fill="#374151"/>
      <text x="10" y="90" font-size="10" fill="#6b7280" font-family="sans-serif">A</text>
      <text x="205" y="90" font-size="10" fill="#6b7280" font-family="sans-serif">B</text>
    </svg>`,
  },
  'curvature': {
    title: 'Измерение кривизны стены',
    text: 'Приложите строительное правило (или ровную рейку) к стене. Рулеткой или щупом измерьте зазор между правилом и стеной в трёх точках: внизу (30 см от стяжки), в середине (130 см) и вверху (230 см). Запишите максимальное отклонение.',
    svgIllustration: `<svg viewBox="0 0 180 160" xmlns="http://www.w3.org/2000/svg">
      <path d="M60 15 Q95 75 60 145" stroke="#374151" stroke-width="3" fill="none"/>
      <line x1="60" y1="15" x2="60" y2="145" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="5,3"/>
      <circle cx="68" cy="45" r="4" fill="#ef4444"/>
      <text x="76" y="49" font-size="9" fill="#dc2626" font-family="sans-serif">30 см</text>
      <circle cx="79" cy="80" r="4" fill="#ef4444"/>
      <text x="87" y="84" font-size="9" fill="#dc2626" font-family="sans-serif">130 см</text>
      <circle cx="68" cy="115" r="4" fill="#ef4444"/>
      <text x="76" y="119" font-size="9" fill="#dc2626" font-family="sans-serif">230 см</text>
      <text x="20" y="158" font-size="9" fill="#6b7280" font-family="sans-serif">кривизна → отклонение</text>
    </svg>`,
  },
  'window': {
    title: 'Замер оконного проёма',
    text: 'Измерьте: 1) ширину проёма (от откоса до откоса); 2) высоту от стяжки до низа подоконника; 3) высоту оконного блока (рамы); 4) глубину откосов слева и справа. Фиксируйте все размеры в мм.',
    svgIllustration: `<svg viewBox="0 0 220 160" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="15" width="180" height="130" fill="#f9fafb" stroke="#374151" stroke-width="2"/>
      <rect x="50" y="35" width="120" height="80" fill="#bfdbfe" stroke="#374151" stroke-width="1.5"/>
      <line x1="110" y1="35" x2="110" y2="115" stroke="#374151" stroke-width="1"/>
      <line x1="50" y1="75" x2="170" y2="75" stroke="#374151" stroke-width="1"/>
      <line x1="50" y1="125" x2="170" y2="125" stroke="#3b82f6" stroke-width="1.5"/>
      <text x="110" y="145" text-anchor="middle" font-size="9" fill="#1d4ed8" font-family="sans-serif">ширина проёма</text>
      <line x1="185" y1="35" x2="185" y2="115" stroke="#3b82f6" stroke-width="1.5"/>
      <text x="190" y="78" font-size="9" fill="#1d4ed8" font-family="sans-serif" transform="rotate(90 190 78)">высота рамы</text>
    </svg>`,
  },
  'door': {
    title: 'Замер дверного проёма',
    text: 'Измерьте: 1) ширину проёма (от откоса до откоса); 2) высоту от стяжки до верха проёма; 3) глубину откосов с обеих сторон (толщина стены). Если есть порог — запишите его высоту.',
    svgIllustration: `<svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="10" width="160" height="140" fill="#f9fafb" stroke="#374151" stroke-width="2"/>
      <rect x="55" y="30" width="90" height="120" fill="#fef3c7" stroke="#374151" stroke-width="1.5"/>
      <path d="M55 30 Q100 55 100 150" stroke="#374151" stroke-width="1" fill="none" stroke-dasharray="3,2"/>
      <line x1="55" y1="155" x2="145" y2="155" stroke="#3b82f6" stroke-width="1.5"/>
      <text x="100" y="165" text-anchor="middle" font-size="9" fill="#1d4ed8" font-family="sans-serif">ширина</text>
      <line x1="155" y1="30" x2="155" y2="150" stroke="#3b82f6" stroke-width="1.5"/>
      <text x="168" y="95" font-size="9" fill="#1d4ed8" font-family="sans-serif">высота</text>
    </svg>`,
  },
  'room-photo': {
    title: 'Как сфотографировать комнату',
    text: 'Встаньте в угол комнаты. Фотографируйте с высоты ~1.2 м, направив камеру в противоположный угол — в кадр войдут 2–3 стены. Сделайте 4 фото из каждого угла. Нужно освещение: включите весь свет.',
    svgIllustration: `<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg">
      <polygon points="100,10 190,130 10,130" fill="#f0fdf4" stroke="#374151" stroke-width="2"/>
      <circle cx="100" cy="10" r="6" fill="#3b82f6"/>
      <text x="100" y="8" text-anchor="middle" font-size="8" fill="#fff" font-family="sans-serif">📷</text>
      <line x1="100" y1="16" x2="50" y2="125" stroke="#3b82f6" stroke-width="1" stroke-dasharray="4,3"/>
      <line x1="100" y1="16" x2="150" y2="125" stroke="#3b82f6" stroke-width="1" stroke-dasharray="4,3"/>
      <text x="100" y="145" text-anchor="middle" font-size="9" fill="#6b7280" font-family="sans-serif">угол → противоположный угол</text>
    </svg>`,
  },
  'ceiling-height': {
    title: 'Измерение высоты потолка',
    text: 'Измерьте высоту в 4 углах комнаты — от стяжки до потолка. Запишите все 4 значения: они могут отличаться. Если есть перепад, запишите минимальное и максимальное значение.',
    svgIllustration: `<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="15" width="160" height="110" fill="#f9fafb" stroke="#374151" stroke-width="2"/>
      <line x1="35" y1="20" x2="35" y2="120" stroke="#3b82f6" stroke-width="2" stroke-dasharray="5,3"/>
      <line x1="28" y1="20" x2="42" y2="20" stroke="#3b82f6" stroke-width="2"/>
      <line x1="28" y1="120" x2="42" y2="120" stroke="#3b82f6" stroke-width="2"/>
      <text x="45" y="75" font-size="10" fill="#1d4ed8" font-family="sans-serif">высота</text>
      <circle cx="165" cy="20" r="4" fill="#ef4444" opacity="0.6"/>
      <circle cx="165" cy="120" r="4" fill="#ef4444" opacity="0.6"/>
      <text x="50" y="130" font-size="9" fill="#6b7280" font-family="sans-serif">замер в каждом углу</text>
    </svg>`,
  },
  'element': {
    title: 'Замер элементов',
    text: 'Радиатор: ширина × высота × расстояние от пола. Колонна/шахта: ширина × глубина × высота от стяжки. Ниша: ширина × высота × глубина. Все размеры — от ближайшего угла или края стены.',
    svgIllustration: `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="60" width="160" height="40" fill="#e5e7eb" stroke="#374151" stroke-width="1.5"/>
      <rect x="55" y="30" width="50" height="70" fill="#fde68a" stroke="#374151" stroke-width="1.5"/>
      <line x1="55" y1="25" x2="105" y2="25" stroke="#3b82f6" stroke-width="1.5"/>
      <text x="80" y="20" text-anchor="middle" font-size="9" fill="#1d4ed8" font-family="sans-serif">ширина</text>
      <line x1="110" y1="30" x2="110" y2="100" stroke="#3b82f6" stroke-width="1.5"/>
      <text x="118" y="68" font-size="9" fill="#1d4ed8" font-family="sans-serif">высота</text>
      <line x1="20" y1="108" x2="55" y2="108" stroke="#ef4444" stroke-width="1.5"/>
      <text x="37" y="118" text-anchor="middle" font-size="9" fill="#dc2626" font-family="sans-serif">от угла</text>
    </svg>`,
  },
  'perimeter-walk': {
    title: 'Обход периметра',
    text: 'Двигайтесь по часовой стрелке вдоль стен комнаты, начиная от входной двери. Каждую стену называйте буквой (A, B, C…). Угол между стенами — тоже буква того угла, куда переходите.',
  },
  'corner-label': {
    title: 'Маркировка углов',
    text: 'Обозначьте углы комнаты буквами по часовой стрелке: A, B, C, D (для прямоугольной комнаты). Сфотографируйте каждый угол с нанесённой буквой на стикере — это поможет не запутаться при замере.',
  },
  'wall-elevation': {
    title: 'Развёртка стены',
    text: 'Развёртка — это плоская схема стены. Отметьте все проёмы (окна, двери), расположение батарей и других элементов с расстояниями от углов и от пола. Высоты — от стяжки.',
  },
  'openings': {
    title: 'Замер проёмов',
    text: 'Для каждого проёма запишите: расстояние от левого угла стены до проёма, ширину проёма, высоту. Для окна — также расстояние от стяжки до подоконника. Глубина откосов = толщина стены в этом месте.',
  },
};

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: 'стяжка',
    definition: 'Выравнивающий слой из бетона или смеси поверх перекрытия. Замеры высоты делаются от стяжки (не от чернового пола).',
  },
  {
    term: 'откос',
    definition: 'Боковые, верхние и нижние поверхности оконного или дверного проёма. Ширина откоса = глубина проёма = толщина стены.',
  },
  {
    term: 'простенок',
    definition: 'Участок стены между двумя проёмами (окнами или дверями), либо между проёмом и углом комнаты.',
  },
  {
    term: 'ригель',
    definition: 'Горизонтальный конструктивный элемент (балка), выступающий из потолка или стены. Нужно замерять его ширину, высоту свеса и расположение.',
  },
  {
    term: 'подоконник',
    definition: 'Горизонтальная плита в нижней части оконного проёма. При замере указывается высота от стяжки до его верхней поверхности.',
  },
  {
    term: 'перепад',
    definition: 'Разница высот потолка, пола или уровня стен в разных точках комнаты. Нормой считается до 5 мм на 1 м.',
  },
  {
    term: 'кривизна',
    definition: 'Отклонение поверхности стены от вертикальной или горизонтальной плоскости. Измеряется правилом: зазор между ним и стеной.',
  },
  {
    term: 'развёртка',
    definition: 'Плоская схема стены, показывающая расположение всех проёмов, элементов и их размеры. Каждая стена имеет свою развёртку.',
  },
];
