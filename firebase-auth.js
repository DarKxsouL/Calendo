const auth = firebase.auth();

// Signup
document.getElementById("signupForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const name = this.elements[0].value;
  const email = this.elements[1].value;
  const password = this.elements[2].value;

  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      return userCredential.user.updateProfile({ displayName: name });
    })
    .then(() => {
      showToast("Successully Signed In", "success");
    setTimeout(() => window.location.href = "index2.html", 2000);
    })
    .catch((error) => showToast(error.message,"error"));
});

// Login
document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const email = this.elements[0].value;
  const password = this.elements[1].value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      showToast("Successully Logged In", "success");
    setTimeout(() => window.location.href = "index2.html", 2000);
    })
    .catch((error) => showToast("Use correct email or password", "error"));
});

// Google Sign-In
document.getElementById("googleSignInBtn").addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(() => {
      showToast("Successully Logged In with Google", "success");
    setTimeout(() => window.location.href = "index2.html", 2000);
    })
    .catch((error) => alert(error.message));
});


 // Show toast message
    function showToast(message, type = "success") {
      const toast = document.createElement("div");
      toast.className = `toast-message ${type}`;
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }

    function showToast(message, type = "success") {
      const toast = document.createElement("div");
      toast.className = `toast-message ${type}`;
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }