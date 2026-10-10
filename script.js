// Globe animation in the Approach section (lottie-web is loaded in index.html)
const globeContainer = document.getElementById('approach-globe');

if (globeContainer && window.lottie) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  lottie.loadAnimation({
    container: globeContainer,
    renderer: 'svg',
    loop: true,
    autoplay: !reduceMotion,
    path: 'assets/approach/globe.json',
  });
}
// Mobile navigation: burger button opens and closes the dropdown
const header = document.querySelector('header');
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.getElementById('nav-menu');

if (header && navToggle && navMenu) {
  const setOpen = (open) => {
    header.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  navToggle.addEventListener('click', () => {
    setOpen(!header.classList.contains('is-open'));
  });

  // Close after picking a link, tapping outside, or pressing Escape
  navMenu.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.classList.contains('is-open')) {
      setOpen(false);
      navToggle.focus();
    }
  });

  // Back to desktop width: make sure the menu state is reset
  window.matchMedia('(min-width: 641px)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}