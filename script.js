const button = document.querySelector('.btn');
const shareIcons = document.querySelector('.soc-med-icon')

button.addEventListener("click", function(){
    shareIcons.classList.toggle('is-open');
})
