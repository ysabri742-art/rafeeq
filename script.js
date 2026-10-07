const phoneNumber = "966593452098";


const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSvlG2zvspK9p4_bbY5JF1m3vKheiwBpLstWc3R_hXoG2-jGiDnCo6-i6ufPHGqFLZ-LwX5ELlulp9P/pub?gid=0&single=true&output=csv";

const fallbackCars = [
  {
    car: "كيا - بيجاس",
    model: "2026",
    kilometers: "600 كيلومتر يومياً",
    price: "1850",
    available: "نعم",
  },
  {
    car: "كيا - بيجاس",
    model: "2024",
    kilometers: "كيلومترات مفتوحة",
    price: "1750",
    available: "نعم",
  },
  {
    car: "جيلي - إمقراند",
    model: "2025",
    kilometers: "500 كيلومتر يومياً",
    price: "2100",
    available: "نعم",
  },
  {
    car: "هيونداي - أكسنت",
    model: "2025",
    kilometers: "500 كيلومتر يومياً",
    price: "2250",
    available: "نعم",
  },
  {
    car: "تويوتا - يارس",
    model: "2026",
    kilometers: "600 كيلومتر يومياً",
    price: "2400",
    available: "نعم",
  },
];

const headerMap = {
  car: ["السيارة", "سيارة", "اسم السيارة", "car", "vehicle"],
  model: ["الموديل", "موديل", "model", "year"],
  kilometers: [
    "الكيلومترات",
    "عدد الكيلومترات",
    "الكيلو متر",
    "كيلومترات",
    "km",
    "kilometers",
  ],
  price: ["السعر", "سعر الشهر", "السعر الشهري", "price", "monthly price"],
  available: ["متاح", "متوفرة", "الحالة", "available", "status"],
};

function buildWhatsAppUrl(car, model, price) {
  const message = `أهلاً رفيق السير، أرغب بحجز سيارة ${car} موديل ${model} بسعر ${formatPrice(price)} ر.س شهرياً. الرجاء التواصل معي لإكمال الطلب.`;
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
}

function formatPrice(value) {
  const raw = String(value || "").replace(/[^\d.]/g, "");
  const number = Number(raw);
  if (!Number.isFinite(number) || number <= 0) return String(value || "");
  return new Intl.NumberFormat("en-US").format(number);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && next === '"' && inQuotes) {
      value += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase();
}

function findColumn(headers, key) {
  const possibleNames = headerMap[key].map(normalizeHeader);
  return headers.findIndex((header) =>
    possibleNames.includes(normalizeHeader(header)),
  );
}

function rowsToCars(rows) {
  if (rows.length < 2) return [];

  const headers = rows[0];
  const columns = {
    car: findColumn(headers, "car"),
    model: findColumn(headers, "model"),
    kilometers: findColumn(headers, "kilometers"),
    price: findColumn(headers, "price"),
    available: findColumn(headers, "available"),
  };

  if (
    columns.car === -1 ||
    columns.model === -1 ||
    columns.kilometers === -1 ||
    columns.price === -1
  ) {
    throw new Error("Missing required sheet columns");
  }

  return rows.slice(1).map((row) => ({
    car: row[columns.car] || "",
    model: row[columns.model] || "",
    kilometers: row[columns.kilometers] || "",
    price: row[columns.price] || "",
    available:
      columns.available === -1 ? "نعم" : row[columns.available] || "نعم",
  }));
}

function isAvailable(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return !["لا", "غير متاح", "غير متوفر", "0", "false", "no", "sold"].includes(
    normalized,
  );
}

function renderCars(cars) {
  const tableBody = document.querySelector("#cars-table-body");
  const availableCars = cars.filter(
    (car) => car.car && isAvailable(car.available),
  );

  if (!availableCars.length) {
    tableBody.innerHTML = `<tr><td colspan="5" class="loading-cell">لا توجد سيارات متاحة حالياً</td></tr>`;
    return;
  }

  tableBody.innerHTML = availableCars
    .map((car) => {
      const safeCar = escapeHtml(car.car);
      const safeModel = escapeHtml(car.model);
      const safeKilometers = escapeHtml(car.kilometers);
      const safePrice = escapeHtml(formatPrice(car.price));
      const isOpenKm = /مفتوحة|open|unlimited/i.test(car.kilometers);
      const kilometersMarkup = isOpenKm
        ? `<span class="km-open">${safeKilometers}</span>`
        : safeKilometers;
      const whatsAppUrl = buildWhatsAppUrl(car.car, car.model, car.price);

      return `
        <tr>
          <td><span class="dot"></span>${safeCar}</td>
          <td>${safeModel}</td>
          <td>${kilometersMarkup}</td>
          <td><strong>${safePrice}</strong> ر.س / شهرياً</td>
          <td><a class="reserve-btn" href="${whatsAppUrl}" target="_blank" rel="noopener">احجز الآن</a></td>
        </tr>
      `;
    })
    .join("");
}

async function loadCars() {
  if (!SHEET_CSV_URL) {
    renderCars(fallbackCars);
    return;
  }

  try {
    const separator = SHEET_CSV_URL.includes("?") ? "&" : "?";
    const response = await fetch(
      `${SHEET_CSV_URL}${separator}cacheBust=${Date.now()}`,
    );
    if (!response.ok) throw new Error("Sheet request failed");
    const csv = await response.text();
    const cars = rowsToCars(parseCsv(csv));
    renderCars(cars);
  } catch (error) {
    console.warn(
      "تعذر تحميل بيانات Google Sheet، تم عرض البيانات الاحتياطية.",
      error,
    );
    renderCars(fallbackCars);
  }
}

loadCars();
