const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "demo-video", "onboarding");
const segmentsDir = path.join(outDir, "segments");
const ffmpeg = path.join(root, "tools", "ffmpeg-8.1-essentials_build", "bin", "ffmpeg.exe");
const fontRegular = "C\\:/Windows/Fonts/arial.ttf";
const fontBold = "C\\:/Windows/Fonts/arialbd.ttf";

fs.mkdirSync(segmentsDir, { recursive: true });

const colors = {
  blue: "0x008ccf",
  blueDark: "0x00679b",
  ink: "0x101827",
  muted: "0x627386",
  pale: "0xedf8fd",
  softBlue: "0xdff3ff",
  line: "0xd6e3ea",
  white: "0xffffff",
  offWhite: "0xf7fbfd",
  navy: "0x12243a",
  green: "0x2fbf71",
  yellow: "0xffb800"
};

const scenes = [
  {
    duration: 7,
    kicker: "WELCOME",
    title: "Welcome to TodoMessenger",
    subtitle: "Work conversations. Real tasks.",
    visual: "welcome",
    voice: "Welcome to TodoMessenger, the workplace messenger that helps teams turn conversations into assigned, trackable tasks."
  },
  {
    duration: 10,
    kicker: "STEP 1",
    title: "Sign in with your work email",
    subtitle: "The right people join the right company workspace.",
    visual: "email",
    voice: "Start with your work email. TodoMessenger checks your workspace and sends a verification code so the right people join the right company."
  },
  {
    duration: 9,
    kicker: "STEP 2",
    title: "Complete your profile",
    subtitle: "Add your name, status, and role context.",
    visual: "profile",
    voice: "Complete your profile so teammates know who you are, what role you have, and whether you are available."
  },
  {
    duration: 12,
    kicker: "FOR ADMINS",
    title: "Create the workspace and invite employees",
    subtitle: "Choose Admin, Team Lead, or Employee.",
    visual: "admin",
    voice: "Admins can open the Workspace tab, confirm the company domain, invite employees, and choose whether someone joins as an admin, team lead, or employee."
  },
  {
    duration: 10,
    kicker: "FOR EMPLOYEES",
    title: "Start from recent chats",
    subtitle: "A clean messenger interface with tasks built in.",
    visual: "employee",
    voice: "Employees land directly in a clean chat interface, with recent conversations, tasks, and workspace access based on their role."
  },
  {
    duration: 13,
    kicker: "CHAT TO TASK",
    title: "Turn any message into a task",
    subtitle: "Assign it. Add a due date. Set a reminder.",
    visual: "task",
    voice: "When a message becomes an action item, create a task directly from the chat. Assign it, add a due date, and set a reminder."
  },
  {
    duration: 12,
    kicker: "BLU",
    title: "Ask Blu for help",
    subtitle: "@blu suggest tasks from this chat",
    visual: "blu",
    voice: "Blu can review approved chat context, suggest tasks, summarize decisions, and help teams catch follow-ups before they disappear."
  },
  {
    duration: 10,
    kicker: "INTEGRATIONS",
    title: "Connect company tools",
    subtitle: "Chats, emails, and meetings become one action layer.",
    visual: "integrations",
    voice: "TodoMessenger is designed to connect with the tools your company already uses, so work from chats, emails, and meetings can become one action layer."
  },
  {
    duration: 7,
    kicker: "YOU ARE READY",
    title: "Chat naturally",
    subtitle: "Capture work automatically.",
    visual: "closing",
    voice: "You are ready. Chat naturally, capture work automatically, and keep every follow-up moving."
  }
];

function escapeText(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/,/g, "\\,")
    .replace(/%/g, "\\%");
}

function wrapText(text, maxChars = 28) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function drawText(text, x, y, size, color = colors.ink, bold = false) {
  return `drawtext=fontfile='${bold ? fontBold : fontRegular}':text='${escapeText(text)}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${color}`;
}

function drawLines(lines, x, y, size, color = colors.ink, bold = false, gap = 1.16) {
  return lines.map((line, index) => drawText(line, x, y + Math.round(index * size * gap), size, color, bold));
}

