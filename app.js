// ---- Data (Upgraded + no-accent support) ----
const CATALOG = [
  {
    category: "Cơm",
    items: [
      { name: "cơm gà", price: 40000 },
      { name: "cơm sườn", price: 45000 },
      { name: "cơm tấm", price: 45000 },
      { name: "cơm bò xào", price: 50000 },
      { name: "cơm chay", price: 35000 },
      { name: "cơm cá kho", price: 48000 },
    ],
  },
  {
    category: "Bún/Phở",
    items: [
      { name: "bún bò", price: 45000 },
      { name: "bún chả", price: 45000 },
      { name: "bún thịt nướng", price: 48000 },
      { name: "phở bò", price: 50000 },
      { name: "phở gà", price: 48000 },
      { name: "hủ tiếu", price: 45000 },
    ],
  },
  {
    category: "Mì & Món xào",
    items: [
      { name: "mì xào", price: 40000 },
      { name: "mì xào bò", price: 48000 },
      { name: "mì xào hải sản", price: 52000 },
      { name: "mì xào chay", price: 38000 },
      { name: "hủ tiếu xào", price: 48000 },
    ],
  },
  {
    category: "Món khác",
    items: [
      { name: "bánh mì trứng", price: 25000 },
      { name: "trứng ốp la", price: 15000 },
      { name: "đậu hũ sốt cà", price: 30000 },
      { name: "canh rau", price: 10000 },
      { name: "gà rán", price: 30000 },
    ],
  },
  {
    category: "Đồ uống",
    items: [
      { name: "trà đá", price: 5000 },
      { name: "nước suối", price: 10000 },
      { name: "cà phê sữa", price: 18000 },
      { name: "nước cam", price: 20000 },
      { name: "trà tắc", price: 15000 },
    ],
  },
];

const MENU = Object.fromEntries(CATALOG.flatMap(c => c.items.map(it => [it.name, it.price])));
const SIZE_UP = { "nhỏ": 0, "vừa": 0, "lớn": 10000 };
const ADDON_COST = 5000;
const PACK_FEE = 2000;
const ADDON_LIST = ["trứng", "chả", "rau", "đậu hũ", "xíu mại", "gà xé"];

// ---- Accent-insensitive helpers ----
function toAscii(s) {
  return String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/\s+/g, " ").trim();
}
const NAME_INDEX = Object.keys(MENU).map(name => ({ norm: toAscii(name), name }));

// ---- State ----
const State = {
  IDLE: "IDLE",
  ORDER_OPEN: "ORDER_OPEN", CONFIG_ITEM: "CONFIG_ITEM", ASK_QTY: "ASK_QTY",
  ASK_ADDONS: "ASK_ADDONS", ASK_SPICY: "ASK_SPICY", ASK_NOTE: "ASK_NOTE",
  READY_TO_CLOSE_ITEM: "READY_TO_CLOSE_ITEM", ASK_DINE: "ASK_DINE",
  ASK_TIME: "ASK_TIME", ASK_PAY: "ASK_PAY", ASK_CONTACT: "ASK_CONTACT",
  ASK_CONFIRM: "ASK_CONFIRM",
  AFTER_DONE: "AFTER_DONE",
  CANCELLED: "CANCELLED",
  ENDED: "ENDED"
};

let state = State.IDLE;
let order = resetOrder();

function resetOrder() {
  return { items: [], current: null, dine: null, pickup: null, pay: null, contact: null, id: null };
}

// ---- UI ----
const chat = document.getElementById("chat");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");
const flowStatus = document.getElementById("flowStatus");
const orderIdPill = document.getElementById("orderIdPill");

function setStatus(s) { flowStatus.textContent = s; }
function scrollBottom() { chat.scrollTop = chat.scrollHeight; }

function msg(text, role = "bot") {
  const wrap = document.createElement("div");
  wrap.className = `flex ${role === "bot" ? "justify-start" : "justify-end"}`;
  const bubble = document.createElement("div");
  bubble.className = `max-w-[80%] whitespace-normal break-words px-3 py-2 rounded-2xl border ${
    role === "bot" ? "bg-slate-800 border-slate-700" : "bg-slate-700 border-slate-600"
  }`;
  bubble.textContent = text;
  wrap.appendChild(bubble);
  chat.appendChild(wrap);
  scrollBottom();
  return bubble;
}

function msgRich(html, role = "bot") {
  const wrap = document.createElement("div");
  wrap.className = `flex ${role === "bot" ? "justify-start" : "justify-end"}`;
  const bubble = document.createElement("div");
  bubble.className = `max-w-[90%] whitespace-normal break-words px-3 py-2 rounded-2xl border ${
    role === "bot" ? "bg-slate-800 border-slate-700" : "bg-slate-700 border-slate-600"
  }`;
  bubble.innerHTML = html;
  wrap.appendChild(bubble);
  chat.appendChild(wrap);
  scrollBottom();
  return bubble;
}

/** Single-choice buttons */
function msgChoices(prompt, choices, onSelect) {
  const bubble = msg(prompt, "bot");
  const grid = document.createElement("div");
  grid.className = "mt-2 flex flex-wrap gap-2";
  choices.forEach(({label, value}) => {
    const btn = document.createElement("button");
    btn.className = "px-3 py-1.5 text-xs rounded-full border border-slate-600 hover:bg-slate-700";
    btn.textContent = label;
    btn.addEventListener("click", () => {
      disableButtons(grid);
      msg(label, "user");
      onSelect(value ?? label);
    });
    grid.appendChild(btn);
  });
  bubble.appendChild(grid);
  scrollBottom();
}

/** Multi-choice buttons */
function msgChoicesMulti(prompt, choices, onDone) {
  const bubble = msg(prompt, "bot");
  const grid = document.createElement("div");
  grid.className = "mt-2 flex flex-wrap gap-2";
  const picked = new Set();

  function makeBtn(label) {
    const btn = document.createElement("button");
    btn.className = "px-3 py-1.5 text-xs rounded-full border border-slate-600 hover:bg-slate-700";
    btn.textContent = label;
    btn.addEventListener("click", () => {
      if (picked.has(label)) { picked.delete(label); btn.classList.remove("bg-blue-500","text-slate-900","border-blue-500"); }
      else { picked.add(label); btn.classList.add("bg-blue-500","text-slate-900","border-blue-500"); }
    });
    return btn;
  }

  choices.forEach(({label}) => grid.appendChild(makeBtn(label)));

  const noneBtn = document.createElement("button");
  noneBtn.className = "px-3 py-1.5 text-xs rounded-full border border-slate-600 hover:bg-slate-700";
  noneBtn.textContent = "Không topping";
  noneBtn.addEventListener("click", () => {
    disableButtons(grid);
    msg("Không topping", "user");
    onDone([]);
  });

  const doneBtn = document.createElement("button");
  doneBtn.className = "px-3 py-1.5 text-xs rounded-full border border-blue-500 text-blue-300 hover:bg-slate-700";
  doneBtn.textContent = "Xong toppings";
  doneBtn.addEventListener("click", () => {
    disableButtons(grid);
    const arr = Array.from(picked);
    msg(arr.length ? `Topping: ${arr.join(", ")}` : "Không topping", "user");
    onDone(arr);
  });

  grid.appendChild(noneBtn);
  grid.appendChild(doneBtn);
  bubble.appendChild(grid);
  scrollBottom();
}

function disableButtons(container) {
  Array.from(container.children).forEach(b => {
    b.disabled = true;
    b.classList.add("opacity-60","pointer-events-none");
  });
}

function quick(text) { input.value = text; handleSend(); }

// ---- Menu UI helpers ----
function formatPrice(v) { return v.toLocaleString("vi-VN") + "đ"; }

function createMenuTableHTML() {
  const rows = CATALOG.map(cat => {
    const items = cat.items.map(it => `
      <tr class="text-xs">
        <td class="py-1 pr-3">${it.name}</td>
        <td class="py-1 text-right tabular-nums">${formatPrice(it.price)}</td>
      </tr>
    `).join("");
    return `
      <div class="mb-3">
        <div class="font-semibold text-sm mb-1">${cat.category}</div>
        <table class="w-full">
          <tbody>${items}</tbody>
        </table>
      </div>
    `;
  }).join("");

  return `
    <div class="text-sm">
      <div class="font-semibold mb-2">Thực đơn & Bảng giá hôm nay</div>
      <div class="rounded-xl border border-slate-700 p-3 bg-slate-900/40">
        ${rows}
      </div>
      <div class="mt-3 text-xs text-slate-300">
        • Size lớn +${formatPrice(SIZE_UP["lớn"])} • Hộp mang đi +${formatPrice(PACK_FEE)}
      </div>
    </div>
  `;
}

// ---- Close old picker if any ----
function closeOpenPickers() {
  document.querySelectorAll(".menu-picker-bubble").forEach(b => b.remove());
}

/** Picker */
function msgMenuPicker(onSelect) {
  const allItems = CATALOG.flatMap(c => c.items.map(it => ({ ...it, category: c.category })));
  const categories = ["Tất cả", ...Array.from(new Set(CATALOG.map(c => c.category)))];

  const bubble = msgRich(`
    <div class="text-sm">
      <div class="font-semibold mb-2">Chọn món</div>
      <div class="rounded-xl border border-slate-700 p-3 bg-slate-900/40 w-[min(520px,92vw)]">
        <div class="flex flex-wrap gap-1.5 mb-2" id="catChips">
          ${categories.map((c,i)=>`
            <button data-cat="${c}"
              class="chip ${i===0?'chip-active':''} px-2.5 py-1 text-[11px] rounded-full border ${i===0?'border-blue-500 text-blue-300':'border-slate-600 text-slate-200'} hover:bg-slate-700">
              ${c}
            </button>`).join("")}
        </div>
        <div class="flex items-center gap-2">
          <input id="menuSearch" type="text" placeholder="Tìm món (vd: pho, com, bun)…"
            class="flex-1 text-xs px-2 py-1 rounded-md bg-slate-700 border border-slate-600 outline-none">
          <span id="resultCount" class="text-[11px] text-slate-400 whitespace-nowrap"></span>
        </div>

        <div class="mt-2 h-64 overflow-y-auto rounded-lg border border-slate-700 hide-scrollbar" id="listWrap">
          <ul id="menuList" class="divide-y divide-slate-700"></ul>
        </div>

        <div class="mt-3 flex items-center gap-2">
          <button id="pickBtn" class="px-3 py-1.5 text-xs rounded-full border border-blue-500 text-blue-300 hover:bg-slate-700 disabled:opacity-60 disabled:pointer-events-none">
            Chọn món
          </button>
          <button id="cancelPick" class="px-3 py-1.5 text-xs rounded-full border border-slate-600 hover:bg-slate-700">
            Huỷ
          </button>
          <span class="text-[11px] text-slate-400 ml-auto">↵ Enter để chọn • Esc để huỷ</span>
        </div>

        <div class="mt-2 flex flex-wrap gap-1.5">
          ${["cơm gà","phở bò","bún bò","mì xào bò"].map(s =>
            `<button data-quick="${s}" class="px-2.5 py-1 text-[11px] rounded-full border border-slate-600 hover:bg-slate-700">${s}</button>`
          ).join("")}
        </div>
      </div>
    </div>
  `, "bot");

  bubble.classList.add("menu-picker-bubble");

  // Elements
  const chipsWrap = bubble.querySelector("#catChips");
  const list = bubble.querySelector("#menuList");
  const search = bubble.querySelector("#menuSearch");
  const pickBtn = bubble.querySelector("#pickBtn");
  const cancelBtn = bubble.querySelector("#cancelPick");
  const resultCount = bubble.querySelector("#resultCount");

  // State
  let currentCat = "Tất cả";
  let selectedName = null;

  function itemRowHTML(it, active=false) {
    return `
      <li data-name="${it.name}" data-cat="${it.category}">
        <button class="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-700/60
                       ${active ? 'bg-blue-500 text-slate-900' : ''}">
          <span class="text-[13px]">${it.name}</span>
          <span class="text-[12px] tabular-nums ${active ? 'opacity-100' : 'text-slate-300'}">${formatPrice(it.price)}</span>
        </button>
      </li>`;
  }
  function sectionHeaderHTML(cat) { return `<li class="sticky top-0 bg-slate-800 text-[11px] tracking-wide text-slate-400 px-3 py-1">${cat}</li>`; }

  function applyChipStyles() {
    chipsWrap.querySelectorAll("button[data-cat]").forEach(btn => {
      if (btn.dataset.cat === currentCat) {
        btn.classList.add("chip-active","border-blue-500","text-blue-300");
        btn.classList.remove("border-slate-600","text-slate-200");
      } else {
        btn.classList.remove("chip-active","border-blue-500","text-blue-300");
        btn.classList.add("border-slate-600","text-slate-200");
      }
    });
  }
  function filtered() {
    const allItems = CATALOG.flatMap(c => c.items.map(it => ({ ...it, category: c.category })));
    const f = toAscii(search.value);
    return allItems.filter(it => {
      const okCat = currentCat === "Tất cả" || it.category === currentCat;
      const okText = toAscii(it.name).includes(f) || toAscii(it.category).includes(f);
      return okCat && okText;
    });
  }
  function rebuild() {
    const items = filtered();
    list.innerHTML = "";
    let count = 0;
    let lastCat = null;

    items.forEach((it, idx) => {
      if (lastCat !== it.category) {
        lastCat = it.category;
        list.insertAdjacentHTML("beforeend", sectionHeaderHTML(lastCat));
      }
      const active = selectedName ? selectedName === it.name : (idx === 0);
      if (!selectedName && idx === 0) selectedName = it.name;
      list.insertAdjacentHTML("beforeend", itemRowHTML(it, active));
      count++;
    });

    if (count === 0) {
      list.innerHTML = `<li class="px-3 py-6 text-center text-[12px] text-slate-400">Không tìm thấy món phù hợp.</li>`;
      selectedName = null;
    }
    resultCount.textContent = count ? `${count} món` : "";
    pickBtn.disabled = !selectedName;
    attachRowEvents();
    ensureSelectedVisible();
  }
  function attachRowEvents() {
    list.querySelectorAll("li[data-name] > button").forEach(btn => {
      btn.addEventListener("click", () => setSelected(btn.parentElement.dataset.name, true));
      btn.addEventListener("dblclick", () => confirmPick());
    });
  }
  function setSelected(name, focusIntoView=false) {
    selectedName = name;
    list.querySelectorAll("li[data-name] > button").forEach(b => b.classList.remove("bg-blue-500","text-slate-900"));
    const li = list.querySelector(`li[data-name="${CSS.escape(name)}"] > button`);
    if (li) {
      li.classList.add("bg-blue-500","text-slate-900");
      if (focusIntoView) li.scrollIntoView({ block: "nearest" });
    }
    pickBtn.disabled = !selectedName;
  }
  function ensureSelectedVisible() {
    const sel = list.querySelector(`li[data-name="${CSS.escape(selectedName || "")}"] > button`);
    if (sel) sel.scrollIntoView({ block: "nearest" });
  }
  function confirmPick() {
    if (!selectedName) return;
    close();
    msg(selectedName, "user");
    onSelect(selectedName);
  }
  function close() { bubble.remove(); }

  // Init
  applyChipStyles();
  rebuild();
  search.focus();

  // Events
  search.addEventListener("input", rebuild);
  chipsWrap.querySelectorAll("button[data-cat]").forEach(btn => {
    btn.addEventListener("click", () => { currentCat = btn.dataset.cat; applyChipStyles(); rebuild(); });
  });
  pickBtn.addEventListener("click", confirmPick);
  cancelBtn.addEventListener("click", () => { close(); msg("Thôi, để mình chọn sau.", "user"); });
  bubble.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); cancelBtn.click(); return; }
    if (!["ArrowDown","ArrowUp","Enter"].includes(e.key)) return;
    const rows = Array.from(list.querySelectorAll('li[data-name]'));
    if (!rows.length) return;
    let idx = rows.findIndex(li => li.querySelector("button").classList.contains("bg-blue-500"));
    if (idx < 0) idx = 0;
    if (e.key === "ArrowDown") { idx = Math.min(idx + 1, rows.length - 1); setSelected(rows[idx].dataset.name, true); e.preventDefault(); }
    else if (e.key === "ArrowUp") { idx = Math.max(idx - 1, 0); setSelected(rows[idx].dataset.name, true); e.preventDefault(); }
    else if (e.key === "Enter") { e.preventDefault(); confirmPick(); }
  });
  bubble.querySelectorAll("[data-quick]").forEach(btn => {
    btn.addEventListener("click", () => { msg(btn.dataset.quick, "user"); close(); onSelect(btn.dataset.quick); });
  });
  return bubble;
}

function showMenu() {
  closeOpenPickers();
  msgRich(createMenuTableHTML(), "bot");
  msgMenuPicker((v) => route(v));
}

// ---- Helpers ----
function norm(s) { return toAscii(s); }
function containsAny(t, arr) { return arr.some(k => t.includes(toAscii(k))); }
function activeFlow() { return ![State.IDLE, State.ENDED].includes(state); }

// FIX: fuzzy item matcher so “cá kho” still matches “cơm cá kho”
function isMenuItem(t) {
  const q = toAscii(t);
  if (!q) return null;
  // direct contain either way
  let m = NAME_INDEX.find(x => q.includes(x.norm) || x.norm.includes(q));
  if (m) return m.name;
  // token-based (every token must appear)
  const toks = q.split(/\s+/).filter(Boolean);
  m = NAME_INDEX.find(x => toks.every(tok => x.norm.includes(tok)));
  return m ? m.name : null;
}

// size mapping tolerates no-accent and English
const SIZE_MAP = {
  "nho": "nhỏ", "small": "nhỏ",
  "vua": "vừa", "medium": "vừa",
  "lon": "lớn", "large": "lớn", "to": "lớn"
};
function parseSize(t) {
  for (const k in SIZE_MAP) if (t.includes(k)) return SIZE_MAP[k];
  return ["nhỏ","vừa","lớn"].find(s => t.includes(toAscii(s)));
}
function parseQty(t) { const m = t.match(/\b([1-9]|10)\b/); return m ? parseInt(m[1], 10) : null; }
function parseSpicy(t) {
  if (t.includes("khong cay")) return "không cay";
  if (t.includes("it cay")) return "ít cay";
  if (t.includes("vua cay")) return "vừa cay";
  if (t.includes("cay")) return "cay";
  return null;
}
function parseDine(t) {
  if (t.includes("an tai cho") || t.includes("tai cho")) return "tại chỗ";
  if (t.includes("mang di") || t.includes("take away")) return "mang đi";
  return null;
}
function parseTime(t) {
  const r1 = t.match(/\b(\d{1,2}):(\d{2})\b/);
  if (r1) return `${r1[1].padStart(2,"0")}:${r1[2]}`;
  const r2 = t.match(/trong\s+(\d+)\s*phut/);
  if (r2) {
    const add = parseInt(r2[1], 10);
    const d = new Date(Date.now() + add*60000);
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  }
  if (t.includes("ngay")) {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  }
  return null;
}

// ---- Pricing question detection ----
function detectItemPriceQuery(t) {
  const priceHint = /(gia|giá|bao nhieu|bn|bao nhieu tien|may tien|nhieu tien)/;
  if (!priceHint.test(t)) return null;
  const item = isMenuItem(t);
  return item ? item : null;
}

