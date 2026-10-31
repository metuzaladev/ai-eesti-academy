import { ViewTransition } from "react";

// Iga lehe sisu ümbris: liikumise suund tuleb lingi transitionTypes'ist,
// tüübita navigeerimine (nt suunamine pärast vormi) sulandub pehmelt.
// Peab olema lehes, mitte layoutis, sest layout ei vahetu navigeerimisel.
export function Page({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-fade" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-fade" }}
      default="none"
    >
      <div>{children}</div>
    </ViewTransition>
  );
}
