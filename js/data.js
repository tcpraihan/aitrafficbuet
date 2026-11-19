/* =========================================================================
   SITE CONTENT — edit this file to update the website.
   No build step needed: change text / add images, commit, push.
   Images go in assets/img/ (photos: .jpg/.png/.webp, recommended ≤ 400 KB).
   ========================================================================= */

window.SITE = {
  project: {
    short: "AI Traffic · BUET",
    title: "Intelligent Adaptive Traffic Control System for Dhaka City",
    org: "BRTC, BUET",
    orgLong: "Bureau of Research, Testing and Consultation, Bangladesh University of Engineering and Technology",
    summary:
      "Designing a reliable WAN system to automatically control traffic lights using AI-based real-time video analysis.",
    duration: "2 Years",
    fundedBy: "Government of Bangladesh",
    github: "https://github.com/tcpraihan/aitrafficbuet",
  },

  /* ---------- HERO CAROUSEL (the 5 dots in the sketch) ----------
     type "cover"  = image fills the banner
     type "framed" = caption on the left, image shown whole on the right */
  slides: [
    { type: "cover", img: "assets/img/hero-dhaka.svg",
      kicker: "BRTC, BUET", title: "Intelligent Adaptive Traffic Control for Dhaka City",
      text: "AI-driven video analytics + embedded controllers that adjust signal timing in real time." },
    { type: "framed", img: "assets/img/system-architecture.png",
      kicker: "System Architecture", title: "Camera → AI → STM32 → Signals",
      text: "Edge vision measures traffic density; the controller applies optimized timing; a central server coordinates the network." },
    { type: "framed", img: "assets/img/dashboard-shahbagh.png",
      kicker: "Engineering Console", title: "Live monitoring at Shahbagh",
      text: "Every signal, heartbeat and active plan visible from the Traffic Management Center — with remote plan updates." },
    { type: "framed", img: "assets/img/ai-detection.svg",
      kicker: "Computer Vision", title: "Built for Dhaka's mixed traffic",
      text: "Detects buses, cars, CNGs, rickshaws and pedestrians to estimate queue length and PCU flow." },
    { type: "framed", img: "assets/img/intersection-aerial.svg",
      kicker: "Adaptive Optimization", title: "Green time where the queue is",
      text: "Phase splits react to measured queues instead of a fixed clock. Try it in the simulation below." },
  ],

  stats: [
    { value: "24/7", label: "Real-time video analysis" },
    { value: "WAN", label: "Networked intersections" },
    { value: "2 yrs", label: "Project duration" },
    { value: "4", label: "Engineering disciplines" },
  ],

  pipeline: [
    { img: "assets/img/ai-detection.svg", title: "Video Surveillance",
      text: "Roadside cameras stream each approach. Vehicle detection, classification and tracking run on the edge." },
    { img: "assets/img/edge-ai.svg", title: "AI Processing (Jetson Orin Nano)",
      text: "On-site model inference estimates density and queue length, and an adaptive algorithm computes phase timing." },
    { img: "assets/img/controller-pcb.svg", title: "STM32 Signal Controller",
      text: "Custom PCB with an STM32 microcontroller drives red/amber/green outputs with fail-safe timing logic." },
    { img: "assets/img/wan-network.svg", title: "WAN & Central Server",
      text: "Intersections report status and heartbeats to the Traffic Management Center for monitoring and coordination." },
  ],

  /* ---------- GALLERY — add as many as you like ---------- */
  gallery: [
    { img: "assets/img/system-architecture.png", caption: "System architecture overview" },
    { img: "assets/img/dashboard-shahbagh.png", caption: "Engineering console — Shahbagh intersection" },
    { img: "assets/img/dashboard-map.png", caption: "Live signal map with countdowns" },
    { img: "assets/img/ai-detection.svg", caption: "Mixed-traffic detection (illustration)" },
    { img: "assets/img/intersection-aerial.svg", caption: "Queue measurement per approach (illustration)" },
    { img: "assets/img/controller-pcb.svg", caption: "STM32 controller board (illustration)" },
    { img: "assets/img/edge-ai.svg", caption: "Edge AI module (illustration)" },
    { img: "assets/img/wan-network.svg", caption: "WAN of intersections (illustration)" },
    { img: "assets/img/field-install.svg", caption: "Field installation (illustration)" },
    { img: "assets/img/hero-dhaka.svg", caption: "Dhaka streets at dusk (illustration)" },
    // { img: "assets/img/photos/site-visit-01.jpg", caption: "Site visit, Shahbagh" },
  ],

  /* ---------- TEAM ---------- */
  leaders: [
    { name: "Dr. Moazzem Hossain", role: "Principal Investigator",
      dept: "Professor, Department of Civil Engineering, BUET", photo: "" },
    { name: "Dr. Hadiuzzaman", role: "Principal Investigator",
      dept: "Professor, Department of Civil Engineering, BUET", photo: "" },
  ],

  // Sub-teams from the sketch: CS | Civil | Elec | ME
  teams: {
    CS: {
      label: "Computer Science",
      focus: "Computer vision models, backend server, engineering console & WAN software.",
      members: [
        { name: "Member Name", role: "Computer Vision", photo: "" },
        { name: "Member Name", role: "Backend & Dashboard", photo: "" },
      ],
    },
    Civil: {
      label: "Civil Engineering",
      focus: "Traffic engineering, signal timing design, field surveys and performance evaluation.",
      members: [
        { name: "Member Name", role: "Traffic Engineering", photo: "" },
        { name: "Member Name", role: "Field Survey & Data", photo: "" },
      ],
    },
    Elec: {
      label: "Electrical Engineering",
      focus: "PCB design, STM32 firmware (C), Jetson Orin Nano model deployment, power & signal I/O.",
      members: [
        { name: "Raihan Amin Rana", role: "Junior Embedded Engineer — PCB, STM32, Jetson", photo: "" },
        { name: "Nilotpaul Kundu", role: "Power & Hardware", photo: "" },
        { name: "Ahnaf Olee", role: "Power & Hardware", photo: "" },
      ],
    },
    ME: {
      label: "Mechanical Engineering",
      focus: "Enclosures, camera & signal mounting, thermal design and on-site installation.",
      members: [
        { name: "Member Name", role: "Enclosure Design", photo: "" },
        { name: "Member Name", role: "Installation", photo: "" },
      ],
    },
  },

  /* ---------- RESOURCES ---------- */
  funding: [
    { abbr: "GoB", name: "Government of Bangladesh", note: "Project funding" },
    { abbr: "DSCC", name: "Dhaka South City Corporation", note: "City partner" },
    { abbr: "DNCC", name: "Dhaka North City Corporation", note: "City partner" },
    { abbr: "BUET", name: "BRTC, BUET", note: "Implementing institution" },
  ],

  tech: [
    { name: "STM32 (NUCLEO-F767ZI)", tag: "Controller", text: "Cortex-M7 signal controller firmware in C, I²C peripherals, fail-safe sequencing." },
    { name: "NVIDIA Jetson Orin Nano", tag: "Edge AI", text: "Model training & on-site inference for vehicle detection and density estimation." },
    { name: "Custom PCB", tag: "Hardware", text: "Relay/driver board for signal heads, communications and power conditioning." },
    { name: "WAN + Central Server", tag: "Network", text: "Heartbeats, live status and remote plan updates from the engineering console." },
  ],

  documents: [
    { title: "Project brief", type: "PDF", url: "#" },
    { title: "System architecture", type: "PNG", url: "assets/img/system-architecture.png" },
    { title: "Source code", type: "GitHub", url: "https://github.com/aitrafficbuet" },
    { title: "Publications & reports", type: "Coming soon", url: "#" },
  ],

  /* ---------- CONTACT ---------- */
  contact: {
    address: "Bureau of Research, Testing and Consultation (BRTC), BUET, Dhaka-1000, Bangladesh",
    email: "", // ← put the project email here (contact form sends to it)
    phone: "", // optional
    mapQuery: "BUET, Dhaka",
  },
};
