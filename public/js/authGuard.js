// public/js/authGuard.js
(function () {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = "login.html";
    }
  
    // Prevent back navigation after logout
    history.pushState(null, null, location.href);
    window.onpopstate = function () {
      history.go(1);
    };
  })();
  