function drawBox(x, y, w, h, color, thickness = "fill") {
  return `drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=${color}:t=${thickness}`;
}

function strokeBox(x, y, w, h, color = colors.line, thickness = 3) {
  return drawBox(x, y, w, h, color, thickness);
}

function baseFilters(scene, index) {
  const filters = [
    drawBox(0, 0, 1280, 58, colors.blue),
    drawText("TodoMessenger", 52, 17, 18, colors.white, true),
    drawText(`Onboarding ${String(index + 1).padStart(2, "0")}`, 1085, 18, 15, colors.white, true),
    drawText(scene.kicker, 72, 126, 19, colors.blue, true),
    ...drawLines(wrapText(scene.title, 22), 72, 174, 43, colors.ink, true),
    ...drawLines(wrapText(scene.subtitle, 34), 72, 320, 27, colors.muted, false, 1.22),
    drawBox(72, 626, 460, 1, colors.line),
    drawText("First 10 minutes with TodoMessenger", 72, 646, 18, colors.muted, false)
  ];
  return filters;
}

function card(filters, x, y, w, h) {
  filters.push(drawBox(x, y, w, h, colors.white));
  filters.push(strokeBox(x, y, w, h));
}

function pill(filters, text, x, y, w = 150, color = colors.pale) {
  filters.push(drawBox(x, y, w, 44, color));
  filters.push(strokeBox(x, y, w, 44, colors.line, 2));
  filters.push(drawText(text, x + 18, y + 13, 19, colors.ink, true));
}

function phone(filters, x, y) {
  filters.push(drawBox(x, y, 300, 520, colors.navy));
  filters.push(drawBox(x + 18, y + 38, 264, 458, colors.offWhite));
  filters.push(drawBox(x + 36, y + 72, 228, 42, colors.blue));
  filters.push(drawText("TodoMessenger", x + 58, y + 84, 18, colors.white, true));
}

