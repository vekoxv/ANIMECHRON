import type { Metadata } from "next";
import { Lab } from "@/components/lab/Lab";
import { Page } from "@/components/ui/Art";

export const metadata: Metadata = {
  title: "Comparison lab",
  description: "Compare two or three anime side by side: platform ratings, length, studio, audience and cast.",
};

export default function LabPage() {
  return (
    <Page>
      <div>
        <Lab />
      </div>
    </Page>
  );
}
