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