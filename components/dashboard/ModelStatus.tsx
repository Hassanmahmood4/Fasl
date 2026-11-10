import { useEffect, useState } from "react";
import { checkModel } from "@/lib/demo/api";

type Status = "checking" | "online" | "offline";

const LABEL: Record<Status, string> = {
  checking: "Checking the model",
  online: "Model online",
  offline: "Model offline. Sample photos still work.",
};

const DOT: Record<Status, string> = {
  checking: "border border-wheat-deep bg-white",
  online: "bg-black",
  offline: "border-2 border-black bg-white",
};

/** Says up front whether an upload can work, rather than failing after the photo is chosen. */
export function ModelStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let active = true;
    void checkModel().then((online) => {
      if (active) setStatus(online ? "online" : "offline");
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <p role="status" className="flex items-center gap-2 text-caption font-semibold">
      <span aria-hidden="true" className={`size-2.5 rounded-full ${DOT[status]}`} />
      {LABEL[status]}
    </p>
  );
}
