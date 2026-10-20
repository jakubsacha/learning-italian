/**
 * Rysunki do fiszek — proste płaskie obrazki w siatce 100×100. Ubrania mają
 * własne rysunki, bo emoji nie odróżniają płaszcza od kurtki ani bluzy od swetra.
 * Treść jest stała i nasza, więc wolno ją wstawić przez {@html}.
 */

const O = 'stroke="#23384d" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';

export const ART: Readonly<Record<string, string>> = {
  boots: `
    <path ${O} fill="#a0612f" d="M18 14H38V64Q52 66 55 78V86H18Z"/>
    <path ${O} fill="#b9773f" d="M46 14H66V64Q80 66 83 78V86H46Z"/>
    <path ${O} fill="none" d="M18 24H38M46 24H66"/>
    <path ${O} fill="#5d3a1a" d="M18 86H55V91H18ZM46 86H83V91H46Z"/>`,
  cap: `
    <path ${O} fill="#e53935" d="M18 64Q18 26 50 26Q80 26 80 64Z"/>
    <path ${O} fill="#c62828" d="M70 62Q94 60 96 70Q80 76 60 70Z"/>
    <path ${O} fill="none" d="M50 26Q42 44 44 64M50 26Q60 44 60 64"/>
    <circle ${O} fill="#ffca28" cx="50" cy="25" r="4"/>`,
  coat: `
    <path ${O} fill="#c8955a" d="M34 14L18 24L10 76L21 78L26 44L27 92H73L74 44L79 78L90 76L82 24L66 14L50 30Z"/>
    <path ${O} fill="#a8733c" d="M34 14L50 30L40 38L30 22ZM66 14L50 30L60 38L70 22Z"/>
    <path ${O} fill="none" d="M50 30V92M30 66H42"/>
    <g fill="#23384d"><circle cx="56" cy="46" r="2.6"/><circle cx="56" cy="60" r="2.6"/><circle cx="56" cy="74" r="2.6"/></g>`,
  dress: `
    <path ${O} fill="#ff7eb6" d="M40 14V28L36 40H64L60 28V14"/>
    <path ${O} fill="#ff7eb6" d="M38 26Q50 34 62 26L64 40L84 88Q50 96 16 88L36 40Z"/>
    <path ${O} fill="#e91e63" d="M36 40H64V46H36Z"/>
    <g fill="#fff"><circle cx="40" cy="66" r="3"/><circle cx="58" cy="60" r="3"/><circle cx="50" cy="78" r="3"/><circle cx="30" cy="82" r="3"/><circle cx="70" cy="80" r="3"/></g>`,
  hoodie: `
    <path ${O} fill="#7e57c2" d="M32 26L16 34L9 76L20 78L24 50L26 90H74L76 50L80 78L91 76L84 34L68 26Z"/>
    <path ${O} fill="#5e35b1" d="M32 30Q50 2 68 30Q50 42 32 30Z"/>
    <path ${O} fill="none" d="M45 36V52M55 36V52"/>
    <path ${O} fill="#5e35b1" d="M34 64H66L62 80H38Z"/>`,
  jacket: `
    <path ${O} fill="#43a047" d="M32 20L16 28L11 70L22 72L25 46L27 76H73L75 46L78 72L89 70L84 28L68 20L50 28Z"/>
    <path ${O} fill="#2e7d32" d="M32 20L50 28L40 36ZM68 20L50 28L60 36Z"/>
    <path ${O} fill="none" stroke-dasharray="3 3" d="M50 30V76"/>
    <path ${O} fill="#2e7d32" d="M27 70H73V78H27Z"/>`,
  jeans: `
    <path ${O} fill="#3f6fb5" d="M27 12H73L80 92H57L50 42L43 92H20Z"/>
    <path ${O} fill="none" d="M27 22H73M50 22V40M32 22Q32 32 42 32M68 22Q68 32 58 32"/>
    <path fill="none" stroke="#ffca28" stroke-width="2" stroke-dasharray="3 3" d="M24 60L30 90M76 60L70 90"/>`,
  jumper: `
    <path ${O} fill="#ef6c00" d="M32 22L16 30L9 76L20 78L24 48L26 90H74L76 48L80 78L91 76L84 30L68 22Q50 34 32 22Z"/>
    <path ${O} fill="none" d="M26 50L32 56L38 50L44 56L50 50L56 56L62 50L68 56L74 50"/>
    <path ${O} fill="#e65100" d="M26 84H74V90H26ZM9 72L20 74V78L9 76Z M91 72L80 74V78L91 76Z"/>`,
  shirt: `
    <path ${O} fill="#e3f2fd" d="M34 16L16 26L10 76L20 78L24 46L26 92H74L76 46L80 78L90 76L84 26L66 16L50 26Z"/>
    <path ${O} fill="#fff" d="M34 16L50 26L44 38L32 24ZM66 16L50 26L56 38L68 24Z"/>
    <path ${O} fill="none" d="M50 26V92M60 52H70V62H60Z"/>
    <g fill="#23384d"><circle cx="46" cy="46" r="2"/><circle cx="46" cy="60" r="2"/><circle cx="46" cy="74" r="2"/></g>`,
  shoes: `
    <path ${O} fill="#6d4c41" d="M40 54Q42 46 52 46L64 49Q76 54 88 58Q94 62 92 70H40Z"/>
    <path ${O} fill="#4e342e" d="M8 74Q10 60 22 60L36 63Q48 68 62 72Q68 76 66 84H8Z"/>
    <path ${O} fill="none" d="M26 64L30 70M32 65L36 71"/>
    <path ${O} fill="#3e2723" d="M8 84H66V89H8Z"/>`,
  skirt: `
    <path ${O} fill="#e53935" d="M32 26H68L86 84Q50 92 14 84Z"/>
    <path ${O} fill="#b71c1c" d="M32 18H68V27H32Z"/>
    <path ${O} fill="none" d="M42 27L36 87M50 27V89M58 27L64 87"/>`,
  tshirt: `
    <path ${O} fill="#fdd835" d="M34 18L12 30L21 48L30 43V88H70V43L79 48L88 30L66 18Q50 30 34 18Z"/>
    <path ${O} fill="#fbc02d" d="M43 50L50 64L57 50Z"/>`,
  top: `
    <path ${O} fill="#26c6da" d="M36 12V28Q28 38 28 50V90H72V50Q72 38 64 28V12H58Q58 36 50 36Q42 36 42 12Z"/>
    <path ${O} fill="none" d="M28 70H72"/>
    <g fill="#fff"><circle cx="40" cy="80" r="2.5"/><circle cx="50" cy="80" r="2.5"/><circle cx="60" cy="80" r="2.5"/></g>`,
  tracksuit: `
    <path ${O} fill="#1e88e5" d="M34 8L20 14L14 44L23 45L26 28L27 48H73L74 28L77 45L86 44L80 14L66 8L50 16Z"/>
    <path ${O} fill="#1e88e5" d="M28 52H72L76 96H56L50 66L44 96H24Z"/>
    <path fill="none" stroke="#fff" stroke-width="3" d="M50 17V48M19 18L15 42M81 18L85 42M29 56L26 94M71 56L74 94"/>`,
  trainers: `
    <path ${O} fill="#fff" d="M6 74Q6 52 20 50L34 48Q42 62 60 64L84 68Q96 72 94 80H6Z"/>
    <path ${O} fill="#1e88e5" d="M22 70Q44 58 72 70Q44 64 22 74Z"/>
    <path ${O} fill="none" d="M34 54L42 50M38 58L46 54M42 61L50 57"/>
    <path ${O} fill="#ff7043" d="M6 80H94V87H6Z"/>`,
  trousers: `
    <path ${O} fill="#546e7a" d="M28 14H72L78 92H56L50 40L44 92H22Z"/>
    <path ${O} fill="#37474f" d="M28 14H72V22H28Z"/>
    <path ${O} fill="#ffca28" d="M46 14H54V22H46Z"/>
    <path fill="none" stroke="#90a4ae" stroke-width="2" d="M36 26L33 90M64 26L67 90"/>`,
  backpack: `
    <path ${O} fill="none" d="M40 18Q50 4 60 18"/>
    <path ${O} fill="#ff7043" d="M22 32Q22 16 50 16Q78 16 78 32V86Q78 92 72 92H28Q22 92 22 86Z"/>
    <path ${O} fill="#ffab91" d="M32 58H68V80Q68 84 64 84H36Q32 84 32 80Z"/>
    <path ${O} fill="none" d="M32 66H68M24 40H76"/>
    <circle ${O} fill="#ffca28" cx="50" cy="66" r="3"/>`,
  headphones: `
    <path fill="none" stroke="#23384d" stroke-width="10" stroke-linecap="round" d="M20 62Q20 16 50 16Q80 16 80 62"/>
    <path fill="none" stroke="#ab47bc" stroke-width="5" stroke-linecap="round" d="M20 62Q20 16 50 16Q80 16 80 62"/>
    <rect ${O} fill="#ab47bc" x="10" y="52" width="20" height="34" rx="8"/>
    <rect ${O} fill="#ab47bc" x="70" y="52" width="20" height="34" rx="8"/>
    <rect fill="#ce93d8" x="15" y="58" width="6" height="22" rx="3"/><rect fill="#ce93d8" x="79" y="58" width="6" height="22" rx="3"/>`,
  keys: `
    <circle ${O} fill="none" cx="26" cy="24" r="14"/>
    <path ${O} fill="#ffca28" d="M30 40A14 14 0 1 1 30 41ZM40 52L82 80L78 86L72 82L68 88L62 84L64 78L36 60Z"/>
    <circle ${O} fill="#fff" cx="27" cy="45" r="4"/>
    <path ${O} fill="#b0bec5" d="M42 30A12 12 0 1 1 42 31ZM58 34H92V41H86V48H80V41H58Z"/>
    <circle ${O} fill="#fff" cx="46" cy="38" r="3.5"/>`,
  bike: `
    <circle fill="none" stroke="#23384d" stroke-width="7" stroke-dasharray="4 3" cx="24" cy="66" r="18"/>
    <circle fill="none" stroke="#23384d" stroke-width="7" stroke-dasharray="4 3" cx="76" cy="66" r="18"/>
    <circle fill="none" stroke="#90a4ae" stroke-width="2" cx="24" cy="66" r="12"/><circle fill="none" stroke="#90a4ae" stroke-width="2" cx="76" cy="66" r="12"/>
    <path fill="none" stroke="#43a047" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" d="M24 66L42 40L52 66ZM42 40H70M52 66L70 40L76 66"/>
    <path ${O} fill="none" d="M42 40L40 32M34 31H48M70 40L68 28L78 26"/>
    <circle fill="#23384d" cx="52" cy="66" r="4"/>`,
  smartphone: `
    <rect ${O} fill="#263238" x="30" y="8" width="40" height="84" rx="8"/>
    <rect fill="#4fc3f7" x="35" y="17" width="30" height="62" rx="2"/>
    <g fill="#fff" opacity=".85"><rect x="39" y="22" width="9" height="9" rx="2"/><rect x="52" y="22" width="9" height="9" rx="2"/><rect x="39" y="35" width="9" height="9" rx="2"/><rect x="52" y="35" width="9" height="9" rx="2"/></g>
    <circle fill="#90a4ae" cx="50" cy="85" r="3"/>`,
  tablet: `
    <rect ${O} fill="#263238" x="8" y="18" width="84" height="64" rx="8"/>
    <rect fill="#81d4fa" x="17" y="25" width="66" height="50" rx="2"/>
    <g fill="#fff" opacity=".85"><rect x="22" y="30" width="11" height="11" rx="3"/><rect x="38" y="30" width="11" height="11" rx="3"/><rect x="54" y="30" width="11" height="11" rx="3"/><rect x="22" y="46" width="11" height="11" rx="3"/><rect x="38" y="46" width="11" height="11" rx="3"/></g>
    <circle fill="#90a4ae" cx="87.5" cy="50" r="2.5"/>`,
};
