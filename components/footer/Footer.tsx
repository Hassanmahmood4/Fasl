import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUp, Mail, Wheat } from "lucide-react";
import { GithubIcon } from "./BrandIcons";
import { FarmScene } from "./FarmScene";
import { Stamp } from "./Stamp";

const CHIP =
  "inline-flex items-center gap-2 rounded-lg border border-wheat bg-white/70 px-3 py-1.5 text-caption text-black";
const LINK_CHIP = `${CHIP} transition-colors hover:border-wheat-deep hover:bg-wheat`;

const EXPLORE = [
  { label: "The problem", href: "#problem" },
  { label: "Dashboard", href: "#dashboard" },
  { label: "Model performance", href: "#performance" },
];

const TEAM = [
  { name: "Hassan Mahmood", email: "hmahmood19662004@gmail.com" },
  { name: "Hashir Sakimdad", email: "hashirsakimdad@gmail.com" },
];

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-title font-bold">{title}</h2>
      <ul className="mt-3 flex flex-wrap gap-2">{children}</ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer>
      <FarmScene>
        <div className="px-[clamp(0.75rem,0.4rem+1.6vw,3rem)] pt-6 lg:pt-4 short:pt-2">
          <div className="rounded-[28px] bg-wheat-tint py-[clamp(2.25rem,1.5rem+3vw,4rem)] text-black lg:py-6 short:py-3">
            <div className="page-width">
              <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
                <div>
                  <div className="lg:flex lg:items-center lg:gap-4">
                    <div className="short:hidden">
                      <Stamp />
                    </div>
                    <p className="mt-6 lg:mt-0">
                      <span lang="ur" dir="rtl" className="font-urdu text-urdu lg:text-[2.5rem]">
                        فصل
                      </span>
                    </p>
                  </div>
                  <p className="mt-3 font-display text-title font-bold lg:mt-1 short:mt-0">
                    Know your crop from one photo.
                  </p>
                  <p className="mt-2 max-w-[36ch] text-charcoal">
                    Built for Pakistan’s agricultural departments, like NARC, at the{" "}
                    <span className="font-semibold text-black">GDG PAF IAST x TIMETABLR Hackathon</span> 2026.
                  </p>
                  <a
                    href="https://github.com/Hassanmahmood4/Fasl"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 font-bold text-white transition-colors hover:bg-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black lg:mt-3 short:mt-2"
                  >
                    <GithubIcon className="size-5" />
                    View the code on GitHub
                  </a>
                </div>

                <div className="space-y-8 lg:grid lg:grid-cols-2 lg:gap-x-10 lg:space-y-0">
                  <Group title="Explore">
                    {EXPLORE.map((link) => (
                      <li key={link.label}>
                        <a href={link.href} className={LINK_CHIP}>
                          {link.label}
                        </a>
                      </li>
                    ))}
                    <li>
                      <Link href="/dashboard" className={LINK_CHIP}>
                        Scan your crop
                      </Link>
                    </li>
                  </Group>

                  <Group title="Team">
                    {TEAM.map((member) => (
                      <li key={member.email} className="w-full">
                        <p className="font-semibold">{member.name}</p>
                        <a href={`mailto:${member.email}`} className={`${LINK_CHIP} mt-1 max-w-full break-all`}>
                          <Mail aria-hidden="true" className="size-4 shrink-0" />
                          {member.email}
                        </a>
                      </li>
                    ))}
                  </Group>
                </div>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-between gap-3 lg:mt-3 short:mt-1">
                <p className="flex items-center gap-2 text-caption text-charcoal">
                  <Wheat aria-hidden="true" className="size-5 text-wheat-deep" />
                  &copy; 2026 Fasl. Made in Pakistan.
                </p>
                <a href="#top" className={LINK_CHIP}>
                  Back to top
                  <ArrowUp aria-hidden="true" className="size-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </FarmScene>
    </footer>
  );
}
