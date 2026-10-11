import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { applyLang, persistLang, readLang, type Lang } from "./lang";
import { translate } from "./phrases";

export type TKey = keyof typeof dict;

const dict = {
  appName: { fr: "RHFlow Maroc", ar: "ريفلو المغرب" },
  tagline: { fr: "Votre RH, simplement.", ar: "مواردكم البشرية، ببساطة." },
  dashboard: { fr: "Tableau de bord", ar: "لوحة القيادة" },
  employees: { fr: "Employés", ar: "الموظفون" },
  employeeList: { fr: "Liste", ar: "القائمة" },
  departments: { fr: "Départements", ar: "الأقسام" },
  positions: { fr: "Postes", ar: "المناصب" },
  contracts: { fr: "Contrats", ar: "العقود" },
  attendance: { fr: "Présence", ar: "الحضور" },
  absences: { fr: "Absences", ar: "الغياب" },
  workingHours: { fr: "Horaires", ar: "أوقات العمل" },
  establishments: { fr: "Établissements", ar: "المواقع" },
  shifts: { fr: "Shifts", ar: "الورديات" },
  shiftAssignments: { fr: "Planning", ar: "التخطيط" },
  loans: { fr: "Prêts", ar: "القروض" },
  assets: { fr: "Matériel", ar: "المعدات" },
  disciplinary: { fr: "Disciplinaire", ar: "التأديب" },
  payrollTools: { fr: "Outils paie", ar: "أدوات الأجور" },
  careers: { fr: "Carrières", ar: "الوظائف" },
  leave: { fr: "Congés", ar: "العطل" },
  leaveRequests: { fr: "Demandes", ar: "الطلبات" },
  leaveBalances: { fr: "Soldes", ar: "الأرصدة" },
  leaveCalendar: { fr: "Calendrier", ar: "التقويم" },
  payroll: { fr: "Paie", ar: "الأجور" },
  periods: { fr: "Périodes", ar: "الفترات" },
  payslips: { fr: "Bulletins", ar: "كشوف الأجور" },
  declarations: { fr: "Déclarations", ar: "التصاريح" },
  expenses: { fr: "Notes de frais", ar: "المصاريف" },
  trips: { fr: "Déplacements", ar: "التنقلات" },
  frais: { fr: "Frais", ar: "المصاريف" },
  performance: { fr: "Performance", ar: "الأداء" },
  reviews: { fr: "Entretiens", ar: "التقييمات" },
  objectives: { fr: "Objectifs", ar: "الأهداف" },
  recruitment: { fr: "Recrutement", ar: "التوظيف" },
  jobs: { fr: "Offres", ar: "العروض" },
  candidates: { fr: "Candidats", ar: "المترشحون" },
  documents: { fr: "Documents", ar: "الوثائق" },
  requests: { fr: "Demandes RH", ar: "طلبات الموارد البشرية" },
  communication: { fr: "Communication", ar: "التواصل" },
  announcements: { fr: "Annonces", ar: "الإعلانات" },
  notifications: { fr: "Notifications", ar: "الإشعارات" },
  reports: { fr: "Rapports", ar: "التقارير" },
  parcours: { fr: "Parcours", ar: "المسار" },
  onboarding: { fr: "Intégration", ar: "الإدماج" },
  offboarding: { fr: "Départ", ar: "المغادرة" },
  assistant: { fr: "Assistant", ar: "المساعد" },
  admin: { fr: "Administration", ar: "الإدارة" },
  users: { fr: "Utilisateurs", ar: "المستخدمون" },
  audit: { fr: "Journal d’audit", ar: "سجل التدقيق" },
  settings: { fr: "Paramètres", ar: "الإعدادات" },
  holidays: { fr: "Jours fériés", ar: "العطل الرسمية" },
  platform: { fr: "Console plateforme", ar: "لوحة المنصة" },
  tenants: { fr: "Sociétés", ar: "الشركات" },
  search: { fr: "Rechercher un employé, un contrat…", ar: "ابحث عن موظف أو عقد…" },
  login: { fr: "Connexion", ar: "تسجيل الدخول" },
  register: { fr: "Essai 14 jours", ar: "تجربة 14 يوماً" },
  logout: { fr: "Déconnexion", ar: "خروج" },
  email: { fr: "E-mail", ar: "البريد" },
  password: { fr: "Mot de passe", ar: "كلمة المرور" },
  forgot: { fr: "Mot de passe oublié ?", ar: "نسيت كلمة المرور؟" },
  signIn: { fr: "Se connecter", ar: "دخول" },
  signingIn: { fr: "Connexion…", ar: "جارٍ الدخول…" },
  rememberMe: { fr: "Se souvenir de moi", ar: "تذكرني" },
  companySpace: { fr: "Espace RH de votre société.", ar: "فضاء الموارد البشرية لشركتكم." },
  demoAccounts: { fr: "Comptes démo (affichés uniquement ici)", ar: "حسابات تجريبية (تظهر هنا فقط)" },
  createCompany: { fr: "Créer une société", ar: "إنشاء شركة" },
  invalidEmail: { fr: "E-mail invalide.", ar: "البريد غير صالح." },
  passwordRequired: { fr: "Mot de passe obligatoire.", ar: "كلمة المرور مطلوبة." },
  checkFields: { fr: "Vérifiez les champs du formulaire.", ar: "تحققوا من الحقول." },
  loginFailed: { fr: "Connexion impossible", ar: "تعذر تسجيل الدخول" },
  save: { fr: "Enregistrer", ar: "حفظ" },
  create: { fr: "Créer", ar: "إنشاء" },
  edit: { fr: "Modifier", ar: "تعديل" },
  delete: { fr: "Supprimer", ar: "حذف" },
  cancel: { fr: "Annuler", ar: "إلغاء" },
  confirm: { fr: "Confirmer", ar: "تأكيد" },
  approve: { fr: "Approuver", ar: "قبول" },
  reject: { fr: "Refuser", ar: "رفض" },
  loading: { fr: "Chargement…", ar: "جارٍ التحميل…" },
  empty: { fr: "Aucun élément", ar: "لا توجد عناصر" },
  error: { fr: "Une erreur est survenue", ar: "حدث خطأ" },
  previous: { fr: "Précédent", ar: "السابق" },
  next: { fr: "Suivant", ar: "التالي" },
  actions: { fr: "Actions", ar: "إجراءات" },
  menu: { fr: "Menu", ar: "القائمة" },
  status: { fr: "Statut", ar: "الحالة" },
  name: { fr: "Nom", ar: "الاسم" },
  firstName: { fr: "Prénom", ar: "الاسم" },
  lastName: { fr: "Nom", ar: "النسب" },
  city: { fr: "Ville", ar: "المدينة" },
  phone: { fr: "Téléphone", ar: "الهاتف" },
  company: { fr: "Société", ar: "الشركة" },
  portalHome: { fr: "Mon espace", ar: "مساحتي" },
  myLeave: { fr: "Mes congés", ar: "عطلي" },
  myAttendance: { fr: "Mes présences", ar: "حضوري" },
  myPayslips: { fr: "Mes bulletins", ar: "كشوفي" },
  myDocuments: { fr: "Mes documents", ar: "وثائقي" },
  orgChart: { fr: "Organigramme", ar: "الهيكل" },
  profileChanges: { fr: "Corrections de fiche", ar: "تصحيحات الملف" },
  training: { fr: "Formation", ar: "التكوين" },
  myProfile: { fr: "Ma fiche", ar: "ملفي" },
} as const;

type I18nValue = {
  lang: Lang;
  dir: "ltr" | "rtl";
  t: (key: TKey) => string;
  tr: (text: string) => string;
  toggle: () => void;
  setLang: (lang: Lang) => void;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readLang());

  useEffect(() => {
    applyLang(lang);
  }, [lang]);

  const setLang = (next: Lang) => {
    persistLang(next);
    setLangState(next);
  };

  const value: I18nValue = {
    lang,
    dir: lang === "ar" ? "rtl" : "ltr",
    t: (key) => dict[key]?.[lang] ?? dict[key]?.fr ?? key,
    tr: (text) => translate(lang, text),
    toggle: () => setLang(lang === "fr" ? "ar" : "fr"),
    setLang,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n");
  return ctx;
}
