const globeEl = document.getElementById('approach-globe');

if (!globeEl) {
  console.error('Globe: no element with id="approach-globe" in the HTML');
} else if (!window.lottie) {
  console.error('Globe: lottie-web did not load (check the <script> tag before script.js)');
} else {
  console.log('Globe: starting animation');
  lottie.loadAnimation({
    container: globeEl,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path: 'assets/approach/globe.json'
  });
}