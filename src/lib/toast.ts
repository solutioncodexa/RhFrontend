import { toast as base, type ExternalToast } from "sonner";

type Kind = "success" | "error" | "warning" | "info";

const SUCCESS_DETAIL: Record<string, string> = {
  Créé: "L’élément a été ajouté.",
  Enregistré: "Les modifications sont prises en compte.",
  Supprimé: "L’élément a été retiré.",
  "Décision enregistrée": "Le statut a été mis à jour.",
  "Demande annulée, solde recrédité si besoin": "Le solde a été recrédité si besoin.",
  "Action confirmée": "L’assistant a exécuté l’action.",
  "Société créée": "La société est prête.",
  "Paiement enregistré": "Le règlement a été ajouté.",
  "Société supprimée": "La société a été retirée.",
  "Société mise à jour": "Les informations ont été enregistrées.",
  "Document ajouté": "Le fichier est dans le dossier.",
  "Couverture enregistrée": "La couverture sociale a été mise à jour.",
  "Dossier médical enregistré": "Les informations médicales ont été enregistrées.",
  "Document classé dans le dossier": "Le fichier a été rangé.",
  "Virement enregistré": "Le paiement a été marqué.",
  "Photo enregistrée": "La photo de profil a été mise à jour.",
  "Candidature envoyée": "La candidature a bien été transmise.",
  "Demande envoyée à la RH": "Le service RH va la traiter.",
  "Formation ajoutée": "La formation est disponible.",
  "Salarié inscrit": "L’inscription a été enregistrée.",
  "Paramètres enregistrés": "Les réglages de la société sont à jour.",
  "Logo enregistré": "Le logo a été mis à jour.",
  "Élément lié au salarié": "La rubrique a été ajoutée à la fiche.",
  "Période ouverte": "La paie de ce mois peut être calculée.",
  "Calcul effectué": "Les bulletins ont été recalculés.",
  "Période approuvée": "La paie peut être payée.",
  "Période marquée payée": "Le statut de paiement a été mis à jour.",
  "Avoir enregistré pour le mois suivant": "Il sera repris au prochain calcul.",
  "Départ pointé": "Le pointage a été enregistré.",
  "Arrivée pointée": "Le pointage a été enregistré.",
  "Réception enregistrée": "L’accusé de réception est enregistré.",
  "Document signé": "La signature a été enregistrée.",
  "Demande traitée": "Le statut de la demande a changé.",
  "Tout marqué comme lu": "Les notifications sont à jour.",
  "Note de frais mise à jour": "Le statut a été enregistré.",
  "Déplacement mis à jour": "Le statut a été enregistré.",
  "Avancement enregistré": "L’objectif a été mis à jour.",
  "Entretien mis à jour": "Le compte rendu a été enregistré.",
  "Offre mise à jour": "L’offre a été enregistrée.",
  "Candidat mis à jour": "Le dossier du candidat a changé.",
  "Parcours d’intégration ouvert": "Les tâches sont prêtes.",
  "Parcours de départ ouvert": "Les tâches sont prêtes.",
  "Tâche marquée faite": "Le parcours a été mis à jour.",
  "Droits enregistrés": "Les permissions du rôle sont à jour.",
  "Message envoyé": "Nous vous répondrons bientôt.",
};

const FALLBACK: Record<Kind, string> = {
  success: "C’est pris en compte.",
  error: "Réessayez dans un instant.",
  warning: "Vérifiez avant de continuer.",
  info: "Voici le détail.",
};

const LONG_TITLE: Record<Kind, string> = {
  success: "C’est fait",
  error: "Impossible",
  warning: "Attention",
  info: "Information",
};

function card(kind: Kind, message: string, data?: ExternalToast): [string, ExternalToast] {
  if (data?.description) return [message, data];

  const dash = message.split(/\s+—\s+/);
  if (dash.length === 2 && dash[0].length <= 42) {
    return [dash[0], { ...data, description: dash[1] }];
  }

  const dot = message.match(/^(.{3,42}?)\.\s+(.+)$/);
  if (dot) return [dot[1], { ...data, description: dot[2] }];

  if (kind === "error") return ["Impossible", { ...data, description: message }];

  const known = kind === "success" ? SUCCESS_DETAIL[message] : undefined;
  if (known) return [message, { ...data, description: known }];

  if (message.length > 48) return [LONG_TITLE[kind], { ...data, description: message }];
  return [message, { ...data, description: FALLBACK[kind] }];
}

function show(kind: Kind, message: string, data?: ExternalToast) {
  const [title, opts] = card(kind, message, data);
  return base[kind](title, opts);
}

export const toast = {
  success: (message: string, data?: ExternalToast) => show("success", message, data),
  error: (message: string, data?: ExternalToast) => show("error", message, data),
  warning: (message: string, data?: ExternalToast) => show("warning", message, data),
  info: (message: string, data?: ExternalToast) => show("info", message, data),
  message: base.message,
  loading: base.loading,
  promise: base.promise,
  dismiss: base.dismiss,
  custom: base.custom,
};
