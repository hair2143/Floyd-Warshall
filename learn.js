// Learn modal functions
function openLearn() {
    document.getElementById('learnModal').style.display = 'block';
    document.body.classList.add('modal-open');
}

function closeLearn() {
    document.getElementById('learnModal').style.display = 'none';
    document.body.classList.remove('modal-open');
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('learnModal');
    if (event.target == modal) {
        closeLearn();
    }
}