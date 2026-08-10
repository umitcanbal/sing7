// A controlled input with one unusual rule: it has no state of its own.
//
// The address is the only place the search is kept. This box shows whatever the
// address says, and every keystroke asks the router to rewrite the address —
// never the other way round. That is what makes Back, reload and sharing a
// filtered link all work without any extra code.
export function SearchBox({
	value,
	onChange,
}: {
	value: string;
	onChange: (next: string) => void;
}) {
	return (
		<input
			type="search"
			value={value}
			onChange={(event) => onChange(event.target.value)}
			placeholder="Search"
			aria-label="Search songs"
			className="w-64 rounded border border-neutral-300 px-3 py-2 text-lyric outline-none focus:border-neutral-500"
		/>
	);
}
