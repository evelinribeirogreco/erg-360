// js/checkin-extras.js
// ═══ POLIMENTO V1 ═══
// 18 micro-melhorias: orientação, polimento, segurança, acessibilidade, mobile, deleite

const DRAFT_KEY  = 'erg_checkin_draft';
const STREAK_KEY = 'erg_checkin_streak';

const BRISTOL_DESC = {
  1: 'Grumos duros separados — prisão de ventre severa',
  2: 'Formato sólido em bloco — prisão de ventre leve',
  3: 'Com fissuras na superfície — normal',
  4: 'Macio e liso — ideal',
  5: 'Bordas bem definidas — normal',
  6: 'Esponjoso, bordas irregulares — leve diarreia',
  7: 'Líquido sem partes sólidas — diarreia'
};

const CONTEXT_HINTS = {
  energia_1: 'Energia muito baixa — dormiu pouco ou está em déficit calórico?',
  energia_2: 'Energia baixa — verifique hidratação e refeições de hoje.',
  humor_1:   'Humor péssimo. Use o campo final para anotar o motivo.',
  fome_nivel_4: 'Fome alta — garanta proteína em cada refeição do plano.',
  fome_nivel_5: 'Fome incontrolável pode indicar restrição excessiva.',
  sono_qualidade_1: 'Sono péssimo eleva cortisol e aumenta fome ao longo do dia.',
  sono_qualidade_2: 'Sono ruim — tente dormir antes das 23h hoje.',
};

let _bypassValidation = false;

document.addEventListener('DOMContentLoaded', () => {
  initStepDots();
  patchNavigation();
  initContextualHints();
  initDraftRecovery();
  initBristolTooltips();
  initSwipeGesture();
  initKeyboardNav();
  initStreakBadge();
  initLoadingSkeleton();
  initRippleEffect();
  observeScoreScreen();
});
