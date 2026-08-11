import { useAtom } from "jotai";
import { Pause, Play } from "lucide-react";
import { Button } from "../ui/Button";
import {
	isAutoScrollingAtom,
	MAX_SPEED,
	MIN_SPEED,
	scrollSpeedAtom,
} from "./atoms";

/*
 * The control bar, floating at the bottom of the window over the song.
 *
 * Floating *and* the song having extra space at its end: the bar is always in
 * reach, and never covers anything you still need to read.
 *
 * The speed is a percentage with the number next to it, because a number you
 * can learn beats a position you have to guess.
 */
export function ScrollBar() {
	const [isAutoScrolling, setAutoScrolling] = useAtom(isAutoScrollingAtom);
	const [speed, setSpeed] = useAtom(scrollSpeedAtom);

	return (
		<div className="scroll-bar fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white/95">
			<div className="mx-auto flex h-full max-w-3xl items-center gap-4 px-4">
				<Button
					variant="icon"
					onClick={() => setAutoScrolling((running) => !running)}
					aria-label={isAutoScrolling ? "Pause scrolling" : "Start scrolling"}
					aria-pressed={isAutoScrolling}
				>
					{isAutoScrolling ? (
						<Pause className="size-6" fill="currentColor" />
					) : (
						<Play className="size-6" fill="currentColor" />
					)}
				</Button>

				<label className="flex flex-1 items-center gap-3 text-sm text-quiet">
					<span className="shrink-0">speed</span>
					<input
						type="range"
						min={MIN_SPEED}
						max={MAX_SPEED}
						step={5}
						value={speed}
						onChange={(event) => setSpeed(Number(event.target.value))}
						className="min-w-0 flex-1"
					/>
					{/* Fixed width so the number changing does not shuffle the slider. */}
					<span className="w-12 shrink-0 text-right tabular-nums">
						{speed}%
					</span>
				</label>
			</div>
		</div>
	);
}
