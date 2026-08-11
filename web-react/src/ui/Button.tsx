import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

/*
 * Every button in the app, in one file.
 *
 * class-variance-authority takes a base set of classes plus a table of variants
 * and hands back a function that builds the right class string. The point is
 * that "what our buttons look like" is written down once, here, rather than as
 * a slightly different string of utilities at each call site.
 */
const button = cva(
	"inline-flex items-center justify-center font-medium transition-opacity disabled:opacity-50",
	{
		variants: {
			variant: {
				// The main action of a screen: Retry.
				primary: "rounded bg-chord px-4 py-2 text-white hover:opacity-90",
				// A way out that should not compete for attention: Clear the search.
				quiet:
					"rounded border border-neutral-300 px-4 py-2 text-quiet hover:bg-neutral-100",
				// One big round target holding an icon: play and pause.
				icon: "size-12 shrink-0 rounded-full bg-chord text-white hover:opacity-90",
			},
		},
		defaultVariants: { variant: "primary" },
	},
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
	VariantProps<typeof button>;

export function Button({ variant, className, ...props }: ButtonProps) {
	return (
		// type comes first so a caller can still override it through props.
		<button
			type="button"
			{...props}
			className={`${button({ variant })} ${className ?? ""}`.trim()}
		/>
	);
}