// ---- Calculations ----
function calcItemTotal(it) {
  const base = MENU[it.item] || 0;
  const up = SIZE_UP[it.size] || 0;
  const addons = (it.addons?.length || 0) * ADDON_COST;
  return base + up + addons;
}
function calcOrderTotal(o) {
  const items = o.items.reduce((s, it) => s + calcItemTotal(it), 0) + (o.current ? calcItemTotal(o.current) : 0);
  const pack = o.dine === "mang đi" ? PACK_FEE : 0;
  return items + pack;
}
function orderSummary(o) {
  const lines = [];
  const all = [...o.items, ...(o.current ? [o.current] : [])];
  all.forEach((it) => {
    const ad = it.addons?.length ? `, topping: ${it.addons.join(", ")}` : "";
    const sp = it.spicy ? `, cay: ${it.spicy}` : "";
    const note = it.note ? `, ghi chú: ${it.note}` : "";
    lines.push(`- ${it.item} (${it.size}) x${it.qty}${ad}${sp}${note}`);
  });
  const dine = o.dine ? `\nHình thức: ${o.dine}` : "";
  const time = o.pickup ? `\nNhận: ${o.pickup}` : "";
  const pay = o.pay ? `\nThanh toán: ${o.pay}` : "";
  return `${lines.join("\n")}${dine}${time}${pay}`;
}


function newOrderId() { return `CT-${Math.floor(1000 + Math.random()*9000)}`; }

// ---- Info rules ----
const infoRules = [
  { k:["giờ","mở cửa","đóng cửa","time","mấy giờ","khi nào mở"], r:"Căn-tin mở Thứ 2–Thứ 6: 7:00–19:00, Thứ 7: 8:00–14:00, Chủ nhật nghỉ." },
  { k:["thực đơn","menu","món hôm nay","hôm nay ăn gì","thuc don"], r:"Gõ “thực đơn” hoặc “menu” để xem bảng giá và chọn món." },
  { k:["giá","bao nhiêu","cost","price","đắt rẻ","gia"], r:"Giá tham khảo: cơm/mì/bún 35–52k, món thêm 10–15k, đồ uống 10–20k." },
  { k:["chay","vegetarian","không thịt","ăn chay","an chay"], r:"Có cơm chay, mì xào chay, đậu hũ sốt cà, canh rau. Có thể thay đậu hũ theo yêu cầu." },
  { k:["dị ứng","allergy","đậu phộng","sữa","gluten","thành phần","di ung"], r:"Vui lòng báo dị ứng. Một số món có đậu phộng, sữa, gluten, hải sản." },
  { k:["cay","ít cay","không cay","spicy","it cay","khong cay"], r:"Có mức không cay / vừa cay / cay. Có thể dặn khi gọi món." },
  { k:["phần","khẩu phần","size","lớn nhỏ","topping thêm","phan","khau phan"], r:"Phần thường hoặc lớn (+10k). Có thể thêm trứng, chả, rau." },
  { k:["khuyến mãi","ưu đãi","giảm giá","combo","deal","khuyen mai"], r:"Hôm nay có combo cơm + nước = 45k. Thứ 4 giảm 10% cho thẻ SV." },
  { k:["thanh toán","tiền mặt","thẻ","momo","zalopay","qr","the","tien mat"], r:"Nhận tiền mặt, thẻ, QR, MoMo, ZaloPay." },
  { k:["mang đi","take away","đóng gói","hộp","ly mang đi","dong goi","hop"], r:"Có mang đi. Hộp/ly +2k (nếu cần)." },
  { k:["chờ","bao lâu","đông","xếp hàng","đợi","cho","xep hang"], r:"Cao điểm 11:30–12:45 có thể chờ 5–15 phút. Thường <5 phút ngoài khung giờ." },
  { k:["ở đâu","địa chỉ","tầng","khu","map","vị trí","o dau","dia chi"], r:"Căn-tin ở tầng 1, Nhà A, đối diện sảnh chính." },
  { k:["nghỉ","lịch nghỉ","lễ","tết","holiday","nghi","le","tet"], r:"Theo lịch trường: nghỉ Chủ nhật và ngày lễ/tết (thông báo tại bảng tin)." },
  { k:["nước","nước lọc","trà đá","refill","nuoc","tra da"], r:"Có nước lọc miễn phí. Trà đá 5k, nước đóng chai 10–12k." },
  { k:["góp ý","phàn nàn","khiếu nại","liên hệ","hotline","gop y","phan nan"], r:"Góp ý tại quầy hoặc email cantin@truong.edu.vn. Hotline: 0900 000 000." }
];
function matchInfo(t) { for (const r of infoRules) if (containsAny(t, r.k)) return r.r; return null; }

