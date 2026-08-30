(() => {
  "use strict";

  if (window.__homelabControlRoomLoaded) return;
  window.__homelabControlRoomLoaded = true;

  const clockFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  let clockTimer;
  let observer;

  function greetingFor(hour) {
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }

  function updateClock() {
    const clock = document.getElementById("homelab-clock");
    const date = document.getElementById("homelab-date");
    const greeting = document.getElementById("homelab-greeting");
    if (!clock || !date || !greeting) return;

    const now = new Date();
    clock.textContent = clockFormatter.format(now);
    clock.dateTime = now.toISOString();
    date.textContent = dateFormatter.format(now);
    greeting.textContent = `${greetingFor(now.getHours())}. Core services and network controls in one place.`;
  }

  function createHero() {
    const hero = document.createElement("section");
    hero.id = "homelab-hero";
    hero.setAttribute("aria-labelledby", "homelab-title");

    const copy = document.createElement("div");
    copy.className = "homelab-hero-copy";

    const eyebrow = document.createElement("p");
    eyebrow.className = "homelab-eyebrow";

    const statusDot = document.createElement("span");
    statusDot.className = "homelab-status-dot";
    statusDot.setAttribute("aria-hidden", "true");
    eyebrow.append(statusDot, document.createTextNode("Bubudog / Control plane"));

    const title = document.createElement("h1");
    title.id = "homelab-title";
    title.className = "homelab-title";
    title.textContent = "Bubudog Homelab";

    const subtitle = document.createElement("p");
    subtitle.id = "homelab-greeting";
    subtitle.className = "homelab-subtitle";

    copy.append(eyebrow, title, subtitle);

    const timePanel = document.createElement("div");
    timePanel.className = "homelab-hero-time";

    const clock = document.createElement("time");
    clock.id = "homelab-clock";
    clock.className = "homelab-clock";
    clock.setAttribute("aria-label", "Current local time");

    const date = document.createElement("div");
    date.id = "homelab-date";
    date.className = "homelab-date";

    timePanel.append(clock, date);
    hero.append(copy, timePanel);
    return hero;
  }

  function mount() {
    const informationWidgets = document.getElementById("information-widgets");
    if (!informationWidgets) return false;

    if (!document.getElementById("homelab-hero")) {
      informationWidgets.before(createHero());
    }

    updateClock();
    window.clearInterval(clockTimer);
    clockTimer = window.setInterval(updateClock, 1000);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => document.documentElement.classList.add("control-room-ready"));
    });

    return true;
  }

  if (!mount()) {
    observer = new MutationObserver(() => {
      if (mount()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateClock();
  });
})();
