// The gym's own name, shown on receipts, reminder messages, the sidebar, the
// login page and the browser tab. Set NEXT_PUBLIC_GYM_NAME per deployment;
// unset, it falls back to the product name. It's inlined at build time, so
// changing it means redeploying.
export const GYM_NAME = process.env.NEXT_PUBLIC_GYM_NAME?.trim() || "GymDesk";
