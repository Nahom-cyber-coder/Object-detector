document.addEventListener('DOMContentLoaded', () => {
  const homePage = document.getElementById("homePage");
  const overviewPage = document.getElementById("overviewPage");
  const objectDetectionPage = document.getElementById("objectDetectionPage");
  const objectList = document.getElementById("objectList");
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const darkModeToggleHome = document.getElementById("darkModeToggleHome");
  const darkModeToggleOverview = document.getElementById("darkModeToggleOverview");
  const darkModeToggle = document.getElementById("darkModeToggle");
  const settingsButton = document.getElementById("settingsButton");
  const settingsModal = document.getElementById("settingsModal");
  const overlay = document.getElementById("overlay");
  const closeModal = document.getElementById("closeModal");
  const stopRecording = document.getElementById("stopRecording");
  const clearList = document.getElementById("clearList");
  const backToHome = document.getElementById("backToHome");
  const startRecording = document.getElementById("startRecording");
  const userGreeting = document.getElementById("userGreeting");
  const proceedButton = document.getElementById("proceedButton");
  const popupMessage = document.getElementById('popupMessage');
  const closePopup = document.querySelector('.close');
  const proceedToDetection = document.getElementById('proceedToDetection');
  const darkModeToggleRealWorld = document.getElementById('darkModeToggleRealWorld');
  const realWorldPage = document.getElementById('realWorldPage');
  let detectedObjects = {};
  let isCameraSetUp = false;
  let recording = false;
  let recorder;
  let videoChunks = [];
  let stream;

  // Transition effect helpers
  function showPage(page) {
    const allPages = [homePage, overviewPage, objectDetectionPage, realWorldPage];
    allPages.forEach(p => p.style.display = "none");
    page.style.display = "block";
  }

  // Toggle Dark Mode
  function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    document.body.classList.toggle("light-mode");
    const mode = document.body.classList.contains("dark-mode") ? "🌙" : "🌞";
    darkModeToggleHome.textContent = mode;
    darkModeToggleOverview.textContent = mode;
    darkModeToggle.textContent = mode;
    darkModeToggleRealWorld.textContent = mode;
  }

  darkModeToggleHome.addEventListener("click", toggleDarkMode);
  darkModeToggleOverview.addEventListener("click", toggleDarkMode);
  darkModeToggle.addEventListener("click", toggleDarkMode);
  darkModeToggleRealWorld.addEventListener("click", toggleDarkMode);

  // Show Settings Modal
  settingsButton.addEventListener("click", () => {
    settingsModal.classList.add("active");
    overlay.classList.add("active");
  });

  // Close Settings Modal
  closeModal.addEventListener("click", () => {
    settingsModal.classList.remove("active");
    overlay.classList.remove("active");
  });

  // Close Popup Message
  closePopup.addEventListener('click', () => {
    popupMessage.style.display = 'none';
  });

  window.addEventListener('click', (event) => {
    if (event.target == popupMessage) {
      popupMessage.style.display = 'none';
    }
  });

  // Set up camera
  async function setupCamera() {
    if (isCameraSetUp) {
      return;
    }
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
    });
    video.srcObject = stream;
    isCameraSetUp = true;
  }

  // Detect objects
  async function detectObjects(model) {
    const predictions = await model.detect(video);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    predictions.forEach((pred) => {
      const [x, y, width, height] = pred.bbox;
      ctx.strokeStyle = "green"; // Change line color to green
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      const label = `${pred.class} (${(pred.score * 100).toFixed(1)}%)`;
      ctx.fillStyle = "white";
      ctx.fillText(label, x, y > 10 ? y - 5 : 10);
      if (detectedObjects[pred.class]) {
        detectedObjects[pred.class].percent = (pred.score * 100).toFixed(1);
      } else {
        detectedObjects[pred.class] = {
          percent: (pred.score * 100).toFixed(1),
        };
        const li = document.createElement("li");
        li.id = pred.class;
        li.innerHTML = `<span>${pred.class}</span><span>${detectedObjects[pred.class].percent}%</span>`;
        objectList.appendChild(li);
      }
      document.getElementById(pred.class).innerHTML = `<span>${pred.class}</span><span>${detectedObjects[pred.class].percent}%</span>`;
    });
  }

  // Event listeners for forms and navigation
  document.getElementById("detailsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value;
    const age = document.getElementById("age").value;

    if (age < 10) {
      alert("Sorry, you must be at least 10 years old to use this system.");
      return;
    }
    if (age > 120) {
      alert("Sorry, it's impossible to be older than 120 years!");
      return;
    }

    userGreeting.textContent = `Welcome ${name}, now you can proceed to the overview.`;
    showPage(overviewPage);
    popupMessage.style.display = 'block';
  });

  proceedButton.addEventListener("click", () => {
    showPage(realWorldPage);
  });

  proceedToDetection.addEventListener("click", async () => {
    showPage(objectDetectionPage);
    await setupCamera();
    const model = await cocoSsd.load();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    setInterval(() => detectObjects(model), 200);
  });

  stopRecording.addEventListener("click", () => {
    recording = false;
    if (recorder) {
      recorder.stop();
    }
    // Stop the video
    video.srcObject.getTracks().forEach(track => track.stop());
    isCameraSetUp = false;
  });

  clearList.addEventListener("click", () => {
    objectList.innerHTML = "";
    detectedObjects = {};
  });

  // Start Recording (new button)
  startRecording.addEventListener("click", () => {
    recording = true;
    videoChunks = [];
    if (isCameraSetUp) {
      video.srcObject.getTracks().forEach(track => track.stop());
    }
    isCameraSetUp = false;
    setupCamera(); // Re-setup camera for recording
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => videoChunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(videoChunks, { type: "video/webm" });
      const videoUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = videoUrl;
      link.download = "recorded-video.webm";
      link.click();
    };
    recorder.start();
    setInterval(() => {
      if (recording) {
        detectObjects(); // Keep detecting objects when recording
      }
    }, 200);
  });

  // Handle Arrow Keys and Shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
      window.scrollBy(0, -50);
    } else if (e.key === "ArrowDown") {
      window.scrollBy(0, 50);
    } else if (e.key === "d" || e.key === "D") {
      darkModeToggle.click();
    } else if (e.key === "s" || e.key === "S") {
      stopRecording.click();
    } else if (e.key === "c" || e.key === "C") {
      clearList.click();
    }
  });

  backToHome.addEventListener("click", () => {
    objectDetectionPage.style.display = 'none';
    homePage.style.display = 'block';
  });

  // Neon effect on mouse move
  document.addEventListener('mousemove', (e) => {
    document.querySelectorAll('.neon').forEach(el => {
      el.style.color = `rgb(${e.clientX % 255}, ${e.clientY % 255}, 255)`;
    });
  });

  // Fix popup message display in dark mode
  if (document.body.classList.contains('dark-mode')) {
    popupMessage.style.display = 'block';
  }

  // Toggle Neon Mode
  function toggleNeonMode() {
    document.body.classList.toggle("neon-mode");
  }

  // Add event listener for neon mode toggle
  document.getElementById("neonModeToggle").addEventListener("click", toggleNeonMode);
});
