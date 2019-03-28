// If using IE11
if (!!window.MSInputMethodContext && !!document.documentMode) {

    // Get the Continue Anyway button
    var continueButton = document.getElementById('continue-button');

    // Remove hidden style and add click handler
    continueButton.classList.remove('hidden');
    continueButton.addEventListener('click', function(event) {

        // Prevent default button behaviour
        event.preventDefault();

        // Set flag to allow continuing to site
        localStorage.setItem('continueToSite', '1');

        // Get the previous page they were on before being redirected
        var previousPage = (localStorage.getItem('prevPage') !== null) ? '/' + localStorage.getItem('prevPage') : '';
        var redirectPage = window.location.protocol + '//' + window.location.hostname + previousPage;

        // No longer need this stored
        localStorage.removeItem('prevPage');

        // Take them back to the page they were trying to get to
        window.location.replace(redirectPage);
    });
}