function visualFilters(scene) {
  const filters = [];
  switch (scene.visual) {
    case "welcome":
      phone(filters, 820, 100);
      filters.push(drawBox(872, 235, 198, 56, colors.softBlue));
      filters.push(drawText("Launch Team", 892, 253, 20, colors.ink, true));
      filters.push(drawBox(900, 335, 170, 82, colors.white));
      filters.push(strokeBox(900, 335, 170, 82));
      filters.push(drawText("Task created", 922, 357, 17, colors.blue, true));
      break;
    case "email":
      card(filters, 725, 170, 440, 320);
      filters.push(drawText("Work email", 770, 232, 24, colors.ink, true));
      filters.push(drawBox(770, 280, 330, 52, colors.offWhite));
      filters.push(strokeBox(770, 280, 330, 52, colors.line, 2));
      filters.push(drawText("maia@company.com", 792, 296, 22, colors.muted, false));
      filters.push(drawBox(770, 380, 180, 50, colors.blue));
      filters.push(drawText("Send code", 808, 395, 21, colors.white, true));
      break;
    case "profile":
      card(filters, 745, 165, 400, 335);
      filters.push(drawBox(790, 215, 72, 72, colors.blue));
      filters.push(drawText("MS", 807, 238, 27, colors.white, true));
      filters.push(drawText("Maia Sharma", 790, 325, 30, colors.ink, true));
      filters.push(drawText("Available", 790, 370, 24, colors.muted, false));
      pill(filters, "Employee", 790, 425, 150);
      break;
    case "admin":
      card(filters, 705, 150, 500, 370);
      filters.push(drawText("COMPANY WORKSPACE", 750, 200, 20, colors.blue, true));
      filters.push(drawText("google.com Workspace", 750, 247, 30, colors.ink, true));
      filters.push(drawBox(750, 312, 335, 52, colors.offWhite));
      filters.push(strokeBox(750, 312, 335, 52, colors.line, 2));
      filters.push(drawText("employee@company.com", 770, 328, 22, colors.muted, false));
      pill(filters, "Team Lead", 750, 390, 160);
      filters.push(drawBox(940, 390, 142, 46, colors.blue));
      filters.push(drawText("Invite", 982, 403, 20, colors.white, true));
      break;
    case "employee":
      card(filters, 690, 145, 520, 395);
      filters.push(drawBox(690, 145, 170, 395, colors.offWhite));
      filters.push(drawText("Chats", 720, 190, 24, colors.blue, true));
      filters.push(drawBox(720, 235, 110, 50, colors.pale));
      filters.push(drawText("Team", 742, 250, 19, colors.ink, true));
      filters.push(drawBox(885, 188, 285, 64, colors.softBlue));
      filters.push(drawText("Please send the report", 910, 208, 20, colors.ink, false));
      filters.push(drawBox(950, 330, 180, 85, colors.white));
      filters.push(strokeBox(950, 330, 180, 85));
      filters.push(drawText("Add task", 978, 355, 20, colors.blue, true));
      break;
    case "task":
      card(filters, 735, 145, 440, 395);
      filters.push(drawText("TASK", 780, 198, 20, colors.blue, true));
      filters.push(drawText("Send client report", 780, 246, 30, colors.ink, true));
      filters.push(drawText("Assigned to: Maia", 780, 326, 24, colors.muted, false));
      filters.push(drawText("Due: Tomorrow", 780, 371, 24, colors.muted, false));
      filters.push(drawText("Reminder: 9 AM", 780, 416, 24, colors.muted, false));
      filters.push(drawBox(780, 465, 170, 46, colors.green));
      filters.push(drawText("Confirmed", 812, 478, 20, colors.white, true));
      break;
    case "blu":
      card(filters, 705, 170, 510, 320);
      filters.push(drawBox(745, 220, 420, 56, colors.softBlue));
      filters.push(drawText("@blu suggest tasks from this chat", 770, 238, 22, colors.ink, false));
      filters.push(drawBox(745, 330, 390, 105, colors.pale));
      filters.push(drawText("Blu", 770, 358, 21, colors.blue, true));
      filters.push(drawText("I found 3 follow-ups.", 770, 396, 25, colors.ink, true));
      break;
    case "integrations":
      [["Gmail", 720, 180], ["Teams", 910, 180], ["Meet", 1100, 180], ["Jira", 815, 310], ["Asana", 1005, 310]].forEach(([label, x, y]) => {
        pill(filters, label, x, y, 132, colors.white);
      });
      filters.push(drawBox(860, 460, 230, 56, colors.blue));
      filters.push(drawText("Action layer", 915, 477, 22, colors.white, true));
      break;
    case "closing":
      filters.push(drawBox(840, 190, 240, 240, colors.pale));
      filters.push(drawBox(900, 250, 120, 120, colors.blue));
      filters.push(drawText("TM", 929, 286, 45, colors.white, true));
      filters.push(drawText("Ready for your pilot team", 765, 500, 28, colors.ink, true));
      break;
    default:
      break;
  }
  return filters;
}

const segmentPaths = [];
const voiceover = [];

scenes.forEach((scene, index) => {
  const segmentPath = path.join(segmentsDir, `onboarding-${String(index + 1).padStart(2, "0")}.mp4`);
  const filters = [...baseFilters(scene, index), ...visualFilters(scene)].join(",");
  execFileSync(ffmpeg, [
    "-y",
    "-f", "lavfi",
    "-i", `color=c=white:s=1280x720:d=${scene.duration}:r=30`,
    "-vf", filters,
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-threads", "1",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    segmentPath
  ], { stdio: "inherit" });
  segmentPaths.push(segmentPath);
  voiceover.push(scene.voice);
});

const concatFile = path.join(outDir, "onboarding-segments.txt");
fs.writeFileSync(concatFile, segmentPaths.map((segment) => `file '${segment.replace(/\\/g, "/")}'`).join("\n"));
fs.writeFileSync(path.join(outDir, "onboarding-voiceover.txt"), voiceover.join("\n\n"));

const videoPath = path.join(outDir, "todomessenger-onboarding-silent.mp4");
execFileSync(ffmpeg, [
  "-y",
  "-f", "concat",
  "-safe", "0",
  "-i", concatFile,
  "-c", "copy",
  videoPath
], { stdio: "inherit" });

console.log(`Created ${videoPath}`);
console.log(`Voiceover script: ${path.join(outDir, "onboarding-voiceover.txt")}`);
