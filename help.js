// Help modal functions
function openHelp() {
    document.getElementById('helpModal').style.display = 'block';
    document.body.classList.add('modal-open');
}

function closeHelp() {
    document.getElementById('helpModal').style.display = 'none';
    document.body.classList.remove('modal-open');
}

// Close help modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('helpModal');
    if (event.target == modal) {
        closeHelp();
    }
};