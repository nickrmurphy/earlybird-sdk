import type { Ingredient } from '@byearlybird/demo-shared';

import {
	Combobox,
	ComboboxInput,
	ComboboxOption,
	ComboboxOptions,
} from '@headlessui/react';
import { useState } from 'react';
import { useQuery } from './StoreProvider';

export function IngredientCombobox({
	onSelect,
	exclude = [],
}: {
	onSelect: (ingredient: Ingredient) => void;
	exclude?: string[];
}) {
	const [query, setQuery] = useState('');

	const { data: options } = useQuery(
		'ingredients',
		(data) =>
			Object.values(data).filter(
				(i) =>
					!i.isDeleted &&
					!exclude.includes(i.id) &&
					i.name.toLowerCase().includes(query.toLowerCase().toString()),
			),
		[query, exclude],
	);

	return (
		<Combobox
			onChange={(ingredient: Ingredient) => {
				if (ingredient) {
					onSelect(ingredient);
				}
				// setQuery('');
			}}
		>
			<ComboboxInput
				type="search"
				className="rounded-lg border border-gray-200 px-2 py-1 focus:outline-none text-sm w-1/2 transition-all"
				displayValue={() => query}
				placeholder="Add an ingredient..."
				onChange={(event) => setQuery(event.target.value)}
			/>
			<ComboboxOptions
				anchor={{ to: 'bottom start', gap: '4px' }}
				className="border border-gray-200 shadow-sm w-[var(--input-width)] empty:invisible rounded-lg p-1"
			>
				{options && options.length > 0 ? (
					options.map((ingredient) => (
						<ComboboxOption
							key={ingredient.id}
							value={ingredient}
							className="px-2 py-1 text-sm hover:ring-2 hover:ring-amber-200 hover:bg-amber-200/10 transition-all rounded-md"
						>
							{ingredient.name}
						</ComboboxOption>
					))
				) : (
					<ComboboxOption value={null} disabled className="px-2 py-1 text-sm">
						No results found
					</ComboboxOption>
				)}
			</ComboboxOptions>
		</Combobox>
	);
}
