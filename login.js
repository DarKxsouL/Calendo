const loginBtn = document.getElementById("loginBtn");
    const signupBtn = document.getElementById("signupBtn");
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");
    const googleSignInBtn = document.getElementById("googleSignInBtn");

    loginBtn.addEventListener("click", () => {
      loginForm.classList.remove("hidden");
      signupForm.classList.add("hidden");
      loginBtn.classList.add("active");
      signupBtn.classList.remove("active");
      googleSignInBtn.classList.remove("hidden");
      
    });

    signupBtn.addEventListener("click", () => {
      signupForm.classList.remove("hidden");
      loginForm.classList.add("hidden");
      signupBtn.classList.add("active");
      loginBtn.classList.remove("active");
      googleSignInBtn.classList.add("hidden");
    });


    
