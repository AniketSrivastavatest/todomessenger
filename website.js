const heroRotatorItems = [
  {
    title: "Reading the room",
    copy: "Blu scans shared context, spots action items, and helps the team confirm what matters next."
  },
  {
    title: "Organizing follow-ups",
    copy: "Blu groups decisions, owners, and pending work so conversations turn into visible execution."
  },
  {
    title: "Keeping work moving",
    copy: "Blu helps teams assign next steps, track reminders, and prevent important requests from getting buried."
  }
];

const bluFeedStates = [
  {
    status: "Reviewing launch planning messages",
    clarity: "82%",
    followups: "06"
  },
  {
    status: "Preparing ownership suggestions",
    clarity: "88%",
    followups: "04"
  },
  {
    status: "Tracking pending actions and reminders",
    clarity: "91%",
    followups: "03"
  }
];

let heroRotatorIndex = 0;
let bluFeedIndex = 0;

const heroRotatorTitle = document.querySelector("#heroRotatorTitle");
const heroRotatorCopy = document.querySelector("#heroRotatorCopy");
const bluStatusText = document.querySelector("#bluStatusText");
const metricClarity = document.querySelector("#metricClarity");
const metricFollowups = document.querySelector("#metricFollowups");
const capabilityTabs = Array.from(document.querySelectorAll(".capability-tab"));
const bluPanels = Array.from(document.querySelectorAll(".blu-panel"));
const bluFeedItems = Array.from(document.querySelectorAll(".blu-feed-item"));

function rotateHeroCard() {
  heroRotatorIndex = (heroRotatorIndex + 1) % heroRotatorItems.length;
  const item = heroRotatorItems[heroRotatorIndex];
  if (heroRotatorTitle) heroRotatorTitle.textContent = item.title;
  if (heroRotatorCopy) heroRotatorCopy.textContent = item.copy;
}

function rotateBluFeed() {
  bluFeedIndex = (bluFeedIndex + 1) % bluFeedStates.length;
  const state = bluFeedStates[bluFeedIndex];
  if (bluStatusText) bluStatusText.textContent = state.status;
  if (metricClarity) metricClarity.textContent = state.clarity;
  if (metricFollowups) metricFollowups.textContent = state.followups;
  bluFeedItems.forEach((item, index) => {
    item.classList.toggle("active", index === bluFeedIndex);
  });
}

function setBluPanel(panelId) {
  capabilityTabs.forEach((button) => {
    const active = button.dataset.panel === panelId;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  bluPanels.forEach((panel) => {
    const active = panel.id === `blu-panel-${panelId}`;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  });
}

capabilityTabs.forEach((button) => {
  button.addEventListener("click", () => setBluPanel(button.dataset.panel));
});

window.setInterval(rotateHeroCard, 3200);
window.setInterval(rotateBluFeed, 2600);
