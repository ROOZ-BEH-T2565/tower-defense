(() => {
  let panel = null;

  function show(message, color = "#173047") {
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "room-debug-panel";
      panel.style.cssText = `
        position:fixed;
        z-index:999999;
        top:12px;
        left:12px;
        right:12px;
        padding:14px;
        border-radius:10px;
        background:#173047;
        color:white;
        direction:rtl;
        text-align:center;
        font:14px/1.8 sans-serif;
        box-shadow:0 3px 15px #0008;
      `;
      document.body.appendChild(panel);
    }

    panel.style.background = color;
    panel.textContent = message;
  }

  document.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest("#lb-create");
      if (!button) return;

      show("مرحله ۱: کلیک روی دکمه ساخت اتاق ثبت شد.");

      setTimeout(() => {
        const room = document.getElementById("lbroom");
        const toast = document.getElementById("toast");

        if (room && !room.classList.contains("hidden")) {
          show("اتاق ساخته شده و صفحه اتاق باز شده است.", "#176b45");
          return;
        }

        if (toast && toast.classList.contains("show")) {
          show(
            "مرحله ۲: تابع برنامه اجرا شده است.\nپیام برنامه: " +
              toast.textContent,
            "#76521a",
          );
          return;
        }

        show(
          "کلیک ثبت شد، اما برنامه نتیجه‌ای نشان نداده است. احتمالاً اجرای تابع دکمه متوقف شده یا نسخه نصب‌شده با کد فعلی هماهنگ نیست.",
          "#8b2929",
        );
      }, 1200);
    },
    true,
  );
})();
