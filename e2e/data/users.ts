// Usuarios DEL SEED (supabase/seed.sql) — no se crean usuarios nuevos para
// los E2E. Requiere `supabase db reset` antes de correr la suite.
export const SEED_PASSWORD = "MercadoTech123!";

export const buyer1 = {
  email: "buyer1@mercadotech.test",
  password: SEED_PASSWORD,
};

export const buyer2 = {
  email: "buyer2@mercadotech.test",
  password: SEED_PASSWORD,
};

export const seller1 = {
  email: "seller1@mercadotech.test",
  password: SEED_PASSWORD,
};
