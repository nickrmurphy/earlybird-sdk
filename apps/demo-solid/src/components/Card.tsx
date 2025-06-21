import type { JSX } from 'solid-js';

interface CardProps {
	title: string;
	onAddClick?: () => void;
	children: JSX.Element;
	class?: string;
}

export function Card(props: CardProps) {
	return (
		<div
			class={`bg-white/30 shadow rounded-lg p-3 h-80 overflow-y-auto border border-white/10 ${props.class || ''}`}
		>
			<div class="flex items-center justify-between mb-5">
				<h3 class="font-bold text-white">{props.title}</h3>
				{props.onAddClick && (
					<button
						onClick={props.onAddClick}
						class="rounded-full active:scale-105 transition-all size-6 border border-white/10 flex items-center justify-center bg-white/10 shadow hover:bg-white/20"
					>
						<span class="text-white text-sm">+</span>
					</button>
				)}
			</div>
			{props.children}
		</div>
	);
}
