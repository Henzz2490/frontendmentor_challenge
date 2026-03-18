const button = document.querySelector('.btn');
const shareIcons = document.querySelector('.soc-med-icon');

button.addEventListener('click', function () {
  const isOpen = shareIcons.classList.toggle('is-open');
  button.setAttribute('aria-expanded', isOpen);
});