// ---- Greeting with question suggestions ----
function showGreeting() {
  const bubble = msgRich(`
    <div class="text-sm">
      <div class="font-semibold">Chào bạn! Đây là Chatbot Căn-tin.</div>
      <div class="text-xs text-slate-300 mt-1">Bạn có thể hỏi:</div>
      <div id="greetAsk" class="mt-2 flex flex-wrap gap-1.5">
        ${[
          ["Giờ mở cửa?", "giờ mở cửa"],
          ["Xem thực đơn & giá", "thực đơn"],
          ["Có món chay không?", "món chay"],
          ["Khuyến mãi hôm nay?", "khuyến mãi"],
          ["Thanh toán thế nào?", "thanh toán"],
          ["Có mang đi không?", "mang đi"],
          ["Đông không / chờ lâu?", "chờ bao lâu"],
          ["Ở đâu vậy?", "địa chỉ"],
          ["Giá cơm gà bao nhiêu?", "cơm gà giá bao nhiêu"]
        ].map(([label,val]) => `
          <button data-ask="${val}" class="px-2.5 py-1 text-[11px] rounded-full border border-slate-600 hover:bg-slate-700">${label}</button>
        `).join("")}
      </div>
      <div class="text-xs text-slate-400 mt-2">Hoặc gõ “đặt” (hoặc 'dat') để đặt món.</div>
    </div>
  `, "bot");
  bubble.querySelectorAll("[data-ask]").forEach(btn => {
    btn.addEventListener("click", () => route(btn.dataset.ask));
  });
}

// ---- Router ----
function route(text) {
  const t = norm(text);

  // 1) Câu hỏi giá của một món
  const priceItem = detectItemPriceQuery(t);
  if (priceItem) {
    const p = MENU[priceItem];
    msg(`Giá ${priceItem}: ${formatPrice(p)}. (Size lớn +${formatPrice(SIZE_UP["lớn"])}, mang đi +${formatPrice(PACK_FEE)} nếu cần.)`, "bot");
    return;
  }

  // 2) Xem menu/bảng giá tổng
  if (["thuc don","menu","bang gia","gia"].some(k => t.includes(k))) {
    showMenu();
    return;
  }

  // 3) Nếu đang IDLE mà user gõ tên món (vd: “cá kho”) → tự mở flow đặt
  if (!activeFlow()) {
    const maybeItem = isMenuItem(t);
    if (maybeItem) {
      state = State.ORDER_OPEN; order = resetOrder(); setStatus(state);
      handleOrdering(t); // sẽ bắt vào case ORDER_OPEN và dùng chính input này
      return;
    }
  }

  if (state === State.ENDED) {
    if (t.includes("bat dau moi") || containsAny(t, ["đặt","order","gọi món","mua","dat","goi mon"])) {
      state = State.IDLE; setStatus(state);
      msg("Đã mở phiên mới. Có thể hỏi thông tin hoặc gõ “đặt” để đặt món.", "bot");
    } else {
      msg('Phiên đã kết thúc. Gõ "bắt đầu mới" hoặc "đặt" để mở phiên mới.', "bot");
    }
    return;
  }

  if (state === State.AFTER_DONE) { handlePostDone(t); return; }

  // 4) Mở flow khi user gõ “đặt”
  if (containsAny(t, ["đặt","order","gọi món","mua","dat","goi mon"])) {
    if (activeFlow()) { msg("Đang có một phiên đang mở. Vui lòng hoàn tất (đặt thêm / hỏi / kết thúc).", "bot"); return; }
    state = State.ORDER_OPEN; order = resetOrder(); setStatus(state);
    showMenu();
    return;
  }

  // 5) Nếu đang trong flow đặt
  if ([State.ORDER_OPEN,State.CONFIG_ITEM,State.ASK_QTY,State.ASK_ADDONS,State.ASK_SPICY,State.ASK_NOTE,State.READY_TO_CLOSE_ITEM,State.ASK_DINE,State.ASK_TIME,State.ASK_PAY,State.ASK_CONTACT,State.ASK_CONFIRM].includes(state)) {
    handleOrdering(t);
    return;
  }

  // 6) Info
  const info = matchInfo(t);
  if (info) { msg(info, "bot"); return; }

  msg("Xin lỗi, chưa có thông tin đó. Có thể hỏi giờ mở cửa, thực đơn, giá… hoặc gõ “đặt”.", "bot");
}

