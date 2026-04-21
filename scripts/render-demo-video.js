const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "demo-video");
const segmentsDir = path.join(outDir, "segments");
const ffmpeg = path.join(root, "tools", "ffmpeg-8.1-essentials_build", "bin", "ffmpeg.exe");
const fontRegular = "C\\:/Windows/Fonts/arial.ttf";
const fontBold = "C\\:/Windows/Fonts/arialbd.ttf";

fs.mkdirSync(segmentsDir, { recursive: true });

const colors = {
  blue: "0x008ccf",
  blueDark: "0x00679b",
  navy: "0x10243a",
  ink: "0x111827",
  muted: "0x607287",
  pale: "0xedf8fd",
  softBlue: "0xdff3ff",
  line: "0xd6e3ea",
  warning: "0xfff4f1",
  warningLine: "0xffd1c7",
  warningText: "0xa83219",
  white: "0xffffff",
  offWhite: "0xf7fbfd"
};

const scenes = [
  {
    duration: 6,
    kicker: "THE PROBLEM",
    title: "Tasks get lost in conversations.",
    subtitle: "Chat. Email. Meetings. Follow-ups.",
    visual: "scatter",
    voice: "Work does not always start in a project management tool. It starts in chat, email, and meetings."
  },
  {
    duration: 7,
    kicker: "THE GAP",
    title: "The follow-up disappears.",
    bullets: ["Action items stay inside messages.", "Managers chase manually.", "Employees forget what was agreed."],
    visual: "problem",
    voice: "Employees discuss what needs to be done, but action items are often never captured, assigned, or followed up."
  },
  {
    duration: 7,
    kicker: "THE PRODUCT",
    title: "Meet TodoMessenger.",
    subtitle: "AI-powered workplace messaging that turns conversations into tasks.",
    visual: "product",
    voice: "TodoMessenger is an AI-powered workplace messenger that turns everyday conversations into trackable work."
  },
  {
    duration: 8,
    kicker: "WORKSPACE",
    title: "Built for company teams.",
    bullets: ["Company workspace", "Admin invites", "Employee roles", "Team lead assignment"],
    visual: "workspace",
    voice: "Companies can create a workspace, invite employees, and give admins, team leads, and employees the right view."
  },
  {
    duration: 8,
    kicker: "CHAT TO TASK",
    title: "Turn any message into a task.",
    subtitle: "Please send the client report tomorrow.",
    visual: "chatTask",
    voice: "When a message becomes an action item, users can create a task directly inside the chat."
  },
  {
    duration: 8,
    kicker: "ASSIGNMENT",
    title: "Assign work without leaving chat.",
    bullets: ["Owner", "Priority", "Due date", "Reminder"],
    visual: "assignment",
    voice: "Tasks can be assigned, prioritized, given due dates, and followed up with reminders."
  },
  {
    duration: 8,
    kicker: "AI ASSISTANT",
    title: "Blu finds hidden follow-ups.",
    subtitle: "@blu suggest tasks from this chat",
    visual: "blu",
    voice: "Blu, the built-in AI assistant, reads recent chat context and suggests tasks, summaries, and follow ups."
  },
  {
    duration: 7,
    kicker: "INTEGRATIONS",
    title: "From every work conversation.",
    subtitle: "Your company tools connect to one action layer.",
    visual: "integrations",
    voice: "The vision is to connect the tools employees already use into one action layer."
  },
  {
    duration: 6,
    kicker: "THE PROMISE",
    title: "One action layer for modern work.",
    bullets: ["Conversations become tasks.", "Tasks get owners.", "Follow-ups do not disappear."],
    visual: "promise",
    voice: "TodoMessenger makes workplace conversations actionable by default."
  },
  {
    duration: 5,
    kicker: "TODOMESSENGER",
    title: "TodoMessenger",
    subtitle: "Work conversations. Real tasks.",
    visual: "closing",
    voice: "TodoMessenger makes workplace conversations actionable by default."
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

function wrapText(text, maxChars = 24) {
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

function drawWrapped(text, x, y, size, maxChars, color = colors.ink, bold = false, gap = 1.16) {
  return drawLines(wrapText(text, maxChars), x, y, size, color, bold, gap);
}

function drawBox(x, y, w, h, color, thickness = "fill") {
  return `drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=${color}:t=${thickness}`;
}

function strokeBox(x, y, w, h, color, thickness = 3) {
  return drawBox(x, y, w, h, color, thickness);
}

function baseFilters(scene, index) {
  const f = [
    drawBox(0, 0, 1280, 56, colors.blue),
    drawText("TodoMessenger", 52, 17, 18, colors.white, true),
    drawText(`Demo ${String(index + 1).padStart(2, "0")}`, 1146, 18, 15, colors.white, true),
    drawText(scene.kicker, 72, 126, 19, colors.blue, true)
  ];

  const titleLines = wrapText(scene.title, 22);
  f.push(...drawLines(titleLines, 72, 174, 43, colors.ink, true));

  const detailY = 174 + titleLines.length * 54 + 16;
  if (scene.bullets) {
    scene.bullets.forEach((bullet, bulletIndex) => {
      const y = detailY + bulletIndex * 42;
      f.push(drawBox(76, y + 11, 10, 10, colors.blue));
      f.push(drawText(bullet, 104, y, 25, colors.ink, true));
    });
  } else {
    f.push(...drawWrapped(scene.subtitle, 72, detailY, 27, 33, colors.muted, false, 1.2));
  }

  f.push(drawBox(72, 625, 440, 1, colors.line));
  f.push(drawText("AI workplace messaging for accountable teams", 72, 646, 18, colors.muted, false));
  return f;
}

function pill(f, label, x, y, w = 150) {
  f.push(drawBox(x, y, w, 42, colors.pale));
  f.push(strokeBox(x, y, w, 42, colors.line, 2));
  f.push(drawText(label, x + 18, y + 12, 20, colors.ink, true));
}

function logoBadge(f, type, x, y, size = 76) {
  card(f, x, y, size, size);
  const pad = Math.round(size * 0.18);
  const icon = size - pad * 2;
  const ix = x + pad;
  const iy = y + pad;

  switch (type) {
    case "whatsapp":
      f.push(drawBox(ix, iy, icon, icon, "0x23c161"));
      f.push(drawText("()", ix + 16, iy + 14, 24, colors.white, true));
      f.push(drawBox(ix + 38, iy + 42, 14, 14, colors.white));
      break;

    case "gmail":
      f.push(drawBox(ix, iy + 10, icon, icon - 16, colors.white));
      f.push(strokeBox(ix, iy + 10, icon, icon - 16, "0xd93025", 4));
      f.push(drawBox(ix + 7, iy + 18, icon - 14, 5, "0xd93025"));
      f.push(drawBox(ix + 7, iy + 36, icon - 14, 5, "0x4285f4"));
      break;

    case "teams":
      f.push(drawBox(ix, iy, icon, icon, "0x6264a7"));
      f.push(drawBox(ix - 8, iy + 18, 24, 28, "0x464775"));
      f.push(drawText("T", ix + 21, iy + 13, 32, colors.white, true));
      break;

    case "zoom":
      f.push(drawBox(ix, iy, icon, icon, "0x2d8cff"));
      f.push(drawBox(ix + 13, iy + 20, 34, 24, colors.white));
      f.push(drawBox(ix + 45, iy + 26, 12, 12, colors.white));
      break;

    case "meet":
      f.push(drawBox(ix + 4, iy + 14, 36, 34, "0x34a853"));
      f.push(drawBox(ix + 34, iy + 14, 18, 18, "0xfbbc05"));
      f.push(drawBox(ix + 34, iy + 30, 18, 18, "0xea4335"));
      f.push(drawBox(ix + 52, iy + 22, 14, 18, "0x4285f4"));
      break;

    case "jira":
      f.push(drawText("◆", ix + 8, iy - 2, 54, "0x0052cc", true));
      f.push(drawText("◆", ix + 25, iy + 14, 36, "0x2684ff", true));
      break;

    case "asana":
      f.push(drawText("●", ix + 8, iy - 4, 33, "0xff7a59", true));
      f.push(drawText("●", ix + 28, iy + 24, 33, "0xff7a59", true));
      f.push(drawText("●", ix + 48, iy - 4, 33, "0xff7a59", true));
      break;

    default:
      f.push(drawBox(ix, iy, icon, icon, colors.blue));
      break;
  }
}

function card(f, x, y, w, h) {
  f.push(drawBox(x, y, w, h, colors.white));
  f.push(strokeBox(x, y, w, h, colors.line, 3));
}

function visualFilters(name) {
  const f = [];

  switch (name) {
    case "scatter":
      [["whatsapp", 720, 150], ["teams", 920, 210], ["gmail", 720, 270], ["zoom", 920, 330], ["meet", 720, 390]].forEach(([type, x, y]) => {
        logoBadge(f, type, x, y, 76);
      });
      f.push(drawBox(850, 495, 190, 52, colors.blue));
      f.push(drawText("Tasks", 914, 511, 22, colors.white, true));
      break;

    case "problem":
      card(f, 750, 170, 420, 330);
      f.push(drawBox(750, 170, 420, 330, colors.warning));
      f.push(strokeBox(750, 170, 420, 330, colors.warningLine, 3));
      f.push(drawText("Follow-up missed", 800, 240, 34, colors.warningText, true));
      ["No owner", "No due date", "No reminder"].forEach((label, index) => {
        f.push(drawText(label, 800, 315 + index * 48, 26, colors.ink, true));
      });
      break;

    case "product":
      laptop(f, 660, 150);
      break;

    case "workspace":
      card(f, 735, 150, 430, 360);
      f.push(drawText("COMPANY WORKSPACE", 775, 204, 20, colors.blue, true));
      f.push(drawText("google.com Workspace", 775, 252, 31, colors.ink, true));
      f.push(drawBox(775, 322, 300, 52, colors.pale));
      f.push(drawText("employee@company.com", 795, 337, 22, colors.ink, false));
      f.push(drawBox(775, 410, 150, 48, colors.blue));
      f.push(drawText("Invite", 826, 423, 21, colors.white, true));
      break;

    case "chatTask":
      phone(f, 840, 95);
      break;

    case "assignment":
      card(f, 735, 165, 430, 340);
      f.push(drawText("TASK", 775, 218, 20, colors.blue, true));
      f.push(drawText("Send client report", 775, 268, 31, colors.ink, true));
      ["Assigned to: Maia", "Due: Tomorrow", "Reminder: 9 AM"].forEach((label, index) => {
        f.push(drawText(label, 775, 352 + index * 45, 24, colors.muted, false));
      });
      break;

    case "blu":
      card(f, 710, 165, 500, 310);
      f.push(drawBox(750, 215, 420, 55, colors.softBlue));
      f.push(drawText("@blu suggest tasks from this chat", 775, 232, 22, colors.ink, false));
      f.push(drawBox(750, 320, 390, 105, colors.pale));
      f.push(drawText("Blu", 775, 348, 21, colors.blue, true));
      f.push(drawText("I found 3 follow-ups.", 775, 386, 25, colors.ink, true));
      break;

    case "integrations":
      [["gmail", 710, 160], ["teams", 900, 160], ["zoom", 1090, 160], ["meet", 710, 280], ["jira", 900, 280], ["asana", 1090, 280]].forEach(([type, x, y]) => {
        logoBadge(f, type, x, y, 82);
      });
      f.push(drawBox(850, 430, 230, 56, colors.blue));
      f.push(drawText("Tasks", 931, 447, 23, colors.white, true));
      break;

    case "promise":
      phone(f, 835, 105);
      break;

    case "closing":
      f.push(drawBox(830, 180, 270, 270, colors.pale));
      f.push(drawBox(890, 240, 150, 150, colors.blue));
      f.push(drawText("TM", 924, 287, 54, colors.white, true));
      f.push(drawText("Built for Station F-ready pilots", 768, 505, 27, colors.ink, true));
      break;

    default:
      break;
  }

  return f;
}

function laptop(f, x, y) {
  card(f, x, y, 520, 320);
  f.push(drawBox(x, y, 520, 48, "0xeef5f9"));
  f.push(drawBox(x + 24, y + 72, 155, 220, colors.offWhite));
  f.push(drawBox(x + 205, y + 72, 285, 220, "0xf0f7fb"));
  f.push(drawBox(x + 40, y + 102, 120, 40, colors.pale));
  f.push(drawText("Workspace", x + 55, y + 114, 16, colors.ink, true));
  f.push(drawBox(x + 230, y + 112, 180, 45, colors.softBlue));
  f.push(drawText("Can you send this?", x + 248, y + 126, 16, colors.ink, false));
  f.push(drawBox(x + 290, y + 192, 170, 80, colors.white));
  f.push(strokeBox(x + 290, y + 192, 170, 80, colors.line, 2));
  f.push(drawText("ADD TASK", x + 308, y + 210, 15, colors.blue, true));
  f.push(drawText("Client report", x + 308, y + 241, 20, colors.ink, true));
}

function phone(f, x, y) {
  f.push(drawBox(x, y, 280, 510, colors.navy));
  f.push(drawBox(x + 16, y + 38, 248, 448, colors.offWhite));
  f.push(drawBox(x + 34, y + 72, 212, 42, colors.blue));
  f.push(drawText("TodoMessenger", x + 52, y + 84, 18, colors.white, true));
  f.push(drawBox(x + 34, y + 142, 212, 56, colors.pale));
  f.push(drawText("Launch Squad", x + 52, y + 160, 18, colors.ink, true));
  f.push(drawBox(x + 80, y + 245, 150, 58, colors.softBlue));
  f.push(drawText("Please send", x + 98, y + 263, 16, colors.ink, false));
  f.push(drawBox(x + 34, y + 348, 212, 92, colors.white));
  f.push(strokeBox(x + 34, y + 348, 212, 92, colors.line, 2));
  f.push(drawText("TASK CREATED", x + 52, y + 368, 14, colors.blue, true));
  f.push(drawText("Send client report", x + 52, y + 402, 17, colors.ink, true));
}

const segmentPaths = [];
const voiceover = [];

scenes.forEach((scene, index) => {
  const segmentPath = path.join(segmentsDir, `segment-${String(index + 1).padStart(2, "0")}.mp4`);
  const filters = [...baseFilters(scene, index), ...visualFilters(scene.visual)].join(",");
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

const concatFile = path.join(outDir, "segments.txt");
fs.writeFileSync(concatFile, segmentPaths.map((segment) => `file '${segment.replace(/\\/g, "/")}'`).join("\n"));
fs.writeFileSync(path.join(outDir, "voiceover.txt"), voiceover.join("\n\n"));

const silentPath = path.join(outDir, "todomessenger-demo-silent.mp4");
execFileSync(ffmpeg, [
  "-y",
  "-f", "concat",
  "-safe", "0",
  "-i", concatFile,
  "-c", "copy",
  silentPath
], { stdio: "inherit" });

console.log(`Created ${silentPath}`);
console.log(`Voiceover script: ${path.join(outDir, "voiceover.txt")}`);
