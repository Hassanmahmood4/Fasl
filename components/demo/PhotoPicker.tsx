import { useState, type ChangeEvent, type DragEvent } from "react";
import Image from "next/image";
import { Camera, Maximize, Sun, Upload, ZoomIn, type LucideIcon } from "lucide-react";
import { ModelStatus } from "@/components/dashboard/ModelStatus";
import { SAMPLES } from "@/lib/demo/samples";
import type { Sample } from "@/lib/demo/types";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png"];

const TIPS: { icon: LucideIcon; text: string }[] = [
  { icon: ZoomIn, text: "Get close to the plant" },
  { icon: Sun, text: "Take it in daylight" },
  { icon: Maximize, text: "Fill the frame with crop" },
];

type PhotoPickerProps = {
  error: string | null;
  onSample: (sample: Sample) => void;
  onUpload: (file: File) => void;
};

export function PhotoPicker({ error, onSample, onUpload }: PhotoPickerProps) {
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const takeFile = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setFileError("Please choose a JPG or PNG photo.");
    } else if (file.size > MAX_BYTES) {
      setFileError("That photo is over 10 MB. Please choose a smaller one.");
    } else {
      setFileError(null);
      onUpload(file);
    }
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    takeFile(event.dataTransfer.files[0]);
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    takeFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const message = fileError ?? error;
  const focusRing =
    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-black";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10">
      <div className="flex flex-col gap-4">
        <ModelStatus />

        <div>
          <h2 className="font-semibold">For the best result</h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-3 sm:gap-4">
            {TIPS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2 text-caption leading-[1.3] text-charcoal">
                <Icon aria-hidden="true" className="size-5 shrink-0 text-wheat-deep" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Phones get the camera first: that's how an officer in the field will use this. */}
        <label
          className={`flex cursor-pointer items-center justify-center gap-3 rounded-full bg-wheat px-7 py-4 font-bold transition-colors hover:bg-wheat-deep md:hidden ${focusRing}`}
        >
          <input
            type="file"
            accept="image/jpeg,image/png"
            capture="environment"
            onChange={onChange}
            aria-label="Take a photo"
            className="sr-only"
          />
          <Camera aria-hidden="true" className="size-6" />
          Take a photo
        </label>

        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex min-h-52 flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-wheat-deep p-6 text-center transition-colors hover:bg-wheat-tint md:min-h-64 ${focusRing} ${dragging ? "bg-wheat-tint" : ""}`}
        >
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={onChange}
            aria-label="Upload a crop photo"
            className="sr-only"
          />
          <Upload aria-hidden="true" className="size-9 text-wheat-deep" />
          <span className="font-display text-title font-bold">Upload a crop photo</span>
          <span className="text-caption text-charcoal">
            Drag and drop or click. JPG or PNG, max 10 MB.
          </span>
        </label>

        {message && (
          <p role="alert" className="rounded-xl bg-wheat px-4 py-3 font-semibold text-black">
            {message}
          </p>
        )}
      </div>

      <div>
        <h2 className="font-semibold">No photo to hand? Try a sample.</h2>
        <p className="mt-1 text-caption text-charcoal">
          Samples show illustrative results, not model output.
        </p>
        <ul className="mt-4 space-y-3">
          {SAMPLES.map((sample) => (
            <li key={sample.id}>
              <button
                type="button"
                onClick={() => onSample(sample)}
                className="flex w-full items-center gap-4 overflow-hidden rounded-2xl bg-wheat-tint text-left transition-colors hover:bg-wheat focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                <span className="relative block aspect-[4/3] w-28 shrink-0">
                  <Image
                    src={sample.photo.src}
                    alt=""
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </span>
                <span className="py-3 pr-4 leading-[1.3] font-bold">{sample.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