// ---- Ordering FSM ----
function handleOrdering(t) {
  switch (state) {
    case State.ORDER_OPEN: {
      const item = isMenuItem(t);
      if (!item) { showMenu(); return; }
      order.current = { item, size: null, qty: null, addons: [], spicy: null, note: "" };
      state = State.CONFIG_ITEM; setStatus(state);
      msgChoices(`Bạn chọn ${item}. Chọn size:`, ["nhỏ","vừa","lớn"].map(s => ({label:s, value:s})), v => route(v));
      return;
    }
    case State.CONFIG_ITEM: {
      const size = parseSize(t);
      if (!size) {
        msgChoices("Chọn size:", ["nhỏ","vừa","lớn"].map(s => ({label:s, value:s})), v => route(v));
        return;
      }
      order.current.size = size; state = State.ASK_QTY; setStatus(state);
      msgChoices("Chọn số lượng:", Array.from({length:10},(_,i)=>({label:String(i+1), value:String(i+1)})), v => route(v));
      return;
    }
    case State.ASK_QTY: {
      const qty = parseQty(t);
      if (!qty) {
        msgChoices("Chọn số lượng (1–10):", Array.from({length:10},(_,i)=>({label:String(i+1), value:String(i+1)})), v => route(v));
        return;
      }
      order.current.qty = qty; state = State.ASK_ADDONS; setStatus(state);
      msgChoicesMulti("Chọn topping (có thể chọn nhiều):", ADDON_LIST.map(x => ({label:x})), (picked) => {
        order.current.addons = picked;
        state = State.ASK_SPICY; setStatus(state);
        msgChoices("Chọn độ cay:", ["không cay","ít cay","vừa cay","cay"].map(x=>({label:x, value:x})), v => route(v));
      });
      return;
    }
    case State.ASK_SPICY: {
      const s = parseSpicy(t);
      if (!s) { msgChoices("Chọn độ cay:", ["không cay","ít cay","vừa cay","cay"].map(x=>({label:x, value:x})), v => route(v)); return; }
      order.current.spicy = s; state = State.ASK_NOTE; setStatus(state);
      msgChoices("Bạn có muốn thêm ghi chú?", [
        {label:"Bỏ qua", value:"xong"},
        {label:"Ít cơm", value:"note:ít cơm"},
        {label:"Nhiều rau", value:"note:nhiều rau"},
        {label:"Không hành", value:"note:không hành"}
      ], v => {
        if (v.startsWith("note:")) {
          order.current.note = (order.current.note ? order.current.note + " " : "") + v.split(":")[1];
          route("xong");
        } else {
          route(v);
        }
      });
      return;
    }
    case State.ASK_NOTE: {
      if (!["xong","xong mon","xong món","tiep theo","tiếp theo","den thanh toan","đến thanh toán"].some(k => t.includes(toAscii(k)))) {
        order.current.note = (order.current.note ? order.current.note + " " : "") + t;
        msgChoices("Ghi chú đã thêm. Tiếp tục?", [{label:"Xong", value:"xong"}], v => route(v));
        return;
      }
      state = State.READY_TO_CLOSE_ITEM; setStatus(state);
      msgChoices("Món đã thêm vào đơn. Chọn hình thức:", [
        {label:"Ăn tại chỗ", value:"ăn tại chỗ"},
        {label:"Mang đi", value:"mang đi"}
      ], v => route(v));
      return;
    }
    case State.READY_TO_CLOSE_ITEM: {
      const dine = parseDine(t);
      if (!dine) {
        msgChoices("Chọn hình thức:", [
          {label:"Ăn tại chỗ", value:"ăn tại chỗ"},
          {label:"Mang đi", value:"mang đi"}
        ], v => route(v));
        return;
      }
      order.items.push(order.current); order.current = null; order.dine = dine;
      state = State.ASK_TIME; setStatus(state);
      msgChoices("Chọn thời gian nhận:", [
        {label:"Trong 10 phút", value:"trong 10 phút"},
        {label:"Trong 15 phút", value:"trong 15 phút"},
        {label:"Trong 30 phút", value:"trong 30 phút"}
      ], v => route(v));
      return;
    }
    case State.ASK_TIME: {
      const tm = parseTime(t);
      if (!tm) {
        msgChoices("Chọn thời gian:", [
          {label:"Trong 10 phút", value:"trong 10 phút"},
          {label:"Trong 15 phút", value:"trong 15 phút"},
          {label:"Trong 30 phút", value:"trong 30 phút"}
        ], v => route(v));
        return;
      }
      order.pickup = tm; state = State.ASK_PAY; setStatus(state);
      msgChoices("Chọn phương thức thanh toán:", [
        {label:"Tiền mặt", value:"tiền mặt"},
        {label:"QR", value:"qr"},
        {label:"MoMo", value:"momo"},
        {label:"ZaloPay", value:"zalopay"},
        {label:"Thẻ", value:"thẻ"}
      ], v => route(v));
      return;
    }
    case State.ASK_PAY: {
      const pay = ["tien mat","qr","momo","zalopay","the","card","tiền mặt","thẻ"].find(k => t.includes(toAscii(k)));
      if (!pay) {
        msgChoices("Chọn thanh toán:", [
          {label:"Tiền mặt", value:"tiền mặt"},
          {label:"QR", value:"qr"},
          {label:"MoMo", value:"momo"},
          {label:"ZaloPay", value:"zalopay"},
          {label:"Thẻ", value:"thẻ"}
        ], v => route(v));
        return;
      }
      order.pay = toAscii(pay) === "card" ? "thẻ" : (toAscii(pay).includes("the") ? "thẻ" : (toAscii(pay).includes("tien mat") ? "tiền mặt" : pay));
      state = State.ASK_CONTACT; setStatus(state);
      msg("Nhập tên hoặc mã SV/số điện thoại để xác nhận.", "bot");
      return;
    }
    case State.ASK_CONTACT: {
      if (t.length < 2) { msg("Vui lòng nhập tên/mã SV/SDT.", "bot"); return; }
      order.contact = t;
      const total = calcOrderTotal(order);
      const summary = `${orderSummary(order)}\nTổng tạm tính: ${total.toLocaleString("vi-VN")}đ`;
      state = State.ASK_CONFIRM; setStatus(state);
      msg(summary, "bot");
      msgChoices("Xác nhận đặt đơn?", [
        {label:"✅ Xác nhận", value:"xác nhận"},
        {label:"❌ Huỷ", value:"huỷ"}
      ], v => route(v));
      return;
    }
    case State.ASK_CONFIRM: {
      if (t.includes("xac nhan") || t.includes("dong y") || t === "ok" || t.includes("chot") || t.includes("xác nhận") || t.includes("đồng ý") || t.includes("chốt")) {
        order.id = newOrderId();
        orderIdPill.textContent = order.id; orderIdPill.classList.remove("hidden");
        state = State.AFTER_DONE; setStatus(state);
        msg(`Đã đặt xong ✅. Mã đơn: ${order.id}. Nhận ${order.pickup}, ${order.dine}. Cảm ơn bạn!`, "bot");
        msgChoices("Bạn muốn làm gì tiếp theo?", [
          {label:"🛒 Đặt thêm", value:"đặt thêm"},
          {label:"ℹ️ Hỏi thông tin", value:"hỏi"},
          {label:"🏁 Kết thúc phiên", value:"kết thúc"}
        ], v => route(v));
        return;
      }
      if (t.includes("huy") || t.includes("huỷ") || t.includes("hủy") || t.includes("cancel")) {
        state = State.AFTER_DONE; setStatus(state);
        orderIdPill.classList.add("hidden");
        msg("Đơn đã huỷ.", "bot");
        msgChoices("Bạn muốn làm gì tiếp theo?", [
          {label:"🛒 Đặt thêm", value:"đặt thêm"},
          {label:"ℹ️ Hỏi thông tin", value:"hỏi"},
          {label:"🏁 Kết thúc phiên", value:"kết thúc"}
        ], v => route(v));
        return;
      }
      msgChoices("Vui lòng chọn:", [
        {label:"✅ Xác nhận", value:"xác nhận"},
        {label:"❌ Huỷ", value:"huỷ"}
      ], v => route(v));
      return;
    }
    default:
      msg("Luồng không hợp lệ. Gõ “đặt” để bắt đầu lại.", "bot");
      state = State.IDLE; setStatus(state);
      order = resetOrder();
  }
}

