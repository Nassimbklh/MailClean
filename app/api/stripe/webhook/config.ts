// Configuration pour désactiver le parsing automatique du body
// Nécessaire pour vérifier la signature Stripe
export const config = {
  api: {
    bodyParser: false,
  },
};
