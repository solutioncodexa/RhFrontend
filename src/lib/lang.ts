export type Lang = "fr" | "ar";
const KEY = "rhflow.lang";

export function readLang(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "ar" || v === "fr") return v;
  } catch {
    /* ignore */
  }
  return "fr";
}

export function persistLang(lang: Lang) {
  localStorage.setItem(KEY, lang);
}

export function applyLang(lang: Lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}
