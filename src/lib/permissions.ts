import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, memberAc, ownerAc } from "better-auth/plugins/organization/access";

// Organisatsiooni sees on neli rolli. Organisatsiooni haldus (kutsed, liikmed) jääb omanikule.
export const statement = {
  ...defaultStatements,
  team: ["view"],
  company: ["view"],
  material: ["create", "update", "delete"],
} as const;

export const ac = createAccessControl(statement);

export const member = ac.newRole({ ...memberAc.statements });
export const manager = ac.newRole({ ...memberAc.statements, team: ["view"] });
export const trainer = ac.newRole({ ...memberAc.statements, team: ["view"], material: ["create", "update", "delete"] });
export const owner = ac.newRole({ ...ownerAc.statements, team: ["view"], company: ["view"] });

export const ROLE_LABEL = {
  member: "Tiimiliige",
  manager: "Juht",
  owner: "Omanik",
  trainer: "Koolitaja",
} as const;

export type Role = keyof typeof ROLE_LABEL;

export const HOME_FOR_ROLE: Record<Role, string> = {
  member: "/kursused",
  manager: "/juht",
  owner: "/omanik",
  trainer: "/koolitaja",
};
