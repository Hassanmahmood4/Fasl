import { useEffect, useRef, useState } from "react";
import { Download, Pause, Play } from "lucide-react";
import { downloadReportPdf } from "@/lib/demo/pdf";
import type { Photo, Report } from "@/lib/demo/types";

const BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

type ReportActionsProps = {
  report: Report;
  photo: Photo;
  isSample: boolean;
  /** Offers the PDF download. The dashboard preview leaves it out. */
  showDownload?: boolean;
};

export function ReportActions({ report, photo, isSample, showDownload = true }: ReportActionsProps) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Fetch the Urdu audio as soon as the report shows, so it is ready before the button is pressed.
  useEffect(() => {
    if (!report.urduAudioUrl) return;
    const clip = new Audio(report.urduAudioUrl);
    clip.preload = "auto";
    clip.onended = () => setPlaying(false);
    clip.load();
    audio.current = clip;
    setPlaying(false);
    return () => {
      clip.pause();
      clip.removeAttribute("src");
      audio.current = null;
    };
  }, [report.urduAudioUrl]);

  const toggleAudio = async () => {
    const clip = audio.current;
    if (!clip || loadingAudio) return;
    if (playing) {
      clip.pause();
      setPlaying(false);
      return;
    }
    setLoadingAudio(true);
    try {
      await clip.play();
      setPlaying(true);
      setProblem(null);
    } catch {
      setProblem("The Urdu audio couldn’t play. Please try again.");
    } finally {
      setLoadingAudio(false);
    }
  };

  const savePdf = async () => {
    setSaving(true);
    try {
      await downloadReportPdf(report, photo, isSample);
      setProblem(null);
    } catch {
      setProblem("The PDF couldn’t be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const AudioIcon = playing ? Pause : Play;

  return (
    <div data-block>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={toggleAudio}
          disabled={!report.urduAudioUrl}
          className={`${BUTTON} bg-wheat text-black hover:bg-wheat-deep`}
        >
          <AudioIcon aria-hidden="true" className="size-5" />
          {loadingAudio ? "Loading audio" : playing ? "Pause Urdu audio" : "Listen in Urdu"}
        </button>
        {showDownload && (
          <button
            type="button"
            onClick={savePdf}
            disabled={saving}
            className={`${BUTTON} border-2 border-black text-black hover:bg-wheat-tint`}
          >
            <Download aria-hidden="true" className="size-5" />
            {saving ? "Saving" : "Download report"}
          </button>
        )}
      </div>
      {!report.urduAudioUrl && (
        <p className="mt-2 text-caption text-charcoal">Urdu audio isn&rsquo;t available for this report.</p>
      )}
      {problem && (
        <p role="alert" className="mt-2 text-caption font-semibold text-black">
          {problem}
        </p>
      )}
    </div>
  );
}