// ---- Hậu xác nhận ----
function handlePostDone(t) {
  if (t.includes("ket thuc") || t.includes("kết thúc") || t.includes("thoat") || t.includes("thoát") || t === "end") {
    state = State.ENDED; setStatus(state);
    msg('Đã kết thúc phiên. Khi cần, gõ "bắt đầu mới" hoặc "đặt" để mở phiên mới.', "bot");
    return;
  }

  if (t.includes("dat them") || t.includes("đặt thêm") || containsAny(t, ["đặt","order","gọi món","mua","dat","goi mon"])) {
    order = resetOrder();
    state = State.ORDER_OPEN; setStatus(state);
    showMenu();
    return;
  }

  if (t.includes("hoi") || t.includes("hỏi")) {
    msgChoices("Chọn chủ đề bạn muốn hỏi:", [
      {label:"Giờ mở cửa", value:"giờ"},
      {label:"Thực đơn", value:"thực đơn"},
      {label:"Giá cả", value:"giá"},
      {label:"Món chay", value:"chay"},
      {label:"Thanh toán", value:"thanh toán"}
    ], v => {
      const info = matchInfo(norm(v)) || "Chủ đề chưa hỗ trợ.";
      msg(info, "bot");
      msgChoices("Bạn muốn làm gì tiếp theo?", [
        {label:"🛒 Đặt thêm", value:"đặt thêm"},
        {label:"ℹ️ Hỏi tiếp", value:"hỏi"},
        {label:"🏁 Kết thúc phiên", value:"kết thúc"}
      ], vv => route(vv));
    });
    return;
  }

  msg('Chưa hiểu. Vui lòng chọn: đặt thêm / hỏi / kết thúc.', "bot");
}

// ---- Send handlers ----
function handleSend() {
  const text = input.value.trim();
  if (!text) return;
  msg(text, "user");
  input.value = "";
  route(text);
}

sendBtn.addEventListener("click", handleSend);
input.addEventListener("keydown", (e) => { if (e.key === "Enter") handleSend(); });
document.querySelectorAll(".quick").forEach(b => b.addEventListener("click", () => quick(b.textContent)));

// ---- Greeting ----
showGreeting();
