import { Chronoscope } from "@/components/home/Chronoscope";
import { Discover } from "@/components/home/Discover";
import { Hero } from "@/components/home/Hero";
import { Manifesto } from "@/components/home/Manifesto";
import { Shelf } from "@/components/home/Shelf";
import { Twenty } from "@/components/home/Twenty";
import { Page } from "@/components/ui/Art";

export default function Home() {
  return (
    <Page>
      <div>
        <Hero />
        <Manifesto />
        <Twenty />
        <Chronoscope />
        <Discover />
        <Shelf />
      </div>
    </Page>
  );
}
